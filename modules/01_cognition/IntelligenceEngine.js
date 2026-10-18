/**
 * HSDXD Simverse 5 — Psychology Power System
 * File: modules/01_cognition/IntelligenceEngine.js
 * 
 * Factor 1.1: Intelligence Engine.
 * 
 * INVARIANTS:
 * - Mathematical capability evaluation against compiled problem demand.
 * - Capability Gap: Δ = I - D.
 * - Logistic Success Probability: P(success) = 1 / (1 + e^(-k * Δ)).
 * - Cognitive Work capacity W and process efficiency η(I).
 * - Emits standardized cognitive events (strain, overload, comprehension failure).
 */

'use strict';

const { clamp } = require('../../core/Types.js');

const LOGISTIC_K = 0.12; // Sharpness of capability gap transition
const BASELINE_EFFICIENCY = 0.15; // Minimum process efficiency floor

class IntelligenceEngine {
    /**
     * Evaluate agent's Intelligence against compiled problem demand
     * @param {object} intelligenceState { latentMean: number, uncertainty: number }
     * @param {object} compiledComplexity Output from ComplexityCompiler
     * @returns {object} Comprehensive cognitive evaluation result
     */
    static evaluate(intelligenceState, compiledComplexity) {
        const I = clamp(intelligenceState.latentMean ?? 50, 0, 100, "Agent Latent Intelligence");
        const D = clamp(compiledComplexity.effectiveDemand ?? 50, 0, 100, "Effective Demand");
        const { C, N, A, U, S } = compiledComplexity.demandVector;

        // 1. Core Capability Gap
        const capabilityGap = I - D; // Range: [-100, 100]

        // 2. Logistic Success Probability
        const successProbability = 1.0 / (1.0 + Math.exp(-LOGISTIC_K * capabilityGap));

        // 3. Process Efficiency η(I) on [0.15, 1.0]
        // Higher intelligence increases efficiency non-linearly
        const processEfficiency = BASELINE_EFFICIENCY + (1.0 - BASELINE_EFFICIENCY) * Math.pow(I / 100.0, 1.5);

        // 4. Required Cognitive Work W(D)
        const cognitiveWork = Math.pow(D / 10.0, 2.0) * (1.0 + (U / 100.0));

        // 5. Estimated Process Time T = W / η
        const processTime = cognitiveWork / processEfficiency;

        // 6. Generate Standardized Cognitive Events
        const cognitiveEvents = [];

        if (capabilityGap < -20 || (A > 75 && I < 50)) {
            cognitiveEvents.push({
                type: "comprehension_failure",
                severity: "high",
                reason: "Problem demand significantly exceeds latent cognitive capability ceiling."
            });
        }

        if (capabilityGap >= -20 && capabilityGap < 15) {
            cognitiveEvents.push({
                type: "cognitive_strain",
                severity: capabilityGap < 0 ? "moderate" : "mild",
                reason: "Problem demand is near the boundary of available cognitive capacity."
            });
        }

        if (capabilityGap >= 20 && !cognitiveEvents.some(e => e.type === "comprehension_failure")) {
            cognitiveEvents.push({
                type: "comfortable_cognitive_capacity",
                severity: "none",
                reason: "Problem is comfortably within operational capability limits."
            });
        }

        return {
            calculation: {
                latentIntelligence: Number(I.toFixed(2)),
                effectiveDemand: Number(D.toFixed(2)),
                capabilityGap: Number(capabilityGap.toFixed(2)),
                successProbability: Number(successProbability.toFixed(4)),
                processEfficiency: Number(processEfficiency.toFixed(4)),
                cognitiveWork: Number(cognitiveWork.toFixed(2)),
                estimatedProcessTime: Number(processTime.toFixed(2))
            },
            cognitiveEvents,
            demandBreakdown: { C, N, A, U, S }
        };
    }
}

module.exports = {
    IntelligenceEngine,
    LOGISTIC_K
};