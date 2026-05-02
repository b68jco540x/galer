import { Bot, Context } from "https://deno.land/x/grammy@v1.42.0/mod.ts";
import type { Env } from "./types.ts";
import { isAllowed } from "./auth.ts";

export function applyMiddleware(bot: Bot, env: Env) {
  bot.use(async (ctx, next) => {
    if (ctx.chat?.type !== "private") return;
    if (!(await isAllowed(env, String(ctx.from?.id)))) return;
    logMessage(env, ctx);
    await next();
  });
}

function logMessage(env: Env, ctx: Context) {
  if (!env.LOG_CHAT_ID || !ctx.from) return;
  const { id, first_name, last_name, username } = ctx.from;
  const name = [first_name, last_name].filter(Boolean).join(" ");
  const user = username ? ` | @${username}` : "";
  const msg = ctx.message;
  const content = msg?.text ?? (msg?.photo ? `[Photo]${msg.caption ? ": " + msg.caption : ""}` : "[?]");
  fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: env.LOG_CHAT_ID, text: `[${id}${user} | ${name}]\n${content}` }),
  });
}
