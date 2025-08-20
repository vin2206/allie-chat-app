import React, { useState, useEffect, useRef } from 'react';
import './ChatUI.css';
// --- backend base ---
const BACKEND_BASE = 'https://allie-chat-proxy-production.up.railway.app';
// -------- Minimal custom confirm dialog (no browser URL) ----------
function ConfirmDialog({ open, title, message, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <div className="confirm-backdrop" role="dialog" aria-modal="true">
      <div className="confirm-modal">
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="confirm-buttons">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" onClick={onConfirm}>OK</button>
        </div>
      </div>
    </div>
  );
}

function AllieChat() {
  const [messages, setMessages] = useState([
    { text: 'Hi… kaise ho aap? ☺️', sender: 'allie' },
  ]);
  const [inputValue, setInputValue] = useState('');
  const bottomRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  // Does roleplay require premium? (server-controlled)
const [roleplayNeedsPremium, setRoleplayNeedsPremium] = useState(false);

useEffect(() => {
  fetch(`${BACKEND_BASE}/config`)
    .then(r => r.json())
    .then(d => setRoleplayNeedsPremium(!!d.roleplayNeedsPremium))
    .catch(() => setRoleplayNeedsPremium(false));
}, []);
  const [showModal, setShowModal] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  // --- Roleplay wiring (Step 1) ---
const [roleMode, setRoleMode] = useState(localStorage.getItem('roleMode') || 'stranger'); // 'stranger' | 'roleplay'
const [roleType, setRoleType] = useState(localStorage.getItem('roleType') || null);       // null | 'wife' | 'bhabhi' | 'girlfriend' | 'cousin'
const [showRoleMenu, setShowRoleMenu] = useState(false);
  // custom confirm modal state
const [confirmState, setConfirmState] = useState({
  open: false, title: '', message: '', onConfirm: null
});
const openConfirm = (title, message, onConfirm) =>
  setConfirmState({ open: true, title, message, onConfirm });
const closeConfirm = () =>
  setConfirmState(s => ({ ...s, open: false, onConfirm: null }));
  // Next request should clear server context after a role switch
const shouldResetRef = useRef(false);
  const roleMenuRef = useRef(null);

// Display name for header
const displayName =
  roleMode === 'roleplay' && roleType
    ? `Shraddha (${roleType.charAt(0).toUpperCase() + roleType.slice(1)})`
    : 'Shraddha';
  // --- HOLD-TO-RECORD state/refs ---
const [isRecording, setIsRecording] = useState(false);
  // Persistent session id per device/browser (used for voice quota)
const sessionIdRef = useRef(null);
if (!sessionIdRef.current) {
  const saved = localStorage.getItem('chat_session_id');
  if (saved) {
    sessionIdRef.current = saved;
  } else {
    const newId = (crypto?.randomUUID?.() || String(Date.now()));
    localStorage.setItem('chat_session_id', newId);
    sessionIdRef.current = newId;
  }
}
  // Tie the session to the chosen role to avoid context bleed
const roleSuffix = roleMode === 'roleplay' && roleType ? `:${roleType}` : ':stranger';
const sessionIdWithRole = `${sessionIdRef.current}${roleSuffix}`;
const mediaRecorderRef = useRef(null);
const chunksRef = useRef([]);
const autoStopTimerRef = useRef(null);
const MAX_RECORD_MS = 5000; // 5 seconds cap
  const roleColors = {
  wife: '#ff6ec4',
  girlfriend: '#ff9f40',
  bhabhi: '#7c4dff',
  cousin: '#00bcd4',
};
  const chipStyle = { padding: '8px 10px', border: 'none', background: '#f0f0ff', borderRadius: 999, cursor: 'pointer' };

// optional: simple day string
const today = () => new Date().toLocaleDateString('en-GB');
  // Did the user ask for a voice reply?
// Put near the top of AllieChat.jsx
const askedForVoice = (text = "") => {
  const t = (text || "").toLowerCase();

  // noun: voice/audio/awaaz/awaz/avaaz/avaj/awaj (loose spelling)
  const noun = /(voice|audio|a+w?a+a?j|a+w?a+a?z|awaaz|awaz|avaaz|avaj|awaj)/i;
  // verb: send/bhejo/bhejdo/sunao/sunado/bolo (allow “na”, “do”, “please”, “to” etc. anywhere)
  const verb = /(bhej(?:o|do)?|send|suna(?:o|do)?|bol(?:o|kar)?)/i;

  // We consider it a real request only if sentence contains BOTH a noun and a verb,
  // in any order, with anything in between (e.g., “avaaz to sunado please”).
  return noun.test(t) && verb.test(t);
};
const applyRoleChange = (mode, type) => {
  // Premium gate (server-controlled)
  if (mode === 'roleplay' && roleplayNeedsPremium && !isOwner) {
    setShowRoleMenu(false);
    setShowModal(true);   // show your premium modal
    return;
  }

  // Save choice
  setRoleMode(mode);
  setRoleType(type);
  localStorage.setItem('roleMode', mode);
  localStorage.setItem('roleType', type || '');

  // Close menu
  setShowRoleMenu(false);

  // Clear chat locally & show quick opener
  const opener = mode === 'roleplay'
    ? (type === 'wife' ? 'Aaj itni der laga di reply mein? 😉'
       : type === 'girlfriend' ? 'Miss kiya mujhe? 😌'
       : type === 'bhabhi' ? 'Arre tum aa gaye, kya kar rahe the itni der? 😉'
       : 'Oye, yaad hai school waali masti? 😄')
    : 'Hi… kaise ho aap? ☺️';
  setMessages([{ text: opener, sender: 'allie' }]);

  // Make the very next API call start fresh on server
  shouldResetRef.current = true;
};
  // --------- PRESS & HOLD mic handlers ---------
const startRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    chunksRef.current = [];

    mr.ondataavailable = (e) => {
      if (e.data && e.data.size) chunksRef.current.push(e.data);
    };

    // when we stop (either by click or auto-timer) → build blob & send
    mr.onstop = async () => {
      try {
        // ensure last chunk is flushed on some Android builds
        if (mr.state !== 'inactive' && mr.requestData) mr.requestData();

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await sendVoiceBlob(blob);
      } finally {
        stream.getTracks().forEach(t => t.stop());
      }
    };

    mr.start();                       // start recording
    mediaRecorderRef.current = mr;
    setIsRecording(true);

    // auto-stop hard at 5s
    if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
    autoStopTimerRef.current = setTimeout(() => {
      stopRecording();                // will trigger onstop → send
    }, MAX_RECORD_MS);
  } catch (e) {
    console.error('Mic error:', e);
    window.alert('Microphone permission needed.');
  }
};

