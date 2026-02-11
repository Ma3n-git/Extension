// background.js

const AI_DOMAINS = [
    "openai.com", "chatgpt.com", "anthropic.com", "claude.ai", "midjourney.com",
    "perplexity.ai", "poe.com", "jasper.ai", "copy.ai", "quillbot.com",
    "huggingface.co", "character.ai", "civitai.com", "leonardo.ai", "deepl.com",
    "grammarly.com", "gemini.google.com", "bard.google.com", "aistudio.google.com",
    "copilot.microsoft.com", "designer.microsoft.com", "create.bing.com"
];

// List of allowed URLs (to prevent redirect loops if the gateway redirects back)
// Ideally, the gateway should send a token or the extension should whitelist the request ID
// For this simple demo, we just rely on the user clicking "Continue" which is a new navigation
// But since the new navigation matches the domain, we need a way to allow it.
// We'll use a session storage flag or query param bypass.

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
    if (details.frameId !== 0) return; // Only Main Frame

    const url = new URL(details.url);
    const domain = url.hostname.replace('www.', '');

    // Check if it's an AI domain
    const isAiDomain = AI_DOMAINS.some(d => domain === d || domain.endsWith('.' + d));

    if (isAiDomain) {
        // Check for a bypass flag (e.g. user clicked "Continue" on gateway)
        // In a real app, this would be a secure token.
        if (url.searchParams.has('ai_gateway_bypass')) {
            console.log("Allowing bypassed access to:", details.url);
            return;
        }

        console.log("Intercepted AI Domain:", url.href);
        
        // Log Metadata
        const metadata = {
            timestamp: new Date().toISOString(),
            url: details.url,
            domain: domain,
            tabId: details.tabId
        };
        await logMetadata(metadata);

        // Redirect to Internal Gateway
        const gatewayUrl = chrome.runtime.getURL(`gateway.html?target=${encodeURIComponent(details.url)}`);
        
        // Use tabs.update to redirect
        // chrome.tabs.update(details.tabId, { url: gatewayUrl });
    }
});

async function logMetadata(data) {
    const logs = await chrome.storage.local.get("ai_logs") || { ai_logs: [] };
    const currentLogs = logs.ai_logs || [];
    currentLogs.push(data);
    await chrome.storage.local.set({ ai_logs: currentLogs });
    console.log("Metadata logged:", data);
}
