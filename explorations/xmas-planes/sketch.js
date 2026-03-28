// Xmas Planes - stacked flat triangle planes + ornament balls
// Canvas + SVG export. All coordinates in millimeters (A4: 210mm x 297mm)

const A4_WIDTH = 210;
const A4_HEIGHT = 297;

// --- Config ----------------------------------------------------------------
const PAGE_MARGIN_TOP_MM = 12;
const PAGE_MARGIN_BOTTOM_MM = 16;
const TREE_Y_SHIFT_MM = -14; // initial push; final fit is auto-adjusted

// Density via nested contours (triangles-inside-triangles / circles-inside-circles)
// Smaller spacing => denser
// Controls the MAX density (minimum spacing). Increase to make triangles less dense.
const TRIANGLE_MAX_DENSITY_MIN_SPACING_MM = 5.0;
// Range for spacing randomness (min will be clamped by TRIANGLE_MAX_DENSITY_MIN_SPACING_MM)
const TRIANGLE_CONTOUR_SPACING_MM = [3.0, 10.0];
const ORNAMENT_RING_SPACING_MM = [2.0, 6.0];
const MIN_CONTOUR_SCALE = 0.08; // how far contours go toward the center

// Ornaments
const ORNAMENT_COUNT_RANGE = [4, 6];
const ORNAMENT_SIZE_RANGE_MM = [20, 36];
const ORNAMENT_MIN_GAP_MM = 8; // spacing between ornament edges

// SVG grouping
const SVG_STROKE_PYRAMIDS = '#000000';
const SVG_STROKE_ORNAMENTS = '#000000';

let canvas, ctx, scale, canvasWidth, canvasHeight;

// shapesMm[shapeIndex] -> { layer: 'pyramids' | 'ornaments', curves: [ [ {x,y}, ... ], ... ] }
let shapesMm = [];

function setup() {
  canvas = document.getElementById('preview-canvas');
  ctx = canvas.getContext('2d');
  updateCanvasSize();
  window.addEventListener('resize', updateCanvasSize);
}

function updateCanvasSize() {
  const container = canvas.parentElement;
  const aspectRatio = A4_HEIGHT / A4_WIDTH;
  let width = container.clientWidth;
  let height = width * aspectRatio;

  if (height > container.clientHeight) {
    height = container.clientHeight;
    width = height / aspectRatio;
  }

  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  canvasWidth = width;
  canvasHeight = height;
  scale = width / A4_WIDTH;

  drawStatic();
}

function mmToPx(x, y) {
  return [x * scale, y * scale];
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function randRange(min, max) {
  return min + Math.random() * (max - min);
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function gaussianish() {
  return (Math.random() + Math.random() + Math.random() + Math.random() - 2) / 2;
}

function degToRad(d) {
  return d * Math.PI / 180;
}

function centroid(points) {
  let x = 0;
  let y = 0;
  for (let i = 0; i < points.length; i++) {
    x += points[i].x;
    y += points[i].y;
  }
  return { x: x / points.length, y: y / points.length };
}

function rotatePoint(p, angleRad) {
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
}

function rotatePoints(points, angleRad) {
  return points.map((p) => rotatePoint(p, angleRad));
}

function polylineClosed(points) {
  if (!points.length) return [];
  return [...points, points[0]];
}

function triangleVertices({ cx, cy, side }) {
  // Flat 2D EQUILATERAL triangle plane (all 3 sides equal)
  // Centered by centroid at (cx, cy).
  const h = side * Math.sqrt(3) / 2;
  const halfSide = side / 2;
  // Centroid divides the median in 2:1 ratio (apex is 2/3 of height above centroid)
  const apexY = cy - (2 * h / 3);
  const baseY = cy + (h / 3);
  return [
    { x: cx, y: apexY },                 // apex
    { x: cx + halfSide, y: baseY },      // base right
    { x: cx - halfSide, y: baseY },      // base left
  ];
}

function triangleContours(verts, spacingMm) {
  // Build nested triangles by scaling toward centroid.
  // Spacing is approximated via count derived from size/spacing.
  const c = centroid(verts);
  const baseWidth = Math.hypot(verts[1].x - verts[2].x, verts[1].y - verts[2].y);
  const height = Math.abs(verts[2].y - verts[0].y);
  const sizeRef = Math.max(1, Math.min(baseWidth, height));

  const approxCount = Math.floor(sizeRef / Math.max(0.5, spacingMm));
  const count = clamp(approxCount, 6, 34);

  const curves = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1);
    const scale = 1 - t * (1 - MIN_CONTOUR_SCALE);
    const inner = verts.map((p) => ({
      x: c.x + (p.x - c.x) * scale,
      y: c.y + (p.y - c.y) * scale,
    }));
    curves.push(polylineClosed(inner));
  }
  return curves;
}

