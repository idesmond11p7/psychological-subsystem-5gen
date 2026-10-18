/**
 * HSDXD Simverse 5 — Psychology Power System
 * File: test/CognitionKernel.test.js
 * 
 * Standalone Test Harness for the Cognition Kernel.
 * Runs directly in Node.js: `node test/CognitionKernel.test.js`
 * 
 * COVERS:
 * 1. PRNG & Bounded Beta Distribution Math
 * 2. StateStore Timescale Isolation & Rollback Transactions
 * 3. IQ Regex Extraction & Evidence Aggregation (PSY-1.1-IQ-INIT)
 * 4. Complexity Compiler DAG Compilation {C, N, A, U, S}
 * 5. Intelligence Engine Capability Gap Δ & Logistic Probability
 * 6. Reasoning Directives & Outcome Constraint Boundaries
 * 7. Processing Speed Latency & Throughput Modifiers
 * 8. Context Compiler Token Budget (< 250 Tokens)
 * 9. Output Validator: Rejection of ILLEGAL_RESOLUTION & Acceptance of Valid State
 */

'use strict';

const assert = require('assert');

// Core
const { PRNG, BoundedBetaDistribution, Timescale } = require('../core/Types.js');
const { StateStore } = require('../core/StateStore.js');
const { EventBus, SimulationEvents } = require('../core/EventBus.js');

// Initialization
const { RegexExtractor } = require('../initialization/RegexExtractor.js');
const { IntelligenceAggregator } = require('../initialization/IntelligenceAggregator.js');

// Cognition
const { ComplexityCompiler, ProblemTopologyDAG } = require('../modules/01_cognition/ComplexityCompiler.js');
const { IntelligenceEngine } = require('../modules/01_cognition/IntelligenceEngine.js');
const { ReasoningDirectives } = require('../modules/01_cognition/ReasoningDirectives.js');
const { ProcessingSpeed } = require('../modules/01_cognition/ProcessingSpeed.js');

// Runtime
const { ContextCompiler } = require('../runtime/ContextCompiler.js');
const { OutputValidator } = require('../runtime/OutputValidator.js');
const { TurnPipeline } = require('../runtime/TurnPipeline.js');

let totalTests = 0;
let passedTests = 0;

function runTest(testName, testFn) {
    totalTests++;
    try {
        testFn();
        passedTests++;
        console.log(`  ✓ [PASS] ${testName}`);
    } catch (err) {
        console.error(`  ✗ [FAIL] ${testName}`);
        console.error(`    Error: ${err.message}\n`);
    }
}

console.log('================================================================');
console.log('  HSDXD SIMVERSE 5 — COGNITION KERNEL TEST SUITE');
console.log('================================================================\n');

// ============================================================================
// TEST SUITE 1: MATHEMATICAL PRIMITIVES & PRNG
// ============================================================================
console.log('--- SUITE 1: Mathematical Primitives & Distributions ---');

runTest('PRNG produces deterministic repeatable sequences from same seed', () => {
    const prng1 = new PRNG(1337);
    const prng2 = new PRNG(1337);
    for (let i = 0; i < 10; i++) {
        assert.strictEqual(prng1.next(), prng2.next());
    }
});

runTest('BoundedBetaDistribution accurately fits mean and uncertainty on [0, 100]', () => {
    const targetMean = 85.0;
    const targetUncertainty = 4.0;
    const betaDist = BoundedBetaDistribution.fromMeanAndUncertainty(targetMean, targetUncertainty, 0, 100);
    
    assert(Math.abs(betaDist.mean - targetMean) < 0.1, `Mean deviation too high: ${betaDist.mean}`);
    assert(Math.abs(betaDist.standardDeviation - targetUncertainty) < 0.5, `Uncertainty deviation too high: ${betaDist.standardDeviation}`);
    
    const sample = betaDist.sample(new PRNG(99));
    assert(sample >= 0 && sample <= 100, `Sample out of bounds: ${sample}`);
});

