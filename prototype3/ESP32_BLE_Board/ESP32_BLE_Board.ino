// ESP32_BLE_Board.ino
//
// Physical Jeopardy board for ESP32-S3 — reads 9 LDR sensors and sends
// tile events over BLE. Also accepts Serial commands for manual override.
//
// ── HARDWARE ────────────────────────────────────────────────────────────────
//   Each LDR is wired as a voltage divider with a 10kΩ pull-down to GND.
//   GPIO reads HIGH (bright) = tile in starting position (not flipped).
//   GPIO reads LOW  (dark)   = tile flipped (blocking the light).
//
//   Uses digitalRead() — no ADC involved, so BLE + sensors coexist fine.
//   Tiles are mapped to GPIO 1–9 (ADC1 CH0–CH8 on the S3, but we read them
//   digitally so the ADC conflict with BLE is completely avoided).
// ─────────────────────────────────────────────────────────────────────────────
//
// ── SERIAL COMMANDS ──────────────────────────────────────────────────────────
//   f<N>      flip tile N manually      e.g. f3
//   u<N>      unflip tile N manually    e.g. u3
//   r         board reset
//   rdy       board ready
//   nrdy      board not ready
//   tiles     print current tile count
//   set <N>   change tile count to N (also notifies Node.js)
//   raw <X>   send any string verbatim
//   ldr       print digital state of all sensors right now
//   help      show this list
// ─────────────────────────────────────────────────────────────────────────────

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// ── edit to match ble.js / config.js ─────────────────────────────────────────
#define DEVICE_NAME "ESP32-Jeopardy"
#define TILE_COUNT   9

#define SERVICE_UUID           "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"
#define CHARACTERISTIC_UUID_RX "6E400002-B5A3-F393-E0A9-E50E24DCCA9E"
#define CHARACTERISTIC_UUID_TX "6E400003-B5A3-F393-E0A9-E50E24DCCA9E"
// ─────────────────────────────────────────────────────────────────────────────

// ── LDR pin mapping ───────────────────────────────────────────────────────────
//   Tile:   1  2  3  4  5  6  7  8  9
int LDR_PINS[TILE_COUNT] = { 1, 2, 3, 4, 5, 6, 7, 8, 9 };
// ─────────────────────────────────────────────────────────────────────────────

// How long (ms) a new sensor state must be stable before we act on it.
// Debounces mechanical jitter AND implements the settle window.
#define SETTLE_MS  800

// ─────────────────────────────────────────────────────────────────────────────

BLECharacteristic *pTxCharacteristic = nullptr;
bool               connected         = false;
int                tileCount         = TILE_COUNT;

// ── sensor state ─────────────────────────────────────────────────────────────
// true  = tile is flipped (LOW / dark, blocking light)
// false = tile is in starting position (HIGH / bright)
bool          confirmedState[TILE_COUNT];
bool          pendingState[TILE_COUNT];
unsigned long settleStart[TILE_COUNT];
bool          hasPending[TILE_COUNT];

// ── BLE callbacks ─────────────────────────────────────────────────────────────

class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer *) {
    connected = true;
    Serial.println(">>> Node.js connected");
    String msg = "TILE_COUNT:" + String(tileCount);
    pTxCharacteristic->setValue(msg.c_str());
    pTxCharacteristic->notify();
    Serial.println("Sent: " + msg);
  }

  void onDisconnect(BLEServer *) {
    connected = false;
    Serial.println(">>> Node.js disconnected, restarting advertising...");
    delay(500);
    BLEDevice::startAdvertising();
  }
};

class RxCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pChar) {
    String val = pChar->getValue();
    Serial.println("[Node -> ESP] Received: " + val);

    if (val.startsWith("SCORE:")) {
      int score = val.substring(6).toInt();
      Serial.println("  => Current score is now: " + String(score) + "%");
      // TODO: drive LED strip based on score
    }
  }
};

// ── BLE send helper ───────────────────────────────────────────────────────────

void bleSend(const String &msg) {
  if (!connected) {
    Serial.println("(not connected, message not sent)");
    return;
  }
  pTxCharacteristic->setValue(msg.c_str());
  pTxCharacteristic->notify();
  Serial.println("Sent: " + msg);
}

// ── sensor read ───────────────────────────────────────────────────────────────
// LOW = LDR dark = tile flipped → returns true
// HIGH = LDR lit = tile in rest  → returns false

