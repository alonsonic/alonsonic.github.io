// Xmas Figures - stacked noisy pyramids + sphere ornaments
// Canvas + SVG export. All coordinates in millimeters (A4: 210mm x 297mm)

const A4_WIDTH = 210;
const A4_HEIGHT = 297;

// --- Config ----------------------------------------------------------------
// Toggle to compare noisy vs clean geometry
const ENABLE_NOISE = true;

// SVG grouping (use these layer IDs in Illustrator/Inkscape to recolor/plot)
const SVG_STROKE_PYRAMIDS = '#000000';
const SVG_STROKE_ORNAMENTS = '#000000';

// Shared style params (kept consistent with figure-study-2)
const NUM_CURVES = 18;         // rings per shape
const DEFAULT_POINTS_PER_CURVE = 140; // resolution per ring
const VERTICAL_SQUASH = 1.0;
const RING_TILT = 0.55;

let canvas, ctx, scale, canvasWidth, canvasHeight;

// shapesMm[shapeIndex] -> { layer: 'pyramids' | 'ornaments', curves: [ [ {x,y}, ... ], ... ] }
let shapesMm = [];

// Layout tweaks
const TREE_Y_SHIFT_MM = -14; // initial push (final fit is auto-adjusted below)
const PAGE_MARGIN_TOP_MM = 12;
const PAGE_MARGIN_BOTTOM_MM = 16;

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
  // cheap-ish bell-ish curve in [-1..1]
  return (Math.random() + Math.random() + Math.random() + Math.random() - 2) / 2;
}

function makeNoisyRingPoints({ cx, cy, maxRadius, raw, type, buildup, baseRotation, heightFactor, pointsPerCurve }) {
  // raw: 0..1 (shape-specific mapping; see each type below)
  // returns { bandCenterY, bandRadius, densityFactor }
  let yOffset = 0;
  let bandRadius = 0;
  let densityFactor = 1.0;

  if (type === 'SPHERE') {
    const angle = (raw - 0.5) * Math.PI;
    const v = Math.sin(angle); // -1..1
    yOffset = v * maxRadius;
    bandRadius = Math.sqrt(Math.max(0, maxRadius * maxRadius - yOffset * yOffset));
    densityFactor = Math.cos(angle); // 1 at equator, 0 at poles
  } else if (type === 'PYRAMID') {
    // raw=0 => top (apex), raw=1 => bottom (base)
    const v = (raw - 0.5) * 2; // -1..1
    yOffset = v * maxRadius * heightFactor;
    // taper to apex: at raw=0 radius ~0; at raw=1 radius max
    bandRadius = maxRadius * 0.95 * raw;
    densityFactor = 0.6 + 0.4 * raw;
  } else {
    // fallback
    const v = (raw - 0.5) * 2;
    yOffset = v * maxRadius * 0.8;
    bandRadius = maxRadius;
  }

  const bandCenterY = cy + yOffset * VERTICAL_SQUASH;
  // Noise magnitude (can be disabled via config)
  // Slightly calmer pyramids; spheres keep the original energy
  const noiseGain = (type === 'PYRAMID') ? 0.6 : 1.0;
  const noiseScale = ENABLE_NOISE ? (noiseGain * buildup * (0.05 + 0.16 * densityFactor)) : 0;

  const freq1 = 2 + Math.floor(Math.random() * 3);
  const freq2 = 3 + Math.floor(Math.random() * 3);
  const phase1 = Math.random() * Math.PI * 2;
  const phase2 = Math.random() * Math.PI * 2;

  const points = [];
  const ppc = Math.max(8, Math.floor(pointsPerCurve));
  for (let j = 0; j <= ppc; j++) {
    const u = j / ppc;
    const theta = u * Math.PI * 2;

    let baseX, baseY;
    if (type === 'SPHERE') {
      baseX = Math.cos(theta) * bandRadius;
      baseY = Math.sin(theta) * bandRadius * RING_TILT;
    } else {
      // Square-ish ring (pyramid uses same square ring language)
      const angleInQuad = (theta % (Math.PI / 2)) - (Math.PI / 4);
      const squareR = bandRadius / Math.cos(angleInQuad);
      const phiSquare = theta + baseRotation;
      baseX = Math.cos(phiSquare) * squareR;
      baseY = Math.sin(phiSquare) * squareR * RING_TILT;
    }

    const deformation = ENABLE_NOISE
      ? (1 + noiseScale * (
          0.6 * Math.sin(freq1 * theta + phase1) +
          0.4 * Math.sin(freq2 * theta + phase2)
        ))
      : 1;

    const xMm = cx + baseX * deformation;
    const yMm = bandCenterY + baseY * deformation;
    points.push({ x: xMm, y: yMm });
  }

  return points;
}

function generateShapeCurves({ cx, cy, size, type, ringCount = NUM_CURVES, pointsPerCurve = DEFAULT_POINTS_PER_CURVE }) {
  const shapeCurves = [];
  const maxRadius = (size / 2) * 0.9;
  // Keep spheres lively; make pyramids a bit less noisy
  const buildup = (type === 'PYRAMID')
    ? (0.10 + Math.random() * 0.45)
    : (0.15 + Math.random() * 0.85);

  const baseRotation = (type === 'PYRAMID') ? (Math.PI / 6 + randRange(-0.08, 0.08)) : 0;
  const heightFactor = (type === 'PYRAMID') ? randRange(0.78, 0.95) : 1.0;

  for (let i = 0; i < ringCount; i++) {
    const raw = ringCount === 1 ? 0.5 : i / (ringCount - 1);
    const pts = makeNoisyRingPoints({ cx, cy, maxRadius, raw, type, buildup, baseRotation, heightFactor, pointsPerCurve });
    shapeCurves.push(pts);
  }

  return shapeCurves;
}

