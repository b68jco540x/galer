import type { Env } from "../core/types.ts";
import type { Provider, BotModule } from "../core/index.ts";
import { registerProvider, registerModule } from "../core/index.ts";
import { getUserData, saveUserData, getModels } from "../core/kv.ts";
import { safeReply } from "../core/chat.ts";
import { Bot } from "https://deno.land/x/grammy@v1.42.0/mod.ts";

const BASE = "https://generativelanguage.googleapis.com/v1beta";

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

const geminiProvider: Provider = {
  name: "gemini",
  models: ["gemini"],

  async chat(env, messages, model, system) {
    if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set.");
    const contents = messages.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    const res = await fetch(`${BASE}/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { maxOutputTokens: 1024 },
      }),
    });
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response.";
  },

  async vision(env, fileId, prompt) {
    if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set.");
    const url = await getFileUrl(env.BOT_TOKEN, fileId);
    const imgRes = await fetch(url);
    const b64 = toBase64(await imgRes.arrayBuffer());
    const mime = imgRes.headers.get("content-type") ?? "image/jpeg";
    const res = await fetch(`${BASE}/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [
          { inline_data: { mime_type: mime, data: b64 } },
          { text: prompt },
        ]}],
      }),
    });
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "Could not analyze image.";
  },

  async fetchModels(env) {
    if (!env.GEMINI_API_KEY) return [];
    const res = await fetch(`${BASE}/models?key=${env.GEMINI_API_KEY}`);
    const data = await res.json();
    return (data.models ?? [])
      .filter((m: { supportedGenerationMethods?: string[] }) =>
        m.supportedGenerationMethods?.includes("generateContent"))
      .map((m: { name: string }) => m.name.replace("models/", ""))
      .sort();
  },
};

const geminiModule: BotModule = {
  name: "gemini",
  enabled: true,
  register(_bot: Bot, _env: Env) {
    // provider only — /models and /refresh handled by groq module
  },
};

registerProvider(geminiProvider);
registerModule(geminiModule);
