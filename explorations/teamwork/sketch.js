// Mathematical easing function for smooth animation
function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// --- Animation Configuration ---
const LINGER_DURATION = 5000; // How long the exploded state is held motionless
const REST_DURATION = 5000; // How long the circle is held motionless
const PARTICLE_TRAVEL_TIME_MIN = 25000; // Minimum time for a particle's journey
const PARTICLE_TRAVEL_TIME_MAX = 30000; // Maximum time for a particle's journey
const MIN_TRAVEL_DISTANCE = 150;
const MAX_TRAVEL_DISTANCE = 200;
/** The time window over which particles will start their journeys. A higher value means more staggered starts. */
const STAGGER_DURATION = 15000;
/** Tweak this value (1-100) to change the percentage of particles that explode. */
const ACTIVE_PARTICLE_PERCENTAGE = 100;

// The different phases of the entire animation cycle
// type GlobalPhase = "RESTING" | "EXPLODING" | "LINGERING_EXPLODED" | "REFORMING"
// A particle's individual state
// type ParticleState = "at_origin" | "exploding" | "exploded_idle" | "reforming"

class Particle {
    constructor(x, y) {
        this.originX = x;
        this.originY = y;
        this.x = x;
        this.y = y;
        this.destinationX = x;
        this.destinationY = y;
        this.size = 2.2;
        this.state = "at_origin";
        this.animationStartTime = 0;
        this.scheduledStartTime = 0;
        this.travelTime = 0;
        this.isActiveInCycle = false;
    }

    // Assign a random destination and start the journey
    startExplosion(startTime) {
        if (!this.isActiveInCycle || this.state !== "at_origin") return;
        const angle = Math.random() * Math.PI * 2;
        const force = MIN_TRAVEL_DISTANCE + Math.random() * (MAX_TRAVEL_DISTANCE - MIN_TRAVEL_DISTANCE);
        this.destinationX = this.originX + Math.cos(angle) * force;
        this.destinationY = this.originY + Math.sin(angle) * force;
        this.state = "exploding";
        this.animationStartTime = startTime;
        this.travelTime = PARTICLE_TRAVEL_TIME_MIN + Math.random() * (PARTICLE_TRAVEL_TIME_MAX - PARTICLE_TRAVEL_TIME_MIN);
    }

    // Begin the journey back to the origin
    startReform(startTime) {
        if (!this.isActiveInCycle || this.state !== "exploded_idle") return;
        this.state = "reforming";
        this.animationStartTime = startTime;
        this.travelTime = PARTICLE_TRAVEL_TIME_MIN + Math.random() * (PARTICLE_TRAVEL_TIME_MAX - PARTICLE_TRAVEL_TIME_MIN);
    }

    update(currentTime) {
        if (this.state === "at_origin" || this.state === "exploded_idle" || !this.isActiveInCycle) return;

        const elapsed = currentTime - this.animationStartTime;
        let progress = 0;

        if (this.state === "exploding") {
            if (elapsed >= this.travelTime) {
                progress = 1;
                this.state = "exploded_idle"; // Reached destination, now idle
            } else {
                progress = elapsed / this.travelTime;
            }
        } else if (this.state === "reforming") {
            if (elapsed >= this.travelTime) {
                this.reset(); // Journey is over, reset completely
                return;
            } else {
                progress = 1 - elapsed / this.travelTime;
            }
        }

        const easedProgress = easeInOutCubic(progress);
        this.x = this.originX + (this.destinationX - this.originX) * easedProgress;
        this.y = this.originY + (this.destinationY - this.originY) * easedProgress;
    }

    // Reset the particle to its starting state
    reset() {
        this.x = this.originX;
        this.y = this.originY;
        this.destinationX = this.originX;
        this.destinationY = this.originY;
        this.state = "at_origin";
        // this.isActiveInCycle = false; //
    }

    draw(ctx) {
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }
}

// Global animation state
let canvas;
let ctx;
let particles = [];
let globalPhase = "RESTING";
let phaseChangeTime = 0;
let animationFrameId;

function initCircleParticles() {
    const radius = 175;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const pointInCircle = (x, y) => {
        const dx = x - centerX;
        const dy = y - centerY;
        return dx * dx + dy * dy <= radius * radius;
    };

    const newParticles = [];
    const sampling = 4;

    for (let y = 0; y < canvas.height; y += sampling) {
        for (let x = 0; x < canvas.width; x += sampling) {
            if (pointInCircle(x, y)) {
                newParticles.push(new Particle(x, y));
            }
        }
    }
    particles = newParticles;
}

function animate(time) {
    if (phaseChangeTime === 0) phaseChangeTime = time;

    if (!canvas || !ctx) return;

    if (particles.length === 0) {
        initCircleParticles();
    }

    const phaseElapsed = time - phaseChangeTime;
    const activeParticles = particles.filter(p => p.isActiveInCycle);

    // --- Global State Machine ---
    switch (globalPhase) {
        case "RESTING":
            if (phaseElapsed > REST_DURATION) {
                globalPhase = "EXPLODING";
                phaseChangeTime = time;
                particles.forEach(p => {
                    p.isActiveInCycle = Math.random() < ACTIVE_PARTICLE_PERCENTAGE / 100;
                    if (p.isActiveInCycle) {
                        p.scheduledStartTime = time + Math.random() * STAGGER_DURATION;
                    }
                });
            }
            break;

        case "EXPLODING":
            activeParticles.forEach(p => {
                if (p.state === "at_origin" && time >= p.scheduledStartTime) {
                    p.startExplosion(p.scheduledStartTime);
                }
            });
            const allExploded = activeParticles.every(p => p.state === "exploded_idle");
            if (allExploded && activeParticles.length > 0) {
                globalPhase = "LINGERING_EXPLODED";
                phaseChangeTime = time;
            }
            break;

        case "LINGERING_EXPLODED":
            if (phaseElapsed > LINGER_DURATION) {
                globalPhase = "REFORMING";
                phaseChangeTime = time;
                activeParticles.forEach(p => {
                    p.scheduledStartTime = time + Math.random() * STAGGER_DURATION;
                });
            }
            break;

        case "REFORMING":
            activeParticles.forEach(p => {
                if (p.state === "exploded_idle" && time >= p.scheduledStartTime) {
                    p.startReform(p.scheduledStartTime);
                }
            });
            const allReformed = activeParticles.every(p => p.state === "at_origin");
            if (allReformed && activeParticles.length > 0) {
                globalPhase = "RESTING";
                phaseChangeTime = time;
                // Deactivate all particles now that the cycle is fully complete.
                particles.forEach(p => p.isActiveInCycle = false);
            }
            break;
    }

    // --- Drawing & Particle Updates ---
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";

    particles.forEach(p => {
        if (globalPhase !== "LINGERING_EXPLODED" && globalPhase !== "RESTING") {
            p.update(time);
        }
        p.draw(ctx);
    });

    animationFrameId = requestAnimationFrame(animate);
}

// Initialize the animation when the page loads
function init() {
    canvas = document.getElementById('artCanvas');
    ctx = canvas.getContext('2d');
    
    if (!canvas || !ctx) {
        console.error('Canvas not found or context not available');
        return;
    }

    // Start the animation loop
    animationFrameId = requestAnimationFrame(animate);
}

// Clean up function
function cleanup() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
}

// Start the animation when the page loads
document.addEventListener('DOMContentLoaded', init);

// Clean up when the page unloads
window.addEventListener('beforeunload', cleanup); 