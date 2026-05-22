## AI Bot (Galer)

An AI Telegram chatbot built with [grammY](https://grammy.dev/) and [Deno](https://deno.land/), deployed to Cloudflare Workers via [Denoflare](https://denoflare.dev/).

##  Features
- **AI Chat:** Conversation history powered by Groq (8h TTL).
- **Vision & OCR:** Image analysis using `meta-llama/llama-4-scout-17b-16e-instruct` and Gemini 2.0 Flash.
- **Web Search:** Integrated search via Tavily.
- **Admin Controls:** Whitelist system, message logging, and on-the-fly model switching.

##  Setup & Deployment

### 1. Prerequisites
- [Deno](https://deno.land/) & [Denoflare](https://denoflare.dev/)
- Telegram bot token from [@BotFather](https://t.me/BotFather)
- Cloudflare account with Workers & KV enabled

### 2. Create KV Namespace
Go to Cloudflare Dashboard  Workers & Pages  KV  **Create namespace**. 
Name it `AI_BOT_KV` and copy its ID.

### 3. Configure `.denoflare`
Update your `.denoflare` file with your specific IDs and Tokens:

```json
{
  "$schema": "[https://raw.githubusercontent.com/skymethod/denoflare/v0.7.0/common/config.schema.json](https://raw.githubusercontent.com/skymethod/denoflare/v0.7.0/common/config.schema.json)",
  "scripts": {
    "galer": {
      "path": "bot.ts",
      "localPort": 3030,
      "bindings": {
        "KV": { "kvNamespace": "YOUR_KV_NAMESPACE_ID" }
      },
      "workersDev": true
    }
  },
  "profiles": {
    "main": {
      "accountId": "YOUR_CF_ACCOUNT_ID",
      "apiToken": "YOUR_CF_API_TOKEN"
    }
  }
}

```
### 4. Set Cloudflare Secrets
Add the following secrets to your Cloudflare Worker:
 * BOT_TOKEN: Telegram bot token (**Required**)
 * GROQ_API_KEY: Groq API key (**Required**)
 * OWNER_ID: Your Telegram user ID (**Required**)
 * GEMINI_API_KEY: Gemini API key *(Optional)*
 * TAVILY_API_KEY: Tavily API key for /web *(Optional)*
 * LOG_CHAT_ID: Chat ID for message logging *(Optional)*
### 5. Deploy
```bash
denoflare push galer --profile main

```
### 6. Set Webhook
```text
https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://galer.<your-subdomain>.workers.dev/
```
##  Managing Modules
Modules are loaded inside bot.ts. To disable a feature, simply comment out its import in bot.ts:
```ts
// import "./modules/search.ts"; // This disables the web search module
```
```
Once you have that saved, let's look back at `core/kv.ts`. Based on the `MAX_HISTORY` variable you set there, how many messages does the bot keep in memory before it starts forgetting the oldest ones?

```
