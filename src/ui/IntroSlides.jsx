import React, { useState } from "react";

/**
 * Simple, self-contained 4-slide intro shown BEFORE sign-in.
 * Uses your images in /public/intro and no external CSS.
 * Call <IntroSlides onDone={() => ... } />
 */
export default function IntroSlides({ onDone }) {
  const [i, setI] = useState(0);

  const slides = [
    {
      key: "what",
      title: "Chat naturally with Shraddha",
      subtitle: "Realistic AI for talk, advice, and role-play.",
      bullets: ["Feels real", "Switch vibes anytime", "Quick voice replies"],
      img: null, // no GIF/video by request
      cta: null,
    },
    {
      key: "modes",
      title: "Pick a vibe, switch anytime",
      subtitle: "",
      bullets: [],
      // You uploaded these already:
      grid: [
        { label: "Wife", src: "/intro/mode_wife.jpg" },
        { label: "Girlfriend", src: "/intro/mode_girlfriend.jpg" },
        { label: "Bhabhi", src: "/intro/mode_bhabhi.jpg" },
        { label: "Ex-GF", src: "/intro/mode_exgf.jpg" },
        { label: "Stranger", src: "/intro/mode_stranger.jpg" },
      ],
      cta: null,
    },
    {
      key: "coins",
      title: "Simple and transparent",
      subtitle: "Text = 10 coins · Voice = 18 coins",
      bullets: ["Free starter coins", "Secure payment by Razorpay", "See your balance at the top right"],
      badges: [
        { alt: "Razorpay", src: "/intro/logo_razorpay.svg", w: 130 },
      ],
      cta: null,
    },
    {
      key: "trust",
      title: "Private & safe",
      subtitle: "",
      bullets: [
        "Only you can access your chats.",
        "Google sign-in verifies your email.",
        "Payments handled securely by Razorpay.",
        "Have a concern? Use “Ask anything (feedback)” in Modes.",
      ],
      badges: [
        { alt: "Google", src: "/intro/logo_google.svg", w: 60 },
        { alt: "Razorpay", src: "/intro/logo_razorpay.svg", w: 130 },
      ],
      cta: { label: "Get started", action: () => onDone?.() },
    },
  ];

  const s = slides[i];

  const goNext = () => setI((v) => Math.min(v + 1, slides.length - 1));
  const goBack = () => setI((v) => Math.max(v - 1, 0));

  return (
    <div className="intro-wrap" role="dialog" aria-modal="true">
      <style>{`
        .intro-wrap { position: fixed; inset: 0; background: radial-gradient(120% 120% at 50% -10%, #ff6ec4 0%, #7c4dff 55%, #2b1e4a 100%); display:flex; align-items:center; justify-content:center; padding:20px; z-index:99999; }
        .intro-card { width:min(720px, 92vw); background:#fff; border-radius:22px; box-shadow: 0 10px 40px rgba(0,0,0,.25); padding:20px 20px 16px; }
        .intro-head { padding:8px 4px 6px; }
        .intro-title { font-size:22px; font-weight:800; letter-spacing:.2px; color:#1b1b1b; }
        .intro-sub { color:#585a5c; margin-top:4px; }
        .intro-body { margin-top:12px; }
        .intro-bullets { display:grid; gap:8px; margin:12px 0 6px; }
        .intro-bullets li { list-style:none; background:#f6f7fb; padding:10px 12px; border-radius:12px; font-weight:500; color:#2f3140; }
        .intro-grid { display:grid; gap:10px; grid-template-columns: repeat(2, 1fr); }
        @media (min-width: 560px){ .intro-grid { grid-template-columns: repeat(3, 1fr); } }
        .mode-tile { border-radius:14px; overflow:hidden; background:#fafafa; border:1px solid #eee; }
        .mode-tile img { width:100%; height:160px; object-fit:cover; display:block; }
        .mode-tile .cap { padding:8px 10px; font-weight:600; text-align:center; }
        .badges { display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin-top:8px; }
        .intro-foot { display:flex; justify-content:space-between; align-items:center; margin-top:14px; }
        .intro-btn { padding:10px 14px; border-radius:12px; border:none; font-weight:700; cursor:pointer; }
        .intro-btn.secondary { background:#eef0f5; color:#23262b; }
        .intro-btn.primary { background:#ff3fb0; color:#fff; }
        .dots { display:flex; gap:6px; align-items:center; }
        .dot { width:8px; height:8px; border-radius:50%; background:#d9dbe7; }
        .dot.on { background:#ff3fb0; }
      `}</style>

      <div className="intro-card">
        <div className="intro-head">
          <div className="intro-title">{s.title}</div>
          {s.subtitle ? <div className="intro-sub">{s.subtitle}</div> : null}
        </div>

        <div className="intro-body">
          {s.grid ? (
            <div className="intro-grid" aria-label="Modes preview">
              {s.grid.map((g) => (
                <div key={g.label} className="mode-tile">
                  <img src={g.src} alt={g.label} />
                  <div className="cap">{g.label}</div>
                </div>
              ))}
            </div>
          ) : null}

          {s.bullets?.length ? (
            <ul className="intro-bullets">
              {s.bullets.map((b, idx) => <li key={idx}>{b}</li>)}
            </ul>
          ) : null}

          {s.badges?.length ? (
            <div className="badges">
              {s.badges.map((b, idx) => (
                <img key={idx} src={b.src} alt={b.alt} style={{ height: 28, width: "auto", maxWidth: b.w || 120 }} />
              ))}
            </div>
          ) : null}
        </div>

        <div className="intro-foot">
          <div className="dots" aria-label="Slide progress">
            {slides.map((_, idx) => <div key={idx} className={`dot ${idx === i ? "on" : ""}`} />)}
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {i > 0 && <button className="intro-btn secondary" onClick={goBack}>Back</button>}
            {s.cta
              ? <button className="intro-btn primary" onClick={s.cta.action}>{s.cta.label}</button>
              : <button className="intro-btn primary" onClick={goNext}>Next</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
