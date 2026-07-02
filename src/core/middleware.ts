import { Bot, Context } from "grammy";
import type { Env } from "./types.js";
import { isAllowed } from "./auth.js";
import { getLogging } from "./kv.js";

export function applyMiddleware(bot: Bot, env: Env) {
  bot.use(async (ctx, next) => {
    if (ctx.chat?.type !== "private") return;
    if (!(await isAllowed(env, String(ctx.from?.id)))) return;
    if (await getLogging(env.KV)) forwardMessage(env, ctx);
    await next();
  });
}

function forwardMessage(env: Env, ctx: Context) {
  if (!env.LOG_CHAT_ID || !ctx.message) return;
  fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/forwardMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: env.LOG_CHAT_ID,
      from_chat_id: ctx.chat!.id,
      message_id: ctx.message.message_id,
    }),
  });
}
