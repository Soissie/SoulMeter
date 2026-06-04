// config.h
//
// the only edit file for ESP firmware.
//
// Every value an admin might want to change is here:
//tile count, pin mapping, the rotation settle time, LED strip layout, BLE identifiers and the
// wire-protocol strings shared with the API
// No other file should need edits under normal use
// Naming: constants use UPPER_SNAKE_CASE (standard C convention), kept
// identical to the API's settings.js
// ============================================================================

#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>
#include <FastLED.h>

// BLE identity (must match the API settings.js)
#define DEVICE_NAME             "ESP32-Jeopardy"
#define SERVICE_UUID            "6E400001-B5A3-F393-E0A9-E50E24DCCA9E" // ESP writes here
#define CHARACTERISTIC_UUID_RX  "6E400002-B5A3-F393-E0A9-E50E24DCCA9E" // API writes here
#define CHARACTERISTIC_UUID_TX  "6E400003-B5A3-F393-E0A9-E50E24DCCA9E" // we notify here

//  LDR sensors ================================================
// To test with les than 9, change the tile count and pins used (just comment out everything unused)
#define TILE_COUNT          9        // number of tiles
#define MIN_TILE_COUNT      1        // lower limit for tile count
#define MAX_TILE_COUNT      9        // upper limit for tile count

// GPIO for each tile's LDR. Tile 1 == LDR_PINS[0], etc
const int LDR_PINS_DEFAULT[TILE_COUNT] = { 1, 2, 3, 4, 5, 6, 7, 8, 9};

// How long new sensor reading must stay stable before it is accepted
// This helps debouncing and also handles the settle time of the physical tile
// full rotation registers after this
#define SETTLE_MS           800

#define LDR_THRESHOLD           3000   // 0-4095, threshold, below this value counts as a tile flip
#define LDR_FLIPPED_WHEN_DARK   true    // switches to above ... value
//  LED strip (FastLED) ========================================
#define LED_PIN             11       // data line GPIO
#define NUM_LEDS            101      // total LEDs on the strip
#define LED_TYPE            WS2812B
#define COLOR_ORDER         GRB      // WS2812B is GRB (not rgb). FastLED reorders
                                     // Only change if the color comes out swapped
#define LED_BRIGHTNESS      80       // master brightness, 0-255
#define LED_SATURATION      255      // CSHV saturation for lit LEDs
#define LED_VALUE           200      // CSHV Brightness (max 255) for lit LEDs

// score display colours (RGB) =================================
// Strip shows % of score as blue and missing % as red portion
// 100% = all blue, 50% = half blue/half red, 0% = all red.
#define SCORE_MIN           0
#define SCORE_MAX           100
#define COLOR_SCORE_HELD_R  0        // "points held"  blue
#define COLOR_SCORE_HELD_G  0
#define COLOR_SCORE_HELD_B  255
#define COLOR_SCORE_LOST_R  255      // "points lost"  red
#define COLOR_SCORE_LOST_G  0
#define COLOR_SCORE_LOST_B  0

// status colours (RGB) ========================================
// BLE not connected == solid orange
#define COLOR_NO_BLE_R      255
#define COLOR_NO_BLE_G      90
#define COLOR_NO_BLE_B      0
// Connected but tiles not ready == solid purple
#define COLOR_NOT_READY_R   150
#define COLOR_NOT_READY_G   0
#define COLOR_NOT_READY_B   255

// pre-game wave animation (blends between two colours) ========
// Shown once connected and ready, before first tile flip
// The wave fades between COLOR_WAVE_A and COLOR_WAVE_B
// (blue and red by default)
#define COLOR_WAVE_A_R      0       // colour A — blue
#define COLOR_WAVE_A_G      0
#define COLOR_WAVE_A_B      255
#define COLOR_WAVE_B_R      255      // colour B — red
#define COLOR_WAVE_B_G      0
#define COLOR_WAVE_B_B      0
#define WAVE_SPEED          3        // blend shift per frame (higher = faster)
#define WAVE_SPATIAL        4        // colour spread along the strip (higher = tighter bands)
#define WAVE_FRAME_MS       20       // ms between animation frames

// timings ==================================================
#define SERIAL_BAUD         115200
#define STARTUP_DELAY_MS    800      // let serial monitor attach
#define ADVERT_RESTART_MS   500      // pause before re-advertising after disconnect
#define LOOP_DELAY_MS       10       // main loop pacing
#define SETTLE_LOG_WINDOW_MS 15      // tolerance window modulo log check

// BLE advertising tuning ====================================
// Do not change
#define ADVERT_MIN_INTERVAL 0x06
#define ADVERT_MAX_INTERVAL 0x12

// wire-protocol strings (shared with API) =====================
// ESP to API
#define MSG_TILE_FLIPPED_PREFIX    "Block changed: "
#define MSG_TILE_UNFLIPPED_PREFIX  "Block unflipped: "
#define MSG_TILE_COUNT_PREFIX      "TILE_COUNT:"
#define MSG_BOARD_READY            "BOARD_READY"
#define MSG_BOARD_NOT_READY        "BOARD_NOT_READY"
#define MSG_BOARD_RESET            "RESET"
// API to ESP
#define MSG_SCORE_PREFIX           "SCORE:"
#define MSG_START_GAME             "START_GAME"

//  GAME FLOW ==================================================================
//   1. Board boots IDLE and ignores tile changes.
//   2. API sends START_GAME -> board enters READY_CHECK.
//   3. While any active tile is flipped, board sends BOARD_NOT_READY (once).
//   4. Once all active tiles are in rest, board sends BOARD_READY and switches
//      to PLAYING.
//   5. In PLAYING, every flip/unflip is reported. The ready check does NOT run
//      again until the next START_GAME.
//=============================================================================

#endif // CONFIG_H
