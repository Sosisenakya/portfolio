// The flashlight that follows the cursor (or your finger), plus the pull cord that turns the room lights on
// The beam itself is the .darkness overlay in css/effects.css, this file only moves --fx / --fy
// The lights come on as the doors open. Pull the cord to go dark and hunt with the flashlight

import { sfx } from "../core/audio.js";

const FOLLOW = 0.22; // 0..1, how quickly the beam catches up with the pointer

export function initFlashlight() {
  const root = document.documentElement;
  let x = innerWidth / 2;
  let y = innerHeight / 2;
  let targetX = x;
  let targetY = y;
  let frame = 0;

  const apply = () => {
    root.style.setProperty("--fx", `${x.toFixed(1)}px`);
    root.style.setProperty("--fy", `${y.toFixed(1)}px`);
  };

  const step = () => {
    x += (targetX - x) * FOLLOW;
    y += (targetY - y) * FOLLOW;
    apply();
    const settled = Math.abs(targetX - x) + Math.abs(targetY - y) < 0.5;
    frame = settled ? 0 : requestAnimationFrame(step);
  };

  const aim = (clientX, clientY) => {
    targetX = clientX;
    targetY = clientY;
    if (!frame) frame = requestAnimationFrame(step);
  };

  window.addEventListener("pointermove", (event) => aim(event.clientX, event.clientY), { passive: true });
  window.addEventListener("pointerdown", (event) => aim(event.clientX, event.clientY), { passive: true });
  window.addEventListener(
    "touchmove",
    (event) => {
      const touch = event.touches[0];
      if (touch) aim(touch.clientX, touch.clientY);
    },
    { passive: true }
  );
  apply();

  // ---- Glows: before the flashlight is picked up, only the cord and the flashlight are lit ----
  const cord = document.querySelector("[data-lights]");
  const torch = document.querySelector("[data-torch]");

  const placeGlow = (el, name) => {
    if (!el || !el.offsetParent) return;
    const r = el.getBoundingClientRect();
    root.style.setProperty(`--${name}-x`, `${(r.left + r.width / 2).toFixed(0)}px`);
    root.style.setProperty(`--${name}-y`, `${(r.top + r.height / 2).toFixed(0)}px`);
  };
  const placeGlows = () => {
    placeGlow(cord?.querySelector(".cord-pull"), "cord");
    placeGlow(torch, "torch");
  };
  window.addEventListener("resize", placeGlows);
  document.addEventListener("case:opened", () => setTimeout(placeGlows, 700));
  placeGlows();

  torch?.addEventListener("click", () => {
    aim(torch.getBoundingClientRect().left + torch.offsetWidth / 2, torch.getBoundingClientRect().top);
    root.classList.add("has-torch");
    torch.setAttribute("aria-pressed", "true");
    sfx.click();
  });

  // ---- Light cord ----
  if (!cord) return;

  const setLights = (on) => {
    root.classList.toggle("lights-on", on);
    cord.setAttribute("aria-pressed", String(on));
    cord.setAttribute("aria-label", on ? "Turn the room lights off" : "Turn the room lights on");
  };

  // off while the intro's own beam is showing, on once the case is open
  setLights(false);
  document.addEventListener("case:opened", () => setLights(true), { once: true });

  cord.addEventListener("click", () => {
    cord.classList.remove("is-pulled");
    void cord.offsetWidth; // restart the pull animation
    cord.classList.add("is-pulled");
    sfx.click();
    setLights(!root.classList.contains("lights-on"));
  });
}
