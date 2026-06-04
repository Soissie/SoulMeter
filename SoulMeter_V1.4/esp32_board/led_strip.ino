// led_strip.ino
//
// Implementation of the LED strip module. See led_strip.h.
// ============================================================================

#include "config.h"
#include "led_strip.h"

// the pixel buffer FastLED draws from
static CRGB led_buffer[NUM_LEDS];

// current display mode and the score it shows in LED_MODE_SCORE
static LedMode current_mode = LED_MODE_NO_BLE;
static int current_score = SCORE_MAX;

// animation timing/phase for the pre-game wave
static unsigned long last_frame_ms = 0;
static uint8_t wave_phase = 0;

// convenience colours built from the config RGB values
static const CRGB color_score_held = CRGB(COLOR_SCORE_HELD_R, COLOR_SCORE_HELD_G, COLOR_SCORE_HELD_B);
static const CRGB color_score_lost = CRGB(COLOR_SCORE_LOST_R, COLOR_SCORE_LOST_G, COLOR_SCORE_LOST_B);
static const CRGB color_no_ble     = CRGB(COLOR_NO_BLE_R, COLOR_NO_BLE_G, COLOR_NO_BLE_B);
static const CRGB color_not_ready  = CRGB(COLOR_NOT_READY_R, COLOR_NOT_READY_G, COLOR_NOT_READY_B);
static const CRGB color_wave_a     = CRGB(COLOR_WAVE_A_R, COLOR_WAVE_A_G, COLOR_WAVE_A_B);
static const CRGB color_wave_b     = CRGB(COLOR_WAVE_B_R, COLOR_WAVE_B_G, COLOR_WAVE_B_B);

void led_strip_init() {
  FastLED.addLeds<LED_TYPE, LED_PIN, COLOR_ORDER>(led_buffer, NUM_LEDS)
      .setCorrection(TypicalLEDStrip);
  FastLED.setBrightness(LED_BRIGHTNESS);
  fill_solid(led_buffer, NUM_LEDS, CRGB::Black);
  FastLED.show();
}

void led_strip_set_mode(LedMode mode) {
  current_mode = mode;
}

void led_strip_set_score(int score) {
  current_score = constrain(score, SCORE_MIN, SCORE_MAX);
}

// fill the whole strip with one colour
static void render_solid(const CRGB &color) {
  fill_solid(led_buffer, NUM_LEDS, color);
}

// blue portion (points held) followed by red portion (points lost)
static void render_score() {
  // how many LEDs are "held" (blue): 0 at score 0, all at score 100
  int held_count = (int)round((current_score / (float)SCORE_MAX) * NUM_LEDS);
  for (int i = 0; i < NUM_LEDS; i++) {
    led_buffer[i] = (i < held_count) ? color_score_held : color_score_lost;
  }
}

// moving wave that fades between two colours (A and B) for the waiting state
static void render_wave() {
  for (int i = 0; i < NUM_LEDS; i++) {
    // sine across the strip, scrolled by wave_phase, gives a 0-255 amount
    uint8_t blend_amount = sin8(wave_phase + i * WAVE_SPATIAL);
    // 0 = full colour A, 255 = full colour B
    led_buffer[i] = blend(color_wave_a, color_wave_b, blend_amount);
  }
  wave_phase += WAVE_SPEED;
}

void led_strip_update() {
  // animated modes throttle to frame interval; solid modes can run anytime
  unsigned long now = millis();

  switch (current_mode) {
    case LED_MODE_NO_BLE:
      render_solid(color_no_ble);
      break;
    case LED_MODE_NOT_READY:
      render_solid(color_not_ready);
      break;
    case LED_MODE_WAVE:
      if (now - last_frame_ms < WAVE_FRAME_MS) return; // not time for a new frame
      last_frame_ms = now;
      render_wave();
      break;
    case LED_MODE_SCORE:
      render_score();
      break;
  }
  FastLED.show();
}
