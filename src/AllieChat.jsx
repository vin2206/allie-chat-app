import React, { useEffect, useRef, useState } from "react";
import "./ChatUI.css";

const API_URL = "https://allie-chat-proxy-production.up.railway.app/chat";

function AllieChat() {
  const [messages, setMessages] = useState([
    { text: "Hi… kaise ho aap? ☺️", sender: "allie", time: ts() },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // Voice record state
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const bottomRef = useRef(null);
  const sessionIdRef = useRef("");

  // ---------- helpers ----------
  function ts() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  function today() {
    return new Date().toLocaleDateString("en-GB");
  }
  function ensureSessionId() {
    let id = localStorage.getItem("shr_session_id");
    if (!id) {
      id = `shr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem("shr_session_id", id);
    }
    sessionIdRef.current = id;
  }
  // -----------------------------

  useEffect(() => { ensureSessionId(); }, []);
  useEffect(() => { if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);

  // ---------- TEXT SEND ----------
  const handleSend = async () => {
    if (!inputValue.trim() || isPaused) return;

    // Local owner unlock
    if (inputValue.trim() === "#unlockvinay1236") {
      setIsOwner(true);
      setInputValue("");
      setMessages((p) => [...p, { text: "✅ Owner mode unlocked! Unlimited chat enabled.", sender: "allie", time: ts() }]);
      return;
    }

    const newMsg = { text: inputValue, sender: "user", time: ts() };
    const history = [...messages, newMsg].map((m) => ({
      role: m.sender === "user" ? "user" : "assistant",
      content: m.text || "",
    }));

    setMessages((p) => [...p, newMsg]);
    setInputValue("");
    setIsTyping(true);

    try {
      const body = {
        messages: history,
        clientTime: new Date().toLocaleTimeString("en-US", { hour12: false }),
        clientDate: today(),
        session_id: sessionIdRef.current,
      };
      if (isOwner) body.ownerKey = "unlockvinay1236";

      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setIsTyping(false);

      if (data.locked) {
        setMessages((p) => [...p, { text: data.reply, sender: "allie", time: ts() }]);
        setTimeout(() => setShowModal(true), 400);
        return;
      }

      if (data.pause) {
        setIsPaused(true);
        setMessages((p) => [...p, { text: data.reply, sender: "allie", time: ts() }]);
        setTimeout(() => {
          setIsPaused(false);
          setMessages((p) => [...p, { text: "Hi… wapas aa gayi hoon 😳 tum miss kar rahe the na?", sender: "allie", time: ts() }]);
        }, 5 * 60 * 1000);
        return;
      }

      if (data.audioUrl) {
        setMessages((p) => [...p, { audioUrl: data.audioUrl, sender: "allie", time: ts() }]);
      } else {
        setMessages((p) => [...p, { text: data.reply || "Hmm… Shraddha didn’t respond.", sender: "allie", time: ts() }]);
      }
    } catch (e) {
      console.error(e);
      setIsTyping(false);
      setMessages((p) => [...p, { text: "Oops! Shraddha is quiet right now.", sender: "allie", time: ts() }]);
    }
  };

  // ---------- VOICE RECORD ----------
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await sendVoiceBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
    } catch (e) {
      console.error("Mic error:", e);
      alert("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  const toggleRecording = () => (isRecording ? stopRecording() : startRecording());

  const sendVoiceBlob = async (blob) => {
    // local preview bubble for user's voice
    setMessages((p) => [...p, { audioUrl: URL.createObjectURL(blob), local: true, sender: "user", time: ts() }]);
    setIsTyping(true);
    try {
      const fd = new FormData();
      fd.append("audio", new File([blob], "note.webm", { type: "audio/webm" }));
      fd.append("session_id", sessionIdRef.current);
      fd.append("clientTime", new Date().toLocaleTimeString("en-US", { hour12: false }));
      fd.append("clientDate", today());

      const res = await fetch(API_URL, { method: "POST", body: fd });
      const data = await res.json();
      setIsTyping(false);

      if (data.locked) {
        setMessages((p) => [...p, { text: data.reply, sender: "allie", time: ts() }]);
        setTimeout(() => setShowModal(true), 400);
        return;
      }

      if (data.audioUrl) {
        setMessages((p) => [...p, { audioUrl: data.audioUrl, sender: "allie", time: ts() }]);
      } else if (data.reply) {
        setMessages((p) => [...p, { text: data.reply, sender: "allie", time: ts() }]);
      } else if (data.error === "stt_failed") {
        setMessages((p) => [...p, { text: "Voice samajh nahi aayi, please dubara bolo. 🙈", sender: "allie", time: ts() }]);
      }
    } catch (e) {
      console.error("Voice upload failed:", e);
      setIsTyping(false);
      setMessages((p) => [...p, { text: "Voice upload failed. Try again.", sender: "allie", time: ts() }]);
    }
  };

  // ---------- UI ----------
  return (
    <div className="App">
      <div className="header">
        <div className="profile-pic">
          <img src="/1227230000.png" alt="Shraddha" />
        </div>
        <div className="username-container">
          <div className="username">Shraddha</div>
        </div>
      </div>

      <div className="chat-container">
        <div className="chat-spacer" />
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.sender === "user" ? "user-message" : "allie-message"}`}>
            <span className="bubble-content">
              {msg.audioUrl ? (
                <audio className="audio-player" controls preload="none" src={msg.audioUrl} />
              ) : (
                msg.text
              )}
              <span className="msg-time">{msg.time}</span>
            </span>
          </div>
        ))}

        {isTyping && (
          <div className="message allie typing-bounce">
            <span></span><span></span><span></span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {showModal && (
        <div className="premium-modal">
          <div className="modal-content">
            <h3>Shraddha wants to talk to you 😢</h3>
            <p>Unlock unlimited chat and hear her voice notes ❤️</p>
            <button onClick={() => { setShowModal(false); alert("Weekly Unlock Coming Soon!"); }}>
              Weekly Unlimited – ₹199
            </button>
            <button onClick={() => { setShowModal(false); alert("Daily Top‑Up Coming Soon!"); }}>
              Daily Top‑Up – ₹49
            </button>
            <button onClick={() => setShowModal(false)} className="cancel-btn">Maybe Later</button>
          </div>
        </div>
      )}

      <div className="footer">
        <input
          type="text"
          placeholder="Type a message..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />

        {/* Mic */}
        <button className={`mic-btn ${isRecording ? "recording" : ""}`} onClick={toggleRecording} title={isRecording ? "Stop" : "Record"}>
          {isRecording ? "●" : "🎤"}
        </button>

        {/* Send */}
        <button className="send-btn" onClick={handleSend}>➤</button>
      </div>
    </div>
  );
}

export default AllieChat;
