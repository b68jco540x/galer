# ai-bot
AI Telegram chatbot built with [grammY](https://grammy.dev/) and [Deno](https://deno.land/), deployed to Cloudflare Workers via [Denoflare](https://denoflare.dev/).

## Features

- AI chat with conversation history (using groq😛)(8h TTL)
- ocr analysis / vision (meta-llama/llama-4-scout-17b-16e-instruct)
-  Web search via Tavily
- etc(start bot for other command/features bruh)

## Project Structure

```
ai-bot/
├── bot.ts              # Entry point — load modules here
├── .denoflare          # env and other config
├── core/
│   ├── index.ts        # registry
│   ├── kv.ts           # KV helpers + types
│   ├── auth.ts         # whitelist system?
│   ├── middleware.ts   # log message(optional)
│   └── chat.ts         # text + photo message handler
└── modules/
    ├── groq.ts         # Groq provider + /models /ocr /refresh~
    ├── search.ts       # /web (Tavily)
    └── admin.ts        # /reset /system /add /remove /whitelist~
```

## Setup

### Prerequisites

- [Deno](https://deno.land/) + [Denoflare](https://denoflare.dev/) 
- Cloudflare account with Workers enabled
- Telegram bot token from [@BotFather](https://t.me/BotFather)
- [Groq](https://console.groq.com/) API key

### 1. Clone the repo

```bash
git clone https://github.com/yourusername/ai-bot.git
cd ai-bot
```

### 2. Create KV Namespace

Cloudflare Dashboard → Workers & Pages → KV → **Create namespace** → name it `AI_BOT_KV` or whatever

### 3. Configure `.denoflare`

Edit `.denoflare` and fill in:

```json
{
  "$schema": "https://raw.githubusercontent.com/skymethod/denoflare/v0.7.0/common/config.schema.json",
  "scripts": {
    "ai-bot": {
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

### 4. Set Secrets


- `BOT_TOKEN`  Telegram bot token 
- `GROQ_API_KEY` Groq API key 
- `OWNER_ID` | Your Telegram user ID (get from [@userinfobot](https://t.me/userinfobot)) 
- `TAVILY_API_KEY` | *(optional)* Tavily API key for `/web`
- `LOG_CHAT_ID` | *(optional)* Chat ID for message logging |

Also add KV binding: variable name `KV` → namespace `AI_BOT_KV`.

### 5. Deploy

```bash
denoflare push ai-bot --profile main
```

### 6. setWebhook

```
https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://ai-bot.<subdomain>.workers.dev/
```




|This is VibeCoded|