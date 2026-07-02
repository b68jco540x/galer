export interface Env {
  BOT_TOKEN: string;
  GROQ_API_KEY: string;
  GEMINI_API_KEY: string;
  OWNER_ID: string;
  AI: Ai;
  TAVILY_API_KEY?: string;
  LOG_CHAT_ID?: string;
  KV: KVNamespace;
}
