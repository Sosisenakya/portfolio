// Everything in the Evidence section: folder tabs, the string on the case board,
// grease-pencil circles on the contact sheet, the photo viewer and the surveillance tape

import { sfx } from "../core/audio.js";

export function initEvidence() {
  initTabs();
  initBoard();
  initContactSheet();
  initViewer();
  initTape();
}

// ---- Folder tabs ----
function initTabs() {
  const tabs = [...document.querySelectorAll('.folder-tabs [role="tab"]')];
  const panels = tabs.map((tab) => document.getElementById(tab.getAttribute("aria-controls")));

  // the small number on each tab counts what's inside its panel
  tabs.forEach((tab, i) => {
    const slot = tab.querySelector("[data-count]");
    if (slot) slot.textContent = String(panels[i].querySelectorAll("[data-item]").length).padStart(2, "0");
  });

  const select = (tab, focus) => {
    tabs.forEach((other, i) => {
      const active = other === tab;
      other.setAttribute("aria-selected", String(active));
      other.tabIndex = active ? 0 : -1;
      panels[i].hidden = !active;
    });
    if (focus) tab.focus();
    sfx.paper();
    document.dispatchEvent(new CustomEvent("evidence:tab"));
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => {
      if (tab.getAttribute("aria-selected") !== "true") select(tab);
    });
    tab.addEventListener("keydown", (event) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
      if (!step) return;
      event.preventDefault();
      select(tabs[(i + step + tabs.length) % tabs.length], true);
    });
  });
}

// ---- Case board: string between the pins ----
function initBoard() {
  const board = document.querySelector("[data-board]");
  if (!board) return;
  const svg = board.querySelector(".board-strings");

  const draw = () => {
    if (!board.offsetParent) return; // panel is hidden
    const box = board.getBoundingClientRect();
    const pins = [...board.querySelectorAll("[data-pin]")].map((pin) => {
      const r = pin.getBoundingClientRect();
      return { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top };
    });
    if (!pins.length) return;

    // pin to pin, closing the loop, each string sagging a little
    const route = pins.length > 2 ? [...pins, pins[0]] : pins;
    let path = "";
    for (let i = 0; i < route.length - 1; i++) {
      const a = route[i];
      const b = route[i + 1];
      const sag = Math.hypot(b.x - a.x, b.y - a.y) * 0.1;
      path += `M${a.x.toFixed(1)} ${a.y.toFixed(1)}Q${((a.x + b.x) / 2).toFixed(1)} ${((a.y + b.y) / 2 + sag).toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
    }

    const heads = pins
      .map(
        (p) => `<g transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})">
          <circle class="pin-shadow" cx="2.5" cy="4" r="7.5"/>
          <circle class="pin-body" r="7.5"/>
          <circle class="pin-shine" cx="-2.4" cy="-2.4" r="2.2"/>
        </g>`
      )
      .join("");

    svg.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
    svg.innerHTML = `<path class="string-shadow" d="${path}" transform="translate(2 5)"/><path class="string" d="${path}"/>${heads}`;
  };

  new ResizeObserver(draw).observe(board);
  document.addEventListener("evidence:tab", draw);
  board.querySelectorAll("img").forEach((img) => img.addEventListener("load", draw));
  draw();
}

// ---- Contact sheet: a grease-pencil circle that draws itself on hover ----
function initContactSheet() {
  const mark =
    '<svg class="frame-mark" viewBox="0 0 100 70" preserveAspectRatio="none" aria-hidden="true">' +
    '<path pathLength="1" d="M12 33C9 16 31 6 55 6s40 10 40 27-18 31-46 31S4 55 7 37c1-6 6-12 14-16"/></svg>';
  document.querySelectorAll(".frame-img").forEach((frame) => frame.insertAdjacentHTML("beforeend", mark));
}

// ---- Photo viewer (any img with data-zoom) ----
function initViewer() {
  document.querySelectorAll("img[data-zoom]").forEach((img) => {
    img.tabIndex = 0;
    img.setAttribute("role", "button");
    img.setAttribute("aria-label", `Enlarge photo: ${img.alt}`);
    img.addEventListener("click", () => openViewer(img));
    img.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openViewer(img);
      }
    });
  });
}

function openViewer(img) {
  const title = img.closest("[data-item]")?.querySelector("h3")?.textContent ?? img.alt;
  const viewer = document.createElement("div");
  viewer.className = "lightbox";
  viewer.setAttribute("role", "dialog");
  viewer.setAttribute("aria-modal", "true");
  viewer.setAttribute("aria-label", title);
  viewer.innerHTML = '<figure><img alt=""><figcaption></figcaption></figure><button class="lightbox-close" type="button">Close</button>';
  viewer.querySelector("img").src = img.currentSrc || img.src;
  viewer.querySelector("img").alt = img.alt;
  viewer.querySelector("figcaption").textContent = title;

  const close = () => {
    viewer.remove();
    document.removeEventListener("keydown", onKey);
    img.focus({ preventScroll: true });
  };
  const onKey = (event) => {
    if (event.key === "Escape") close();
  };

  viewer.addEventListener("click", close);
  document.addEventListener("keydown", onKey);
  document.body.append(viewer);
  viewer.querySelector(".lightbox-close").focus({ preventScroll: true });
  sfx.paper();
}

// ---- Surveillance tape: live timestamp, YouTube loads only after a click ----
function initTape() {
  const clock = document.querySelector("[data-clock]");
  if (clock) {
    const pad = (n) => String(n).padStart(2, "0");
    const tick = () => {
      const d = new Date();
      clock.textContent = `${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };
    tick();
    setInterval(tick, 1000);
  }

  document.querySelectorAll(".video-facade").forEach((facade) => {
    facade.addEventListener("click", () => {
      const frame = document.createElement("iframe");
      frame.src = `https://www.youtube-nocookie.com/embed/${facade.dataset.videoId}?autoplay=1&rel=0`;
      frame.title = "Video";
      frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      frame.allowFullscreen = true;
      facade.replaceWith(frame);
      sfx.click();
    });
  });
}
