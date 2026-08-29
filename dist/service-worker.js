/**
 * CyWW-Core Service Worker
 * Central Zero Trust Architecture (ZTA) Orchestration Brain.
 * Manages DeclarativeNetRequest dynamic rule sets, tab state lifecycles,
 * download payload cryptographic magic-byte verification, Shannon entropy analysis,
 * and high-throughput inter-component message routing with the edge AI Core and Threat Mapper.
 */
import { AiEngineCore } from "./ai-engine-stub.js";
import { ThreatMapper } from "./threat-mapper.js";
class ServiceWorkerOrchestrator {
    aiEngine;
    secretHmacKey = "cyww-defense-hmac-master-key-prod-zta";
    activeSessions = new Map();
    dynamicRuleCounter = 1000;
    constructor() {
        this.aiEngine = new AiEngineCore();
        this.registerLifecycles();
    }
    async initialize() {
        try {
            await this.aiEngine.initialize();
            await this.initStorage();
            this.setupDnrRules();
            console.info("[CyWW-Core] Service Worker ZTA Orchestration Brain Online.");
        }
        catch (err) {
            console.error("[CyWW-Core] Initialization failure:", err);
        }
    }
    registerLifecycles() {
        // Service worker installation & activation
        chrome.runtime.onInstalled.addListener(() => {
            void this.initialize();
        });
        // Tab navigation and update tracking
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.status === "loading" && tab.url) {
                void this.handleTabNavigation(tabId, tab.url);
            }
        });
        // Message bus for content script communication
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender)
                .then((res) => sendResponse(res))
                .catch((err) => sendResponse({ error: true, message: err.message }));
            return true; // Keep channel open for async response
        });
        // Downloads payload verification (Magic Bytes & Entropy)
        chrome.downloads.onCreated.addListener((downloadItem) => {
            void this.inspectDownloadItem(downloadItem);
        });
    }
    async initStorage() {
        const existingKey = await chrome.storage.local.get("cyww_hmac_key");
        if (!existingKey.cyww_hmac_key) {
            const generated = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
            this.secretHmacKey = generated;
            await chrome.storage.local.set({ cyww_hmac_key: generated });
        }
        else {
            this.secretHmacKey = existingKey.cyww_hmac_key;
        }
    }
    /**
     * Evaluates inbound tab navigation under Zero Trust Architecture.
     */
    async handleTabNavigation(tabId, urlString) {
        if (!urlString.startsWith("http://") && !urlString.startsWith("https://")) {
            return;
        }
        try {
            const parsed = new URL(urlString);
            const domain = parsed.hostname;
            const signals = [];
            // 1. Lexical and IDN Homograph check
            const homographResult = this.aiEngine.evaluateDomainHomograph(domain);
            if (homographResult.isSuspicious) {
                signals.push({
                    source: "CLIENT_NETWORK",
                    signalType: "HOMOGRAPH_ATTACK",
                    severity: "HIGH",
                    score: 85,
                    targetUrl: urlString,
                    originDomain: domain,
                    details: {
                        punycode: homographResult.punycode,
                        mixedScripts: homographResult.mixedScripts,
                        detectedScripts: homographResult.detectedScripts,
                        targetBrandMatch: homographResult.targetBrandMatch,
                        levenshteinDistance: homographResult.levenshteinDistance
                    },
                    timestamp: Date.now()
                });
            }
            // 2. Compute risk score
            const riskScore = ThreatMapper.computeCompositeRisk(signals);
            const isQuarantined = riskScore >= 75;
            if (isQuarantined) {
                await this.applyDynamicDnrBlock(domain);
                await this.recordSecurityIncident(domain, riskScore, signals, "BLOCK_PERMANENT");
            }
            else {
                // Issue transient ZTA attestation token for safe/neutral origin
                const token = await ThreatMapper.generateAttestationToken(domain, `TAB-${tabId}`, 100 - riskScore, homographResult.targetBrandMatch, this.secretHmacKey);
                this.activeSessions.set(domain, {
                    sessionId: `TAB-${tabId}`,
                    domain,
                    riskScore,
                    attestationToken: token,
                    verifiedAt: Date.now(),
                    quarantined: false
                });
            }
        }
        catch (err) {
            console.warn("[CyWW-Core] Tab navigation inspection caught error:", err);
        }
    }
    /**
     * Intercepts messages from content script.
     */
    async handleMessage(request, sender) {
        const origin = sender.tab?.url ? new URL(sender.tab.url).hostname : (request.domain || "unknown");
        switch (request.action) {
            case "VERIFY_ORIGIN": {
                const session = this.activeSessions.get(origin);
                return {
                    allowed: session ? !session.quarantined : true,
                    attestationToken: session?.attestationToken || null,
                    riskScore: session?.riskScore || 0
                };
            }
            case "VERIFY_INTERACTION": {
                const session = this.activeSessions.get(origin);
                const signals = [];
                // Check if form targets unverified domain
                if (request.formDetails?.action) {
                    try {
                        const actionDomain = new URL(request.formDetails.action, sender.tab?.url).hostname;
                        if (actionDomain !== origin) {
                            // Potential credential exfiltration to external origin
                            signals.push({
                                source: "CLIENT_DOM",
                                signalType: "AITM_SESSION_HARVEST",
                                severity: "HIGH",
                                score: 80,
                                targetUrl: request.formDetails.action,
                                originDomain: origin,
                                details: {
                                    formAction: request.formDetails.action,
                                    originDomain: origin,
                                    hasPassword: request.formDetails.hasPassword
                                },
                                timestamp: Date.now()
                            });
                        }
                    }
                    catch {
                        // Malformed action URL
                    }
                }
                const risk = ThreatMapper.computeCompositeRisk(signals);
                if (risk > 60 || session?.quarantined) {
                    await this.recordSecurityIncident(origin, risk, signals, "TERMINATE_SESSION");
                    return { allowed: false, reason: "Zero Trust policy violation: unverified interaction." };
                }
                return { allowed: true, token: session?.attestationToken };
            }
            case "ANALYZE_CANVAS_FRAME": {
                if (!request.frameBuffer || !request.width || !request.height) {
                    return { status: "ERROR", message: "Incomplete frame buffer payload" };
                }
                const buffer = new Uint8ClampedArray(request.frameBuffer);
                const match = this.aiEngine.matchVisualBrandImpersonation(buffer, request.width, request.height, origin);
                if (match.impersonating) {
                    const signals = [
                        {
                            source: "CLIENT_AI",
                            signalType: "BRAND_IMPERSONATION",
                            severity: "CRITICAL",
                            score: 95,
                            targetUrl: sender.tab?.url || origin,
                            originDomain: origin,
                            details: {
                                matchedBrand: match.matchedBrand,
                                ssimScore: match.ssimScore
                            },
                            timestamp: Date.now()
                        }
                    ];
                    await this.applyDynamicDnrBlock(origin);
                    await this.recordSecurityIncident(origin, 95, signals, "BLOCK_PERMANENT");
                    return { impersonating: true, matchedBrand: match.matchedBrand, ssim: match.ssimScore };
                }
                return { impersonating: false, ssim: match.ssimScore };
            }
            case "REPORT_DOM_MUTATION": {
                const text = request.extractedText || "";
                const inference = await this.aiEngine.runTextInference(text);
                const signals = [];
                if (inference.isPhishing) {
                    signals.push({
                        source: "CLIENT_AI",
                        signalType: "ADVERSARIAL_INPUT_PERTURBATION",
                        severity: "HIGH",
                        score: Math.round(inference.confidence * 100),
                        targetUrl: sender.tab?.url || origin,
                        originDomain: origin,
                        details: {
                            confidence: inference.confidence,
                            perturbationRisk: inference.perturbationRisk
                        },
                        timestamp: Date.now()
                    });
                    await this.recordSecurityIncident(origin, 85, signals, "QUARANTINE");
                    return { quarantined: true, confidence: inference.confidence };
                }
                return { quarantined: false, confidence: inference.confidence };
            }
            case "GET_ZTA_STATUS": {
                const session = this.activeSessions.get(origin);
                return {
                    session: session || null,
                    domain: origin,
                    allSessionsCount: this.activeSessions.size
                };
            }
            case "EVALUATE_DOMAIN": {
                const target = request.domain || origin;
                const homograph = this.aiEngine.evaluateDomainHomograph(target);
                return { result: homograph };
            }
            case "GET_ALL_INCIDENTS": {
                const data = await chrome.storage.local.get("cyww_incident_ledger");
                return { incidents: data.cyww_incident_ledger || [] };
            }
            case "CLEAR_INCIDENTS": {
                await chrome.storage.local.set({ cyww_incident_ledger: [] });
                return { success: true };
            }
            default:
                return { status: "UNKNOWN_ACTION" };
        }
    }
    /**
     * Inspects downloads for MIME mismatches, Magic Byte spoofing, and Shannon Entropy anomalies.
     */
    async inspectDownloadItem(downloadItem) {
        try {
            const url = downloadItem.url;
            const mime = downloadItem.mime || "";
            const filename = downloadItem.filename || "";
            // In MV3 service workers, fetch header preview or byte streams
            const response = await fetch(url, { method: "GET", headers: { Range: "bytes=0-1024" } });
            const arrayBuffer = await response.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            const isMismatch = this.verifyMagicBytes(bytes, mime, filename);
            const entropy = this.calculateShannonEntropy(bytes);
            const signals = [];
            if (isMismatch) {
                signals.push({
                    source: "CLIENT_DOWNLOAD",
                    signalType: "MAGIC_BYTE_MISMATCH",
                    severity: "CRITICAL",
                    score: 95,
                    targetUrl: url,
                    originDomain: new URL(url).hostname,
                    details: { mime, filename, bytesPreview: Array.from(bytes.slice(0, 8)) },
                    timestamp: Date.now()
                });
            }
            if (entropy > 7.2) {
                signals.push({
                    source: "CLIENT_DOWNLOAD",
                    signalType: "HIGH_ENTROPY_PAYLOAD",
                    severity: "HIGH",
                    score: 85,
                    targetUrl: url,
                    originDomain: new URL(url).hostname,
                    details: { entropy, filename },
                    timestamp: Date.now()
                });
            }
            if (signals.length > 0) {
                chrome.downloads.cancel(downloadItem.id, () => {
                    console.warn(`[CyWW-Core] Intercepted and cancelled malicious download ID: ${downloadItem.id}`);
                });
                const risk = ThreatMapper.computeCompositeRisk(signals);
                await this.recordSecurityIncident(new URL(url).hostname, risk, signals, "BLOCK_PERMANENT");
            }
        }
        catch (err) {
            console.warn("[CyWW-Core] Download payload stream analysis caught error:", err);
        }
    }
    /**
     * Verifies file header magic bytes against advertised MIME type.
     */
    verifyMagicBytes(bytes, mime, filename) {
        if (bytes.length < 4)
            return false;
        // PE Executable check: MZ header (0x4D, 0x5A)
        const isPE = bytes[0] === 0x4d && bytes[1] === 0x5a;
        // PDF magic bytes: %PDF- (0x25, 0x50, 0x44, 0x46)
        const isPDF = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
        const lowerFilename = filename.toLowerCase();
        // If file claims to be a PDF or image, but header has MZ executable signatures:
        if ((mime.includes("pdf") || lowerFilename.endsWith(".pdf")) && !isPDF && isPE) {
            return true; // Malicious spoofing detected
        }
        if ((mime.includes("image") || lowerFilename.endsWith(".png") || lowerFilename.endsWith(".jpg")) &&
            isPE) {
            return true; // Executable disguised as image
        }
        return false;
    }
    /**
     * Computes the Shannon entropy of a byte buffer.
     * Values > 7.2 typically indicate packed or encrypted malware droppers.
     */
    calculateShannonEntropy(data) {
        if (data.length === 0)
            return 0;
        const frequencies = new Map();
        for (const byte of data) {
            frequencies.set(byte, (frequencies.get(byte) || 0) + 1);
        }
        let entropy = 0;
        const len = data.length;
        for (const count of frequencies.values()) {
            const p = count / len;
            entropy -= p * Math.log2(p);
        }
        return entropy;
    }
    /**
     * Applies dynamic declarativeNetRequest block rules.
     */
    async applyDynamicDnrBlock(domain) {
        const ruleId = this.dynamicRuleCounter++;
        const rule = {
            id: ruleId,
            priority: 1,
            action: { type: chrome.declarativeNetRequest.RuleActionType.BLOCK },
            condition: {
                urlFilter: `||${domain}^`,
                resourceTypes: [
                    chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
                    chrome.declarativeNetRequest.ResourceType.SUB_FRAME,
                    chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
                    chrome.declarativeNetRequest.ResourceType.SCRIPT
                ]
            }
        };
        await chrome.declarativeNetRequest.updateDynamicRules({
            addRules: [rule]
        });
        console.warn(`[CyWW-Core] DNR Dynamic Rule Applied: Blocked domain ${domain} (Rule ID: ${ruleId})`);
    }
    async recordSecurityIncident(domain, risk, signals, verdict) {
        const incidentId = `INC-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        const mappings = ThreatMapper.mapTelemetryToMitre(signals);
        const incident = {
            incidentId,
            timestamp: Date.now(),
            originDomain: domain,
            riskScore: risk,
            verdict,
            mitreMappings: mappings,
            telemetrySignals: signals
        };
        const markdownLog = ThreatMapper.formatMarkdownAuditLog(incident);
        console.warn(markdownLog);
        // Persist to local storage audit ledger
        const existing = await chrome.storage.local.get("cyww_incident_ledger");
        const ledger = existing.cyww_incident_ledger || [];
        ledger.push(incident);
        await chrome.storage.local.set({ cyww_incident_ledger: ledger });
    }
    setupDnrRules() {
        // Initial dynamic rules cleanup and hygiene
        chrome.declarativeNetRequest.getDynamicRules((rules) => {
            const ruleIds = rules.map((r) => r.id);
            if (ruleIds.length > 5000) {
                // Purge oldest rules to maintain optimal lookup latency
                chrome.declarativeNetRequest.updateDynamicRules({
                    removeRuleIds: ruleIds.slice(0, 1000)
                });
            }
        });
    }
}
const orchestrator = new ServiceWorkerOrchestrator();
void orchestrator.initialize();
