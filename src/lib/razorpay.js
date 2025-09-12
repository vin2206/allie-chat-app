// src/lib/razorpay.js
// Tiny, safe helper: load the Razorpay SDK once, prewarm it,
// and open checkout with a Promise interface.

let sdkPromise = null;

const SDK_URL = "https://checkout.razorpay.com/v1/checkout.js";

/** Load the Razorpay SDK once (idempotent). */
export function ensureRazorpaySDKLoaded(timeoutMs = 10000) {
  if (typeof window !== "undefined" && window.Razorpay) {
    return Promise.resolve(window.Razorpay);
  }
  if (!sdkPromise) {
    sdkPromise = new Promise((resolve, reject) => {
      // If someone already injected the script tag, just wait for window.Razorpay.
      const existing = document.querySelector(`#rzp-checkout-js[src="${SDK_URL}"]`);
      if (!existing) {
        const s = document.createElement("script");
        s.id = "rzp-checkout-js";
        s.src = SDK_URL;
        s.async = true;
        s.defer = true;
        s.onload = () => resolve(window.Razorpay);
        s.onerror = () => reject(new Error("Razorpay SDK failed to load"));
        document.head.appendChild(s);
      }
      // Poll for readiness (covers both paths).
      const t0 = performance.now();
      (function waitReady() {
        if (window.Razorpay) return resolve(window.Razorpay);
        if (performance.now() - t0 > timeoutMs) return reject(new Error("Razorpay SDK load timeout"));
        requestAnimationFrame(waitReady);
      })();
    });
  }
  return sdkPromise;
}

/** Optional: call this when the coins modal opens so the SDK is ready by the time user taps. */
export function prewarmRazorpay(timeoutMs = 10000) {
  return ensureRazorpaySDKLoaded(timeoutMs).catch(() => {});
}

/**
 * Open checkout. Resolves on success, rejects on dismiss/error.
 * Pass exactly the same options you already use with Razorpay (key, order_id OR amount/currency, etc).
 */
export async function openRazorpay(options) {
  const Razorpay = await ensureRazorpaySDKLoaded();
  return new Promise((resolve, reject) => {
    const rzp = new Razorpay({
      ...options,
      // keep your own options intact; just normalize callbacks into a Promise:
      handler: (response) => resolve({ type: "success", response }),
      modal: {
        ...(options.modal || {}),
        ondismiss: () => reject({ type: "dismissed" }),
      },
    });
    try { rzp.open(); } catch (e) { reject(e); }
  });
}
