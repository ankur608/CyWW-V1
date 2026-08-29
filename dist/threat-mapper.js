/**
 * CyWW Threat Mapping & Zero Trust Architecture (ZTA) Attestation Engine
 * Maps client-side heuristics and server-side telemetry to MITRE ATT&CK and MITRE ATLAS matrices.
 * Enforces cryptographic attestation tokens and produces signed audit payloads.
 */
export class ThreatMapper {
    static MITRE_CATALOG = {
        HOMOGRAPH_ATTACK: {
            framework: "MITRE ATT&CK",
            techniqueId: "T1566",
            subTechniqueId: "T1566.002",
            techniqueName: "Phishing: Spearphishing Link",
            tactic: "Initial Access",
            mitigationId: "M1031",
            description: "Internationalized Domain Name (IDN) homograph lookalike impersonation detected."
        },
        TYPOSQUATTING: {
            framework: "MITRE ATT&CK",
            techniqueId: "T1566",
            subTechniqueId: "T1566.002",
            techniqueName: "Phishing: Spearphishing Link",
            tactic: "Initial Access",
            mitigationId: "M1031",
            description: "Levenshtein distance lexical anomaly targeting authenticated brands."
        },
        UI_REDRESSING: {
            framework: "MITRE ATT&CK",
            techniqueId: "T1144",
            subTechniqueId: "T1144.001",
            techniqueName: "Gatekeeper Bypass / Late-stage UI Redressing",
            tactic: "Defense Evasion",
            mitigationId: "M1054",
            description: "Invisible overlay, zero-opacity clickjacking layer, or z-index frame hijacking intercepted."
        },
        AITM_SESSION_HARVEST: {
            framework: "MITRE ATT&CK",
            techniqueId: "T1539",
            subTechniqueId: "T1539.001",
            techniqueName: "Steal Web Session Cookie via AiTM Proxy",
            tactic: "Credential Access",
            mitigationId: "M1027",
            description: "Adversary-in-the-Middle reverse proxy detected intercepting session tokens and dynamic forms."
        },
        PROTOCOL_SMUGGLING: {
            framework: "MITRE ATT&CK",
            techniqueId: "T1437",
            subTechniqueId: "T1437.001",
            techniqueName: "Application Layer Protocol Manipulation",
            tactic: "Command and Control",
            mitigationId: "M1037",
            description: "Data URI, base64 payload smuggling, or unauthenticated websocket tunnel detected."
        },
        ADVERSARIAL_INPUT_PERTURBATION: {
            framework: "MITRE ATLAS",
            techniqueId: "AML.T0043",
            techniqueName: "Adversarial Perturbation / Evasion",
            tactic: "Defense Evasion",
            mitigationId: "AML.M0015",
            description: "Adversarial text injection or gradient-based perturbation intended to bypass local NLP heuristics."
        },
        BRAND_IMPERSONATION: {
            framework: "MITRE ATT&CK",
            techniqueId: "T1566",
            subTechniqueId: "T1566.002",
            techniqueName: "Phishing: High-Target Brand Impersonation",
            tactic: "Initial Access",
            mitigationId: "M1031",
            description: "Structural Similarity Index Measure (SSIM > 0.85) visual match on an unauthorized origin."
        },
        MAGIC_BYTE_MISMATCH: {
            framework: "MITRE ATT&CK",
            techniqueId: "T1204",
            subTechniqueId: "T1204.002",
            techniqueName: "User Execution: Malicious File",
            tactic: "Execution",
            mitigationId: "M1049",
            description: "Cryptographic file magic bytes do not correspond to advertised HTTP Content-Type headers."
        },
        HIGH_ENTROPY_PAYLOAD: {
            framework: "MITRE ATT&CK",
            techniqueId: "T1027",
            subTechniqueId: "T1027.002",
            techniqueName: "Obfuscated Files or Information: Software Packing/High Shannon Entropy",
            tactic: "Defense Evasion",
            mitigationId: "M1027",
            description: "Downloaded payload exceeds safe Shannon entropy threshold (> 7.2) indicating packing or encryption."
        }
    };
    /**
     * Maps an array of threat telemetry signals into MITRE ATT&CK and MITRE ATLAS matrix records.
     */
    static mapTelemetryToMitre(signals) {
        const mappings = new Map();
        for (const signal of signals) {
            const mapping = this.MITRE_CATALOG[signal.signalType];
            if (mapping) {
                const key = `${mapping.techniqueId}_${mapping.subTechniqueId || "none"}`;
                if (!mappings.has(key)) {
                    mappings.set(key, mapping);
                }
            }
        }
        return Array.from(mappings.values());
    }
    /**
     * Calculates the unified ZTA threat score (0-100) based on weighted signals.
     */
    static computeCompositeRisk(signals) {
        if (signals.length === 0)
            return 0;
        let cumulativeScore = 0;
        const weights = {
            LOW: 1.0,
            MEDIUM: 2.0,
            HIGH: 3.5,
            CRITICAL: 5.0
        };
        let totalWeight = 0;
        for (const s of signals) {
            const w = weights[s.severity] || 1.0;
            cumulativeScore += s.score * w;
            totalWeight += w;
        }
        const normalized = Math.min(100, Math.round(cumulativeScore / (totalWeight || 1)));
        return normalized;
    }
    /**
     * Computes SHA-256 hex digest for arbitrary input string using Web Crypto API.
     */
    static async computeSha256(data) {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    /**
     * Generates a cryptographically signed ZTA Attestation Token using Web Crypto HMAC-SHA256.
     */
    static async generateAttestationToken(domain, sessionId, healthScore, verifiedBrand, secretKeyHex) {
        const issuedAt = Date.now();
        const expiresAt = issuedAt + 1000 * 60 * 15; // 15 minutes validity
        const rawPayload = {
            tokenId: `ZTA-${crypto.randomUUID()}`,
            domain,
            sessionId,
            issuedAt,
            expiresAt,
            ztaHealthScore: healthScore,
            verifiedBrand,
            integrityHash: await this.computeSha256(`${domain}:${sessionId}:${issuedAt}:${healthScore}`)
        };
        const payloadJson = JSON.stringify(rawPayload);
        const encodedPayload = btoa(unescape(encodeURIComponent(payloadJson)));
        // Derive HMAC key
        const keyData = new TextEncoder().encode(secretKeyHex);
        const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
        const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(encodedPayload));
        const signatureHex = Array.from(new Uint8Array(signatureBuffer))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
        return `${encodedPayload}.${signatureHex}`;
    }
    /**
     * Verifies the authenticity and expiration of a signed ZTA Attestation Token.
     */
    static async verifyAttestationToken(tokenString, secretKeyHex) {
        const parts = tokenString.split(".");
        if (parts.length !== 2) {
            return { valid: false, reason: "Malformed token structure" };
        }
        const [encodedPayload, signatureHex] = parts;
        const keyData = new TextEncoder().encode(secretKeyHex);
        const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
        // Convert signature hex back to Uint8Array
        const sigBytes = new Uint8Array(signatureHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []);
        const isValidSig = await crypto.subtle.verify("HMAC", cryptoKey, sigBytes, new TextEncoder().encode(encodedPayload));
        if (!isValidSig) {
            return { valid: false, reason: "Cryptographic signature mismatch" };
        }
        try {
            const decodedJson = decodeURIComponent(escape(atob(encodedPayload)));
            const payload = JSON.parse(decodedJson);
            if (Date.now() > payload.expiresAt) {
                return { valid: false, reason: "Token expired", payload };
            }
            return { valid: true, payload };
        }
        catch {
            return { valid: false, reason: "JSON decoding failure" };
        }
    }
    /**
     * Generates a formal Markdown audit entry for SOC and automated compliance logging.
     */
    static formatMarkdownAuditLog(incident) {
        const timestampIso = new Date(incident.timestamp).toISOString();
        return `### [CyWW-ZTA AUDIT LOG] - Incident ID: \`${incident.incidentId}\`
- **Timestamp**: ${timestampIso}
- **Target Domain**: \`${incident.originDomain}\`
- **Computed Composite Risk**: **${incident.riskScore}/100**
- **Automated Enforcement Verdict**: **\`${incident.verdict}\`**
- **Attestation Token State**: ${incident.attestationToken ? `\`Verified (${incident.attestationToken.substring(0, 16)}...)\`` : "*Unattested / Revoked*"}

#### Active MITRE ATT&CK & ATLAS Framework Alignments
| Framework | ID | Sub-Technique | Technique Name | Tactic | Mitigation |
|:---|:---|:---|:---|:---|:---|
${incident.mitreMappings
            .map((m) => `| ${m.framework} | **${m.techniqueId}** | ${m.subTechniqueId || "N/A"} | ${m.techniqueName} | ${m.tactic} | \`${m.mitigationId}\` |`)
            .join("\n")}

#### Granular Telemetry Vector Signals
${incident.telemetrySignals
            .map((s, idx) => `${idx + 1}. **[${s.source}] ${s.signalType}** (Severity: \`${s.severity}\`, Score: \`${s.score}\`)\n   - Description: ${this.MITRE_CATALOG[s.signalType]?.description || "Telemetry threshold exceeded"}\n   - Raw Metadata: \`${JSON.stringify(s.details)}\``)
            .join("\n")}

---
*Cryptographic ZTA Attestation generated by CyWW Defense Core.*
`;
    }
}
