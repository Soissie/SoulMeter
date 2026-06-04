const http = require("http");

// ── state ──────────────────────────────────────────────────────────────────
const STATES = { HOME: "HOME", QUESTION: "QUESTION", RESULT: "RESULT" };

const tiles = [
  {
    question: "What is the capital of France?",
    answers: ["Berlin", "Paris", "Madrid", "Rome"],
    correct: 1,
    points: 100,
  },
  {
    question: "What is 2 + 2?",
    answers: ["3", "4", "5", "6"],
    correct: 1,
    points: 200,
  },
  {
    question: "Who wrote Hamlet?",
    answers: ["Dickens", "Tolstoy", "Shakespeare", "Austen"],
    correct: 2,
    points: 300,
  },
  {
    question: "How many continents are there?",
    answers: ["5", "6", "7", "8"],
    correct: 2,
    points: 100,
  },
  {
    question: "What is H2O?",
    answers: ["Oxygen", "Hydrogen", "Water", "CO2"],
    correct: 2,
    points: 100,
  },
  {
    question: "What year did WW2 end?",
    answers: ["1943", "1944", "1945", "1946"],
    correct: 2,
    points: 500,
  },
  {
    question: "What planet is closest to Sun?",
    answers: ["Venus", "Earth", "Mars", "Mercury"],
    correct: 3,
    points: 200,
  },
  {
    question: "How many sides has a hexagon?",
    answers: ["5", "6", "7", "8"],
    correct: 1,
    points: 100,
  },
  {
    question: "What is the speed of light?",
    answers: ["300k km/s", "150k km/s", "1M km/s", "30k km/s"],
    correct: 0,
    points: 400,
  },
];

let state = {
  current: STATES.HOME,
  activeTile: null,
  score: 0,
  flipped: [],
  lastResult: null,
};

function flipTile(i) {
  if (state.current !== STATES.HOME)
    return { ok: false, reason: "not on home screen" };
  if (state.flipped.includes(i)) return { ok: false, reason: "already played" };
  state.flipped.push(i);
  state.current = STATES.QUESTION;
  state.activeTile = i;
  console.log(`[state] HOME -> QUESTION (tile ${i})`);
  return { ok: true };
}

function answer(i) {
  if (state.current !== STATES.QUESTION) return { ok: false };
  const tile = tiles[state.activeTile];
  const right = i === tile.correct;
  const delta = right ? tile.points : -tile.points;
  state.score += delta;
  state.lastResult = {
    correct: right,
    delta,
    score: state.score,
    correctAnswer: tile.answers[tile.correct],
  };
  state.current = STATES.RESULT;
  console.log(
    `[state] QUESTION -> RESULT (${right ? "correct" : "wrong"}, ${delta > 0 ? "+" : ""}${delta})`,
  );
  return { ok: true };
}

function next() {
  if (state.current !== STATES.RESULT) return { ok: false };
  state.current = STATES.HOME;
  state.activeTile = null;
  state.lastResult = null;
  console.log("[state] RESULT -> HOME");
  return { ok: true };
}

// ── server ─────────────────────────────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve) => {
    let d = "";
    req.on("data", (c) => (d += c));
    req.on("end", () => {
      try {
        resolve(JSON.parse(d));
      } catch {
        resolve({});
      }
    });
  });
}

function json(res, data) {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const { url, method } = req;

  if (method === "GET" && url === "/") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(html);
    return;
  }

  if (method === "GET" && url === "/state") {
    const snap = { ...state, tiles: tiles.length };
    if (state.current === STATES.QUESTION) {
      const t = tiles[state.activeTile];
      snap.tile = {
        question: t.question,
        answers: t.answers,
        points: t.points,
      };
    }
    return json(res, snap);
  }

  const body = await readBody(req);

  if (method === "POST" && url === "/flip")
    return json(res, flipTile(body.tile));
  if (method === "POST" && url === "/answer")
    return json(res, answer(body.index));
  if (method === "POST" && url === "/next") return json(res, next());

  res.writeHead(404);
  res.end("not found");
});

server.listen(3000, () => console.log("http://localhost:3000"));

