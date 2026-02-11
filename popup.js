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
    const btn = document.getElementById('action-btn');

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
        message.textContent = "This site is monitored. Use the organization gateway for secure access.";
        btn.textContent = "Open Organization Gateway";
        btn.style.display = "block";
        btn.onclick = () => {
            const gatewayUrl = chrome.runtime.getURL(`gateway.html?target=${encodeURIComponent(tab.url)}`);
            chrome.tabs.create({ url: gatewayUrl });
        };
    } else {
        title.textContent = "Safe Browsing";
        message.textContent = "No AI activity detected on this page.";
        btn.textContent = "Go to Gateway Anyway";
        btn.style.display = "block";
        btn.onclick = () => {
             const gatewayUrl = chrome.runtime.getURL(`gateway.html?target=Manual_Launch`);
             chrome.tabs.create({ url: gatewayUrl });
        };
    }
});