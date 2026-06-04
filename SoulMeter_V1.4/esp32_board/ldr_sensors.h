// ldr_sensors.h
//
// LDR sensor polling, debounce/settle logic, the game-mode state machine and
// the ready check.
// Single responsibility: decide when a tile has genuinely
// flipped or unflipped, and gate that behind the IDLE/READY_CHECK/PLAYING
// modes. Reports events by calling ble_comm_send().
// ============================================================================

#ifndef LDR_SENSORS_H
#define LDR_SENSORS_H

#include <Arduino.h>
#include "config.h"

// The board's three operating modes, added mainly for LED strip.
//   MODE_IDLE        waiting for START_GAME; tile changes ignored.
//   MODE_READY_CHECK verifying all active tiles are in rest before play.
//   MODE_PLAYING     normal play; flips/unflips are reported.
enum GameMode { MODE_IDLE, MODE_READY_CHECK, MODE_PLAYING };

// Active tile count and pin map. Declared here
extern int tile_count;
extern int LDR_PINS[TILE_COUNT];

// Sample every active sensor and capture the baseline
void ldr_sensors_init();

// Poll the sensors; accept changes that were stable for SETTLE_MS.
// Call every loop iteration.
void ldr_sensors_poll();

// Begin a ready check called on START_GAME
void ldr_sensors_start_ready_check();

// Read one sensor: true if the tile is flipped a(light blocked).
bool ldr_read_flipped(int tile_index);

// Read one sensor's raw ADC value (0-4095).
int ldr_read_raw(int tile_index);

// Print live raw ADC values for all active sensors (for calibration).
void ldr_sensors_print_raw();

// Current game mode ).
GameMode ldr_sensors_get_mode();

#endif // LDR_SENSORS_H
