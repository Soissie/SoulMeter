// index.js — entry point
//
// Starts HTTP server and (unless --no-ble) the BLE manager.
//
// Usage:
//   (sudo) node index.js          full mode (BLE and HTTP)
//   (sudo) node index.js --no-ble dev mode  (HTTP only, no BLE, for testing)
//
// If the port is already in use, free it with:  sudo fuser -k <port>/tcp
// ============================================================================

const { execSync } = require("child_process");
const settings = require("./settings");

const command_line_args = process.argv.slice(2);
const ble_disabled = command_line_args.includes("--no-ble");

const PORT_RELEASE_WAIT_MS = 300; // pause after freeing before binding

// kill whatever already holds the port so a quick restart won't crash it
try {
  execSync(`fuser -k ${settings.SERVER_PORT}/tcp`, { stdio: "ignore" });
  console.log(`[main] Cleared port ${settings.SERVER_PORT}`);
  const wait_start = Date.now();
  while (Date.now() - wait_start < PORT_RELEASE_WAIT_MS) {
    // busy wait so the device releases the socket before bind
  }
} catch {
  // nothing opn port, continue
}

const server = require("./server");
server.start();

if (ble_disabled) {
  console.log("[main] BLE disabled (--no-ble). Use /dev/* endpoints for testing.");
} else {
  const ble = require("./ble");
  ble.init().catch((err) => {
    console.error("[BLE] Fatal error during init:", err.message);
    console.log("[main] Continuing without BLE. Use /dev/* endpoints for manual testing.");
  });
}

// ── manual test commands (curl) ─────────────────────────────────────────────
// Incredibly helpful for API work as it avoids needing the MCU
// Flip tile 5 (0-based):
//   curl -s -X POST http://localhost:3000/flip   -H "Content-Type: application/json" -d '{"tile": 4}'
// Unflip tile 5:
//   curl -s -X POST http://localhost:3000/unflip -H "Content-Type: application/json" -d '{"tile": 4}'
// Answer (0-based index):
//   curl -s -X POST http://localhost:3000/answer -H "Content-Type: application/json" -d '{"index": 0}'
// Continue after result:
//   curl -s -X POST http://localhost:3000/continue
// Reset / start a new game:
//   curl -s -X POST http://localhost:3000/dev/reset
// Simulate BLE disconnect:
//   curl -s -X POST http://localhost:3000/dev/ble -H "Content-Type: application/json" -d '{"connected": false}'
// Set tile count:
//   curl -s -X POST http://localhost:3000/dev/tile-count -H "Content-Type: application/json" -d '{"count": 6}'
