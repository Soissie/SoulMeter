// led_strip.h
//
// FastLED strip control.
// drives the strip based on display mode
// ============================================================================

#ifndef LED_STRIP_H
#define LED_STRIP_H

#include <Arduino.h>

// What the strip is currently showing.
//   LED_MODE_NO_BLE     not connected to the API (solid orange)
//   LED_MODE_NOT_READY  connected but tiles not in ready position (solid purple)
//   LED_MODE_WAVE       ready, waiting for the first tile flip (red<->blue wave)
//   LED_MODE_SCORE      in-game, showing the score (blue held / red lost)
enum LedMode {
  LED_MODE_NO_BLE,
  LED_MODE_NOT_READY,
  LED_MODE_WAVE,
  LED_MODE_SCORE,
};

// Initialise the strip (call once from setup).
void led_strip_init();

// Select what the strip should display.
void led_strip_set_mode(LedMode mode);

// Set score shown in LED_MODE_SCORE (0-100). Does not change the mode.
void led_strip_set_score(int score);

// Refresh the strip. Call every loop iteration; animated modes need it.
void led_strip_update();

#endif // LED_STRIP_H
