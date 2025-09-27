/* eslint-env browser */
/* global atob, FormData, Image, URLSearchParams */
/* eslint-disable no-console, no-alert, react-hooks/exhaustive-deps, no-unused-vars */
import React, { useState, useEffect, useRef } from 'react';
import './ChatUI.css';
import { startVersionWatcher } from './versionWatcher';
// Razorpay warm-up + standalone coins modal
import CoinsModal from './components/CoinsModal';
import { prewarmRazorpay, handleCoinPurchase } from './lib/razorpay';
// --- small utility ---
function debounce(fn, wait = 120) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}
// --- Legacy Android detector (Realme/MIUI font-boost guard) ---
function looksLegacyAndroidWebView() {
  const ua = navigator.userAgent || '';
  const isAndroid = /Android/i.test(ua);
  // try to read Chrome/WebView major version
  const m = ua.match(/Chrome\/(\d+)/i);
  const chromeMajor = m ? parseInt(m[1], 10) : 0;
  // loose OEM hints often seen on old Realme/MIUI builds
  const oemHint = /MIUI|Redmi|Realme|Build\/RMX/i.test(ua);
  // treat Chrome/WebView < 95 as "legacy" (old font-boost behaviour)
  const isLegacyVer = chromeMajor > 0 && chromeMajor < 95;
  return isAndroid && (isLegacyVer || oemHint);
}
// --- Google Sign-In (GIS) ---
const GOOGLE_CLIENT_ID = '962465973550-2lhard334t8kvjpdhh60catlb1k6fpb6.apps.googleusercontent.com';
const parseJwt = (t) => {
  const base = t.split('.')[1];
  const b64 = base.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(base.length / 4) * 4, '=');
  return JSON.parse(atob(b64));
};
// --- Silent re-auth helpers ---
let __idRefreshTimer = null;

// Wait until GIS is available (shared)
const ensureGisLoaded = () =>
  new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const start = Date.now();
    const t = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(t); resolve();
      } else if (Date.now() - start > 8000) {
        clearInterval(t); reject(new Error('GIS load timeout'));
      }
    }, 50);
  });

// Schedule a refresh ~5 min before token expiry
function scheduleIdRefresh(u) {
  try {
    if (!u?.idToken) return;
    if (__idRefreshTimer) clearTimeout(__idRefreshTimer);
    const { exp } = parseJwt(u.idToken);               // seconds
    const msLeft   = exp * 1000 - Date.now();
    const fireIn   = Math.max(60_000, msLeft - 5 * 60_000); // min 1 min
    __idRefreshTimer = setTimeout(() => {
      // Triggers our GIS callback without interrupting UI (auto_select)
      window.google?.accounts?.id?.prompt();
    }, fireIn);
  } catch {}
}

