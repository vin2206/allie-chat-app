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

        const fetchBody = { messages: formattedHistory };
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

        setMessages((prev) => {
          const updatedPrev = [...prev.slice(0, -1)];
          updatedPrev[updatedPrev.length - 1].seen = true;
          return [...updatedPrev, { text: reply, sender: 'allie', time: currentTime }];
        });
      } catch (error) {
        setIsTyping(false);
        console.error('Error calling Allie proxy:', error);
        setMessages((prev) => [...prev.slice(0, -1), { text: 'Oops! Allie is quiet right now.', sender: 'allie' }]);
      }
    }, 1500);
  };

  useEffect(() => {
    const chatContainer = document.querySelector('.chat-container');
    if (chatContainer) {
      chatContainer.scrollTop = chatContain
