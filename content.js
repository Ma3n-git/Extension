// content.js - Injected into AI domains to show persistent warning modal and monitor prompts

(function() {
    // Check if already initialized
    if (window.__aiGatewayInitialized) return;
    window.__aiGatewayInitialized = true;

    // ==================== PROMPT MONITORING ====================
    
    // Store last captured prompt to avoid duplicates
    let lastCapturedPrompt = '';
    
    // Function to send prompt data to background script
    function capturePrompt(promptText, method = 'unknown') {
        if (!promptText || promptText.trim() === '' || promptText === lastCapturedPrompt) return;
        if (promptText.trim().length < 3) return; // Ignore very short inputs
        
        lastCapturedPrompt = promptText;
        
        const promptData = {
            action: 'logPrompt',
            prompt: promptText.trim(),
            domain: window.location.hostname,
            url: window.location.href,
            captureMethod: method,
            timestamp: new Date().toISOString()
        };
        
        chrome.runtime.sendMessage(promptData).catch(err => {
            console.log('AI Gateway: Could not send prompt data', err);
        });
    }
    
    // Monitor textarea and input changes (for submit detection)
    let currentInput = '';
    
    document.addEventListener('input', (e) => {
        const target = e.target;
        if (target.tagName === 'TEXTAREA' || 
            (target.tagName === 'INPUT' && target.type === 'text') ||
            target.contentEditable === 'true' ||
            target.getAttribute('role') === 'textbox') {
            currentInput = target.value || target.innerText || target.textContent || '';
        }
    }, true);
    
    // Capture on Enter key (common submit method for chat interfaces)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey && currentInput.trim()) {
            // Small delay to ensure it's a submit action
            setTimeout(() => {
                capturePrompt(currentInput, 'enter-key');
            }, 100);
        }
    }, true);
    
    // Monitor form submissions
    document.addEventListener('submit', (e) => {
        const form = e.target;
        const textareas = form.querySelectorAll('textarea, input[type="text"], [contenteditable="true"]');
        textareas.forEach(el => {
            const value = el.value || el.innerText || '';
            if (value.trim()) {
                capturePrompt(value, 'form-submit');
            }
        });
    }, true);
    
    // Monitor button clicks (send buttons)
    document.addEventListener('click', (e) => {
        const target = e.target;
        const button = target.closest('button, [role="button"]');
        if (button) {
            const buttonText = (button.innerText || button.getAttribute('aria-label') || '').toLowerCase();
            if (buttonText.includes('send') || buttonText.includes('submit') || 
                buttonText.includes('ask') || buttonText.includes('generate') ||
                button.querySelector('svg') && currentInput.trim()) {
                // Likely a send button
                setTimeout(() => {
                    if (currentInput.trim()) {
                        capturePrompt(currentInput, 'button-click');
                        currentInput = ''; // Reset after capture
                    }
                }, 50);
            }
        }
    }, true);
    
    // Intercept fetch requests to capture API calls
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const [url, options] = args;
        
        if (options && options.body) {
            try {
                let bodyContent = options.body;
                if (typeof bodyContent === 'string') {
                    const parsed = JSON.parse(bodyContent);
                    // Look for common prompt fields
                    const promptFields = ['prompt', 'message', 'content', 'query', 'text', 'input', 'messages'];
                    for (const field of promptFields) {
                        if (parsed[field]) {
                            let promptText = parsed[field];
                            if (Array.isArray(promptText)) {
                                // Handle messages array format
                                promptText = promptText
                                    .filter(m => m.role === 'user' || m.content)
                                    .map(m => m.content || m.text || m)
                                    .join('\n');
                            }
                            if (typeof promptText === 'string' && promptText.trim()) {
                                capturePrompt(promptText, 'fetch-api');
                            }
                            break;
                        }
                    }
                }
            } catch (e) {
                // Not JSON or parsing failed, ignore
            }
        }
        
        return originalFetch.apply(this, args);
    };
    
    // Intercept XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        this._aiGatewayUrl = url;
        return originalXHROpen.apply(this, [method, url, ...rest]);
    };
    
    XMLHttpRequest.prototype.send = function(body) {
        if (body) {
            try {
                const parsed = JSON.parse(body);
                const promptFields = ['prompt', 'message', 'content', 'query', 'text', 'input', 'messages'];
                for (const field of promptFields) {
                    if (parsed[field]) {
                        let promptText = parsed[field];
                        if (Array.isArray(promptText)) {
                            promptText = promptText
                                .filter(m => m.role === 'user' || m.content)
                                .map(m => m.content || m.text || m)
                                .join('\n');
                        }
                        if (typeof promptText === 'string' && promptText.trim()) {
                            capturePrompt(promptText, 'xhr-api');
                        }
                        break;
                    }
                }
            } catch (e) {
                // Not JSON, ignore
            }
        }
        return originalXHRSend.apply(this, [body]);
    };

    // ==================== WARNING MODAL ====================
    // Check if modal already exists (prevent duplicates)
    if (document.getElementById('ai-gateway-modal')) return;

    // Check if user already dismissed for this session
    const sessionKey = 'ai_gateway_dismissed_' + window.location.hostname;
    if (sessionStorage.getItem(sessionKey)) return;

    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.id = 'ai-gateway-modal';
    overlay.innerHTML = `
        <style>
            #ai-gateway-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                z-index: 2147483647;
                display: flex;
                justify-content: center;
                align-items: center;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            #ai-gateway-modal * {
                box-sizing: border-box;
            }
            #ai-gateway-modal .modal-content {
                background: white;
                padding: 2rem;
                border-radius: 12px;
                max-width: 450px;
                width: 90%;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
                text-align: center;
                position: relative;
            }
            #ai-gateway-modal .close-btn {
                position: absolute;
                top: 12px;
                right: 12px;
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #5f6368;
                line-height: 1;
                padding: 4px 8px;
            }
            #ai-gateway-modal .close-btn:hover {
                color: #202124;
            }
            #ai-gateway-modal .warning-icon {
                font-size: 48px;
                margin-bottom: 1rem;
            }
            #ai-gateway-modal h2 {
                color: #d93025;
                margin: 0 0 0.5rem 0;
                font-size: 1.5rem;
            }
            #ai-gateway-modal p {
                color: #5f6368;
                font-size: 14px;
                line-height: 1.5;
                margin: 0 0 1.5rem 0;
            }
            #ai-gateway-modal .domain-badge {
                background: #fef7e0;
                border: 1px solid #f9ab00;
                color: #b06000;
                padding: 6px 12px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 500;
                margin-bottom: 1.5rem;
                display: inline-block;
            }
            #ai-gateway-modal .btn-container {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            #ai-gateway-modal .btn {
                padding: 12px 20px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: background 0.2s;
            }
            #ai-gateway-modal .btn-primary {
                background: #1a73e8;
                color: white;
            }
            #ai-gateway-modal .btn-primary:hover {
                background: #1557b0;
            }
            #ai-gateway-modal .btn-secondary {
                background: #f1f3f4;
                color: #5f6368;
                border: 1px solid #dadce0;
            }
            #ai-gateway-modal .btn-secondary:hover {
                background: #e8eaed;
            }
            #ai-gateway-modal .footer-note {
                font-size: 11px;
                color: #9aa0a6;
                margin-top: 1rem;
            }
        </style>
        <div class="modal-content">
            <button class="close-btn" id="ai-modal-close">&times;</button>
            <div class="warning-icon">⚠️</div>
            <h2>AI Domain Detected</h2>
            <div class="domain-badge">${window.location.hostname}</div>
            <p>You are accessing an AI website. Your prompts and activity on this site are being monitored per organization security policy.</p>
            <p>You may route through the organization gateway for secure access, or continue with monitoring enabled.</p>
            <div class="btn-container">
                <button class="btn btn-primary" id="ai-modal-gateway">Open Organization Gateway</button>
                <button class="btn btn-secondary" id="ai-modal-continue">Continue with Monitoring</button>
            </div>
            <div class="footer-note">This access has been logged.</div>
        </div>
    `;

    // Add to page as soon as possible
    if (document.body) {
        document.body.appendChild(overlay);
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            document.body.appendChild(overlay);
        });
    }

    // Wait for elements to be available then attach handlers
    function attachHandlers() {
        const closeBtn = document.getElementById('ai-modal-close');
        const gatewayBtn = document.getElementById('ai-modal-gateway');
        const continueBtn = document.getElementById('ai-modal-continue');
        const modal = document.getElementById('ai-gateway-modal');

        if (!closeBtn || !gatewayBtn || !continueBtn) {
            setTimeout(attachHandlers, 50);
            return;
        }

        // Close button (X)
        closeBtn.addEventListener('click', () => {
            modal.remove();
            sessionStorage.setItem(sessionKey, 'true');
        });

        // Gateway button
        gatewayBtn.addEventListener('click', () => {
            const gatewayUrl = chrome.runtime.getURL(`gateway.html?target=${encodeURIComponent(window.location.href)}`);
            window.location.href = gatewayUrl;
        });

        // Continue button
        continueBtn.addEventListener('click', () => {
            modal.remove();
            sessionStorage.setItem(sessionKey, 'true');
            // Notify background script
            chrome.runtime.sendMessage({
                action: 'logContinue',
                url: window.location.href,
                domain: window.location.hostname
            });
        });
    }

    attachHandlers();
})();