bool readFlipped(int i) {
  int raw = digitalRead(LDR_PINS[i]);
  bool flipped = (raw == LOW);
  // Uncomment the line below if you want per-poll spam (very noisy):
  // Serial.printf("[DBG] readFlipped tile %d (GPIO %d): raw=%d → %s\n", i+1, LDR_PINS[i], raw, flipped ? "FLIPPED" : "ready");
  return flipped;
}

// ── tile confirmed handler ────────────────────────────────────────────────────

void onTileConfirmed(int i, bool newFlipped) {
  bool wasFlipped   = confirmedState[i];
  confirmedState[i] = newFlipped;

  Serial.printf("[DBG] onTileConfirmed tile %d: %s → %s\n",
                i + 1,
                wasFlipped ? "FLIPPED" : "ready",
                newFlipped ? "FLIPPED" : "ready");

  // Count total currently flipped tiles
  int totalFlipped = 0;
  for (int j = 0; j < tileCount; j++) {
    if (confirmedState[j]) totalFlipped++;
  }
  Serial.printf("[DBG] Total flipped after update: %d\n", totalFlipped);

  if (!wasFlipped && newFlipped) {
    // ── tile just flipped ──
    if (totalFlipped > 1) {
      // Multi-tile situation — warn the API, don't register as a pick
      Serial.printf("[LDR] WARNING: tile %d flipped but %d tiles are flipped total!\n",
                    i + 1, totalFlipped);
      Serial.printf("[DBG] → Sending BOARD_NOT_READY (multi-tile guard triggered)\n");
      bleSend("BOARD_NOT_READY");
    } else {
      Serial.printf("[LDR] Tile %d flipped.\n", i + 1);
      Serial.printf("[DBG] → Sending 'Block changed: %d'\n", i + 1);
      bleSend("Block changed: " + String(i + 1));
    }

  } else if (wasFlipped && !newFlipped) {
    // ── tile just unflipped ──
    Serial.printf("[LDR] Tile %d unflipped.\n", i + 1);
    Serial.printf("[DBG] → Sending 'Block unflipped: %d'\n", i + 1);
    bleSend("Block unflipped: " + String(i + 1));

    int stillFlipped = 0;
    for (int j = 0; j < tileCount; j++) {
      if (confirmedState[j]) stillFlipped++;
    }
    Serial.printf("[DBG] Still flipped after unflip: %d\n", stillFlipped);

    if (stillFlipped == 0) {
      Serial.println("[LDR] All tiles back in starting position.");
      Serial.printf("[DBG] → Sending BOARD_READY\n");
      bleSend("BOARD_READY");
    } else if (stillFlipped == 1) {
      // Multi-tile resolved — re-announce the remaining flipped tile
      for (int j = 0; j < tileCount; j++) {
        if (confirmedState[j]) {
          Serial.printf("[LDR] Multi-tile resolved; re-announcing tile %d.\n", j + 1);
          Serial.printf("[DBG] → Re-sending 'Block changed: %d'\n", j + 1);
          bleSend("Block changed: " + String(j + 1));
          break;
        }
      }
    }
  } else {
    Serial.printf("[DBG] onTileConfirmed: no branch matched! wasFlipped=%d newFlipped=%d — this shouldn't happen.\n",
                  wasFlipped, newFlipped);
  }
}

// ── sensor polling ────────────────────────────────────────────────────────────
// Each pin has its own independent settle timer.
// A change must be stable for SETTLE_MS before it's accepted.

void pollSensors() {
  unsigned long now = millis();

  for (int i = 0; i < tileCount; i++) {
    bool cur = readFlipped(i);

    if (cur == confirmedState[i]) {
      // Back to confirmed state — cancel any pending debounce
      if (hasPending[i]) {
        Serial.printf("[DBG] Tile %d: reading matches confirmed (%s) — debounce cancelled\n",
                      i + 1, cur ? "FLIPPED" : "ready");
      }
      hasPending[i] = false;
    } else {
      if (!hasPending[i]) {
        // First time seeing this change — start settle timer
        hasPending[i]   = true;
        pendingState[i] = cur;
        settleStart[i]  = now;
        Serial.printf("[DBG] Tile %d: change detected → %s (was %s). Starting settle timer (%d ms).\n",
                      i + 1,
                      cur ? "FLIPPED" : "ready",
                      confirmedState[i] ? "FLIPPED" : "ready",
                      SETTLE_MS);
      } else if (cur != pendingState[i]) {
        // Changed again mid-debounce (bounce) — restart timer
        Serial.printf("[DBG] Tile %d: bounced mid-debounce → now %s. Resetting timer.\n",
                      i + 1, cur ? "FLIPPED" : "ready");
        pendingState[i] = cur;
        settleStart[i]  = now;
      } else {
        // Still holding the pending state — log progress every ~200 ms
        unsigned long elapsed = now - settleStart[i];
        if ((elapsed % 200) < 15) {
          Serial.printf("[DBG] Tile %d: settling... %lu / %d ms elapsed\n",
                        i + 1, elapsed, SETTLE_MS);
        }
        if (elapsed >= SETTLE_MS) {
          // Stable long enough — accept
          Serial.printf("[DBG] Tile %d: settled! Confirming → %s\n",
                        i + 1, cur ? "FLIPPED" : "ready");
          hasPending[i] = false;
          onTileConfirmed(i, cur);
        }
      }
    }
  }
}

