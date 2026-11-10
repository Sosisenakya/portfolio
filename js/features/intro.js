// The locked door in front of the page
// The key can be dragged into the lock, or clicked. It slides in, turns, the lock clunks,
// light leaks through the seam and the two halves slide apart. "Skip" fades straight to the page
// When it's done it fires `case:opened` on document, which other features listen for

import { sfx } from "../core/audio.js";
import { tween, wait, ease, lerp } from "../core/util.js";

// Key poses, measured from the keyhole in px. rx turns the key around its own shaft
const POSES = {
  idle: () => (innerWidth < 640
    ? { x: -64, y: 168, z: 30, rz: -6, ry: -12, rx: 10 }
    : { x: 150, y: 112, z: 30, rz: -24, ry: -14, rx: 8 }),
  align: { x: 0, y: 0, z: 96, rz: 0, ry: -56, rx: 0 },
  inserted: { x: 0, y: 0, z: -16, rz: 0, ry: -60, rx: 0 },
  turned: { x: 0, y: 0, z: -16, rz: 0, ry: -60, rx: 90 },
};

const LAYERS = 10;       // thin copies stacked in depth to give the key thickness
const BURY_DEPTH = 52;   // how much of the tip disappears into the lock, px

// Vintage key, tip at x=0 pointing left, shaft centred on y=45
const KEY_SHAPES = `
  <path d="M0 41.5Q0 40 2 40H140V50H2Q0 50 0 48.5Z"/>
  <path d="M5 50H38V58H32V64H25V58H19V71H11V62H5Z"/>
  <path d="M137 35H147V55H137Z"/>
  <path d="M150 37H156V53H150Z"/>
  <path d="M146 41H173V49H146Z"/>
  <path fill-rule="evenodd" d="M171 45a33 33 0 1 0 66 0a33 33 0 1 0-66 0ZM187 45a17 17 0 1 0 34 0a17 17 0 1 0-34 0Z"/>
  <circle cx="227.5" cy="21.5" r="6"/>
  <circle cx="227.5" cy="68.5" r="6"/>
  <circle cx="239" cy="45" r="6"/>
`;

const KEY_FACE = `
  <defs>
    <linearGradient id="key-metal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f6f6f4"/>
      <stop offset=".42" stop-color="#bdbdba"/>
      <stop offset=".56" stop-color="#858582"/>
      <stop offset="1" stop-color="#d9d9d6"/>
    </linearGradient>
  </defs>
  <g fill="url(#key-metal)">${KEY_SHAPES}</g>
  <g fill="none" stroke-linecap="round">
    <circle cx="204" cy="45" r="25" stroke="#5e5e5e" stroke-width="1.2"/>
    <path d="M6 42.5H134" stroke="#fff" stroke-opacity=".75" stroke-width="1.2"/>
    <path d="M139 38V52M152 39V51" stroke="#5e5e5e" stroke-width="1"/>
  </g>
`;

function buildKey(key) {
  for (let i = 0; i < LAYERS; i++) {
    const layer = document.createElement("div");
    layer.className = "key-layer";
    layer.style.transform = `translateZ(${-i}px)`;
    const shade = i === LAYERS - 1 ? 52 : 92 - i * 3;
    const body = i === 0 ? KEY_FACE : `<g fill="rgb(${shade} ${shade} ${shade})">${KEY_SHAPES}</g>`;
    layer.innerHTML = `<svg viewBox="0 0 240 90">${body}</svg>`;
    key.append(layer);
  }
}

