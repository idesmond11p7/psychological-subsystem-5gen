/**
 * HSDXD Simverse 5 — Psychology Power System
 * File: initialization/RegexExtractor.js
 * 
 * Module ID: PSY-1.1-IQ-INIT
 * Deterministic psychometric claim extractor for character cards.
 */

'use strict';

const { clamp } = require('../core/Types.js');

class RegexExtractor {
    /**
     * Scan character text buffer for explicit psychometric/IQ evidence
     * @param {string} textBuffer 
     * @returns {Array<object>} Evidence items
     */
    static extract(textBuffer) {
        if (!textBuffer || typeof textBuffer !== 'string') {
            return [];
        }

        const evidence = [];

        // --------------------------------------------------------------------
        // PATTERN 1: Exact IQ (e.g., "IQ: 145", "IQ=132", "measured IQ of 128")
        // Uses negative lookahead to not match the first number of a range
        // --------------------------------------------------------------------
        const exactRegex = /\b(?:measured\s+)?IQ\s*[:=]?\s*(\d{2,3})(?!\s*(?:-|to|and)\s*\d+)\b/gi;
        const matchedRanges = [];
        let match;
        while ((match = exactRegex.exec(textBuffer)) !== null) {
            const rawVal = parseInt(match[1], 10);
            if (rawVal >= 40 && rawVal <= 250) {
                evidence.push({
                    source: "character_card",
                    type: "explicit_iq",
                    rawClaim: match[0],
                    rawIQ: rawVal,
                    direction: clamp((rawVal - 100) / 50, -1.0, 1.0, "IQ Direction"),
                    weight: 0.90,
                    reliability: 0.95,
                    precision: "exact"
                });
            }
        }

        // --------------------------------------------------------------------
        // PATTERN 2: IQ Ranges (e.g., "IQ: 120-130", "IQ between 140 and 150", "IQ from 120 to 130")
        // --------------------------------------------------------------------
        const rangeRegex = /\bIQ\s*(?:[:=]|between|from|in the range of)?\s*(\d{2,3})\s*(?:-|to|and)\s*(\d{2,3})\b/gi;
        while ((match = rangeRegex.exec(textBuffer)) !== null) {
            const lower = parseInt(match[1], 10);
            const upper = parseInt(match[2], 10);
            if (lower >= 40 && upper <= 250 && lower <= upper) {
                const mid = (lower + upper) / 2;
                matchedRanges.push(match.index);
                evidence.push({
                    source: "character_card",
                    type: "iq_range",
                    rawClaim: match[0],
                    rawIQ: mid,
                    lowerIQ: lower,
                    upperIQ: upper,
                    direction: clamp((mid - 100) / 50, -1.0, 1.0, "IQ Range Direction"),
                    weight: 0.85,
                    reliability: 0.85,
                    precision: "range"
                });
            }
        }

        // --------------------------------------------------------------------
        // PATTERN 3: Approximate IQ (e.g., "around 130 IQ", "IQ roughly 140")
        // --------------------------------------------------------------------
        const approxRegex = /\b(?:around|approximately|roughly|estimated|about)\s+(\d{2,3})\s*IQ\b/gi;
        while ((match = approxRegex.exec(textBuffer)) !== null) {
            const rawVal = parseInt(match[1], 10);
            if (rawVal >= 40 && rawVal <= 250) {
                evidence.push({
                    source: "character_card",
                    type: "approx_iq",
                    rawClaim: match[0],
                    rawIQ: rawVal,
                    direction: clamp((rawVal - 100) / 50, -1.0, 1.0, "Approx IQ Direction"),
                    weight: 0.70,
                    reliability: 0.65,
                    precision: "approximate"
                });
            }
        }

        return evidence;
    }
}

module.exports = {
    RegexExtractor
};