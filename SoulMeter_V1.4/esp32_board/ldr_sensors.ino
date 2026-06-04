// ldr_sensors.ino
//
// Implementation of the LDR sensor and game-mode module. See ldr_sensors.h.
// ============================================================================

#include "config.h"
#include "ldr_sensors.h"
#include "ble_comm.h"

// module state
// Added later for clear separation between gameplay and non-gameplay, necessary for the sign LED strip
int tile_count = TILE_COUNT;          // active tiles
int LDR_PINS[TILE_COUNT];             // active GPIO map

static GameMode game_mode = MODE_IDLE;
static bool not_ready_announced = false; // so BOARD_NOT_READY is sent once

// per tile sensor tracking
// confirmed_state: true = flipped, false = rest
static bool          confirmed_state[TILE_COUNT];
static bool          pending_state[TILE_COUNT];
static unsigned long settle_start[TILE_COUNT];
static bool          has_pending[TILE_COUNT];

// forward declarations helpers
void evaluate_ready_check();
void on_tile_confirmed(int tile_index, bool new_flipped);
void capture_baseline();

// sensor read
// Returns raw ADC value (0-4095) per sensor
int ldr_read_raw(int tile_index) {
  return analogRead(LDR_PINS[tile_index]);
}

// Returns true if the tile is flipped
// Tile flip registered by comparing ADC value against threshold
// Which side counts as flipped is set by LDR_FLIPPED_WHEN_DARK.
bool ldr_read_flipped(int tile_index) {
  int value = ldr_read_raw(tile_index);
  if (LDR_FLIPPED_WHEN_DARK) {
    return value < LDR_THRESHOLD;   // darker than threshold = flipped
  } else {
    return value > LDR_THRESHOLD;   // brighter than threshold = flipped
  }
}

// re-sample active tiles and reset settle trackers
void capture_baseline() {
  for (int i = 0; i < tile_count; i++) {
    confirmed_state[i] = ldr_read_flipped(i);
    pending_state[i]   = confirmed_state[i];
    has_pending[i]     = false;
    settle_start[i]    = 0;
  }
}

// init
void ldr_sensors_init() {
  // copy default pin map into working array
  for (int i = 0; i < TILE_COUNT; i++) {
    LDR_PINS[i] = LDR_PINS_DEFAULT[i];
    pinMode(LDR_PINS[i], INPUT);
  }

  capture_baseline();
}

// ready check
// Starts on START_GAME. Does not report flips
// Waits until every tile is in rest, then sends BOARD_READY
void ldr_sensors_start_ready_check() {
  game_mode = MODE_READY_CHECK;
  not_ready_announced = false;
  capture_baseline();
  evaluate_ready_check();
}

void evaluate_ready_check() {
  if (game_mode != MODE_READY_CHECK) return;

  int flipped_count = 0;
  for (int i = 0; i < tile_count; i++) {
    if (confirmed_state[i]) flipped_count++;
  }

  if (flipped_count == 0) {
    ble_comm_send(MSG_BOARD_READY);
    game_mode = MODE_PLAYING;
  } else {
    if (!not_ready_announced) {
      ble_comm_send(MSG_BOARD_NOT_READY);
      not_ready_announced = true;
    }
  }
}

// tile confirmed handler
// Called once tile's reading has been stable for SETTLE_MS. Routes by mode.
void on_tile_confirmed(int tile_index, bool new_flipped) {
  bool was_flipped = confirmed_state[tile_index];
  confirmed_state[tile_index] = new_flipped;

  // IDLE: no game running, ignore
  if (game_mode == MODE_IDLE) {
    return;
  }

  // READY_CHECK: don't report, re-check readiness
  if (game_mode == MODE_READY_CHECK) {
    evaluate_ready_check();
    return;
  }

  // PLAYING: report the flip or unflip
  if (!was_flipped && new_flipped) {
    ble_comm_send(String(MSG_TILE_FLIPPED_PREFIX) + String(tile_index + 1));
  } else if (was_flipped && !new_flipped) {
    ble_comm_send(String(MSG_TILE_UNFLIPPED_PREFIX) + String(tile_index + 1));
  }
}

// polling
// Each tile has its own settle timer.
//A change must hold for SETTLE_MS  it is accepted.
void ldr_sensors_poll() {
  unsigned long now = millis();

  for (int i = 0; i < tile_count; i++) {
    bool current = ldr_read_flipped(i);

    if (current == confirmed_state[i]) {
      // reading matches accepted state. cancel pending change
      has_pending[i] = false;
      continue;
    }

    if (!has_pending[i]) {
      // first sighting of change: start the settle timer
      has_pending[i]   = true;
      pending_state[i] = current;
      settle_start[i]  = now;
    } else if (current != pending_state[i]) {
      // bounced to different value during settle: restart timer
      pending_state[i] = current;
      settle_start[i]  = now;
    } else {
      // holding pending value: accepted once stable for long enough
      unsigned long elapsed = now - settle_start[i];
      if (elapsed >= SETTLE_MS) {
        has_pending[i] = false;
        on_tile_confirmed(i, current);
      }
    }
  }
}

GameMode ldr_sensors_get_mode() {
  return game_mode;
}

// Print live raw ADC value and flipped-decision for active sensors
// Used by 'read' serial command to calibrate LDR_THRESHOLD.
void ldr_sensors_print_raw() {
  Serial.println("[LDR] raw ADC values (threshold = " + String(LDR_THRESHOLD) + "):");
  for (int i = 0; i < tile_count; i++) {
    int value = ldr_read_raw(i);
    Serial.printf("  Tile %d (GPIO %d): raw=%4d -> %s\n",
                  i + 1, LDR_PINS[i], value,
                  ldr_read_flipped(i) ? "FLIPPED" : "ready");
  }
}
