import type { Env } from "../core/types.js";
import type { Provider, BotModule } from "../core/index.js";
import { registerProvider, registerModule } from "../core/index.js";
import { cfVision } from "../core/vision.js";
import { safeReply } from "../core/chat.js";
import { Bot } from "grammy";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // base64 encode is sync/CPU-bound, keep under CF Workers' CPU budget

const cloudflareProvider: Provider = {
  name: "cloudflare",

  async chat(env, messages, model, system, thinking) {
    // chat_template_kwargs.thinking: confirmed control for Kimi K2.6's reasoning
    // (per CF changelog). low -> off, high -> on.
    const result = await env.AI.run(model as `@cf/${string}`, {
      messages: [{ role: "system", content: system }, ...messages],
      chat_template_kwargs: { thinking: thinking === "high" },
    } as Parameters<Ai["run"]>[1]);
    // Kimi K2.6 returns an OpenAI chat-completions shape (choices[].message.content),
    // not the plain { response: string } most other Workers AI text-gen models use.
    const r = result as { choices?: { message?: { content?: string } }[] };
    return r.choices?.[0]?.message?.content ?? "No response.";
  },
};

const cloudflareModule: BotModule = {
  name: "cloudflare",
  enabled: true,

  register(bot: Bot, env: Env) {
    // /ocr
    bot.command("ocr", async (ctx) => {
      const replied = ctx.message?.reply_to_message;
      if (!replied?.photo) { await ctx.reply("Reply to an image with /ocr.", { reply_parameters: { message_id: ctx.message!.message_id } }); return; }
      const photo = replied.photo[replied.photo.length - 1];
      if (photo.file_size && photo.file_size > MAX_IMAGE_BYTES) {
        await ctx.reply(`Image too large (max ${MAX_IMAGE_BYTES / 1024 / 1024}MB).`, { reply_parameters: { message_id: ctx.message!.message_id } });
        return;
      }
      await ctx.replyWithChatAction("typing");
      try {
        const result = await cfVision(env, photo.file_id, "Extract and transcribe all text visible in this image. Output only the extracted text.");
        await safeReply(ctx, result, { reply_parameters: { message_id: ctx.message!.message_id } });
      } catch (e) {
        await ctx.reply(`Error: ${e instanceof Error ? e.message : String(e)}`, { reply_parameters: { message_id: ctx.message!.message_id } });
      }
    });
  },
};

registerProvider(cloudflareProvider);
registerModule(cloudflareModule);
