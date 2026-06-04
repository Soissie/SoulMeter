/*
  LDR Sensor Module
  Reads raw ADC values from 3 LDRs and prints to console
*/

#ifndef LDR_SENSOR_H
#define LDR_SENSOR_H

#include <Arduino.h>

class LDRSensor {
private:
  static const int NUM_SENSORS = 3;
  static const int LDR_PINS[NUM_SENSORS];
  
  unsigned long last_read_time = 0;
  static const unsigned long READ_INTERVAL = 1000; // Read every 1 second
  
public:
  void begin() {
    Serial.println("[LDR] Initializing sensors on pins: " + 
                   String(LDR_PINS[0]) + ", " + 
                   String(LDR_PINS[1]) + ", " + 
                   String(LDR_PINS[2]));
  }
  
  void read_and_print() {
    unsigned long current_time = millis();
    
    if(current_time - last_read_time >= READ_INTERVAL) {
      last_read_time = current_time;
      
      Serial.print("[LDR] ");
      for(int i = 0; i < NUM_SENSORS; i++) {
        int value = analogRead(LDR_PINS[i]);
        Serial.print("S" + String(i + 1) + ":" + String(value));
        if(i < NUM_SENSORS - 1) Serial.print(" | ");
      }
      Serial.println();
    }
  }
};

// GPIO pins for the 3 LDRs (must be ADC-capable)
const int LDRSensor::LDR_PINS[NUM_SENSORS] = {34, 35, 32};

#endif