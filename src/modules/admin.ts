import { Bot } from "grammy";
import type { Env } from "../core/types.js";
import { registerModule } from "../core/index.js";
import { isOwner } from "../core/auth.js";
import { getUserData, saveUserData, getWhitelist, saveWhitelist } from "../core/kv.js";
import { safeReply } from "../core/chat.js";

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
