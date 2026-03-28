// A4 Canvas Variant - 3x3 grid of mixed noisy forms (Spheres, Cubes, Pyramids)
// All coordinates in millimeters (210mm x 297mm)

const A4_WIDTH = 210;
const A4_HEIGHT = 297;

// Grid configuration
// Removed grid constants in favor of random placement
const GRID_MARGIN_MM = 25;    // Standard margin for width
const NUM_CURVES = 15;          // rings per shape
const POINTS_PER_CURVE = 120;   // resolution per ring
const VERTICAL_SQUASH = 1.0;    // 1.0 = perfect silhouette aspect
const RING_TILT = 0.5;          // perspective tilt

let canvas, ctx, scale, canvasWidth, canvasHeight;
// Store geometry: array of arrays of point-lists
// curvesMm[shapeIndex][ringIndex] -> [{x,y}, ...]
let curvesMm = []; 

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

    // Reset to identity, then apply device pixel ratio
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    canvasWidth = width;
    canvasHeight = height;
    // Uniform scale in both directions (aspect ratio enforces this)
    scale = width / A4_WIDTH;

    drawStaticShape();
}

function mmToPx(x, y) {
    return [x * scale, y * scale];
}

// Generate geometry for a SINGLE shape at (cx, cy)
// randomly picking Sphere, Cube, or Pyramid
function generateSingleShape(cx, cy, size) {
    const shapeCurves = [];
    
    // Max radius for this cell size (leaving a tiny bit of breathing room inside the cell)
    const maxRadius = (size / 2) * 0.9;
    
    // Each shape gets a random buildup factor for unique noise
    const buildup = 0.0; // Clean shapes, no noise
    
    // Pick random shape type
    const shapes = ['SPHERE', 'CUBE', 'PYRAMID'];
    const type = shapes[Math.floor(Math.random() * shapes.length)];

    // For square shapes, add a random rotation to look 3D
    // If it's a square, we rotate it by ~30 degrees to look more like a cube
    const baseRotation = (type === 'CUBE' || type === 'PYRAMID') ? (Math.PI / 6) : 0;

    for (let i = 0; i < NUM_CURVES; i++) {
        // Normalized height index 0..1 (0=bottom, 1=top)
        // Note: For sphere, we mapped raw to angle -PI/2..PI/2
        // For Cube/Pyramid, we just need 0..1 or -1..1
        
        const raw = NUM_CURVES === 1 ? 0.5 : i / (NUM_CURVES - 1);
        
        // --- Calculate Vertical Position & Horizontal Radius based on Type ---
        let yOffset = 0;
        let bandRadius = 0;
        let densityFactor = 1.0; // used for noise scaling

        if (type === 'SPHERE') {
            // Equal angular spacing for density variation
            const angle = (raw - 0.5) * Math.PI; 
            const v = Math.sin(angle); // -1..1
            yOffset = v * maxRadius;
            bandRadius = Math.sqrt(Math.max(0, maxRadius * maxRadius - yOffset * yOffset));
            densityFactor = Math.cos(angle); // 1 at equator, 0 at poles
        } 
        else if (type === 'CUBE') {
            // Uniform vertical spacing
            // y goes from -R to +R
            const v = (raw - 0.5) * 2; // -1..1
            
            // Adjust height range so height matches the width visually
            // bandRadius = 0.85 * R (apothem). Width approx 2 * 0.85 * R = 1.7 R.
            // If we use full height 2 * R, it looks tall.
            // Let's constrain vertical range to match the horizontal extent better.
            // Reducing height factor further to account for perspective tilt adding visual height
            const heightFactor = 0.65; 
            yOffset = v * maxRadius * heightFactor;
            
            // Constant radius
            bandRadius = maxRadius * 0.85; 
            densityFactor = 1.0; // uniform noise
        }
        else if (type === 'PYRAMID') {
            // Uniform vertical spacing, taper radius
            // y goes from -R (base) to +R (apex)
            const v = (raw - 0.5) * 2; // -1..1
            
            // Reducing height to match visual weight of other shapes
            const heightFactor = 0.75;
            yOffset = v * maxRadius * heightFactor;
            
            // Radius tapers from 0 (top) to Max (bottom) for a standard pyramid
            // raw goes 0 (top) to 1 (bottom).
            // Wait, previous logic was: raw=0 -> top?
            // If raw=0 -> v=-1 -> yOffset = -R (Top).
            // So at raw=0 we want Radius 0. At raw=1 we want Radius Max.
            bandRadius = maxRadius * 0.9 * raw; 
            densityFactor = 1.0 - (1 - raw); // effectively raw?
        }

        // Center Y of this ring on the page
        const bandCenterY = cy + yOffset * VERTICAL_SQUASH; 

        // Noise magnitude
        // For sphere: varies by latitude. For others: uniformish + random buildup.
        const noiseScale = 0.0;

        // Randomised low-frequency deformation per ring
        const freq1 = 2 + Math.floor(Math.random() * 3);
        const freq2 = 3 + Math.floor(Math.random() * 3);
        const phase1 = Math.random() * Math.PI * 2;
        const phase2 = Math.random() * Math.PI * 2;

        const points = [];

        for (let j = 0; j <= POINTS_PER_CURVE; j++) {
            const u = j / POINTS_PER_CURVE;
            // Base angle in the 2D plane
            const theta = u * Math.PI * 2;

            let baseX, baseY;

            if (type === 'SPHERE') {
                // Circle
                baseX = Math.cos(theta) * bandRadius;
                baseY = Math.sin(theta) * bandRadius * RING_TILT;
            } else {
                // Square (Cube/Pyramid)
                // Use polar equation for a square rotated by baseRotation
                // r(phi) = w / max(|cos|, |sin|)
                // We apply rotation to theta first
                const phi = theta + baseRotation;
                
                // Radius to the edge of the square at angle phi
                // We align the square axis-aligned in calculation, then rotate
                // But simplified: 
                // x = r * cos(theta), y = r * sin(theta)
                // where r varies.
                // Standard square polar:
                // r = size / max(|cos(phi)|, |sin(phi)|)
                // size here is half-width (apothem)
                // Actually bandRadius is usually "distance to corner" or "distance to side"?
                // Let's assume bandRadius is the circumradius (dist to corner) to match Sphere bounds.
                // Then side length = bandRadius * sqrt(2).
                // Apothem = bandRadius / sqrt(2).
                // Or let's just use bandRadius as the "scale" and shape it.
                
                // Let's use a simple way: traverse perimeter
                // But we need smooth parameterization for noise.
                // Polar approach is best.
                // To get a square from polar coords:
                // Map theta to 0..PI/2 quadrants.
                const angleInQuad = (theta % (Math.PI/2)) - (Math.PI/4); // -PI/4 to PI/4
                // r = side / cos(angleInQuad)
                // Here 'bandRadius' will be the apothem (min radius)
                // to make it look substantial.
                
                const squareR = bandRadius / Math.cos(angleInQuad);
                // Rotate the whole point by baseRotation
                const phiSquare = theta + baseRotation;
                
                baseX = Math.cos(phiSquare) * squareR;
                baseY = Math.sin(phiSquare) * squareR * RING_TILT;
            }

            // Deformation applied radially from center
            const deformation =
                1 +
                noiseScale * (
                    0.6 * Math.sin(freq1 * theta + phase1) +
                    0.4 * Math.sin(freq2 * theta + phase2)
                );

            const xMm = cx + baseX * deformation;
            const yMm = bandCenterY + baseY * deformation;

            points.push({ x: xMm, y: yMm });
        }
        shapeCurves.push(points);
    }
    return shapeCurves;
}

