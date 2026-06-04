// Based on BLE UART example code.
// ported ton arduino esp32 by Evandro Copercini
// Based on Neil Kolban example: https://github.com/nkolban/esp32-snippets/blob/master/cpp_utils/tests/BLE%20Tests/SampleNotify.cpp

// Modified to better fit our usecase

#pragma once
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>


#define NUS_SERVICE_UUID           "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"
#define NUS_CHARACTERISTIC_UUID_RX "6E400002-B5A3-F393-E0A9-E50E24DCCA9E"
#define NUS_CHARACTERISTIC_UUID_TX "6E400003-B5A3-F393-E0A9-E50E24DCCA9E"

static BLECharacteristic *pTxCharacteristic = nullptr;
static bool bleConnected = false;

class BLEConnectionCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer *pServer) {
    bleConnected = true;
    Serial.println(">> BLE device connected");
  }
  void onDisconnect(BLEServer *pServer) {
    bleConnected = false;
    Serial.println(">> BLE device disconnected, restarting advertising...");
    BLEDevice::startAdvertising();
  }
};

class BLERxCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    String rx = pCharacteristic->getValue();
    if (rx.length() > 0) {
      Serial.print(">> BLE received: ");
      Serial.println(rx.c_str());
    }
  }
};

void setupBLE() {
  BLEDevice::init("ESP32-Jeopardy");
  BLEServer *pServer = BLEDevice::createServer();
  pServer->setCallbacks(new BLEConnectionCallbacks());

  BLEService *pService = pServer->createService(NUS_SERVICE_UUID);


  pTxCharacteristic = pService->createCharacteristic(
    NUS_CHARACTERISTIC_UUID_TX,
    BLECharacteristic::PROPERTY_NOTIFY
  );
  pTxCharacteristic->addDescriptor(new BLE2902());

  BLECharacteristic *pRxCharacteristic = pService->createCharacteristic(
    NUS_CHARACTERISTIC_UUID_RX,
    BLECharacteristic::PROPERTY_WRITE
  );
  pRxCharacteristic->setCallbacks(new BLERxCallbacks());

  pService->start();

  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(NUS_SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMaxPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.println("BLE UART ready");
}

void sendBLE(String msg) {
  if (bleConnected && pTxCharacteristic != nullptr) {
    pTxCharacteristic->setValue(msg.c_str());
    pTxCharacteristic->notify();
  }
}