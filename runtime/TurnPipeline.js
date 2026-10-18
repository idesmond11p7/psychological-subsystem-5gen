/**
 * HSDXD Simverse 5 — Psychology Power System
 * File: runtime/TurnPipeline.js
 * 
 * Master Turn Execution Pipeline for the Cognition Power System.
 * 
 * LIFECYCLE:
 * 1. preGeneration: Reads state -> Compiles complexity -> Evaluates capability -> Generates directives -> Compiles prompt.
 * 2. postGeneration: Extracts machine payload -> Validates authority -> Commits state mutations.
 */

'use strict';

const { Timescale } = require('../core/Types.js');
const { GlobalStateStore } = require('../core/StateStore.js');
const { ComplexityCompiler } = require('../modules/01_cognition/ComplexityCompiler.js');
const { IntelligenceEngine } = require('../modules/01_cognition/IntelligenceEngine.js');
const { ReasoningDirectives } = require('../modules/01_cognition/ReasoningDirectives.js');
const { ProcessingSpeed } = require('../modules/01_cognition/ProcessingSpeed.js');
const { ContextCompiler } = require('./ContextCompiler.js');
const { OutputValidator } = require('./OutputValidator.js');

class TurnPipeline {
    /**
     * @param {object} [stateStore] 
     */
    constructor(stateStore = GlobalStateStore) {
        this.stateStore = stateStore;
    }

    /**
     * Pre-generation hook: runs cognition math and produces prompt directive
     * @param {string} agentId Character ID
     * @param {object} [problemTopology] Optional active problem DAG
     * @returns {object} { promptDirective: string, directives: object, intelResult: object, complexity: object }
     */
    preGeneration(agentId, problemTopology = null) {
        const state = this.stateStore.getState(agentId);

        // 1. Compile problem demand (or default neutral scenario)
        const topology = problemTopology || {
            nodes: [{ id: "n1" }, { id: "n2" }],
            edges: [{ from: "n1", to: "n2" }],
            abstractionLevel: 30,
            objectiveNovelty: 20,
            intrinsicUncertainty: 15,
            branchingFactor: 2
        };
        const complexity = ComplexityCompiler.compile(topology);

        // 2. Evaluate Intelligence capability
        const intelResult = IntelligenceEngine.evaluate(state.traits.intelligence, complexity);

        // 3. Calculate Processing Speed
        const speedResult = ProcessingSpeed.calculate(state.traits.processingSpeed, {
            cognitiveStrain: intelResult.cognitiveEvents.some(e => e.type === "cognitive_strain")
        });

        // 4. Generate qualitative Reasoning Directives
        const directives = ReasoningDirectives.generate(intelResult, state.traits.reasoningProfile);

        // 5. Update transient state in StateStore
        this.stateStore.commitMutation(agentId, Timescale.TRANSIENT, (currentState) => {
            currentState.transient.cognitiveStrain = directives.conditions.experiencingStrain;
            currentState.transient.comprehensionFailure = directives.conditions.comprehensionLimited;
            currentState.transient.comfortableCapacity = directives.conditions.capacityComfortable;
            currentState.transient.activeProblemId = complexity.problemId;
            currentState.transient.lastCapabilityGap = intelResult.calculation.capabilityGap;
            return currentState.transient;
        }, "pre_generation_cognition_eval");

        // 6. Compile compact prompt block (< 250 tokens)
        const promptDirective = ContextCompiler.compile({
            agentId,
            directives,
            speedResult
        });

        return {
            promptDirective,
            directives,
            intelResult,
            complexity,
            speedResult
        };
    }

    /**
     * Post-generation hook: parses and validates LLM generation, commits state mutations
     * @param {string} agentId Character ID
     * @param {string} rawLLMResponse Full generated text from LLM
     * @param {object} directives Directives generated during preGeneration
     * @returns {object} { sanitizedText: string, validationResult: object, stateUpdated: boolean }
     */
    postGeneration(agentId, rawLLMResponse, directives) {
        // 1. Extract machine payload
        const extracted = OutputValidator.extractPayload(rawLLMResponse);

        // 2. Validate against simulation authority
        const validationResult = OutputValidator.validate(extracted, directives);

        // 3. Commit state update based on validation outcome
        let stateUpdated = false;
        if (validationResult.isValid) {
            this.stateStore.commitMutation(agentId, Timescale.EVENT, (currentState) => {
                currentState.recentEvents.push({
                    type: "reasoning_turn_completed",
                    problemId: currentState.transient.activeProblemId,
                    claimedResolution: validationResult.payload.claimedResolution,
                    strainObserved: validationResult.payload.strainObserved,
                    timestamp: Date.now()
                });
                // Keep recent events array bounded to last 10
                if (currentState.recentEvents.length > 10) {
                    currentState.recentEvents.shift();
                }
                return currentState.recentEvents;
            }, "post_generation_commit");
            stateUpdated = true;
        }

        return {
            sanitizedText: validationResult.sanitizedText,
            validationResult,
            stateUpdated
        };
    }
}

module.exports = {
    TurnPipeline
};