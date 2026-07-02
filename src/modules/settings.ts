import { Bot, InlineKeyboard } from "grammy";
import type { Env } from "../core/types.js";
import { registerModule } from "../core/index.js";
import { isOwner } from "../core/auth.js";
import {
  getUserData, saveUserData, getLogging, setLogging,
  getWhitelistEnabled, setWhitelistEnabled, LOCKED_MODELS,
} from "../core/kv.js";
import type { Thinking } from "../core/kv.js";

async function renderSettings(env: Env, userId: string): Promise<{ text: string; keyboard: InlineKeyboard }> {
  const ud = await getUserData(env.KV, userId);
  const owner = isOwner(env, userId);
  const kb = new InlineKeyboard();

  kb.row();
  for (const m of LOCKED_MODELS) {
    const mark = ud.provider === m.provider ? " ✓" : "";
    kb.text(`${m.label}${mark}`, `set:model:${m.key}`);
  }

  kb.row();
  kb.text(`Thinking: Low${ud.thinking === "low" ? " ✓" : ""}`, "set:think:low");
  kb.text(`High${ud.thinking === "high" ? " ✓" : ""}`, "set:think:high");

  let text = `*Settings*\n\nModel: \`${ud.model}\`\nThinking: \`${ud.thinking}\``;

  if (owner) {
    const [logging, whitelist] = await Promise.all([getLogging(env.KV), getWhitelistEnabled(env.KV)]);
    kb.row();
    kb.text(`Logging: On${logging ? " ✓" : ""}`, "set:log:on");
    kb.text(`Off${!logging ? " ✓" : ""}`, "set:log:off");
    kb.row();
    kb.text(`Whitelist: On${whitelist ? " ✓" : ""}`, "set:wl:on");
    kb.text(`Off${!whitelist ? " ✓" : ""}`, "set:wl:off");
    text += `\nLogging: \`${logging ? "on" : "off"}\`\nWhitelist: \`${whitelist ? "on" : "off"}\``;
  }

  return { text, keyboard: kb };
}

registerModule({
  name: "settings",
  enabled: true,

  register(bot: Bot, env: Env) {
    bot.command("settings", async (ctx) => {
      const userId = String(ctx.from!.id);
      const { text, keyboard } = await renderSettings(env, userId);
      try {
        await ctx.reply(text, { parse_mode: "Markdown", reply_markup: keyboard, reply_parameters: { message_id: ctx.message!.message_id } });
      } catch {
        await ctx.reply(text, { reply_markup: keyboard, reply_parameters: { message_id: ctx.message!.message_id } });
      }
    });

    bot.callbackQuery(/^set:/, async (ctx) => {
      const userId = String(ctx.from.id);
      const data = ctx.callbackQuery.data ?? "";
      const [, kind, value] = data.split(":");

      if (kind === "model") {
        const entry = LOCKED_MODELS.find(m => m.key === value);
        if (entry) {
          const ud = await getUserData(env.KV, userId);
          ud.model = entry.model;
          ud.provider = entry.provider;
          await saveUserData(env.KV, userId, ud);
        }
      } else if (kind === "think") {
        const ud = await getUserData(env.KV, userId);
        ud.thinking = (value === "high" ? "high" : "low") as Thinking;
        await saveUserData(env.KV, userId, ud);
      } else if (kind === "log" || kind === "wl") {
        if (!isOwner(env, userId)) {
          await ctx.answerCallbackQuery({ text: "Owner only.", show_alert: true });
          return;
        }
        const on = value === "on";
        if (kind === "log") await setLogging(env.KV, on);
        else await setWhitelistEnabled(env.KV, on);
      }

      const { text, keyboard } = await renderSettings(env, userId);
      try {
        await ctx.editMessageText(text, { parse_mode: "Markdown", reply_markup: keyboard });
      } catch {
        // "message not modified" or similar — harmless, ignore
      }
      await ctx.answerCallbackQuery();
    });
  },
});