// ── sensor init ───────────────────────────────────────────────────────────────

void initSensors() {
  Serial.println("[LDR] Sampling initial tile states...");
  for (int i = 0; i < tileCount; i++) {
    confirmedState[i] = readFlipped(i);
    pendingState[i]   = confirmedState[i];
    hasPending[i]     = false;
    settleStart[i]    = 0;
    Serial.printf("  Tile %d (GPIO %d): %s\n",
                  i + 1, LDR_PINS[i],
                  confirmedState[i] ? "FLIPPED" : "ready");
  }
  Serial.println("[LDR] Baseline captured.");
}

// ── serial command handler ────────────────────────────────────────────────────

void handleCommand(String cmd) {
  cmd.trim();
  if (cmd.length() == 0) return;

  if (cmd.startsWith("f") && cmd.length() > 1) {
    int n = cmd.substring(1).toInt();
    if (n < 1 || n > tileCount) { Serial.println("Invalid tile. Range: 1-" + String(tileCount)); return; }
    bleSend("Block changed: " + String(n));
    return;
  }

  if (cmd.startsWith("u") && cmd.length() > 1) {
    int n = cmd.substring(1).toInt();
    if (n < 1 || n > tileCount) { Serial.println("Invalid tile. Range: 1-" + String(tileCount)); return; }
    bleSend("Block unflipped: " + String(n));
    return;
  }

  if (cmd == "r" || cmd == "reset")   { bleSend("RESET");          return; }
  if (cmd == "rdy" || cmd == "ready") { bleSend("BOARD_READY");    return; }
  if (cmd == "nrdy")                  { bleSend("BOARD_NOT_READY"); return; }

  if (cmd == "tiles") {
    Serial.println("Tile count: " + String(tileCount));
    return;
  }

  if (cmd.startsWith("set ")) {
    int n = cmd.substring(4).toInt();
    if (n < 1 || n > 9) { Serial.println("Tile count must be 1-9"); return; }
    tileCount = n;
    Serial.println("Tile count -> " + String(tileCount));
    bleSend("TILE_COUNT:" + String(tileCount));
    return;
  }

  if (cmd.startsWith("raw ")) {
    bleSend(cmd.substring(4));
    return;
  }

  if (cmd == "ldr") {
    Serial.println("── LDR states (raw + confirmed) ──");
    for (int i = 0; i < tileCount; i++) {
      int  rawVal  = digitalRead(LDR_PINS[i]);
      bool flipped = (rawVal == LOW);
      Serial.printf("  Tile %d (GPIO %d): raw=%d → %s | confirmed=%s | hasPending=%s\n",
                    i + 1, LDR_PINS[i],
                    rawVal,
                    flipped ? "FLIPPED (LOW)" : "ready  (HIGH)",
                    confirmedState[i] ? "FLIPPED" : "ready",
                    hasPending[i] ? "YES" : "no");
    }
    return;
  }

  // pins <G1> [G2] ... — remap active GPIOs at runtime, e.g. "pins 4" or "pins 4 5"
  if (cmd.startsWith("pins ")) {
    String args = cmd.substring(5);
    args.trim();
    int newPins[TILE_COUNT];
    int count = 0;

    while (args.length() > 0 && count < TILE_COUNT) {
      int sp = args.indexOf(' ');
      String token = (sp == -1) ? args : args.substring(0, sp);
      token.trim();
      int gpio = token.toInt();
      if (gpio > 0) {
        newPins[count++] = gpio;
      }
      if (sp == -1) break;
      args = args.substring(sp + 1);
      args.trim();
    }

    if (count == 0) {
      Serial.println("Usage: pins <GPIO1> [GPIO2] ...   e.g.  pins 4   or  pins 4 5");
      return;
    }

    // Apply: update pin array, tile count, reconfigure as inputs, re-baseline
    tileCount = count;
    for (int i = 0; i < count; i++) {
      LDR_PINS[i] = newPins[i];
      pinMode(LDR_PINS[i], INPUT);
    }

    Serial.printf("[PINS] Remapped to %d tile(s):", count);
    for (int i = 0; i < count; i++) Serial.printf(" GPIO%d", LDR_PINS[i]);
    Serial.println();

    // Re-baseline so the settle logic starts fresh
    Serial.println("[PINS] Re-capturing baseline...");
    for (int i = 0; i < tileCount; i++) {
      confirmedState[i] = readFlipped(i);
      pendingState[i]   = confirmedState[i];
      hasPending[i]     = false;
      settleStart[i]    = 0;
      Serial.printf("  Tile %d (GPIO %d): %s\n",
                    i + 1, LDR_PINS[i],
                    confirmedState[i] ? "FLIPPED" : "ready");
    }
    Serial.println("[PINS] Done. LDR polling now active on these pins only.");
    bleSend("TILE_COUNT:" + String(tileCount));
    return;
  }

  if (cmd == "help") {
    Serial.println(
      "Commands:\n"
      "  f<N>     flip tile N manually\n"
      "  u<N>     unflip tile N manually\n"
      "  r        board reset\n"
      "  rdy      board ready\n"
      "  nrdy     board not ready\n"
      "  tiles    print tile count\n"
      "  set <N>  set tile count (1-9)\n"
      "  pins <G..>  remap active GPIOs (e.g. pins 4 or pins 4 5)\n"
      "  ldr      print digital sensor states\n"
      "  help     this list"
    );
    return;
  }

  Serial.println("Unknown: \"" + cmd + "\" — type 'help'");
}

