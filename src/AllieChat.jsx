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

  const handleSend = async () => {
  if (inputValue.trim() === '' || isPaused) return; // ✅ stops sending if paused
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const newMessage = { text: inputValue, sender: 'user', time: currentTime, seen: false };
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setInputValue('');
    if (!data?.locked) {
  setMessages((prev) => [...prev, { text: 'typing...', sender: 'allie' }]);
}
    setTimeout(async () => {
      try {
        const formattedHistory = updatedMessages.map((msg) => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        }));
        const response = await fetch("https://allie-chat-proxy-production.up.railway.app/chat", {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: formattedHistory })
        });
        const data = await response.json();

// If locked, show premium popup
if (data.locked) {
  setMessages((prev) => [
    ...prev,
    { text: data.reply, sender: 'allie', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  ]);

  setTimeout(() => {
    setShowModal(true);
  }, 500);

  return; // ✅ stop further processing
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

setMessages((prev) => {
  const updatedPrev = [...prev.slice(0, -1)];
  updatedPrev[updatedPrev.length - 1].seen = true;
  return [...updatedPrev, { text: reply, sender: 'allie', time: currentTime }];
});
      } catch (error) {
        console.error('Error calling Allie proxy:', error);
        setMessages((prev) => [...prev.slice(0, -1), { text: 'Oops! Allie is quiet right now.', sender: 'allie' }]);
      }
    }, 1500);
  };

  useEffect(() => {
  const chatContainer = document.querySelector('.chat-container');
  if (chatContainer) {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
}, [messages]);

  const displayedMessages = [...messages].reverse();

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
          {messages[messages.length - 1]?.text === 'typing...' && <div className="typing-indicator">typing...</div>}
        </div>
      </div>

<div className="chat-container">
  {displayedMessages.map((msg, index) => {
    if (msg.text === 'typing...' && msg.sender === 'allie') return null;
    return (
      <div key={index} className={`message ${msg.sender === 'user' ? 'user-message' : 'allie-message'}`}>
        <div>{msg.text}</div>
        <div className="meta-info">
          <span>{msg.time}</span>
        </div>
      </div>
    );
  })}
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
