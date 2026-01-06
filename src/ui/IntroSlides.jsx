// src/ui/IntroSlides.jsx
import React, { useState } from "react";

/**
 * 3-slide, full-screen onboarding (self-contained)
 * - No “cards”; content sits directly on the gradient
 * - Single hero on slide 1, compact 2×2 grid on slide 2, pricing+trust on slide 3
 * - Sticky footer with Back/Next/Get started
 * - NO dots (per request)
 * - Uses your assets in /public/intro: mode_*.jpg + logos
 */
export default function IntroSlides({ onDone }) {
  const [i, setI] = useState(0);
  const isAppMode =
    typeof window !== "undefined" &&
    sessionStorage.getItem("is_app_mode_v1") === "1";
  
    const slides = [
    {
      key: "hero",
      title: "Chat naturally with Shraddha",
      sub: "Real talk, confessions & role-play.",
      hero: { src: "/intro/mode_stranger.jpg", alt: "Shraddha chat preview" },
      pills: ["Feels real", "Quick voice", "Switch vibes"],
    },
    {
      key: "trust",
      title: "Essentials before you start",
      cards: [
        { icon: "🏆", h: "Most realistic ever", sub: "Human-like chat & voice." },
        { icon: "🛡️", h: "Private, end-to-end", sub: "Your chats stay on your device." },
        {
  icon: "💳",
  h: isAppMode ? "Secure payment" : "Secure Razorpay",
  sub: isAppMode
    ? "UPI, cards — safe checkout."
    : "UPI, cards — bank-grade checkout.",
},
        { icon: "📮", h: "Support assured", sub: "Reach us anytime via feedback." },
        { icon: "🎁", h: "Free starter coins", sub: "Bonus on first sign-in." },
        { icon: "🗣️", h: "Keep chat or talk — enjoy voice with chat", sub: "Text 10 · Voice 18" },
      ],
      cta: { label: "Get started", action: () => onDone?.() },
    },
  ];
  const s = slides[i];
  const next = () => setI((v) => Math.min(v + 1, slides.length - 1));
  const back = () => setI((v) => Math.max(v - 1, 0));

  return (
    <div className={`introX ${s.key === "hero" ? "is-hero" : ""} ${s.key === "modes" ? "is-modes" : ""} ${s.key === "trust" ? "is-trust" : ""}`}>
      <style>{`
        .introX {
          position: fixed; inset: 0; z-index: 99999;
          display: flex; flex-direction: column;
          background: radial-gradient(120% 120% at 50% -10%, #ff6ec4 0%, #7c4dff 55%, #2b1e4a 100%);
          color: #fff;
        }
        .introX-inner {
          flex: 1 1 auto;
          width: 100%;
          max-width: 520px;
          margin: 0 auto;
          padding: 14px 18px 110px;  /* room for sticky footer */
          box-sizing: border-box;
          display: flex; flex-direction: column; gap: 10px;
        }
        .introX h1 {
          font-size: 28px; line-height: 1.15; font-weight: 800; margin: 8px 0 2px;
          letter-spacing: .2px;
        }
        .introX .sub { font-size: 16px; opacity: .95; }
        .introHead { text-align: center; }
        /* Pills (inline, subtle) */
        .pillRow { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
        .pill {
          font-size: 13.5px; font-weight: 700; color: #1e1e28;
          background: rgba(255,255,255,.92);
          border-radius: 999px; padding: 7px 11px;
          display: inline-flex; align-items: center; gap: 8px; user-select: none;
        }
        .pill:before { content: "✓"; opacity: .75; font-weight: 800; }

        /* Phone hero (9:19.5) — image fully visible */
        .hero {
          flex: 1 1 auto;
          display: flex; align-items: center; justify-content: center;
          margin-top: 6px;
        }
        .phoneFrame {
          width: 100%; max-width: 420px;
          border-radius: 18px; overflow: hidden;
          border: 1px solid rgba(255,255,255,.15);
          background: rgba(255,255,255,.08);
          position: relative;
          /* 9:19.5 aspect via top padding trick */
          padding-top: calc(100% * 19.5 / 9);
        }
        .phoneFrame img {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: cover;            /* fill the frame */
  object-position: 50% 0%;      /* anchor to top */
  background: #0b0b14;          /* keeps edge color if any */
  transform: translateY(-2%);   /* tiny lift to crop any black bar */
}

        /* Modes grid (2x2 on phones, 3-wide from 560px) */
        .gridWrap {
          margin-top: 6px;
          display: grid; gap: 10px; grid-template-columns: 1fr 1fr;
        }
        @media (min-width: 560px) { .gridWrap { grid-template-columns: 1fr 1fr 1fr; } }
        .tile {
          background: rgba(255,255,255,.92); color: #111;
          border-radius: 16px; overflow: hidden; border: 1px solid rgba(0,0,0,.06);
        }
        .tile .frame {
          position: relative; width: 100%; padding-top: calc(100% * 19.5 / 9);
          background: #0b0b14;
        }
        .tile img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }
        .tile .cap { text-align: center; font-weight: 800; padding: 8px 10px 10px; }

        .footNote { font-size: 12.5px; opacity: .9; margin-top: 2px; }

        /* Sticky footer (no dots) */
        .footer {
          position: fixed; left: 0; right: 0; bottom: 0;
          padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
          background: rgba(255,255,255,.9); color: #111;
          display: flex; align-items: center; justify-content: space-between; gap: 8px;
          border-top: 1px solid rgba(255,255,255,.55);
          backdrop-filter: blur(6px);
        }
        /* Slide 1: make footer invisible and keep only the button at bottom-right */
.introX.is-hero .footer {
  background: transparent;
  border-top: 0;
  backdrop-filter: none;
  justify-content: flex-end;              /* only "Next" on the right */
  padding: 8px 12px calc(10px + env(safe-area-inset-bottom, 0px));
}

/* Reduce bottom padding on Slide 1 so the invisible footer doesn't steal space */
.introX.is-hero .introX-inner {
  padding-bottom: 72px;
}
/* === Slide 2 (modes) — compact grid, no captions, proper footer === */
.introX.is-modes .introHead h1{
  font-size: 26px;
  margin-top: 4px;
}

.introX.is-modes .introX-inner{
  /* leave room for floating footer buttons only */
  padding-bottom: 72px;
}

.introX.is-modes .footer{
  background: transparent;
  border-top: 0;
  backdrop-filter: none;
  justify-content: space-between;          /* Back on left, Next on right */
  padding: 8px 12px calc(10px + env(safe-area-inset-bottom, 0px));
}

/* Grid sizing so all 4 tiles fit on one phone screen */
.introX.is-modes .gridWrap{
  margin-top: 8px;
  gap: 8px;                                 /* a touch tighter */
}

/* Simple rounded rectangle frames; no bezel, no black background */
.introX.is-modes .tile{
  border-radius: 14px;
}

/* slightly shorter frames to prevent bottom crop on many phones */
.introX.is-modes .tile .frame{
  padding-top: 168%;                         /* tweak 160–168% if needed */
  background: transparent;
}

.introX.is-modes .tile img{
  object-fit: cover;                         /* fill frame (no bars) */
  object-position: 50% 8%;                   /* slight top bias */
  background: transparent;
}

/* remove the white caption slab entirely on slide 2 */
.introX.is-modes .tile .cap{
  display: none;
}
        .btn { border: 0; border-radius: 12px; padding: 10px 14px; font-weight: 800; cursor: pointer; }
        .btn.sec { background: #eef0f5; color: #23262b; }
        .btn.pri { background: #ff3fb0; color: #fff; }
        /* Slide 2: force subtle Back button (wins over generic .btn.sec) */
.introX.is-modes .footer .btn.sec{
  background: rgba(255,255,255,.22) !important;
  color: #fff !important;
  border: 1px solid rgba(255,255,255,.35) !important;
}
/* === Slide 3 (trust) — single-column cards inside a glass panel === */
.introX.is-trust .introX-inner{
  padding-bottom: 72px; /* room for floating footer */
}
.introX.is-trust .footer{
  background: transparent;
  border-top: 0;
  backdrop-filter: none;
  justify-content: space-between; /* Back left, Get started right */
  padding: 8px 12px calc(10px + env(safe-area-inset-bottom, 0px));
}
/* make Back match slide 2 (subtle + translucent) */
.introX.is-trust .footer .btn.sec{
  background: rgba(255,255,255,.22) !important;
  color: #fff !important;
  border: 1px solid rgba(255,255,255,.35) !important;
}

/* Glass wrapper that groups the points and fills space nicely */
.trustGlass{
  margin-top: 16px;
  padding: 18px 18px 26px;
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(255,255,255,.18), rgba(255,255,255,.10));
  border: 1px solid rgba(255,255,255,.28);
  backdrop-filter: blur(8px);
  box-shadow: 0 10px 30px rgba(0,0,0,.18) inset, 0 6px 24px rgba(0,0,0,.10);
}

/* Icon cards — ONE per row */
.trustGrid{
  display: grid;
  grid-template-columns: 1fr;  /* single column */
  gap: 16px;
}

.trustCard{
  position: relative;
  background: rgba(255,255,255,.94);
  color: #111;
  border-radius: 18px;
  padding: 16px 18px;
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 12px;
  min-height: 82px;
  border: 1px solid rgba(0,0,0,.05);
  box-shadow: 0 4px 16px rgba(0,0,0,.08);
  transition: transform .15s ease, box-shadow .15s ease;
}
.trustCard:before{
  /* thin left accent bar */
  content:"";
  position:absolute; left:0; top:8px; bottom:8px; width:3px;
  border-radius: 3px;
  background: linear-gradient(180deg,#ffb4e6,#b29bff);
  opacity:.85;
}
.trustCard:active{ transform: scale(0.995); }
@media (hover:hover){
  .trustCard:hover{ transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0,0,0,.12); }
}

.trustIcon{
  font-size: 32px;
  line-height: 1;
  filter: drop-shadow(0 1px 1px rgba(0,0,0,.12));
}

.trustText .h{
  font-weight: 800;
  font-size: 17px;
}
.trustText .sub{
  font-size: 14px;
  opacity: .85;
  margin-top: 6px;
}
      `}</style>

      <div className="introX-inner">
        <header className="introHead">
         <h1>{s.title}</h1>
         {s.sub ? <div className="sub">{s.sub}</div> : null}
        </header>

        {/* Slide 1: hero */}
        {s.hero && (
          <>
            <div className="hero">
              <div className="phoneFrame">
  <img
    src={s.hero.src}
    alt={s.hero.alt}
    loading="eager"
    fetchpriority="high"
    decoding="async"
    width="900"
    height="1950"
  />
</div>
            </div>
            {s.pills && (
              <div className="pillRow">
                {s.pills.map((p) => (
                  <span key={p} className="pill">{p}</span>
                ))}
              </div>
            )}
          </>
        )}

        {/* Slide 2: modes */}
        {s.grid && (
          <>
            <div className="gridWrap" aria-label="Modes">
              {s.grid.map((g) => (
                <div key={g.label} className="tile">
                  <div className="frame">
  <img
    src={g.src}
    alt={g.label}
    loading="lazy"
    decoding="async"
    width="900"
    height="1500"
  />
</div>
                  <div className="cap">{g.label}</div>
                </div>
              ))}
            </div>
            {s.footNote && <div className="footNote">{s.footNote}</div>}
          </>
        )}

        {/* Slide 3: trust icon cards */}
{s.cards && (
  <div className="trustGlass">
    <div className="trustGrid" aria-label="Essentials before you start">
      {s.cards.map((c, idx) => (
        <div key={idx} className="trustCard">
          <div className="trustIcon">{c.icon}</div>
          <div className="trustText">
            <div className="h">{c.h}</div>
            <div className="sub">{c.sub}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
)}
</div>

      <div className="footer">
        <div>
          {i > 0 && (
            <button className="btn sec" onClick={back} aria-label="Back">Back</button>
          )}
        </div>
        <div>
          {s.cta ? (
            <button className="btn pri" onClick={s.cta.action} aria-label="Get started">
              {s.cta.label}
            </button>
          ) : (
            <button className="btn pri" onClick={next} aria-label="Next">
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
