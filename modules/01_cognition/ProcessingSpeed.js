/**
 * HSDXD Simverse 5 — Psychology Power System
 * File: modules/01_cognition/ProcessingSpeed.js
 * 
 * Factor 1.10: Processing Speed.
 * 
 * INVARIANTS:
 * - Strict quantitative rate stat in [0, 100]. Baseline = 50.0.
 * - Style-neutral, quality-neutral, depth-neutral: measures temporal rate only.
 * - Computes processing latency and cognitive throughput modifiers.
 */

'use strict';

const { clamp } = require('../../core/Types.js');

const BASELINE_SPEED = 50.0;

class ProcessingSpeed {
    /**
     * Calculate temporal throughput and latency modifier
     * @param {number} rawSpeed Processing speed stat in [0, 100]
     * @param {object} [modifiers] Temporary modifiers (fatigue, strain)
     * @returns {object} { effectiveSpeed, latencyMultiplier, throughputRate }
     */
    static calculate(rawSpeed = BASELINE_SPEED, modifiers = {}) {
        const base = clamp(rawSpeed, 1, 100, "ProcessingSpeed");

        let penalty = 0;
        if (modifiers.cognitiveStrain) penalty += 15.0;
        if (modifiers.fatigue) penalty += 20.0;

        const effectiveSpeed = clamp(base - penalty, 1, 100, "Effective Processing Speed");

        // Latency multiplier: Speed 50 -> 1.0x, Speed 100 -> 0.4x (fast), Speed 10 -> 2.5x (slow)
        const latencyMultiplier = clamp(
            1.0 + (BASELINE_SPEED - effectiveSpeed) * 0.03,
            0.3,
            3.5,
            "Latency Multiplier"
        );

        // Throughput rate: Operations processed per standard simulation tick
        const throughputRate = Number((effectiveSpeed / BASELINE_SPEED).toFixed(2));

        return {
            baseSpeed: Number(base.toFixed(2)),
            effectiveSpeed: Number(effectiveSpeed.toFixed(2)),
            latencyMultiplier: Number(latencyMultiplier.toFixed(2)),
            throughputRate
        };
    }
}

module.exports = {
    ProcessingSpeed,
    BASELINE_SPEED
};