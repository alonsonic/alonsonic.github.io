// Zajec Duo (circles + triangles) - p5 + SVG export
// Two figure families only: concentric circles and nested equilateral triangles.

let isPreparingDownload = false;
const DOWNLOAD_DELAY_MS = 250; // short delay for UI feedback

// --- Config knobs -----------------------------------------------------------
const STROKE_WEIGHT = 1.6;
const CANVAS_W = 500;
const CANVAS_H = 650;

// Density controls (smaller step => denser)
const CIRCLE_RING_STEP_RANGE = [6, 14];
const TRIANGLE_STEP_RANGE = [7, 16];
const MIN_TRIANGLE_SCALE = 0.08; // how far inward to go
const PAGE_MARGIN = 24;

function setup() {
  const canvas = createCanvas(CANVAS_W, CANVAS_H, SVG);
  canvas.parent('sketch-container');
  ellipseMode(CENTER);

  setupDownloadButton();
}

function setupDownloadButton() {
  const btn = document.getElementById('download-btn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    if (isPreparingDownload) return;
    isPreparingDownload = true;

    const originalLabel = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Preparing...';

    setTimeout(() => {
      save('zajec-duo.svg');
      btn.disabled = false;
      btn.textContent = originalLabel;
      isPreparingDownload = false;
    }, DOWNLOAD_DELAY_MS);
  });
}

function draw() {
  // Keep SVG background transparent (avoid background() which adds a rect)
  clear();
  stroke(0);
  strokeWeight(STROKE_WEIGHT);
  noFill();

  // Layout: keep it simple + Zajec-ish.
  // Circle figure (left-ish)
  drawCircleFigure(185, 300, 22, 190);

  // Triangle figure (right-ish): multiple triangles, mixed orientations/sizes/densities
  drawTriangleFigure();

  // Ensure SVG doesn't accumulate layers
  noLoop();
}

// --- Circles ----------------------------------------------------------------

function drawCircleFigure(cx, cy, rMin, rMax) {
  // Large concentric set
  const step1 = random(CIRCLE_RING_STEP_RANGE[0], CIRCLE_RING_STEP_RANGE[1]);
  drawConcentricCircles(cx, cy, rMin, rMax, step1);

  // Smaller secondary set near it for contrast
  const step2 = random(CIRCLE_RING_STEP_RANGE[0], CIRCLE_RING_STEP_RANGE[1]);
  drawConcentricCircles(cx + 165, cy - 55, 10, 74, step2);
}

function drawConcentricCircles(cx, cy, rMin, rMax, step) {
  const clampedMax = min(rMax, min(cx - PAGE_MARGIN, CANVAS_W - cx - PAGE_MARGIN, cy - PAGE_MARGIN, CANVAS_H - cy - PAGE_MARGIN));
  for (let r = rMin; r <= clampedMax; r += step) {
    circle(cx, cy, r * 2);
  }
}

// --- Triangles --------------------------------------------------------------

function drawTriangleFigure() {
  // A small set of triangles with different sizes/densities, some up, some down.
  // (All equilateral; density comes from nested contours.)
  const triangles = [
    { cx: 340, cy: 210, side: 210, dir: 'up',   step: random(TRIANGLE_STEP_RANGE[0], TRIANGLE_STEP_RANGE[1]) },
    { cx: 360, cy: 385, side: 185, dir: 'down', step: random(TRIANGLE_STEP_RANGE[0], TRIANGLE_STEP_RANGE[1]) },
    { cx: 285, cy: 470, side: 145, dir: 'up',   step: random(TRIANGLE_STEP_RANGE[0], TRIANGLE_STEP_RANGE[1]) },
    { cx: 420, cy: 140, side: 110, dir: 'down', step: random(TRIANGLE_STEP_RANGE[0], TRIANGLE_STEP_RANGE[1]) },
  ];

  triangles.forEach((t) => {
    const safe = clampTriangleToPage(t);
    drawNestedEquilateralTriangle(safe.cx, safe.cy, safe.side, safe.dir, safe.step);
  });
}

function clampTriangleToPage({ cx, cy, side, dir, step }) {
  const h = side * sqrt(3) / 2;
  // centroid-centered triangle:
  // up: apex y = cy - 2h/3, base y = cy + h/3
  // down: apex y = cy + 2h/3, base y = cy - h/3
  const topY = (dir === 'up') ? (cy - 2 * h / 3) : (cy - h / 3);
  const botY = (dir === 'up') ? (cy + h / 3) : (cy + 2 * h / 3);
  const halfSide = side / 2;

  const minX = cx - halfSide;
  const maxX = cx + halfSide;

  let nx = cx;
  let ny = cy;

  if (minX < PAGE_MARGIN) nx += (PAGE_MARGIN - minX);
  if (maxX > CANVAS_W - PAGE_MARGIN) nx -= (maxX - (CANVAS_W - PAGE_MARGIN));
  if (topY < PAGE_MARGIN) ny += (PAGE_MARGIN - topY);
  if (botY > CANVAS_H - PAGE_MARGIN) ny -= (botY - (CANVAS_H - PAGE_MARGIN));

  return { cx: nx, cy: ny, side, dir, step };
}

function drawNestedEquilateralTriangle(cx, cy, side, dir, step) {
  const minSide = max(6, side * MIN_TRIANGLE_SCALE);
  const delta = max(2, step * 2.0); // approximate spacing -> side shrink per contour
  for (let s = side; s >= minSide; s -= delta) {
    const verts = equilateralTriangleVerts(cx, cy, s, dir);
    triangle(verts[0].x, verts[0].y, verts[1].x, verts[1].y, verts[2].x, verts[2].y);
  }
}

function equilateralTriangleVerts(cx, cy, side, dir) {
  const h = side * sqrt(3) / 2;
  const halfSide = side / 2;
  if (dir === 'up') {
    const apexY = cy - (2 * h / 3);
    const baseY = cy + (h / 3);
    return [
      createVector(cx, apexY),
      createVector(cx + halfSide, baseY),
      createVector(cx - halfSide, baseY),
    ];
  }
  // down
  const apexY = cy + (2 * h / 3);
  const baseY = cy - (h / 3);
  return [
    createVector(cx, apexY),
    createVector(cx + halfSide, baseY),
    createVector(cx - halfSide, baseY),
  ];
}