// ============================================================================
// TEST SUITE 2: STATE STORE & TIMESCALES
// ============================================================================
console.log('\n--- SUITE 2: StateStore & Transactional Mutations ---');

runTest('StateStore maintains 5-tier timescale isolation and persists traits', () => {
    const testBus = new EventBus();
    const store = new StateStore(testBus);
    const state = store.getState('sona_sitri');

    assert.strictEqual(state.agentId, 'sona_sitri');
    assert(state.traits.intelligence !== undefined, 'Traits tier missing');
    assert(Array.isArray(state.persistent.beliefs), 'Persistent tier missing');
    assert(typeof state.transient.cognitiveStrain === 'boolean', 'Transient tier missing');
});

runTest('StateStore rolls back on mutation error without corrupting state', () => {
    const store = new StateStore(new EventBus());
    const state = store.getState('sona_sitri');
    state.transient.cognitiveStrain = false;

    assert.throws(() => {
        store.commitMutation('sona_sitri', Timescale.TRANSIENT, (currentState) => {
            currentState.transient.cognitiveStrain = true;
            throw new Error('Simulated hardware/logic failure');
        });
    }, /Mutation aborted/);

    const restored = store.getState('sona_sitri');
    assert.strictEqual(restored.transient.cognitiveStrain, false, 'State failed to rollback to previous state');
});

// ============================================================================
// TEST SUITE 3: INITIALIZATION SUBSYSTEM (PSY-1.1-IQ-INIT)
// ============================================================================
console.log('\n--- SUITE 3: Initialization & IQ Evidence Aggregator ---');

runTest('RegexExtractor catches explicit IQ claims and preserves uncertainty', () => {
    const cardBuffer = `
        Name: Sona Sitri
        Description: A calm and brilliant devil tactician with an estimated IQ: 145.
        Personality: Intelligent, disciplined. In previous tests had IQ between 140 and 150.
    `;
    const evidence = RegexExtractor.extract(cardBuffer);

    assert.strictEqual(evidence.length, 2, `Expected 2 IQ evidence items, got ${evidence.length}`);
    assert.strictEqual(evidence[0].type, 'explicit_iq');
    assert.strictEqual(evidence[0].rawIQ, 145);
    assert.strictEqual(evidence[1].type, 'iq_range');
    assert.strictEqual(evidence[1].lowerIQ, 140);
    assert.strictEqual(evidence[1].upperIQ, 150);
});

runTest('IntelligenceAggregator maps high IQ evidence to high latent mean (μ > 80)', () => {
    const cardBuffer = "High-tier devil tactician. Measured IQ: 145.";
    const evidence = RegexExtractor.extract(cardBuffer);
    const aggregated = IntelligenceAggregator.aggregate(evidence);

    assert(aggregated.latentMean >= 80.0, `Latent mean too low: ${aggregated.latentMean}`);
    assert(aggregated.uncertainty <= 8.0, `Uncertainty too high: ${aggregated.uncertainty}`);
    assert.strictEqual(aggregated.initialized, true);
});

// ============================================================================
// TEST SUITE 4: COGNITION & PROBLEM ENGINE
// ============================================================================
console.log('\n--- SUITE 4: Complexity Compiler & Intelligence Engine ---');

runTest('ComplexityCompiler correctly compiles DAG topology into {C, N, A, U, S}', () => {
    const complexProblem = new ProblemTopologyDAG({
        id: 'cipher_99',
        nodes: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }, { id: 'h1' }, { id: 'goal' }],
        edges: [
            { from: 'p1', to: 'h1' },
            { from: 'p2', to: 'h1' },
            { from: 'p3', to: 'h1' },
            { from: 'h1', to: 'goal' }
        ],
        abstractionLevel: 80,
        objectiveNovelty: 60,
        intrinsicUncertainty: 25,
        branchingFactor: 4
    });

    const result = ComplexityCompiler.compile(complexProblem);
    assert(result.demandVector.C >= 30, `Structural complexity C too low: ${result.demandVector.C}`);
    assert(result.demandVector.A === 80, 'Abstraction A mismatch');
    assert(result.effectiveDemand >= 55, `Effective demand too low: ${result.effectiveDemand}`);
});

