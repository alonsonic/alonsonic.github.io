// A4 Canvas - Barebones setup
// All coordinates in millimeters (210mm x 297mm)

const A4_WIDTH = 210;
const A4_HEIGHT = 297;

// Layout / wave controls (millimeters)
const TOP_MARGIN_MM = 15;
const BOTTOM_MARGIN_MM = 15;
const NUM_LINES = 60;              // explicit number of horizontal lines
const MAX_OFFSET_MM = 3;           // max vertical jitter

// Dynamic wave behaviour
const LINE_RAMP_DURATION = 8.0;       // seconds for each line to go from 0 → full vibration (slower ramp)
const PROPAGATION_DELAY_PER_LINE = 0.5; // seconds delay per line away from the center line

let canvas, ctx, scale, canvasWidth, canvasHeight;
let animationTime = 0;               // simple time accumulator for animation
let centerLineIndex = null;          // center line that starts the ramp (chosen randomly)

function setup() {
    canvas = document.getElementById('preview-canvas');
    ctx = canvas.getContext('2d');
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    // Simple animation loop so the chain reaction evolves over time
    function loop() {
        animationTime += 0.016; // ~60fps, good enough for this sketch
        draw();
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
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

    // Reset to identity, then apply device pixel ratio
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);


    canvasWidth = width;
    canvasHeight = height;
    // Uniform scale in both directions (aspect ratio enforces this)
    scale = width / A4_WIDTH;
    draw();
}

function mmToPx(x, y) {
    return [x * scale, y * scale];
}

// Helper: draw a line using millimeter coordinates only
function drawLineMm(x1, y1, x2, y2) {
    const [x1px, y1px] = mmToPx(x1, y1);
    const [x2px, y2px] = mmToPx(x2, y2);

    ctx.beginPath();
    ctx.moveTo(x1px, y1px);
    ctx.lineTo(x2px, y2px);
    ctx.stroke();
}

function draw() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // white paper background
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4 / scale;  // thinner lines on larger previews

    // Reserve top / bottom margins and ensure curves never cross them.
    const safeTop = TOP_MARGIN_MM + MAX_OFFSET_MM;
    const safeBottom = A4_HEIGHT - BOTTOM_MARGIN_MM - MAX_OFFSET_MM;

    const lines = Math.max(1, NUM_LINES | 0); // ensure integer >= 1
    const spanMm = Math.max(0, safeBottom - safeTop);
    const spacing = lines > 1 ? spanMm / (lines - 1) : 0;

    // Pick a single random center line on first draw
    if (centerLineIndex === null) {
        centerLineIndex = Math.floor(Math.random() * lines);
    }

    // --- Cycle timing ---
    // Compute when the outermost line finishes ramping up and settling, for this center line
    let maxDistance = Math.max(centerLineIndex, lines - 1 - centerLineIndex);
    let outerStartTime = maxDistance === 0
        ? 0
        : LINE_RAMP_DURATION + maxDistance * PROPAGATION_DELAY_PER_LINE;
    let allFullTime = outerStartTime + LINE_RAMP_DURATION;
    let cycleDuration = allFullTime + maxDistance * PROPAGATION_DELAY_PER_LINE + LINE_RAMP_DURATION;

    // When a full cycle (ramp up, hold, settle) is over, start a new one from a new random line
    if (animationTime > cycleDuration) {
        centerLineIndex = Math.floor(Math.random() * lines);
        animationTime = 0;

        maxDistance = Math.max(centerLineIndex, lines - 1 - centerLineIndex);
        outerStartTime = maxDistance === 0
            ? 0
            : LINE_RAMP_DURATION + maxDistance * PROPAGATION_DELAY_PER_LINE;
        allFullTime = outerStartTime + LINE_RAMP_DURATION;
        cycleDuration = allFullTime + maxDistance * PROPAGATION_DELAY_PER_LINE + LINE_RAMP_DURATION;
    }

    for (let rowIndex = 0; rowIndex < lines; rowIndex++) {
        const y = safeTop + spacing * rowIndex;

        // Base state: perfectly horizontal lines
        let noiseAmount = 0;

        // Distance from the center line (spreads up and down symmetrically)
        const distance = Math.abs(rowIndex - centerLineIndex);
        // Center line starts immediately; others start only after center reached full strength
        const rampStartTime = distance === 0
            ? 0
            : LINE_RAMP_DURATION + distance * PROPAGATION_DELAY_PER_LINE;
        const rampEndTime = rampStartTime + LINE_RAMP_DURATION;

        // After all lines are at full, they begin to settle back down
        const settleStartTime = allFullTime + distance * PROPAGATION_DELAY_PER_LINE;
        const settleEndTime = settleStartTime + LINE_RAMP_DURATION;

        const t = animationTime;
        let factor = 0;

        if (t >= rampStartTime && t < rampEndTime) {
            // Ramp up 0 → 1
            factor = (t - rampStartTime) / LINE_RAMP_DURATION;
        } else if (t >= rampEndTime && t < settleStartTime) {
            // Hold at full strength
            factor = 1;
        } else if (t >= settleStartTime && t < settleEndTime) {
            // Ramp down 1 → 0
            factor = 1 - (t - settleStartTime) / LINE_RAMP_DURATION;
        } else if (t >= settleEndTime) {
            // Fully settled back to straight line
            factor = 0;
        }

        factor = Math.max(0, Math.min(1, factor));
        noiseAmount = MAX_OFFSET_MM * factor;

        drawWavyLine(y, 0, 1, noiseAmount);
    }
}


// Draw a wavy horizontal line at yMm
function drawWavyLine(yMm, amplitudeMm, frequency, noiseAmountMm) {
    const margin = 15;       // left and right margin in millimeters
    const stepMm = 1;        // horizontal step in millimeters

    let prevX = margin;
    let prevY = yMm;

    for (let x = margin; x <= A4_WIDTH - margin; x += stepMm) {
        const t = x / A4_WIDTH;

        // Random jitter in range [-noiseAmountMm, +noiseAmountMm]
        const randomOffset = (Math.random() - 0.5) * 2 * noiseAmountMm;

        const currentX = x;
        const currentY = yMm + randomOffset;

        drawLineMm(prevX, prevY, currentX, currentY);

        prevX = currentX;
        prevY = currentY;
    }
}


document.addEventListener('DOMContentLoaded', () => {
    setup();
});