function generateCurvesGeometry() {
    curvesMm = [];

    // Calculate usable area
    const minX = GRID_MARGIN_MM;
    const maxX = A4_WIDTH - GRID_MARGIN_MM;
    const minY = GRID_MARGIN_MM; // Give some top/bottom margin too
    const maxY = A4_HEIGHT - GRID_MARGIN_MM;

    // Random number of shapes between 3 and 6
    const numShapes = Math.floor(Math.random() * 4) + 3; // 3 to 6

    for (let i = 0; i < numShapes; i++) {
        // Random size - WAY BIGGER now, between 50mm and 150mm
        // Since we allow overlap, they can be large.
        const size = 50 + Math.random() * 100;
        const radius = size / 2;

        // Random position within bounds (keeping shape center somewhat safe but allowing large sizes)
        // If size is very large, it might barely fit, so we just pick a valid center.
        // Let's ensure center is at least 'radius' away from edge if possible, 
        // but if 'maxX - minX' < size, we just center it or pick randomly in the small valid range.
        
        let cx, cy;
        
        // Horizontal placement
        if (maxX - minX > size) {
            cx = minX + radius + Math.random() * (maxX - minX - size);
        } else {
            // Shape is wider than margins allow? Center it horizontally or clamp
            cx = (minX + maxX) / 2; 
        }

        // Vertical placement
        if (maxY - minY > size) {
            cy = minY + radius + Math.random() * (maxY - minY - size);
        } else {
             cy = (minY + maxY) / 2;
        }

        const shape = generateSingleShape(cx, cy, size);
        curvesMm.push(shape);
    }
}

// Draw the current curves geometry to the canvas
function drawCurvesOnCanvas() {
    // white paper background
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.strokeStyle = '#000';

    // curvesMm is now Array<Array<PointList>>
    curvesMm.forEach((shape) => {
        shape.forEach((curve, index) => {
            if (!curve.length) return;

            // Simple line width logic
            // Thicker lines for aesthetics
            ctx.lineWidth = (1.0 / scale);

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

function drawStaticShape() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    generateCurvesGeometry();
    drawCurvesOnCanvas();
}

// --- SVG Export ------------------------------------------------------------

function buildSvgContent() {
    if (!curvesMm.length) {
        generateCurvesGeometry();
    }

    const strokeWidthMm = 0.25;
    const svgParts = [];

    // Flatten hierarchy: traverse all shapes, all rings
    curvesMm.forEach((shape) => {
        shape.forEach((curve) => {
            if (!curve.length) return;
            const pointsAttr = curve
                .map((pt) => `${pt.x.toFixed(3)},${pt.y.toFixed(3)}`)
                .join(' ');

            svgParts.push(
                `<polyline points="${pointsAttr}" stroke="#000000" stroke-width="${strokeWidthMm}" fill="none" stroke-linecap="round" stroke-linejoin="round" />`
            );
        });
    });

    return svgParts.join('\n');
}

function exportToSVG() {
    const svgBody = buildSvgContent();
    const svg = [
        `<svg xmlns="http://www.w3.org/2000/svg"`,
        `     width="${A4_WIDTH}mm" height="${A4_HEIGHT}mm"`,
        `     viewBox="0 0 ${A4_WIDTH} ${A4_HEIGHT}">`,
        svgBody,
        `</svg>`
    ].join('\n');

    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    link.download = `figure-study-3-${date}.svg`;
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
