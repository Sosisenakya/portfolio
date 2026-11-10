// Page-wide behaviour: the section index, smooth scrolling, scroll reveals, the stamp on the
// cover, redactions, the tilting calling card and the sound switch

import { sfx, isMuted, setMuted } from "../core/audio.js";
import { tween, ease } from "../core/util.js";

export function initPage() {
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
  initIndex();
  initSmoothScroll();
  initReveal();
  initStagger();
  initRedactions();
  initTilt();
  initSoundToggle();
  document.addEventListener("case:opened", onCaseOpened, { once: true });
}

// What happens on the cover once the doors open
function onCaseOpened() {
  if (document.querySelector("[data-hero-stamp]")) setTimeout(() => sfx.stamp(), 1600);
}

// ---- Section index ----
function initIndex() {
  const nav = document.querySelector("[data-index]");
  if (!nav) return;
  const toggle = nav.querySelector(".index-toggle");
  const links = [...nav.querySelectorAll('a[href^="#"]')];

  const setOpen = (open) => {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  };

  toggle.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));
  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) setOpen(false);
  });
  document.addEventListener("click", (event) => {
    if (!nav.contains(event.target)) setOpen(false);
  });

  // mark the tab of whichever section crosses the middle of the screen
  const byId = new Map(links.map((link) => [link.getAttribute("href").slice(1), link]));
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((link) => link.removeAttribute("aria-current"));
        byId.get(entry.target.id)?.setAttribute("aria-current", "true");
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  byId.forEach((_, id) => {
    const section = document.getElementById(id);
    if (section) observer.observe(section);
  });
}

// ---- Smooth scrolling for in-page links ----

// Room to leave at the top of the screen: below the Index button on phones, a small margin elsewhere
function topClearance() {
  const toggle = document.querySelector(".index-toggle");
  const box = toggle?.getBoundingClientRect();
  return box && box.height ? box.bottom + 16 : 24;
}

// Where to scroll so a section's content (its padding left out) sits in the middle of the screen
// When it is taller than the screen, its heading lands at the top instead. Works for any screen size
function scrollTargetFor(target) {
  if (target.id === "top") return 0;
  const style = getComputedStyle(target);
  const padTop = parseFloat(style.paddingTop) || 0;
  const padBottom = parseFloat(style.paddingBottom) || 0;
  const box = target.getBoundingClientRect();
  const contentTop = box.top + window.scrollY + padTop;
  const contentHeight = box.height - padTop - padBottom;
  const view = window.innerHeight;
  const clearance = topClearance();

  const fits = contentHeight <= view - clearance * 2;
  const y = fits ? contentTop - (view - contentHeight) / 2 : contentTop - clearance;
  const maxY = document.documentElement.scrollHeight - view;
  return Math.min(Math.max(0, y), Math.max(0, maxY));
}

function initSmoothScroll() {
  let running = null;

  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const id = link.getAttribute("href").slice(1);
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    event.preventDefault();

    const startY = window.scrollY;
    const endY = scrollTargetFor(target);
    const distance = endY - startY;
    const token = {};
    running = token;
    tween(Math.min(1400, 600 + Math.abs(distance) * 0.25), ease.inOutCubic, (t) => {
      if (running === token) window.scrollTo(0, startY + distance * t);
    });
    history.pushState(null, "", `#${id}`);
  });

  // a manual scroll cancels the tween
  ["wheel", "touchstart"].forEach((type) => window.addEventListener(type, () => (running = null), { passive: true }));
}

// ---- Reveal on scroll ----
function initReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );
  document.querySelectorAll("[data-reveal]").forEach((el) => observer.observe(el));
}

// Gives each child a --n index so CSS can delay them one after another
function initStagger() {
  document.querySelectorAll("[data-stagger]").forEach((list) =>
    [...list.children].forEach((child, i) => child.style.setProperty("--n", i))
  );
}

// ---- Redacted text ----
function initRedactions() {
  document.querySelectorAll(".redact").forEach((bar) =>
    bar.addEventListener("click", () => {
      bar.setAttribute("aria-pressed", String(bar.getAttribute("aria-pressed") !== "true"));
      sfx.paper();
    })
  );
}

// ---- Calling card tilts towards the mouse ----
function initTilt() {
  document.querySelectorAll("[data-tilt]").forEach((card) => {
    const area = card.parentElement;
    area.addEventListener("pointermove", (event) => {
      if (event.pointerType !== "mouse") return;
      const r = card.getBoundingClientRect();
      const px = (event.clientX - r.left) / r.width - 0.5;
      const py = (event.clientY - r.top) / r.height - 0.5;
      card.classList.add("is-tilting");
      card.style.setProperty("--ry", `${(px * 16).toFixed(2)}deg`);
      card.style.setProperty("--rx", `${(-py * 16).toFixed(2)}deg`);
    });
    area.addEventListener("pointerleave", () => {
      card.classList.remove("is-tilting");
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
    });
  });
}

// ---- Sound on / off ----
function initSoundToggle() {
  const button = document.querySelector("[data-sound]");
  if (!button) return;
  const show = () => {
    const on = !isMuted();
    button.setAttribute("aria-pressed", String(on));
    button.textContent = on ? "Sound on" : "Sound off";
  };
  show();
  button.addEventListener("click", () => {
    setMuted(!isMuted());
    show();
    sfx.click();
  });
}
