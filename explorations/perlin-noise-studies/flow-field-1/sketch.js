// Flow Field #1
// All coordinates in millimeters (210mm x 297mm)

const A4_WIDTH = 210;
const A4_HEIGHT = 297;

// --- Configuration ---
const CONFIG = {
    gridCols: 40,           // Grid for starting points
    gridRows: 6,
    marginMm: 20,           // Margin around the page
    numSteps: 9000,           // How long each line is
    stepLength: 0.1,        // Length of each segment
    noiseScale: 0.0015,       // Scale of the noise (smaller = smoother)
    noiseZ: 0.0,            // Seed/Z-offset for noise
    distortion: 1.5,        // Magnitude of angle distortion
};

let canvas, ctx, scale, canvasWidth, canvasHeight;
let curvesMm = []; 

// --- Perlin Noise Implementation (Simple 2D) ---
// Ported/Simplified for standalone usage
const Noise = (function() {
    // Permutation table
    const p = new Uint8Array(512);
    const permutation = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
    for (let i=0; i < 256 ; i++) p[256+i] = p[i] = permutation[i];

    function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    function lerp(t, a, b) { return a + t * (b - a); }
    function grad(hash, x, y, z) {
        const h = hash & 15;
        const u = h<8 ? x : y, v = h<4 ? y : h==12||h==14 ? x : z;
        return ((h&1) == 0 ? u : -u) + ((h&2) == 0 ? v : -v);
    }

    return {
        perlin2: function(x, y) {
            const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
            x -= Math.floor(x); y -= Math.floor(y);
            const u = fade(x), v = fade(y);
            const A = p[X]+Y, AA = p[A], AB = p[A+1], B = p[X+1]+Y, BA = p[B], BB = p[B+1];
            return lerp(v, lerp(u, grad(p[AA], x, y, 0), grad(p[BA], x-1, y, 0)),
                           lerp(u, grad(p[AB], x, y-1, 0), grad(p[BB], x-1, y-1, 0)));
        }
    };
})();


function setup() {
    canvas = document.getElementById('preview-canvas');
    ctx = canvas.getContext('2d');
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    
    // Seed noise with random z if desired, or just use 0
    CONFIG.noiseZ = Math.random() * 100;
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

    draw();
}

function mmToPx(x, y) {
    return [x * scale, y * scale];
}

function getFlowAngle(x, y) {
    // Basic perlin noise flow
    // x, y in mm
    const val = Noise.perlin2(x * CONFIG.noiseScale, y * CONFIG.noiseScale);
    // map -1..1 to angle
    return val * Math.PI * 2 * CONFIG.distortion;
}

function generateFlowField() {
    curvesMm = [];

    const startX = CONFIG.marginMm;
    const startY = CONFIG.marginMm;
    const endX = A4_WIDTH - CONFIG.marginMm;
    const endY = A4_HEIGHT - CONFIG.marginMm;
    
    const w = endX - startX;
    const h = endY - startY;
    
    const stepX = w / CONFIG.gridCols;
    const stepY = h / CONFIG.gridRows;

    for (let c = 0; c <= CONFIG.gridCols; c++) {
        for (let r = 0; r <= CONFIG.gridRows; r++) {
            let x = startX + c * stepX;
            let y = startY + r * stepY;
            
            const points = [];
            points.push({x, y});

            for (let s = 0; s < CONFIG.numSteps; s++) {
                const angle = getFlowAngle(x, y);
                
                const dx = Math.cos(angle) * CONFIG.stepLength;
                const dy = Math.sin(angle) * CONFIG.stepLength;
                
                x += dx;
                y += dy;
                
                // Stop if out of bounds
                if (x < CONFIG.marginMm || x > A4_WIDTH - CONFIG.marginMm || 
                    y < CONFIG.marginMm || y > A4_HEIGHT - CONFIG.marginMm) {
                    break;
                }
                
                points.push({x, y});
            }
            
            if (points.length > 1) {
                curvesMm.push(points);
            }
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // White background
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    generateFlowField();
    
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.0 / scale; // ~1px visual
    
    curvesMm.forEach(points => {
        ctx.beginPath();
        const start = mmToPx(points[0].x, points[0].y);
        ctx.moveTo(start[0], start[1]);
        
        for (let i = 1; i < points.length; i++) {
            const pt = mmToPx(points[i].x, points[i].y);
            ctx.lineTo(pt[0], pt[1]);
        }
        ctx.stroke();
    });
}

// --- SVG Export ---
function exportToSVG() {
    const strokeWidthMm = 0.25;
    const svgParts = [];

    curvesMm.forEach((points) => {
        if (points.length < 2) return;
        const pointsAttr = points
            .map((pt) => `${pt.x.toFixed(3)},${pt.y.toFixed(3)}`)
            .join(' ');

        svgParts.push(
            `<polyline points="${pointsAttr}" stroke="#000000" stroke-width="${strokeWidthMm}" fill="none" stroke-linecap="round" stroke-linejoin="round" />`
        );
    });

    const svg = [
        `<svg xmlns="http://www.w3.org/2000/svg"`,
        `     width="${A4_WIDTH}mm" height="${A4_HEIGHT}mm"`,
        `     viewBox="0 0 ${A4_WIDTH} ${A4_HEIGHT}">`,
        svgParts.join('\n'),
        `</svg>`
    ].join('\n');

    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    link.download = `flow-field-1-${date}.svg`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded', () => {
    setup();
    // Check for SVG trigger in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('svg') || window.location.hash === '#svg') {
        setTimeout(exportToSVG, 500); 
    }
});
