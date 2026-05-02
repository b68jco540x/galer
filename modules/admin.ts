import { Bot } from "https://deno.land/x/grammy@v1.42.0/mod.ts";
import type { Env } from "../core/types.ts";
import { registerModule } from "../core/index.ts";
import { isOwner } from "../core/auth.ts";
import { getUserData, saveUserData, getWhitelist, saveWhitelist, getLogging, setLogging } from "../core/kv.ts";
import { safeReply } from "../core/chat.ts";

registerModule({
  name: "admin",
  enabled: true,

  register(bot: Bot, env: Env) {
    // /reset
    bot.command("reset", async (ctx) => {
      const ud = await getUserData(env.KV, String(ctx.from!.id));
      ud.messages = [];
      await saveUserData(env.KV, String(ctx.from!.id), ud);
      await ctx.reply("History cleared.", { reply_parameters: { message_id: ctx.message!.message_id } });
    });

    // /system
    bot.command("system", async (ctx) => {
      const userId = String(ctx.from!.id);
      const prompt = ctx.match?.trim() ?? "";
      const ud = await getUserData(env.KV, userId);
      if (!prompt) {
        await safeReply(ctx, `Current:\n\n_${ud.system}_\n\nUse /system <prompt> to change.`, { reply_parameters: { message_id: ctx.message!.message_id } });
        return;
      }
      ud.system = prompt;
      await saveUserData(env.KV, userId, ud);
      await ctx.reply("System prompt updated.", { reply_parameters: { message_id: ctx.message!.message_id } });
    });

    // /settings (owner)
    bot.command("settings", async (ctx) => {
      if (!isOwner(env, String(ctx.from!.id))) return;
      const arg = ctx.match?.trim().toLowerCase() ?? "";
      if (!arg) {
        const logging = await getLogging(env.KV);
        await safeReply(ctx, `*Settings*\n\nLogging: ${logging ? "on ✓" : "off ✗"}\n\nUse /settings logging on|off`, { reply_parameters: { message_id: ctx.message!.message_id } });
        return;
      }
      if (arg === "logging on")  { await setLogging(env.KV, true);  await ctx.reply("Logging enabled.",  { reply_parameters: { message_id: ctx.message!.message_id } }); return; }
      if (arg === "logging off") { await setLogging(env.KV, false); await ctx.reply("Logging disabled.", { reply_parameters: { message_id: ctx.message!.message_id } }); return; }
      await ctx.reply("Unknown setting. Usage: /settings logging on|off", { reply_parameters: { message_id: ctx.message!.message_id } });
    });

    // /add (owner)
    bot.command("add", async (ctx) => {
      if (!isOwner(env, String(ctx.from!.id))) return;
      const id = ctx.match?.trim() ?? "";
      if (!id) { await ctx.reply("Usage: /add <user_id>", { reply_parameters: { message_id: ctx.message!.message_id } }); return; }
      const list = await getWhitelist(env.KV);
      if (list.includes(id)) { await safeReply(ctx, `\`${id}\` already whitelisted.`, { reply_parameters: { message_id: ctx.message!.message_id } }); return; }
      list.push(id);
      await saveWhitelist(env.KV, list);
      await safeReply(ctx, `Added \`${id}\`.`, { reply_parameters: { message_id: ctx.message!.message_id } });
    });

    // /remove (owner)
    bot.command("remove", async (ctx) => {
      if (!isOwner(env, String(ctx.from!.id))) return;
      const id = ctx.match?.trim() ?? "";
      if (!id) { await ctx.reply("Usage: /remove <user_id>", { reply_parameters: { message_id: ctx.message!.message_id } }); return; }
      const list = await getWhitelist(env.KV);
      const newList = list.filter(x => x !== id);
      if (newList.length === list.length) { await safeReply(ctx, `\`${id}\` not in whitelist.`, { reply_parameters: { message_id: ctx.message!.message_id } }); return; }
      await saveWhitelist(env.KV, newList);
      await safeReply(ctx, `Removed \`${id}\`.`, { reply_parameters: { message_id: ctx.message!.message_id } });
    });

    // /whitelist (owner)
    bot.command("whitelist", async (ctx) => {
      if (!isOwner(env, String(ctx.from!.id))) return;
      const list = await getWhitelist(env.KV);
      if (!list.length) { await ctx.reply("Whitelist is empty.", { reply_parameters: { message_id: ctx.message!.message_id } }); return; }
      await safeReply(ctx, `*Whitelisted:*\n${list.map(id => `• \`${id}\``).join("\n")}`, { reply_parameters: { message_id: ctx.message!.message_id } });
    });
  },
});
