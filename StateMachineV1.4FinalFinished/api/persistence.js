// persistence.js
//
// Stores runtime values that have to remain after restart
// Specifically saves data written by the proram, currently only tile count
// Human editable values are in settings.js
// ============================================================================

const fs = require("fs");
const path = require("path");
const settings = require("./settings");

const runtime_config_path = path.join(__dirname, settings.RUNTIME_CONFIG_FILE);

// defaults applied when no runtime_config.json exists
const runtime_defaults = {
  tile_count: settings.DEFAULT_TILE_COUNT,
};

// in-memory copy, prevents consttant rereading
let runtime_config = load_runtime_config();

function load_runtime_config() {
  try {
    const raw_text = fs.readFileSync(runtime_config_path, "utf-8");
    const parsed = JSON.parse(raw_text);
    // merge with defaults, prevents empty keys
    return { ...runtime_defaults, ...parsed };
  } catch {
    return { ...runtime_defaults };
  }
}

function get_value(key) {
  return runtime_config[key];
}

// update one value and write the whole object to disk
function set_value(key, value) {
  runtime_config[key] = value;
  try {
    fs.writeFileSync(runtime_config_path, JSON.stringify(runtime_config, null, 2));
  } catch (err) {
    console.error("[persistence] Failed to save:", err.message);
  }
}

module.exports = { get_value, set_value };
