// Entry point. Each feature lives in its own file under features/ and is started here
// They start one by one, so if one breaks the rest of the page still works

import { initPage } from "./features/page.js";
import { initFlashlight } from "./features/flashlight.js";
import { initEvidence } from "./features/evidence.js";
import { initClues } from "./features/clues.js";
import { initIntro } from "./features/intro.js";

// initIntro goes last: it announces "case:opened", which the others listen for
const features = [initPage, initFlashlight, initEvidence, initClues, initIntro];

for (const start of features) {
  try {
    start();
  } catch (error) {
    console.error(`[portfolio] ${start.name} failed`, error);
  }
}

// tells the safety timer in index.html that the scripts are running
window.__caseReady = true;