runTest('IntelligenceEngine emits comprehension_failure when capability gap Δ < -20', () => {
    // Low intellect character: I = 25
    const lowIntelState = { latentMean: 25.0, uncertainty: 4.0 };
    // Hard problem: D = 70
    const hardComplexity = {
        effectiveDemand: 70.0,
        demandVector: { C: 70, N: 50, A: 60, U: 20, S: 60 }
    };

    const evalResult = IntelligenceEngine.evaluate(lowIntelState, hardComplexity);
    assert.strictEqual(evalResult.calculation.capabilityGap, -45.0);
    assert(evalResult.calculation.successProbability < 0.05, `Success prob too high: ${evalResult.calculation.successProbability}`);
    assert(evalResult.cognitiveEvents.some(e => e.type === 'comprehension_failure'), 'Missing comprehension_failure event');

    const directives = ReasoningDirectives.generate(evalResult);
    assert.strictEqual(directives.cognitiveAccessibility, 'inaccessible');
    assert.strictEqual(directives.outcomeConstraint.solutionPermitted, false, 'Solution must be FORBIDDEN');
});

runTest('IntelligenceEngine emits comfortable_capacity when capability gap Δ >= 20', () => {
    // Genius intellect character: I = 90
    const geniusIntelState = { latentMean: 90.0, uncertainty: 3.0 };
    // Simple problem: D = 30
    const simpleComplexity = {
        effectiveDemand: 30.0,
        demandVector: { C: 20, N: 10, A: 10, U: 5, S: 10 }
    };

    const evalResult = IntelligenceEngine.evaluate(geniusIntelState, simpleComplexity);
    assert.strictEqual(evalResult.calculation.capabilityGap, 60.0);
    assert(evalResult.calculation.successProbability > 0.99, 'Success prob too low');
    assert(evalResult.cognitiveEvents.some(e => e.type === 'comfortable_cognitive_capacity'), 'Missing comfortable capacity event');

    const directives = ReasoningDirectives.generate(evalResult);
    assert.strictEqual(directives.cognitiveAccessibility, 'accessible');
    assert.strictEqual(directives.outcomeConstraint.solutionPermitted, true);
    assert.strictEqual(directives.outcomeConstraint.flawlessResolutionPermitted, true);
});

// ============================================================================
// TEST SUITE 5: RUNTIME & VALIDATION GATE
// ============================================================================
console.log('\n--- SUITE 5: Runtime Context Compiler & Output Validator ---');

runTest('ContextCompiler generates terse directive strictly within token budget (< 250 tokens)', () => {
    const intelResult = {
        calculation: { capabilityGap: -15.0, successProbability: 0.14 },
        cognitiveEvents: [{ type: 'cognitive_strain' }]
    };
    const directives = ReasoningDirectives.generate(intelResult, { style: 'analytical' });
    const speedResult = ProcessingSpeed.calculate(50, { cognitiveStrain: true });

    const promptText = ContextCompiler.compile({
        agentId: 'sona_sitri',
        directives,
        speedResult
    });

    // Approximate token count: ~4 characters per token
    const estimatedTokens = Math.ceil(promptText.length / 4);
    assert(estimatedTokens < 250, `Token budget exceeded! Length: ${promptText.length} chars (~${estimatedTokens} tokens)`);
    assert(promptText.includes('SOLUTION_FORBIDDEN') || promptText.includes('ACTIVE_COGNITIVE_STRAIN'));
});

