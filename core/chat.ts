import { Bot } from "https://deno.land/x/grammy@v1.42.0/mod.ts";
import type { Env } from "./types.ts";
import { getUserData, saveUserData, MAX_HISTORY } from "./kv.ts";
import { getProvider } from "./index.ts";

export function registerChat(bot: Bot, env: Env) {
  // Photo
  bot.on("message:photo", async (ctx) => {
    const userId = String(ctx.from!.id);
    const prompt = ctx.message.caption?.trim() ?? "Describe this image in detail.";
    const typing = setInterval(() => ctx.replyWithChatAction("typing"), 4000);
    await ctx.replyWithChatAction("typing");
    try {
      const ud = await getUserData(env.KV, userId);
      const result = await getProvider(env, ud.model).vision(env, ctx.message.photo[ctx.message.photo.length - 1].file_id, prompt);
      await safeReply(ctx, result, { reply_parameters: { message_id: ctx.message.message_id } });
    } catch (e) {
      await ctx.reply(`Vision error: ${e instanceof Error ? e.message : String(e)}`, { reply_parameters: { message_id: ctx.message.message_id } });
    } finally { clearInterval(typing); }
  });

  // Static sticker
  bot.on("message:sticker", async (ctx) => {
    const sticker = ctx.message.sticker;
    if (sticker.is_animated || sticker.is_video) {
      await ctx.reply("I can only read static stickers.", { reply_parameters: { message_id: ctx.message.message_id } });
      return;
    }
    const typing = setInterval(() => ctx.replyWithChatAction("typing"), 4000);
    await ctx.replyWithChatAction("typing");
    try {
      const userId = String(ctx.from!.id);
      const ud = await getUserData(env.KV, userId);
      const provider = getProvider(env, ud.model);
      const description = await provider.vision(env, sticker.file_id, "This is a sticker the user sent. Briefly describe what emotion or reaction it expresses in 1 sentence.");
      ud.messages.push({ role: "user", content: `[Sticker: ${description}]` });
      if (ud.messages.length > MAX_HISTORY) ud.messages = ud.messages.slice(-MAX_HISTORY);
      const reply = await provider.chat(env, ud.messages, ud.model, ud.system);
      ud.messages.push({ role: "assistant", content: reply });
      await saveUserData(env.KV, userId, ud);
      await safeReply(ctx, reply, { reply_parameters: { message_id: ctx.message.message_id } });
    } catch (e) {
      await ctx.reply(`Error: ${e instanceof Error ? e.message : String(e)}`, { reply_parameters: { message_id: ctx.message.message_id } });
    } finally { clearInterval(typing); }
  });

  // Text
  bot.on("message:text", async (ctx) => {
    const userId = String(ctx.from!.id);
    const typing = setInterval(() => ctx.replyWithChatAction("typing"), 4000);
    await ctx.replyWithChatAction("typing");
    try {
      const ud = await getUserData(env.KV, userId);
      ud.messages.push({ role: "user", content: ctx.message.text });
      if (ud.messages.length > MAX_HISTORY) ud.messages = ud.messages.slice(-MAX_HISTORY);
      const provider = getProvider(env, ud.model);
      const reply = await provider.chat(env, ud.messages, ud.model, ud.system);
      ud.messages.push({ role: "assistant", content: reply });
      await saveUserData(env.KV, userId, ud);
      await safeReply(ctx, reply, { reply_parameters: { message_id: ctx.message.message_id } });
    } catch (e) {
      await ctx.reply(`Error: ${e instanceof Error ? e.message : String(e)}`, { reply_parameters: { message_id: ctx.message.message_id } });
    } finally { clearInterval(typing); }
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
