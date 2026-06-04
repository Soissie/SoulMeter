// ble.js
//
// Bluetooth Low Energy to ESP32 board, using @stoprocent/noble.
// Uses event-based scanning, because discoverAsync()
// leaves a dangling iterator on retries and silently misses devices.
//
// noble auto-selects the native binding for the current OS (mac/win/hci),
// so the same code runs on Linux, macOS and Windows.
//
// based on examples at https://github.com/stoprocent/noble
// ============================================================================

const noble = require("@stoprocent/noble");
const game = require("./game");
const settings = require("./settings");

let rx_characteristic = null; // we write to this (API to ESP)
let is_connected = false;
let scan_watchdog_timer = null; // restarts the scan if stuck
let scanning_started = false;   // guard so we only kick off scanning once
let scan_ever_started = false;  // true once a scan has been started at least once

noble.on("stateChange", (adapter_state) => {
  if (adapter_state === "poweredOn") {
    console.log("[BLE] Adapter ready");
    // Start scanning as soon as the adapter is up, driven by the event itself.
    // Doing it here (rather than waiting for the event inside init) means we
    // never miss it when it fires before init runs — which is what left
    // Windows stuck on "Adapter ready".
    if (!scanning_started) {
      scanning_started = true;
      start_scanning();
    }
  }
});

// message parser
// Translates strings from board into game logic calls.
function handle_message(raw_message) {
  const message = raw_message.trim();

  // tile flip
  if (message.startsWith(settings.MSG_TILE_FLIPPED_PREFIX)) {
    const tile_number = parseInt(message.split(":")[1].trim(), 10);
    if (!isNaN(tile_number)) game.on_tile_flipped(tile_number - 1);
    return;
  }

  // tile unflip
  if (message.startsWith(settings.MSG_TILE_UNFLIPPED_PREFIX)) {
    const tile_number = parseInt(message.split(":")[1].trim(), 10);
    if (!isNaN(tile_number)) game.on_tile_unflipped(tile_number - 1);
    return;
  }

  // active tile count
  // Currently unnecessary, for future modularity
  if (message.startsWith(settings.MSG_TILE_COUNT_PREFIX)) {
    const reported_count = parseInt(message.split(":")[1].trim(), 10);
    if (!isNaN(reported_count)) game.on_tile_count(reported_count);
    return;
  }

  // board reset from ESP
  // Currently unused, helpful for future physical reset button
  if (message === settings.MSG_BOARD_RESET || message === settings.MSG_BOARD_RESET_ALT) {
    game.on_board_reset();
    return;
  }

  // Board ready, all tiles in rest position
  if (message === settings.MSG_BOARD_READY) {
    game.on_board_ready(true);
    return;
  }

  // board unready, not all tiles in rest position
  if (message === settings.MSG_BOARD_NOT_READY) {
    game.on_board_ready(false);
    return;
  }

  console.log(`[BLE] Unrecognised message: "${message}"`);
}

// send to ESP
async function send(message) {
  if (!rx_characteristic) return;
  try {
    await rx_characteristic.writeAsync(Buffer.from(message, "utf-8"), false);
  } catch (err) {
    console.error("[BLE] Send error:", err.message);
  }
}

// connection
async function connect_and_listen(peripheral) {
  peripheral.on("disconnect", () => {
    console.log("[BLE] Disconnected from ESP32");
    rx_characteristic = null;
    is_connected = false;
    game.on_ble_disconnect();
    setTimeout(() => start_scanning(), settings.BLE_RECONNECT_DELAY_MS);
  });

  await peripheral.connectAsync();
  is_connected = true;
  console.log("[BLE] Connected to ESP32");

  const { characteristics } =
  await peripheral.discoverSomeServicesAndCharacteristicsAsync(
    [settings.BLE_SERVICE_UUID],
    [settings.BLE_RX_UUID, settings.BLE_TX_UUID],
  );

  rx_characteristic =
  characteristics.find((c) => c.uuid === settings.BLE_RX_UUID) || null;
  const tx_characteristic =
  characteristics.find((c) => c.uuid === settings.BLE_TX_UUID);

  if (!rx_characteristic || !tx_characteristic) {
    throw new Error("NUS characteristics not found — check ESP32 firmware");
  }

  await tx_characteristic.subscribeAsync();
  tx_characteristic.on("data", (buffer) => handle_message(buffer.toString("utf-8")));

  console.log("[BLE] Listening for tile events");

  // After connecting, connect game logic
  // onBleConnect sends START_GAME, must be after the write
  // characteristic is ready
  game.set_esp_send_callback(send);
  if (settings.BLE_START_GAME_DELAY_MS > 0) {
    setTimeout(() => game.on_ble_connect(), settings.BLE_START_GAME_DELAY_MS);
  } else {
    game.on_ble_connect();
  }
}

