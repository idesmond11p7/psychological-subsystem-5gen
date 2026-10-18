/**
 * HSDXD Simverse 5 — Psychology Power System
 * File: runtime/ContextCompiler.js
 * 
 * Compiles internal cognitive state into a compact prompt directive.
 * 
 * INVARIANTS:
 * - Token Budget Cap: strictly < 250 tokens.
 * - ContextCompiler is a state projection layer; it does NOT own character state.
 * - Communicates qualitative cognitive conditions and hard simulation boundaries.
 */

'use strict';

class ContextCompiler {
    /**
     * Compile active cognitive state into a compact directive block
     * @param {object} params
     * @param {string} params.agentId Character identifier
     * @param {object} params.directives Output from ReasoningDirectives.generate()
     * @param {object} [params.speedResult] Output from ProcessingSpeed.calculate()
     * @returns {string} Injected prompt block
     */
    static compile(params) {
        const { agentId, directives, speedResult } = params;
        const { cognitiveAccessibility, conditions, outcomeConstraint, profile, metrics } = directives;

        const lines = [];
        lines.push(`[SIMVERSE_COGNITION_DIRECTIVE: ${agentId}]`);

        // 1. Accessibility & Cognitive Friction
        const accessStr = cognitiveAccessibility.toUpperCase();
        lines.push(`- ACCESSIBILITY: ${accessStr} (Gap Δ: ${metrics.capabilityGap > 0 ? '+' : ''}${metrics.capabilityGap})`);

        // 2. Active Conditions
        const conditionTags = [];
        if (conditions.experiencingStrain) conditionTags.push('ACTIVE_COGNITIVE_STRAIN');
        if (conditions.comprehensionLimited) conditionTags.push('COMPREHENSION_LIMITED');
        if (conditions.capacityComfortable) conditionTags.push('CAPACITY_COMFORTABLE');
        lines.push(`- CONDITIONS: [${conditionTags.join(', ')}]`);

        // 3. Hard Simulation Outcome Constraints
        if (!outcomeConstraint.solutionPermitted) {
            lines.push(`- MANDATE: SOLUTION_FORBIDDEN.`);
            lines.push(`  Trajectory constraint: Problem demand exceeds capacity. Character CANNOT resolve or correctly deduce the solution this turn. Must express uncertainty, dead-end, or pursue an incomplete hypothesis.`);
        } else if (!outcomeConstraint.flawlessResolutionPermitted) {
            lines.push(`- MANDATE: FLAWLESS_RESOLUTION_FORBIDDEN.`);
            lines.push(`  Trajectory constraint: Solution is accessible, but resolution must reflect cognitive friction, verification steps, or intermediate uncertainty.`);
        } else {
            lines.push(`- MANDATE: COMFORTABLE_RESOLUTION_PERMITTED.`);
        }

        // 4. Character Reasoning Profile
        const styleStr = profile.style.toUpperCase();
        const verifStr = profile.verificationRigor > 0.6 ? 'HIGH' : (profile.verificationRigor < 0.4 ? 'LOW' : 'MODERATE');
        const breadthStr = profile.explorationBreadth > 0.6 ? 'BROAD' : (profile.explorationBreadth < 0.4 ? 'NARROW' : 'MODERATE');
        lines.push(`- REASONING_STYLE: ${styleStr} | Verification: ${verifStr} | Hypothesis Breadth: ${breadthStr}`);

        // 5. Processing Speed / Temporal Latency
        if (speedResult && speedResult.latencyMultiplier > 1.3) {
            lines.push(`- TEMPORAL: Slowed processing rate (${speedResult.latencyMultiplier}x latency).`);
        } else if (speedResult && speedResult.latencyMultiplier < 0.7) {
            lines.push(`- TEMPORAL: Rapid cognitive throughput (${speedResult.throughputRate}x rate).`);
        }

        lines.push(`- MACHINE_OUTPUT_REQUIRED: Append <!-- SIMVERSE_OUT { "claimedResolution": boolean, "strainObserved": boolean } --> to generation.`);

        return lines.join('\n');
    }
}

module.exports = {
    ContextCompiler
};