/*
  101 LED (WS2812) + 3 LDR Sensor Test Program
  Compatible with NodeMCU 32S and ESP32-S3
  
  LED patterns run once, then LDR readings print continuously every second

  LED: pin 13 for data with 5V
  LDR: pin 34, 35 and 32 with 3.3v
*/

#include "led_controller.h"
#include "ldr_sensor.h"

// ===== COMPONENT ENABLE/DISABLE FLAGS =====
#define ENABLE_LEDS true
#define ENABLE_LDR true

// ===== GLOBAL OBJECTS =====
LEDController led_controller;
LDRSensor ldr_sensor;

bool patterns_complete = false;

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\n========================================");
  Serial.println("  ESP32 Prototype 1 - Test Program");
  Serial.println("========================================");

  
  // Initialize LED Controller
  #if ENABLE_LEDS
    led_controller.begin();
  #endif
  
  // Initialize LDR Sensors
  #if ENABLE_LDR
    ldr_sensor.begin();
  #endif
  
  Serial.println("\nInitialization complete!");
  Serial.println("Starting test sequence in 2 seconds...\n");
  delay(2000);
}

void loop() {
  // Run LED pattern tests once
  #if ENABLE_LEDS
    if(!patterns_complete) {
      led_controller.run_tests();
      patterns_complete = true;
      Serial.println("\n[SYSTEM] LED patterns complete. Now monitoring LDR sensors...\n");
    }
  #endif
  
  // Continuously read and display LDR values
  #if ENABLE_LDR
    ldr_sensor.read_and_print();
  #endif
  
  // Small delay to prevent overwhelming the serial monitor
  delay(10);
}