// Small helpers shared by every feature

export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const lerp = (from, to, t) => from + (to - from) * t;

export const ease = {
  linear: (t) => t,
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

// Runs onUpdate(easedProgress) every frame for `duration` ms, resolves when done
export function tween(duration, easing, onUpdate) {
  return new Promise((resolve) => {
    const start = performance.now();
    function frame(now) {
      const t = Math.min((now - start) / duration, 1);
      onUpdate(easing(t));
      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });
}

// localStorage can throw (private windows, blocked storage), so every call is guarded
export function load(key, fallback = null) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage unavailable, the setting just won't be remembered
  }
}
