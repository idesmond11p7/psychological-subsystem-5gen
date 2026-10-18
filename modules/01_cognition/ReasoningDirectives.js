/**
 * HSDXD Simverse 5 — Psychology Power System
 * File: modules/01_cognition/ReasoningDirectives.js
 * 
 * Factor 1.2: Reasoning Directives Translator.
 * 
 * INVARIANTS:
 * - Translates mathematical Intelligence output into qualitative LLM execution conditions.
 * - Enforces accessibility tiers (accessible, challenging, severe_struggle, inaccessible).
 * - Enforces hard outcome boundaries (solutionPermitted, flawlessResolutionPermitted).
 * - Incorporates the character's qualitative Reasoning Profile.
 */

'use strict';

class ReasoningDirectives {
    /**
     * Generate qualitative execution directives for prompt compilation and validation
     * @param {object} intelResult Output from IntelligenceEngine.evaluate()
     * @param {object} [reasoningProfile] Character reasoning profile
     * @returns {object} Standardized Reasoning Directives payload
     */
    static generate(intelResult, reasoningProfile = {}) {
        const gap = intelResult.calculation.capabilityGap;
        const events = intelResult.cognitiveEvents.map(e => e.type);

        // 1. Determine Accessibility Tier
        let accessibility = "accessible";
        if (gap < -20) {
            accessibility = "inaccessible";
        } else if (gap < -5) {
            accessibility = "severe_struggle";
        } else if (gap < 15) {
            accessibility = "challenging";
        }

        // 2. Active Cognitive Conditions
        const conditions = {
            experiencingStrain: events.includes("cognitive_strain") || events.includes("comprehension_failure"),
            comprehensionLimited: events.includes("comprehension_failure"),
            capacityComfortable: events.includes("comfortable_cognitive_capacity")
        };

        // 3. Hard Outcome Constraints (Authoritative simulation boundary)
        const outcomeConstraint = {
            // Hard barrier: If problem is inaccessible or comprehension failed, solution is FORBIDDEN
            solutionPermitted: !conditions.comprehensionLimited && gap > -20,
            
            // Flawless deduction requires comfortable capability gap
            flawlessResolutionPermitted: gap >= 20 && !conditions.experiencingStrain
        };

        // 4. Character Reasoning Profile Integration
        const profile = {
            style: reasoningProfile.style || "analytical",
            explorationBreadth: reasoningProfile.explorationBreadth ?? 0.5,
            verificationRigor: reasoningProfile.verificationRigor ?? 0.7,
            backtrackingPatience: reasoningProfile.backtrackingPatience ?? 0.4,
            heuristicReliance: reasoningProfile.heuristicReliance ?? 0.3
        };

        return {
            cognitiveAccessibility: accessibility,
            conditions,
            outcomeConstraint,
            profile,
            metrics: {
                capabilityGap: gap,
                successProbability: intelResult.calculation.successProbability
            }
        };
    }
}

module.exports = {
    ReasoningDirectives
};