/*
  100 LED (WS2812) test program for ESP32
  Compatible with NodeMCU 32S and ESP32-S3 (used for this project)

  This code was used to test the functionality of the LEDs,
    and to confirm if the LEDs were WS2812, and would use the FastLED library


    note: AI was used for the console UI, as it creates a clear and easy to read UI
    without needing adjustments, the patterns themselves were sourced from the FastLED example.
  */

  #include <FastLED.h>

  // ===== LED STRIP CONFIGURATION =====
  #define NUM_LEDS 101          // Change this to match your strip length (start small!)
#define DATA_PIN 13          // GPIO pin for Data (DI/DIN)
#define CLOCK_PIN 14         // GPIO pin for Clock (only for APA102/SK9822)
#define LED_TYPE WS2812B     // Options: WS2812B, WS2811, APA102, SK6812, SK9822
#define COLOR_ORDER GRB      // Options: RGB, GRB, BRG (WS2812B is usually GRB)
#define BRIGHTNESS 50        // 0-255, start LOW to test safely!

// ===== LED ARRAY =====
CRGB leds[NUM_LEDS];

void setup() {
  Serial.begin(115200);
  delay(1000);
  

  

  
  // For WS2812B, WS2811, SK6812 (3-wire, data only):
  FastLED.addLeds<LED_TYPE, DATA_PIN, COLOR_ORDER>(leds, NUM_LEDS);
  
  FastLED.setBrightness(BRIGHTNESS);
  FastLED.clear();
  FastLED.show();
  
  Serial.println("FastLED initialized successfully!");
  Serial.println("Starting test sequence in 2 seconds...\n");
  delay(2000);
}

void loop() {
  // Test 1: Individual colors
  testSolidColors();
  
  // Test 2: Rainbow pattern
  testRainbow();
  
  // Test 3: Running lights
  testRunningLights();
  
  // Test 4: Fade in/out
  testFade();
  
  // Test 5: Color wipe
  testColorWipe();
  
  Serial.println("--- Cycle complete ---\n");
  delay(1000);
}

// Below are all the test functions

void testSolidColors() {
  Serial.println("Test: Solid Colors");
  
  Serial.println("  → RED");
  fill_solid(leds, NUM_LEDS, CRGB::Red);
  FastLED.show();
  delay(2000);
  
  Serial.println("  → GREEN");
  fill_solid(leds, NUM_LEDS, CRGB::Green);
  FastLED.show();
  delay(2000);
  
  Serial.println("  → BLUE");
  fill_solid(leds, NUM_LEDS, CRGB::Blue);
  FastLED.show();
  delay(2000);
  
  Serial.println("  → YELLOW");
  fill_solid(leds, NUM_LEDS, CRGB::Yellow);
  FastLED.show();
  delay(2000);
  
  Serial.println("  → CYAN");
  fill_solid(leds, NUM_LEDS, CRGB::Cyan);
  FastLED.show();
  delay(2000);
  
  Serial.println("  → MAGENTA");
  fill_solid(leds, NUM_LEDS, CRGB::Magenta);
  FastLED.show();
  delay(2000);
  
  Serial.println("  → WHITE");
  fill_solid(leds, NUM_LEDS, CRGB::White);
  FastLED.show();
  delay(2000);
  
  FastLED.clear();
  FastLED.show();
}

void testRainbow() {
  Serial.println("Test: Rainbow Pattern");
  
  fill_rainbow(leds, NUM_LEDS, 0, 255 / NUM_LEDS);
  FastLED.show();
  delay(3000);
  
  FastLED.clear();
  FastLED.show();
}

void testRunningLights() {
  Serial.println("Test: Running Lights");
  
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

void testFade() {
  Serial.println("Test: Fade In/Out");
  
  fill_solid(leds, NUM_LEDS, CRGB::Purple);
  
  // Fade in
  for(int brightness = 0; brightness <= 255; brightness += 5) {
    FastLED.setBrightness(brightness);
    FastLED.show();
    delay(20);
  }
  
  // Fade out
  for(int brightness = 255; brightness >= 0; brightness -= 5) {
    FastLED.setBrightness(brightness);
    FastLED.show();
    delay(20);
  }
  
  FastLED.setBrightness(BRIGHTNESS); // Restore original brightness
  FastLED.clear();
  FastLED.show();
}

void testColorWipe() {
  Serial.println("Test: Color Wipe");
  
  // Red wipe
  for(int i = 0; i < NUM_LEDS; i++) {
    leds[i] = CRGB::Red;
    FastLED.show();
    delay(30);
  }
  delay(500);
  
  // Green wipe
  for(int i = 0; i < NUM_LEDS; i++) {
    leds[i] = CRGB::Green;
    FastLED.show();
    delay(30);
  }
  delay(500);
  
  // Blue wipe
  for(int i = 0; i < NUM_LEDS; i++) {
    leds[i] = CRGB::Blue;
    FastLED.show();
    delay(30);
  }
  delay(500);
  
  FastLED.clear();
  FastLED.show();
}