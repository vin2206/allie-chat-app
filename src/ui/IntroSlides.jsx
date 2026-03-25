import React, { useEffect, useState } from 'react';
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
  const [heroScrolled, setHeroScrolled] = useState(false);

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

    const container = document.querySelector('.shr-landing');
    const onScroll = () => {
      if (container) setHeroScrolled(container.scrollTop > 80);
    };
    container?.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      observer.disconnect();
      container?.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <div className="shr-landing">
      <div className="shr-noise" aria-hidden="true" />

      <div className="shr-landing__glow" aria-hidden="true">
        <span className="shr-landing__light shr-landing__light--one" />
        <span className="shr-landing__light shr-landing__light--two" />
        <span className="shr-landing__light shr-landing__light--three" />
      </div>

      {/* ─── HERO ─── */}
      <section className="shr-landing__hero">
        <div className="shr-landing__wrap">
          <div className="shr-landing__hero-grid">
            <div className="shr-landing__hero-copy">
              <h1 className="shr-hero-title">
                <span className="shr-hero-title__line shr-hero-title__line--top">
                  India&apos;s best
                </span>
                <span className="shr-hero-title__line shr-hero-title__line--mid">
                  roleplay AI
                </span>
                <span className="shr-hero-title__line shr-hero-title__line--bot">
                  companion
                </span>
              </h1>
              <p>
                Step into intimate conversations, emotionally rich roleplay, and voice moments that
                feel personal, elegant, and deeply immersive every time you return.
              </p>
            </div>

            <div className="shr-landing__hero-media" aria-hidden="true">
              <div className="shr-hero-chat-wrap">
                <span className="shr-hero-chat-glow" />

                <div className="shr-hero-chat">
                  {/* gradient border overlay */}
                  <span className="shr-hero-chat__border" />

                  {/* header */}
                  <div className="shr-hero-chat__head">
                    <div className="shr-hero-chat__av">S</div>
                    <div className="shr-hero-chat__info">
                      <strong>Shraddha</strong>
                      <span>
                        <i /> Online now
                      </span>
                    </div>
                  </div>

                  {/* messages */}
                  <div className="shr-hero-chat__body">
                    <div className="shr-chat-row shr-chat-row--her">
                      <div className="shr-chat-bbl">
                        <span className="shr-chat-ln" style={{ width: '88%' }} />
                        <span className="shr-chat-ln" style={{ width: '60%' }} />
                      </div>
                    </div>

                    <div className="shr-chat-row shr-chat-row--you">
                      <div className="shr-chat-bbl shr-chat-bbl--you">
                        <span className="shr-chat-ln" style={{ width: '74%' }} />
                      </div>
                    </div>

                    <div className="shr-chat-row shr-chat-row--her">
                      <div className="shr-chat-bbl">
                        <span className="shr-chat-ln" style={{ width: '94%' }} />
                        <span className="shr-chat-ln" style={{ width: '76%' }} />
                        <span className="shr-chat-ln" style={{ width: '46%' }} />
                      </div>
                      <span className="shr-chat-heart">♥</span>
                    </div>

                    <div className="shr-chat-row shr-chat-row--her">
                      <div className="shr-chat-dots">
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                  </div>

                  {/* input */}
                  <div className="shr-hero-chat__foot">
                    <div className="shr-chat-input" />
                    <div className="shr-chat-send">
                      <svg viewBox="0 0 24 24" fill="none" width="13" height="13">
                        <path
                          d="M22 2L11 13"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        <path
                          d="M22 2L15 22L11 13L2 9L22 2Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* floating voice chip */}
                <div className="shr-hero-chip shr-hero-chip--voice">
                  <span className="shr-hero-chip__bars">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <i key={i} />
                    ))}
                  </span>
                  <span className="shr-hero-chip__label">0:12</span>
                </div>

                {/* floating heart */}
                <div className="shr-hero-chip shr-hero-chip--heart">♥</div>
              </div>
            </div>
          </div>
        </div>

        {/* scroll hint */}
        <div
          className={`shr-scroll-hint${heroScrolled ? ' is-hidden' : ''}`}
          onClick={() => scrollToSection('shr-about')}
          role="button"
          tabIndex={0}
          aria-label="Scroll to explore"
          onKeyDown={(e) => {
            if (e.key === 'Enter') scrollToSection('shr-about');
          }}
        >
          <span className="shr-scroll-hint__track">
            <span className="shr-scroll-hint__glow" />
          </span>
        </div>
      </section>

      {/* ─── MAIN (unchanged) ─── */}
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
                <li>
                  Girlfriend <span>Premium</span>
                </li>
                <li>
                  Wife <span>Premium</span>
                </li>
                <li>
                  Bhabhi <span>Premium</span>
                </li>
                <li>
                  Ex-GF <span>Premium</span>
                </li>
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
