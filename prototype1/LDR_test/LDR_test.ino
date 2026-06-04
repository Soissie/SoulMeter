/*
  3 LDR Sensor Test Program for ESP32
  Compatible with NodeMCU 32S and ESP32-S3 (used for this project)

  This test has 2 purposes, the first is to test how heavily distorted 
  the output becomes due to outside interference.

  The second is to test how we can limit this interference.
  The eventual goal is for the Sensors to accurately sense the laser light.

  note: AI was used for the console UI, as it creates a clear and easy to read UI
  without needing adjustments (like adding or removing 1 '=' in the title)
*/

// Define GPIO pins for the LDR sensors
const int LDR1_PIN = 36;  
const int LDR2_PIN = 39;  
const int LDR3_PIN = 34;  

// Variables to store sensor readings
int ldr1Value = 0;
int ldr2Value = 0;
int ldr3Value = 0;

void setup() {
  // Initialize serial communication at 115200 baud (standard)
  Serial.begin(115200);
  
  // Wait for serial to be ready
  delay(1000);
  
  // Set ADC resolution to 12-bit (0-4095)
  analogReadResolution(12);
  
  // Set ADC attenuation to 11dB for full 0-3.3V range
  analogSetAttenuation(ADC_11db);
  
  // Print header
  // Made using claude.AI, for better clarity
  Serial.println("=== ESP32 LDR Sensor Test ===");
  Serial.println("Reading from 3 LDR sensors...");
  Serial.println("ADC Range: 0-4095 (12-bit)");
  Serial.println();
}

void loop() {
  // Read values from all three LDR sensors
  ldr1Value = analogRead(LDR1_PIN);
   ldr2Value = analogRead(LDR2_PIN);
   ldr3Value = analogRead(LDR3_PIN);
  
  // Display the values on Serial Monitor
  Serial.print("LDR 1 (GPIO36): ");
  Serial.print(ldr1Value);
  Serial.print("\t\n");
  
   Serial.print("LDR 2 (GPIO39): ");
   Serial.print(ldr2Value);
   Serial.print("\t");
  
   Serial.print("LDR 3 (GPIO34): ");
   Serial.println(ldr3Value);
  
  // Wait 500ms before next reading
  delay(500);
}