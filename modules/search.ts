import { Bot } from "https://deno.land/x/grammy@v1.42.0/mod.ts";
import type { Env } from "../core/types.ts";
import { registerModule } from "../core/index.ts";
import { safeReply } from "../core/chat.ts";

async function tavilySearch(env: Env, query: string): Promise<string> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: env.TAVILY_API_KEY, query, max_results: 5, search_depth: "basic" }),
  });
  const data = await res.json();
  if (!data.results?.length) return "No results found.";
  return data.results.map((r: { title: string; url: string; content?: string }, i: number) =>
    `${i + 1}. *${r.title}*\n${r.url}\n${r.content?.slice(0, 200)}...`
  ).join("\n\n");
}

registerModule({
  name: "search",
  enabled: true,

  register(bot: Bot, env: Env) {
    bot.command("web", async (ctx) => {
      const query = ctx.match?.trim() ?? "";
      if (!query) { await ctx.reply("Usage: /web <query>", { reply_parameters: { message_id: ctx.message!.message_id } }); return; }
      if (!env.TAVILY_API_KEY) { await ctx.reply("Web search not configured.", { reply_parameters: { message_id: ctx.message!.message_id } }); return; }
      await ctx.replyWithChatAction("typing");
      const results = await tavilySearch(env, query);
      await safeReply(ctx, `*Web: ${query}*\n\n${results}`, { reply_parameters: { message_id: ctx.message!.message_id } });
    });
  },
});
