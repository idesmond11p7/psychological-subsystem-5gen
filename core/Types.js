/**
 * HSDXD Simverse 5 — Psychology Power System
 * File: core/Types.js
 * 
 * Foundational mathematical primitives, distributions, timescale models,
 * PRNG abstractions, and schema validation structures.
 * 
 * INVARIANTS:
 * - Deterministic / Seedable: Zero naked Math.random() calls.
 * - Non-RPG representation: Uses distributions and continuous bounds.
 * - Pure JavaScript (Node.js & Browser compatible).
 */

'use strict';

// ============================================================================
// 1. DETERMINISTIC PRNG (Mulberry32)
// ============================================================================

class PRNG {
    /**
     * @param {number|string} seed
     */
    constructor(seed = 1337) {
        this._initialSeed = this._hashSeed(seed);
        this._state = this._initialSeed;
    }

    _hashSeed(seed) {
        if (typeof seed === 'number') return (seed >>> 0) || 1;
        let str = String(seed);
        let hash = 1779033703 ^ str.length;
        for (let i = 0; i < str.length; i++) {
            hash = Math.imul(hash ^ str.charCodeAt(i), 3432918353);
            hash = (hash << 13) | (hash >>> 19);
        }
        return (hash >>> 0) || 1;
    }

    /**
     * Returns a pseudo-random float in [0, 1)
     * @returns {number}
     */
    next() {
        let t = (this._state += 0x6D2B79F5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    /**
     * Returns pseudo-random integer in [min, max]
     * @param {number} min
     * @param {number} max
     * @returns {number}
     */
    nextInt(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    /**
     * Standard Normal (Box-Muller transform)
     * @returns {number} mean=0, std=1
     */
    nextGaussian() {
        let u = 0, v = 0;
        while (u === 0) u = this.next();
        while (v === 0) v = this.next();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    reset() {
        this._state = this._initialSeed;
    }
}

const DefaultPRNG = new PRNG(42);

// ============================================================================
// 2. MATHEMATICAL DISTRIBUTIONS & BOUNDED SCALARS
// ============================================================================

function sampleGamma(shape, scale = 1.0, prng = DefaultPRNG) {
    if (shape < 1.0) {
        return sampleGamma(shape + 1.0, scale, prng) * Math.pow(prng.next(), 1.0 / shape);
    }
    const d = shape - 1.0 / 3.0;
    const c = 1.0 / Math.sqrt(9.0 * d);
    while (true) {
        let x, v;
        do {
            x = prng.nextGaussian();
            v = 1.0 + c * x;
        } while (v <= 0.0);
        v = v * v * v;
        const u = prng.next();
        if (u < 1.0 - 0.0331 * x * x * x * x) {
            return d * v * scale;
        }
        if (Math.log(u) < 0.5 * x * x + d * (1.0 - v + Math.log(v))) {
            return d * v * scale;
        }
    }
}

class BoundedBetaDistribution {
    /**
     * @param {number} alpha Shape parameter alpha > 0
     * @param {number} beta  Shape parameter beta > 0
     * @param {number} min   Lower coordinate bound (default: 0)
     * @param {number} max   Upper coordinate bound (default: 100)
     */
    constructor(alpha, beta, min = 0, max = 100) {
        if (typeof alpha !== 'number' || typeof beta !== 'number' || alpha <= 0 || beta <= 0) {
            throw new Error(`[BetaDist] Invalid parameters: alpha=${alpha}, beta=${beta}. Both must be > 0.`);
        }
        this.alpha = alpha;
        this.beta = beta;
        this.min = min;
        this.max = max;
    }

    static fromMeanAndUncertainty(mean, uncertainty, min = 0, max = 100) {
        const range = max - min;
        const normalizedMean = Math.max(0.01, Math.min(0.99, (mean - min) / range));
        const maxVar = normalizedMean * (1 - normalizedMean);
        const normalizedVar = Math.max(0.0001, Math.min(maxVar * 0.9, Math.pow(uncertainty / range, 2)));

        const factor = (normalizedMean * (1 - normalizedMean) / normalizedVar) - 1;
        const alpha = Math.max(0.1, normalizedMean * factor);
        const beta = Math.max(0.1, (1 - normalizedMean) * factor);

        return new BoundedBetaDistribution(alpha, beta, min, max);
    }

    get mean() {
        const normMean = this.alpha / (this.alpha + this.beta);
        return this.min + normMean * (this.max - this.min);
    }

    get variance() {
        const a = this.alpha, b = this.beta;
        const normVar = (a * b) / (Math.pow(a + b, 2) * (a + b + 1));
        return normVar * Math.pow(this.max - this.min, 2);
    }

    get standardDeviation() {
        return Math.sqrt(this.variance);
    }

    sample(prng = DefaultPRNG) {
        const ga = sampleGamma(this.alpha, 1.0, prng);
        const gb = sampleGamma(this.beta, 1.0, prng);
        const normSample = ga / (ga + gb);
        return this.min + normSample * (this.max - this.min);
    }

    toJSON() {
        return {
            type: "BoundedBetaDistribution",
            alpha: Number(this.alpha.toFixed(4)),
            beta: Number(this.beta.toFixed(4)),
            min: this.min,
            max: this.max,
            mean: Number(this.mean.toFixed(2)),
            std: Number(this.standardDeviation.toFixed(2))
        };
    }

    static fromJSON(json) {
        return new BoundedBetaDistribution(json.alpha, json.beta, json.min, json.max);
    }
}

// ============================================================================
// 3. TIMESCALE ENUMERATIONS (5-Tier Timescale Hierarchy)
// ============================================================================

const Timescale = Object.freeze({
    TRAIT: 'trait',           // Stable dispositions / baselines (Intelligence, processing speed)
    PERSISTENT: 'persistent', // Retained state (Beliefs, knowledge, schemas)
    TRANSIENT: 'transient',   // Active activations (Cognitive strain, current problem load)
    EVENT: 'event',           // Discrete occurrences (Premise dropped, error encountered)
    HISTORY: 'history'        // Consolidated chronological trace
});

// ============================================================================
// 4. VALIDATION & SANITY PRIMITIVES
// ============================================================================

function clamp(value, min, max, paramName = "Value") {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        throw new TypeError(`[Validation Error] ${paramName} must be a valid number. Got: ${value}`);
    }
    return Math.max(min, Math.min(max, value));
}

function ensureWithinRange(value, min, max, paramName = "Value") {
    if (typeof value !== 'number' || Number.isNaN(value) || value < min || value > max) {
        throw new RangeError(`[Validation Error] ${paramName} (${value}) out of bounds [${min}, ${max}].`);
    }
    return value;
}

// ============================================================================
// 5. CUSTOM SIMULATION ERRORS
// ============================================================================

class SimulationError extends Error {
    constructor(message, context = {}) {
        super(message);
        this.name = this.constructor.name;
        this.context = context;
    }
}

class ValidationError extends SimulationError {}
class AuthorityViolationError extends SimulationError {}
class StateMutationError extends SimulationError {}

module.exports = {
    PRNG,
    DefaultPRNG,
    BoundedBetaDistribution,
    Timescale,
    clamp,
    ensureWithinRange,
    SimulationError,
    ValidationError,
    AuthorityViolationError,
    StateMutationError
};