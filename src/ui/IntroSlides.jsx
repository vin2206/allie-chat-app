import React, { useState } from "react";

/**
 * Full-screen, vertical onboarding (no popup card)
 * - Edge-to-edge panels with a centered, tall column
 * - Sticky footer (Back / Next / Get started)
 * - Proper tall previews for Modes (uncropped phone-like aspect)
 * - Razorpay logo smaller on pricing; only Google shown on "Private & safe"
 *
 * Required assets in /public/intro (recommended ~900×1950):
 *   preview_wife.jpg, preview_girlfriend.jpg, preview_bhabhi.jpg,
 *   preview_exgf.jpg, preview_stranger.jpg
 * Optional tiny logos:
 *   logo_google.svg, logo_razorpay.svg
 */
export default function IntroSlides({ onDone }) {
  const [i, setI] = useState(0);

  const slides = [
    {
      key: "what",
      title: "Chat naturally with Shraddha",
      subtitle: "Realistic AI for talk, advice, and role-play.",
      pills: ["Feels real", "Switch vibes anytime", "Quick voice replies"],
    },
    {
      key: "modes",
      title: "Pick a vibe, switch anytime",
      subtitle: "",
      grid: [
        { label: "Wife",       src: "/intro/preview_wife.jpg" },
        { label: "Girlfriend", src: "/intro/preview_girlfriend.jpg" },
        { label: "Bhabhi",     src: "/intro/preview_bhabhi.jpg" },
        { label: "Ex-GF",      src: "/intro/preview_exgf.jpg" },
        { label: "Stranger",   src: "/intro/preview_stranger.jpg" },
      ],
    },
    {
      key: "coins",
      title: "Simple and transparent",
      subtitle: "Text = 10 coins · Voice = 18 coins",
      bullets: ["Free starter coins", "Secure payment by Razorpay", "See your balance at the top right"],
      badges: [{ alt: "Razorpay", src: "/intro/logo_razorpay.svg" }], // auto-height 22px
    },
    {
      key: "trust",
      title: "Private & safe",
      subtitle: "",
      bullets: [
        "Only you can access your chats.",
        "Google sign-in verifies your email.",
        "Have a concern? Use “Ask anything (feedback)” in Modes.",
      ],
      badges: [{ alt: "Google", src: "/intro/logo_google.svg" }], // only Google here
      cta: { label: "Get started", action: () => onDone?.() },
    },
  ];

  const s = slides[i];
  const next = () => setI(v => Math.min(v + 1, slides.length - 1));
  const back = () => setI(v => Math.max(v - 1, 0));

  return (
    <div className="intro-viewport">
      <style>{`
        /* Full-screen gradient canvas */
        .intro-viewport {
          position: fixed; inset: 0; z-index: 99999;
          background: radial-gradient(120% 120% at 50% -10%, #ff6ec4 0%, #7c4dff 55%, #2b1e4a 100%);
          display: flex; flex-direction: column;
          color: #121212;
        }

        /* Tall centered column */
        .intro-col {
          width: 100%;
          max-width: 480px;
          margin: 0 auto;
          padding: 24px 18px 92px; /* extra bottom for sticky footer */
          box-sizing: border-box;
          min-height: 100%;
          display: flex; flex-direction: column;
        }

        /* Header */
        .intro-title { font-size: 28px; line-height: 1.15; font-weight: 800; color: #fff; letter-spacing: .2px; }
        .intro-sub   { font-size: 16px; color: rgba(255,255,255,.9); margin-top: 6px; }

        /* Content blocks (white cards, but full-width & vertical) */
        .block {
          margin-top: 16px;
          background: #ffffff;
          border-radius: 16px;
          padding: 14px;
          box-shadow: 0 8px 30px rgba(0,0,0,.18);
        }

        /* Non-interactive pills to avoid “should I click?” confusion */
        .pill-row { display: flex; flex-wrap: wrap; gap: 8px; }
        .pill {
          font-size: 14px; font-weight: 600; color: #2f3140;
          background: #f0f2f8; border-radius: 999px; padding: 8px 12px;
          display: inline-flex; align-items: center; gap: 8px;
          user-select: none; cursor: default;
        }
        .pill::before {
          content: "✓"; font-weight: 800; opacity: .75;
        }

        /* Bullets */
        .bullets { display: grid; gap: 8px; }
        .bullets li { list-style: none; background: #f7f8fc; padding: 10px 12px; border-radius: 12px; font-size: 15px; color:#2f3140; }

        /* Modes grid with tall previews (phone-ish 9:19.5) */
        .modes-grid { display: grid; gap: 12px; grid-template-columns: 1fr 1fr; }
        @media (min-width: 560px) { .modes-grid { grid-template-columns: 1fr 1fr 1fr; } }
        .mode-tile { background: #fff; border-radius: 16px; border: 1px solid #eee; overflow: hidden; }
        .mode-frame { position: relative; width: 100%; /* 9:19.5 */ padding-top: calc(100% * 19.5 / 9); background: #fafafa; }
        .mode-frame img {
          position: absolute; inset: 0; width: 100%; height: 100%;
          object-fit: contain; /* show full page vertically, not cropped */
        }
        .mode-cap { padding: 8px 10px 12px; font-weight: 700; text-align: center; color: #1b1b1b; }

        /* Small badges row (logos) */
        .badges { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .badges img[alt="Razorpay"] { height: 22px; width: auto; }
        .badges img[alt="Google"]   { height: 22px; width: auto; }

        /* Sticky footer (safe-area aware) */
        .intro-footer {
          position: fixed; left: 0; right: 0; bottom: 0; z-index: 1;
          padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
          background: rgba(255,255,255,.9); backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: space-between; gap: 8px;
          border-top: 1px solid rgba(255,255,255,.5);
        }
        .dots { display: flex; gap: 6px; }
        .dot { width: 8px; height: 8px; border-radius: 50%; background: #c7c9d9; }
        .dot.on { background: #ff3fb0; }

        .btn { border: 0; border-radius: 12px; padding: 10px 14px; font-weight: 800; cursor: pointer; }
        .btn.secondary { background: #eef0f5; color: #23262b; }
        .btn.primary   { background: #ff3fb0; color: #fff; }
      `}</style>

      <div className="intro-col">
        {/* Headline */}
        <div>
          <div className="intro-title">{s.title}</div>
          {s.subtitle ? <div className="intro-sub">{s.subtitle}</div> : null}
        </div>

        {/* Content blocks */}
        {s.pills && s.pills.length > 0 && (
          <div className="block">
            <div className="pill-row">
              {s.pills.map((p, idx) => (
                <span key={idx} className="pill">{p}</span>
              ))}
            </div>
          </div>
        )}

        {s.grid && (
          <div className="block">
            <div className="modes-grid" aria-label="Modes preview">
              {s.grid.map(g => (
                <div key={g.label} className="mode-tile">
                  <div className="mode-frame">
                    <img src={g.src} alt={g.label} loading="lazy" />
                  </div>
                  <div className="mode-cap">{g.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {s.bullets && s.bullets.length > 0 && (
          <div className="block">
            <ul className="bullets">
              {s.bullets.map((b, idx) => <li key={idx}>{b}</li>)}
            </ul>
            {s.badges && s.badges.length > 0 && (
              <div className="badges" style={{ marginTop: 10 }}>
                {s.badges.map((b, idx) => (
                  <img key={idx} src={b.src} alt={b.alt} loading="lazy" />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky footer */}
      <div className="intro-footer">
        <div className="dots" aria-label="Slide progress">
          {slides.map((_, idx) => (
            <div key={idx} className={`dot ${idx === i ? "on" : ""}`} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {i > 0 && (
            <button className="btn secondary" onClick={back} aria-label="Back">Back</button>
          )}
          {s.cta ? (
            <button className="btn primary" onClick={s.cta.action} aria-label="Get started">
              {s.cta.label}
            </button>
          ) : (
            <button className="btn primary" onClick={next} aria-label="Next">Next</button>
          )}
        </div>
      </div>
    </div>
  );
}
