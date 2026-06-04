// ble_comm.ino
//
// Based on BLE examples
// Implementation of the BLE transport module. See ble_comm.h.
// ============================================================================

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#include "config.h"
#include "ble_comm.h"

static BLECharacteristic *tx_characteristic = nullptr; // we notify on this
static bool ble_connected = false;
static BleMessageHandler message_handler = nullptr;
static BleConnectHandler connect_handler = nullptr;

// connection callbacks
class BoardServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer *) {
    ble_connected = true;
    // let the main sketch announce whatever it wants
    if (connect_handler) connect_handler();
  }

  void onDisconnect(BLEServer *) {
    ble_connected = false;
    delay(ADVERT_RESTART_MS);
    BLEDevice::startAdvertising();
  }
};

// receive callback
class BoardRxCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *characteristic) {
    String value = characteristic->getValue();
    if (message_handler) message_handler(value);
  }
};

// public API
void ble_comm_send(const String &message) {
  if (!ble_connected) {
    return;
  }
  tx_characteristic->setValue(message.c_str());
  tx_characteristic->notify();
}

bool ble_comm_is_connected() {
  return ble_connected;
}

void ble_comm_init(BleMessageHandler received_handler,
                   BleConnectHandler new_connect_handler) {
  message_handler = received_handler;
  connect_handler = new_connect_handler;

  BLEDevice::init(DEVICE_NAME);
  BLEServer *server = BLEDevice::createServer();
  server->setCallbacks(new BoardServerCallbacks());

  BLEService *service = server->createService(SERVICE_UUID);

  tx_characteristic = service->createCharacteristic(
      CHARACTERISTIC_UUID_TX, BLECharacteristic::PROPERTY_NOTIFY);
  tx_characteristic->addDescriptor(new BLE2902());

  BLECharacteristic *rx_characteristic = service->createCharacteristic(
      CHARACTERISTIC_UUID_RX, BLECharacteristic::PROPERTY_WRITE);
  rx_characteristic->setCallbacks(new BoardRxCallbacks());

  service->start();

  BLEAdvertising *advertising = BLEDevice::getAdvertising();
  advertising->addServiceUUID(SERVICE_UUID);
  advertising->setScanResponse(true);
  advertising->setMinPreferred(ADVERT_MIN_INTERVAL);
  advertising->setMaxPreferred(ADVERT_MAX_INTERVAL);
  BLEDevice::startAdvertising();

}
