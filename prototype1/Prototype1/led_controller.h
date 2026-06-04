/*
  LED Controller Module
  Handles all WS2812B LED strip operations
*/

#ifndef LED_CONTROLLER_H
#define LED_CONTROLLER_H

#include <FastLED.h>

class LEDController {
private:
  static const int NUM_LEDS = 101;
  static const int DATA_PIN = 13;
  static const int BRIGHTNESS = 50;
  
  CRGB leds[NUM_LEDS];
  
public:
  void begin() {
    Serial.println("[LED] Initializing FastLED...");
    
    FastLED.addLeds<WS2812B, DATA_PIN, GRB>(leds, NUM_LEDS);
    FastLED.setBrightness(BRIGHTNESS);
    FastLED.clear();
    FastLED.show();
    
    Serial.println("[LED] FastLED initialized successfully!");
  }
  
  void run_tests() {
    test_solid_colors();
    test_rainbow();
    test_running_lights();
    test_fade();
    test_color_wipe();
  }
  
  void test_solid_colors() {
    Serial.println("[LED] Test: Solid Colors");
    
    Serial.println("[LED]   → RED");
    fill_solid(leds, NUM_LEDS, CRGB::Red);
    FastLED.show();
    delay(2000);
    
    Serial.println("[LED]   → GREEN");
    fill_solid(leds, NUM_LEDS, CRGB::Green);
    FastLED.show();
    delay(2000);
    
    Serial.println("[LED]   → BLUE");
    fill_solid(leds, NUM_LEDS, CRGB::Blue);
    FastLED.show();
    delay(2000);
    
    Serial.println("[LED]   → YELLOW");
    fill_solid(leds, NUM_LEDS, CRGB::Yellow);
    FastLED.show();
    delay(2000);
    
    Serial.println("[LED]   → CYAN");
    fill_solid(leds, NUM_LEDS, CRGB::Cyan);
    FastLED.show();
    delay(2000);
    
    Serial.println("[LED]   → MAGENTA");
    fill_solid(leds, NUM_LEDS, CRGB::Magenta);
    FastLED.show();
    delay(2000);
    
    Serial.println("[LED]   → WHITE");
    fill_solid(leds, NUM_LEDS, CRGB::White);
    FastLED.show();
    delay(2000);
    
    FastLED.clear();
    FastLED.show();
  }
  
  void test_rainbow() {
    Serial.println("[LED] Test: Rainbow Pattern");
    
    fill_rainbow(leds, NUM_LEDS, 0, 255 / NUM_LEDS);
    FastLED.show();
    delay(3000);
    
    FastLED.clear();
    FastLED.show();
  }
  
  void test_running_lights() {
    Serial.println("[LED] Test: Running Lights");
    
    for(int i = 0; i < NUM_LEDS * 2; i++) {
      FastLED.clear();
      
      int pos = i % NUM_LEDS;
      leds[pos] = CRGB::Blue;
      
      FastLED.show();
      delay(50);
    }
    
    FastLED.clear();
    FastLED.show();
  }
  
  void test_fade() {
    Serial.println("[LED] Test: Fade In/Out");
    
    fill_solid(leds, NUM_LEDS, CRGB::Purple);
    
    for(int brightness = 0; brightness <= 255; brightness += 5) {
      FastLED.setBrightness(brightness);
      FastLED.show();
      delay(20);
    }
    
    for(int brightness = 255; brightness >= 0; brightness -= 5) {
      FastLED.setBrightness(brightness);
      FastLED.show();
      delay(20);
    }
    
    FastLED.setBrightness(BRIGHTNESS);
    FastLED.clear();
    FastLED.show();
  }
  
  void test_color_wipe() {
    Serial.println("[LED] Test: Color Wipe");
    
    for(int i = 0; i < NUM_LEDS; i++) {
      leds[i] = CRGB::Red;
      FastLED.show();
      delay(30);
    }
    delay(500);
    
    for(int i = 0; i < NUM_LEDS; i++) {
      leds[i] = CRGB::Green;
      FastLED.show();
      delay(30);
    }
    delay(500);
    
    for(int i = 0; i < NUM_LEDS; i++) {
      leds[i] = CRGB::Blue;
      FastLED.show();
      delay(30);
    }
    delay(500);
    
    FastLED.clear();
    FastLED.show();
  }
};

#endif