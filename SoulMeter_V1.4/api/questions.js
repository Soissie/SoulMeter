// questions.js
//
// Owns the question/tile data. Loads from questions.json
// falls back to the defaults in settings.js, and saves edits made in the admin page..
// ============================================================================

const fs = require("fs");
const path = require("path");
const settings = require("./settings");

const questions_path = path.join(__dirname, settings.QUESTIONS_FILE);

function load_questions_from_disk() {
  try {
    const raw_text = fs.readFileSync(questions_path, "utf-8");
    const parsed = JSON.parse(raw_text);
    console.log("[questions] Loaded from", settings.QUESTIONS_FILE);
    return parsed;
  } catch {
    console.log("[questions] No saved file, using defaults from settings.js");
    return settings.DEFAULT_QUESTIONS.map((tile) => ({ ...tile }));
  }
}

// the array the rest of the app reads
const TILES = load_questions_from_disk();

// replace contents in place, then persist to disk
function update_tiles(new_tiles) {
  TILES.length = 0;
  for (const tile of new_tiles) TILES.push(tile);
  fs.writeFileSync(questions_path, JSON.stringify(TILES, null, 2));
  console.log("[questions] Saved to", settings.QUESTIONS_FILE);
}

module.exports = { TILES, update_tiles };