function circleOutline(cx, cy, r, steps = 72) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = t * Math.PI * 2;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

function circleContours(cx, cy, r, spacingMm) {
  const curves = [];
  const step = Math.max(0.6, spacingMm);
  for (let rr = r; rr > 0.6; rr -= step) {
    curves.push(circleOutline(cx, cy, rr, 84));
  }
  return curves;
}

function translateGeometry(dy) {
  if (!dy) return;
  shapesMm.forEach((shape) => {
    shape.curves.forEach((curve) => {
      curve.forEach((pt) => {
        pt.y += dy;
      });
    });
  });
}

function fitGeometryToPageMargins() {
  let minY = Infinity;
  let maxY = -Infinity;

  shapesMm.forEach((shape) => {
    shape.curves.forEach((curve) => {
      curve.forEach((pt) => {
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      });
    });
  });

  if (!isFinite(minY) || !isFinite(maxY)) return;

  const bottomLimit = A4_HEIGHT - PAGE_MARGIN_BOTTOM_MM;
  let dy = 0;
  if (maxY > bottomLimit) dy -= (maxY - bottomLimit);

  const topLimit = PAGE_MARGIN_TOP_MM;
  const adjustedMinY = minY + dy;
  if (adjustedMinY < topLimit) dy += (topLimit - adjustedMinY);

  translateGeometry(dy);
}

function treeHalfWidthAtY(yMm) {
  // Simple silhouette helper for ornaments (matches the triangle stack).
  const y = clamp(yMm, 60, 275);
  if (y < 120) return 20 + (y - 60) * (26 / 60);   // 20..46
  if (y < 185) return 46 + (y - 120) * (35 / 65);  // 46..81
  return 81 + (y - 185) * (25 / 90);               // 81..106
}

