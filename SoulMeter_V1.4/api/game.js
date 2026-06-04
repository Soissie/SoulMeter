// game.js
//
// All game logic and state transitions.
// this module only knows the rules. It calls back to the ESP through a single
// injected callback
// ============================================================================

const { TILES, SCREENS, state, reset_state } = require("./state");
const persistence = require("./persistence");
const settings = require("./settings");

// callback injected by ble.js
let send_to_esp = null;

function set_esp_send_callback(callback) {
  send_to_esp = callback;
}

// tell the board the current score so it can drive the LED strip
function notify_score() {
  if (send_to_esp) send_to_esp(settings.MSG_SCORE_PREFIX + state.score);
}

// Ask the board to begin a new game, to trigger all ready check
function send_start_game() {
  if (send_to_esp) {
    send_to_esp(settings.MSG_START_GAME);
    console.log("[game] Sent START_GAME to board");
  }
}



// helpers
function active_tile_count() {
  return Math.min(state.tile_count, TILES.length);
}

function all_tiles_played() {
  return state.played.length >= active_tile_count();
}

function check_game_over() {
  if (state.score <= settings.GAME_OVER_SCORE) {
    state.screen = SCREENS.GAMEOVER;
    return true;
  }
  if (all_tiles_played()) {
    state.screen = SCREENS.GAMEOVER;
    return true;
  }
  return false;
}

function pause(reason, from_screen, caused_by_tile) {
  state.paused_from = from_screen;
  state.pause_tile = caused_by_tile;
  state.pause_reason = reason;
  state.screen = SCREENS.PAUSED;
}

function resume() {
  const resume_to = state.paused_from || SCREENS.HOME;
  state.screen = resume_to;
  state.paused_from = null;
  state.pause_tile = null;
  state.pause_reason = null;
  return resume_to;
}



// state transitions

// called when the ESP says a tile was flipped
function on_tile_flipped(tile_index) {
  // no game is running until the board passes its ready check
  if (!state.board_ready) {
    console.log(`[game] Ignored flip (tile ${tile_index + 1}) — board not ready yet`);
    return { ok: false, reason: "board not ready" };
  }

  if (tile_index < 0 || tile_index >= active_tile_count()) {
    console.log(`[game] Ignored flip for out-of-range tile ${tile_index + 1}`);
    return { ok: false, reason: "invalid tile index" };
  }

  state.flipped_tiles.add(tile_index);

  // Case: active tile was unflipped then reflipped.
  if (
    state.screen === SCREENS.PAUSED &&
    state.paused_from === SCREENS.QUESTION &&
    state.pause_tile === tile_index &&
    state.active_tile === tile_index
  ) {
    const resume_to = resume();
    console.log(`[game] PAUSED -> ${resume_to} (active tile re-flipped)`);
    return { ok: true };
  }

  // a flip during a question or result screen isnt allowed
  if (state.screen === SCREENS.QUESTION || state.screen === SCREENS.RESULT) {
    const previous_screen = state.screen;
    pause(
      `Tile ${tile_index + 1} was flipped during play. Please unflip it to continue.`,
      previous_screen,
      tile_index,
    );
    console.log(`[game] ${previous_screen} -> PAUSED (unexpected flip: tile ${tile_index + 1})`);
    return { ok: false, reason: state.pause_reason };
  }

  // ignore flips while paused or after game end
  if (state.screen === SCREENS.PAUSED || state.screen === SCREENS.GAMEOVER) {
    return { ok: false, reason: "game is paused or over" };
  }

  // home screen tile selection
  if (state.played.includes(tile_index)) {
    return { ok: false, reason: "tile already played" };
  }

  state.active_tile = tile_index;
  state.screen = SCREENS.QUESTION;
  console.log(`[game] HOME -> QUESTION (tile ${tile_index + 1})`);
  // push the current score now
  // Led color changes the moment a tile is flipped
  notify_score();
  return { ok: true };
}

