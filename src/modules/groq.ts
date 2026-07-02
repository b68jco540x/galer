import type { Env } from "../core/types.js";
import type { Provider, BotModule } from "../core/index.js";
import { registerProvider, registerModule, getProvider } from "../core/index.js";
import { getUserData } from "../core/kv.js";
import { safeReply } from "../core/chat.js";
import { getFileUrl } from "../core/media.js";
import { Bot } from "grammy";

const TEXT_EXTS = [".txt", ".md", ".csv", ".json", ".js", ".ts", ".py", ".html", ".css", ".yaml", ".yml", ".sh", ".xml"];
const REQUEST_TIMEOUT_MS = 45_000;

async function fetchWithTimeout(url: string, opts: RequestInit, ms = REQUEST_TIMEOUT_MS): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error(`Model timed out after ${ms / 1000}s — try again or pick another model.`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

const groqProvider: Provider = {
  name: "groq",

  async chat(env, messages, model, system) {
    // reasoning_effort dropped — confirmed live that groq/compound rejects it
    // outright ("`reasoning_effort` is not supported with this model"). Thinking
    // toggle is a no-op on groq for now.
    const res = await fetchWithTimeout("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${env.GROQ_API_KEY}` },
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
};

const groqModule: BotModule = {
  name: "groq",
  enabled: true,

  register(bot: Bot, env: Env) {
    // Document handler — uses whatever provider/model the user currently has selected
    bot.on("message:document", async (ctx) => {
      const doc = ctx.message.document;
      const name = doc.file_name ?? "";
      const isText = TEXT_EXTS.some(ext => name.toLowerCase().endsWith(ext));
      if (!isText) { await ctx.reply(`Unsupported file type. Supported: ${TEXT_EXTS.join(", ")}`, { reply_parameters: { message_id: ctx.message!.message_id } }); return; }
      const prompt = ctx.message.caption?.trim() ?? "Summarize or analyze this file.";
      const typing = setInterval(() => ctx.replyWithChatAction("typing"), 4000);
      await ctx.replyWithChatAction("typing");
      try {
        const url = await getFileUrl(env.BOT_TOKEN, doc.file_id);
        const text = await (await fetch(url)).text();
        if (text.length > 12000) { await ctx.reply("File too large (max ~12k chars).", { reply_parameters: { message_id: ctx.message!.message_id } }); return; }
        const ud = await getUserData(env.KV, String(ctx.from!.id));
        const provider = getProvider(env, ud.provider);
        const reply = await provider.chat(env,
          [{ role: "user", content: `File: ${name}\n\n\`\`\`\n${text}\n\`\`\`\n\n${prompt}` }],
          ud.model, ud.system, ud.thinking
        );
        await safeReply(ctx, reply, { reply_parameters: { message_id: ctx.message!.message_id } });
      } catch (e) {
        await ctx.reply(`Error: ${e instanceof Error ? e.message : String(e)}`, { reply_parameters: { message_id: ctx.message!.message_id } });
      } finally { clearInterval(typing); }
    });
  },
};

registerProvider(groqProvider);
registerModule(groqModule);
