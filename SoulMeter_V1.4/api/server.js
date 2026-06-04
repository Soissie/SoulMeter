// server.js
//
// HTTP server and routing. Parses requests and calls game.js or questions.js.
// the HTML pages it serves (frontend.js, admin.js) are
// temporary and meant to be replaced by someone more experienced with webdesign later.
// ============================================================================

const http = require("http");
const fs = require("fs");
const path = require("path");
const game = require("./game");
const settings = require("./settings");
const { TILES, SCREENS, state } = require("./state");
const { update_tiles } = require("./questions");

// admin passcode: settings value, overridable by environment variable
const admin_passcode = process.env.ADMIN_PASS || settings.ADMIN_PASSCODE;

const scores_path = path.join(__dirname, settings.SCORES_FILE);

// helpers

function read_body(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
  });
}

function send_json(res, data, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function send_html(res, body) {
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(body);
}

// write CSV header if missing
function ensure_scores_file() {
  if (!fs.existsSync(scores_path)) {
    fs.writeFileSync(scores_path, "timestamp,name,age,score\n");
  }
}

// append one row
// Name is quoted to avoid breaking the file (with comma)
function save_score({ name, age, score }) {
  ensure_scores_file();
  const timestamp = new Date().toISOString();
  const safe_name = (name || "").replace(/"/g, '""');
  const row = `${timestamp},"${safe_name}",${age || ""},${score}\n`;
  fs.appendFileSync(scores_path, row);
  console.log(`[scores] Saved — ${name || "anonymous"} ${score}%`);
}

// build the snapshot and send to frontend
function build_snapshot() {
  const visible_count = Math.min(state.tile_count, TILES.length);

  const snapshot = {
    screen: state.screen,
    score: state.score,
    tile_count: visible_count,
    played: state.played,
    ble_connected: state.ble_connected,
    board_ready: state.board_ready,
    pause_reason: state.pause_reason,
    last_result: state.last_result,
    flipped_tiles: [...state.flipped_tiles],
  };

  // active question, sent only when question is on screen
  // media is included, so videos and images are isplayed
  if (state.screen === SCREENS.QUESTION && state.active_tile !== null) {
    const tile = TILES[state.active_tile];
    snapshot.active_tile = {
      index: state.active_tile,
      value: tile.value,
      question: tile.question,
      answers: tile.answers,
      media: tile.media || null,
    };
  }

  // tile grid made up of only active tiles
  // Currently useless, good for future modularity updates
  snapshot.tiles = TILES.slice(0, visible_count).map((tile, i) => ({
    index: i,
    value: tile.value,
    played: state.played.includes(i),
    flipped: state.flipped_tiles.has(i),
  }));

  return snapshot;
}

// routing
async function handle_request(req, res) {
  const { url, method } = req;

  // game frontend
  if (method === "GET" && url === "/") {
    const { get_frontend } = require("./frontend");
    return send_html(res, get_frontend());
  }

  // admin panel
  if (method === "GET" && url === "/admin") {
    const { get_admin_panel } = require("./admin");
    return send_html(res, get_admin_panel());
  }

  // state poll. calls this on STATE_POLL_INTERVAL_MS (700 ms by default)
  if (method === "GET" && url === "/state") {
    return send_json(res, build_snapshot());
  }

  // score endpoints

  // post score/submit { name, age, score }, saves score.
  if (method === "POST" && url === "/scores/submit") {
    const body = await read_body(req);
    if (typeof body.score !== "number") {
      return send_json(res, { ok: false, reason: "missing score" }, 400);
    }
    save_score({ name: body.name, age: body.age, score: body.score });
    return send_json(res, { ok: true });
  }

  // GET /scores/download, download the raw file.
  if (method === "GET" && url === "/scores/download") {
    try {
      const data = fs.readFileSync(scores_path);
      res.writeHead(200, {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="scores.csv"',
      });
      return res.end(data);
    } catch {
      return send_json(res, { reason: "no scores yet" }, 404);
    }
  }

  // admin api:

  // GET /admin/questions load questions for the editor
  if (method === "GET" && url.startsWith("/admin/questions")) {
    const params = new URL(url, "http://localhost").searchParams;
    if (params.get("pass") !== admin_passcode) {
      return send_json(res, { reason: "wrong passcode" }, 403);
    }
    return send_json(res, TILES);
  }

  // POST /admin/questions,  saves edited questions
  if (method === "POST" && url === "/admin/questions") {
    const body = await read_body(req);
    if (body.pass !== admin_passcode) {
      return send_json(res, { reason: "wrong passcode" }, 403);
    }
    if (!Array.isArray(body.tiles) || body.tiles.length !== TILES.length) {
      return send_json(res, { reason: `expected array of ${TILES.length} tiles` }, 400);
    }
    update_tiles(body.tiles);
    return send_json(res, { ok: true });
  }

  // game endpoints

  const body = await read_body(req);

  // POST /flip { tile: 0 } simulates tile flip
  if (method === "POST" && url === "/flip") {
    if (typeof body.tile !== "number") {
      return send_json(res, { ok: false, reason: "missing tile" }, 400);
    }
    return send_json(res, game.on_tile_flipped(body.tile));
  }

  // POST /unflip { tile: 0 } Simulates tile unflip
  if (method === "POST" && url === "/unflip") {
    if (typeof body.tile !== "number") {
      return send_json(res, { ok: false, reason: "missing tile" }, 400);
    }
    return send_json(res, game.on_tile_unflipped(body.tile));
  }

  // POST /answer, submits answer
  if (method === "POST" && url === "/answer") {
    if (typeof body.index !== "number") {
      return send_json(res, { ok: false, reason: "missing index" }, 400);
    }
    return send_json(res, game.on_answer(body.index));
  }

  // POST /continue, go from result back to home
  if (method === "POST" && url === "/continue") {
    return send_json(res, game.on_continue());
  }

  // recovery endpoints
  // For admins to recover from issues

  // POST /start, begin a new game
  if (method === "POST" && url === "/start") {
    game.on_start_game();
    return send_json(res, { ok: true });
  }

  // POST /dev/reset, essentially the same as start.
  if (method === "POST" && url === "/dev/reset") {
    game.on_board_reset();
    return send_json(res, { ok: true });
  }

  // POST /dev/ble simulate ble connect/disconnect
  if (method === "POST" && url === "/dev/ble") {
    if (body.connected === true) game.on_ble_connect();
    else game.on_ble_disconnect();
    return send_json(res, { ok: true });
  }

  // POST /dev/tile-count: manually set tiles
  if (method === "POST" && url === "/dev/tile-count") {
    if (typeof body.count !== "number") {
      return send_json(res, { ok: false, reason: "missing count" }, 400);
    }
    game.on_tile_count(body.count);
    return send_json(res, { ok: true });
  }

  res.writeHead(404);
  res.end("not found");
}

function start() {
  const server = http.createServer(handle_request);

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`[server] Port ${settings.SERVER_PORT} already in use.`);
      console.error(`[server] Run this to free it:  sudo fuser -k ${settings.SERVER_PORT}/tcp`);
      console.error("[server] Then start the server again.");
      process.exit(1);
    } else {
      throw err;
    }
  });

  server.listen(settings.SERVER_PORT, () =>
    console.log(`[server] http://${settings.SERVER_HOST}:${settings.SERVER_PORT}`),
  );
}

module.exports = { start };