function generateTreeGeometry() {
  shapesMm = [];

  const cx = A4_WIDTH / 2;

  // Triangle "tiers" (bottom -> top)
  const tiers = [
    { side: randRange(170, 190), cy: randRange(220, 235) + TREE_Y_SHIFT_MM },
    { side: randRange(130, 150), cy: randRange(175, 190) + TREE_Y_SHIFT_MM },
    { side: randRange(95, 115),  cy: randRange(135, 150) + TREE_Y_SHIFT_MM },
  ];
  if (Math.random() < 0.55) {
    tiers.push({ side: randRange(70, 85), cy: randRange(105, 120) + TREE_Y_SHIFT_MM });
  }

  tiers.forEach((t) => {
    const verts = triangleVertices({ cx, cy: t.cy, side: t.side });
    const minSpacing = Math.max(TRIANGLE_MAX_DENSITY_MIN_SPACING_MM, TRIANGLE_CONTOUR_SPACING_MM[0]);
    const spacing = randRange(minSpacing, TRIANGLE_CONTOUR_SPACING_MM[1]);
    const curves = triangleContours(verts, spacing);
    shapesMm.push({ layer: 'pyramids', curves: curves.filter((c) => c.length) });
  });

  // Ornaments with non-overlap
  const ornamentCount = ORNAMENT_COUNT_RANGE[0] + Math.floor(Math.random() * (ORNAMENT_COUNT_RANGE[1] - ORNAMENT_COUNT_RANGE[0] + 1));
  const ornaments = []; // {x,y,r}

  for (let i = 0; i < ornamentCount; i++) {
    const attempts = 90;
    let x = cx;
    let y = 180 + TREE_Y_SHIFT_MM;
    let size = randRange(ORNAMENT_SIZE_RANGE_MM[0], ORNAMENT_SIZE_RANGE_MM[1]);
    let placed = false;

    for (let attempt = 0; attempt < attempts; attempt++) {
      const rr = Math.random();
      const yBand = (rr < 0.65)
        ? randRange(205, 275) // bottom-heavy
        : (rr < 0.92)
          ? randRange(125, 215)
          : randRange(70, 150);
      y = yBand + TREE_Y_SHIFT_MM;
      size = randRange(ORNAMENT_SIZE_RANGE_MM[0], ORNAMENT_SIZE_RANGE_MM[1]);

      const approxR = (size / 2) * 0.9;
      const halfW = treeHalfWidthAtY(y);
      const maxOffset = Math.max(0, halfW * 0.72 - approxR);
      const offset = gaussianish() * maxOffset;
      x = cx + offset;
      x = clamp(x, 18 + approxR, A4_WIDTH - 18 - approxR);

      let ok = true;
      for (let k = 0; k < ornaments.length; k++) {
        const o = ornaments[k];
        const dx = x - o.x;
        const dy = y - o.y;
        const dist2 = dx * dx + dy * dy;
        const minDist = approxR + o.r + ORNAMENT_MIN_GAP_MM;
        if (dist2 < minDist * minDist) {
          ok = false;
          break;
        }
      }

      if (ok) {
        ornaments.push({ x, y, r: approxR });
        placed = true;
        break;
      }
    }

    if (!placed) {
      const approxR = (size / 2) * 0.9;
      ornaments.push({ x, y, r: approxR });
    }

    const r = (size / 2) * 0.9;
    const spacing = randRange(ORNAMENT_RING_SPACING_MM[0], ORNAMENT_RING_SPACING_MM[1]);
    const curves = circleContours(x, y, r, spacing);
    shapesMm.push({ layer: 'ornaments', curves: curves.filter((c) => c.length) });
  }

  fitGeometryToPageMargins();
}

function drawCurvesOnCanvas() {
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  ctx.strokeStyle = '#000';
  ctx.lineWidth = (1.0 / scale);

  shapesMm.forEach((shape) => {
    shape.curves.forEach((curve) => {
      if (!curve.length) return;
      ctx.beginPath();
      const first = curve[0];
      const [x0, y0] = mmToPx(first.x, first.y);
      ctx.moveTo(x0, y0);
      for (let k = 1; k < curve.length; k++) {
        const pt = curve[k];
        const [px, py] = mmToPx(pt.x, pt.y);
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    });
  });
}

function drawStatic() {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  generateTreeGeometry();
  drawCurvesOnCanvas();
}

// --- SVG Export ------------------------------------------------------------

function buildSvgContent() {
  if (!shapesMm.length) generateTreeGeometry();

  const strokeWidthMm = 0.25;
  const pyramids = [];
  const ornaments = [];

  shapesMm.forEach((shape) => {
    const target = (shape.layer === 'ornaments') ? ornaments : pyramids;
    shape.curves.forEach((curve) => {
      if (!curve.length) return;
      const pointsAttr = curve.map((pt) => `${pt.x.toFixed(3)},${pt.y.toFixed(3)}`).join(' ');
      target.push(
        `<polyline points="${pointsAttr}" stroke-width="${strokeWidthMm}" fill="none" stroke-linecap="round" stroke-linejoin="round" />`
      );
    });
  });

  return [
    `<g id="pyramids" stroke="${SVG_STROKE_PYRAMIDS}">`,
    pyramids.join('\n'),
    `</g>`,
    `<g id="ornaments" stroke="${SVG_STROKE_ORNAMENTS}">`,
    ornaments.join('\n'),
    `</g>`,
  ].join('\n');
}

function exportToSVG() {
  const svgBody = buildSvgContent();
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg"`,
    `     width="${A4_WIDTH}mm" height="${A4_HEIGHT}mm"`,
    `     viewBox="0 0 ${A4_WIDTH} ${A4_HEIGHT}">`,
    svgBody,
    `</svg>`,
  ].join('\n');

  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  link.download = `xmas-planes-${date}.svg`;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded', () => {
  setup();
  const downloadButton = document.getElementById('download-svg-button');
  if (downloadButton) downloadButton.addEventListener('click', exportToSVG);
});

