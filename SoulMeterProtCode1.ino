#include "FastLED.h"


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
  // put your setup code here, to run once:
  Serial.begin(9600);
  pinMode(RGB_BUILTIN, HIGH);
  digitalWrite(RGB_BUILTIN, LOW);
  pinMode(4, LOW);
  pinMode(5, LOW);
  pinMode(6, LOW);
  cleanBlockIgnore();
}

void loop() {
  int msg = BLEmsg(checkPosition());
  Serial.print("block Ignore ");
  Serial.println(blockIgnore[0]);
  Serial.println(blockIgnore[1]);
  Serial.println(blockIgnore[2]);
  sendMsg(msg);

  delay(500);
}

void cleanBlockIgnore(){
  for(int j = 0; j < NumberOfBlocks; j++){
    blockIgnore[j] = 0;
  }
}

int blockValue(int value, int pinNum){
  int t = analogRead(pinNum);
  // Serial.print("LDR value");
  // Serial.println(t);
  if(t > value){
    return 1;
  } else {
    return 0;
  }
}

int checkPosition(){
  int MultipleBlockCheck = 0;
  for(int i = 1; i <= NumberOfBlocks; i++){
    if(blockIgnore[i-1] == 0){
      Serial.println("passed blockIgnnore");
      if(blockValue(3000, i+Offset) == 1){
        Serial.println("blockValue check Passed");
        if(MultipleBlockCheck == 0){
          Serial.println("passed check");
          neopixelWrite(RGB_BUILTIN, 0 , 0, 64);
          MultipleBlockCheck = 1;
          actualblock = i;
          if(setPrevMs == 0) {
            Serial.println("setPrevMs");
            setPrevMs++;
            previousMillis = millis();
          }
        } else {
          neopixelWrite(RGB_BUILTIN, 0, 64, 0);
          return 100;
        }
      }
    }
  }
  if(actualblock != 0) {
    if(delayMS < (millis() - previousMillis)){
      previousMillis = millis();
      Serial.println("Millis Passed");
      setPrevMs = 0;
      if(blockValue(3000, actualblock+Offset) == 1){
        Serial.print("Block VAlue passed");
        blockIgnore[actualblock-1] = 1;
        return actualblock;
      }
    }
  }
  return 0;
}

int BLEmsg(int blockNum){
  if(prevPosition != blockNum){
    prevPosition = blockNum;
    return blockNum;
  } else {
    return 0;
  }
}

void sendMsg(int msg){
  if(BLEmsg == 0){
    neopixelWrite(RGB_BUILTIN, 0 , 0, 64);
    delay(500);
  }

}