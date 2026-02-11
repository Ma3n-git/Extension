# AI Domain & Activity Gateway Extension

A browser extension that detects AI-related domains and AI activities within web apps, then routes matching traffic through an internal organizational gateway while collecting security-relevant metadata to help keep policies current.

## What it does
- **Detects AI domains** (e.g., AI SaaS providers, model endpoints, AI tooling).  
- **Detects AI activities** within apps (e.g., AI feature usage, inference/assist calls, model-related endpoints).  
- **Redirects matching traffic** to your internal router/gateway for centralized control.  
- **Collects metadata** needed for policy updates and security monitoring.

## How it works (high level)
1. **Detection**: The extension inspects requests and app behavior to identify AI domains and AI activities based on configurable rules.  
2. **Routing**: When a match is found, requests are redirected to the organization’s internal gateway.  
3. **Telemetry**: The extension records minimal, security-relevant metadata for analysis and policy refinement.

## Collected metadata (examples)
- Destination domain and subdomain
- URL path patterns (redacted or tokenized as configured)
- Request method and high-level content type
- Client app context (tab URL, app name, workspace identifier)
- AI activity type (e.g., inference call, prompt assist, file processing)
- Timestamp and anonymized user/device identifiers

> **Note:** Metadata collection is configurable and should align with organizational privacy policies and regulatory requirements.

## Configuration
Typical configuration items include:
- **Domain allow/deny lists** for AI services
- **AI activity heuristics** (endpoints, headers, or JS signals)
- **Gateway routing rules** (e.g., by domain, app, or activity type)
- **Telemetry settings** (fields collected, retention, sampling)
- **Redaction rules** for sensitive data

## Security & privacy
- Data minimization and configurable redaction
- No raw prompts or sensitive payloads collected by default
- Transport security for metadata (TLS and org-approved endpoints)
- Least-privilege permissions in the browser

## Getting started
1. Install the extension in your browser (enterprise policy or store).  
2. Configure domain rules and gateway settings.  
3. Verify routing and telemetry in a staging environment.  
4. Roll out to production with monitoring enabled.

## Use cases
- Centralized monitoring of AI SaaS usage
- Enforcing AI usage policies and routing to secure gateways
- Understanding AI feature adoption and risk exposure
- Supporting audits and compliance reporting

## Support
For setup, integration, or policy alignment, contact your security team or the extension maintainer.