// Initialize GIS for background credential refresh (no UI)
function enableSilentReauth(clientId, setUser) {
  window.google.accounts.id.initialize({
    client_id: clientId,
    auto_select: true,                // allows quiet refresh if user already chose an account
    callback: (res) => {
      try {
        const p = parseJwt(res.credential);
        const next = {
          name: p.name || '',
          email: (p.email || '').toLowerCase(),
          sub: p.sub,
          picture: p.picture || '',
          idToken: res.credential
        };
        saveUser(next);
        setUser(next);               // updates headers everywhere
        scheduleIdRefresh(next);     // re-arm the next refresh
      } catch (e) {
        console.error('silent re-auth parse failed', e);
      }
    }
  });
}
// --- backend base ---
const BACKEND_BASE = 'https://allie-chat-proxy-production.up.railway.app';
const authHeaders = (u) => (u?.idToken ? { Authorization: `Bearer ${u.idToken}` } : {});
// --- CSRF header helper ---
const getCsrf = () => {
  try {
    const m = document.cookie.match(/(?:^|;\s*)bb_csrf=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : '';
  } catch { return ''; }
};
// === Coins config (Option A agreed) ===
const TEXT_COST = 10;
const VOICE_COST = 18; // keep 18; change to 15 only if you insist
const DAILY_PACK = { id: 'daily',  label: 'Daily Pack',  price: 49,  coins: 420 };
const WEEKLY_PACK= { id: 'weekly', label: 'Weekly Pack', price: 199, coins: 2000 };
const OWNER_EMAILS = ['vinayvedic23@gmail.com'];
// — Display labels for roles (UI only)
const ROLE_LABELS = {
  wife: 'Wife',
  girlfriend: 'Girlfriend',
  bhabhi: 'Bhabhi',
  exgf: 'Ex-GF',
  stranger: 'Stranger'
};

// === Voice quota per day ===
const FREE_DAILY_VOICE_LIMIT = 2;     // Free users
const PAID_DAILY_VOICE_LIMIT = 8;    // Paid users (tweak anytime)

// Use local day so quota resets at the user's midnight
const isoDay = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`; // YYYY-MM-DD (local)
};
const userIdFor = (u) => (u?.sub || u?.email || 'anon').toLowerCase();
const voiceKey = (paid, u) => `voice_used_${paid ? 'paid' : 'free'}_${userIdFor(u)}_${isoDay()}`;

const getVoiceUsed = (paid, u) => Number(localStorage.getItem(voiceKey(paid, u)) || 0);
const bumpVoiceUsed = (paid, u) => {
  const k = voiceKey(paid, u);
  localStorage.setItem(k, String(getVoiceUsed(paid, u) + 1));
};

// localStorage helpers
const AUTORENEW_KEY = 'autorenew_v1'; // {daily:bool, weekly:bool}
// --- NEW: lightweight auth (local only) ---
const USER_KEY = 'user_v1';
const welcomeKeyFor = (id) => `welcome_${id}_v1`; // id = sub (preferred) or email

const loadUser = () => {
  try { return JSON.parse(localStorage.getItem(USER_KEY)); }
  catch { return null; }
};
const saveUser = (u) => localStorage.setItem(USER_KEY, JSON.stringify(u));
const loadAuto = () => {
  try { return JSON.parse(localStorage.getItem(AUTORENEW_KEY)) || { daily:false, weekly:false }; }
  catch { return { daily:false, weekly:false }; }
};
const saveAuto = (obj) => localStorage.setItem(AUTORENEW_KEY, JSON.stringify(obj));
function ConfirmDialog({ open, title, message, onCancel, onConfirm, okOnly=false, okText='OK', cancelText='Cancel' }) {
  if (!open) return null;
  return (
    <div className="confirm-backdrop" role="dialog" aria-modal="true">
      <div className="confirm-modal">
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="confirm-buttons">
          {!okOnly && <button className="btn-secondary" onClick={onCancel}>{cancelText}</button>}
          <button className="btn-primary" onClick={onConfirm}>{okText}</button>
        </div>
      </div>
    </div>
  );
}
/* ---------- Sign-in: Google only (centered) ---------- */
function AuthGate({ onSignedIn }) {
  useEffect(() => {
    let cancelled = false;
    // Ensure the GIS script exists (if not already added in index.html)
if (!document.querySelector('script[src*="gsi/client"]')) {
  const s = document.createElement('script');
  s.src = 'https://accounts.google.com/gsi/client';
  s.async = true;
  s.defer = true;
  document.head.appendChild(s);
}

    // NEW: wait until window.google.accounts.id actually exists
    const waitForGoogle = () =>
      new Promise((resolve, reject) => {
        if (window.google?.accounts?.id) return resolve();
        const start = Date.now();
        const t = setInterval(() => {
          if (window.google?.accounts?.id) {
            clearInterval(t);
            resolve();
          } else if (Date.now() - start > 8000) {
            clearInterval(t);
            reject(new Error('GIS load timeout'));
          }
        }, 50);
      });

    waitForGoogle()
      .then(() => {
        if (cancelled) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
           auto_select: true, 
          callback: (res) => {
            try {
              const p = parseJwt(res.credential);
              onSignedIn({
      name: p.name || '',
      email: (p.email || '').toLowerCase(),
      sub: p.sub,
      picture: p.picture || '',
      idToken: res.credential     // <<— add this
    });
            } catch (e) {
              console.error('GIS parse failed', e);
            }
          },
        });

        const host = document.querySelector('.gbtn-wrap');
        const el = document.getElementById('googleSignIn');
        if (el && host) {
          host.classList.remove('ready'); // keep hidden
          requestAnimationFrame(() => {
            const w = Math.min(320, Math.max(240, Math.floor((host.clientWidth || host.getBoundingClientRect().width) || 280)));
            el.innerHTML = '';
            window.google.accounts.id.renderButton(el, {
              theme: 'outline',
              size: 'large',
              text: 'continue_with',
              shape: 'pill',
              width: w,
            });
            requestAnimationFrame(() => host.classList.add('ready')); // reveal
          });
        }
      })
      .catch((e) => console.error('GIS load failed:', e));

    return () => { cancelled = true; };
  }, [onSignedIn]);

  return (
    <div className="auth-backdrop">
      <div className="auth-card">
        <img className="auth-logo" src="/shraddha-logo.png" alt="Shraddha — AI Girlfriend" />

        <div className="auth-sub">Sign in to chat with a Realistic AI Girlfriend</div>

        <div className="google-row">
  <div className="gbtn-wrap">
    <div id="googleSignIn" />
  </div>
</div>
      </div>
    </div>
  );
}
/* ---------- Welcome flow (Bonus -> Instructions) ---------- */
function WelcomeFlow({ open, onClose, amount = 100, defaultStep = 0 }) {
  // defaultStep: 0 = show bonus screen first, 1 = jump directly to instructions
  const [step, setStep] = React.useState(defaultStep);
  const [claimed, setClaimed] = React.useState(false);

  // Reset to the right step every time the modal is opened
  React.useEffect(() => {
    if (open) setStep(defaultStep);
  }, [open, defaultStep]);

  if (!open) return null;

const goNext = (e) => { if (e && typeof e.stopPropagation === 'function') e.stopPropagation(); setStep(1); };
const close = (e) => {
  if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
  setStep(0);
  onClose && onClose();
};

  return (
    <div className="welcome-backdrop" onClick={close}>
      <div
        className="welcome-card"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {step === 0 ? (
          <>
            <div className="welcome-burst">🎉</div>
            <h3>Welcome!</h3>
            <p>You’ve unlocked a <b>first-time bonus</b>.</p>
            <div className="welcome-amount">+{amount} coins</div>
            <button
  className="welcome-btn"
  disabled={claimed}
  onClick={async (e) => {
    e?.stopPropagation?.();
    try {
      const r = await fetch(`${BACKEND_BASE}/claim-welcome`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(loadUser()),
          'X-CSRF-Token': getCsrf()
        },
        credentials: 'include',
        body: JSON.stringify({})
      });
      const data = await r.json();
      if (data?.ok && data?.wallet) {
        // mark claimed in this browser too
        const uid = (loadUser()?.sub || loadUser()?.email || '');
        localStorage.setItem(welcomeKeyFor(uid), '1');
        if (typeof window.refreshWalletGlobal === 'function') window.refreshWalletGlobal();

        // inline success (no native alert)
        setClaimed(true);
        // auto-advance to instructions after a short beat
        setTimeout(() => setStep(1), 700);
      } else {
        // even if backend says “already claimed”, move on quietly
        setStep(1);
      }
    } catch {
      // on network hiccup, still move to instructions to avoid trapping user
      setStep(1);
    }
  }}
>
  {claimed ? '✅ +100 added' : 'Claim 100 coins'}
</button>
            <div className="welcome-note">Roleplay models are part of the upgrade.</div>
          </>
        ) : (
          <>
            <h3 className="instr-title">How to talk to Shraddha</h3>
            <div className="instr-sub">Make it real. Be gentle. Enjoy the flow.</div>

            <ul className="instr-list">
              <li><b>Talk to her like a real girl.</b> Shraddha has emotions, intelligence, and simplicity—speak naturally.</li>
              <li><b>Start with trust.</b> Share a little about yourself first. Once she’s comfortable, the conversation will naturally shape to your vibe.</li>
              <li><b>Choose your bond.</b> She can be your friend, a safe space for confessions, or your emotional partner—whatever you need today.</li>
              <li><b>Talk it out, regain focus.</b> Let her ease your urge to chat with a loving presence so you can return to real life with better concentration.</li>
              <li><b>Unlock deeper modes.</b> Access Wife, Girlfriend, Bhabhi, or Ex-GF role-play for more personalized chats—upgrade anytime with a Daily or Weekly plan.</li>
            </ul>

            <div className="instr-quick">Quick tips</div>
            <ul className="tips-list">
              <li>Keep messages short and honest.</li>
              <li>Be patient; she warms up as trust builds.</li>
              <li><b>Type one message at a time and wait for her reply.</b></li>
            </ul>

            <button className="welcome-btn" onClick={close}>Start chatting</button>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- Character Insight (translucent, top, tap-to-dismiss) ---------- */
function CharacterPopup({ open, roleMode, roleType, onClose }) {
  // Always call hooks; exit early *inside* the effect if closed
  React.useEffect(() => {
    if (!open) return;
    const t = setTimeout(onClose, 10000); // auto-dismiss in 10s
    const onEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onEsc);
    return () => { clearTimeout(t); document.removeEventListener('keydown', onEsc); };
  }, [open, onClose]);

  // Reuse your labels
  const titleRole =
    roleMode === 'roleplay' && roleType
      ? (ROLE_LABELS[roleType] || 'Stranger')
      : 'Stranger';

  const INSIGHTS = {
    stranger:
      "A 24-yr girl who loves acting but family doesn't support. She helps her father in a small business and is an introvert who opens up online.",
    wife:
      "A 28-yr housewife, who loves to fulfill her husband's every wish — a little jealous too.",
    bhabhi:
      "A 30-yr woman, unsatisfied in her marriage, witty and affectionate toward her devar; young, fit boys are her weakness.",
    girlfriend:
      "A 25-yr possessive girl who loves her boyfriend more than anyone, but her jealousy often causes problems.",
    exgf:
      "A 26-yr spicy girl who gets bored quickly. Confused right now — loves her boyfriend but also likes her ex and chats with him when alone."
  };

  const key = roleMode === 'roleplay' ? (roleType || 'stranger') : 'stranger';
  const text = INSIGHTS[key];

  if (!open) return null;

  return (
    <div className="charpop-overlay" onClick={onClose}>
      <div className="character-popup" onClick={(e) => e.stopPropagation()}>
        <div className="charpop-title">Shraddha — {titleRole}</div>
        <div className="charpop-body">{text}</div>
      </div>
    </div>
  );
}

function AllieChat() {
  // NEW: auth + welcome
const [user, setUser] = useState(loadUser());
const [showSigninBanner, setShowSigninBanner] = useState(false);
 // --- Stop background Google prompts; rely on our 14-day server cookie ---
useEffect(() => {
  if (__idRefreshTimer) { clearTimeout(__idRefreshTimer); __idRefreshTimer = null; }
}, [user?.idToken]);

  useEffect(() => {
  const stop = startVersionWatcher(60000);
  return stop;
}, []);
const [showWelcome, setShowWelcome] = useState(false);
const [showCharPopup, setShowCharPopup] = useState(false);
const [welcomeDefaultStep, setWelcomeDefaultStep] = useState(0);
const [coins, setCoins] = useState(0);
  // server-driven wallet
const [wallet, setWallet] = useState({ coins: 0, expires_at: 0, welcome_claimed: false });
  // --- NEW: wallet load gate + welcome "seen once" helpers ---
const [walletReady, setWalletReady] = useState(false);
// Layout chooser: Android → 'stable' (scrollable, no black band); others → 'fixed'
const IS_ANDROID = /Android/i.test(navigator.userAgent);
const [layoutClass] = useState(IS_ANDROID ? 'stable' : 'fixed');
  useEffect(() => {
  prewarmRazorpay().catch(() => {});
}, []);
  // Warm Razorpay early so checkout feels instant
useEffect(() => { if (user) setShowSigninBanner(false); }, [user]);

// Show bonus for real newcomers, otherwise just instructions
useEffect(() => {
  if (!user || !walletReady) return;

  // also suppress if this browser already claimed it once
  const uid = user?.sub || user?.email || '';
  const localClaimed = !!localStorage.getItem(welcomeKeyFor(uid));

  const claimed = !!wallet?.welcome_claimed || localClaimed;
  const lowCoins = (Number(wallet?.coins || 0) < 50); // “feels new” heuristic

  if (!claimed && lowCoins) {
    setWelcomeDefaultStep(0); // show bonus screen
    setShowWelcome(true);
  } else {
    setWelcomeDefaultStep(1); // show instructions only
    setShowWelcome(true);
  }
}, [user, walletReady, wallet?.welcome_claimed, wallet?.coins]);

  function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

function getOpener(mode, type) {
  if (mode !== 'roleplay') {
    return pick([
      "Hi… kaise ho? 🙂",
      "Hey, kya chal raha hai? 🙂"
    ]);
  }
  switch ((type || '').toLowerCase()) {
    case 'wife':
      return pick([
        "Jaan, aaj itni der laga di reply mein?",
        "Thak gaye ho? Aaj jaldi aao na.",
        "Dinner ke liye kya chahiye, jaan?"
      ]);
    case 'girlfriend':
      return pick([
        "Miss kiya tumhe aaj.",
        "Aaj late ho gaye… yaad aayi meri? 😉",
        "Kahan busy the babu?"
      ]);
    case 'bhabhi':
      return pick([
        "Arre devarji, ab aaye? ☺️",
        "Subah se gayab the, kahaan the?",
        "Aaj kaise ho, devarji?"
      ]);
    case 'exgf':
      return pick([
        "Itna time baad yaad aayi meri? 😉",
        "Abhi bhi meri photo dekhte ho na… sach btao.",
        "Aaj achanak se ping? Kya hua?"
      ]);
    default:
      return "Hi… kaise ho? 🙂";
  }
}
  const [messages, setMessages] = useState([
  { text: getOpener('stranger', null), sender: 'allie' }
]);
  const [inputValue, setInputValue] = useState('');
  const bottomRef = useRef(null);
  // NEW: track if we should auto-stick to bottom (strict, WhatsApp-like)
const scrollerRef = useRef(null);
 // ADD BELOW your other refs/state in AllieChat()
const walletReqIdRef = useRef(0); // last-write-wins guard for /wallet fetches 
const stickToBottomRef = useRef(true); // true only when truly at bottom
const readingUpRef = useRef(false);    // true when user scrolled up (locks auto-scroll)
const imeLockRef = useRef(false); // ignore scroll logic during IME open/close animation
const kbChaseTimerRef = useRef(null); // NEW: keep-last-bubble-visible during IME animation
const isFallback = () =>
  document.documentElement.classList.contains('page-scroll-fallback');

const scrollToBottomNow = (force = false) => {
  if (!force && readingUpRef.current) return;
  const anchor = bottomRef.current;
  if (!anchor) return;
  // Let the browser scroll the *active* container (inner or page)
  anchor.scrollIntoView({ block: 'end', inline: 'nearest', behavior: 'auto' });
};
  // Does roleplay require premium? (server-controlled)
const [roleplayNeedsPremium, setRoleplayNeedsPremium] = useState(true);

useEffect(() => {
  fetch(`${BACKEND_BASE}/config`, { credentials: 'include' })
    .then(r => r.json())
    .then(d => setRoleplayNeedsPremium(!!d.roleplayNeedsPremium))
    .catch(() => {}); // keep safe default = true
}, []);
  const [isOwner, setIsOwner] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  useEffect(() => {
  // Listen on the correct scroller: window (fallback) or .chat-container (normal)
  const targetIsWindow = isFallback();
  const el = targetIsWindow
    ? window
    : (scrollerRef.current || document.querySelector('.chat-container'));
  if (!el) return;

  const releaseRead = () => { readingUpRef.current = false; };
  const releaseReadDebounced = debounce(releaseRead, 150);

  const onScroll = () => {
    // Android IME fires synthetic scrolls; don’t treat those as user scrolls
    if (imeLockRef.current) return;

    if (targetIsWindow) {
      const root = document.scrollingElement || document.documentElement;
      const dist = root.scrollHeight - window.scrollY - window.innerHeight;
      const atBottom = dist <= 12;
      stickToBottomRef.current = atBottom;
      if (dist > 120) readingUpRef.current = true;
      if (atBottom) releaseReadDebounced();
    } else {
      const s = scrollerRef.current || document.querySelector('.chat-container');
      if (!s) return;
      const dist = s.scrollHeight - s.scrollTop - s.clientHeight;
      const atBottom = dist <= 12;
      stickToBottomRef.current = atBottom;
      if (dist > 120) readingUpRef.current = true;
      if (atBottom) releaseReadDebounced();
    }
  };

  // seed once
  requestAnimationFrame(onScroll);

  if (targetIsWindow) {
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  } else {
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }
}, [layoutClass]); // rebind when model changes
  
  // ——— Emoji picker state/refs ———
const [showEmoji, setShowEmoji] = useState(false);
const emojiPanelRef = useRef(null);
const inputRef = useRef(null);

const EMOJIS = [
  "😀","😁","😂","😊","😍","😘","💦","🤔","😏","😎","😈","😭","😡","😴","🤩","😜","🤤",
  "👍","👎","👨‍👩‍👦","🐍","🙏","💪","💖","💔","🔥","💯","🎉","✨","🌹","🥰"
];

function insertEmoji(emo) {
  const el = inputRef.current;
  if (!el) return;
  const start = el.selectionStart ?? inputValue.length;
  const end   = el.selectionEnd ?? inputValue.length;
  const next  = inputValue.slice(0, start) + emo + inputValue.slice(end);
  setInputValue(next);
  // place caret after inserted emoji
  requestAnimationFrame(() => {
    el.focus();
    const pos = start + emo.length;
    el.setSelectionRange(pos, pos);
  });
}

// close picker on outside click / ESC
useEffect(() => {
  if (!showEmoji) return;
  const onDocClick = (e) => {
    if (emojiPanelRef.current && emojiPanelRef.current.contains(e.target)) return;
    const btn = document.querySelector('.emoji-inside');
    if (btn && btn.contains(e.target)) return;
    setShowEmoji(false);
  };
  const onEsc = (e) => { if (e.key === 'Escape') setShowEmoji(false); };
  document.addEventListener('mousedown', onDocClick);
  document.addEventListener('keydown', onEsc);
  return () => {
    document.removeEventListener('mousedown', onDocClick);
    document.removeEventListener('keydown', onEsc);
  };
}, [showEmoji]);

async function refreshWallet(){
  if (!user) return;

  setWalletReady(false);

  const reqId = ++walletReqIdRef.current; // mark this as the latest request

  try {
    const r = await fetch(`${BACKEND_BASE}/wallet`, { headers: authHeaders(user), credentials: 'include' });

    // If our 14-day cookie is missing/invalid, show the quiet banner and stop here.
    if (r.status === 401 || r.status === 403) {
      if (reqId !== walletReqIdRef.current) return; // stale response
      setShowSigninBanner(true);
      setWalletReady(false);
      return;
    }

    const data = await r.json();

    // Ignore stale responses (older than the most recent call)
    if (reqId !== walletReqIdRef.current) return;

    if (data?.ok) {
      setWallet(data.wallet);
      setCoins(Number(data.wallet.coins || 0));  // source of truth = server
      setWalletReady(true);
    } else {
      setWalletReady(true); // allow UI to settle even if not ok
    }
  } catch (e) {
    console.error('refreshWallet failed:', e);
    // Only touch readiness if this is still the latest request
    if (reqId !== walletReqIdRef.current) return;
    setWalletReady(true);
  }
}

useEffect(() => { refreshWallet(); }, [user]);
  // Expose a safe global hook for child components (WelcomeFlow) to refresh wallet
useEffect(() => {
  window.refreshWalletGlobal = () => refreshWallet();
  return () => { delete window.refreshWalletGlobal; };
}, [user]);
  // ADD BELOW the window.refreshWalletGlobal effect
useEffect(() => {
  const onVisible = () => {
    if (document.visibilityState === 'visible') refreshWallet();
  };
  const onPageShow = () => refreshWallet();

  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('pageshow', onPageShow);

  return () => {
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('pageshow', onPageShow);
  };
}, [user]);
  async function maybeFinalizePayment(){
  if (!window.location.pathname.includes('/payment/thanks')) return;
  const qs = new URLSearchParams(window.location.search);
  const link_id      = qs.get('razorpay_payment_link_id');
  const payment_id   = qs.get('razorpay_payment_id');
  const reference_id = qs.get('razorpay_payment_link_reference_id');
  const status       = qs.get('razorpay_payment_link_status');
  const signature    = qs.get('razorpay_signature');

  if (!link_id || !payment_id || !reference_id || !status) return;

  try {
    const r = await fetch(`${BACKEND_BASE}/verify-payment-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(user), 'X-CSRF-Token': getCsrf() },
      body: JSON.stringify({
  link_id, payment_id, reference_id, status, signature,
  userEmail: (user?.email || '').toLowerCase()
}),
credentials: 'include'
});
    const data = await r.json();
    if (data?.ok) {
      setWallet(data.wallet);
      setCoins(data.wallet.coins);
      openNotice('All set', `+${data.lastCredit.coins} coins added—she’s waiting for you 🥰`, () => {
   window.history.replaceState(null, '', '/');
  });
    } else {
      // stay quiet; webhook/auto refresh will reflect shortly
    }
  } catch (e) {
    console.error(e);
    // stay quiet; wallet will catch up via webhook/refresh
  }
}

