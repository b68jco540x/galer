import type { Env } from "../core/types.ts";
import type { Provider, BotModule } from "../core/index.ts";
import { registerProvider, registerModule } from "../core/index.ts";
import { Bot } from "https://deno.land/x/grammy@v1.42.0/mod.ts";

const BASE = "https://openrouter.ai/api/v1";

// Locked model list — only these two are available via OpenRouter
const OPENROUTER_MODELS = [
  "openrouter/owl-alpha",
  "deepseek/deepseek-v4-flash:free",
  "moonshotai/kimi-k2.6:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "openai/gpt-oss-120b:free",
  "google/gemma-4-31b-it:free",
  "qwen/qwen3-coder:free",
  "meta-llama/llama-3.3-70b-instruct:free",
] as const;

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 8192)
    bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(bin);
}

async function getFileUrl(token: string, fileId: string): Promise<string> {
  const res = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
  const data = await res.json();
  return `https://api.telegram.org/file/bot${token}/${data.result.file_path}`;
}

const openrouterProvider: Provider = {
  name: "openrouter",
  // Match prefixes — neither conflicts with groq/gemini model lists
  models: ["owl-alpha", "kimi", ":free"],

  async chat(env, messages, model, system) {
    if (!env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY not set.");
    const res = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://github.com/galer-bot",
        "X-Title": "Galer Bot",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: system }, ...messages],
        max_tokens: 1024,
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message ?? JSON.stringify(data.error));
    return data.choices?.[0]?.message?.content ?? "No response.";
  },

  async vision(env, fileId, prompt) {
    if (!env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY not set.");
    const url = await getFileUrl(env.BOT_TOKEN, fileId);
    const imgRes = await fetch(url);
    const b64 = toBase64(await imgRes.arrayBuffer());
    const mime = imgRes.headers.get("content-type") ?? "image/jpeg";
    // Use owl-alpha for vision — kimi-k2.6:free does not support vision
    const res = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://github.com/galer-bot",
        "X-Title": "Galer Bot",
      },
      body: JSON.stringify({
        model: "openrouter/owl-alpha",
        messages: [{ role: "user", content: [
          { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } },
          { type: "text", text: prompt },
        ]}],
        max_tokens: 1024,
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message ?? JSON.stringify(data.error));
    return data.choices?.[0]?.message?.content ?? "Could not analyze image.";
  },

  // Locked — always return the hardcoded list, no API call needed
  async fetchModels(_env) {
    return [...OPENROUTER_MODELS];
  },
};

const openrouterModule: BotModule = {
  name: "openrouter",
  enabled: true,
  register(_bot: Bot, _env: Env) {
    // provider only — /models and /refresh handled by groq module
  },
};

registerProvider(openrouterProvider);
registerModule(openrouterModule);
