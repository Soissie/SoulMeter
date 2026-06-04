// admin.js
// the admin panel html page
// lets admins edit questions, answers, points and media
// protected by a passcode (1234 by default)
//
// html section written with use of Claude.ai
// Acts only as a temporary API
//
// Claude.AI chosen as it is only temporary and html is not an ESE expertise.
//==========================================================================================

function get_admin_panel() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Admin — SoulMeter</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: #06091c;
    color: #f0eee8;
    font-family: 'Segoe UI', sans-serif;
    padding: 30px 20px;
  }

  h1 { color: #f0c040; margin-bottom: 6px; }
  .subtitle { color: #5a6080; font-size: 0.85rem; margin-bottom: 24px; }

  /* lock screen */
  #lock-screen {
    max-width: 360px;
    margin: 80px auto;
    display: flex;
    flex-direction: column;
    gap: 14px;
    align-items: center;
  }
  #lock-screen h2 { color: #f0c040; font-size: 1.6rem; }
  #lock-screen p  { color: #5a6080; font-size: 0.9rem; }

  input[type="password"], input[type="text"], input[type="number"], textarea {
    background: #0d1530;
    border: 2px solid #1e2545;
    border-radius: 8px;
    color: #f0eee8;
    font-size: 1rem;
    padding: 10px 14px;
    width: 100%;
    outline: none;
  }
  input:focus, textarea:focus { border-color: #f0c040; }
  textarea { resize: vertical; min-height: 60px; }

  /* tile cards */
  #editor { max-width: 780px; display: none; }

  .tile-card {
    background: #0d1530;
    border: 2px solid #1e2545;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 16px;
  }
  .tile-card h3 {
    color: #f0c040;
    margin-bottom: 14px;
    font-size: 1rem;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .tile-card h3 span { color: #5a6080; font-weight: 400; font-size: 0.85rem; }

  .field-row {
    display: flex;
    gap: 10px;
    margin-bottom: 10px;
    align-items: center;
  }
  .field-row label { color: #5a6080; font-size: 0.8rem; min-width: 70px; }

  .answers-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 10px;
  }
  .answer-wrap {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .answer-wrap input[type="radio"] { accent-color: #f0c040; width: 16px; flex-shrink: 0; }
  .answer-wrap input[type="text"] { flex: 1; }

  .correct-hint { color: #5a6080; font-size: 0.75rem; margin-bottom: 14px; }

  /* buttons */
  .btn {
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.95rem;
    font-weight: 700;
    padding: 12px 24px;
  }
  .btn-yellow { background: #f0c040; color: #06091c; }
  .btn-yellow:hover { opacity: 0.85; }
  .btn-red    { background: #e0424a; color: #fff; }
  .btn-red:hover { opacity: 0.85; }
  .btn-grey   { background: #1e2545; color: #f0eee8; }
  .btn-grey:hover { background: #2a3260; }

  #top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    flex-wrap: wrap;
    gap: 10px;
  }

  #msg {
    padding: 12px 18px;
    border-radius: 8px;
    margin-bottom: 16px;
    display: none;
    font-size: 0.9rem;
  }
  #msg.ok  { background: #0a2a1a; border: 1px solid #3ecf74; color: #3ecf74; display: block; }
  #msg.err { background: #2a0a0d; border: 1px solid #e0424a; color: #e0424a; display: block; }

  .value-input { width: 80px !important; }
</style>
</head>
<body>

<!-- lock screen shown until correct passcode is entered -->
<div id="lock-screen">
  <h2>🔒 Admin Panel</h2>
  <p>Enter the admin passcode to edit questions</p>
  <input type="password" id="passcode-input" placeholder="Passcode" autocomplete="off">
  <button class="btn btn-yellow" onclick="tryUnlock()">Unlock</button>
  <button class="btn btn-grey" onclick="window.location='/'">Back to game</button>
  <p id="lock-err" style="color:#e0424a; font-size:0.85rem; display:none;">Wrong passcode</p>
</div>

<!-- editor shown after unlock -->
<div id="editor">
  <div id="top-bar">
    <div>
      <h1>Admin Panel</h1>
      <p class="subtitle">Changes are saved to disk and survive server restarts</p>
    </div>
    <div style="display:flex; gap:10px;">
      <button class="btn btn-grey" onclick="window.location='/'">Back to game</button>
      <button class="btn btn-yellow" onclick="saveAll()">Save all changes</button>
    </div>
  </div>

  <div id="msg"></div>
  <div id="tiles-container"></div>
</div>

<script>
let PASS = ''
let tilesData = []

// ── unlock ──────────────────────────────────────────────────────────────────
async function tryUnlock() {
  const input = document.getElementById('passcode-input').value
  // try loading questions with the given passcode
  // if the server accepts it, we're in
  const res = await fetch('/admin/questions?pass=' + encodeURIComponent(input))

  if (res.ok) {
    PASS = input
    tilesData = await res.json()
    document.getElementById('lock-screen').style.display = 'none'
    document.getElementById('editor').style.display = 'block'
    renderEditor()
  } else {
    document.getElementById('lock-err').style.display = 'block'
  }
}

// submit on enter key in the passcode field
document.getElementById('passcode-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') tryUnlock()
})

// ── build the editor UI ──────────────────────────────────────────────────────
function renderEditor() {
  const container = document.getElementById('tiles-container')
  container.innerHTML = ''

  tilesData.forEach((tile, i) => {
    const card = document.createElement('div')
    card.className = 'tile-card'
    card.id = 'tile-' + i

    card.innerHTML = \`
      <h3>Tile \${i + 1} <span>select the correct answer using the radio button</span></h3>

      <div class="field-row">
        <label>Question</label>
        <textarea id="q-\${i}" rows="2">\${esc(tile.question)}</textarea>
      </div>

      <div class="field-row">
        <label>Points</label>
        <input class="value-input" type="number" id="v-\${i}" value="\${tile.value}" min="1" max="100">
      </div>

      <p class="correct-hint">Answers — radio = correct answer</p>
      <div class="answers-grid">
        \${tile.answers.map((ans, j) => \`
          <div class="answer-wrap">
            <input type="radio" name="correct-\${i}" value="\${j}" \${j === tile.correct ? 'checked' : ''}>
            <input type="text" id="a-\${i}-\${j}" value="\${esc(ans)}">
          </div>
        \`).join('')}
      </div>

      <div class="field-row">
        <label>Media</label>
        <input type="text" id="m-\${i}" value="\${esc(tile.media || '')}" placeholder="Image URL, video URL, or YouTube link (leave empty for none)">
      </div>
    \`
    container.appendChild(card)
  })
}

// ── collect values and save ──────────────────────────────────────────────────
async function saveAll() {
  const updated = tilesData.map((_, i) => {
    // find which radio is checked for this tile
    const radios  = document.querySelectorAll(\`input[name="correct-\${i}"]\`)
    let correctIdx = 0
    radios.forEach((r, j) => { if (r.checked) correctIdx = j })

    const mediaVal = document.getElementById('m-' + i).value.trim()
    return {
      value:    parseInt(document.getElementById('v-' + i).value, 10) || 10,
      question: document.getElementById('q-' + i).value.trim(),
      answers:  [0,1,2,3].map(j => document.getElementById(\`a-\${i}-\${j}\`).value.trim()),
      correct:  correctIdx,
      media:    mediaVal || null,
    }
  })

  const res = await fetch('/admin/questions', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ pass: PASS, tiles: updated }),
  })

  const msg = document.getElementById('msg')
  if (res.ok) {
    msg.className = 'ok'
    msg.textContent = '✓ Questions saved successfully'
    tilesData = updated
  } else {
    const err = await res.json().catch(() => ({}))
    msg.className = 'err'
    msg.textContent = '✗ ' + (err.reason || 'Save failed')
  }

  // hide the message after a few seconds
  setTimeout(() => { msg.className = ''; msg.textContent = '' }, 4000)
}

// escape html special chars so question text doesnt break the ui
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
</script>
</body>
</html>`;
}

module.exports = { get_admin_panel };
