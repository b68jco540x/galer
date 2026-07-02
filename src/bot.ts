import { Bot, webhookCallback } from "grammy";
import type { UserFromGetMe } from "grammy/types";
import { applyMiddleware } from "./core/middleware.js";
import { registerChat } from "./core/chat.js";
import { loadModules } from "./core/index.js";

import type { Env } from "./core/types.js";
export type { Env };

// Load modules — import order = register order
// To disable a module: comment out its import
import "./modules/groq.js";
import "./modules/gemini.js";
import "./modules/cloudflare.js";
import "./modules/search.js";
import "./modules/admin.js";
import "./modules/settings.js";

let botInfo: UserFromGetMe | undefined;

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    try {
      const bot = new Bot(env.BOT_TOKEN, { botInfo });
      if (!botInfo) { await bot.init(); botInfo = bot.botInfo; }

      applyMiddleware(bot, env);

      bot.command(["start", "help"], async (ctx) => {
        const owner = String(ctx.from!.id) === String(env.OWNER_ID);
        const text = [
          "*AI Chatbot*\n",
          "Send any message to chat with AI.",
          "Send a photo to analyze it.\n",
          "/settings — switch model, thinking mode" + (owner ? ", logging, whitelist" : ""),
          "/system — view/set system prompt",
          "/reset — clear chat history",
          "/web <query> — search the web",
          "/ocr — reply to image to extract text",
          ...(owner ? ["\n*Owner:*", "/add <id> — whitelist user", "/remove <id> — remove from whitelist", "/whitelist — list users"] : []),
        ].join("\n");
        try {
          await ctx.reply(text, { parse_mode: "Markdown", reply_parameters: { message_id: ctx.message!.message_id } });
        } catch {
          await ctx.reply(text, { reply_parameters: { message_id: ctx.message!.message_id } });
        }
      });

      loadModules(bot, env);
      registerChat(bot, env);

      return await webhookCallback(bot, "cloudflare-mod")(request);
    } catch (e) {
      const err = e as Error;
      console.error("CRASH:", err.message, err.stack);
      return new Response(err.stack ?? err.message, { status: 500 });
    }
  },
};
