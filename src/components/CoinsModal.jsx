// src/components/CoinsModal.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { prewarmRazorpay, openRazorpay } from "../lib/razorpay";

// Packs (match your UI/prices)
const PACKS = [
  { id: "daily",  title: "Daily Recharge",  coins: 420,  priceInr: 49,  secondary: false },
  { id: "weekly", title: "Weekly Recharge", coins: 2000, priceInr: 199, secondary: true, best: "Best value" },
];

export default function CoinsModal({
  open,
  onClose,
  onSuccess,            // optional (used only if we open Razorpay here)
  onChoose,             // parent-driven flow (calls your buyPack)
  prefill = {},
  createOrderForPack,   // optional server-order path if you want to open here
}) {
  const [connecting, setConnecting] = useState(false);
  const timerRef = useRef(null);

  // Only needed if we open Razorpay directly from the client
  const keyId = useMemo(
    () => (process.env.REACT_APP_RAZORPAY_KEY_ID || window.__RZP_KEY__ || "").trim(),
    []
  );

  useEffect(() => {
    if (open) prewarmRazorpay(); // warm SDK when modal opens
    return () => clearTimeout(timerRef.current);
  }, [open]);

  if (!open) return null;

  async function handleBuy(pack) {
    // Preferred: let parent handle (your buyPack with server order)
    if (typeof onChoose === "function") {
      onChoose(pack.id);
      return;
    }

    // Fallback: open Razorpay from here
    clearTimeout(timerRef.current);
    setConnecting(false);
    timerRef.current = setTimeout(() => setConnecting(true), 1000);

    try {
      let options = {
        key: keyId,
        name: "BuddyBy",
        description: pack.title,
        currency: "INR",
        amount: pack.priceInr * 100, // paise
        notes: { pack: pack.id, coins: pack.coins },
        prefill,
        theme: { color: "#ff0a85" },
      };

      if (typeof createOrderForPack === "function") {
        const ord = await createOrderForPack(pack);
        if (ord && (ord.orderId || ord.order_id)) {
          options = { ...options, amount: undefined, order_id: ord.orderId || ord.order_id };
        }
        if (ord && ord.options) options = { ...options, ...ord.options };
      }

      if (!options.order_id && !options.amount) {
        alert("Razorpay options are missing amount/order_id.");
        return;
      }
      if (!options.key) {
        alert("Missing Razorpay key. Either return key via server order or set REACT_APP_RAZORPAY_KEY_ID.");
        return;
      }

      const result = await openRazorpay(options);
      clearTimeout(timerRef.current);
      setConnecting(false);
      onSuccess?.({ pack, result });
      onClose?.();
    } catch (err) {
      clearTimeout(timerRef.current);
      setConnecting(false);
      if (err?.type !== "dismissed") console.warn("Payment error:", err);
    }
  }

  return (
    <div className="premium-modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Tiny scoped CSS for spinner */}
        <style>{`
          .rzp-status { display:flex; align-items:center; justify-content:center; gap:8px; margin-top:10px; color:#666; font-size:13px; }
          .rzp-spinner { width:14px; height:14px; border-radius:50%; border:2px solid rgba(0,0,0,.18); border-top-color: rgba(0,0,0,.6); animation: rzpSpin 1s linear infinite; }
          @keyframes rzpSpin { to { transform: rotate(360deg); } }
        `}</style>

        <h3 className="coins-modal-title">Need more time with Shraddha?</h3>
        <div className="coins-sub">Unlock roleplay models — Wife · Girlfriend · Bhabhi · Ex-GF</div>

        {/* Rates */}
        <div className="rate-chips" style={{ marginTop: 8 }}>
          <div className="rate-chip">Text = 10 coins</div>
          <div className="rate-chip">Voice = 18 coins</div>
        </div>

        {/* Packs */}
        <div className="packs">
          {PACKS.map((p) => (
            <button
              key={p.id}
              className={`pack-btn ${p.secondary ? "secondary" : ""}`}
              onClick={() => handleBuy(p)}
            >
              <div className="pack-left">
                <div className="pack-title">{p.title}</div>
                <div className="pack-sub">+{p.coins} coins</div>
              </div>
              <div className="pack-right">
                <div className="pack-price">₹{p.priceInr}</div>
                <div className="pack-cta">Buy</div>
              </div>
              {p.best ? <div className="best-badge">{p.best}</div> : null}
            </button>
          ))}
        </div>

        {/* “Connecting…” helper (only shows if this component opens Razorpay) */}
        {connecting && (
          <div className="rzp-status">
            <div className="rzp-spinner" />
            <span>Connecting to Razorpay…</span>
          </div>
        )}

        <button className="close-modal" onClick={onClose} aria-label="Close">Close</button>
      </div>
    </div>
  );
}
