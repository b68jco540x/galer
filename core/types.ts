import type { KVNamespace } from "https://raw.githubusercontent.com/skymethod/denoflare/v0.7.0/common/cloudflare_workers_types.d.ts";

export interface Env {
  BOT_TOKEN: string;
  GROQ_API_KEY: string;
  OWNER_ID: string;
  GEMINI_API_KEY?: string;
  TAVILY_API_KEY?: string;
  LOG_CHAT_ID?: string;
  KV: KVNamespace;
}
