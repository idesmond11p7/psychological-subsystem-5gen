/**
 * HSDXD Simverse 5 — Psychology Power System
 * File: ui/PsychologyInspector.js
 * 
 * Live DOM Telemetry Drawer for monitoring Cognitive state in SillyTavern.
 */

'use strict';

class PsychologyInspector {
    constructor() {
        this.container = null;
        this.toggleBtn = null;
        this.visible = false;
    }

    mount() {
        if (document.getElementById('simverse-inspector-drawer')) return;

        // 1. Create Drawer Container
        this.container = document.createElement('div');
        this.container.id = 'simverse-inspector-drawer';
        this.container.className = 'simverse-hidden';
        this.container.innerHTML = `
            <div class="simverse-header">
                <div class="simverse-header-title">
                    <span>🧠</span>
                    <span>SIMVERSE COGNITION</span>
                </div>
                <button class="simverse-close-btn" id="simverse-close-btn">✕</button>
            </div>
            <div class="simverse-body">
                <div class="simverse-section">
                    <div class="simverse-section-title">Agent Profile</div>
                    <div class="simverse-row">
                        <span class="simverse-label">Agent:</span>
                        <span class="simverse-value" id="sim-val-agent">None</span>
                    </div>
                    <div class="simverse-row">
                        <span class="simverse-label">Latent Intelligence:</span>
                        <span class="simverse-value" id="sim-val-intel">-- (±--)</span>
                    </div>
                    <div class="simverse-row">
                        <span class="simverse-label">Processing Speed:</span>
                        <span class="simverse-value" id="sim-val-speed">--</span>
                    </div>
                </div>

                <div class="simverse-section">
                    <div class="simverse-section-title">Active Cognitive State</div>
                    <div class="simverse-row">
                        <span class="simverse-label">Accessibility:</span>
                        <span id="sim-val-tier" class="simverse-badge accessible">ACCESSIBLE</span>
                    </div>
                    <div class="simverse-row">
                        <span class="simverse-label">Capability Gap (Δ):</span>
                        <span class="simverse-value" id="sim-val-gap">+0.0</span>
                    </div>
                    <div class="simverse-row">
                        <span class="simverse-label">Solution Permitted:</span>
                        <span class="simverse-value" id="sim-val-permitted">TRUE</span>
                    </div>
                    <div class="simverse-row">
                        <span class="simverse-label">Active Strain:</span>
                        <span class="simverse-value" id="sim-val-strain">FALSE</span>
                    </div>
                </div>

                <div class="simverse-section">
                    <div class="simverse-section-title">Injected Directive</div>
                    <div class="simverse-log-box" id="sim-val-directive">No directive compiled yet.</div>
                </div>

                <div class="simverse-section">
                    <div class="simverse-section-title">Validation Telemetry</div>
                    <div class="simverse-row">
                        <span class="simverse-label">Last Status:</span>
                        <span class="simverse-value" id="sim-val-validation">IDLE</span>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.container);

        // 2. Create Floating Toggle Button
        this.toggleBtn = document.createElement('div');
        this.toggleBtn.id = 'simverse-toggle-btn';
        this.toggleBtn.title = 'Toggle Simverse Telemetry';
        this.toggleBtn.innerHTML = '🧠';
        document.body.appendChild(this.toggleBtn);

        // 3. Event Listeners
        this.toggleBtn.addEventListener('click', () => this.toggle());
        document.getElementById('simverse-close-btn').addEventListener('click', () => this.hide());
    }

    toggle() {
        this.visible = !this.visible;
        if (this.visible) {
            this.container.classList.remove('simverse-hidden');
        } else {
            this.container.classList.add('simverse-hidden');
        }
    }

    hide() {
        this.visible = false;
        this.container.classList.add('simverse-hidden');
    }

    /**
     * Update Inspector UI with telemetry data
     * @param {object} data
     */
    update(data = {}) {
        if (!this.container) return;

        if (data.agentId) {
            document.getElementById('sim-val-agent').textContent = data.agentId;
        }

        if (data.intelligence) {
            const { latentMean, uncertainty } = data.intelligence;
            document.getElementById('sim-val-intel').textContent = `μ=${latentMean} (σ=${uncertainty})`;
        }

        if (data.processingSpeed !== undefined) {
            document.getElementById('sim-val-speed').textContent = `${data.processingSpeed}`;
        }

        if (data.directives) {
            const { cognitiveAccessibility, conditions, outcomeConstraint, metrics } = data.directives;
            const tierEl = document.getElementById('sim-val-tier');
            tierEl.textContent = cognitiveAccessibility.toUpperCase();
            tierEl.className = `simverse-badge ${cognitiveAccessibility}`;

            document.getElementById('sim-val-gap').textContent = `${metrics.capabilityGap > 0 ? '+' : ''}${metrics.capabilityGap}`;
            document.getElementById('sim-val-permitted').textContent = outcomeConstraint.solutionPermitted ? 'TRUE' : 'FALSE';
            document.getElementById('sim-val-permitted').style.color = outcomeConstraint.solutionPermitted ? '#9ae6b4' : '#feb2b2';
            document.getElementById('sim-val-strain').textContent = conditions.experiencingStrain ? 'ACTIVE' : 'NONE';
        }

        if (data.promptDirective) {
            document.getElementById('sim-val-directive').textContent = data.promptDirective;
        }

        if (data.validationResult) {
            const valEl = document.getElementById('sim-val-validation');
            if (data.validationResult.isValid) {
                valEl.textContent = 'PASS';
                valEl.style.color = '#9ae6b4';
            } else {
                valEl.textContent = 'VIOLATION REJECTED';
                valEl.style.color = '#feb2b2';
            }
        }
    }
}

module.exports = {
    PsychologyInspector
};