import type { Env } from "../core/types.js";
import type { Provider, BotModule } from "../core/index.js";
import { registerProvider, registerModule } from "../core/index.js";
import { Bot } from "grammy";

const BASE = "https://generativelanguage.googleapis.com/v1beta";

const geminiProvider: Provider = {
  name: "gemini",

  async chat(env, messages, model, system, thinking) {
    const contents = messages.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    // thinkingBudget: 0 disables thinking (fast/cheap), -1 lets the model decide
    // dynamically how much to think (slower, better on hard prompts).
    const thinkingBudget = thinking === "high" ? -1 : 0;
    const res = await fetch(`${BASE}/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { maxOutputTokens: 1024, thinkingConfig: { thinkingBudget } },
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message ?? JSON.stringify(data.error));
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response.";
  },
};

const geminiModule: BotModule = {
  name: "gemini",
  enabled: true,
  register(_bot: Bot, _env: Env) {
    // provider only — no commands of its own
  },
};

registerProvider(geminiProvider);
registerModule(geminiModule);
