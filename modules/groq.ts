import type { Env } from "../core/types.ts";
import type { Provider, BotModule } from "../core/index.ts";
import { registerProvider, registerModule, getAllProviders } from "../core/index.ts";
import { getUserData, saveUserData, getModels } from "../core/kv.ts";
import { safeReply } from "../core/chat.ts";
import { Bot } from "https://deno.land/x/grammy@v1.42.0/mod.ts";

const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const TEXT_EXTS = [".txt", ".md", ".csv", ".json", ".js", ".ts", ".py", ".html", ".css", ".yaml", ".yml", ".sh", ".xml"];

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

const groqProvider: Provider = {
  name: "groq",
  models: ["llama", "mixtral", "gemma", "deepseek", "qwen", "whisper", "meta", "openai", "moonshotai", "mistral"],

  async chat(env, messages, model, system) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: system }, ...messages],
        max_tokens: 1024,
      }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "No response.";
  },

  async vision(env, fileId, prompt) {
    const url = await getFileUrl(env.BOT_TOKEN, fileId);
    const imgRes = await fetch(url);
    const b64 = toBase64(await imgRes.arrayBuffer());
    const mime = imgRes.headers.get("content-type") ?? "image/jpeg";
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [{ role: "user", content: [
          { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } },
          { type: "text", text: prompt },
        ]}],
        max_tokens: 1024,
      }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "Could not analyze image.";
  },

  async fetchModels(env) {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { "Authorization": `Bearer ${env.GROQ_API_KEY}` },
    });
    const data = await res.json();
    return data.data?.map((m: { id: string }) => m.id).sort() ?? [];
  },
};

const groqModule: BotModule = {
  name: "groq",
  enabled: true,

  register(bot: Bot, env: Env) {
    // /models
    bot.command("models", async (ctx) => {
      const userId = String(ctx.from!.id);
      const arg = ctx.match?.trim() ?? "";
      const ud = await getUserData(env.KV, userId);
      const models = await getModels(env.KV);
      if (!arg || arg === "list") {
        const list = models.map(m => `• \`${m}\`${m === ud.model ? " ✓" : ""}`).join("\n");
        await safeReply(ctx, `*Available models:*\n\n${list}\n\nCurrent: \`${ud.model}\``, { reply_parameters: { message_id: ctx.message!.message_id } });
        return;
      }
      const match = models.find(m => m === arg) ?? models.find(m => m.includes(arg));
      if (!match) { await ctx.reply("Model not found. Use /models list.", { reply_parameters: { message_id: ctx.message!.message_id } }); return; }
      ud.model = match;
      await saveUserData(env.KV, userId, ud);
      await safeReply(ctx, `Model → \`${match}\``, { reply_parameters: { message_id: ctx.message!.message_id } });
    });

    // /ocr
    bot.command("ocr", async (ctx) => {
      const replied = ctx.message?.reply_to_message;
      if (!replied?.photo) { await ctx.reply("Reply to an image with /ocr.", { reply_parameters: { message_id: ctx.message!.message_id } }); return; }
      await ctx.replyWithChatAction("typing");
      const result = await groqProvider.vision(env, replied.photo[replied.photo.length - 1].file_id, "Extract and transcribe all text visible in this image. Output only the extracted text.");
      await ctx.reply(result, { reply_parameters: { message_id: ctx.message!.message_id } });
    });

    // /refresh — fetches from all registered providers
    bot.command("refresh", async (ctx) => {
      await ctx.replyWithChatAction("typing");
      const all = await Promise.all(getAllProviders().map(p => p.fetchModels(env).catch(() => [])));
      const models = all.flat().sort();
      if (!models.length) { await ctx.reply("Failed to fetch models.", { reply_parameters: { message_id: ctx.message!.message_id } }); return; }
      await env.KV.put("models", JSON.stringify(models));
      await ctx.reply(`Refreshed. ${models.length} models available.`, { reply_parameters: { message_id: ctx.message!.message_id } });
    });

    // Document handler
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
        const reply = await groqProvider.chat(env,
          [{ role: "user", content: `File: ${name}\n\n\`\`\`\n${text}\n\`\`\`\n\n${prompt}` }],
          ud.model, ud.system
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
