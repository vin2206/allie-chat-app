import React, { useState, useEffect, useRef } from 'react';
import './ChatUI.css';

function AllieChat() {
  const [messages, setMessages] = useState([
    { text: 'Hi baby, how are you? Did you miss me?', sender: 'allie' },
  ]);
  const [inputValue, setInputValue] = useState('');

  const chatContainerRef = useRef(null);

  const handleSend = async () => {
  if (inputValue.trim() === '') return;

  const newMessage = { text: inputValue, sender: 'user' };
  setMessages(prev => [...prev, newMessage]);
  setInputValue('');

  try {
    const response = await fetch('https://your-main-link/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: newMessage.text })
    });

    const data = await response.json();
    console.log('API response data:', data); // <— add this log!

    const reply = data.choices?.[0]?.message?.content
      || 'Hmm… Allie didn’t respond.';
    setMessages(prev => [...prev, { text: reply, sender: 'allie' }]);
  } catch (err) {
    console.error('API error:', err);
    setMessages(prev => [...prev, {
      text: 'Oops! Allie is quiet right now.',
      sender: 'allie'
    }]);
  }
};

  // Auto scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="App">

      {/* HEADER */}
      <div className="header">
        <div className="profile-pic">
          <img
            src="https://via.placeholder.com/40" // Replace with Allie's pic if you want
            alt="Allie"
            style={{ width: '100%', height: '100%', borderRadius: '50%' }}
          />
          <div className="live-dot"></div>
        </div>
        <div className="username">Allie</div>
      </div>

      {/* CHAT AREA */}
      <div className="chat-container" ref={chatContainerRef}>
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message ${msg.sender === 'user' ? 'user-message' : 'allie-message'}`}
          >
            {msg.text}
          </div>
        ))}
      </div>

      {/* FOOTER */}
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
