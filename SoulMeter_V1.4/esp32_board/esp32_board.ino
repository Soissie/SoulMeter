// esp32_board.ino
//
// Physical Jeopardy-like board for ESP32. Top-level wiring only:
// it connects BLE, LED strip and LDR sensor modules and routes messages between them.
//
// All tunable values live in config.h. Module logic lives in:
//   led_strip.*    FastLED strip
//   ble_comm.*     BLE transport (Nordic UART Service)
//   ldr_sensors.*  sensors, debounce, game mode, ready check
//
// See config.h for the game flow overview.
// ============================================================================

#include "config.h"
#include "led_strip.h"
#include "ble_comm.h"
#include "ldr_sensors.h"

// LED state: true once first score arrives
static bool game_started = false;

// incoming BLE messages from API
// Routes API to ESP messages to the right module.
void on_api_message(const String &message) {
  // current score for LED strip
  if (message.startsWith(MSG_SCORE_PREFIX)) {
    int prefix_length = String(MSG_SCORE_PREFIX).length();
    int score = message.substring(prefix_length).toInt();
    led_strip_set_score(score);
    game_started = true;   // a score arriving means play has begun
    return;
  }

  // begin a new game and run ready check
  if (message == MSG_START_GAME) {
    game_started = false;   // back to the pre-game wave until a score arrives
    ldr_sensors_start_ready_check();
    return;
  }
}

// connection handler
// Fired when API connects. Announce the active tile count right away.
void on_api_connect() {
  ble_comm_send(String(MSG_TILE_COUNT_PREFIX) + String(tile_count));
}


// ── setup & loop ──────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(SERIAL_BAUD);
  delay(STARTUP_DELAY_MS);

  led_strip_init();

  // baseline sensors before BLE starts
  ldr_sensors_init();

  ble_comm_init(on_api_message, on_api_connect);
}

void loop() {
  ldr_sensors_poll();

  // only serial command kept: 'read' prints live LDR values for calibration
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    if (command == "read") {
      ldr_sensors_print_raw();
    }
  }


  // pick the LED display from live state, every frame, so it always reflects correctly
  if (!ble_comm_is_connected()) {
    led_strip_set_mode(LED_MODE_NO_BLE);              // orange until reconnected
  } else {
    switch (ldr_sensors_get_mode()) {
      case MODE_READY_CHECK:
        led_strip_set_mode(LED_MODE_NOT_READY);       // pink/purple while tiles not in rest
        break;
      case MODE_PLAYING:
        // ready: wave until the first score arrives, then the score fill
        led_strip_set_mode(game_started ? LED_MODE_SCORE : LED_MODE_WAVE);
        break;
      default: // MODE_IDLE
        led_strip_set_mode(LED_MODE_WAVE);            // idle = ready-looking wave
        break;
    }
  }

  led_strip_update();

  delay(LOOP_DELAY_MS);
}
