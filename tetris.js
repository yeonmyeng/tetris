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
        [0,0,0,0],
        [1,1,1,1],
        [0,0,0,0],
        [0,0,0,0],
    ],
    O: [
        [1,1],
        [1,1],
    ],
    T: [
        [0,1,0],
        [1,1,1],
        [0,0,0],
    ],
    S: [
        [0,1,1],
        [1,1,0],
        [0,0,0],
    ],
    Z: [
        [1,1,0],
        [0,1,1],
        [0,0,0],
    ],
    J: [
        [1,0,0],
        [1,1,1],
        [0,0,0],
    ],
    L: [
        [0,0,1],
        [1,1,1],
        [0,0,0],
    ],
};

const TYPES = Object.keys(SHAPES);

const boardCabvas = document.getElementById("board");
const ctx = boardCabvas.getContext("2d");

const nextCanvas = document.getElementById("next");
const nextCtx = nextCanvas.getContext("2d");

const holdCanvas = document.getElementById("hold");
const holdCtx = holdCanvas.getContext("2d");

const scoreEl = Document.getElementById("score");
const linesEl = Document.getElementById("lines");
const levelEl = Document.getElementById("level");
const statusEl = Document.getElementById("status");

const nextHint = document.getElementById("nextHint");
const holdHint = document.getElementById("holdHint");

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");
const diffSel = document.getElementById("difficulty");

boardCanvas.width = COLS * BLOCK;
boardCanvas.height = ROWS * BLOCK;

boardCanvas.width = COLS * BLOCK;
boardCanvas.height = ROWS * BLOCK;

function getDifficulty() {
    const v = diffSel.value || "normal";

    if (v === "hard") {
        return {
            name: "어려움",
            base: 600, step: 75, min: 60,
            lockDelayMs: 220,
            garbageEveryMs: 18000,
            garbageMinHoles: 1, garbageMaxHoles: 2,
            showNext: true,
            holdEnabled: true,
            hideGhost: false,
        };
    }

    if (v === "insane") {
        return {
            name: "지옥",
            base: 520, step: 95, min: 40,
            lockDelayMs: 120,
            garbageEveryMs: 10000,
            garbageMinHoles: 1, garbageMaxHoles: 1,
            showNext: false,
            holdEnabled: false,
            hideGhost: true,
        };
    }

    return {
        name: "보통",
        base: 700, step: 60, min: 80,
        lockDelayMs: 350,
        garbageEveryMs: 0,
        garbageMinHoles: 0, garbageMaxHoles: 0,
        showNext: true,
        holdEnabled: true,
        hideGhost: false,
    };
}

let grid = makeGrid();
let ruuning = false;
let paused = false;

let score = 0;
let lines = 0;
let level = 1;

let current = null;
let next = randomPiece();
let hold = null;
let canHold = true;

let lastTime = 0;
let dropCounter = 0;
let groundedMs = 0;
let garbageCounter = 0;

function makeGrid() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function randomPiece() {
    const type = TYPES[Math.floor(Math.random() * TYPES.length)];
    return spawnPiece(type);
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
 
    for (let y = 0; y< rows; y++) {
        for (let x = 0; x < cols; x++) {
            res[x][rows - 1 - y] = matrix[y][x];
        }
    }
    return res;
}

function collide(piece, g) {
    const { shape, x: px, y: py } = piece;
    for (let y = 0; y <shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (!shape[y][x]) continue;
            const gx = px +x;
            const gy = py +y;

            if (gx < 0 || gx >= COLS || gy >= ROWS) return true;
            if (gy >= 0 && g[gy][gx] !== 0) return true;
        }
    }
return false;
}

function clearLines() {
    let cleared = 0;

    outer: for (let y = ROWS - 1; y >= 0; y--) {
        for (let x = 0; x < COLS; x++) {
            if (grid[y][x] === 0) continue outer;
        }
        grid.splice(y, 1);
        grid.unshift(Array(COLS).fill(0));
        cleared++;
        y++;
    }

    if (cleared > 0) {
        lines += cleared;
        const base = [0, 100, 300, 500, 800][cleared] ?? (cleared * 200);
        score += base * level;
        level = Math.floor(lines / 10) + 1;
        updateHud();
    }
}

function updateHud() {
    scoreEl.textContent = String(score);
    linesEl.textContent = String(lines);
    levelEl.textContent = String(level);
}

function setStatus(text) {
    statusEl.textContent = text;
}

function dropInterval() {
    const d = getDifficulty();
    return Math.max(d.min, d.base - (level - 1) * d.step);
}

function randInt(a, b) {
    if (a > b) [a, b] =[b, a];
    return a + Math.floor(Math.random() * (b - a + 1));
}

function addGarbageLines(count) {
    const d = getDifficulty();
    for (let i = 0; i < count; i++) {
        const holes = randInt(d.garbageMinHoles, d.garbageMaxHoles);
        const holeSet = new Set();
        while (holeSet.size < holes) holeSet.add(Math.floor(Math.random() * 

        grid.shift();
        const row = Array.from({ length: COLS }, (_, x) => (holeSet.has(x) ?
        grid.push(row);

        if (current) current.y = Math.max(-2, current.y - 1);
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
        const test = { ...current, shape: rotated, x: current.x + k};
        if (!collide(test, grid)) {
            current.shape + rotated;
            current.x += k;
            groundedMs = 0;
            return;
        }
     }
}

function softDrop() {
    if (!current) return;
    const test = {...current, y: current.y + 1};
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
        current = next;
        next = randomPiece();
    } else {
        const tmp = hold.type;
        hold = spawnPiece(current.type);
        current = spawnPiece(tmp);
    }
    }
}
    

