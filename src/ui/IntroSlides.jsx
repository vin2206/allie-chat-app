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

  const slides = [
    {
      key: "hero",
      title: "Chat naturally with Shraddha",
      sub: "Real talk, confessions & role-play.",
      hero: { src: "/intro/mode_stranger.jpg", alt: "Shraddha chat preview" },
      pills: ["Feels real", "Quick voice", "Switch vibes"],
    },
    {
      key: "modes",
      title: "Pick a vibe — switch anytime",
      grid: [
        { label: "Wife",       src: "/intro/mode_wife.jpg" },
        { label: "Girlfriend", src: "/intro/mode_girlfriend.jpg" },
        { label: "Bhabhi",     src: "/intro/mode_bhabhi.jpg" },
        { label: "Ex-GF",      src: "/intro/mode_exgf.jpg" },
      ],
      footNote: "Stranger is the default — you can change anytime.",
    },
    {
      key: "trust",
      title: "Simple & safe",
      sub: "Text 10 · Voice 18",
      bullets: [
        "Free starter coins",
        "Razorpay checkout",
        "Balance at top-right",
        "Sign in with Google",
        "Only you see your chats",
        "Ask anything via feedback",
      ],
      logos: [
        { alt: "Razorpay", src: "/intro/logo_razorpay.svg" },
        { alt: "Google",   src: "/intro/logo_google.svg" },
      ],
      cta: { label: "Get started", action: () => onDone?.() },
    },
  ];

  const s = slides[i];
  const next = () => setI((v) => Math.min(v + 1, slides.length - 1));
  const back = () => setI((v) => Math.max(v - 1, 0));

  return (
    <div className={`introX ${s.key === "hero" ? "is-hero" : ""}`}>
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

        /* Bullets + logos (no cards) */
        .bullets { display: grid; gap: 8px; margin-top: 10px; }
        .bullets .b {
          background: rgba(255,255,255,.92); color: #13131a;
          border-radius: 12px; padding: 10px 12px; font-size: 15px; font-weight: 600;
        }
        .logos { display: flex; align-items: center; gap: 14px; margin-top: 12px; opacity: .95; }
        .logos img { height: 22px; width: auto; filter: grayscale(1) contrast(1.05); }

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
        .btn { border: 0; border-radius: 12px; padding: 10px 14px; font-weight: 800; cursor: pointer; }
        .btn.sec { background: #eef0f5; color: #23262b; }
        .btn.pri { background: #ff3fb0; color: #fff; }
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
                <img src={s.hero.src} alt={s.hero.alt} loading="eager" />
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
                    <img src={g.src} alt={g.label} loading="lazy" />
                  </div>
                  <div className="cap">{g.label}</div>
                </div>
              ))}
            </div>
            {s.footNote && <div className="footNote">{s.footNote}</div>}
          </>
        )}

        {/* Slide 3: bullets + logos */}
        {s.bullets && (
          <>
            <div className="bullets">
              {s.bullets.map((b, idx) => (
                <div key={idx} className="b">{b}</div>
              ))}
            </div>
            {s.logos && (
              <div className="logos">
                {s.logos.map((l, idx) => (
                  <img key={idx} src={l.src} alt={l.alt} loading="lazy" />
                ))}
              </div>
            )}
          </>
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