// scanning

// stop current scan before starting new
// noble errors if you call scanning while already scanning.
// Do not remove this. -noah
async function stop_scan() {
  try {
    // On the Windows binding, stopScanningAsync() can hang forever when no
    // scan is active. Race it against a short timeout so it can never block
    // start_scanning(). On Linux/mac it resolves normally well within this.
    await Promise.race([
      noble.stopScanningAsync(),
                       new Promise((resolve) => setTimeout(resolve, 1000)),
    ]);
  } catch {
    // Okay if it fails
  }
}

async function start_scanning() {
  if (is_connected) return;

  clearTimeout(scan_watchdog_timer);

  // Only stop a previous scan if one was ever started. On the first call there
  // is nothing to stop, and on Windows calling stopScanningAsync() with no
  // active scan can hang — so we skip it entirely the first time.
  if (scan_ever_started) {
    await stop_scan();
    // pause to let noble settle after stop
    await new Promise((resolve) => setTimeout(resolve, settings.BLE_SCAN_SETTLE_MS));
  }

  noble.removeAllListeners("discover");

  console.log(`[BLE] Scanning for "${settings.BLE_DEVICE_NAME}"...`);
  scan_ever_started = true;

  // watchdog: if nothing is found in time, restart the scan
  scan_watchdog_timer = setTimeout(() => {
    if (!is_connected) {
      console.log("[BLE] Scan watchdog fired — restarting scan");
      start_scanning();
    }
  }, settings.BLE_SCAN_WATCHDOG_MS);

  noble.on("discover", async (peripheral) => {
    const name = peripheral.advertisement.localName || "";
    const service_uuids = peripheral.advertisement.serviceUuids || [];

    // Match the board by the service UUID it advertises, with the device name
    // as a fallback. We match on the UUID first because Windows (WinRT) does
    // not deliver the advertised name in passive scan packets, so every device
    // shows up with an empty name there — but the service UUID does come
    // through on both Windows and Linux.
    const uuid_match = service_uuids
    .map((u) => u.replace(/-/g, "").toLowerCase())
    .includes(settings.BLE_SERVICE_UUID.replace(/-/g, "").toLowerCase());
    const name_match = name === settings.BLE_DEVICE_NAME;

    if (!uuid_match && !name_match) return;

    // found the board, stop scan and connect
    clearTimeout(scan_watchdog_timer);
    noble.removeAllListeners("discover");
    await stop_scan();

    console.log(`[BLE] Found ESP32 (name="${name}", id=${peripheral.id}), connecting...`);
    try {
      await connect_and_listen(peripheral);
    } catch (err) {
      console.error("[BLE] Connection error:", err.message);
      is_connected = false;
      game.on_ble_disconnect();
      setTimeout(() => start_scanning(), settings.BLE_RECONNECT_DELAY_MS);
    }
  });

  try {
    // Scan with NO service-UUID filter. On the Windows (WinRT) binding a
    // filtered scan often returns zero results even when the device is
    // advertising, so we scan for everything and match by service UUID (with
    // name as a fallback) in the discover handler above. Linux/mac work fine
    // either way.
    await noble.startScanningAsync([], false);
  } catch (err) {
    console.error("[BLE] Failed to start scan:", err.message);
    clearTimeout(scan_watchdog_timer);
    setTimeout(() => start_scanning(), settings.BLE_SCAN_RETRY_DELAY_MS);
  }
}

// entry
async function init() {
  console.log("[BLE] Waiting for Bluetooth adapter...");

  // Scanning is started by the stateChange handler above when the adapter
  // reports poweredOn. If it is ALREADY powered on by the time we get here
  // (the event fired before init ran), kick it off now so we don't wait
  // forever for an event that already happened.
  const current_state = noble.state || noble._state;

  if (current_state === "poweredOn" && !scanning_started) {
    scanning_started = true;
    start_scanning();
    return;
  }

  // Otherwise, warn if the adapter never powers on within the timeout.
  setTimeout(() => {
    if (!scanning_started) {
      console.error(
        "[BLE] Adapter did not power on / scanning never started.\n" +
        "  Windows: make sure Bluetooth is ON in Settings and the noble build step succeeded.\n" +
        "  Linux:   sudo systemctl start bluetooth && sudo hciconfig hci0 up\n" +
        "  macOS:   grant Bluetooth access in System Settings -> Privacy & Security",
      );
    }
  }, settings.BLE_ADAPTER_TIMEOUT_MS);
}

module.exports = { init, send };

