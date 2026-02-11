// background.js

// ==================== CONFIGURATION ====================
// Set your organization's logging endpoint here
const DATABASE_ENDPOINT = 'https://your-org-endpoint.com/api/ai-logs';
const ENABLE_DATABASE_SYNC = false; // Set to true when endpoint is configured

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

        // Content script handles the warning modal on the page
    }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'logContinue') {
        const metadata = {
            timestamp: new Date().toISOString(),
            url: request.url,
            domain: request.domain,
            action: 'user_acknowledged_and_continued'
        };
        logMetadata(metadata);
        sendResponse({ success: true });
    }
    
    if (request.action === 'logPrompt') {
        const promptData = {
            timestamp: request.timestamp || new Date().toISOString(),
            type: 'prompt',
            domain: request.domain,
            url: request.url,
            prompt: request.prompt,
            captureMethod: request.captureMethod
        };
        logPrompt(promptData);
        sendResponse({ success: true });
    }
    
    return true; // Keep message channel open for async response
});

// Log prompt data
async function logPrompt(data) {
    // Store locally
    const prompts = await chrome.storage.local.get('ai_prompts') || { ai_prompts: [] };
    const currentPrompts = prompts.ai_prompts || [];
    currentPrompts.push(data);
    
    // Keep only last 1000 prompts locally to prevent storage overflow
    if (currentPrompts.length > 1000) {
        currentPrompts.shift();
    }
    
    await chrome.storage.local.set({ ai_prompts: currentPrompts });
    console.log('Prompt logged:', data.prompt.substring(0, 50) + '...');
    
    // Send to database if enabled
    if (ENABLE_DATABASE_SYNC) {
        sendToDatabase(data);
    }
}

// Send data to organization database
async function sendToDatabase(data) {
    try {
        const response = await fetch(DATABASE_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Add authentication headers as needed
                // 'Authorization': 'Bearer YOUR_API_KEY'
            },
            body: JSON.stringify({
                ...data,
                extensionVersion: chrome.runtime.getManifest().version,
                // Add any additional org-specific fields
            })
        });
        
        if (!response.ok) {
            console.error('Database sync failed:', response.status);
        }
    } catch (error) {
        console.error('Database sync error:', error);
    }
}

async function logMetadata(data) {
    const logs = await chrome.storage.local.get("ai_logs") || { ai_logs: [] };
    const currentLogs = logs.ai_logs || [];
    currentLogs.push(data);
    await chrome.storage.local.set({ ai_logs: currentLogs });
    console.log("Metadata logged:", data);
}
