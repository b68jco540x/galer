import { Bot } from "https://deno.land/x/grammy@v1.42.0/mod.ts";
import type { Env } from "./types.ts";
import { getUserData, saveUserData, MAX_HISTORY } from "./kv.ts";
import { getProvider } from "./index.ts";

export function registerChat(bot: Bot, env: Env) {
  // Photo
  bot.on("message:photo", async (ctx) => {
    const prompt = ctx.message.caption?.trim() ?? "Describe this image in detail.";
    await ctx.replyWithChatAction("typing");
    const provider = getProvider(env);
    const result = await provider.vision(env, ctx.message.photo[ctx.message.photo.length - 1].file_id, prompt);
    await ctx.reply(result, { reply_parameters: { message_id: ctx.message.message_id } });
  });

  // Text
  bot.on("message:text", async (ctx) => {
    const userId = String(ctx.from.id);
    const text = ctx.message.text;
    await ctx.replyWithChatAction("typing");
    const ud = await getUserData(env.KV, userId);
    ud.messages.push({ role: "user", content: text });
    if (ud.messages.length > MAX_HISTORY) ud.messages = ud.messages.slice(-MAX_HISTORY);
    const provider = getProvider(env);
    const reply = await provider.chat(env, ud.messages, ud.model, ud.system);
    ud.messages.push({ role: "assistant", content: reply });
    await saveUserData(env.KV, userId, ud);
    await safeReply(ctx, reply, { reply_parameters: { message_id: ctx.message.message_id } });
  });
}

export async function safeReply(
  ctx: { reply: (text: string, opts?: Record<string, unknown>) => Promise<unknown> },
  text: string,
  opts: Record<string, unknown> = {}
) {
  try {
    await ctx.reply(text, { parse_mode: "Markdown", ...opts });
  } catch {
    await ctx.reply(text, opts);
  }
}