export function initIntro() {
  const root = document.documentElement;
  const intro = document.querySelector("[data-intro]");
  const announceOpen = () => document.dispatchEvent(new CustomEvent("case:opened"));

  // No intro (or the JS-only styles are off): go straight to the page
  if (!intro || !root.classList.contains("js")) {
    intro?.remove();
    root.classList.remove("intro-open");
    root.classList.add("is-revealed");
    announceOpen();
    return;
  }

  const lockButton = intro.querySelector("[data-lock]");
  const skipButton = intro.querySelector("[data-skip]");
  const holder = intro.querySelector("[data-key-holder]");
  const key = intro.querySelector("[data-key]");
  const behind = [...document.body.children].filter((el) => el !== intro && !el.matches(".sprite, script"));

  buildKey(key);
  behind.forEach((el) => (el.inert = true));

  let state = "idle"; // idle | dragging | busy | done
  const pose = { ...POSES.idle() };
  const alive = () => state !== "done";

  const render = () => {
    key.style.transform =
      `translate3d(${pose.x}px, ${pose.y}px, ${pose.z}px) ` +
      `rotateZ(${pose.rz}deg) rotateY(${pose.ry}deg) rotateX(${pose.rx}deg)`;
  };

  const moveTo = (target, duration, easing) => {
    const from = { ...pose };
    return tween(duration, easing, (t) => {
      for (const prop in target) pose[prop] = lerp(from[prop], target[prop], t);
      render();
    });
  };

  render();
  lockButton.focus({ preventScroll: true });

  // ---- Dragging the key ----
  let drag = null;

  key.addEventListener("pointerdown", (event) => {
    if (state !== "idle") return;
    event.preventDefault();
    state = "dragging";
    holder.classList.add("is-held");
    sfx.pickup();
    const scale = parseFloat(getComputedStyle(holder).scale) || 1;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: pose.x, startY: pose.y, moved: 0, scale };
    key.setPointerCapture(event.pointerId);
  });

  key.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = (event.clientX - drag.x) / drag.scale;
    const dy = (event.clientY - drag.y) / drag.scale;
    drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
    pose.x = drag.startX + dx;
    pose.y = drag.startY + dy;
    // the closer it gets to the lock, the more it swings round to face it
    const idle = POSES.idle();
    const near = Math.max(0, 1 - Math.hypot(pose.x, pose.y) / 280);
    pose.rz = lerp(idle.rz, 0, near);
    pose.ry = lerp(idle.ry, -48, near);
    pose.rx = lerp(idle.rx, 0, near);
    pose.z = lerp(idle.z, 80, near);
    render();
  });

  const release = (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const { moved } = drag;
    drag = null;
    const closeEnough = Math.hypot(pose.x, pose.y) < 95;
    if (event.type === "pointerup" && (moved < 6 || closeEnough)) {
      unlock();
      return;
    }
    state = "busy";
    moveTo(POSES.idle(), 550, ease.outBack).then(() => {
      if (!alive()) return;
      state = "idle";
      holder.classList.remove("is-held");
    });
  };

  key.addEventListener("pointerup", release);
  key.addEventListener("pointercancel", release);

  // ---- The unlock sequence ----
  async function unlock() {
    if (state === "busy" || state === "done") return;
    state = "busy";
    holder.classList.add("is-held");
    intro.classList.add("is-unlocking");
    sfx.prime();

    await moveTo(POSES.align, 560, ease.inOutCubic);
    if (!alive()) return;

    sfx.insert();
    await Promise.all([
      moveTo(POSES.inserted, 280, ease.inCubic),
      tween(280, ease.inCubic, (t) => key.style.setProperty("--bury", `${(t * BURY_DEPTH).toFixed(1)}px`)),
    ]);
    await wait(130);
    if (!alive()) return;

    sfx.turn();
    intro.classList.add("is-turned");
    await moveTo(POSES.turned, 430, ease.outBack);
    if (!alive()) return;

    sfx.unlock();
    shake();
    ring();
    await wait(200);
    if (!alive()) return;

    intro.classList.add("is-cracked");
    dust(30);
    await wait(450);
    if (!alive()) return;

    finish(false);
  }

  async function finish(quick) {
    if (state === "done") return;
    state = "done";
    sfx.open();
    intro.classList.add(quick ? "is-fading" : "is-open");
    behind.forEach((el) => (el.inert = false));
    root.classList.remove("intro-open");
    root.classList.add("is-revealed");
    document.removeEventListener("keydown", onKey);
    announceOpen();
    document.querySelector("[data-intro-exit]")?.focus({ preventScroll: true });
    await wait(quick ? 550 : 1300);
    intro.remove();
  }

  // ---- Little effects ----
  function shake() {
    intro.animate(
      [
        { transform: "translate(0, 0)" },
        { transform: "translate(-5px, 3px)" },
        { transform: "translate(4px, -3px)" },
        { transform: "translate(-2px, 2px)" },
        { transform: "translate(0, 0)" },
      ],
      { duration: 280, easing: "linear" }
    );
  }

  function ring() {
    const el = document.createElement("span");
    el.className = "lock-ring";
    intro.append(el);
    el.animate(
      [
        { transform: "scale(.7)", opacity: 0.9 },
        { transform: "scale(2.4)", opacity: 0 },
      ],
      { duration: 700, easing: "cubic-bezier(.2,.8,.2,1)" }
    ).finished.then(() => el.remove());
  }

  function dust(count) {
    const width = intro.clientWidth;
    for (let i = 0; i < count; i++) {
      const speck = document.createElement("span");
      speck.className = "dust";
      speck.style.setProperty("--s", `${(1.5 + Math.random() * 3).toFixed(1)}px`);
      speck.style.left = `${width / 2 + (Math.random() - 0.5) * width * 0.95}px`;
      if (Math.random() < 0.3) speck.style.filter = "blur(1px)";
      intro.append(speck);
      const direction = Math.random() < 0.5 ? -1 : 1;
      const dx = (Math.random() - 0.5) * 140;
      const dy = direction * (30 + Math.random() * 160);
      speck.animate(
        [
          { transform: "translate(0, 0)", opacity: 0 },
          { opacity: 0.95, offset: 0.15 },
          { transform: `translate(${dx}px, ${dy}px)`, opacity: 0 },
        ],
        { duration: 900 + Math.random() * 900, delay: Math.random() * 250, easing: "cubic-bezier(.2,.8,.2,1)", fill: "both" }
      ).finished.then(() => speck.remove());
    }
  }

  // ---- Controls ----
  const onKey = (event) => {
    if (event.key === "Escape") finish(true);
  };

  lockButton.addEventListener("click", unlock);
  skipButton.addEventListener("click", () => finish(true));
  document.addEventListener("keydown", onKey);
  window.addEventListener("resize", () => {
    if (state !== "idle") return;
    Object.assign(pose, POSES.idle());
    render();
  });
}
