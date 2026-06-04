#include "BLE_UART.h"

#define NumberOfBlocks 3
#define Offset 3


const int delayMS = 3000;
int prevPosition;
int blockIgnore[NumberOfBlocks];
int previousMillis = 0;
int actualblock = 0;
int setPrevMs = 0;

void cleanBlockIgnore();
int blockValue(int value, int pinNum);
int checkPosition();
int BLEmsg(int blockNum);
void sendMsg(int msg);


void setup() {
  Serial.begin(9600);
  
  //for setting the 3 LDRS used for this test.
  pinMode(4, LOW);
  pinMode(5, LOW);
  pinMode(6, LOW);
  cleanBlockIgnore();     // empties blockignore array
  setupBLE();         // BLE init
}

void loop() {
  // loop just sends a msg depending on block states
  int msg = BLEmsg(checkPosition());
  Serial.print("block states: \n");
  Serial.println(blockIgnore[0]);
  Serial.println(blockIgnore[1]);
  Serial.println(blockIgnore[2]);
  sendMsg(msg);
  delay(500);
}

// Empties blockignore array
void cleanBlockIgnore() {
  for (int j = 0; j < NumberOfBlocks; j++) {
    blockIgnore[j] = 0;
  }
}

// Sets value of block ignore for each tile
int blockValue(int value, int pinNum) {
  int t = analogRead(pinNum);
  Serial.println(t);
  if (t > value) {
    return 1;
  } else {
    return 0;
  }
}

// checks position of individual tile
int checkPosition() {
  int MultipleBlockCheck = 0;
  for (int i = 1; i <= NumberOfBlocks + 0; i++) { // for each tile
    if (blockIgnore[i - 1] == 0) {    // Where the tile wasn't already changed
      if (blockValue(2000, i + Offset) == 1) { // With enough light
        if (MultipleBlockCheck == 0) {  // If only 1 tile has been turned since the last check
          Serial.println("passed check");
          MultipleBlockCheck = 1;
          actualblock = i;
          if (setPrevMs == 0) {
            setPrevMs++;
            previousMillis = millis();
          }
        } else {
          return 100;
        }
      }
    }
  }
  if (actualblock != 0) { // This logic is used for testing whether the block has remained in its new state for at least 1 second.
    if (delayMS < (millis() - previousMillis)) {
      previousMillis = millis();
      setPrevMs = 0;
      if (blockValue(2000, actualblock + Offset) == 1) {
        blockIgnore[actualblock - 1] = 1;
        return actualblock;
      }
    }
  }
  return 0;
}


int BLEmsg(int blockNum) {
  if (prevPosition != blockNum) {
    prevPosition = blockNum;
    return blockNum;
  } else {
    return 0;
  }
}

// Sends a msg if a tile state has changed
void sendMsg(int msg) {
  if (msg == 0) {                      
    delay(500);
  } else {
    String out = "Block changed: " + String(msg);
    sendBLE(out);                      //  send over BLE
    Serial.println(out);
  }
}