useEffect(() => { maybeFinalizePayment(); }, [user]);

const [showCoins, setShowCoins] = useState(false);
  // Razorpay UI/flow helpers
const [isPaying, setIsPaying] = useState(false);  // drives "Connecting…" and disables buttons
const [orderCache, setOrderCache] = useState({}); // { daily: {...}, weekly: {...} }
const ORDER_TTL_MS = 15 * 60 * 1000; // match server TTL for freshness
const [autoRenew] = useState(loadAuto()); // setter not needed
useEffect(() => saveAuto(autoRenew), [autoRenew]);
  // Auto-unlock Owner mode if signed-in email matches
useEffect(() => {
  if (!user) return;
  setIsOwner(OWNER_EMAILS.includes((user.email || '').toLowerCase()));
}, [user]);

const openCoins = () => setShowCoins(true);
const closeCoins = () => setShowCoins(false);
  async function buyPack(pack){
  if (!user) return;

  // show "Connecting…" immediately
  setIsPaying(true);

  try {
    // Use pre-created order if available; otherwise create now
    let ord = orderCache[pack.id];
    if (!ord) {
      const resp = await fetch(`${BACKEND_BASE}/order/${pack.id}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...authHeaders(user), 'X-CSRF-Token': getCsrf() },
  body: JSON.stringify({}),
  credentials: 'include'
});
      const data = await resp.json();
      if (!data?.ok) throw new Error(data?.error || 'order_failed');
      ord = data;
      setOrderCache(prev => ({ ...prev, [pack.id]: { ...data, at: Date.now() } }));
    }
    // 🔄 Freshness check: if cached order is too old, create a fresh one (keeps 1-tap feel)
if (ord?.at && (Date.now() - ord.at > ORDER_TTL_MS)) {
  const resp2 = await fetch(`${BACKEND_BASE}/order/${pack.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(user), 'X-CSRF-Token': getCsrf() },
    body: JSON.stringify({}),
    credentials: 'include'
  });
  const data2 = await resp2.json();
  if (data2?.ok) {
    ord = data2;
    setOrderCache(prev => ({ ...prev, [pack.id]: { ...data2, at: Date.now() } }));
  }
}

    // Build options (exactly what you were passing into new Razorpay)
const options = {
  key: ord.key_id,
  amount: ord.amount,
  currency: ord.currency,
  name: 'BuddyBy',
  description: `Shraddha ${pack.label}`,
  order_id: ord.order_id,
  prefill: {
    name: user?.name || '',
    email: (user?.email || '').toLowerCase(),
    contact: user?.phone || ''
  },
  theme: { color: '#ff3fb0' },
  modal: { ondismiss: () => setIsPaying(false) }
};

// Open checkout → close pricing → verify quietly → toast when credited
await handleCoinPurchase({
  options,
  closePricingModal: closeCoins,
  verifyPayment: async (resp) => {
    const v = await fetch(`${BACKEND_BASE}/verify-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(user), 'X-CSRF-Token': getCsrf() },
      body: JSON.stringify(resp), // { razorpay_order_id, razorpay_payment_id, razorpay_signature }
      credentials: 'include'
    });
    const out = await v.json();
    if (out?.ok) {
      setWallet(out.wallet);
      setCoins(out.wallet.coins);
      return { creditedCoins: out?.lastCredit?.coins || 0 };
    }
    // not yet verified → let webhook do its job, but don't alert
    throw new Error('not_verified_yet');
  },
  onWalletRefetch: refreshWallet,
  toast: (msg) => openNotice('All set', msg) // friendly in-UI popup
});
setIsPaying(false);
  } catch (e) {
  // If the user simply closed the Razorpay modal, do NOT fallback to payment link.
  if (e?.type === 'dismissed') {
    setIsPaying(false);
    return;
  }

  console.error('Checkout failed, falling back to Payment Link:', e?.message || e);
  setIsPaying(false);  // clear state before fallback

  // Fallback to old Payment Link flow (unchanged)
  try {
    const resp = await fetch(`${BACKEND_BASE}/buy/${pack.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(user), 'X-CSRF-Token': getCsrf() },
      body: JSON.stringify({ returnUrl: `${window.location.origin}/payment/thanks` }),
      credentials: 'include'
    });

    const data = await resp.json();
    if (data?.ok) window.location.href = data.short_url;
    else alert('Could not start payment: ' + (data?.error || e?.message || 'unknown_error'));
  } catch (e2) {
    alert('Could not start payment: ' + (e2?.message || 'unknown_error'));
  }
 }
}
  const [cooldown, setCooldown] = useState(false);

  // Pre-create Razorpay orders as soon as the Coins modal opens (so click opens instantly)
