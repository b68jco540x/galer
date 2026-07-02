import { Bot } from "grammy";
import type { Env } from "./types.js";
import { getUserData, saveUserData, MAX_HISTORY } from "./kv.js";
import { getProvider } from "./index.js";
import { cfVision } from "./vision.js";

// Base64 image encoding is sync/CPU-bound — keep it under CF Workers' CPU
// time budget (tight on the Free plan) instead of risking a hard isolate kill
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function registerChat(bot: Bot, env: Env) {
  // Photo — always CF Kimi vision, regardless of the user's selected chat model
  bot.on("message:photo", async (ctx) => {
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    if (photo.file_size && photo.file_size > MAX_IMAGE_BYTES) {
      await ctx.reply(`Image too large (max ${MAX_IMAGE_BYTES / 1024 / 1024}MB). Try sending it more compressed.`, { reply_parameters: { message_id: ctx.message.message_id } });
      return;
    }
    const prompt = ctx.message.caption?.trim() ?? "Describe this image in detail.";
    const typing = setInterval(() => ctx.replyWithChatAction("typing"), 4000);
    await ctx.replyWithChatAction("typing");
    try {
      const result = await cfVision(env, photo.file_id, prompt);
      await safeReply(ctx, result, { reply_parameters: { message_id: ctx.message.message_id } });
    } catch (e) {
      await ctx.reply(`Vision error: ${e instanceof Error ? e.message : String(e)}`, { reply_parameters: { message_id: ctx.message.message_id } });
    } finally { clearInterval(typing); }
  });

  // Static sticker — same vision path as photos
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
      const description = await cfVision(env, sticker.file_id, "This is a sticker the user sent. Briefly describe what emotion or reaction it expresses in 1 sentence.");
      ud.messages.push({ role: "user", content: `[Sticker: ${description}]` });
      if (ud.messages.length > MAX_HISTORY) ud.messages = ud.messages.slice(-MAX_HISTORY);
      const provider = getProvider(env, ud.provider);
      const reply = await provider.chat(env, ud.messages, ud.model, ud.system, ud.thinking);
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
      const provider = getProvider(env, ud.provider);
      const reply = await provider.chat(env, ud.messages, ud.model, ud.system, ud.thinking);
      ud.messages.push({ role: "assistant", content: reply });
      await saveUserData(env.KV, userId, ud);
      await safeReply(ctx, reply, { reply_parameters: { message_id: ctx.message.message_id } });
    } catch (e) {
      await ctx.reply(`Error: ${e instanceof Error ? e.message : String(e)}`, { reply_parameters: { message_id: ctx.message.message_id } });
    } finally { clearInterval(typing); }
  });
}

const TELEGRAM_MAX_LEN = 4096;
const MAX_CHUNKS = 8; // hard ceiling so a runaway model can't spam the chat

function stripThinking(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
    .trim();
}

function splitMessage(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > maxLen) {
    let cut = rest.lastIndexOf("\n", maxLen);
    if (cut < maxLen * 0.5) cut = maxLen; // no good newline boundary -> hard cut
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut).replace(/^\n+/, "");
  }
  if (rest) chunks.push(rest);
  if (chunks.length > MAX_CHUNKS) {
    const kept = chunks.slice(0, MAX_CHUNKS);
    kept[kept.length - 1] += "\n\n_[truncated — response was too long]_";
    return kept;
  }
  return chunks;
}

export async function safeReply(
  ctx: { reply: (text: string, opts?: Record<string, unknown>) => Promise<unknown> },
  text: string,
  opts: Record<string, unknown> = {}
) {
  const clean = stripThinking(text) || "(empty response)";
  const chunks = splitMessage(clean, TELEGRAM_MAX_LEN);
  for (let i = 0; i < chunks.length; i++) {
    // only the first chunk replies to the original message; rest just follow in-chat
    const { reply_parameters, ...rest } = opts as { reply_parameters?: unknown };
    const chunkOpts = i === 0 ? opts : rest;
    try {
      await ctx.reply(chunks[i], { parse_mode: "Markdown", ...chunkOpts });
    } catch {
      await ctx.reply(chunks[i], chunkOpts);
    }
  }
}
