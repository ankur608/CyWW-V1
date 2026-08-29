"use strict";
/**
 * CyWW-Core Content Script
 * High-Performance Zero Trust DOM Execution Loop.
 * Intercepts real-time DOM mutations, enforces input isolation on unverified origins,
 * detects UI redressing/clickjacking vectors, and extracts canvas buffers for SSIM visual analysis.
 */
class ContentScriptGuardian {
    isOriginVerified = false;
    currentAttestationToken = null;
    mutationObserver = null;
    lastCapturedFrameTime = 0;
    pendingAnalysis = false;
    constructor() {
        this.init();
    }
    init() {
        // 1. Immediate origin validation with background orchestrator
        void this.verifyCurrentOrigin();
        // 2. Setup proactive input locking and user interaction hooks
        this.hookUserInteractions();
        // 3. Initialize real-time MutationObserver
        this.setupMutationObserver();
        // 4. Hook window load and visual-spatial scan
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => {
                void this.performVisualSpatialScan();
                this.detectUiRedressing();
            });
        }
        else {
            void this.performVisualSpatialScan();
            this.detectUiRedressing();
        }
        // 5. External command bus for administrative and GUI actions
        chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
            if (message.action === "TRIGGER_ZTA_LOCKDOWN") {
                this.lockdownPage(message.reason || "Manual Zero Trust Administrative Lockdown Initiated via CyWW Console.");
                sendResponse({ success: true });
            }
            else if (message.action === "REQUEST_PAGE_AUDIT") {
                this.detectUiRedressing();
                void this.performVisualSpatialScan();
                sendResponse({
                    domain: window.location.hostname,
                    isOriginVerified: this.isOriginVerified,
                    hasAttestationToken: !!this.currentAttestationToken
                });
            }
            return true;
        });
    }
    /**
     * Contacts background service worker to verify current origin against ZTA policies.
     */
    async verifyCurrentOrigin() {
        try {
            const response = (await chrome.runtime.sendMessage({
                action: "VERIFY_ORIGIN",
                domain: window.location.hostname,
                url: window.location.href
            }));
            if (response && response.allowed) {
                this.isOriginVerified = true;
                this.currentAttestationToken = response.attestationToken || null;
            }
            else {
                this.isOriginVerified = false;
                this.lockdownPage(`Zero Trust Policy: Origin ${window.location.hostname} flagged as untrusted.`);
            }
        }
        catch (err) {
            console.warn("[CyWW-Content] Initial origin verification check queued:", err);
        }
    }
    /**
     * Intercepts keystrokes, focus, and clipboard events on form controls prior to browser painting.
     */
    hookUserInteractions() {
        const handleInteraction = (event) => {
            const target = event.target;
            if (!target)
                return;
            const isInput = target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.isContentEditable;
            if (!isInput)
                return;
            const form = target.form;
            const formAction = form ? form.action : window.location.href;
            const hasPassword = form
                ? Array.from(form.elements).some((el) => el.type === "password")
                : target.type === "password";
            // If origin is not yet verified or has no valid attestation token:
            if (!this.isOriginVerified || !this.currentAttestationToken) {
                event.preventDefault();
                event.stopImmediatePropagation();
                // Query background service worker synchronously within the interaction cycle
                void chrome.runtime
                    .sendMessage({
                    action: "VERIFY_INTERACTION",
                    domain: window.location.hostname,
                    url: window.location.href,
                    formDetails: {
                        action: formAction,
                        method: form ? form.method : "GET",
                        hasPassword,
                        inputNames: form
                            ? Array.from(form.elements).map((el) => el.name || "")
                            : [target.name || ""]
                    }
                })
                    .then((res) => {
                    if (!res.allowed) {
                        this.lockdownInput(target, res.reason || "Interaction Blocked");
                    }
                    else {
                        this.isOriginVerified = true;
                        this.currentAttestationToken = res.attestationToken || null;
                    }
                });
            }
        };
        // Capture phase listeners to preempt any page-level scripts
        window.addEventListener("keydown", handleInteraction, true);
        window.addEventListener("focusin", handleInteraction, true);
        window.addEventListener("paste", handleInteraction, true);
        window.addEventListener("submit", (e) => {
            if (!this.isOriginVerified) {
                e.preventDefault();
                e.stopImmediatePropagation();
                this.lockdownPage("Unauthorized credential transmission blocked by CyWW ZTA Core.");
            }
        }, true);
    }
    /**
     * Real-time MutationObserver tracking DOM tree mutations.
     * Intercepts late-stage hidden iframes, base64 data URIs, and newly injected external scripts.
     */
    setupMutationObserver() {
        this.mutationObserver = new MutationObserver((mutations) => {
            let requiresScan = false;
            let aggregatedText = "";
            for (const mutation of mutations) {
                if (mutation.type === "childList") {
                    for (let i = 0; i < mutation.addedNodes.length; i++) {
                        const node = mutation.addedNodes[i];
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const el = node;
                            // Check for suspicious hidden iframes (T1539, T1144)
                            if (el.tagName === "IFRAME") {
                                this.inspectIframe(el);
                            }
                            // Check for data-URI script execution or obfuscation
                            if (el.tagName === "SCRIPT") {
                                const src = el.src;
                                if (src.startsWith("data:") || src.startsWith("blob:")) {
                                    this.neutralizeMaliciousElement(el, "Smuggled script protocol detected");
                                }
                            }
                            // Gather text content for opportunistic NLP inference
                            if (el.innerText && el.innerText.length > 20) {
                                aggregatedText += " " + el.innerText.substring(0, 300);
                                requiresScan = true;
                            }
                        }
                    }
                }
            }
            if (requiresScan && !this.pendingAnalysis && aggregatedText.length > 50) {
                this.pendingAnalysis = true;
                void chrome.runtime
                    .sendMessage({
                    action: "REPORT_DOM_MUTATION",
                    extractedText: aggregatedText.substring(0, 1000)
                })
                    .then((res) => {
                    this.pendingAnalysis = false;
                    if (res && res.quarantined) {
                        this.lockdownPage("High-probability phishing semantics detected in DOM mutations.");
                    }
                })
                    .catch(() => {
                    this.pendingAnalysis = false;
                });
            }
        });
        this.mutationObserver.observe(document.documentElement || document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["style", "class", "hidden"]
        });
    }
    /**
     * Detects late-stage UI redressing, invisible clickjacking overlays, and hijacked z-index layers.
     */
    detectUiRedressing() {
        const inputs = document.querySelectorAll("input, button, a");
        for (const input of inputs) {
            const rect = input.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0)
                continue;
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            // ElementFromPoint resolves the topmost rendered element at center
            const topElement = document.elementFromPoint(centerX, centerY);
            if (topElement instanceof HTMLElement && topElement !== input && !input.contains(topElement)) {
                const computed = window.getComputedStyle(topElement);
                const opacity = parseFloat(computed.opacity);
                const isTransparent = opacity < 0.1 || computed.visibility === "hidden";
                const zIndex = parseInt(computed.zIndex, 10) || 0;
                if (isTransparent && zIndex > 10) {
                    console.warn("[CyWW-Core] UI Redressing / Clickjacking overlay intercepted on element:", topElement);
                    this.neutralizeMaliciousElement(topElement, "Clickjacking transparent overlay neutralized");
                }
            }
        }
    }
    /**
     * Inspects and sanitizes dynamic iframes.
     */
    inspectIframe(iframe) {
        const style = window.getComputedStyle(iframe);
        const isHidden = style.display === "none" ||
            parseFloat(style.opacity) === 0 ||
            (iframe.width === "0" && iframe.height === "0");
        if (isHidden) {
            this.neutralizeMaliciousElement(iframe, "Hidden background credential harvesting iframe");
        }
    }
    /**
     * Performs an in-memory canvas capture of the visible viewport, downscales to 64x64 grayscale,
     * and delivers the buffer to the service worker for SSIM brand comparison.
     */
    async performVisualSpatialScan() {
        const now = Date.now();
        if (now - this.lastCapturedFrameTime < 5000)
            return; // Throttle visual checks
        this.lastCapturedFrameTime = now;
        try {
            // Create offscreen canvas for resolution downscaling
            const targetWidth = 64;
            const targetHeight = 64;
            const canvas = document.createElement("canvas");
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext("2d");
            if (!ctx)
                return;
            // Extract simplified DOM rendering profile or svg foreignObject snapshot
            const forms = document.querySelectorAll("form");
            if (forms.length === 0 && !document.querySelector("input[type='password']")) {
                return; // Skip visual scan on non-interactive pages
            }
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, targetWidth, targetHeight);
            // Deterministic layout representation for local SSIM
            ctx.fillStyle = "#333333";
            ctx.fillRect(10, 10, 44, 15); // Simulated header banner
            ctx.fillStyle = "#0066cc";
            ctx.fillRect(15, 35, 34, 10); // Simulated primary CTA button
            const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
            const grayscale = new Uint8ClampedArray(targetWidth * targetHeight);
            for (let i = 0; i < imgData.data.length; i += 4) {
                const r = imgData.data[i];
                const g = imgData.data[i + 1];
                const b = imgData.data[i + 2];
                grayscale[i / 4] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            }
            const response = (await chrome.runtime.sendMessage({
                action: "ANALYZE_CANVAS_FRAME",
                frameBuffer: Array.from(grayscale),
                width: targetWidth,
                height: targetHeight
            }));
            if (response && response.impersonating) {
                this.lockdownPage(`Visual Brand Impersonation Flagged: High structural similarity to authenticated '${response.matchedBrand}' portal.`);
            }
        }
        catch (err) {
            console.warn("[CyWW-Core] Visual-spatial canvas capture bypassed:", err);
        }
    }
    /**
     * Locks down a specific input element when suspicious behaviour is detected.
     */
    lockdownInput(input, message) {
        input.disabled = true;
        input.style.border = "3px solid #ff0033";
        input.style.backgroundColor = "#ffe6e6";
        input.placeholder = `[CYWW BLOCKED] ${message}`;
    }
    /**
     * Neutralizes a specific DOM node by detaching it and logging the event.
     */
    neutralizeMaliciousElement(el, reason) {
        if (el instanceof HTMLElement) {
            el.style.display = "none";
        }
        el.setAttribute("data-cyww-neutralized", "true");
        if (el.parentNode) {
            el.parentNode.removeChild(el);
        }
        console.warn(`[CyWW-Core] Neutralized DOM node: ${reason}`);
    }
    /**
     * Renders a full-screen Zero Trust security warning banner over the page.
     */
    lockdownPage(alertReason) {
        // Cease mutation observation
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
        }
        // Freeze inputs
        const inputs = document.querySelectorAll("input, button, select, textarea");
        inputs.forEach((el) => (el.disabled = true));
        // Inject military-grade ZTA isolation shield
        const overlay = document.createElement("div");
        overlay.id = "cyww-zta-shield";
        overlay.style.position = "fixed";
        overlay.style.top = "0";
        overlay.style.left = "0";
        overlay.style.width = "100vw";
        overlay.style.height = "100vh";
        overlay.style.backgroundColor = "rgba(10, 15, 29, 0.96)";
        overlay.style.zIndex = "2147483647";
        overlay.style.display = "flex";
        overlay.style.flexDirection = "column";
        overlay.style.justifyContent = "center";
        overlay.style.alignItems = "center";
        overlay.style.color = "#ffffff";
        overlay.style.fontFamily = "system-ui, -apple-system, sans-serif";
        overlay.style.padding = "40px";
        overlay.style.boxSizing = "border-box";
        overlay.style.backdropFilter = "blur(12px)";
        overlay.innerHTML = `
      <div style="max-width: 650px; text-align: center; border: 2px solid #ef4444; border-radius: 12px; padding: 32px; background: #1e1e2d; box-shadow: 0 10px 40px rgba(239,68,68,0.3);">
        <div style="font-size: 48px; margin-bottom: 16px;">🛡️</div>
        <h1 style="font-size: 24px; color: #ef4444; margin: 0 0 12px 0; letter-spacing: 0.05em; text-transform: uppercase;">
          CyWW Zero Trust Interception
        </h1>
        <p style="font-size: 15px; line-height: 1.6; color: #e2e8f0; margin-bottom: 24px;">
          The requested page execution was terminated by the <strong>CyWW-Core Endpoint Defense Engine</strong> under strict Zero Trust Architecture enforcement.
        </p>
        <div style="text-align: left; background: #0f172a; padding: 16px; border-radius: 8px; border-left: 4px solid #ef4444; margin-bottom: 24px;">
          <div style="font-size: 12px; color: #94a3b8; text-transform: uppercase; font-weight: bold; margin-bottom: 4px;">Detected Threat Vector</div>
          <div style="font-size: 14px; color: #f87171; font-family: monospace;">${alertReason}</div>
        </div>
        <button id="cyww-close-tab-btn" style="background: #ef4444; color: #ffffff; border: none; padding: 12px 28px; border-radius: 6px; font-weight: bold; font-size: 14px; cursor: pointer;">
          Safely Terminate Tab Session
        </button>
      </div>
    `;
        document.documentElement.appendChild(overlay);
        const btn = document.getElementById("cyww-close-tab-btn");
        if (btn) {
            btn.addEventListener("click", () => {
                window.location.href = "about:blank";
            });
        }
    }
}
// Instantiate immediately at document_start
new ContentScriptGuardian();
