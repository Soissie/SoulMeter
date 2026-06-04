// frontend.js
//
// Returns the player-facing game UI as HTML string. This page is temporary
// and should be replaced by a web designer.
// Designed with use of Claude.ai, to circumvent lack of HTML experience.
// ============================================================================

const settings = require("./settings");

function get_frontend() {
  const POLL_INTERVAL_MS = settings.STATE_POLL_INTERVAL_MS;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SoulMeter</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: #06091c;
    color: #f0eee8;
    font-family: 'Segoe UI', sans-serif;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
    padding: 24px;
  }

  .screen { display: none; flex-direction: column; align-items: center; gap: 20px; width: 100%; max-width: 580px; }
  .screen.on { display: flex; }

  /* status bar at top - always visible */
  #status-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    max-width: 580px;
    font-size: 0.85rem;
    color: #5a6080;
  }
  .ble-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    display: inline-block;
    margin-right: 5px;
    background: #e0424a;
  }
  .ble-dot.on { background: #3ecf74; }

  h1 { font-size: 3rem; color: #f0c040; letter-spacing: 0.1em; }
  #score-display { font-size: 1.2rem; color: #f0c040; }

  .warning-box {
    background: #1a0d0d;
    border: 2px solid #e0424a;
    border-radius: 10px;
    padding: 14px 20px;
    color: #e0424a;
    text-align: center;
    width: 100%;
    font-size: 0.95rem;
    line-height: 1.5;
  }
  .warning-box.info {
    background: #0d1530;
    border-color: #f0c040;
    color: #f0c040;
  }

  /* tile grid */
  #grid {
    display: grid;
    gap: 10px;
    width: 100%;
  }

  .tile {
    aspect-ratio: 1;
    background: #0d1530;
    border: 2px solid #1e2545;
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }
  .tile .tile-num { font-size: 1.6rem; font-weight: 700; color: #f0c040; }
  .tile .tile-val { font-size: 0.75rem; color: #5a6080; }

  .tile.played { background: #080c1a; border-color: #111525; }
  .tile.played .tile-num { color: #1e2545; }
  .tile.played .tile-val { color: #111525; }

  /* question screen */
  #q-box {
    background: #0d1530;
    border: 2px solid #1e2545;
    border-radius: 12px;
    padding: 28px;
    width: 100%;
    text-align: center;
  }
  #q-meta { color: #c99a20; font-size: 0.85rem; letter-spacing: 0.1em; margin-bottom: 10px; }
  #q-text { font-size: 1.3rem; font-weight: 700; line-height: 1.4; margin-bottom: 16px; }

  /* media box - hidden by default, only shown when tile has media set */
  #q-media {
    width: 100%;
    border-radius: 8px;
    overflow: hidden;
    background: #060910;
    margin-bottom: 16px;
    display: none;
  }
  #q-media img    { width: 100%; max-height: 260px; object-fit: contain; display: block; }
  #q-media video  { width: 100%; max-height: 260px; display: block; }
  #q-media iframe { width: 100%; height: 260px; border: none; display: block; }

  #q-answers { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

  .abtn {
    background: #111830;
    border: 2px solid #1e2545;
    border-radius: 10px;
    color: #f0eee8;
    font-size: 1rem;
    padding: 14px;
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s;
    text-align: center;
  }
  .abtn:hover { background: #1a2240; border-color: #f0c040; }

  /* result screen */
  #r-icon    { font-size: 4rem; }
  #r-verdict { font-size: 2.5rem; font-weight: 800; }
  #r-verdict.yes { color: #3ecf74; }
  #r-verdict.no  { color: #e0424a; }
  #r-delta   { font-size: 1.8rem; color: #f0c040; }
  #r-answer  { color: #5a6080; font-size: 0.9rem; }
  #r-score   { font-size: 1rem; }

  /* game over screen */
  #go-icon  { font-size: 5rem; }
  #go-title { font-size: 2.5rem; font-weight: 800; }
  #go-score { font-size: 1.6rem; color: #f0c040; }
  #go-msg   { color: #5a6080; font-size: 0.95rem; text-align: center; }

  /* score entry form */
  #score-form {
    background: #0d1530;
    border: 2px solid #1e2545;
    border-radius: 12px;
    padding: 24px;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  #score-form h3 { color: #f0c040; font-size: 1rem; }
  #score-form p  { color: #5a6080; font-size: 0.8rem; margin-top: -8px; }
  .form-row { display: flex; gap: 10px; }
  .form-row input {
    background: #06091c;
    border: 2px solid #1e2545;
    border-radius: 8px;
    color: #f0eee8;
    font-size: 1rem;
    padding: 10px 14px;
    flex: 1;
    outline: none;
  }
  .form-row input:focus { border-color: #f0c040; }
  .age-input { max-width: 90px; flex: none !important; }
  #form-msg { font-size: 0.85rem; min-height: 1.2em; }
  #form-msg.ok  { color: #3ecf74; }
  #form-msg.err { color: #e0424a; }

  /* shared buttons */
  .btn-primary {
    background: #f0c040;
    color: #06091c;
    border: none;
    border-radius: 10px;
    font-size: 1.1rem;
    font-weight: 700;
    padding: 14px 32px;
    cursor: pointer;
  }
  .btn-primary:hover { opacity: 0.85; }
  .btn-primary:disabled { opacity: 0.4; cursor: default; }

  /* reset button - smaller, tucked away so players dont press it by accident */
  .btn-reset {
    background: transparent;
    border: 1px solid #2a1010;
    color: #3a1a1a;
    border-radius: 8px;
    font-size: 0.75rem;
    padding: 6px 14px;
    cursor: pointer;
    margin-top: 8px;
  }
  .btn-reset:hover { border-color: #e0424a; color: #e0424a; }

  /* admin link - visible but small so players dont go hunting for it */
  #admin-link {
    position: fixed;
    bottom: 12px;
    right: 14px;
    font-size: 0.75rem;
    color: #3a4470;
    text-decoration: none;
    letter-spacing: 0.05em;
  }
  #admin-link:hover { color: #f0c040; }
</style>
</head>
<body>

<!-- status bar -->
<div id="status-bar">
  <span>
    <span class="ble-dot" id="ble-dot"></span>
    <span id="ble-label">Board disconnected</span>
  </span>
  <span id="sb-score">Score: 100%</span>
</div>

<!-- home / paused screen -->
<div id="screen-home" class="screen">
  <h1>SoulMeter</h1>
  <div id="score-display">Score: 100%</div>
  <div id="home-warnings"></div>
  <div id="grid"></div>
  <button class="btn-reset" onclick="confirmReset()">Reset game</button>
</div>

<!-- question screen -->
<div id="screen-question" class="screen">
  <div id="q-box">
    <div id="q-meta"></div>
    <div id="q-text"></div>
    <div id="q-media"></div>
    <div id="q-answers"></div>
  </div>
  <button class="btn-reset" onclick="confirmReset()">Reset game</button>
</div>

<!-- result screen -->
<div id="screen-result" class="screen">
  <div id="r-icon"></div>
  <div id="r-verdict"></div>
  <div id="r-delta"></div>
  <div id="r-answer"></div>
  <div id="r-score"></div>
  <button class="btn-primary" id="continue-btn">CONTINUE</button>
  <button class="btn-reset" onclick="confirmReset()">Reset game</button>
</div>

<!-- game over screen -->
<div id="screen-gameover" class="screen">
  <div id="go-icon"></div>
  <div id="go-title"></div>
  <div id="go-score"></div>
  <div id="go-msg"></div>

  <div id="score-form">
    <h3>Save your score</h3>
    <p>Both fields optional — press Save to skip</p>
    <div class="form-row">
      <input type="text"   id="player-name" placeholder="Your name (optional)" maxlength="60" autocomplete="off">
      <input type="number" id="player-age"  placeholder="Age" min="1" max="120" class="age-input">
    </div>
    <div id="form-msg"></div>
    <button class="btn-primary" id="save-btn" onclick="submitScore()">Save score</button>
  </div>

  <button class="btn-primary" id="play-again-btn" style="display:none" onclick="confirmReset()">Play again</button>
</div>

<!-- hidden admin link for operators -->
<a href="/admin" id="admin-link">admin</a>

<script>
// ── state ──────────────────────────────────────────────────────────────────
// stores the final score so submitScore() can read it without needing a param
var finalScore    = 100
var lastMediaUrl  = null  // track last rendered media so we dont rebuild the iframe every 700ms
var lastScreen    = null  // track previous screen so we know when gameover is entered fresh

// ── api helpers ────────────────────────────────────────────────────────────
async function getState() {
  try {
    const r = await fetch('/state')
    return r.json()
  } catch (e) { return null }
}

async function post(url, body) {
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    })
  } catch (e) { /* server might be restarting */ }
}

// ── screen switching ───────────────────────────────────────────────────────
function showOnly(id) {
  document.querySelectorAll('.screen').forEach(function(el) { el.classList.remove('on') })
  var el = document.getElementById(id)
  if (el) el.classList.add('on')
}

// ── reset ──────────────────────────────────────────────────────────────────
// reset the score form back to its initial state
// called whenever gameover is entered fresh (new game ended)
function resetScoreForm() {
  document.getElementById('score-form').style.display      = 'flex'
  document.getElementById('play-again-btn').style.display  = 'none'
  document.getElementById('player-name').value  = ''
  document.getElementById('player-age').value   = ''
  document.getElementById('form-msg').textContent = ''
  document.getElementById('form-msg').className   = ''
  document.getElementById('save-btn').disabled    = false
}

async function confirmReset() {
  if (confirm('Reset the game? This will clear all progress.')) {
    await post('/dev/reset')
  }
}

// ── score submit ───────────────────────────────────────────────────────────
async function submitScore() {
  var name    = document.getElementById('player-name').value.trim()
  var ageRaw  = document.getElementById('player-age').value.trim()
  var age     = ageRaw ? parseInt(ageRaw, 10) : null
  var saveBtn = document.getElementById('save-btn')
  saveBtn.disabled = true

  try {
    var resp = await fetch('/scores/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name || null, age: age, score: finalScore })
    })
    var data = await resp.json()
    var msg  = document.getElementById('form-msg')

    if (data && data.ok) {
      msg.className   = 'ok'
      msg.textContent = 'Score saved!'
      setTimeout(function() {
        document.getElementById('score-form').style.display     = 'none'
        document.getElementById('play-again-btn').style.display = 'block'
      }, 1000)
    } else {
      msg.className    = 'err'
      msg.textContent  = 'Could not save, try again'
      saveBtn.disabled = false
    }
  } catch (e) {
    var msg = document.getElementById('form-msg')
    msg.className    = 'err'
    msg.textContent  = 'Could not save, try again'
    saveBtn.disabled = false
  }
}

// ── media renderer ─────────────────────────────────────────────────────────
// shows an image, video or youtube embed inside #q-media
// hides the box completely if url is null or empty
// NOTE: no regex used here to avoid backslash escaping issues in the template
function renderMedia(url) {
  var box = document.getElementById('q-media')
  box.innerHTML     = ''
  box.style.display = 'none'
  if (!url) return

  var lower = url.toLowerCase()
  var el

  if (lower.indexOf('youtube.com') !== -1 || lower.indexOf('youtu.be') !== -1) {
    // extract youtube video id without using regex
    // handles: ?v=ID  |  youtu.be/ID  |  /embed/ID
    var vid = ''
    var vIdx = url.indexOf('?v=')
    if (vIdx === -1) vIdx = url.indexOf('&v=')
    if (vIdx !== -1) {
      vid = url.substring(vIdx + 3).split('&')[0]
    } else {
      var beIdx = url.indexOf('youtu.be/')
      if (beIdx !== -1) {
        vid = url.substring(beIdx + 9).split('?')[0]
      } else {
        var emIdx = url.indexOf('/embed/')
        if (emIdx !== -1) {
          vid = url.substring(emIdx + 7).split('?')[0]
        }
      }
    }
    if (!vid) return
    el = document.createElement('iframe')
    el.src = 'https://www.youtube.com/embed/' + vid
    el.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
    el.allowFullscreen = true

  } else if (lower.indexOf('.mp4') !== -1 || lower.indexOf('.webm') !== -1 || lower.indexOf('.ogg') !== -1) {
    el = document.createElement('video')
    el.src      = url
    el.controls = true
    el.preload  = 'metadata'

  } else {
    // assume image for anything else
    el = document.createElement('img')
    el.src = url
    el.alt = ''
    el.onerror = function() { box.style.display = 'none' }
  }

  box.appendChild(el)
  box.style.display = 'block'
}

// ── renderers ─────────────────────────────────────────────────────────────

function renderStatusBar(s) {
  var dot   = document.getElementById('ble-dot')
  var label = document.getElementById('ble-label')

  if (s.ble_connected) {
    dot.className     = 'ble-dot on'
    label.textContent = 'Board connected'
  } else {
    dot.className     = 'ble-dot'
    label.textContent = 'Board disconnected'
  }

  document.getElementById('sb-score').textContent = 'Score: ' + s.score + '%'
}

function renderHome(s) {
  lastMediaUrl = null  // reset so next question rerenders its media

  document.getElementById('score-display').textContent = 'Score: ' + s.score + '%'

  var warnEl = document.getElementById('home-warnings')
  warnEl.innerHTML = ''

  if (!s.ble_connected) {
    warnEl.innerHTML += '<div class="warning-box">soulmeter board not connected.<br>Waiting for <b>ESP32-Jeopardy</b>...</div>'
  }
  if (s.ble_connected && !s.board_ready) {
    warnEl.innerHTML += '<div class="warning-box info">Waiting for board — make sure all tiles are in the start position.</div>'
  }
  if (s.screen === 'PAUSED' && s.pause_reason) {
    warnEl.innerHTML += '<div class="warning-box">' + s.pause_reason + '</div>'
  }

  // build the grid
  // grid columns depend on tile count - 3 columns for 9 tiles, 2 for 4 etc
  var grid = document.getElementById('grid')
  grid.innerHTML = ''

  // figure out columns: 3 for 6-9 tiles, 2 for 4-5, 1 for 1-3
  var cols = s.tile_count >= 6 ? 3 : s.tile_count >= 4 ? 2 : 1
  grid.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)'

  s.tiles.forEach(function(tile) {
    var el = document.createElement('div')
    el.className = 'tile' + (tile.played ? ' played' : '')

    var numEl = document.createElement('div')
    numEl.className   = 'tile-num'
    numEl.textContent = tile.played ? '\u2713' : (tile.index + 1)

    var valEl = document.createElement('div')
    valEl.className   = 'tile-val'
    valEl.textContent = tile.value + '%'

    el.appendChild(numEl)
    el.appendChild(valEl)
    grid.appendChild(el)
  })

  showOnly('screen-home')
}

function renderQuestion(s) {
  if (!s.active_tile) return
  var t = s.active_tile

  document.getElementById('q-meta').textContent = 'Tile ' + (t.index + 1) + '  \u00b7  ' + t.value + '% at stake'
  document.getElementById('q-text').textContent  = t.question

  // only rebuild the media element if the url changed
  // rebuilding every 700ms causes iframes to reload and videos to flicker
  if (t.media !== lastMediaUrl) {
    lastMediaUrl = t.media
    renderMedia(t.media)
  }

  var ab = document.getElementById('q-answers')
  ab.innerHTML = ''
  t.answers.forEach(function(ans, i) {
    var btn = document.createElement('button')
    btn.className   = 'abtn'
    btn.textContent = ans
    btn.onclick     = function() { post('/answer', { index: i }) }
    ab.appendChild(btn)
  })

  showOnly('screen-question')
}

function renderResult(s) {
  var r = s.last_result
  if (!r) return

  document.getElementById('r-icon').textContent = r.correct ? '\uD83C\uDF89' : '\u274C'

  var verdict = document.getElementById('r-verdict')
  verdict.textContent = r.correct ? 'CORRECT!' : 'WRONG'
  verdict.className   = r.correct ? 'yes' : 'no'

  document.getElementById('r-delta').textContent  = (r.delta >= 0 ? '+' : '') + r.delta + '%'
  document.getElementById('r-answer').textContent = r.correct ? '' : 'Correct answer: ' + r.correct_answer
  document.getElementById('r-score').textContent  = 'Score: ' + r.new_score + '%'

  document.getElementById('continue-btn').onclick = function() { post('/continue') }

  showOnly('screen-result')
}

function renderGameOver(s) {
  finalScore = s.score

  // only reset the form when we first arrive at gameover
  // if we were already here (lastScreen === 'GAMEOVER') leave it as-is
  // so a saved score stays saved and the play-again button stays visible
  if (lastScreen !== 'GAMEOVER') {
    resetScoreForm()
  }

  var won = s.score > 0
  document.getElementById('go-icon').textContent  = won ? '\uD83C\uDFC6' : '\uD83D\uDC80'
  document.getElementById('go-title').textContent = won ? 'YOU WIN!' : 'GAME OVER'
  document.getElementById('go-score').textContent = 'Final score: ' + s.score + '%'
  document.getElementById('go-msg').textContent   = won
    ? 'You answered all questions and stayed above 0%!'
    : 'Your score dropped to 0%. Better luck next time!'

  showOnly('screen-gameover')
}

// ── main refresh loop ──────────────────────────────────────────────────────
async function refresh() {
  var s = await getState()
  if (!s) return

  renderStatusBar(s)

  if (s.screen === 'HOME' || s.screen === 'PAUSED') {
    renderHome(s)
  } else if (s.screen === 'QUESTION') {
    renderQuestion(s)
  } else if (s.screen === 'RESULT') {
    renderResult(s)
  } else if (s.screen === 'GAMEOVER') {
    renderGameOver(s)
  }

  lastScreen = s.screen
}

setInterval(refresh, ${POLL_INTERVAL_MS})
refresh()
</script>
</body>
</html>`;
}

module.exports = { get_frontend };
