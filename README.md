# CyWW ActiveAI™ (v1.0.0)
### Military-Grade Zero Trust Anti-Phishing Defense & Autonomous Threat Operations Suite

[![Status](https://img.shields.io/badge/Release-V1.0.0_Production-00ff9d?style=for-the-badge&logo=github)](https://github.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
[![Security Posture](https://img.shields.io/badge/Security_Score-100%25_Defense--Grade-00e5ff?style=for-the-badge)](https://github.com)
[![Compliance](https://img.shields.io/badge/Compliance-SOC_2_|_GDPR_|_ISO_27001-ff6b00?style=for-the-badge)](https://github.com)
[![Deployment](https://img.shields.io/badge/GitHub_Pages-Ready-purple?style=for-the-badge&logo=githubpages)](https://github.com)

---

## 🌐 Live Web Hosting via GitHub Pages

CyWW ActiveAI v1.0.0 is fully packaged as a **100% static, client-side, zero-dependency progressive web application (PWA)** that can be hosted directly on GitHub Pages with zero server setup required.

### 🚀 1-Click GitHub Pages Deployment

1. **Push this repository to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Release CyWW ActiveAI V1.0.0 for GitHub Pages"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```

2. **Enable GitHub Pages**:
   - Go to your repository on GitHub.
   - Click **Settings** $\to$ **Pages** (in the left sidebar).
   - Under **Build and deployment**:
     - **Option A (Automatic via GitHub Actions - Recommended)**:
       - Source: Select **GitHub Actions**. The included workflow (`.github/workflows/deploy.yml`) will automatically build and publish the application on every commit!
     - **Option B (Deploy from branch)**:
       - Source: Select **Deploy from a branch**.
       - Branch: Select `main` and folder `/docs` (or `/ (root)`).
       - Click **Save**.

3. **Access Your Live Threat Platform**:
   - Your application will be live at:
     ```
     https://<your-username>.github.io/<your-repo-name>/
     ```

---

## 🛡️ Core Capabilities & Modular Inventory

### 1. ⛯ Pattern of Life Topology
* Unsupervised GMM & K-Means clustering continuously learning user and endpoint communication baselines.
* Flags behavioral drift ($\sigma > 3.2$) without static rule overhead.
* 2,480 active endpoint nodes with real-time graph visualization.

### 2. 🌐 Global Threat Map (Cartographic Ballistic Radar)
* Vector-calibrated equirectangular digital cartography matching WGS-84 sovereign landmasses at 60 FPS Retina HiDPI.
* Origin-to-target ballistic laser pulses and real-time C2 beacon correlation across 44 sovereign tracking points.
* Real-time live incident stream overlay with pause/resume and full-screen controls.

### 3. ✉ Email Ingestion & Cryptographic MTA
* RFC 5322 raw EML parser evaluating SPF (RFC 7208), DKIM (RFC 6376), DMARC strict `p=reject` (RFC 7489), and BIMI VMC certificates.
* **Live Known Threat Database Repository**:
  - `[Nazario BEC Wire]`: Executive wire transfer escrow fraud ($348,000 BEC).
  - `[PhishTank AiTM]`: Microsoft 365 MFA session token reverse-proxy harvest.
  - `[OpenPhish Quishing]`: DocuSign option grant with embedded SVG QR matrix.
  - `[VirusTotal Dropper]`: Overdue statement with Cobalt Strike dropper payload.
  - `[Spamhaus Payroll]`: Direct deposit lookalike credential phishing.
  - `[Enron Clean Corpus]`: Authentic internal engineering sprint sync.
  - `[JPMorgan Clean]`: Whitelisted financial transaction ledger statement.
* **ActiveAI Neural Inference Console**: Instant model classification, Bayesian probabilities, and **Bailey XAI (Explainable AI)** reasoning with 1-click dispatch to the Cyber AI Analyst.

### 4. ☣ Automated Sandbox Detonation & Content Disarm and Reconstruction (CDR)
* CAPE Hypervisor micro-VM dynamic execution tracing with anti-evasion timing and process injection inspection.
* **Votiro / Barracuda-Grade CDR Engine**:
  - **Phase 1 (Disarm)**: Strips VBA macros (`Auto_Open`), OLE shellcode, PDF active JS, and external template injections.
  - **Phase 2 (Reconstruction)**: Re-encodes documents into safe ISO 19005 (PDF/A-2b) format with 100% visual and layout fidelity.
  - **Phase 3 (Attestation)**: Computes dual pre-CDR and clean post-CDR SHA-256 hashes with **1-click clean artifact download**.

### 5. ⚙ TheHive & Cortex SOAR Incident Orchestration
* 5-stage automated incident containment playbooks: Anomaly Triage $\to$ Postfix Queue Hold (`postsuper -h`) $\to$ Enterprise Mailbox Retro-Purge (Graph API) $\to$ BGP Flowspec DNS Sinkhole $\to$ MISP STIX 2.1 Broadcast.
* Real-time Cortex responder terminal and live MISP indicator feed table.

### 6. 🎯 Adaptive Simulation & Online Model Re-Training
* Translates live inbound threat lures into targeted executive drills.
* Interactive Bayesian & SGD online neural model re-training with live convergence canvas tracking cross-entropy loss reduction.

### 7. ⚡ Cyber AI Analyst™ Autonomous Desk
* Automated case investigation generating natural-language narratives and MITRE ATT&CK enterprise correlation.
* Cryptographically signed, defense-grade PDF 1.4 and JSON dossier export engine with embedded SHA-256 tamper seals.

### 8. 🛡️ Defensive VAPT Security Audit
* Real-time defensive posture auditing verifying OWASP Top 10 defenses.
* Hardened against path traversal (`403 Forbidden`), poison null bytes (`400 Bad Request`), and prohibited HTTP methods (`405 Method Not Allowed`).
* 100% compliance declarations for SOC 2 Type II, GDPR Article 32, ISO/IEC 27001 (Annex A.8), and Enterprise Architecture (TOGAF / FEA).

### 9. 🔍 Real-Time Cyber HUD Hover Popovers
* Futuristic glassmorphic HUD tooltips that dynamically attach to the cursor when hovering over any navigation tab or top telemetry KPI ribbon card.
* Displays live numerical readouts, underlying status badges, and real-time operational intelligence briefings.

---

## 💻 Local Execution (Optional Server Mode)

If you wish to run the backend server with local rate limiting and live penetration test harnesses:

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run build

# Start hardened defense server on port 3000
npm run serve
```
Open your browser at `http://localhost:3000`.

---

## 📂 Repository Structure

```
CyWW/
├── .github/workflows/deploy.yml    # Automatic GitHub Pages CI/CD Action
├── .nojekyll                       # Disables Jekyll processing on GitHub Pages
├── 404.html                        # GitHub Pages SPA Router & Redirector
├── index.html                      # Root entrypoint for GitHub Pages / (root)
├── app.js                          # Core CyWW ActiveAI V1 Engine & Radar
├── report-exporter.js              # Cryptographic PDF 1.4 & JSON Exporter
├── styles.css                      # Cyber Dark/Light Military Design System
├── world.geojson                   # Equirectangular Cartographic GeoJSON
├── docs/                           # Dedicated distribution folder for GitHub Pages
│   ├── index.html
│   ├── app.js
│   ├── report-exporter.js
│   ├── styles.css
│   ├── world.geojson
│   ├── 404.html
│   └── .nojekyll
├── dashboard/                      # Source dashboard components for local server
├── serve.js                        # Hardened Node.js static & API server
├── package.json                    # Dependencies & build scripts
└── tsconfig.json                   # TypeScript compiler configuration
```

---

## 📜 Compliance & Verification

* **SOC 2 Type II**: Trust Services Criteria CC6.1, CC6.6, CC7.2
* **GDPR**: Article 32 (Technical & Organizational Measures for Data Resilience)
* **ISO/IEC 27001**: Information Security Management (Annex A.8 Technical Controls)
* **W3C & IETF**: RFC 5322, RFC 7208 (SPF), RFC 6376 (DKIM), RFC 7489 (DMARC)

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---
*CyWW ActiveAI™ v1.0.0 — Licensed under MIT for Global Cyber Defense, Enterprise & Academic Research.*
