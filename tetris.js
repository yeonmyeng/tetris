document.addEventListener("DOMContentLoaded", () => {
  const COLS = 10;
  const ROWS = 20;
  const BLOCK = 30;

  const COLORS = {
    0: "#111827",
    I: "#38bdf8",
    O: "#fbbf24",
    T: "#a78bfa",
    S: "#34d399",
    Z: "#fb7185",
    J: "#60a5fa",
    L: "#f97316",
    G: "rgba(255,255,255,0.18)"
  };

  const SHAPES = {
    I: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    O: [
      [1, 1],
      [1, 1],
    ],
    T: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    S: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    Z: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    J: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    L: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
  };

  const TYPES = Object.keys(SHAPES);

  const boardCanvas = document.getElementById("board");
  const ctx = boardCanvas.getContext("2d");

  const next1Canvas = document.getElementById("next1");
  const next2Canvas = document.getElementById("next2");
  const next3Canvas = document.getElementById("next3");
  const next1Ctx = next1Canvas.getContext("2d");
  const next2Ctx = next2Canvas.getContext("2d");
  const next3Ctx = next3Canvas.getContext("2d");

  const holdCanvas = document.getElementById("hold");
  const holdCtx = holdCanvas.getContext("2d");

  const scoreEl = document.getElementById("score");
  const bestScoreEl = document.getElementById("bestScore");
  const linesEl = document.getElementById("lines");
  const levelEl = document.getElementById("level");
  const statusEl = document.getElementById("status");
  const comboText = document.getElementById("comboText");

  const nextHint = document.getElementById("nextHint");
  const holdHint = document.getElementById("holdHint");

  const startBtn = document.getElementById("startBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const resetBtn = document.getElementById("resetBtn");
  const restartBtn = document.getElementById("restartBtn");
  const diffSel = document.getElementById("difficulty");

  const floatingMessage = document.getElementById("floatingMessage");
  const gameOverScreen = document.getElementById("gameOverScreen");
  const finalScore = document.getElementById("finalScore");
  const finalBestScore = document.getElementById("finalBestScore");

  boardCanvas.width = COLS * BLOCK;
  boardCanvas.height = ROWS * BLOCK;

  function getDifficulty() {
    const v = diffSel.value || "normal";

    if (v === "hard") {
      return {
        name: "어려움",
        base: 600,
        step: 75,
        min: 60,
        lockDelayMs: 220,
        garbageEveryMs: 18000,
        garbageMinHoles: 1,
        garbageMaxHoles: 2,
        showNext: true,
        holdEnabled: true,
        hideGhost: false,
      };
    }

    if (v === "insane") {
      return {
        name: "지옥",
        base: 520,
        step: 95,
        min: 40,
        lockDelayMs: 120,
        garbageEveryMs: 10000,
        garbageMinHoles: 1,
        garbageMaxHoles: 1,
        showNext: false,
        holdEnabled: false,
        hideGhost: true,
      };
    }

    return {
      name: "보통",
      base: 700,
      step: 60,
      min: 80,
      lockDelayMs: 350,
      garbageEveryMs: 0,
      garbageMinHoles: 0,
      garbageMaxHoles: 0,
      showNext: true,
      holdEnabled: true,
      hideGhost: false,
    };
  }

  let grid = makeGrid();
  let running = false;
  let paused = false;

  let score = 0;
  let lines = 0;
  let level = 1;
  let lastLevel = 1;
  let combo = 0;

  let current = null;
  let hold = null;
  let canHold = true;

  let lastTime = 0;
  let dropCounter = 0;
  let groundedMs = 0;
  let garbageCounter = 0;

  let clearFlashRows = [];
  let bestScore = Number(localStorage.getItem("bestScore") || 0);

  let bag = [];
  let nextQueue = [];

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function refillBagIfNeeded() {
    if (bag.length === 0) {
      bag = shuffle([...TYPES]);
    }
  }

  function drawFromBag() {
    refillBagIfNeeded();
    const type = bag.pop();
    return spawnPiece(type);
  }

  function initNextQueue() {
    nextQueue = [];
    while (nextQueue.length < 3) {
      nextQueue.push(drawFromBag());
    }
  }

  function getNextPiece() {
    const piece = nextQueue.shift();
    nextQueue.push(drawFromBag());
    return piece;
  }

  function makeGrid() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  }

  function spawnPiece(type) {
    const shape = SHAPES[type].map(r => r.slice());
    return {
      type,
      shape,
      x: Math.floor((COLS - shape[0].length) / 2),
      y: -1
    };
  }

  function rotate(matrix) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const res = Array.from({ length: cols }, () => Array(rows).fill(0));

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        res[x][rows - 1 - y] = matrix[y][x];
      }
    }
    return res;
  }

  function collide(piece, g) {
    const { shape, x: px, y: py } = piece;
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (!shape[y][x]) continue;
        const gx = px + x;
        const gy = py + y;

        if (gx < 0 || gx >= COLS || gy >= ROWS) return true;
        if (gy >= 0 && g[gy][gx] !== 0) return true;
      }
    }
    return false;
  }

  function merge(piece) {
    const { shape, x: px, y: py, type } = piece;
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (!shape[y][x]) continue;
        const gx = px + x;
        const gy = py + y;
        if (gy >= 0) grid[gy][gx] = type;
      }
    }
  }

  function setStatus(text, mode = "") {
    statusEl.textContent = text;
    statusEl.classList.remove("status-strong", "status-danger");
    if (mode === "strong") statusEl.classList.add("status-strong");
    if (mode === "danger") statusEl.classList.add("status-danger");
  }

  function showFloatingMessage(text, duration = 900) {
    floatingMessage.textContent = text;
    floatingMessage.classList.add("show");
    clearTimeout(showFloatingMessage.timer);
    showFloatingMessage.timer = setTimeout(() => {
      floatingMessage.classList.remove("show");
    }, duration);
  }

  function updateHud() {
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem("bestScore", String(bestScore));
    }

    scoreEl.textContent = String(score);
    bestScoreEl.textContent = String(bestScore);
    linesEl.textContent = String(lines);
    levelEl.textContent = String(level);
    comboText.textContent = combo >= 2 ? `콤보 x${combo}` : "";
  }

  function dropInterval() {
    const d = getDifficulty();
    return Math.max(d.min, d.base - (level - 1) * d.step);
  }

  function randInt(a, b) {
    if (a > b) [a, b] = [b, a];
    return a + Math.floor(Math.random() * (b - a + 1));
  }

  function screenShake() {
    boardCanvas.style.transform = "translate(4px, 0)";
    setTimeout(() => {
      boardCanvas.style.transform = "translate(-4px, 0)";
    }, 40);
    setTimeout(() => {
      boardCanvas.style.transform = "translate(0, 0)";
    }, 80);
  }

  function triggerLineFlash(rows) {
    clearFlashRows = [...rows];
    setTimeout(() => {
      clearFlashRows = [];
    }, 90);
  }

  function addGarbageLines(count) {
    const d = getDifficulty();

    for (let i = 0; i < count; i++) {
      const holes = randInt(d.garbageMinHoles, d.garbageMaxHoles);
      const holeSet = new Set();

      while (holeSet.size < holes) {
        holeSet.add(Math.floor(Math.random() * COLS));
      }

      grid.shift();
      const row = Array.from({ length: COLS }, (_, x) => (holeSet.has(x) ? 0 : "J"));
      grid.push(row);

      if (current) current.y = Math.max(-2, current.y - 1);
    }
  }

  function ghostY(piece) {
    let y = piece.y;
    while (!collide({ ...piece, y: y + 1 }, grid)) {
      y++;
    }
    return y;
  }

  function clearLines() {
    let cleared = 0;
    const clearedRows = [];

    outer: for (let y = ROWS - 1; y >= 0; y--) {
      for (let x = 0; x < COLS; x++) {
        if (grid[y][x] === 0) continue outer;
      }
      clearedRows.push(y);
      grid.splice(y, 1);
      grid.unshift(Array(COLS).fill(0));
      cleared++;
      y++;
    }

    if (cleared > 0) {
      triggerLineFlash(clearedRows);
      screenShake();

      lines += cleared;
      const base = [0, 100, 300, 500, 800][cleared] ?? (cleared * 200);
      score += base * level;

      combo += 1;
      if (combo >= 2) {
        score += combo * 50;
        showFloatingMessage(`COMBO x${combo}`);
      }

      if (cleared === 4) {
        showFloatingMessage("TETRIS!");
      }

      level = Math.floor(lines / 10) + 1;
      if (level > lastLevel) {
        lastLevel = level;
        setStatus(`레벨 업! Lv.${level}`, "strong");
        showFloatingMessage(`LEVEL UP! Lv.${level}`, 1200);
      }

      updateHud();
    } else {
      combo = 0;
      updateHud();
    }
  }

  function move(dx) {
    if (!current) return;
    const test = { ...current, x: current.x + dx };
    if (!collide(test, grid)) {
      current.x += dx;
      groundedMs = 0;
    }
  }

  function tryRotate() {
    if (!current) return;

    const rotated = rotate(current.shape);
    const kicks = [0, -1, 1, -2, 2];

    for (const k of kicks) {
      const test = { ...current, shape: rotated, x: current.x + k };
      if (!collide(test, grid)) {
        current.shape = rotated;
        current.x += k;
        groundedMs = 0;
        return;
      }
    }
  }

  function softDrop() {
    if (!current) return;

    const test = { ...current, y: current.y + 1 };
    if (!collide(test, grid)) {
      current.y++;
      groundedMs = 0;
      score += 1;
      updateHud();
    }
  }

  function hardDrop() {
    if (!current) return;

    while (!collide({ ...current, y: current.y + 1 }, grid)) {
      current.y++;
      score += 1;
    }

    lockPiece();
    updateHud();
  }

  function holdPiece() {
    const d = getDifficulty();
    if (!d.holdEnabled || !current || !canHold) return;

    canHold = false;

    if (!hold) {
      hold = spawnPiece(current.type);
      current = getNextPiece();
    } else {
      const tmp = hold.type;
      hold = spawnPiece(current.type);
      current = spawnPiece(tmp);
    }

    groundedMs = 0;
  }

  function lockPiece() {
    merge(current);
    clearLines();

    current = getNextPiece();
    canHold = true;
    groundedMs = 0;

    if (collide(current, grid)) {
      running = false;
      paused = false;
      setStatus("게임오버", "danger");
      finalScore.textContent = String(score);
      finalBestScore.textContent = String(bestScore);
      gameOverScreen.classList.add("show");
    }
  }

  function drawCell(context, x, y, color) {
    context.fillStyle = color;
    context.fillRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);
    context.strokeStyle = "rgba(0,0,0,0.25)";
    context.strokeRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);
  }

  function drawGrid() {
    ctx.clearRect(0, 0, boardCanvas.width, boardCanvas.height);

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const v = grid[y][x];
        drawCell(ctx, x, y, v === 0 ? COLORS[0] : COLORS[v]);
      }
    }

    if (clearFlashRows.length > 0) {
      for (const row of clearFlashRows) {
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.fillRect(0, row * BLOCK, COLS * BLOCK, BLOCK);
      }
    }
  }

  function drawPiece(context, piece, ghost = false) {
    const { shape, x: px, y: py, type } = piece;

    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (!shape[y][x]) continue;
        const gx = px + x;
        const gy = py + y;
        if (gy < 0) continue;
        drawCell(context, gx, gy, ghost ? COLORS.G : COLORS[type]);
      }
    }
  }

  function drawMini(context, piece) {
    context.clearRect(0, 0, 120, 120);
    if (!piece) return;

    const shape = piece.shape;
    const s = 24;
    const offsetX = Math.floor((5 - shape[0].length) / 2);
    const offsetY = Math.floor((5 - shape.length) / 2);

    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (!shape[y][x]) continue;
        context.fillStyle = COLORS[piece.type];
        context.fillRect((x + offsetX) * s, (y + offsetY) * s, s, s);
        context.strokeStyle = "rgba(0,0,0,0.25)";
        context.strokeRect((x + offsetX) * s, (y + offsetY) * s, s, s);
      }
    }
  }

  function renderNextQueue() {
    const d = getDifficulty();

    if (!d.showNext) {
      next1Ctx.clearRect(0, 0, 120, 120);
      next2Ctx.clearRect(0, 0, 120, 120);
      next3Ctx.clearRect(0, 0, 120, 120);
      nextHint.textContent = "지옥 난이도 : 다음 블록 숨김";
      return;
    }

    drawMini(next1Ctx, nextQueue[0]);
    drawMini(next2Ctx, nextQueue[1]);
    drawMini(next3Ctx, nextQueue[2]);
    nextHint.textContent = "";
  }

  function renderHold() {
    const d = getDifficulty();

    if (!d.holdEnabled) {
      holdCtx.clearRect(0, 0, 120, 120);
      holdHint.textContent = "지옥 난이도 : 홀드 금지";
      return;
    }

    drawMini(holdCtx, hold);
    holdHint.textContent = "";
  }

  function render() {
    const d = getDifficulty();

    drawGrid();

    if (current) {
      if (!d.hideGhost) {
        const gy = ghostY(current);
        drawPiece(ctx, { ...current, y: gy }, true);
      }
      drawPiece(ctx, current, false);
    }

    renderNextQueue();
    renderHold();
  }

  function update(time = 0) {
    render();

    if (!running) return;
    requestAnimationFrame(update);
    if (paused) return;

    const d = getDifficulty();
    const delta = time - lastTime;
    lastTime = time;

    if (d.garbageEveryMs > 0) {
      garbageCounter += delta;
      if (garbageCounter >= d.garbageEveryMs) {
        garbageCounter = 0;
        addGarbageLines(d.name === "지옥" ? randInt(1, 2) : 1);
      }
    }

    dropCounter += delta;

    if (dropCounter > dropInterval()) {
      dropCounter = 0;
      const test = { ...current, y: current.y + 1 };

      if (!collide(test, grid)) {
        current.y++;
        groundedMs = 0;
      } else {
        groundedMs += dropInterval();
        if (groundedMs >= d.lockDelayMs) {
          lockPiece();
        }
      }
    } else {
      if (current && collide({ ...current, y: current.y + 1 }, grid)) {
        groundedMs += delta;
        if (groundedMs >= d.lockDelayMs) {
          lockPiece();
        }
      }
    }
  }

  function resetGame() {
    grid = makeGrid();
    running = false;
    paused = false;

    score = 0;
    lines = 0;
    level = 1;
    lastLevel = 1;
    combo = 0;

    current = null;
    hold = null;
    canHold = true;

    lastTime = 0;
    dropCounter = 0;
    groundedMs = 0;
    garbageCounter = 0;
    clearFlashRows = [];

    bag = [];
    initNextQueue();

    gameOverScreen.classList.remove("show");
    updateHud();
    setStatus("대기");
    render();
  }

  function startGame() {
    if (running) return;

    if (!current) {
      current = getNextPiece();
    }

    running = true;
    paused = false;
    gameOverScreen.classList.remove("show");
    setStatus("진행중");
    lastTime = 0;

    requestAnimationFrame(update);
  }

  function togglePause() {
    if (!running) return;
    paused = !paused;
    setStatus(paused ? "일시정지" : "진행중", paused ? "strong" : "");
  }

  function restartGame() {
    resetGame();
    current = getNextPiece();
    running = true;
    paused = false;
    setStatus("진행중");
    requestAnimationFrame(update);
  }

  document.addEventListener("keydown", (e) => {
    const preventKeys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"];

    if (preventKeys.includes(e.key) || preventKeys.includes(e.code)) {
      e.preventDefault();
    }

    if (!running || !current) return;

    if (e.key === "ArrowLeft") {
      move(-1);
    } else if (e.key === "ArrowRight") {
      move(1);
    } else if (e.key === "ArrowUp") {
      tryRotate();
    } else if (e.key === "ArrowDown") {
      softDrop();
    } else if (e.code === "Space") {
      hardDrop();
    } else if (e.key === "Shift" || e.key.toLowerCase() === "c") {
      holdPiece();
    }
  });

  startBtn.addEventListener("click", startGame);
  pauseBtn.addEventListener("click", togglePause);
  resetBtn.addEventListener("click", resetGame);
  restartBtn.addEventListener("click", restartGame);

  diffSel.addEventListener("change", () => {
    setStatus(getDifficulty().name);
    render();
  });

  initNextQueue();
  updateHud();
  render();
});
