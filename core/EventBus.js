/**
 * HSDXD Simverse 5 — Psychology Power System
 * File: core/EventBus.js
 * 
 * Typed, synchronous/asynchronous event dispatcher.
 * Decouples internal psychology engines and connects to the SillyTavern Adapter.
 */

'use strict';

const SimulationEvents = Object.freeze({
    // Lifecycle
    ENGINE_INITIALIZED: 'engine:initialized',
    STATE_INITIALIZED: 'state:initialized',
    STATE_MUTATED: 'state:mutated',
    
    // Cognition & Complexity
    PROBLEM_SUBMITTED: 'cognition:problem_submitted',
    DEMAND_EVALUATED: 'cognition:demand_evaluated',
    CAPABILITY_EVALUATED: 'cognition:capability_evaluated',
    COGNITIVE_STRAIN_TRIGGERED: 'cognition:strain_triggered',
    DIRECTIVE_COMPILED: 'cognition:directive_compiled',
    
    // Validation & Runtime
    LLM_PROPOSAL_RECEIVED: 'runtime:llm_proposal_received',
    VALIDATION_PASSED: 'runtime:validation_passed',
    VALIDATION_VIOLATION: 'runtime:validation_violation'
});

class EventBus {
    constructor() {
        this._listeners = new Map();
    }

    on(eventType, handler) {
        if (!this._listeners.has(eventType)) {
            this._listeners.set(eventType, new Set());
        }
        this._listeners.get(eventType).add(handler);
        return () => this.off(eventType, handler);
    }

    off(eventType, handler) {
        if (!this._listeners.has(eventType)) return;
        this._listeners.get(eventType).delete(handler);
    }

    emit(eventType, payload = {}) {
        if (!this._listeners.has(eventType)) return;
        const eventData = {
            type: eventType,
            timestamp: Date.now(),
            ...payload
        };
        for (const handler of this._listeners.get(eventType)) {
            try {
                handler(eventData);
            } catch (err) {
                console.error(`[Simverse EventBus] Error in handler for '${eventType}':`, err);
            }
        }
    }

    async emitAsync(eventType, payload = {}) {
        if (!this._listeners.has(eventType)) return;
        const eventData = {
            type: eventType,
            timestamp: Date.now(),
            ...payload
        };
        for (const handler of this._listeners.get(eventType)) {
            try {
                await handler(eventData);
            } catch (err) {
                console.error(`[Simverse EventBus] Error in async handler for '${eventType}':`, err);
            }
        }
    }

    clear() {
        this._listeners.clear();
    }
}

const GlobalEventBus = new EventBus();

module.exports = {
    SimulationEvents,
    EventBus,
    GlobalEventBus
};