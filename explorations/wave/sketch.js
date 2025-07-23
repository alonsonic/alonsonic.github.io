// --- Configuration ---
const FONT_WIDTH = 6;
const FONT_HEIGHT = 12;

// --- Wave Parameters ---
const WAVES = [
  { amplitude: 3.0, frequency: 0.04, speed: 0.05, offset: 0 },
  { amplitude: 2.0, frequency: 0.06, speed: -0.03, offset: 1.5 },
  { amplitude: 1.0, frequency: 0.1, speed: 0.08, offset: 3.0 },
];

// --- Mouse Interaction Parameters ---
const MOUSE_SPLASH_STRENGTH = 6.0;
const MOUSE_SPLASH_WIDTH = 20;
const SPLASH_DECAY = 0.96;
const MAX_SPLASHES = 15;

// --- Character mapping for the 4-line shimmer effect ---

// Line 1: Top spray (lightest)
const getTopSurfaceChar = (energy) => {
  const absEnergy = Math.abs(energy);
  if (absEnergy > 3.5) return "▓";
  if (absEnergy > 2.0) return "▒";
  if (absEnergy > 0.5) return "░";
  return " "; // Calmest state is empty space
};

// Line 2: Upper water
const getSecondSurfaceChar = (energy) => {
  const absEnergy = Math.abs(energy);
  if (absEnergy > 4.0) return "█";
  if (absEnergy > 2.5) return "▓";
  if (absEnergy > 1.0) return "▒";
  return "░";
};

// Line 3: Mid water (denser)
const getThirdSurfaceChar = (energy) => {
  const absEnergy = Math.abs(energy);
  if (absEnergy > 3.0) return "█";
  if (absEnergy > 1.5) return "▓";
  return "▒";
};

// Line 4: Deep water surface (densest)
const getFourthSurfaceChar = (energy) => {
  const absEnergy = Math.abs(energy);
  if (absEnergy > 2.0) return "█";
  return "▓";
};

class WaveAnimation {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.pre = null;
    this.animationFrameId = null;
    this.dimensions = { width: 0, height: 0 };
    this.time = 0;
    this.splashes = [];
    this.lastMousePos = { x: -1, y: -1 };
    
    this.init();
  }

  init() {
    if (!this.container) return;
    
    // Create pre element for the ASCII art
    this.pre = document.createElement('pre');
    this.pre.style.cssText = `
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      font-family: monospace;
      font-size: 12px;
      line-height: 1;
      white-space: pre;
      overflow: hidden;
      user-select: none;
      cursor: pointer;
      color: #000000;
      background: #ffffff;
    `;
    
    // Override selection color for this element
    this.pre.style.setProperty('--selection-color', 'transparent');
    this.pre.addEventListener('selectstart', (e) => e.preventDefault());
    
    // Add CSS to override selection color
    const style = document.createElement('style');
    style.textContent = `
      #sketch-container pre::selection {
        background: transparent !important;
      }
      #sketch-container pre::-moz-selection {
        background: transparent !important;
      }
    `;
    document.head.appendChild(style);
    
    this.container.appendChild(this.pre);
    
    this.updateDimensions();
    this.drawWaves();
    
    // Add event listeners
    this.container.addEventListener('pointermove', this.handlePointerMove.bind(this));
    
    // Handle resize
    const resizeObserver = new ResizeObserver(() => this.updateDimensions());
    resizeObserver.observe(this.container);
    
    // Start animation
    this.animate();
  }

  updateDimensions() {
    if (!this.container) return;
    const { clientWidth, clientHeight } = this.container;
    this.dimensions = {
      width: Math.floor(clientWidth / FONT_WIDTH),
      height: Math.floor(clientHeight / FONT_HEIGHT),
    };
    this.drawWaves();
  }

  drawWaves() {
    if (!this.pre) return;
    const { width, height } = this.dimensions;
    if (width === 0 || height === 0) return;

    const waterTopLevel = Math.floor(height * 0.67);
    let frame = "";

    for (let y = 0; y < height; y++) {
      let line = "";
      if (y < waterTopLevel) {
        // Above the water
        line = " ".repeat(width);
      } else if (y > waterTopLevel + 3) {
        // Deep water, solid blocks
        line = "█".repeat(width);
      } else {
        // The FOUR shimmering surface lines
        for (let x = 0; x < width; x++) {
          let sineWaveOffset = 0;
          WAVES.forEach((wave) => {
            sineWaveOffset += wave.amplitude * Math.sin(x * wave.frequency + this.time * wave.speed + wave.offset);
          });

          let splashOffset = 0;
          this.splashes.forEach((splash) => {
            const distance = Math.abs(x - splash.x);
            if (distance < MOUSE_SPLASH_WIDTH) {
              const influence = (1 + Math.cos((distance / MOUSE_SPLASH_WIDTH) * Math.PI)) / 2;
              splashOffset += splash.amplitude * influence;
            }
          });
          const totalEnergy = sineWaveOffset + splashOffset;

          // Choose character based on which line we're on
          if (y === waterTopLevel) {
            line += getTopSurfaceChar(totalEnergy);
          } else if (y === waterTopLevel + 1) {
            line += getSecondSurfaceChar(totalEnergy);
          } else if (y === waterTopLevel + 2) {
            line += getThirdSurfaceChar(totalEnergy);
          } else {
            // y === waterTopLevel + 3
            line += getFourthSurfaceChar(totalEnergy);
          }
        }
      }
      frame += line + "\n";
    }
    this.pre.textContent = frame;
  }

  animate() {
    this.time += 0.1;
    this.splashes = this.splashes
      .map((splash) => ({ ...splash, amplitude: splash.amplitude * SPLASH_DECAY }))
      .filter((splash) => splash.amplitude > 0.1);
    this.drawWaves();
    this.animationFrameId = requestAnimationFrame(() => this.animate());
  }

  handlePointerMove(e) {
    if (!this.container) return;
    const rect = this.container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const gridX = Math.floor(x / FONT_WIDTH);

    if (gridX !== this.lastMousePos.x) {
      this.lastMousePos.x = gridX;
      if (this.splashes.length < MAX_SPLASHES) {
        this.splashes.push({ x: gridX, amplitude: MOUSE_SPLASH_STRENGTH });
      }
    }
  }

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.container && this.pre) {
      this.container.removeChild(this.pre);
    }
  }
}

// Initialize the wave animation when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new WaveAnimation('sketch-container');
}); 