// ── frontend ───────────────────────────────────────────────────────────────
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Jeopardy</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #06091c; color: #f0eee8; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 24px; padding: 24px; }
  h1 { font-size: 3rem; color: #f0c040; letter-spacing: 0.1em; }
  .screen { display: none; flex-direction: column; align-items: center; gap: 20px; width: 100%; max-width: 560px; }
  .screen.on { display: flex; }
  #score { font-size: 1.1rem; color: #f0c040; }

  /* grid */
  #grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; width: 100%; }
  .tile { aspect-ratio: 1; background: #0d1530; border: 2px solid #1e2545; border-radius: 10px; font-size: 1.5rem; color: #f0c040; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .2s; }
  .tile:hover { background: #1a2240; }
  .tile.played { background: #080c1a; border-color: #111525; color: #333; cursor: default; }

  /* question */
  #q-box { background: #0d1530; border: 2px solid #1e2545; border-radius: 10px; padding: 28px; width: 100%; text-align: center; }
  #q-points { color: #c99a20; font-size: .9rem; letter-spacing: .1em; margin-bottom: 12px; }
  #q-text { font-size: 1.3rem; font-weight: 700; margin-bottom: 24px; line-height: 1.4; }
  #q-answers { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .abtn { background: #111830; border: 2px solid #1e2545; border-radius: 10px; color: #f0eee8; font-size: 1rem; padding: 14px; cursor: pointer; transition: background .2s; }
  .abtn:hover { background: #1a2240; border-color: #f0c040; }

  /* result */
  #r-icon { font-size: 4rem; }
  #r-verdict { font-size: 2.5rem; font-weight: 800; }
  #r-verdict.yes { color: #3ecf74; } #r-verdict.no { color: #e0424a; }
  #r-delta { font-size: 1.8rem; color: #f0c040; }
  #r-answer { color: #5a6080; font-size: .9rem; }

  button.next { background: #f0c040; color: #06091c; border: none; border-radius: 10px; font-size: 1.1rem; font-weight: 700; padding: 14px 32px; cursor: pointer; }
  button.next:hover { opacity: .85; }
</style>
</head>
<body>

<div id="home" class="screen">
  <h1>JEOPARDY</h1>
  <div id="score">Score: 0</div>
  <div id="grid"></div>
</div>

<div id="question" class="screen">
  <div id="q-box">
    <div id="q-points"></div>
    <div id="q-text"></div>
    <div id="q-answers"></div>
  </div>
</div>

<div id="result" class="screen">
  <div id="r-icon"></div>
  <div id="r-verdict"></div>
  <div id="r-delta"></div>
  <div id="r-answer"></div>
  <button class="next" onclick="post('/next')">CONTINUE</button>
</div>

<script>
  async function get()           { return (await fetch('/state')).json(); }
  async function post(url, body) { await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body||{}) }); refresh(); }

  async function refresh() {
    const s = await get();
    document.getElementById('score').textContent = 'Score: ' + s.score;
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('on'));

    if (s.current === 'HOME') {
      const grid = document.getElementById('grid');
      grid.innerHTML = '';
      for (let i = 0; i < s.tiles; i++) {
        const d = document.createElement('div');
        d.className = 'tile' + (s.flipped.includes(i) ? ' played' : '');
        d.textContent = s.flipped.includes(i) ? '✓' : i + 1;
        if (!s.flipped.includes(i)) d.onclick = () => post('/flip', { tile: i });
        grid.appendChild(d);
      }
      document.getElementById('home').classList.add('on');
    }

    if (s.current === 'QUESTION') {
      document.getElementById('q-points').textContent = 'TILE ' + (s.activeTile + 1);
      document.getElementById('q-text').textContent   = s.lastResult; // placeholder, state doesnt carry tile text
      // re-fetch so we get the tile data
      const full = s;
      document.getElementById('question').classList.add('on');
      // fetch tile data from state (activeTile index)
      buildQuestion(s);
    }

    if (s.current === 'RESULT') {
      const r = s.lastResult;
      document.getElementById('r-icon').textContent    = r.correct ? '🎉' : '❌';
      const v = document.getElementById('r-verdict');
      v.textContent = r.correct ? 'CORRECT!' : 'WRONG';
      v.className   = r.correct ? 'yes' : 'no';
      document.getElementById('r-delta').textContent  = (r.delta >= 0 ? '+' : '') + r.delta + ' pts';
      document.getElementById('r-answer').textContent = r.correct ? '' : 'Answer: ' + r.correctAnswer;
      document.getElementById('result').classList.add('on');
    }
  }

  async function buildQuestion(s) {
    // fetch the full state again which includes tile data via /state
    // the server embeds tile info when current === QUESTION
    const res = await (await fetch('/state')).json();
    if (!res.tile) return;
    document.getElementById('q-points').textContent = res.tile.points + ' POINTS';
    document.getElementById('q-text').textContent   = res.tile.question;
    const ab = document.getElementById('q-answers');
    ab.innerHTML = '';
    res.tile.answers.forEach((a, i) => {
      const b = document.createElement('button');
      b.className   = 'abtn';
      b.textContent = a;
      b.onclick     = () => post('/answer', { index: i });
      ab.appendChild(b);
    });
  }

  setInterval(refresh, 800);
  refresh();
</script>
</body>
</html>`;
