const canvas = document.getElementById('lifeCanvas');
const ctx = canvas.getContext('2d');
const dpr = window.devicePixelRatio || 1;

let cellSize = 14; // px per cell (bigger = more visible)
let cols = 0, rows = 0;
let grid = [];
let tickCount = 0;
const HEAVY = ['█', '▓', '■', '●', '▪'];
const LIGHT = ['░', '▒', '▫', '•', '·'];

// Keep the simulation lively
const MIN_ALIVE_RATIO = 0.12;   // keep at least 12% of cells alive
const RESEED_RATIO = 0.28;      // when below threshold, reseed ~28% of cells
const TICK_NOISE_RATIO = 0.006; // each tick sprinkle ~0.6% random live cells

function resizeCanvas() {
  // Get container dimensions
  const container = canvas.parentElement;
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;
  
  // Set canvas size in device pixels but draw using CSS pixels
  canvas.width = Math.floor(containerWidth * dpr);
  canvas.height = Math.floor(containerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.font = `${cellSize}px 'Courier New', monospace`;

  cols = Math.floor(containerWidth / cellSize);
  rows = Math.floor(containerHeight / cellSize);
  grid = createGrid(cols, rows, true);
  draw();
}

function createGrid(cols, rows, randomize = false) {
  const g = new Array(rows);
  for (let y = 0; y < rows; y++) {
    g[y] = new Array(cols);
    for (let x = 0; x < cols; x++) {
      g[y][x] = randomize ? (Math.random() < 0.38 ? 1 : 0) : 0;
    }
  }
  return g;
}

function countNeighbors(g, x, y) {
  let count = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = (x + dx + cols) % cols; // wrap edges
      const ny = (y + dy + rows) % rows;
      count += g[ny][nx];
    }
  }
  return count;
}

function step() {
  const next = new Array(rows);
  for (let y = 0; y < rows; y++) {
    next[y] = new Array(cols);
    for (let x = 0; x < cols; x++) {
      const n = countNeighbors(grid, x, y);
      const alive = grid[y][x] === 1;
      next[y][x] = (alive && (n === 2 || n === 3)) || (!alive && n === 3) ? 1 : 0;
    }
  }
  grid = next;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // First pass: count alive to decide reseed
  let aliveCount = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid[y][x]) aliveCount++;
    }
  }

  const total = cols * rows;
  if (aliveCount < total * MIN_ALIVE_RATIO) {
    // Reseed a chunk of cells to keep it lively
    const seeds = Math.floor(total * RESEED_RATIO);
    for (let i = 0; i < seeds; i++) {
      const rx = Math.floor(Math.random() * cols);
      const ry = Math.floor(Math.random() * rows);
      grid[ry][rx] = 1;
    }
    aliveCount = Math.min(total, aliveCount + seeds);
  }

  // Second pass: draw characters
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const alive = grid[y][x];
      if (alive) {
        const char = HEAVY[Math.floor(Math.random() * HEAVY.length)];
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillText(char, x * cellSize, y * cellSize);
      } else {
        const n = countNeighbors(grid, x, y);
        if (n >= 3) {
          const lch = LIGHT[Math.floor(Math.random() * LIGHT.length)];
          ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
          ctx.fillText(lch, x * cellSize, y * cellSize);
        }
      }
    }
  }
}

function addNoise() {
  const total = cols * rows;
  const noise = Math.max(1, Math.floor(total * TICK_NOISE_RATIO));
  for (let i = 0; i < noise; i++) {
    const rx = Math.floor(Math.random() * cols);
    const ry = Math.floor(Math.random() * rows);
    grid[ry][rx] = 1;
  }
}

function tick() {
  tickCount++;
  step();
  addNoise();
  draw();
}

resizeCanvas();
let interval = setInterval(tick, 90);

window.addEventListener('resize', () => {
  clearInterval(interval);
  resizeCanvas();
  interval = setInterval(tick, 90);
});
