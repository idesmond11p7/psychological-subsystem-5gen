/**
 * HSDXD Simverse 5 — Psychology Power System
 * File: index.js
 * 
 * SillyTavern Browser-Native Extension Entry Point.
 */

'use strict';

(function () {
    // ========================================================================
    // 1. CORE TYPES & MATH (Browser Native)
    // ========================================================================

    class PRNG {
        constructor(seed = 1337) {
            this._state = typeof seed === 'number' ? (seed >>> 0) || 1 : 1337;
        }
        next() {
            let t = (this._state += 0x6D2B79F5);
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        }
        nextGaussian() {
            let u = 0, v = 0;
            while (u === 0) u = this.next();
            while (v === 0) v = this.next();
            return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        }
    }

    const DefaultPRNG = new PRNG(42);

    function sampleGamma(shape, scale = 1.0, prng = DefaultPRNG) {
        if (shape < 1.0) {
            return sampleGamma(shape + 1.0, scale, prng) * Math.pow(prng.next(), 1.0 / shape);
        }
        const d = shape - 1.0 / 3.0;
        const c = 1.0 / Math.sqrt(9.0 * d);
        while (true) {
            let x, v;
            do {
                x = prng.nextGaussian();
                v = 1.0 + c * x;
            } while (v <= 0.0);
            v = v * v * v;
            const u = prng.next();
            if (u < 1.0 - 0.0331 * x * x * x * x) return d * v * scale;
            if (Math.log(u) < 0.5 * x * x + d * (1.0 - v + Math.log(v))) return d * v * scale;
        }
    }

    class BoundedBetaDistribution {
        constructor(alpha, beta, min = 0, max = 100) {
            this.alpha = alpha;
            this.beta = beta;
            this.min = min;
            this.max = max;
        }
        static fromMeanAndUncertainty(mean, uncertainty, min = 0, max = 100) {
            const range = max - min;
            const normalizedMean = Math.max(0.01, Math.min(0.99, (mean - min) / range));
            const maxVar = normalizedMean * (1 - normalizedMean);
            const normalizedVar = Math.max(0.0001, Math.min(maxVar * 0.9, Math.pow(uncertainty / range, 2)));

            const factor = (normalizedMean * (1 - normalizedMean) / normalizedVar) - 1;
            const alpha = Math.max(0.1, normalizedMean * factor);
            const beta = Math.max(0.1, (1 - normalizedMean) * factor);
            return new BoundedBetaDistribution(alpha, beta, min, max);
        }
        get mean() {
            return this.min + (this.alpha / (this.alpha + this.beta)) * (this.max - this.min);
        }
        get variance() {
            const a = this.alpha, b = this.beta;
            return ((a * b) / (Math.pow(a + b, 2) * (a + b + 1))) * Math.pow(this.max - this.min, 2);
        }
        get standardDeviation() {
            return Math.sqrt(this.variance);
        }
        toJSON() {
            return {
                type: "BoundedBetaDistribution",
                alpha: Number(this.alpha.toFixed(4)),
                beta: Number(this.beta.toFixed(4)),
                min: this.min,
                max: this.max,
                mean: Number(this.mean.toFixed(2)),
                std: Number(this.standardDeviation.toFixed(2))
            };
        }
    }

    function clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    }

    // ========================================================================
    // 2. INITIALIZATION (Regex IQ & Evidence Aggregator)
    // ========================================================================

    class RegexExtractor {
        static extract(textBuffer) {
            if (!textBuffer || typeof textBuffer !== 'string') return [];
            const evidence = [];

            // Pattern 1: Ranges (e.g. "IQ: 120-130", "IQ between 140 and 150")
            const rangeRegex = /\bIQ\s*(?:[:=]|between|from|in the range of)?\s*(\d{2,3})\s*(?:-|to|and)\s*(\d{2,3})\b/gi;
            const matchedRanges = [];
            let match;
            while ((match = rangeRegex.exec(textBuffer)) !== null) {
                const lower = parseInt(match[1], 10);
                const upper = parseInt(match[2], 10);
                if (lower >= 40 && upper <= 250 && lower <= upper) {
                    const mid = (lower + upper) / 2;
                    matchedRanges.push(match.index);
                    evidence.push({
                        type: "iq_range",
                        rawClaim: match[0],
                        direction: clamp((mid - 100) / 50, -1.0, 1.0),
                        weight: 0.85,
                        reliability: 0.85
                    });
                }
            }

            // Pattern 2: Exact IQ (e.g. "IQ: 145", "measured IQ 130")
            const exactRegex = /\b(?:measured\s+)?IQ\s*[:=]?\s*(\d{2,3})(?!\s*(?:-|to|and)\s*\d+)\b/gi;
            while ((match = exactRegex.exec(textBuffer)) !== null) {
                if (matchedRanges.some(idx => Math.abs(idx - match.index) < 15)) continue;
                const rawVal = parseInt(match[1], 10);
                if (rawVal >= 40 && rawVal <= 250) {
                    evidence.push({
                        type: "explicit_iq",
                        rawClaim: match[0],
                        direction: clamp((rawVal - 100) / 50, -1.0, 1.0),
                        weight: 0.90,
                        reliability: 0.95
                    });
                }
            }
            return evidence;
        }
    }

    class IntelligenceAggregator {
        static aggregate(evidenceList = []) {
            const BASELINE_I = 50.0;
            const BASELINE_U = 12.0;

            if (!evidenceList || evidenceList.length === 0) {
                const defDist = BoundedBetaDistribution.fromMeanAndUncertainty(BASELINE_I, BASELINE_U, 0, 100);
                return {
                    distribution: defDist.toJSON(),
                    latentMean: BASELINE_I,
                    uncertainty: BASELINE_U,
                    initialized: true,
                    evidenceCount: 0
                };
            }

            let totalWeightedDir = 0, totalWeight = 0;
            const directions = [];
            for (const item of evidenceList) {
                const effWeight = item.weight * item.reliability;
                totalWeightedDir += item.direction * effWeight;
                totalWeight += effWeight;
                directions.push(item.direction);
            }

            const meanDir = totalWeight > 0 ? (totalWeightedDir / totalWeight) : 0;
            const calculatedMean = clamp(BASELINE_I + (meanDir * 45.0), 1.0, 99.0);

            let variance = 0;
            if (directions.length > 1) {
                variance = directions.reduce((acc, d) => acc + Math.pow(d - meanDir, 2), 0) / directions.length;
            }

            const weightReduct = Math.min(9.0, totalWeight * 7.0);
            const calculatedUncertainty = clamp(BASELINE_U - weightReduct + (variance * 10.0), 2.5, 20.0);

            const betaDist = BoundedBetaDistribution.fromMeanAndUncertainty(calculatedMean, calculatedUncertainty, 0, 100);
            return {
                distribution: betaDist.toJSON(),
                latentMean: Number(calculatedMean.toFixed(2)),
                uncertainty: Number(calculatedUncertainty.toFixed(2)),
                initialized: true,
                evidenceCount: evidenceList.length
            };
        }
    }

    // ========================================================================
    // 3. COGNITION ENGINE (Complexity Compiler & Intelligence & Directives)
    // ========================================================================

    class ComplexityCompiler {
        static compile(topology = {}) {
            const nodeCount = topology.nodes?.length || 2;
            const edgeCount = topology.edges?.length || 1;
            const C = clamp((nodeCount * 6.0) + (edgeCount * 12.0), 5, 100);
            const N = clamp(topology.objectiveNovelty ?? 20, 0, 100);
            const A = clamp(topology.abstractionLevel ?? 30, 0, 100);
            const U = clamp(topology.intrinsicUncertainty ?? 15, 0, 100);
            const S = clamp((topology.branchingFactor ?? 2) * 15.0, 5, 100);

            const effectiveDemand = clamp((C * 0.35) + (S * 0.25) + (A * 0.20) + (N * 0.10) + (U * 0.10), 1, 99);
            return {
                problemId: topology.id || `prob_${Date.now()}`,
                demandVector: { C, N, A, U, S },
                effectiveDemand: Number(effectiveDemand.toFixed(2))
            };
        }
    }

    class IntelligenceEngine {
        static evaluate(intelState, complexity) {
            const I = clamp(intelState.latentMean ?? 50, 0, 100);
            const D = clamp(complexity.effectiveDemand ?? 50, 0, 100);
            const capabilityGap = I - D;
            const successProbability = 1.0 / (1.0 + Math.exp(-0.12 * capabilityGap));

            const cognitiveEvents = [];
            if (capabilityGap < -20) {
                cognitiveEvents.push({ type: "comprehension_failure" });
            }
            if (capabilityGap >= -20 && capabilityGap < 15) {
                cognitiveEvents.push({ type: "cognitive_strain" });
            }
            if (capabilityGap >= 20) {
                cognitiveEvents.push({ type: "comfortable_cognitive_capacity" });
            }

            return {
                calculation: {
                    latentIntelligence: I,
                    effectiveDemand: D,
                    capabilityGap: Number(capabilityGap.toFixed(2)),
                    successProbability: Number(successProbability.toFixed(4))
                },
                cognitiveEvents
            };
        }
    }

    class ReasoningDirectives {
        static generate(intelResult, profile = {}) {
            const gap = intelResult.calculation.capabilityGap;
            const events = intelResult.cognitiveEvents.map(e => e.type);

            let accessibility = "accessible";
            if (gap < -20) accessibility = "inaccessible";
            else if (gap < -5) accessibility = "severe_struggle";
            else if (gap < 15) accessibility = "challenging";

            return {
                cognitiveAccessibility: accessibility,
                conditions: {
                    experiencingStrain: events.includes("cognitive_strain") || events.includes("comprehension_failure"),
                    comprehensionLimited: events.includes("comprehension_failure")
                },
                outcomeConstraint: {
                    solutionPermitted: gap > -20 && !events.includes("comprehension_failure"),
                    flawlessResolutionPermitted: gap >= 20
                },
                profile: {
                    style: profile.style || "analytical"
                },
                metrics: { capabilityGap: gap }
            };
        }
    }

    class ContextCompiler {
        static compile(agentId, directives) {
            const { cognitiveAccessibility, conditions, outcomeConstraint, metrics } = directives;
            const lines = [
                `[SIMVERSE_COGNITION_DIRECTIVE: ${agentId}]`,
                `- ACCESSIBILITY: ${cognitiveAccessibility.toUpperCase()} (Gap Δ: ${metrics.capabilityGap > 0 ? '+' : ''}${metrics.capabilityGap})`,
                `- CONDITIONS: [${conditions.experiencingStrain ? 'ACTIVE_COGNITIVE_STRAIN' : 'COMFORTABLE'}]`
            ];
            if (!outcomeConstraint.solutionPermitted) {
                lines.push(`- MANDATE: SOLUTION_FORBIDDEN. Demand exceeds capability; character CANNOT resolve this puzzle.`);
            } else if (!outcomeConstraint.flawlessResolutionPermitted) {
                lines.push(`- MANDATE: FLAWLESS_RESOLUTION_FORBIDDEN. Must reflect cognitive friction.`);
            }
            lines.push(`- MACHINE_OUTPUT: Append <!-- SIMVERSE_OUT { "claimedResolution": boolean, "strainObserved": boolean } -->`);
            return lines.join('\n');
        }
    }

    class OutputValidator {
        static extractAndValidate(rawText, directives) {
            const tagRegex = /<!--\s*SIMVERSE_OUT\s*([\s\S]*?)\s*-->/i;
            const match = tagRegex.exec(rawText || '');
            const sanitizedText = (rawText || '').replace(tagRegex, '').trim();

            let payload = null;
            if (match) {
                try { payload = JSON.parse(match[1].trim()); } catch (e) {}
            }

            const claimedResolution = Boolean(payload?.claimedResolution);
            const violations = [];

            if (!directives.outcomeConstraint.solutionPermitted && claimedResolution) {
                violations.push("ILLEGAL_RESOLUTION: Character claimed resolution when solutionPermitted = false.");
            }

            return {
                isValid: violations.length === 0,
                violations,
                sanitizedText,
                payload
            };
        }
    }

    // ========================================================================
    // 4. UI INSPECTOR (Frontend Monitor Drawer)
    // ========================================================================

    class PsychologyInspector {
        constructor() {
            this.container = null;
            this.visible = false;
        }

        mount() {
            if (document.getElementById('simverse-inspector-drawer')) return;

            // Drawer Panel
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
                            <span class="simverse-label">Latent Intel:</span>
                            <span class="simverse-value" id="sim-val-intel">-- (±--)</span>
                        </div>
                    </div>
                    <div class="simverse-section">
                        <div class="simverse-section-title">Active Cognitive State</div>
                        <div class="simverse-row">
                            <span class="simverse-label">Tier:</span>
                            <span id="sim-val-tier" class="simverse-badge accessible">ACCESSIBLE</span>
                        </div>
                        <div class="simverse-row">
                            <span class="simverse-label">Capability Gap:</span>
                            <span class="simverse-value" id="sim-val-gap">+0.0</span>
                        </div>
                        <div class="simverse-row">
                            <span class="simverse-label">Solution Allowed:</span>
                            <span class="simverse-value" id="sim-val-permitted">TRUE</span>
                        </div>
                    </div>
                    <div class="simverse-section">
                        <div class="simverse-section-title">Directive</div>
                        <div class="simverse-log-box" id="sim-val-directive">Ready.</div>
                    </div>
                    <div class="simverse-section">
                        <div class="simverse-section-title">Telemetry Validation</div>
                        <div class="simverse-row">
                            <span class="simverse-label">Status:</span>
                            <span class="simverse-value" id="sim-val-validation">IDLE</span>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(this.container);

            // Floating 🧠 Button
            const toggleBtn = document.createElement('div');
            toggleBtn.id = 'simverse-toggle-btn';
            toggleBtn.title = 'Open Simverse Inspector';
            toggleBtn.innerHTML = '🧠';
            toggleBtn.onclick = () => this.toggle();
            document.body.appendChild(toggleBtn);

            document.getElementById('simverse-close-btn').onclick = () => this.hide();
            console.log('[Simverse] Inspector UI mounted successfully.');
        }

        toggle() {
            this.visible = !this.visible;
            this.container.classList.toggle('simverse-hidden', !this.visible);
        }

        hide() {
            this.visible = false;
            this.container.classList.add('simverse-hidden');
        }

        update(data = {}) {
            if (!this.container) return;
            if (data.agentId) document.getElementById('sim-val-agent').textContent = data.agentId;
            if (data.intelligence) {
                document.getElementById('sim-val-intel').textContent = `μ=${data.intelligence.latentMean} (σ=${data.intelligence.uncertainty})`;
            }
            if (data.directives) {
                const { cognitiveAccessibility, outcomeConstraint, metrics } = data.directives;
                const tierEl = document.getElementById('sim-val-tier');
                tierEl.textContent = cognitiveAccessibility.toUpperCase();
                tierEl.className = `simverse-badge ${cognitiveAccessibility}`;
                document.getElementById('sim-val-gap').textContent = `${metrics.capabilityGap > 0 ? '+' : ''}${metrics.capabilityGap}`;
                document.getElementById('sim-val-permitted').textContent = outcomeConstraint.solutionPermitted ? 'TRUE' : 'FALSE';
            }
            if (data.promptDirective) {
                document.getElementById('sim-val-directive').textContent = data.promptDirective;
            }
            if (data.validationResult) {
                const vEl = document.getElementById('sim-val-validation');
                vEl.textContent = data.validationResult.isValid ? 'PASS' : 'VIOLATION REJECTED';
                vEl.style.color = data.validationResult.isValid ? '#9ae6b4' : '#feb2b2';
            }
        }
    }

    // ========================================================================
    // 5. EXTENSION INITIALIZATION & HOOKS
    // ========================================================================

    const inspector = new PsychologyInspector();
    let currentAgent = null;
    let activeDirectives = null;

    function initCharacter(context) {
        if (!context.characters || context.characterId === undefined) return;
        const char = context.characters[context.characterId];
        if (!char) return;

        currentAgent = char.avatar || char.name || 'Agent';

        // Check if already in metadata
        let intelState = context.chatMetadata?.[`simverse_intel_${currentAgent}`];
        if (!intelState) {
            const raw = [char.description, char.personality, char.creator_notes, char.mes_example].join('\n');
            const evidence = RegexExtractor.extract(raw);
            intelState = IntelligenceAggregator.aggregate(evidence);

            if (context.chatMetadata) {
                context.chatMetadata[`simverse_intel_${currentAgent}`] = intelState;
                if (typeof context.saveMetadata === 'function') context.saveMetadata();
            }
        }

        inspector.update({ agentId: currentAgent, intelligence: intelState });
    }

    jQuery(async () => {
        console.log('[Simverse] Initializing Psychology Cognition Extension...');
        inspector.mount();

        const context = SillyTavern.getContext();
        const eventTypes = context.event_types;
        const eventSource = context.eventSource;

        // Hook 1: Chat Changed
        eventSource.on(eventTypes.CHAT_CHANGED, () => {
            initCharacter(context);
        });

        // Hook 2: Pre-generation Hook
        eventSource.on(eventTypes.GENERATION_AFTER_COMMANDS, (data) => {
            if (!currentAgent) initCharacter(context);
            if (!currentAgent) return;

            const intelState = context.chatMetadata?.[`simverse_intel_${currentAgent}`] || { latentMean: 50, uncertainty: 12 };
            const complexity = ComplexityCompiler.compile({
                nodes: [{ id: "n1" }, { id: "n2" }],
                abstractionLevel: 30,
                objectiveNovelty: 20
            });

            const intelResult = IntelligenceEngine.evaluate(intelState, complexity);
            activeDirectives = ReasoningDirectives.generate(intelResult);
            const promptDirective = ContextCompiler.compile(currentAgent, activeDirectives);

            if (data && typeof data === 'object') {
                if (Array.isArray(data.prompt)) {
                    data.prompt.push({ role: "system", content: promptDirective });
                } else if (typeof data.prompt === 'string') {
                    data.prompt += `\n\n${promptDirective}`;
                }
            }

            inspector.update({
                agentId: currentAgent,
                directives: activeDirectives,
                promptDirective
            });
        });

        // Hook 3: Message Received Hook
        eventSource.on(eventTypes.MESSAGE_RECEIVED, () => {
            if (!currentAgent || !activeDirectives) return;
            const chat = context.chat;
            if (!Array.isArray(chat) || chat.length === 0) return;

            const lastMsg = chat[chat.length - 1];
            if (!lastMsg || lastMsg.is_user) return;

            const validation = OutputValidator.extractAndValidate(lastMsg.mes, activeDirectives);
            lastMsg.mes = validation.sanitizedText;

            inspector.update({
                agentId: currentAgent,
                validationResult: validation
            });
        });

        initCharacter(context);
    });
})();