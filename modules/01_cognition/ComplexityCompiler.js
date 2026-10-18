/**
 * HSDXD Simverse 5 — Psychology Power System
 * File: modules/01_cognition/ComplexityCompiler.js
 * 
 * Subsystem 1.1.B: Problem Complexity Compiler.
 * Compiles problem topology into the authoritative 5-dimensional demand vector {C, N, A, U, S}.
 * 
 * INVARIANTS:
 * - Represents properties of the PROBLEM, never the character.
 * - Dimension coordinates C, N, A, U, S in [0, 100].
 * - Calculates effective combined demand D_effective in [0, 100].
 */

'use strict';

const { clamp } = require('../../core/Types.js');

class ProblemTopologyDAG {
    /**
     * @param {object} config
     * @param {string} config.id Problem identifier
     * @param {Array<object>} config.nodes Premise/hypothesis/goal nodes
     * @param {Array<object>} config.edges Dependency edges between nodes
     * @param {number} [config.abstractionLevel] Intrinsic abstraction level (0-100)
     * @param {number} [config.objectiveNovelty] Objective schema divergence (0-100)
     * @param {number} [config.intrinsicUncertainty] Missing premises / stochastic noise (0-100)
     * @param {number} [config.branchingFactor] Alternative search branches (>= 1)
     */
    constructor(config) {
        this.id = config.id || `prob_${Date.now()}`;
        this.nodes = Array.isArray(config.nodes) ? config.nodes : [];
        this.edges = Array.isArray(config.edges) ? config.edges : [];
        this.abstractionLevel = clamp(config.abstractionLevel ?? 30, 0, 100, "abstractionLevel");
        this.objectiveNovelty = clamp(config.objectiveNovelty ?? 20, 0, 100, "objectiveNovelty");
        this.intrinsicUncertainty = clamp(config.intrinsicUncertainty ?? 15, 0, 100, "intrinsicUncertainty");
        this.branchingFactor = Math.max(1, config.branchingFactor ?? 2);
    }
}

class ComplexityCompiler {
    /**
     * Compiles a Problem Topology into a standardized Demand Vector {C, N, A, U, S}
     * @param {ProblemTopologyDAG|object} problem 
     * @returns {object} { demandVector: {C, N, A, U, S}, effectiveDemand: number }
     */
    static compile(problem) {
        const prob = problem instanceof ProblemTopologyDAG ? problem : new ProblemTopologyDAG(problem);

        const nodeCount = prob.nodes.length || 1;
        const edgeCount = prob.edges.length || 0;

        // 1. C - Structural Complexity (elements, dependencies, inferential depth)
        // Ratio of edges to nodes + absolute node count scale
        const relationalDensity = nodeCount > 1 ? (edgeCount / (nodeCount - 1)) : 0;
        const depthFactor = Math.min(10, nodeCount);
        const rawC = (depthFactor * 5.0) + (relationalDensity * 25.0);
        const C = clamp(rawC, 5, 100, "C - Structural Complexity");

        // 2. N - Objective Schema Divergence
        const N = clamp(prob.objectiveNovelty, 0, 100, "N - Objective Novelty");

        // 3. A - Representational Abstraction
        const A = clamp(prob.abstractionLevel, 0, 100, "A - Abstraction Demand");

        // 4. U - Intrinsic Epistemic Uncertainty
        const U = clamp(prob.intrinsicUncertainty, 0, 100, "U - Intrinsic Uncertainty");

        // 5. S - Search-Space Complexity (branching factor & search space expansion)
        const rawS = (prob.branchingFactor * 12.0) + (nodeCount * 3.0);
        const S = clamp(rawS, 5, 100, "S - Search Space Complexity");

        // Combined Effective Demand (Weighted non-linear synthesis)
        // Structural complexity and search space carry primary weight
        const effectiveDemand = clamp(
            (C * 0.35) + (S * 0.25) + (A * 0.20) + (N * 0.10) + (U * 0.10),
            1, 99,
            "Effective Problem Demand"
        );

        return {
            problemId: prob.id,
            demandVector: {
                C: Number(C.toFixed(2)),
                N: Number(N.toFixed(2)),
                A: Number(A.toFixed(2)),
                U: Number(U.toFixed(2)),
                S: Number(S.toFixed(2))
            },
            effectiveDemand: Number(effectiveDemand.toFixed(2))
        };
    }
}

module.exports = {
    ProblemTopologyDAG,
    ComplexityCompiler
};