// ── setup & loop ──────────────────────────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  delay(800);
  Serial.println("BLE Board — " + String(DEVICE_NAME) + " (" + String(TILE_COUNT) + " tiles)");

  // Configure LDR pins as plain digital inputs.
  // The 10kΩ pull-down resistor handles biasing — no internal pull needed.
  for (int i = 0; i < TILE_COUNT; i++) {
    pinMode(LDR_PINS[i], INPUT);
  }

  // Snapshot baseline before BLE starts — order matters, this must come first.
  initSensors();

  // ── BLE setup ──
  BLEDevice::init(DEVICE_NAME);
  BLEServer *pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  BLEService *pService = pServer->createService(SERVICE_UUID);

  pTxCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID_TX, BLECharacteristic::PROPERTY_NOTIFY);
  pTxCharacteristic->addDescriptor(new BLE2902());

  BLECharacteristic *pRx = pService->createCharacteristic(
    CHARACTERISTIC_UUID_RX, BLECharacteristic::PROPERTY_WRITE);
  pRx->setCallbacks(new RxCallbacks());

  pService->start();

  BLEAdvertising *pAdv = BLEDevice::getAdvertising();
  pAdv->addServiceUUID(SERVICE_UUID);
  pAdv->setScanResponse(true);
  pAdv->setMinPreferred(0x06);
  pAdv->setMaxPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.println("Advertising... waiting for Node.js");
  Serial.println("Type 'help' for commands, 'ldr' to check sensor states.");
}

void loop() {
  // ── heartbeat: every 2 seconds, print raw GPIO reads vs confirmed state ──────
  static unsigned long lastHeartbeat = 0;
  unsigned long now = millis();
  if (now - lastHeartbeat >= 2000) {
    lastHeartbeat = now;
    Serial.printf("[BEAT] t=%lu ms | Active tiles: %d\n", now, tileCount);
    for (int i = 0; i < tileCount; i++) {
      int rawVal    = digitalRead(LDR_PINS[i]);
      bool curRead  = (rawVal == LOW);
      Serial.printf("  Tile %d GPIO %d | raw=%d (%s) | confirmed=%s | hasPending=%s\n",
                    i + 1, LDR_PINS[i],
                    rawVal,
                    curRead ? "FLIPPED" : "ready",
                    confirmedState[i] ? "FLIPPED" : "ready",
                    hasPending[i] ? "YES" : "no");
    }
  }
  // ─────────────────────────────────────────────────────────────────────────────

  pollSensors();

  if (Serial.available()) {
    handleCommand(Serial.readStringUntil('\n'));
  }

  delay(10);
}
