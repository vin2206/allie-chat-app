// src/versionWatcher.js
export function startVersionWatcher(intervalMs = 60000) {
  const KEY = "app_version";

  const check = async () => {
    try {
      const r = await fetch("/version.json?ts=" + Date.now(), { cache: "no-store" });
      const { version } = await r.json();
      const current = localStorage.getItem(KEY);
      if (!current) return localStorage.setItem(KEY, version);
      if (current !== version) {
        localStorage.setItem(KEY, version);
        window.location.reload();
      }
    } catch {}
  };

  check(); // on load
  const id = setInterval(check, intervalMs);
  return () => clearInterval(id);
}
