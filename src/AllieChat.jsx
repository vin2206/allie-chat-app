import React, { useState, useEffect, useRef } from 'react';
import './ChatUI.css';

function AllieChat() {
  const [messages, setMessages] = useState([
    { text: 'Hi… kaise ho aap? ☺️', sender: 'allie' },
  ]);
  const [inputValue, setInputValue] = useState('');
  const bottomRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
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
const holdTimerRef = useRef(null);
const mediaRecorderRef = useRef(null);
const chunksRef = useRef([]);

// optional: simple day string
const today = () => new Date().toLocaleDateString('en-GB');
  // Did the user ask for a voice reply?
const askedForVoice = (text = '') => {
  return /(voice|audio|awaaz|aawaz|voice\s*bhejo)/i.test(text);
};

  // --------- PRESS & HOLD mic handlers ---------
const startRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    chunksRef.current = [];
    mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    mr.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      await sendVoiceBlob(blob);
      stream.getTracks().forEach(t => t.stop());
    };
    mr.start();
    mediaRecorderRef.current = mr;
    setIsRecording(true);
  } catch (e) {
    console.error('Mic error:', e);
    alert('Microphone permission needed.');
  }
};

const stopRecording = () => {
  if (mediaRecorderRef.current && isRecording) {
    mediaRecorderRef.current.stop();
  }
  setIsRecording(false);
};

const onMicHoldStart = () => {
  // must hold for 1s to actually start recording
  holdTimerRef.current = setTimeout(() => {
    startRecording();
  }, 1000);
};

const onMicHoldEnd = () => {
  // released before 1s → cancel; released after start → stop
  if (holdTimerRef.current) {
    clearTimeout(holdTimerRef.current);
    holdTimerRef.current = null;
  }
  if (isRecording) stopRecording();
};

// Upload the voice to backend as multipart/form-data
const sendVoiceBlob = async (blob) => {
  // local preview bubble (so user sees they sent a voice)
  setMessages(prev => [
    ...prev,
    { audioUrl: URL.createObjectURL(blob), sender: 'user', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ]);
    setIsTyping(true);

  try {
    const fd = new FormData();
    fd.append('audio', new File([blob], 'note.webm', { type: 'audio/webm' }));
    fd.append('clientTime', new Date().toLocaleTimeString('en-US', { hour12: false }));
    fd.append('clientDate', today());
    fd.append('session_id', sessionIdRef.current);
    // backend will reply in voice because user sent a voice note

    const resp = await fetch('https://allie-chat-proxy-production.up.railway.app/chat', {
      method: 'POST',
      body: fd
    });
    const data = await resp.json();
    const fullUrl = data.audioUrl && (data.audioUrl.startsWith('http')
  ? data.audioUrl
  : `https://allie-chat-proxy-production.up.railway.app${data.audioUrl}`);
    setIsTyping(false);
    if (data.audioUrl) {
  setMessages(prev => [...prev, {
    audioUrl: fullUrl,
    sender: 'allie',
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
    setMessages(prev => [...prev, { text: 'Voice upload failed. Try again.', sender: 'allie', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
  }
};
  const handleSend = async () => {
    if (inputValue.trim() === '' || isPaused) return;

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
  content: msg.text ?? (msg.audioUrl ? '[voice note]' : '')
}));

        const now = new Date();
        const wantVoice = askedForVoice(newMessage.text);
const fetchBody = {
  messages: formattedHistory,
  clientTime: now.toLocaleTimeString('en-US', { hour12: false }),
  clientDate: now.toLocaleDateString('en-GB'), // e.g., "02/08/2025"
  wantVoice, // tells backend if voice reply is requested
  session_id: sessionIdRef.current, // <-- per-device quota
};
if (isOwner) fetchBody.ownerKey = "unlockvinay1236";

        const response = await fetch("https://allie-chat-proxy-production.up.railway.app/chat", {
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
    : `https://allie-chat-proxy-production.up.railway.app${data.audioUrl}`;
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

  const displayedMessages = messages;

  return (
    <div className="App">
      <div className="header">
        <div className="profile-pic">
          <img src="/1227230000.png" alt="Allie" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
        </div>
        <div className="username-container">
          <div className="username">
  Shraddha
</div>
        </div>
      </div>

      <div className="chat-container">
        <div className="chat-spacer"></div>
        {displayedMessages.map((msg, index) => (
          <div key={index} className={`message ${msg.sender === 'user' ? 'user-message' : 'allie-message'}`}>
  <span className="bubble-content">
  {msg.audioUrl ? (
  <div className="audio-wrapper">
    <audio className="audio-player" controls preload="none" src={msg.audioUrl} />
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
            <button onClick={() => { setShowModal(false); alert("Weekly Unlock Coming Soon!"); }}>
              Weekly Unlimited – ₹199
            </button>
            <button onClick={() => { setShowModal(false); alert("Daily Top-Up Coming Soon!"); }}>
              Daily Top-Up – ₹49
            </button>
            <button onClick={() => setShowModal(false)} className="cancel-btn">
              Maybe Later
            </button>
          </div>
        </div>
      )}

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
  onMouseDown={onMicHoldStart}
  onMouseUp={onMicHoldEnd}
  onMouseLeave={onMicHoldEnd}
  onTouchStart={onMicHoldStart}
  onTouchEnd={onMicHoldEnd}
  title="Hold 1s to record"
>
  🎤
</button>
        
        <button className="send-btn" onClick={handleSend}>➤</button>
      </div>
    </div>
  );
}

export default AllieChat;
