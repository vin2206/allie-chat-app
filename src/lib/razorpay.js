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
      handler: (response) => resolve({ type: "success", response }),
      modal: {
        ...(options.modal || {}),
        ondismiss: () => reject({ type: "dismissed" }),
      },
    });
    try { rzp.open(); } catch (e) { reject(e); }
  });
}

// --- START: add this helper exactly below openRazorpay (keep it at file bottom) ---
export async function handleCoinPurchase({
  options,                // Razorpay checkout options
  closePricingModal,      // () => void
  verifyPayment,          // (payload) => Promise<{ creditedCoins: number }>
  onWalletRefetch,        // () => void
  toast = (msg) => {},    // (string) => void
}) {
  const result = await openRazorpay(options).catch((e) => { throw e; });

  // Close the pricing modal right away
  try { closePricingModal?.(); } catch {}

  // Verify & credit quietly in background
  const payload = result?.response || {};
  let credited = 0;
  try {
    const vr = await verifyPayment(payload);     // server should be idempotent
    credited = Number(vr?.creditedCoins || 0);
  } catch {
    // If verify lags, webhook will handle credit; no scary alerts.
    return;
  }

  // Update wallet UI now that credit landed
  try { await onWalletRefetch?.(); } catch {}

  // Friendly, on-brand toast
  if (credited > 0) {
    toast(`+${credited} coins added—she’s waiting for you 🥰`);
  }
}