useEffect(() => {
  if (!showCoins || !user) return;
  prewarmRazorpay().catch(() => {});
  const packs = ['daily', 'weekly'];

  packs.forEach(async (id) => {
    if (orderCache[id] && (Date.now() - (orderCache[id].at || 0) < ORDER_TTL_MS)) return; // cached & fresh

    try {
      const resp = await fetch(`${BACKEND_BASE}/order/${id}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...authHeaders(user), 'X-CSRF-Token': getCsrf() },
  body: JSON.stringify({}),
  credentials: 'include'
});
      const data = await resp.json();
      if (data?.ok) {
        setOrderCache(prev => ({ ...prev, [id]: { ...data, at: Date.now() } }));
      }
    } catch (e) {
      // ignore; we'll fall back to creating on click
      console.warn('precreate order failed:', id, e?.message);
    }
  });
}, [showCoins, user]);
  // --- Roleplay wiring (Step 1) ---
const [roleMode, setRoleMode] = useState('stranger');
const [roleType, setRoleType] = useState(null);
  // DP lightbox
const [showAvatarFull, setShowAvatarFull] = useState(false);

// Preload the current role's full image so the popup appears instantly
useEffect(() => {
  const img = new Image();
  img.src = getFullAvatarSrc(roleMode, roleType);
}, [roleMode, roleType]);

// Close on ESC
useEffect(() => {
  if (!showAvatarFull) return;
  const onKey = (e) => e.key === 'Escape' && setShowAvatarFull(false);
  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
}, [showAvatarFull]);
const [showRoleMenu, setShowRoleMenu] = useState(false);
  // custom confirm modal state
const [confirmState, setConfirmState] = useState({
  open: false, title: '', message: '', onConfirm: null, okOnly: false
});
const openConfirm = (title, message, onConfirm) =>
  setConfirmState({ open: true, title, message, onConfirm, okOnly: false });

const openNotice = (title, message, after) =>
  setConfirmState({
    open: true, title, message, okOnly: true,
    onConfirm: () => { closeConfirm(); if (typeof after === 'function') after(); }
  });

const closeConfirm = () =>
  setConfirmState(s => ({ ...s, open: false, onConfirm: null, okOnly: false }));
  // Next request should clear server context after a role switch
const shouldResetRef = useRef(false);
  const roleMenuRef = useRef(null);

// Display name for header
const displayName = 'Shraddha';
const capRole = roleType ? (ROLE_LABELS[roleType] || roleType) : '';
  // --- HOLD-TO-RECORD state/refs ---
const [isRecording, setIsRecording] = useState(false);
  // Persistent session id per device/browser (used for voice quota)
const sessionIdRef = useRef(null);
if (!sessionIdRef.current) {
  const saved = localStorage.getItem('chat_session_id');
  if (saved) {
    sessionIdRef.current = saved;
  } else {
  const newId = (window.crypto && typeof window.crypto.randomUUID === 'function')
    ? window.crypto.randomUUID()
    : String(Date.now());
  localStorage.setItem('chat_session_id', newId);
  sessionIdRef.current = newId;
}
}
  // Tie the session to the chosen role to avoid context bleed
const roleSuffix = roleMode === 'roleplay' && roleType ? `:${roleType}` : ':stranger';
const sessionIdWithRole = `${sessionIdRef.current}${roleSuffix}`;
const mediaRecorderRef = useRef(null);
const chunksRef = useRef([]);
const autoStopTimerRef = useRef(null);
const MAX_RECORD_MS = 5000; // 5 seconds cap
  const roleColors = {
  wife: '#ff6ec4',
  girlfriend: '#ff9f40',
  bhabhi: '#7c4dff',
  exgf: '#00bcd4',
};
  // Avatar map
const avatarMap = {
  stranger: '/avatars/shraddha_stranger.png',
  wife: '/avatars/shraddha_wife.png',
  girlfriend: '/avatars/shraddha_girlfriend.png',
  bhabhi: '/avatars/shraddha_bhabhi.png',
  exgf: '/avatars/shraddha_exgf.png',
};
  // Preload avatars once when the chat mounts
  useEffect(() => {
    Object.values(avatarMap).forEach(src => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // Full-size photos for the DP lightbox
const avatarFullMap = {
  stranger: '/avatars/shraddha_stranger_full.jpg',
  wife: '/avatars/shraddha_wife_full.jpg',
  girlfriend: '/avatars/shraddha_girlfriend_full.jpg',
  bhabhi: '/avatars/shraddha_bhabhi_full.jpg',
  exgf: '/avatars/shraddha_exgf_full.jpg',
};

function getFullAvatarSrc(mode, type) {
  if (mode === 'roleplay' && type && avatarFullMap[type]) return avatarFullMap[type];
  return avatarFullMap.stranger;
}

function getAvatarSrc(mode, type) {
  if (mode === 'roleplay' && type && avatarMap[type]) return avatarMap[type];
  return avatarMap.stranger;
}
// optional: simple day string
const today = () => new Date().toLocaleDateString('en-GB');
  // Did the user ask for a voice reply?
// Put near the top of AllieChat.jsx
const askedForVoice = (text = "") => {
  const t = (text || "").toLowerCase();

  // noun: voice/audio/awaaz/awaz/avaaz/avaj/awaj (loose spelling)
  const noun = /(voice|audio|a+w?a+a?j|a+w?a+a?z|awaaz|awaz|avaaz|avaj|awaj)/i;
  // verb: send/bhejo/bhejdo/sunao/sunado/(allow “na”, “do”, “please”, “to” etc. anywhere)
  const verb = /(bhej(?:o|do)?|send|suna(?:o|do)?)/i;

  // We consider it a real request only if sentence contains BOTH a noun and a verb,
  // in any order, with anything in between (e.g., “avaaz to sunado please”).
  return noun.test(t) && verb.test(t);
};
  
const applyRoleChange = (mode, type) => {
  // premium gate for roleplay
  if (mode === 'roleplay' && roleplayNeedsPremium && !isOwner) {
    const active = (wallet?.expires_at || 0) > Date.now();
    if (!active) {
      setShowRoleMenu(false);
      openCoins();
      return;
    }
  }

  // set state, but DO NOT save to localStorage
  setRoleMode(mode);
  setRoleType(type);

  // close menu
  setShowRoleMenu(false);

  // show the correct opener
  const opener = getOpener(mode, type);
  setMessages([{ text: opener, sender: 'allie' }]);
  readingUpRef.current = false;
  stickToBottomRef.current = true;
  setTimeout(() => scrollToBottomNow(true), 0);

  // clear server context on next request
  shouldResetRef.current = true;
  setShowCharPopup(true);   // show insight each time the user switches roles
};
  // --------- PRESS & HOLD mic handlers ---------
const startRecording = async () => {
  if (isTyping || cooldown) return;
  // Daily voice quota check
  if (!isOwner) {
    const paid = (wallet?.expires_at || 0) > Date.now();
    const limit = paid ? PAID_DAILY_VOICE_LIMIT : FREE_DAILY_VOICE_LIMIT;
    const used  = getVoiceUsed(paid, user);
    if (used >= limit) {
      openNotice(
        paid ? 'Daily voice limit reached' : 'Free voice limit over',
        paid
          ? 'You’ve used all your voice replies for today. It resets at midnight.'
          : 'Aapne 2 free voice replies use kar liye. Daily ya Weekly plan recharge karke aur voice/text replies unlock karein.',
        paid ? null : openCoins
      );
      return;
    }
  }
  // Coins gate: allow brand-new users (welcome not yet visible on client) to pass once
const allowFirstSend = (!walletReady || wallet?.welcome_claimed !== true);
if (!isOwner && !allowFirstSend && coins < VOICE_COST) { openCoins(); return; }
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    if (!window.MediaRecorder) {
  window.alert('Voice notes are not supported in this browser.');
  return;
}
const mr = new window.MediaRecorder(stream, { mimeType: 'audio/webm' });
    chunksRef.current = [];

    mr.ondataavailable = (e) => {
      if (e.data && e.data.size) chunksRef.current.push(e.data);
    };

    // when we stop (either by click or auto-timer) → build blob & send
    mr.onstop = async () => {
      try {
        // ensure last chunk is flushed on some Android builds
        if (mr.state !== 'inactive' && mr.requestData) mr.requestData();

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await sendVoiceBlob(blob);
      } finally {
        stream.getTracks().forEach(t => t.stop());
      }
    };

    mr.start();                       // start recording
    mediaRecorderRef.current = mr;
    setIsRecording(true);

    // auto-stop hard at 5s
    if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
    autoStopTimerRef.current = setTimeout(() => {
      stopRecording();                // will trigger onstop → send
    }, MAX_RECORD_MS);
  } catch (e) {
    console.error('Mic error:', e);
    window.alert('Microphone permission needed.');
  }
};

const stopRecording = () => {
  if (autoStopTimerRef.current) {
    clearTimeout(autoStopTimerRef.current);
    autoStopTimerRef.current = null;
  }
  const mr = mediaRecorderRef.current;
  if (mr && mr.state === 'recording') {
    try { if (mr.requestData) mr.requestData(); } catch {}
    mr.stop();                        // this fires mr.onstop → sendVoiceBlob
  }
  setIsRecording(false);
};
// Upload the voice to backend as multipart/form-data
const sendVoiceBlob = async (blob) => {
  if (isTyping || cooldown) return;

    // Coins gate for VOICE (respect first-send bypass like startRecording/handleSend)
  const allowFirstSend = (!walletReady || wallet?.welcome_claimed !== true);
  if (!isOwner && !allowFirstSend && coins < VOICE_COST) {
    openCoins();
    return;
  }

  // local preview of what the user sent
  setMessages(prev => ([
    ...prev,
    { audioUrl: URL.createObjectURL(blob), sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  ]));
  setIsTyping(true);

  try {
    // --- include full history so backend has context ---
    const formattedHistory = messages.map(m => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text ?? (m.audioUrl ? '[voice note]' : '')
    }));

    const MAX_MSG = roleMode === 'roleplay' ? 18 : 24;
    const trimmed = formattedHistory.slice(-MAX_MSG);

    const fd = new FormData();
    fd.append('audio', blob, 'note.webm');
    fd.append('messages', JSON.stringify(trimmed));
    fd.append('userEmail', (user?.email || '').toLowerCase());
    fd.append('userSub', user?.sub || '');
    fd.append('clientTime', new Date().toLocaleTimeString('en-US', { hour12: false }));
    fd.append('clientDate', today());
    fd.append('session_id', sessionIdWithRole);
    fd.append('roleMode', roleMode);
    fd.append('roleType', roleType || 'stranger');
    if (shouldResetRef.current) { fd.append('reset', 'true'); shouldResetRef.current = false; }

    const resp = await fetch(`${BACKEND_BASE}/chat`, { method: 'POST', headers: { ...authHeaders(user), 'X-CSRF-Token': getCsrf() }, body: fd, credentials: 'include' });
    if (resp.status === 401) {
  setIsTyping(false);
  setShowSigninBanner(true);
  setMessages(prev => [...prev, {
    text: 'Please sign in again to continue.',
    sender: 'allie',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }]);
  return;
}

    const data = await resp.json();
    setIsTyping(false);

    if (data.locked) {
      setMessages(prev => [...prev, {
        text: data.reply || 'Locked. Get coins to continue.',
        sender: 'allie',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      setIsTyping(false);
      openCoins();
      return;
    }

    if (data.audioUrl) {
      const fullUrl = data.audioUrl.startsWith('http')
        ? data.audioUrl
        : `${BACKEND_BASE}${data.audioUrl}`;
      setMessages(prev => [...prev, {
        audioUrl: fullUrl, sender: 'allie',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      if (data.wallet) setCoins(data.wallet.coins);
      if (!isOwner) {
    const paid = (wallet?.expires_at || 0) > Date.now();
    bumpVoiceUsed(paid, user);
  }
    } else {
      setMessages(prev => [...prev, {
        text: data.reply || "Hmm… Shraddha didn’t respond.",
        sender: 'allie',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }
  } catch (e) {
    console.error('Voice upload failed:', e);
    setIsTyping(false);
    setMessages(prev => [...prev, {
      text: 'Voice upload failed. Try again.',
      sender: 'allie',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
  }
};
  const handleSend = async () => {
  setShowEmoji(false); // close emoji panel when sending
  setShowCharPopup(false);
  if (inputValue.trim() === '' || isTyping || cooldown || isRecording) return;

  // Quick commands
  if (inputValue.trim().toLowerCase() === '#stranger') {
    applyRoleChange('stranger', null);
    setInputValue('');
    return;
  }
  if (inputValue.trim().toLowerCase() === '#reset') {
  shouldResetRef.current = true;
  setMessages([{ text: 'Hi… kaise ho aap? ☺️', sender: 'allie' }]);
  readingUpRef.current = false;
  stickToBottomRef.current = true;
  setInputValue('');
  setTimeout(() => scrollToBottomNow(true), 0);
  return;
}

  // Decide cost before sending
  const wantVoiceNow = askedForVoice(inputValue);
  const allowFirstSend = (!walletReady || wallet?.welcome_claimed !== true);
    if (wantVoiceNow && !isOwner) {
  const paid = (wallet?.expires_at || 0) > Date.now();
  const limit = paid ? PAID_DAILY_VOICE_LIMIT : FREE_DAILY_VOICE_LIMIT;
  const used  = getVoiceUsed(paid, user);
  if (used >= limit) {
    openNotice(
      paid ? 'Daily voice limit reached' : 'Free voice limit over',
      paid
        ? 'You’ve used all your voice replies for today. It resets at midnight.'
        : 'Aapne 2 free voice replies use kar liye. Daily ya Weekly plan recharge karke aur voice/text replies unlock karein.',
      paid ? null : openCoins
    );
    return;
  }
}
  if (!isOwner) {
    if (wantVoiceNow) {
      if (!allowFirstSend && coins < VOICE_COST) {
        if (coins >= TEXT_COST) {
          openConfirm(
            `Not enough coins for voice`,
            `Voice needs ${VOICE_COST} coins, you have ${coins}. Send as text for ${TEXT_COST} coins instead?`,
            async () => { await actuallySend(false); }
          );
        } else {
          openCoins();
        }
        return;
      }
    } else {
      if (!allowFirstSend && coins < TEXT_COST) { openCoins(); return; }
    }
  }

  await actuallySend(wantVoiceNow);

  async function actuallySend(wantVoice) {
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMessage = { text: inputValue, sender: 'user', time: currentTime, seen: false };
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    scrollToBottomNow(true); // user expects to be at bottom after sending
    setInputValue('');
    setIsTyping(true);

    const startedAt = Date.now();
    try {
      const formattedHistory = updatedMessages.map((msg) => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text ?? (msg.audioUrl ? '🔊 (voice reply sent)' : '')
      }));

      const MAX_MSG = roleMode === 'roleplay' ? 18 : 24;
      const trimmed = formattedHistory.slice(-MAX_MSG);

      const now = new Date();
      const fetchBody = {
  messages: trimmed,
  clientTime: now.toLocaleTimeString('en-US', { hour12: false }),
  clientDate: now.toLocaleDateString('en-GB'),
  userEmail: (user?.email || '').toLowerCase(),
  userSub: user?.sub,                          // <— add this line
  wantVoice: !!wantVoice,
  session_id: sessionIdWithRole,
  roleMode,
  roleType: roleType || 'stranger',
};
      if (shouldResetRef.current) { fetchBody.reset = true; shouldResetRef.current = false; }

      setCooldown(true);
      setTimeout(() => setCooldown(false), 3000);

      const response = await fetch(`${BACKEND_BASE}/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...authHeaders(user), 'X-CSRF-Token': getCsrf() },
  body: JSON.stringify(fetchBody),
  credentials: 'include'
});
if (response.status === 401) {
  setIsTyping(false);
  setShowSigninBanner(true);
  setMessages(prev => [...prev, {
    text: 'Please sign in again to continue.',
    sender: 'allie',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }]);
  return;
}  
      const data = await response.json();

      const elapsed = Date.now() - startedAt;
      const waitMore = Math.max(0, 2500 - elapsed);
      setTimeout(() => {
        setIsTyping(false);

        if (data.audioUrl) {
  const fullUrl = data.audioUrl.startsWith('http') ? data.audioUrl : `${BACKEND_BASE}${data.audioUrl}`;
  setMessages(prev => [...prev, { audioUrl: fullUrl, sender: 'allie', time: currentTime }]);
  if (data.wallet) setCoins(data.wallet.coins);
const paid = (wallet?.expires_at || 0) > Date.now();
bumpVoiceUsed(paid, user); // (optional UI counter)
  return;
}

        if (data.locked) {
          setMessages(prev => [...prev, { text: data.reply, sender: 'allie', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
          setTimeout(() => openCoins(), 400);
          return;
        }

        const reply = data.reply || "Hmm… Shraddha didn’t respond.";
        setMessages(prev => [...prev, { text: reply, sender: 'allie', time: currentTime }]);
        if (data.wallet) setCoins(data.wallet.coins);
      }, waitMore);

    } catch (error) {
  setIsTyping(false);
  console.error('Error calling Shraddha proxy:', error);

  // one-shot retry (cleaned)
  try {
    const formattedHistory = updatedMessages.map((msg) => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text ?? (msg.audioUrl ? '🔊 (voice reply sent)' : '')
    }));

    const MAX_MSG = roleMode === 'roleplay' ? 18 : 24;
    const trimmed = formattedHistory.slice(-MAX_MSG);

    const now = new Date();
    const fetchRetryBody = {
      messages: trimmed,
      clientTime: now.toLocaleTimeString('en-US', { hour12: false }),
      clientDate: now.toLocaleDateString('en-GB'),
      userEmail: (user?.email || '').toLowerCase(),
      userSub: user?.sub,
      wantVoice: !!wantVoice,
      session_id: sessionIdWithRole,
      roleMode,
      roleType: roleType || 'stranger',
    };
    if (shouldResetRef.current) { fetchRetryBody.reset = true; shouldResetRef.current = false; }

    await new Promise(r => setTimeout(r, 1200));
    const retryResp = await fetch(`${BACKEND_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(user), 'X-CSRF-Token': getCsrf() },
      body: JSON.stringify(fetchRetryBody),
      credentials: 'include'
    });

    if (retryResp.status === 401) {
  setIsTyping(false);
  setShowSigninBanner(true);
  setMessages(prev => [...prev, {
    text: 'Please sign in again to continue.',
    sender: 'allie',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }]);
  return;
}

    const data = await retryResp.json();
    const t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (data.locked) {
      setMessages(prev => [...prev, { text: data.reply, sender: 'allie', time: t }]);
      setTimeout(() => openCoins(), 400);
    } else if (data.audioUrl) {
      const fullUrl = data.audioUrl.startsWith('http') ? data.audioUrl : `${BACKEND_BASE}${data.audioUrl}`;
      setMessages(prev => [...prev, { audioUrl: fullUrl, sender: 'allie', time: t }]);
      if (data.wallet) setCoins(data.wallet.coins);
      const paid = (wallet?.expires_at || 0) > Date.now();
      bumpVoiceUsed(paid, user);
    } else {
      const reply = data.reply || "Hmm… thoda slow tha. Ab batao?";
      setMessages(prev => [...prev, { text: reply, sender: 'allie', time: t }]);
      if (data.wallet) setCoins(data.wallet.coins);
    }
  } catch {
    setMessages(prev => [...prev, { text: 'Oops! Shraddha is quiet right now.', sender: 'allie' }]);
  }
}
  }
};
  
  useEffect(() => {
  scrollToBottomNow();
}, [messages.length, isTyping]);

  useEffect(() => {
  if (isTyping && !readingUpRef.current) {
    requestAnimationFrame(() => scrollToBottomNow(true));
  }
}, [isTyping]);

  useEffect(() => {
  if (!showRoleMenu) return;

  // Focus the close button when the modal opens
  const closeBtn = roleMenuRef.current && roleMenuRef.current.querySelector('.role-close');
if (closeBtn && typeof closeBtn.focus === 'function') closeBtn.focus();

  const onDocClick = (e) => {
    if (roleMenuRef.current && !roleMenuRef.current.contains(e.target)) {
      setShowRoleMenu(false);
    }
  };
  const onEsc = (e) => {
    if (e.key === 'Escape') setShowRoleMenu(false);
  };

  document.addEventListener('mousedown', onDocClick);
  document.addEventListener('keydown', onEsc);
  return () => {
    document.removeEventListener('mousedown', onDocClick);
    document.removeEventListener('keydown', onEsc);
  };
}, [showRoleMenu]);
  // --- Measure header/footer (both layouts; drives pinned scroller) ---
useEffect(() => {
  const root = document.documentElement;
  const headerEl = document.querySelector('.header');
  const footerEl = document.querySelector('.footer');

  const setVars = () => {
    let hdr = headerEl ? Math.round(headerEl.getBoundingClientRect().height) : 80;
    let ftr = footerEl ? Math.round(footerEl.getBoundingClientRect().height) : 90;

    // Ignore bogus reads during IME/font reflow
    if (hdr < 40 || hdr > 160) hdr = 80;
    if (ftr < 40 || ftr > 160) ftr = 90;

    root.style.setProperty('--hdr-h', hdr + 'px');
    root.style.setProperty('--ftr-h', ftr + 'px');
  };

  setVars();

  const ro = typeof window.ResizeObserver !== 'undefined'
    ? new window.ResizeObserver(setVars)
    : null;
  if (ro && headerEl) ro.observe(headerEl);
  if (ro && footerEl) ro.observe(footerEl);

  const vv = window.visualViewport;
  if (vv) vv.addEventListener('resize', setVars);
  window.addEventListener('resize', setVars);
  window.addEventListener('orientationchange', setVars);
  if (document.fonts?.ready) { document.fonts.ready.then(() => { try { setVars(); } catch {} }); }
  document.addEventListener('visibilitychange', setVars);
  window.addEventListener('pageshow', setVars);

  return () => {
    if (ro) ro.disconnect();
    if (vv) vv.removeEventListener('resize', setVars);
    window.removeEventListener('resize', setVars);
    window.removeEventListener('orientationchange', setVars);
    document.removeEventListener('visibilitychange', setVars);
    window.removeEventListener('pageshow', setVars);
  };
}, [layoutClass, messages.length, isTyping]);

  // Legacy header compact mode: ONLY on old Android WebViews + real overflow
useEffect(() => {
  const header = document.querySelector('.header');
  const container = header?.querySelector('.username-container');
  if (!header || !container) return;

  const uaIsLegacy = looksLegacyAndroidWebView();

  const apply = () => {
    // check real overflow (allow a few px of jitter)
    const overflowPx = container.scrollWidth - container.clientWidth;
    const overflowing = overflowPx > 2;

    const enable = overflowing;   // trigger on real overflow, not UA guess
    document.documentElement.classList.toggle('legacy-zoom', !!enable);

    if (enable) {
      // If it's still quite tight, compute a gentle uniform scale for the row
      const need = container.scrollWidth;
      const avail = container.clientWidth;
      const ratio = need > 0 ? (avail / need) : 1;
      const scale = Math.max(0.85, Math.min(1, ratio)); // never smaller than 0.86
      header.style.setProperty('--hz-scale', String(scale));
    } else {
      header.style.removeProperty('--hz-scale');
    }
  };

  // run once and whenever sizes change
  apply();

  const ro = (typeof ResizeObserver !== 'undefined') ? new ResizeObserver(apply) : null;
  if (ro) {
    ro.observe(container);
    Array.from(container.children).forEach(el => ro.observe(el));
  }
  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', apply);

  return () => {
    if (ro) ro.disconnect();
    window.removeEventListener('resize', apply);
    window.removeEventListener('orientationchange', apply);
    document.documentElement.classList.remove('legacy-zoom');
    header.style.removeProperty('--hz-scale');
  };
}, []);

 // Auto-compact the header when contents overflow (enables .narrow / .tiny)
useEffect(() => {
  const header = document.querySelector('.header');
  const container = header?.querySelector('.username-container');
  if (!header || !container) return;

    const clamp = () => {
    header.classList.remove('narrow', 'tiny');
    const dist = container.scrollWidth - container.clientWidth; // + = over, - = tight but fits
    // If it’s even a little tight, go “narrow”; if clearly over, go “tiny”
    if (dist > -4) {
      header.classList.add('narrow');
      if (dist > 12) header.classList.add('tiny');
    }
  };

  clamp();
  const ro = typeof window.ResizeObserver !== 'undefined'
  ? new window.ResizeObserver(clamp)
  : null;
if (ro) {
  ro.observe(container);
  Array.from(container.children).forEach(el => ro.observe(el));
}
  window.addEventListener('resize', clamp);

  return () => {
  if (ro) ro.disconnect();             // <-- null-guard fixes CI crash
  window.removeEventListener('resize', clamp);
};
}, [user, coins, roleMode, roleType]);
  
  // Lock the app to the *exact* visible viewport height (older Android safe)
useEffect(() => {
  if (layoutClass !== 'fixed') return;  // only run on iOS/desktop

  const setAppH = () => {
    const h = Math.round(
      (window.visualViewport && window.visualViewport.height) ||
      document.documentElement.clientHeight ||
      window.innerHeight || 0
    );
    if (h) document.documentElement.style.setProperty('--app-h', `${h}px`);
  };

  setAppH();
  window.addEventListener('load', setAppH, { once: true });

  const vv = window.visualViewport;
  if (vv) vv.addEventListener('resize', setAppH);
  window.addEventListener('resize', setAppH);
  window.addEventListener('orientationchange', setAppH);
  window.addEventListener('pageshow', setAppH);

  return () => {
    if (vv) vv.removeEventListener('resize', setAppH);
    window.removeEventListener('resize', setAppH);
    window.removeEventListener('orientationchange', setAppH);
    window.removeEventListener('pageshow', setAppH);
  };
}, [layoutClass]);

  // Android: flag when the keyboard (IME) is open + expose height to CSS
useEffect(() => {
  if (layoutClass !== 'stable') return; // Android only
  const root = document.documentElement;
  const vv = window.visualViewport;
  if (!vv) return;

  let lastDrop = 0;

  const setKbVars = () => {
    // Measure keyboard by comparing the layout viewport vs visual viewport
    const layoutH =
      Math.max(window.innerHeight || 0, document.documentElement.clientHeight || 0);
    const drop = Math.max(0, Math.round(layoutH - vv.height)); // px

   // Lower threshold so we react as soon as the keyboard starts moving
    const OPEN_THRESHOLD = 24; // px (was 80)
    if (drop > OPEN_THRESHOLD) root.classList.add('ime-open');
    else root.classList.remove('ime-open');

    root.style.setProperty('--kb-h', drop ? `${drop}px` : '0px');

    if (drop !== lastDrop) {
  readingUpRef.current = false;   // don't lock auto-stick
  imeLockRef.current = true;      // ignore synthetic scrolls briefly
  setTimeout(() => { imeLockRef.current = false; }, 380);

  // keep view pinned to last bubble while typing
  if (document.activeElement === inputRef.current) {
    // immediate nudge and a short follow-up
    requestAnimationFrame(() => scrollToBottomNow(true));
    setTimeout(() => {
      if (stickToBottomRef.current) scrollToBottomNow(true);
    }, 140);

    // NEW: chase the IME animation so the last bubble never sinks under the bar
    if (kbChaseTimerRef.current) {
      clearInterval(kbChaseTimerRef.current);
      kbChaseTimerRef.current = null;
    }
    const started = Date.now();
    kbChaseTimerRef.current = setInterval(() => {
  // stop after ~1200ms or if the input lost focus
  if (Date.now() - started > 1200 || document.activeElement !== inputRef.current) {
    clearInterval(kbChaseTimerRef.current);
    kbChaseTimerRef.current = null;
    return;
  }
  if (stickToBottomRef.current) scrollToBottomNow(true);
}, 50);
  }
  lastDrop = drop;
}
  };

  const onResize = debounce(setKbVars, 60);
  vv.addEventListener('resize', onResize);
  // Fires more reliably during IME animation on newer Chromium
  vv.addEventListener('geometrychange', onResize);
  window.addEventListener('orientationchange', setKbVars);

  // initial pass
  setKbVars();

  return () => {
  vv.removeEventListener('resize', onResize);
  vv.removeEventListener('geometrychange', onResize);
  window.removeEventListener('orientationchange', setKbVars);
  if (kbChaseTimerRef.current) {
    clearInterval(kbChaseTimerRef.current);
    kbChaseTimerRef.current = null;
  }
  root.classList.remove('ime-open');
  root.style.removeProperty('--kb-h');
};
}, [layoutClass]);
  
  const displayedMessages = messages;
  // Block UI until user signs in
if (!user) {
  return (
    <AuthGate
      onSignedIn={async (u) => {
        // 1) Save locally + update state
        saveUser(u);
        setUser(u);

        // 2) PRIME COOKIES on the server:
        //    This mints bb_sess (14-day session) + bb_csrf in one GET.
        try {
          await fetch(`${BACKEND_BASE}/wallet`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${u.idToken}` },
            credentials: 'include'
          });
          // We don’t need the response body here — just setting cookies.
        } catch (e) {
          // Non-blocking: chat will still work because we send Authorization on first POST.
          console.warn('Cookie priming failed (non-blocking):', e?.message || e);
        }
      }}
    />
  );
}

  return (
    <div className={`App ${layoutClass} ${user ? 'signed-in' : 'auth'}`}>
      <div className="header">
        <div className="profile-pic">
          <img
  src={getAvatarSrc(roleMode, roleType)}
  alt={`Shraddha – ${roleMode === 'roleplay' && roleType ? (ROLE_LABELS[roleType] || 'Stranger') : 'Stranger'}`}
  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
  onClick={() => setShowAvatarFull(true)}
/>
        </div>
        <div className="username-container">
  <div className="name-wrap">
  <div className="username">{displayName}</div>

  {roleMode === 'roleplay' && roleType && (
    <span
      className="role-badge"
      style={{ backgroundColor: roleColors[roleType] || '#666' }}
    >
      {capRole}
    </span>
  )}

  {roleMode === 'stranger' && (
    <span className="role-badge role-badge-stranger" title="Default">
      Stranger
    </span>
  )}
</div>
          
  <button
  className="coin-pill"
  onClick={isOwner ? () => {} : () => { openCoins(); prewarmRazorpay(); }}
  title={isOwner ? "Owner: unlimited" : "Your balance (tap to buy coins)"}
  aria-label="Coins"
>
  🪙 {isOwner ? '∞' : (walletReady ? coins : '…')}
</button>

  <button
    className="role-btn"
    onClick={() => setShowRoleMenu(v => !v)}
    aria-label="Choose mode"
    title="Choose mode"
  >
    <span className="role-btn-text">Modes</span>
  </button>
</div>
  </div>
      {showSigninBanner && (
  <div className="signin-overlay" role="dialog" aria-modal="true">
    <div className="signin-card">
      <span className="signin-text">
        You’re signed out. Please sign in again to continue.
      </span>
      <div className="signin-actions">
        <button
          className="btn-primary"
          onClick={() => {
            localStorage.removeItem('user_v1');
            setUser(null);
          }}
        >
          Sign in
        </button>
        <button
          className="signin-close"
          aria-label="Dismiss"
          title="Dismiss"
          onClick={() => setShowSigninBanner(false)}
        >
          ✕
        </button>
      </div>
    </div>
  </div>
)}

{/* Character Insight popup */}
<CharacterPopup
  open={showCharPopup}
  roleMode={roleMode}
  roleType={roleType}
  onClose={() => setShowCharPopup(false)}
/>
{/* DP full-image lightbox */}
{showAvatarFull && (
  <div
    className="dp-lightbox"
    role="dialog"
    aria-modal="true"
    onClick={() => setShowAvatarFull(false)}
  >
    <img
      src={getFullAvatarSrc(roleMode, roleType)}
      alt="Shraddha"
      onClick={(e) => e.stopPropagation()}
    />
  </div>
)}
      
    {showRoleMenu && (
  <div
    className="role-modal"
    onClick={() => setShowRoleMenu(false)}
  >
    <div
  className="role-card"
  role="dialog"
  aria-modal="true"
  aria-labelledby="modesTitle"
  ref={roleMenuRef}
  onClick={(e) => e.stopPropagation()}
>
      <div className="role-card-header">
        <div className="role-card-title" id="modesTitle">Modes</div>
        <button
          className="role-close"
          onClick={() => setShowRoleMenu(false)}
          aria-label="Close modes"
          title="Close"
        >✕</button>
      </div>

      <div className="role-section">
        <div className="role-section-title">Default</div>
        <button
          className="role-row"
          onClick={() => {
            openConfirm(
              'Switch to Stranger?',
              'This will start a fresh chat and clear current messages.',
              () => { closeConfirm(); applyRoleChange('stranger', null); }
            );
          }}
        >
          Stranger (default)
        </button>
      </div>

      <div className="role-section-title">Roleplay</div>
      <div className="role-grid">
        <button
          className="role-chip"
          onClick={() => {
            openConfirm(
              'Start as Shraddha (Wife)?',
              'A fresh chat will begin and current messages will be cleared.',
              () => { closeConfirm(); applyRoleChange('roleplay','wife'); }
            );
          }}
        >Wife</button>

        <button
          className="role-chip"
          onClick={() => {
            openConfirm(
              'Start as Shraddha (Bhabhi)?',
              'A fresh chat will begin and current messages will be cleared.',
              () => { closeConfirm(); applyRoleChange('roleplay','bhabhi'); }
            );
          }}
        >Bhabhi</button>

        <button
          className="role-chip"
          onClick={() => {
            openConfirm(
              'Start as Shraddha (Girlfriend)?',
              'A fresh chat will begin and current messages will be cleared.',
              () => { closeConfirm(); applyRoleChange('roleplay','girlfriend'); }
            );
          }}
        >Girlfriend</button>

        <button
  className="role-chip"
  onClick={() => {
    openConfirm(
      'Start as Shraddha (Ex-GF)?',
      'A fresh chat will begin and current messages will be cleared.',
      () => { closeConfirm(); applyRoleChange('roleplay','exgf'); }
    );
  }}
>Ex-GF</button>
      </div>

      {(roleplayNeedsPremium && !isOwner && !(wallet?.expires_at > Date.now())) ? (
        <div className="role-upsell">Roleplay requires recharge.</div>
      ) : null}
    </div>
  </div>
)}

      <div className="chat-container" ref={scrollerRef}>
       <div className="chat-pad" aria-hidden="true" />
  {displayedMessages.map((msg, index) => (
  <div
    key={index}
    className={`message ${msg.sender === 'user' ? 'user-message' : 'allie-message'}`}
  >
    <span className={`bubble-content ${msg.audioUrl ? 'has-audio' : ''}`}>
      {msg.audioUrl ? (
        <div className="audio-wrapper">
  <audio
    className="audio-player"
    controls
    controlsList="nodownload noplaybackrate noremoteplayback"
    disablePictureInPicture
    preload="none"
    playsInline
    src={msg.audioUrl}
    onContextMenu={(e) => e.preventDefault()}
    onError={(e) => console.warn('audio failed:', e.currentTarget.src)}
  />
</div>
      ) : (
        msg.text
      )}
    </span>
  </div>
))}
  {isTyping && (
    <div className="message allie-message typing-bounce">
      <span></span><span></span><span></span>
    </div>
  )}
  <div ref={bottomRef} className="bottom-sentinel" />
</div>

      <CoinsModal
  open={showCoins}
  onClose={closeCoins}
  prefill={{ name: user?.name, email: user?.email, contact: user?.phone }}
  onChoose={(packId) => {
    if (packId === 'daily')  return buyPack(DAILY_PACK);
    if (packId === 'weekly') return buyPack(WEEKLY_PACK);
  }}
  busy={isPaying}
/>

      <ConfirmDialog
  open={confirmState.open}
  title={confirmState.title}
  message={confirmState.message}
  onCancel={closeConfirm}
  onConfirm={confirmState.onConfirm || closeConfirm}
  okOnly={confirmState.okOnly}
/>
 {/* show Character popup after instructions */}
<WelcomeFlow
  open={showWelcome}
  onClose={() => {
    setShowWelcome(false);
    setShowCharPopup(true);
  }}
  amount={100}
  defaultStep={welcomeDefaultStep}
/>
      
      <div className="footer">
        {/* Input + tiny emoji inside (like WhatsApp) */}
        <div className="input-wrap">
          <input
  ref={inputRef}
  type="text"
  placeholder="Type a message..."
  value={inputValue}
  onChange={(e) => setInputValue(e.target.value)}
  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
  onFocus={() => {
  setShowEmoji(false);
  setShowCharPopup(false);           // hide insight as soon as they try to type
  const bumps = [0, 120, 260, 520];
  bumps.forEach(ms => setTimeout(() => scrollToBottomNow(true), ms));
}}
/>

          <button
  type="button"
  className="emoji-inside"
  aria-label="Emoji picker"
  title="Emoji"
  onClick={() => setShowEmoji(v => !v)}
>
  <svg width="100%" height="100%" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="9"  cy="10" r="1.2"/>
    <circle cx="15" cy="10" r="1.2"/>
    <path d="M8 14c1 1.3 2.4 2 4 2s3-.7 4-2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
</button>

          {/* Emoji panel (drops above the input) */}
          {showEmoji && (
            <div className="emoji-panel" ref={emojiPanelRef} role="dialog" aria-label="Emoji picker">
              <div className="emoji-grid">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    className="emoji-item"
                    onClick={() => { insertEmoji(e); setShowEmoji(false); }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Mic */}
        <button
          type="button"
          className={`mic-btn ${isRecording ? 'recording' : ''}`}
          onClick={() => { if (!isRecording) { startRecording(); } else { stopRecording(); } }}
          title={isRecording ? "Recording… tap to stop" : "Tap to record (5s)"}
          aria-label={isRecording ? "Stop recording" : "Start recording"}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 14 0h-2zM11 19v3h2v-3h-2z"/>
          </svg>
        </button>

        {/* Send */}
        <button type="button" className="send-btn" onClick={handleSend}>➤</button>
      </div>
    </div>
  );
}

export default AllieChat;
