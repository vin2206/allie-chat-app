import React, { useState, useEffect, useRef } from 'react';
import './ChatUI.css';

function AllieChat() {
  const [messages, setMessages] = useState([
    { text: 'Hi baby, how are you? Did you miss me?', sender: 'allie' },
  ]);
  const [inputValue, setInputValue] = useState('');
  const bottomRef = useRef(null);

  const handleSend = async () => {
    if (inputValue.trim() === '') return;
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const newMessage = { text: inputValue, sender: 'user', time: currentTime, seen: false };
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setInputValue('');
    setMessages((prev) => [...prev, { text: 'typing...', sender: 'allie' }]);
    setTimeout(async () => {
      try {
        const formattedHistory = updatedMessages.map((msg) => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        }));
        const response = await fetch('https://allie-chat-proxy-production.up.railway.app/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: formattedHistory })
        });
        const data = await response.json();
        const reply = data.reply || 'Hmm... Allie didn’t respond.';
        setMessages((prev) => {
  const updatedPrev = [...prev.slice(0, -1)];
  updatedPrev[updatedPrev.length - 1].seen = true; // Mark last user message as seen
  return [...updatedPrev, { text: reply, sender: 'allie', time: currentTime }];
});
      } catch (error) {
        console.error('Error calling Allie proxy:', error);
        setMessages((prev) => [...prev.slice(0, -1), { text: 'Oops! Allie is quiet right now.', sender: 'allie' }]);
      }
    }, 1500);
  };

  useEffect(() => {
  if (bottomRef.current) {
    setTimeout(() => {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }, 50); // small delay allows DOM to fully render before scroll
  }
}, [messages]);

  return (
    <div className="App">
      <div className="header">
        <div className="profile-pic">
          <img src="/1227230000.png" alt="Allie" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
        </div>
        <div className="username-container">
          <div className="username">Allie</div>
          {messages[messages.length - 1]?.text === 'typing...' && <div className="typing-indicator">typing...</div>}
        </div>
      </div>

      <div className="chat-container">
  {messages.slice().reverse().map((msg, index) => {
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