function treeHalfWidthAtY(yMm) {
  // A simple silhouette function for placing ornaments.
  // Wider near the bottom, narrow at the top.
  const y = clamp(yMm, 60, 270);
  if (y < 120) return 18 + (y - 60) * (30 / 60);   // 18..48
  if (y < 185) return 48 + (y - 120) * (35 / 65);  // 48..83
  return 83 + (y - 185) * (20 / 85);               // 83..103
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

  // First, ensure bottom margin
  const bottomLimit = A4_HEIGHT - PAGE_MARGIN_BOTTOM_MM;
  let dy = 0;
  if (maxY > bottomLimit) {
    dy -= (maxY - bottomLimit);
  }

  // Then ensure top margin (after bottom adjustment)
  const topLimit = PAGE_MARGIN_TOP_MM;
  const adjustedMinY = minY + dy;
  if (adjustedMinY < topLimit) {
    dy += (topLimit - adjustedMinY);
  }

  translateGeometry(dy);
}

function generateTreeGeometry() {
  shapesMm = [];

  const cx = A4_WIDTH / 2;

  // Pyramid "tiers" (bottom -> top). Slight randomization each reload.
  const tiers = [
    { size: randRange(170, 190), cy: randRange(215, 232) + TREE_Y_SHIFT_MM },
    { size: randRange(130, 155), cy: randRange(168, 185) + TREE_Y_SHIFT_MM },
    { size: randRange(95, 115),  cy: randRange(125, 140) + TREE_Y_SHIFT_MM },
  ];

  // Sometimes add a tiny top tier
  if (Math.random() < 0.55) {
    tiers.push({ size: randRange(70, 85), cy: randRange(92, 108) + TREE_Y_SHIFT_MM });
  }

  tiers.forEach((t) => {
    const pyramid = generateShapeCurves({
      cx,
      cy: t.cy,
      size: t.size,
      type: 'PYRAMID',
      ringCount: NUM_CURVES,
      pointsPerCurve: 140,
    });
    shapesMm.push({ layer: 'pyramids', curves: pyramid });
  });

  // Ornaments: small noisy spheres sprinkled over the tree
  const ornamentCount = 4 + Math.floor(Math.random() * 3); // 4..6
  const ornamentMinGapMm = 8; // min spacing between ornament edges
  const ornaments = []; // {x,y,r}
  for (let i = 0; i < ornamentCount; i++) {
    // Spread through the full tree, including the bottom tier.
    // We bias some ornaments lower so they don't cluster mid-tree.
    const attempts = 90;
    let x = cx;
    let y = 160 + TREE_Y_SHIFT_MM;
    let size = 28;
    let placed = false;

    for (let attempt = 0; attempt < attempts; attempt++) {
      const r = Math.random();
      const yBand = (r < 0.65)
        ? randRange(205, 275) // strongly bottom-heavy
        : (r < 0.92)
          ? randRange(125, 215) // middle
          : randRange(70, 150); // top
      y = yBand + TREE_Y_SHIFT_MM;
      size = randRange(20, 36);

      // Approx radius for spacing checks (geometry maxRadius ~ size/2 * 0.9)
      const approxR = (size / 2) * 0.9;

      // Keep ornament inside the tree silhouette at this Y (leave room for its radius)
      const halfW = treeHalfWidthAtY(y);
      const maxOffset = Math.max(0, halfW * 0.72 - approxR);
      const offset = gaussianish() * maxOffset;
      x = cx + offset;

      // Keep away from page edges
      x = clamp(x, 18 + approxR, A4_WIDTH - 18 - approxR);

      // Check overlap against existing ornaments
      let ok = true;
      for (let k = 0; k < ornaments.length; k++) {
        const o = ornaments[k];
        const dx = x - o.x;
        const dy = y - o.y;
        const dist2 = dx * dx + dy * dy;
        const minDist = approxR + o.r + ornamentMinGapMm;
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

    // If we couldn't find a non-overlapping spot, place anyway (rare),
    // but still record it so subsequent ornaments avoid piling on it.
    if (!placed) {
      const approxR = (size / 2) * 0.9;
      ornaments.push({ x, y, r: approxR });
    }

    const sphere = generateShapeCurves({
      cx: x,
      cy: y,
      size,
      type: 'SPHERE',
      ringCount: 14,
      pointsPerCurve: 120,
    });
    shapesMm.push({ layer: 'ornaments', curves: sphere });
  }

  // Ensure we don't clip at the bottom/top of the A4 page
  fitGeometryToPageMargins();
}

function drawCurvesOnCanvas() {
  // Paper background
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
  if (!shapesMm.length) {
    generateTreeGeometry();
  }

  const strokeWidthMm = 0.25;
  const pyramids = [];
  const ornaments = [];

  shapesMm.forEach((shape) => {
    const target = (shape.layer === 'ornaments') ? ornaments : pyramids;
    shape.curves.forEach((curve) => {
      if (!curve.length) return;
      const pointsAttr = curve
        .map((pt) => `${pt.x.toFixed(3)},${pt.y.toFixed(3)}`)
        .join(' ');
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
  link.download = `xmas-figures-${date}.svg`;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded', () => {
  setup();

  const downloadButton = document.getElementById('download-svg-button');
  if (downloadButton) {
    downloadButton.addEventListener('click', exportToSVG);
  }
});

