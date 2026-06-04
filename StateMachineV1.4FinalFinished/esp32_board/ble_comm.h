// ble_comm.h
//
// BLE transport (Nordic UART Service). advertises, accepts a connection,
// sends strings to the API and hand received strings to a
// callback.
// ============================================================================

#ifndef BLE_COMM_H
#define BLE_COMM_H

#include <Arduino.h>

// Signature for handler that receives incoming text
typedef void (*BleMessageHandler)(const String &message);

// Signature for the callback fired when an API client connects.
typedef void (*BleConnectHandler)();

// Initialise BLE and start advertising (call once from setup).
//   received_handler  called for every string the API writes to us.
//   connect_handler   called once each time an API client connects
//                     (e.g. so the sketch can announce the tile count).
void ble_comm_init(BleMessageHandler received_handler,
                   BleConnectHandler connect_handler);

// Send a string to the API (no-op if not connected).
void ble_comm_send(const String &message);

// True while an API client is connected.
bool ble_comm_is_connected();

#endif // BLE_COMM_H
