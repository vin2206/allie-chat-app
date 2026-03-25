import React, { useEffect } from 'react';
import './IntroSlides.css';

const companionFeatures = [
  {
    title: 'Natural emotional chat',
    description: 'Conversations feel warm, personal, and emotionally present.'
  },
  {
    title: 'Indian and Hinglish feel',
    description: 'Replies flow naturally in the way you already speak every day.'
  },
  {
    title: 'Personal companion energy',
    description: 'Shraddha remembers your vibe and feels close, not generic.'
  },
  {
    title: 'Always available',
    description: 'Any mood, any time, she is there when you want to talk.'
  }
];

const modePreview = [
  { name: 'Stranger', image: '/avatars/shraddha_stranger_full.jpg', status: 'Free' },
  { name: 'Girlfriend', image: '/avatars/shraddha_girlfriend_full.jpg', status: 'Premium' },
  { name: 'Wife', image: '/avatars/shraddha_wife_full.jpg', status: 'Premium' },
  { name: 'Bhabhi', image: '/avatars/shraddha_bhabhi_full.jpg', status: 'Premium' },
  { name: 'Ex-GF', image: '/avatars/shraddha_exgf_full.jpg', status: 'Premium' }
];

function scrollToSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function IntroSlides({ onDone }) {
  useEffect(() => {
    const sections = document.querySelectorAll('.shr-section');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -50px 0px' }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="shr-landing">
      <div className="shr-noise" aria-hidden="true" />

      <div className="shr-landing__glow" aria-hidden="true">
        <span className="shr-landing__light shr-landing__light--one" />
        <span className="shr-landing__light shr-landing__light--two" />
        <span className="shr-landing__light shr-landing__light--three" />
      </div>

      <section className="shr-landing__hero">
        <div className="shr-landing__wrap">
          <div className="shr-landing__hero-grid">
            <div className="shr-landing__hero-copy">
              <h1>India&apos;s best roleplay AI companion</h1>
              <p>
                Step into intimate conversations, emotionally rich roleplay, and voice moments that
                feel personal, elegant, and deeply immersive every time you return.
              </p>
            </div>

            <div className="shr-landing__hero-media" aria-hidden="true">
              <div className="shr-hero-composition">
                <span className="shr-hero-aura shr-hero-aura--one" />
                <span className="shr-hero-aura shr-hero-aura--two" />

                <div className="shr-hero-panel shr-hero-panel--main">
                  <span className="shr-hero-msg shr-hero-msg--one" />
                  <span className="shr-hero-msg shr-hero-msg--two" />
                  <span className="shr-hero-msg shr-hero-msg--three" />
                  <span className="shr-hero-wave">
                    {Array.from({ length: 10 }).map((_, index) => (
                      <i key={index} />
                    ))}
                  </span>
                </div>

                <div className="shr-hero-panel shr-hero-panel--chat">
                  <span className="shr-hero-dot shr-hero-dot--chat" />
                  <span className="shr-hero-mini-line" />
                </div>

                <div className="shr-hero-panel shr-hero-panel--voice">
                  <span className="shr-hero-dot shr-hero-dot--voice" />
                  <span className="shr-hero-mini-line shr-hero-mini-line--short" />
                </div>

                <span className="shr-hero-badge" />
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="shr-scroll-cue"
          onClick={() => scrollToSection('shr-about')}
          aria-label="Scroll to explore"
        >
          <span>Scroll to explore</span>
          <i />
        </button>
      </section>

      <main className="shr-landing__main">
        <section className="shr-section shr-section--about" id="shr-about">
          <div className="shr-section__head">
            <p className="shr-section__tag">What is Shraddha</p>
            <h2>A premium emotional AI companion made to feel real</h2>
          </div>
          <div className="shr-feature-grid">
            {companionFeatures.map((feature) => (
              <article key={feature.title} className="shr-glass-card">
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="shr-section shr-section--modes" id="shr-modes">
          <div className="shr-section__head">
            <p className="shr-section__tag">Explore modes</p>
            <h2>Choose the relationship vibe you want</h2>
          </div>
          <div className="shr-mode-grid">
            {modePreview.map((mode) => {
              const isFree = mode.status === 'Free';
              return (
                <article key={mode.name} className={`shr-mode-card ${isFree ? '' : 'is-locked'}`}>
                  <div className="shr-mode-card__media">
                    <img src={mode.image} alt={mode.name} loading="lazy" decoding="async" />
                  </div>
                  <div className="shr-mode-card__meta">
                    <h3>{mode.name}</h3>
                    <span className={`shr-pill ${isFree ? 'is-free' : 'is-locked'}`}>
                      {isFree ? 'Free' : 'Premium'}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="shr-section shr-section--flow">
          <div className="shr-section__head">
            <p className="shr-section__tag">How modes work</p>
            <h2>Tap Modes, pick a relationship mode, and continue chatting</h2>
          </div>
          <div className="shr-ui-card">
            <div className="shr-ui-card__left">
              <p>1. Open the Modes menu.</p>
              <p>2. Pick your preferred relationship mode.</p>
              <p>3. Continue with a fresh roleplay vibe instantly.</p>
            </div>
            <div className="shr-ui-card__right">
              <div className="shr-mini-topbar">
                <span>Shraddha</span>
                <button type="button">Modes</button>
              </div>
              <ul>
                <li className="active">Stranger</li>
                <li>Girlfriend <span>Premium</span></li>
                <li>Wife <span>Premium</span></li>
                <li>Bhabhi <span>Premium</span></li>
                <li>Ex-GF <span>Premium</span></li>
              </ul>
            </div>
          </div>
        </section>

        <section className="shr-section shr-section--voice">
          <div className="shr-section__head">
            <p className="shr-section__tag">Voice notes</p>
            <h2>Tap the mic and send voice notes in seconds</h2>
          </div>
          <div className="shr-voice-layout">
            <div className="shr-glass-card">
              <h3>Speak naturally</h3>
              <p>
                Use the mic button to send short voice notes and make conversations feel even more
                alive.
              </p>
            </div>
            <div className="shr-voice-card">
              <div className="shr-mic-orb">Mic</div>
              <div className="shr-wave" aria-hidden="true">
                {Array.from({ length: 14 }).map((_, index) => (
                  <span key={index} />
                ))}
              </div>
              <p>Voice note sent</p>
            </div>
          </div>
        </section>

        <section className="shr-section shr-section--coins">
          <div className="shr-section__head">
            <p className="shr-section__tag">Coins and recharge</p>
            <h2>Start free, then unlock more time and premium modes</h2>
          </div>
          <div className="shr-coins-layout">
            <div className="shr-glass-card">
              <h3>250 free coins for first-time users</h3>
              <p>Stranger mode starts free. Recharge unlocks longer chat and premium modes.</p>
            </div>
            <div className="shr-pack-preview">
              <h3>Recharge packs</h3>
              <div className="shr-pack-row">
                <span>Daily Pack</span>
                <strong>Rs 49 - 420 coins</strong>
              </div>
              <div className="shr-pack-row featured">
                <span>Weekly Pack</span>
                <strong>Rs 199 - 2000 coins</strong>
              </div>
              <p>Numbers shown are a preview of current in-app recharge packs.</p>
            </div>
          </div>
        </section>

        <section className="shr-section shr-final-cta">
          <p className="shr-section__tag">Start now</p>
          <h2>Meet Shraddha and begin your story tonight</h2>
          <button type="button" className="shr-btn shr-btn--primary" onClick={onDone}>
            Let&apos;s go
          </button>
        </section>
      </main>
    </div>
  );
}
