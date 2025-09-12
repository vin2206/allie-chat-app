// src/components/CoinsModal.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { prewarmRazorpay, openRazorpay } from "../lib/razorpay";

// Packs (match your current UI copy/prices)
const PACKS = [
  { id: "daily",  title: "Daily Recharge",  coins: 420,  priceInr: 49,  secondary: false },
  { id: "weekly", title: "Weekly Recharge", coins: 2000, priceInr: 199, secondary: true, best: "Best value" },
];

export default function CoinsModal({
  open,
  onClose,
  // Optional: parent can listen
  onSuccess,
  // Optional: prefill info for checkout
  prefill = {},
  // If you already create orders server-side, provide this function.
  // It must return {orderId, amountPaise} or full Razorpay options overrides.
  createOrderForPack, // async (pack) => ({ orderId, amountPaise })
}) {
  const [connecting, setConnecting] = useState(false);
  const timerRef = useRef(null);

  // Read key from env (Vercel → Environment Variables)
  const keyId = useMemo(
    () => (process.env.REACT_APP_RAZORPAY_KEY_ID || window.__RZP_KEY__ || "").trim(),
    []
  );

  useEffect(() => {
    if (open) prewarmRazorpay(); // pre-load SDK the moment modal opens
    return () => clearTimeout(timerRef.current);
  }, [open]);

  if (!open) return null;

  async function handleBuy(pack) {
    // Show fallback message if checkout is not visible within ~1s
    clearTimeout(timerRef.current);
    setConnecting(false);
    timerRef.current = setTimeout(() => setConnecting(true), 1000);

    try {
      // 1) Default path (no backend changes): open with amount directly.
      //    For production you should create an Order on your server and pass order_id instead.
      let options = {
        key: keyId,
        name: "BuddyBy",
        description: pack.title,
        currency: "INR",
        // Using amount directly (in paise) — replace with order_id once your backend returns one.
        amount: pack.priceInr * 100,
        notes: { pack: pack.id, coins: pack.coins },
        prefill,
        theme: { color: "#ff0a85" },
      };

      // 2) If you already have a server API, let it override with order_id etc.
      if (typeof createOrderForPack === "function") {
        const ord = await createOrderForPack(pack);
        if (ord && (ord.orderId || ord.order_id)) {
          options = {
            ...options,
            amount: undefined, // not needed when using order_id
            order_id: ord.orderId || ord.order_id,
          };
        }
        if (ord && ord.options) options = { ...options, ...ord.options };
      }

      if (!options.key) {
        alert("Razorpay key is missing. Add REACT_APP_RAZORPAY_KEY_ID in Vercel → Project Settings → Environment Variables.");
        return;
      }

      const result = await openRazorpay(options);
      clearTimeout(timerRef.current);
      setConnecting(false);
      if (onSuccess) onSuccess({ pack, result });
      onClose?.();
    } catch (err) {
      clearTimeout(timerRef.current);
      setConnecting(false);
      // dismissed/error → just stay on modal; no crash
      if (err?.type !== "dismissed") console.warn("Payment error:", err);
    }
  }

  return (
    <div className="premium-modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Scoped, tiny CSS for the loader so we don't touch your global styles */}
        <style>{`
          .rzp-status { display:flex; align-items:center; justify-content:center; gap:8px; margin-top:10px; color:#666; font-size:13px; }
          .rzp-spinner { width:14px; height:14px; border-radius:50%; border:2px solid rgba(0,0,0,.18); border-top-color: rgba(0,0,0,.6); animation: rzpSpin 1s linear infinite; }
          @keyframes rzpSpin { to { transform: rotate(360deg); } }
        `}</style>

        <h3 className="coins-modal-title">Need more time with Shraddha?</h3>
        <div className="coins-sub">Unlock roleplay models — Wife · Girlfriend · Bhabhi · Ex-GF</div>

        {/* Rate chips */}
        <div className="rate-chips" style={{ marginTop: 8 }}>
