// state.js
//
// Holds the live game state and the list of screen names
// game.js holds the transitions themself
// ============================================================================

const { TILES } = require("./questions");
const persistence = require("./persistence");
const settings = require("./settings");

const SCREENS = {
  HOME: "HOME",
  QUESTION: "QUESTION",
  RESULT: "RESULT",
  PAUSED: "PAUSED",
  GAMEOVER: "GAMEOVER",
};

function make_initial_state() {
  return {
    screen: SCREENS.HOME,
    score: settings.STARTING_SCORE,
    tile_count: persistence.get_value("tile_count"), // survives restarts
    active_tile: null,
    played: [],
    last_result: null,
    flipped_tiles: new Set(),
    pause_reason: null,
    paused_from: null,
    pause_tile: null,
    board_ready: false,
    ble_connected: false,
  };
}

const state = make_initial_state();

// reset for a new game but keep some stats
function reset_state() {
  const { ble_connected, tile_count } = state;
  Object.assign(state, make_initial_state());
  state.ble_connected = ble_connected;
  state.tile_count = tile_count;
}

module.exports = { TILES, SCREENS, state, reset_state };
