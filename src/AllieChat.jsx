import React, { useEffect, useRef, useState } from "react";
import "./ChatUI.css";

// ====== CONFIG ======
const API_URL = "https://allie-chat-proxy-production.up.railway.app/chat";
// ====================

function AllieChat() {
  const [messages, setMessages] = useState([
    { text: "Hi… kaise ho aap? ☺️", sender: "allie", time: ts() },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // voice recording state
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
  // -------------------------------

  useEffect(() => {
    ensureSessionId();
  }, []);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // ---------- TEXT SEND ----------
  const handleSend = async () => {
    if (!inputValue.trim() || isPaused) return;

    // Owner unlock (local-only)
    if (inputValue.trim() === "#unlockvinay1236") {
      setIsOwner(true);
      setInputValue("");
      setMessages((prev) => [
        ...prev,
        { text: "✅ Owner mode unlocked! Unlimited chat enabled.", sender: "allie", time: ts() },
      ]);
      return;
    }

    const newMessage = { text: inputValue, sender: "user", time: ts() };
    const historyForBackend = [...messages, newMessage].map((m) => ({
      role: m.sender === "user" ? "user" : "assistant",
      content: m.text || "",
    }));

    setMessages((prev) => [...prev, newMessage]);
    setInputValue("");
    setIsTyping(true);

    try {
      const body = {
        messages: historyForBackend,
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
        setMessages((prev) => [...prev, { text: data.reply, sender: "allie", time: ts() }]);
        setTimeout(() => setShowModal(true), 400);
        return;
      }

      // Pause window (your backend already sets this)
      if (data.pause) {
        setIsPaused(true);
        setMessages((prev) => [...prev, { text: data.reply, sender: "allie", time: ts() }]);
        setTimeout(() => {
          setIsPaused(false);
          setMessages((prev) => [
            ...prev,
            { text: "Hi… wapas aa gayi hoon 😳 tum miss kar rahe the na?", sender: "allie", time: ts() },
          ]);
        }, 5 * 60 * 1000);
        return;
      }

      // Voice OR text (never both)
      if (data.audioUrl) {
        setMessages((prev) => [...prev, { audioUrl: data.audioUrl, sender: "allie", time: ts() }]);
      } else {
        const replyText = data.reply || "Hmm… Shraddha didn’t respond.";
        setMessages((prev) => [...prev, { text: replyText, sender: "allie", time: ts() }]);
      }
    } catch (err) {
      console.error("Proxy error:", err);
      setIsTyping(false);
      setMessages((prev) => [...prev, { text: "Oops! Shraddha is quiet right now.", sender: "allie", time: ts() }]);
    }
  };
