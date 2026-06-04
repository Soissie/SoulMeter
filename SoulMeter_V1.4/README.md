# Jeopardy Board — v1.4

Physical Jeopardy board: an ESP32 with 9 LDR/laser tiles and a FastLED strip,
talking over BLE to a Node.js server that runs the game and serves a web UI.

The README itself was made with use of Claude.ai, then edited and reviewed by ESE students.

---

## Folder layout

```
api/          Node.js server (the API)
esp32_board/  ESP32 firmware (Arduino)
```

### Naming convention (both sides)

- Constants: `UPPER_SNAKE_CASE`
- Functions and variables: `snake_case`

This is the standard C / Linux style and is kept identical between the API and
the firmware so the two read the same way.

---

## API (`api/`)

| File | Responsibility |
|------|----------------|
| `settings.js` | **The single edit-me file.** Port, host, admin passcode, scoring rules, tile counts, BLE UUIDs and timings, poll interval, file names, default questions, and the BLE message strings. |
| `persistence.js` | Runtime values the program writes itself (tile count) so they survive a restart. Not for humans to edit. |
| `questions.js` | Loads/saves the question set (`questions.json`), falling back to the defaults in `settings.js`. |
| `state.js` | The live game state and screen names. |
| `game.js` | All game logic and state transitions. No HTTP/BLE specifics. |
| `ble.js` | BLE link to the board (scan, connect, send/receive). |
| `server.js` | HTTP routes; thin layer over `game.js`. |
| `index.js` | Entry point; starts the server and BLE. |
| `frontend.js`, `admin.js` | **Temporary** HTML pages, to be replaced by a web designer. |

### Run

```bash
cd api
npm install
node index.js            # full mode (BLE + HTTP)
node index.js --no-ble   # HTTP only, for testing with curl
```

Open `http://localhost:3000` (player UI) or `/admin` (question editor).

To change anything — port, passcode, BLE name, default questions, timings —
edit `settings.js` only.

---

## ESP firmware (`esp32_board/`)

Open the `esp32_board` folder in the Arduino IDE; all the files compile together
as one sketch.

| File | Responsibility |
|------|----------------|
| `config.h` | **The single edit-me file.** Tile count, GPIO pin map, the 0.8 s settle/rotation time, LED strip layout, BLE identifiers, the wire-protocol strings, and the serial command list. |
| `led_strip.h/.ino` | FastLED strip: turns a score into a colour fill. |
| `ble_comm.h/.ino` | BLE transport (Nordic UART Service). |
| `ldr_sensors.h/.ino` | Sensor polling, debounce/settle, the game-mode state machine and the ready check. |
| `esp32_board.ino` | Top-level wiring: connects the modules and routes messages and serial commands. |

### Game flow

1. Board boots **IDLE** and ignores tile changes.
2. API sends `START_GAME` → board enters **READY_CHECK**.
3. While any active tile is flipped, the board sends `BOARD_NOT_READY`.
4. Once all active tiles are in rest, it sends `BOARD_READY` and switches to **PLAYING**.
5. In **PLAYING**, every flip/unflip is reported. The ready check does not run again until the next `START_GAME`.

The ready check only looks at the active tiles, so `pins 4 5` (2 tiles) checks
just those two.

---

## BLE protocol (shared strings)

Defined in `api/settings.js` and `esp32_board/config.h` — keep them in sync.

| Direction | Message | Meaning |
|-----------|---------|---------|
| ESP → API | `TILE_COUNT:<n>` | number of active tiles |
| ESP → API | `Block changed: <n>` | tile n flipped |
| ESP → API | `Block unflipped: <n>` | tile n returned to rest |
| ESP → API | `BOARD_READY` | all tiles in rest |
| ESP → API | `BOARD_NOT_READY` | a tile is still flipped |
| ESP → API | `RESET` | board reset |
| API → ESP | `SCORE:<n>` | current score (drives the LED strip) |
| API → ESP | `START_GAME` | begin the ready check |
