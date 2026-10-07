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

// Work tabs
const tabButtons = document.querySelectorAll(".tab-btn");
const tabPanels = document.querySelectorAll(".tab-panel");
const tabIndicator = document.querySelector(".tab-indicator");

function moveTabIndicator() {
  const active = document.querySelector(".tab-btn.active");
  tabIndicator.style.width = active.offsetWidth + "px";
  tabIndicator.style.height = active.offsetHeight + "px";
  tabIndicator.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`;
}

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
    moveTabIndicator();
  });
});

// Place the indicator without animating on load, then enable the tween
tabIndicator.style.transition = "none";
moveTabIndicator();
document.fonts.ready.then(() => {
  moveTabIndicator();
  requestAnimationFrame(() => {
    tabIndicator.style.transition = "";
  });
});
window.addEventListener("resize", moveTabIndicator);

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
