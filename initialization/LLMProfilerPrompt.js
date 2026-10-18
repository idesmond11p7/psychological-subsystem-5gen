/**
 * HSDXD Simverse 5 — Psychology Power System
 * File: initialization/LLMProfilerPrompt.js
 * 
 * One-time prompt generator and response parser for extracting
 * qualitative Intelligence evidence from Character Card prose.
 * 
 * INVARIANTS:
 * - Domain Gating: Prompts strictly for Factor 1.1 Intelligence.
 * - JSON-schema enforced output.
 * - Sanitizes and clamps raw LLM outputs to valid simulation intervals.
 */

'use strict';

const { clamp } = require('../core/Types.js');

class LLMProfilerPrompt {
    /**
     * Build the structured prompt payload for the one-time profiling pass
     * @param {string} cardText Combined character card description buffer
     * @returns {object} { systemPrompt, userPrompt, responseFormat }
     */
    static buildPrompt(cardText) {
        const systemPrompt = `You are the Simverse 5 Cognitive Initialization Compiler.
Your task is to analyze character text and extract evidence specifically relevant to Factor 1.1 INTELLIGENCE (cognitive capability ceiling, problem-solving capacity, intellectual efficiency, abstract processing).

STRICT INVARIANTS:
1. Extract ONLY statements indicating cognitive capability, reasoning habits, problem-solving limits, or intellectual traits.
2. DO NOT extract emotional tendencies (e.g., "gets angry fast"), combat power, supernatural aura, or social status.
3. Output MUST strictly adhere to the JSON schema.`;

        const userPrompt = `Analyze the following character definition buffer and extract intellectual/cognitive evidence items:

"""
${cardText}
"""

Extract all relevant statements with their directional impact on general cognitive capability.
Direction scale:
+1.0 = Superhuman / Transcendent intellect
+0.7 = Genius / Exceptional problem solver
+0.3 = Above average / Clever / Competent
 0.0 = Standard average intellect
-0.3 = Below average / Slow learner
-0.7 = Severely impaired / Impulsive reasoning failure
-1.0 = Complete cognitive incapacity

Return valid JSON with the following structure:
{
  "evidence": [
    {
      "statement": "Extracted claim or quote",
      "direction": 0.0,
      "weight": 0.0,
      "reliability": 0.0
    }
  ]
}`;

        return {
            systemPrompt,
            userPrompt,
            responseFormat: "json"
        };
    }

    /**
     * Parse and sanitize LLM raw completion output
     * @param {string|object} rawResponse 
     * @returns {Array<object>} Sanitized evidence array
     */
    static parseResponse(rawResponse) {
        let parsed = rawResponse;

        if (typeof rawResponse === 'string') {
            try {
                // Strip markdown code fences if model returned ```json ... ```
                const cleanJson = rawResponse
                    .replace(/```json/gi, '')
                    .replace(/```/g, '')
                    .trim();
                parsed = JSON.parse(cleanJson);
            } catch (err) {
                console.warn('[LLMProfilerPrompt] Failed to parse JSON response. Returning empty evidence array.', err);
                return [];
            }
        }

        if (!parsed || !Array.isArray(parsed.evidence)) {
            return [];
        }

        const sanitized = [];

        for (const item of parsed.evidence) {
            if (!item || typeof item.statement !== 'string') continue;

            const direction = clamp(
                typeof item.direction === 'number' ? item.direction : 0.0, 
                -1.0, 1.0, 
                "Evidence Direction"
            );
            const weight = clamp(
                typeof item.weight === 'number' ? item.weight : 0.5, 
                0.0, 1.0, 
                "Evidence Weight"
            );
            const reliability = clamp(
                typeof item.reliability === 'number' ? item.reliability : 0.7, 
                0.0, 1.0, 
                "Evidence Reliability"
            );

            // Gating: Discard items with trivial weight (unrelated flavor text)
            if (weight >= 0.15) {
                sanitized.push({
                    source: "character_card",
                    type: "qualitative_llm",
                    statement: item.statement.trim(),
                    direction,
                    weight,
                    reliability
                });
            }
        }

        return sanitized;
    }
}

module.exports = {
    LLMProfilerPrompt
};