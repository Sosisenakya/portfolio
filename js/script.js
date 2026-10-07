document.getElementById("year").textContent = new Date().getFullYear();

// Mobile menu
const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.getElementById("nav-links");

menuToggle.addEventListener("click", () => {
  const open = navLinks.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(open));
});

navLinks.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    navLinks.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
  }
});

// Tweened scroll for in-page links (nav tabs and hero buttons)
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let scrollFrame = 0;

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function tweenScrollTo(targetY) {
  cancelAnimationFrame(scrollFrame);
  const startY = window.scrollY;
  const distance = targetY - startY;
  if (reduceMotion.matches || Math.abs(distance) < 2) {
    window.scrollTo(0, targetY);
    return;
  }
  const duration = Math.min(1400, 600 + Math.abs(distance) * 0.25);
  const startTime = performance.now();

  function step(now) {
    const t = Math.min((now - startTime) / duration, 1);
    window.scrollTo(0, startY + distance * easeInOutCubic(t));
    if (t < 1) scrollFrame = requestAnimationFrame(step);
  }
  scrollFrame = requestAnimationFrame(step);
}

document.addEventListener("click", (event) => {
  const link = event.target.closest('a[href^="#"]');
  if (!link) return;
  const id = link.getAttribute("href").slice(1);
  const target = id ? document.getElementById(id) : document.documentElement;
  if (!target) return;
  event.preventDefault();
  const offset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  const y = id ? target.getBoundingClientRect().top + window.scrollY - offset : 0;
  tweenScrollTo(Math.max(0, y));
  history.pushState(null, "", id ? "#" + id : window.location.pathname);
});

// Stop the tween if the user scrolls manually
["wheel", "touchstart"].forEach((type) =>
  window.addEventListener(type, () => cancelAnimationFrame(scrollFrame), { passive: true })
);

// Work tabs
const tabButtons = document.querySelectorAll(".tab-btn");
const tabPanels = document.querySelectorAll(".tab-panel");

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    tabButtons.forEach((other) => {
      const active = other === button;
      other.classList.toggle("active", active);
      other.setAttribute("aria-selected", String(active));
    });
    tabPanels.forEach((panel) => {
      const active = panel.dataset.panel === button.dataset.tab;
      panel.classList.toggle("active", active);
      panel.hidden = !active;
    });
  });
});

// Starfield background
const canvas = document.getElementById("stars");
const context = canvas.getContext("2d");
const starColors = ["#ffffff", "#cdbdff", "#9db8ff"];

function drawStars() {
  const ratio = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  context.scale(ratio, ratio);

  const count = Math.round((width * height) / 5500);
  for (let i = 0; i < count; i++) {
    context.globalAlpha = 0.25 + Math.random() * 0.65;
    context.fillStyle = starColors[Math.floor(Math.random() * starColors.length)];
    context.beginPath();
    context.arc(Math.random() * width, Math.random() * height, Math.random() * 1.1 + 0.2, 0, Math.PI * 2);
    context.fill();
  }
}

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(drawStars, 150);
});

drawStars();
