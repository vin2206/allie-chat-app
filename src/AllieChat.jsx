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
          content: msg.text
        }));

        const now = new Date();
const fetchBody = {
  messages: formattedHistory,
  clientTime: now.toLocaleTimeString('en-US', { hour12: false }),
  clientDate: now.toLocaleDateString('en-GB'), // e.g., "02/08/2025"
};
if (isOwner) fetchBody.ownerKey = "unlockvinay1236";

        const response = await fetch("https://allie-chat-proxy-production.up.railway.app/chat", {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fetchBody)
        });

        const data = await response.json();
        setIsTyping(false);

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
        setMessages((prev) => [...prev.slice(0, -1), { text: 'Oops! Allie is quiet right now.', sender: 'allie' }]);
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
            Shraddha <span className="heart">❤️</span>
          </div>
        </div>
      </div>

      <div className="chat-container">
        <div className="chat-spacer"></div>
        {displayedMessages.map((msg, index) => (
          <div key={index} className={`message ${msg.sender === 'user' ? 'user-message' : 'allie-message'}`}>
  <span className="bubble-content">
    {msg.text}
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
        <button onClick={handleSend}>➤</button>
      </div>
    </div>
  );
}

export default AllieChat;
