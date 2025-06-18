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
        setMessages((prev) => [...prev.slice(0, -1), { text: reply, sender: 'allie' }]);
      } catch (error) {
        console.error('Error calling Allie proxy:', error);
        setMessages((prev) => [...prev.slice(0, -1), { text: 'Oops! Allie is quiet right now.', sender: 'allie' }]);
      }
    }, 1500);
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="App">
      <div className="header">
        <div className="profile-section">
          <div className="profile-pic">
            <img src="https://i.imgur.com/1X3e1zV.png" alt="Allie" />
          </div>
          <div className="username-container">
            <div className="username">Allie</div>
            {messages[messages.length - 1]?.text === 'typing...' && (
              <div className="typing-indicator">typing...</div>
            )}
          </div>
        </div>
      </div>

      <div className="chat-container" ref={chatContainerRef}>
        {messages.filter(msg => msg.text !== 'typing...').map((msg, index) => (
          <div key={index} className={`message-row ${msg.sender === 'user' ? 'user' : 'allie'}`}>
            {msg.sender === 'allie' && (
              <div className="avatar">
                <img src="https://i.imgur.com/1X3e1zV.png" alt="Allie" />
              </div>
            )}
            <div className={`message-bubble ${msg.sender}`}>{msg.text}</div>
          </div>
        ))}
        {messages[messages.length - 1]?.text === 'typing...' && (
          <div className="message-row allie">
            <div className="avatar">
              <img src="https://i.imgur.com/1X3e1zV.png" alt="Allie" />
            </div>
            <div className="message-bubble typing-bubble">typing...</div>
          </div>
        )}
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