runTest('OutputValidator REJECTS illegal solution when solutionPermitted = false', () => {
    const mockDirectives = {
        outcomeConstraint: { solutionPermitted: false, flawlessResolutionPermitted: false },
        conditions: { experiencingStrain: true }
    };

    // LLM tried to fake solving the puzzle
    const fakeLLMResponse = `
        Sona easily deciphered the runes with a flick of her hand.
        <!-- SIMVERSE_OUT
        {
          "claimedResolution": true,
          "strainObserved": false
        }
        -->
    `;

    const extracted = OutputValidator.extractPayload(fakeLLMResponse);
    assert.strictEqual(extracted.sanitizedText, 'Sona easily deciphered the runes with a flick of her hand.');

    const validation = OutputValidator.validate(extracted, mockDirectives);
    assert.strictEqual(validation.isValid, false, 'Validator should have REJECTED the illegal resolution');
    assert(validation.violations.some(v => v.includes('ILLEGAL_RESOLUTION')), 'Missing ILLEGAL_RESOLUTION violation');
});

runTest('OutputValidator ACCEPTS valid output adhering to cognitive strain and uncertainty', () => {
    const mockDirectives = {
        outcomeConstraint: { solutionPermitted: false, flawlessResolutionPermitted: false },
        conditions: { experiencingStrain: true }
    };

    const validLLMResponse = `
        Sona furrowed her brow, calculating the magical vectors. The equation remained incomplete.
        <!-- SIMVERSE_OUT
        {
          "claimedResolution": false,
          "strainObserved": true
        }
        -->
    `;

    const extracted = OutputValidator.extractPayload(validLLMResponse);
    const validation = OutputValidator.validate(extracted, mockDirectives);

    assert.strictEqual(validation.isValid, true, 'Validator should have ACCEPTED the valid response');
    assert.strictEqual(validation.violations.length, 0);
});

// ============================================================================
// TEST SUITE 6: END-TO-END TURN PIPELINE
// ============================================================================
console.log('\n--- SUITE 6: End-to-End Pipeline Execution ---');

runTest('TurnPipeline runs full preGeneration -> postGeneration lifecycle with state update', () => {
    const testStore = new StateStore(new EventBus());
    const pipeline = new TurnPipeline(testStore);

    // Initialize agent with intelligence I = 40
    const state = testStore.getState('test_agent');
    state.traits.intelligence = {
        latentMean: 40.0,
        uncertainty: 5.0,
        distribution: BoundedBetaDistribution.fromMeanAndUncertainty(40, 5, 0, 100).toJSON()
    };

    // Hard Problem: Demand D = 80 -> Gap Δ = -40 (Inaccessible)
    const problem = {
        nodes: [{ id: '1' }, { id: '2' }, { id: '3' }],
        abstractionLevel: 85,
        objectiveNovelty: 70
    };

    // 1. Pre-Generation
    const preResult = pipeline.preGeneration('test_agent', problem);
    assert.strictEqual(preResult.directives.outcomeConstraint.solutionPermitted, false);
    assert(preResult.promptDirective.includes('SOLUTION_FORBIDDEN'));

    // 2. Post-Generation (Valid response adhering to constraint)
    const rawResponse = `
        "I can't decode this cipher," the agent said, stepping back in hesitation.
        <!-- SIMVERSE_OUT { "claimedResolution": false, "strainObserved": true } -->
    `;
    const postResult = pipeline.postGeneration('test_agent', rawResponse, preResult.directives);

    assert.strictEqual(postResult.validationResult.isValid, true);
    assert.strictEqual(postResult.sanitizedText, '"I can\'t decode this cipher," the agent said, stepping back in hesitation.');
    assert.strictEqual(postResult.stateUpdated, true);

    const updatedState = testStore.getState('test_agent');
    assert.strictEqual(updatedState.recentEvents.length, 1);
    assert.strictEqual(updatedState.recentEvents[0].claimedResolution, false);
});

// ============================================================================
// SUMMARY REPORT
// ============================================================================
console.log('\n================================================================');
console.log(`  TEST RESULTS: ${passedTests} / ${totalTests} PASSED`);
if (passedTests === totalTests) {
    console.log('  STATUS: ALL COGNITION KERNEL INVARIANTS VERIFIED (100% OK)');
} else {
    console.log('  STATUS: SOME TESTS FAILED');
}
console.log('================================================================\n');

process.exit(passedTests === totalTests ? 0 : 1);