const stopRecording = () => {
  if (autoStopTimerRef.current) {
    clearTimeout(autoStopTimerRef.current);
    autoStopTimerRef.current = null;
  }
  const mr = mediaRecorderRef.current;
  if (mr && mr.state === 'recording') {
    try { if (mr.requestData) mr.requestData(); } catch {}
    mr.stop();                        // this fires mr.onstop → sendVoiceBlob
  }
  setIsRecording(false);
};

// Upload the voice to backend as multipart/form-data
const sendVoiceBlob = async (blob) => {
  // local preview of what the user sent
  setMessages(prev => ([
    ...prev,
    { audioUrl: URL.createObjectURL(blob), sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  ]));
  setIsTyping(true);

  try {
    // --- include full history so backend has context ---
    const formattedHistory = messages.map(m => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text ?? (m.audioUrl ? '[voice note]' : '')
    }));

    const MAX_MSG = roleMode === 'roleplay' ? 18 : 24;
    const trimmed = formattedHistory.slice(-MAX_MSG);

    const fd = new FormData();
    if (isOwner) fd.append('ownerKey', 'unlockvinay1236');
    fd.append('audio', blob, 'note.webm');
    fd.append('messages', JSON.stringify(trimmed));
    fd.append('clientTime', new Date().toLocaleTimeString('en-US', { hour12: false }));
    fd.append('clientDate', today());
    fd.append('session_id', sessionIdWithRole);
    fd.append('roleMode', roleMode);
    fd.append('roleType', roleType || 'stranger');
    if (shouldResetRef.current) { fd.append('reset', 'true'); shouldResetRef.current = false; }

    const resp = await fetch(`${BACKEND_BASE}/chat`, {
  method: 'POST',
  body: fd
});

    const data = await resp.json();
    setIsTyping(false);
    if (data.locked) {
  setMessages(prev => [...prev, {
    text: data.reply || 'Locked. Upgrade to continue.',
    sender: 'allie',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }]);
  setShowModal(true);
  return;
}

    if (data.audioUrl) {
      const fullUrl = data.audioUrl.startsWith('http')
        ? data.audioUrl
        : `${BACKEND_BASE}${data.audioUrl}`;
      setMessages(prev => [...prev, {
        audioUrl: fullUrl, sender: 'allie',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } else {
      setMessages(prev => [...prev, {
        text: data.reply || "Hmm… Shraddha didn’t respond.",
        sender: 'allie',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }
  } catch (e) {
    console.error('Voice upload failed:', e);
    setIsTyping(false);
    setMessages(prev => [...prev, {
      text: 'Voice upload failed. Try again.',
      sender: 'allie',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
  }
};
  const handleSend = async () => {
    if (inputValue.trim() === '' || isPaused) return;
    // Quick commands
if (inputValue.trim().toLowerCase() === '#stranger') {
  applyRoleChange('stranger', null);
  setInputValue('');
  return;
}
if (inputValue.trim().toLowerCase() === '#reset') {
  shouldResetRef.current = true;
  setMessages([{ text: 'Hi… kaise ho aap? ☺️', sender: 'allie' }]);
  setInputValue('');
  return;
}

    // --- OWNER UNLOCK COMMAND ---
    if (inputValue.trim() === '#unlockvinay1236') {
      setIsOwner(true);
      setInputValue('');
      setMessages(prev => [
        ...prev,
        { text: "✅ Owner mode unlocked! Unlimited chat enabled.", sender: 'allie', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]);
      return; // Stop here, do NOT send this message to backend
    }

    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMessage = { text: inputValue, sender: 'user', time: currentTime, seen: false };
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setInputValue('');
    setIsTyping(true);

    setTimeout(async () => {
      try {
        const formattedHistory = updatedMessages.map((msg) => ({
  role: msg.sender === 'user' ? 'user' : 'assistant',
  content: msg.text ?? (msg.audioUrl ? '🔊 (voice reply sent)' : '')
}));
        
const MAX_MSG = roleMode === 'roleplay' ? 18 : 24;
const trimmed = formattedHistory.slice(-MAX_MSG);

        const now = new Date();
        const wantVoice = askedForVoice(newMessage.text);
const fetchBody = {
  messages: trimmed,
  clientTime: now.toLocaleTimeString('en-US', { hour12: false }),
  clientDate: now.toLocaleDateString('en-GB'), // e.g., "02/08/2025"
  wantVoice, // tells backend if voice reply is requested
  session_id: sessionIdWithRole,     // <-- per-role session
roleMode,
roleType: roleType || 'stranger',
};
if (shouldResetRef.current) { fetchBody.reset = true; shouldResetRef.current = false; }        
if (isOwner) fetchBody.ownerKey = "unlockvinay1236";

        const response = await fetch(`${BACKEND_BASE}/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(fetchBody)
});

        const data = await response.json();
        setIsTyping(false);
        // If backend sent a voice note, show it and stop.
if (data.audioUrl) {
  const fullUrl = data.audioUrl.startsWith('http')
    ? data.audioUrl
    : `${BACKEND_BASE}${data.audioUrl}`;
  setMessages(prev => [...prev, { audioUrl: fullUrl, sender: 'allie', time: currentTime }]);
  return;
}
        // If locked, show premium popup
        if (data.locked) {
          setMessages((prev) => [
            ...prev,
            { text: data.reply, sender: 'allie', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
          ]);
          setTimeout(() => {
            setShowModal(true);
          }, 500);
          return;
        }

        const reply = data.reply || "Hmm… Shraddha didn’t respond.";
        // ✅ If pause triggered by backend
        if (data.pause) {
          setIsPaused(true);
          setMessages((prev) => [
            ...prev,
            { text: data.reply, sender: 'allie', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
          ]);

          // After 5 minutes, unpause & restart shy phase
          setTimeout(() => {
            setIsPaused(false);
            setMessages((prev) => [
              ...prev,
              { text: 'Hi… wapas aa gayi hoon 😳 tum miss kar rahe the na?', sender: 'allie', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
            ]);
          }, 5 * 60 * 1000);

          return; // ✅ stop further processing
        }

        if (data.reset) {
          // Reset conversation after 5 min
          setTimeout(() => {
            setMessages([{ text: 'Hi… kaise ho aap? ☺️', sender: 'allie' }]);
          }, 5 * 60 * 1000);
        }

        setMessages((prev) => [
  ...prev,
  { text: reply, sender: 'allie', time: currentTime }
]);
      } catch (error) {
        setIsTyping(false);
        console.error('Error calling Allie proxy:', error);
        setMessages((prev) => [...prev, { text: 'Oops! Allie is quiet right now.', sender: 'allie' }]);
      }
    }, 2500);
  };

  useEffect(() => {
  if (bottomRef.current) {
    bottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }
}, [messages, isTyping]);

  useEffect(() => {
  if (!showRoleMenu) return;

  const onDocClick = (e) => {
    if (roleMenuRef.current && !roleMenuRef.current.contains(e.target)) {
      setShowRoleMenu(false);
    }
  };
  const onEsc = (e) => {
    if (e.key === 'Escape') setShowRoleMenu(false);
  };

  document.addEventListener('mousedown', onDocClick);
  document.addEventListener('keydown', onEsc);
  return () => {
    document.removeEventListener('mousedown', onDocClick);
    document.removeEventListener('keydown', onEsc);
  };
}, [showRoleMenu]);

  const displayedMessages = messages;

  return (
    <div className="App">
      <div className="header">
        <div className="profile-pic">
          <img src="/1227230000.png" alt="Allie" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
        </div>
        <div className="username-container">
  <div className="name-wrap">
    <div className="username">{displayName}</div>
    {roleMode === 'roleplay' && roleType && (
      <span
        className="role-badge"
        style={{ backgroundColor: roleColors[roleType] || '#666' }}
      >
        {roleType}
      </span>
    )}
  </div>

  <button
    className="role-btn"
    onClick={() => setShowRoleMenu(v => !v)}
    aria-label="Choose mode"
    title="Choose mode"
  >
    <span className="role-btn-text">Mode</span>
  </button>
</div>
  </div>

    {showRoleMenu && (
  <div ref={roleMenuRef} className="role-menu" style={{
    position: 'fixed', top: 60, right: 16, zIndex: 1000,
    background: '#fff', color: '#222', borderRadius: 12, boxShadow: '0 10px 24px rgba(0,0,0,.2)',
    padding: 8, width: 220
  }}>
    <div style={{ fontWeight: 700, marginBottom: 8 }}>Mode</div>
    <button
  style={{ width: '100%', padding: '8px 10px', textAlign: 'left', border: 'none', background: '#f7f7f7', borderRadius: 8, marginBottom: 8 }}
  onClick={() => {
  openConfirm(
    'Switch to Stranger?',
    'This will start a fresh chat and clear current messages.',
    () => { closeConfirm(); applyRoleChange('stranger', null); }
  );
}}
>
  Stranger (default)
</button>

    <div style={{ fontWeight: 700, margin: '8px 0 6px' }}>Roleplay</div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      <button
  style={chipStyle}
  onClick={() => {
  openConfirm(
    'Start as Shraddha (Wife)?',
    'A fresh chat will begin and current messages will be cleared.',
    () => { closeConfirm(); applyRoleChange('roleplay','wife'); }
  );
}}
>Wife</button>

<button
  style={chipStyle}
  onClick={() => {
  openConfirm(
    'Start as Shraddha (Bhabhi)?',
    'A fresh chat will begin and current messages will be cleared.',
    () => { closeConfirm(); applyRoleChange('roleplay','bhabhi'); }
  );
}}
>Bhabhi</button>

<button
  style={chipStyle}
  onClick={() => {
  openConfirm(
    'Start as Shraddha (Girlfriend)?',
    'A fresh chat will begin and current messages will be cleared.',
    () => { closeConfirm(); applyRoleChange('roleplay','girlfriend'); }
  );
}}
>Girlfriend</button>

<button
  style={chipStyle}
  onClick={() => {
  openConfirm(
    'Start as Shraddha (Cousin)?',
    'A fresh chat will begin and current messages will be cleared.',
    () => { closeConfirm(); applyRoleChange('roleplay','cousin'); }
  );
}}
>Cousin</button>
    </div>
  </div>
)}

      <div className="chat-container">
        <div className="chat-spacer"></div>
        {displayedMessages.map((msg, index) => (
          <div key={index} className={`message ${msg.sender === 'user' ? 'user-message' : 'allie-message'}`}>
  <span className={`bubble-content ${msg.audioUrl ? 'has-audio' : ''}`}>
  {msg.audioUrl ? (
    <div className="audio-wrapper">
      <audio
        className="audio-player"
        controls
        preload="none"
        src={msg.audioUrl}
        onError={(e) => console.warn('audio failed:', e.currentTarget.src)}
      />
      <div className="audio-fallback">
        <a href={msg.audioUrl} target="_blank" rel="noreferrer">Open audio</a>
      </div>
    </div>
  ) : (
    msg.text
  )}
  <span className="msg-time">{msg.time}</span>
</span>
  </div>
))}
        {isTyping && (
  <div className="message allie typing-bounce">
    <span></span>
    <span></span>
    <span></span>
  </div>
)}
        <div ref={bottomRef}></div>
      </div>

      {showModal && (
        <div className="premium-modal">
          <div className="modal-content">
            <h3>Shraddha wants to talk to you 😢</h3>
            <p>Unlock to continue unlimited chat and hear her voice notes ❤️</p>
            <button onClick={() => { setShowModal(false); window.alert("Weekly Unlock Coming Soon!"); }}>
              Weekly Unlimited – ₹199
            </button>
            <button onClick={() => { setShowModal(false); window.alert("Daily Top-Up Coming Soon!"); }}>
              Daily Top-Up – ₹52
            </button>
            <button onClick={() => setShowModal(false)} className="cancel-btn">
              Maybe Later
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
  open={confirmState.open}
  title={confirmState.title}
  message={confirmState.message}
  onCancel={closeConfirm}
  onConfirm={confirmState.onConfirm || closeConfirm}
/>
      
      <div className="footer">
        <input
          type="text"
          placeholder="Type a message..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button
  className={`mic-btn ${isRecording ? 'recording' : ''}`}
  onClick={() => { if (!isRecording) { startRecording(); } else { stopRecording(); } }}
  title={isRecording ? "Recording… tap to stop" : "Tap to record (5s)"}
  aria-label={isRecording ? "Stop recording" : "Start recording"}
>
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 14 0h-2zM11 19v3h2v-3h-2z"/>
  </svg>
</button>
        
        <button className="send-btn" onClick={handleSend}>➤</button>
      </div>
    </div>
  );
}

export default AllieChat;
