## AI Bot (Galer)

An AI Telegram chatbot built with [grammY](https://grammy.dev/) and deployed to Cloudflare Workers via [Wrangler](https://developers.cloudflare.com/workers/wrangler/).

## Providers (locked, 1 model each)
- **Gemini** — `gemini-flash-lite-latest`
- **Groq** — `groq/compound` (agentic system, built-in web search + code execution)
- **Cloudflare Workers AI** — `@cf/moonshotai/kimi-k2.6` (via the `AI` binding, no separate API key)

Switch between them, and toggle reasoning effort, with `/settings` (inline buttons).

## Features
- **AI Chat:** Conversation history per user (8h TTL), model + thinking-effort choice persisted in KV.
- **Vision & OCR:** Always routed through Cloudflare Kimi K2.6 — the other two locked models don't support vision (gpt-oss/compound has none; Gemini's is intentionally unused to keep one code path).
- **Web Search:** `/web` via Tavily.
- **Admin Controls:** Whitelist + message logging, toggled via `/settings` (owner-only rows).

## Setup & Deployment

### 1. Prerequisites
- Node.js + npm
- Telegram bot token from [@BotFather](https://t.me/BotFather)
- Cloudflare account with Workers, KV, and Workers AI enabled

### 2. Install deps
```bash
npm install
```

### 3. Create KV Namespace
Cloudflare Dashboard → Workers & Pages → KV → **Create namespace**.
Copy its ID into `wrangler.toml` under `[[kv_namespaces]]` → `id`.

The Workers AI binding (`[ai]` in `wrangler.toml`) needs no separate setup — it's
enabled automatically once the Worker deploys to an account with Workers AI on.

### 4. Set Cloudflare Secrets
```bash
wrangler secret put BOT_TOKEN        # Required
wrangler secret put GROQ_API_KEY     # Required
wrangler secret put GEMINI_API_KEY   # Required
wrangler secret put OWNER_ID         # Required — your Telegram user ID
wrangler secret put TAVILY_API_KEY   # Optional — /web
wrangler secret put LOG_CHAT_ID      # Optional — message logging
```

### 5. Deploy
```bash
npm run deploy
```
Or connect this repo in the Cloudflare dashboard (Workers Builds) for auto-deploy on push to `main`.

### 6. Set Webhook
```text
https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://galer.<your-subdomain>.workers.dev/
```

## Managing Modules
Modules are loaded inside `src/bot.ts`. To disable a feature, comment out its import:
```ts
// import "./modules/search.js"; // This disables the web search module
```

## Known no-ops
- `/settings` thinking toggle only works on Gemini. Confirmed live that
  `groq/compound` rejects `reasoning_effort` outright, so it's not sent there.
