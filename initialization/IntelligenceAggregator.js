/**
 * HSDXD Simverse 5 — Psychology Power System
 * File: initialization/IntelligenceAggregator.js
 * 
 * Mathematical Evidence Aggregator for Factor 1.1 Intelligence.
 */

'use strict';

const { BoundedBetaDistribution, clamp } = require('../core/Types.js');

const BASELINE_INTELLIGENCE = 50.0;
const BASELINE_UNCERTAINTY = 12.0;
const MIN_UNCERTAINTY = 2.5;
const MAX_UNCERTAINTY = 20.0;
const MAX_SHIFT = 45.0;

class IntelligenceAggregator {
    /**
     * Aggregate evidence array into a locked Beta Distribution state
     * @param {Array<object>} evidenceList Combined evidence from Regex + LLM
     * @returns {object} { distribution, latentMean, uncertainty, initialized, evidenceCount }
     */
    static aggregate(evidenceList = []) {
        if (!Array.isArray(evidenceList) || evidenceList.length === 0) {
            const defaultDist = BoundedBetaDistribution.fromMeanAndUncertainty(
                BASELINE_INTELLIGENCE, 
                BASELINE_UNCERTAINTY, 
                0, 
                100
            );
            return {
                distribution: defaultDist.toJSON(),
                latentMean: BASELINE_INTELLIGENCE,
                uncertainty: BASELINE_UNCERTAINTY,
                initialized: true,
                evidenceCount: 0
            };
        }

        let totalWeightedDirection = 0;
        let totalWeight = 0;
        const directions = [];

        for (const item of evidenceList) {
            const effectiveWeight = item.weight * item.reliability;
            if (effectiveWeight <= 0) continue;

            totalWeightedDirection += item.direction * effectiveWeight;
            totalWeight += effectiveWeight;
            directions.push(item.direction);
        }

        if (totalWeight === 0) {
            const fallbackDist = BoundedBetaDistribution.fromMeanAndUncertainty(
                BASELINE_INTELLIGENCE, 
                BASELINE_UNCERTAINTY, 
                0, 
                100
            );
            return {
                distribution: fallbackDist.toJSON(),
                latentMean: BASELINE_INTELLIGENCE,
                uncertainty: BASELINE_UNCERTAINTY,
                initialized: true,
                evidenceCount: 0
            };
        }

        const meanDirection = totalWeightedDirection / totalWeight;
        const calculatedMean = clamp(
            BASELINE_INTELLIGENCE + (meanDirection * MAX_SHIFT), 
            1.0, 99.0, 
            "Calculated Latent Mean"
        );

        let directionVariance = 0;
        if (directions.length > 1) {
            const varSum = directions.reduce((acc, d) => acc + Math.pow(d - meanDirection, 2), 0);
            directionVariance = varSum / directions.length;
        }

        const weightConfidenceReduction = Math.min(9.0, totalWeight * 7.0);
        const conflictExpansion = directionVariance * 10.0;
        
        const calculatedUncertainty = clamp(
            BASELINE_UNCERTAINTY - weightConfidenceReduction + conflictExpansion,
            MIN_UNCERTAINTY,
            MAX_UNCERTAINTY,
            "Calculated Uncertainty"
        );

        const betaDist = BoundedBetaDistribution.fromMeanAndUncertainty(
            calculatedMean,
            calculatedUncertainty,
            0,
            100
        );

        return {
            distribution: betaDist.toJSON(),
            latentMean: Number(calculatedMean.toFixed(2)),
            uncertainty: Number(calculatedUncertainty.toFixed(2)),
            initialized: true,
            evidenceCount: evidenceList.length
        };
    }
}

module.exports = {
    IntelligenceAggregator,
    BASELINE_INTELLIGENCE,
    BASELINE_UNCERTAINTY
};