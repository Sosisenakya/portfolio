// The flashlight that follows the cursor (or your finger), plus the pull cord that turns the room lights on
// The beam itself is the .darkness overlay in css/effects.css, this file only moves --fx / --fy

import { sfx } from "../core/audio.js";
import { load, save } from "../core/util.js";

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

  // ---- Light cord ----
  const cord = document.querySelector("[data-lights]");
  if (!cord) return;

  const setLights = (on) => {
    root.classList.toggle("lights-on", on);
    cord.setAttribute("aria-pressed", String(on));
    cord.setAttribute("aria-label", on ? "Turn the room lights off" : "Turn the room lights on");
  };

  setLights(load("case:lights") === "1");

  cord.addEventListener("click", () => {
    const on = !root.classList.contains("lights-on");
    cord.classList.remove("is-pulled");
    void cord.offsetWidth; // restart the pull animation
    cord.classList.add("is-pulled");
    sfx.click();
    setLights(on);
    save("case:lights", on ? "1" : "0");
  });
}
