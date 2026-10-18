/**
 * HSDXD Simverse 5 — Psychology Power System
 * File: core/StateStore.js
 * 
 * Authoritative Character Psychological State Container.
 * 
 * INVARIANTS:
 * - 5-Tier Timescale isolation (Trait, Persistent, Transient, Event, History).
 * - Propose -> Validate -> Commit mutation lifecycle.
 * - JSON-serializable state compatible with SillyTavern's chatMetadata.
 */

'use strict';

const { Timescale, BoundedBetaDistribution, StateMutationError } = require('./Types.js');
const { GlobalEventBus, SimulationEvents } = require('./EventBus.js');

const SCHEMA_VERSION = '1.0.0';

class CharacterState {
    /**
     * @param {string} agentId 
     * @param {object} initialData 
     */
    constructor(agentId, initialData = {}) {
        this.agentId = agentId;
        this.version = SCHEMA_VERSION;
        this.updatedAt = 0;

        // TIER 1: TRAIT / DISPOSITION (Stable baselines)
        this.traits = {
            intelligence: initialData.traits?.intelligence ? {
                distribution: initialData.traits.intelligence.distribution,
                latentMean: initialData.traits.intelligence.latentMean,
                uncertainty: initialData.traits.intelligence.uncertainty,
                initialized: Boolean(initialData.traits.intelligence.initialized),
                evidenceCount: initialData.traits.intelligence.evidenceCount || 0
            } : {
                distribution: BoundedBetaDistribution.fromMeanAndUncertainty(50, 10, 0, 100).toJSON(),
                latentMean: 50.0,
                uncertainty: 10.0,
                initialized: false,
                evidenceCount: 0
            },
            processingSpeed: typeof initialData.traits?.processingSpeed === 'number' 
                ? initialData.traits.processingSpeed 
                : 50.0,
            reasoningProfile: initialData.traits?.reasoningProfile || {
                style: 'analytical', // 'analytical' | 'intuitive' | 'heuristic' | 'dogmatic' | 'impulsive'
                explorationBreadth: 0.5,
                verificationRigor: 0.7,
                backtrackingPatience: 0.4,
                heuristicReliance: 0.3
            }
        };

        // TIER 2: PERSISTENT STATE (Knowledge, models, schemas)
        this.persistent = {
            beliefs: initialData.persistent?.beliefs || [],
            learnedSchemas: initialData.persistent?.learnedSchemas || []
        };

        // TIER 3: TRANSIENT STATE (Current turn activations & strain)
        this.transient = {
            cognitiveStrain: Boolean(initialData.transient?.cognitiveStrain),
            comprehensionFailure: Boolean(initialData.transient?.comprehensionFailure),
            comfortableCapacity: initialData.transient?.comfortableCapacity !== undefined 
                ? Boolean(initialData.transient.comfortableCapacity) 
                : true,
            activeProblemId: initialData.transient?.activeProblemId || null,
            lastCapabilityGap: typeof initialData.transient?.lastCapabilityGap === 'number'
                ? initialData.transient.lastCapabilityGap
                : 0.0
        };

        // TIER 4: EVENTS (Recent turn occurrences)
        this.recentEvents = Array.isArray(initialData.recentEvents) ? initialData.recentEvents : [];

        // TIER 5: HISTORY (Consolidated trace)
        this.history = Array.isArray(initialData.history) ? initialData.history : [];
    }

    toJSON() {
        return {
            agentId: this.agentId,
            version: this.version,
            updatedAt: this.updatedAt,
            traits: this.traits,
            persistent: this.persistent,
            transient: this.transient,
            recentEvents: this.recentEvents,
            history: this.history
        };
    }

    static fromJSON(json) {
        if (!json || typeof json !== 'object') {
            throw new Error('[StateStore] Cannot instantiate CharacterState from null/undefined');
        }
        return new CharacterState(json.agentId, json);
    }
}

class StateStore {
    constructor(eventBus = GlobalEventBus) {
        this.eventBus = eventBus;
        this._states = new Map(); // agentId -> CharacterState
    }

    getState(agentId) {
        if (!this._states.has(agentId)) {
            const newState = new CharacterState(agentId);
            this._states.set(agentId, newState);
            this.eventBus.emit(SimulationEvents.STATE_INITIALIZED, { agentId, state: newState.toJSON() });
        }
        return this._states.get(agentId);
    }

    hasAgent(agentId) {
        return this._states.has(agentId);
    }

    loadAgentState(agentId, rawJson) {
        const state = CharacterState.fromJSON({ ...rawJson, agentId });
        this._states.set(agentId, state);
        return state;
    }

    commitMutation(agentId, timescale, mutationFn, reason = "simulation_step") {
        const state = this.getState(agentId);
        const snapshot = JSON.stringify(state.toJSON());

        try {
            const changes = mutationFn(state);
            state.updatedAt = Date.now();

            this.eventBus.emit(SimulationEvents.STATE_MUTATED, {
                agentId,
                timescale,
                reason,
                changes,
                newState: state.toJSON()
            });

            return true;
        } catch (err) {
            const rollbackState = CharacterState.fromJSON(JSON.parse(snapshot));
            this._states.set(agentId, rollbackState);
            throw new StateMutationError(`[StateStore] Mutation aborted for ${agentId} (${reason}). State restored. Error: ${err.message}`);
        }
    }

    serializeAgent(agentId) {
        return this.getState(agentId).toJSON();
    }

    clear() {
        this._states.clear();
    }
}

const GlobalStateStore = new StateStore();

module.exports = {
    CharacterState,
    StateStore,
    GlobalStateStore
};