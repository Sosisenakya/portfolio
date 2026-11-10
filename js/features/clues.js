// The fingerprint hunt
// Any <button class="clue" data-clue="note"> on the page counts. They're faint, so they only
// really show up under the flashlight. Found notes go into the notebook (bottom left),
// and finding them all brings up the "case solved" stamp

import { sfx } from "../core/audio.js";
import { wait } from "../core/util.js";

export function initClues() {
  const clues = [...document.querySelectorAll("[data-clue]")];
  const toggle = document.querySelector("[data-notebook]");
  if (!toggle) return;

  const page = document.getElementById(toggle.getAttribute("aria-controls"));
  const count = document.querySelector("[data-clue-count]");
  const total = document.querySelector("[data-clue-total]");
  const list = document.querySelector("[data-clue-list]");
  const empty = document.querySelector("[data-clue-empty]");
  const solved = document.querySelector("[data-solved]");
  let found = 0;

  total.textContent = clues.length;

  const setNotebook = (open) => {
    page.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
  };

  toggle.addEventListener("click", () => {
    setNotebook(page.hidden);
    sfx.paper();
  });

  clues.forEach((clue, index) => {
    clue.setAttribute("aria-label", `Fingerprint ${index + 1} of ${clues.length}`);

    clue.addEventListener("click", () => {
      if (clue.classList.contains("is-found")) return;
      clue.classList.add("is-found");
      clue.setAttribute("aria-label", `Clue: ${clue.dataset.clue}`);
      found += 1;
      sfx.clue();

      const note = document.createElement("span");
      note.className = "clue-note";
      note.setAttribute("aria-hidden", "true");
      note.textContent = clue.dataset.clue;
      clue.append(note);

      const item = document.createElement("li");
      item.textContent = clue.dataset.clue;
      list.append(item);
      empty.hidden = true;
      count.textContent = found;

      toggle.classList.remove("is-bumped");
      void toggle.offsetWidth; // restart the bump animation
      toggle.classList.add("is-bumped");

      if (found === clues.length) caseSolved();
    });
  });

  async function caseSolved() {
    if (!solved) return;
    await wait(700);
    solved.hidden = false;
    sfx.stamp();
    setTimeout(() => sfx.solved(), 250);
    solved.querySelector("button")?.focus({ preventScroll: true });
  }

  solved?.querySelectorAll("[data-solved-close]").forEach((el) =>
    el.addEventListener("click", () => {
      solved.hidden = true;
      setNotebook(true);
    })
  );

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && solved && !solved.hidden) solved.hidden = true;
  });
}
