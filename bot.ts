import { Bot, webhookCallback } from "https://deno.land/x/grammy@v1.42.0/mod.ts";
import type { UserFromGetMe } from "https://deno.land/x/grammy@v1.42.0/types.ts";
import { applyMiddleware } from "./core/middleware.ts";
import { registerChat } from "./core/chat.ts";
import { loadModules } from "./core/index.ts";

import type { Env } from "./core/types.ts";
export type { Env };

// Load modules — import order = register order
// To disable a module: comment out its import
import "./modules/groq.ts";
//import "./modules/gemini.ts";
import "./modules/openrouter.ts";
import "./modules/search.ts";
import "./modules/admin.ts";

let botInfo: UserFromGetMe | undefined;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
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
          "/models list — list available models",
          "/models <n> — switch model",
          "/system — view/set system prompt",
          "/reset — clear chat history",
          "/web <query> — search the web",
          "/ocr — reply to image to extract text",
          ...(owner ? ["\n*Owner:*", "/refresh — refresh model list", "/add <id> — whitelist user", "/remove <id> — remove from whitelist", "/whitelist — list users"] : []),
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
