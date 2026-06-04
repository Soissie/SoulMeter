// ble.js
//
// Bluetooth Low Energy to ESP32 board, using @stoprocent/noble.
// Uses event-based scanning, because discoverAsync()
// leaves a dangling iterator on retries and silently misses devices.
//
// based on examples at https://github.com/stoprocent/noble
// ============================================================================

const noble = require("@stoprocent/noble");
const game = require("./game");
const settings = require("./settings");

let rx_characteristic = null; // we write to this (API to ESP)
let is_connected = false;
let scan_watchdog_timer = null; // restarts the scan if stuck

noble.on("stateChange", (adapter_state) => {
  if (adapter_state === "poweredOn") {
    console.log("[BLE] Adapter ready");
  } else {
    console.log(`[BLE] Adapter state: ${adapter_state}`);
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
    await noble.stopScanningAsync();
  } catch {
    // Okay if it fails
  }
}

async function start_scanning() {
  if (is_connected) return;

  clearTimeout(scan_watchdog_timer);
  await stop_scan();

  // pause to let noble settle after stop
  await new Promise((resolve) => setTimeout(resolve, settings.BLE_SCAN_SETTLE_MS));

  noble.removeAllListeners("discover");

  console.log(`[BLE] Scanning for "${settings.BLE_DEVICE_NAME}"...`);

  // watchdog: if nothing is found in time, restart the scan
  scan_watchdog_timer = setTimeout(() => {
    if (!is_connected) {
      console.log("[BLE] Scan watchdog fired — restarting scan");
      start_scanning();
    }
  }, settings.BLE_SCAN_WATCHDOG_MS);

  noble.on("discover", async (peripheral) => {
    const name = peripheral.advertisement.localName || "";
    if (name !== settings.BLE_DEVICE_NAME) return;

    // found the board, stop scan and connect
    clearTimeout(scan_watchdog_timer);
    noble.removeAllListeners("discover");
    await stop_scan();

    console.log("[BLE] Found ESP32, connecting...");
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
    await noble.startScanningAsync([settings.BLE_SERVICE_UUID], false);
  } catch (err) {
    console.error("[BLE] Failed to start scan:", err.message);
    clearTimeout(scan_watchdog_timer);
    setTimeout(() => start_scanning(), settings.BLE_SCAN_RETRY_DELAY_MS);
  }
}

// entry
async function init() {
  console.log("[BLE] Waiting for Bluetooth adapter...");

  // wait for the adapter to power on.
  // we use the stateChange event rather than noble.waitForPoweredOnAsync(),
  // because that helper is not present in every build of @stoprocent/noble
  // (notably on Windows), which caused a "not a function" crash on startup.
  await new Promise((resolve, reject) => {
    // already powered on? resolve immediately
    if (noble._state === "poweredOn" || noble.state === "poweredOn") {
      return resolve();
    }

    const timer = setTimeout(() => {
      noble.removeListener("stateChange", on_state);
      reject(
        new Error(
          // based on earlier
          // Can be circumvented by launching as root (sudo node index.js)
          "Bluetooth adapter did not power on in time.\n" +
            "  Linux: sudo systemctl start bluetooth && sudo hciconfig hci0 up\n" +
            "  Then:  sudo setcap cap_net_raw+eip $(eval readlink -f $(which node))\n" +
            // macOS not tested, based on a similar issue on github
            "  macOS: grant Bluetooth access in System Settings -> Privacy & Security\n" +
            "  Windows: make sure Bluetooth is on and the noble build step succeeded",
        ),
      );
    }, settings.BLE_ADAPTER_TIMEOUT_MS);

    function on_state(adapter_state) {
      if (adapter_state === "poweredOn") {
        clearTimeout(timer);
        noble.removeListener("stateChange", on_state);
        resolve();
      }
    }

    noble.on("stateChange", on_state);
  });

  start_scanning();
}

module.exports = { init, send };
