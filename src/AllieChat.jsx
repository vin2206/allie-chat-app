import React, { useState } from 'react';
import './App.css';
import avatar from './allie-profile.jpg'; // use your avatar image path

function AllieChat() {
  const [messages, setMessages] = useState([
    { text: 'Hi baby, how are you? Did you miss me?', sender: 'allie' }
  ]);
  const [inputValue, setInputValue] = useState('');

  const handleSend = async () => {
    if (inputValue.trim() === '') return;

    const newMessage = { text: inputValue, sender: 'user' };
    setMessages(prev => [...prev, newMessage, { text: 'typing...', sender: 'allie' }]);

    try {
      const formattedHistory = messages.map(msg => ({
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

      setMessages(prev => [...prev.slice(0, -1), { text: reply, sender: 'allie' }]);
    } catch (error) {
      console.error('Error calling Allie proxy:', error);
      setMessages(prev => [...prev.slice(0, -1), { text: 'Oops! Allie is quiet right now.', sender: 'allie' }]);
    }

    setInputValue('');
  };

  return (
    <div className="app-container">
      <div className="header">
        <img src={avatar} alt="Allie" />
        Allie
      </div>

      <div className="chat-window">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.sender === 'user' ? 'user' : 'assistant'}`}>
            {msg.text}
          </div>
        ))}
      </div>

      <div className="input-container">
        <input
          type="text"
          value={inputValue}
          placeholder="Type a message..."
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button onClick={handleSend}>➤</button>
      </div>
    </div>
  );
}

export default AllieChat;
