/**
 * HSDXD Simverse 5 — Psychology Power System
 * File: runtime/OutputValidator.js
 * 
 * Machine output parser and authority validation gate.
 * 
 * INVARIANTS:
 * - Intercepts raw LLM response, extracts <!-- SIMVERSE_OUT --> machine tag.
 * - Strips machine tags from prose before rendering to user.
 * - Enforces simulation authority: rejects ILLEGAL_RESOLUTION, UNEARNED_PERFECTION.
 * - Fails safely: malformed tags do not crash runtime.
 */

'use strict';

const { GlobalEventBus, SimulationEvents } = require('../core/EventBus.js');

class OutputValidator {
    /**
     * Extract machine-readable payload from raw LLM output
     * @param {string} rawText 
     * @returns {object} { sanitizedText: string, payload: object|null, rawTag: string|null }
     */
    static extractPayload(rawText) {
        if (!rawText || typeof rawText !== 'string') {
            return { sanitizedText: '', payload: null, rawTag: null };
        }

        // Regex matches <!-- SIMVERSE_OUT { ... } --> across newlines
        const tagRegex = /<!--\s*SIMVERSE_OUT\s*([\s\S]*?)\s*-->/i;
        const match = tagRegex.exec(rawText);

        if (!match) {
            return {
                sanitizedText: rawText.trim(),
                payload: null,
                rawTag: null
            };
        }

        const rawJson = match[1].trim();
        const sanitizedText = rawText.replace(tagRegex, '').trim();

        let payload = null;
        try {
            payload = JSON.parse(rawJson);
        } catch (err) {
            console.warn('[OutputValidator] Malformed JSON in <!-- SIMVERSE_OUT --> tag:', err.message);
        }

        return {
            sanitizedText,
            payload,
            rawTag: match[0]
        };
    }

    /**
     * Validate extracted payload against authoritative simulation directives
     * @param {object} extractedOutput Output from extractPayload()
     * @param {object} directives Output from ReasoningDirectives.generate()
     * @returns {object} Validation result
     */
    static validate(extractedOutput, directives) {
        const { payload, sanitizedText } = extractedOutput;
        const violations = [];
        const warnings = [];

        // 1. Check for missing payload
        if (!payload) {
            warnings.push("MISSING_MACHINE_PAYLOAD: LLM did not provide structured <!-- SIMVERSE_OUT --> block. Running fallback validation.");
        }

        const claimedResolution = Boolean(payload?.claimedResolution);
        const zeroMistakesClaimed = Boolean(payload?.zeroMistakesClaimed);
        const strainObserved = Boolean(payload?.strainObserved);

        // 2. HARD VIOLATION: Illegal Resolution
        if (!directives.outcomeConstraint.solutionPermitted && claimedResolution) {
            violations.push(
                "ILLEGAL_RESOLUTION: Character claimed a valid problem solution, but the problem is outside the authoritative cognitive capability boundary (solutionPermitted = false)."
            );
        }

        // 3. HARD VIOLATION: Unearned Perfection
        if (!directives.outcomeConstraint.flawlessResolutionPermitted && claimedResolution && zeroMistakesClaimed) {
            violations.push(
                "UNEARNED_PERFECTION: Resolution was claimed as flawless without sufficient capability comfort."
            );
        }

        // 4. SOFT WARNING: Missing Strain
        if (directives.conditions.experiencingStrain && !strainObserved && payload) {
            warnings.push(
                "MISSING_STRAIN_FLAG: Active cognitive strain was required by directives, but the output did not indicate strain observed."
            );
        }

        const isValid = violations.length === 0;

        if (!isValid) {
            GlobalEventBus.emit(SimulationEvents.VALIDATION_VIOLATION, {
                violations,
                warnings,
                directives,
                payload
            });
        } else {
            GlobalEventBus.emit(SimulationEvents.VALIDATION_PASSED, {
                warnings,
                payload
            });
        }

        return {
            isValid,
            violations,
            warnings,
            sanitizedText,
            payload: payload || {
                claimedResolution: false,
                strainObserved: directives.conditions.experiencingStrain
            }
        };
    }
}

module.exports = {
    OutputValidator
};