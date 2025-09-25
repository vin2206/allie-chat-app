// Minimal, framework-agnostic toast. No deps, no globals leaked.
let wrap;
export function showToast(message, {timeout = 2400} = {}) {
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'bb-toast-wrap';
    document.body.appendChild(wrap);
  }
  const el = document.createElement('div');
  el.className = 'bb-toast';
  el.textContent = message;
  wrap.appendChild(el);

  const t = setTimeout(() => {
    el.style.transition = 'opacity .18s ease';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 180);
  }, timeout);
  // return a disposer if caller ever needs to close early
  return () => { clearTimeout(t); el.remove(); };
}
