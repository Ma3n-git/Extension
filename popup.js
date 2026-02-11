// popup.js

const AI_DOMAINS = [
    "openai.com", "chatgpt.com", "anthropic.com", "claude.ai", "midjourney.com",
    "perplexity.ai", "poe.com", "jasper.ai", "copy.ai", "quillbot.com",
    "huggingface.co", "character.ai", "civitai.com", "leonardo.ai", "deepl.com",
    "grammarly.com", "gemini.google.com", "bard.google.com", "aistudio.google.com",
    "copilot.microsoft.com", "designer.microsoft.com", "create.bing.com"
];

document.addEventListener('DOMContentLoaded', async () => {
    const title = document.getElementById('status-title');
    const message = document.getElementById('status-message');
    const buttonContainer = document.getElementById('button-container');
    const gatewayBtn = document.getElementById('gateway-btn');
    const continueBtn = document.getElementById('continue-btn');

    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.url) {
        title.textContent = "Unknown";
        message.textContent = "Cannot determine current site.";
        return;
    }

    const url = new URL(tab.url);
    const domain = url.hostname.replace('www.', '');
    const isAiDomain = AI_DOMAINS.some(d => domain === d || domain.endsWith('.' + d));

    if (isAiDomain) {
        title.textContent = "AI Domain Detected";
        message.textContent = "You are on an AI website. Your prompts and activity are being monitored. You may use the organization gateway for secure access, or continue with monitoring enabled.";
        
        buttonContainer.style.display = "flex";
        
        gatewayBtn.textContent = "Open Organization Gateway";
        gatewayBtn.onclick = () => {
            const gatewayUrl = chrome.runtime.getURL(`gateway.html?target=${encodeURIComponent(tab.url)}`);
            chrome.tabs.update(tab.id, { url: gatewayUrl });
            window.close();
        };
        
        continueBtn.textContent = "Continue (Monitored)";
        continueBtn.onclick = () => {
            // Log that user acknowledged and continued
            chrome.runtime.sendMessage({ action: 'logContinue', url: tab.url, domain: domain });
            window.close();
        };
    } else {
        title.textContent = "Safe Browsing";
        title.classList.add('safe-title');
        message.textContent = "No AI activity detected on this page.";
        buttonContainer.style.display = "none";
    }
});