// called when a tile is returned to base position
function on_tile_unflipped(tile_index) {
  if (!state.board_ready) {
    console.log(`[game] Ignored unflip (tile ${tile_index + 1}) — board not ready yet`);
    return { ok: false, reason: "board not ready" };
  }

  state.flipped_tiles.delete(tile_index);

  // the tile that caused a pasue is fixed
  if (state.screen === SCREENS.PAUSED && state.pause_tile === tile_index) {
    const resume_to = resume();
    console.log(`[game] PAUSED -> ${resume_to} (tile ${tile_index + 1} unflipped)`);
    return { ok: true, resumed: true };
  }

  // active tile was unflipped mid-question, wait for it to be flipped back
  if (state.screen === SCREENS.QUESTION && state.active_tile === tile_index) {
    pause(
      `Tile ${tile_index + 1} was unflipped. Please re-flip it to continue.`,
      SCREENS.QUESTION,
      tile_index,
    );
    console.log("[game] QUESTION -> PAUSED (active tile unflipped)");
    return { ok: false, reason: state.pause_reason };
  }

  return { ok: true };
}

// called when the ESP reports how many tiles are active - currently unnecessary
// Logic was implemented for Future modular version.
function on_tile_count(reported_count) {
  const clamped_count = Math.max(
    settings.MIN_TILE_COUNT,
    Math.min(reported_count, TILES.length),
  );
  state.tile_count = clamped_count;
  persistence.set_value("tile_count", clamped_count); // remember across restarts
  console.log(`[game] Tile count set to ${clamped_count}`);
}

function on_answer(answer_index) {
  if (state.screen !== SCREENS.QUESTION) {
    return { ok: false, reason: "not in question phase" };
  }

  const tile = TILES[state.active_tile];
  const is_correct = answer_index === tile.correct;
  const score_delta = is_correct ? tile.value : -tile.value;
  const new_score = Math.max(settings.MINIMUM_SCORE, state.score + score_delta);

  state.score = new_score;
  state.played.push(state.active_tile);
  state.last_result = {
    correct: is_correct,
    delta: score_delta,
    new_score: new_score,
    correct_answer: tile.answers[tile.correct],
  };
  state.screen = SCREENS.RESULT;

  console.log(
    `[game] QUESTION -> RESULT (${is_correct ? "correct" : "wrong"}, ${score_delta > 0 ? "+" : ""}${score_delta}%)`,
  );
  notify_score();
  return { ok: true };
}

function on_continue() {
  if (state.screen !== SCREENS.RESULT) {
    return { ok: false, reason: "not in result phase" };
  }

  if (check_game_over()) {
    console.log("[game] RESULT -> GAMEOVER");
    return { ok: true };
  }

  state.screen = SCREENS.HOME;
  state.active_tile = null;
  state.last_result = null;
  console.log("[game] RESULT -> HOME");
  return { ok: true };
}

function on_ble_disconnect() {
  state.ble_connected = false;
  send_to_esp = null;
  if (state.screen === SCREENS.GAMEOVER) return;
  if (state.screen !== SCREENS.PAUSED) {
    pause("The Jeopardy board disconnected. Please reconnect.", state.screen, null);
    console.log("[game] -> PAUSED (BLE disconnected)");
  }
}

function on_ble_connect() {
  state.ble_connected = true;
  if (
    state.screen === SCREENS.PAUSED &&
    state.pause_reason &&
    state.pause_reason.includes("disconnected")
  ) {
    const resume_to = resume();
    console.log(`[game] PAUSED -> ${resume_to} (BLE reconnected)`);
  }
  // board boots idle, start ready check.
  state.board_ready = false;
  send_start_game();
}

function on_board_reset() {
  const was_connected = state.ble_connected;
  const previous_tile_count = state.tile_count;
  reset_state();
  state.ble_connected = was_connected;
  state.tile_count = previous_tile_count;
  // board is NOT ready until it reruns its ready check.
  state.board_ready = false;
  console.log("[game] Game reset -> waiting for board ready check");
  notify_score();
  send_start_game();
}

// called when the UI/operator starts a fresh game, essentially a reset.
function on_start_game() {   reset
  on_board_reset();
}

function on_board_ready(is_ready) {
  state.board_ready = is_ready;
  console.log(`[game] Board ready: ${is_ready}`);
}

module.exports = {
  on_tile_flipped,
  on_tile_unflipped,
  on_tile_count,
  on_answer,
  on_continue,
  on_ble_disconnect,
  on_ble_connect,
  on_board_reset,
  on_board_ready,
  on_start_game,
  set_esp_send_callback,
};
