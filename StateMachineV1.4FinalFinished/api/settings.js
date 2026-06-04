// settings.js
//
// essentially a config file
//
//Contains everything an admin may want to change.
// Under normal circumstances no other file should be altered.
// Does not hold Runtime values, as those are in a JSON or persistence.js
//
// Naming: constants use standard linux coding convention
// ============================================================================

module.exports = {
  // web server
  SERVER_HOST: "localhost", // host name shown in links and logs
  SERVER_PORT: 3000, // TCP port the HTTP server listens on

  // admin panel
  ADMIN_PASSCODE: "1234", // passcode to open the admin page

  // game rules
  STARTING_SCORE: 100, // score every player begins with (percent)
  MINIMUM_SCORE: 0, // score can never drop below this
  GAME_OVER_SCORE: 0, // at or below this score the game ends

  //  tiles
  DEFAULT_TILE_COUNT: 9, // used as default before board connects.
  MIN_TILE_COUNT: 1, // lower bound for tile count
  MAX_TILE_COUNT: 9, // upper bound for tile count

  // BLE (must match the ESP firmware config.h)
  // I advise against changing these, as it could wreck connectivity - Noah
  BLE_DEVICE_NAME: "ESP32-Jeopardy", // advertised name we scan for
  BLE_SERVICE_UUID: "6e400001b5a3f393e0a9e50e24dcca9e", // Nordic UART service
  BLE_RX_UUID: "6e400002b5a3f393e0a9e50e24dcca9e", // API writes
  BLE_TX_UUID: "6e400003b5a3f393e0a9e50e24dcca9e", // ESP writes
  BLE_SCAN_WATCHDOG_MS: 20000, // restart scan if nothing is found
  BLE_ADAPTER_TIMEOUT_MS: 10000, // give up if adapter doesnt turn on
  BLE_RECONNECT_DELAY_MS: 2000, // wait before re-scanning
  BLE_SCAN_RETRY_DELAY_MS: 3000, // wait before retrying a failed scan
  BLE_SCAN_SETTLE_MS: 150, // pause after stopping a scan before restarting
  BLE_START_GAME_DELAY_MS: 0, // delay before sending START_GAME on connect

  // frontend polling
  STATE_POLL_INTERVAL_MS: 700, // how often the web page refreshes its state

  //  files (Other than code)
  RUNTIME_CONFIG_FILE: "runtime_config.json", // persisted runtime values
  QUESTIONS_FILE: "questions.json", // saved questions
  SCORES_FILE: "scores.csv", // saved player scores

  // ── default questions ───────────────────────────────────────────────────────
  // Used only on first run, when no questions.json exists yet.
  // value:  points won (correct) or lost (wrong)
  // media:  optional image or video URL shown with the question, or null
  DEFAULT_QUESTIONS: [
    { value: 10, question: "Question 1", answers: ["Answer 1.1", "Answer 1.2", "Answer 1.3", "Answer 1.4"], correct: 0, media: null },
    { value: 10, question: "Question 2", answers: ["Answer 2.1", "Answer 2.2", "Answer 2.3", "Answer 2.4"], correct: 0, media: null },
    { value: 10, question: "Question 3", answers: ["Answer 3.1", "Answer 3.2", "Answer 3.3", "Answer 3.4"], correct: 0, media: null },
    { value: 15, question: "Question 4", answers: ["Answer 4.1", "Answer 4.2", "Answer 4.3", "Answer 4.4"], correct: 0, media: null },
    { value: 15, question: "Question 5", answers: ["Answer 5.1", "Answer 5.2", "Answer 5.3", "Answer 5.4"], correct: 0, media: null },
    { value: 15, question: "Question 6", answers: ["Answer 6.1", "Answer 6.2", "Answer 6.3", "Answer 6.4"], correct: 0, media: null },
    { value: 25, question: "Question 7", answers: ["Answer 7.1", "Answer 7.2", "Answer 7.3", "Answer 7.4"], correct: 0, media: null },
    { value: 25, question: "Question 8", answers: ["Answer 8.1", "Answer 8.2", "Answer 8.3", "Answer 8.4"], correct: 0, media: null },
    { value: 25, question: "Question 9", answers: ["Answer 9.1", "Answer 9.2", "Answer 9.3", "Answer 9.4"], correct: 0, media: null },
  ],

  // BLE message strings
  // Changing these means changing the ESP firmware too.
  MSG_TILE_FLIPPED_PREFIX: "Block changed:", // ESP -> API, tile flipped
  MSG_TILE_UNFLIPPED_PREFIX: "Block unflipped:", // ESP -> API, tile flipped back
  MSG_TILE_COUNT_PREFIX: "TILE_COUNT:", // ESP -> API, active tile count
  MSG_SCORE_PREFIX: "SCORE:", // API -> ESP, current score
  MSG_BOARD_READY: "BOARD_READY", // ESP -> API, all tiles in base state
  MSG_BOARD_NOT_READY: "BOARD_NOT_READY", // ESP -> API, some tile flipped
  MSG_BOARD_RESET: "RESET", // ESP -> API, board reset
  MSG_BOARD_RESET_ALT: "BOARD_RESET", // alternate reset spelling
  MSG_START_GAME: "START_GAME", // API -> ESP, begin ready check
};
