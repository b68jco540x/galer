// core/emoji.ts
// Capoo custom emoji — requires bot owner has Telegram Premium
// Usage: import { E } from "./emoji.ts";
//        await ctx.reply(`${E.ok} Done!`, { parse_mode: "HTML" });

function tge(id: string, fallback: string): string {
  return `<tg-emoji emoji-id="${id}">${fallback}</tg-emoji>`;
}

export const E = {
  // --- Status ---
  ok:      tge("AgADVw0AAhTa4FY", "👌"),  // pack2
  yes:     tge("AgADBg8AAut32VY", "👍"),  // pack2
  no:      tge("AgADfRUAAtLXGVY", "❌"),  // pack4
  warn:    tge("AgAD6wwAAmA_4VY", "⚠️"),  // pack2
  error:   tge("AgADCgkAAtmoAVQ", "😱"),  // pack1
  dead:    tge("AgADwQcAAn4qAVQ", "💀"),  // pack1

  // --- Reactions ---
  wow:     tge("AgADjAUAApxhAVQ", "🤩"),  // pack1
  hype:    tge("AgADcQwAAnOz4VY", "🔥"),  // pack2
  think:   tge("AgADhBYAArqDGVY", "🤔"),  // pack4
  eyes:    tge("AgADsgUAAuxrqFQ", "👀"),  // pack1
  star:    tge("AgADegUAAvsHAVQ", "⭐️"), // pack1
  love:    tge("AgAD7AYAAsXlqFQ", "🥰"),  // pack1
  sad:     tge("AgADuRgAAreUGVY", "😢"),  // pack4
  hi:      tge("AgADVxIAAn6h2VY", "👋"),  // pack2
  thanks:  tge("AgAD-wwAAjCt4VY", "🙏"),  // pack2
  lol:     tge("AgAD0wUAAs3hAAFU", "😂"), // pack1
  mind:    tge("AgADkQoAAgIy4FY", "🤯"),  // pack2

  // --- Bot actions ---
  search:  tge("AgADsgUAAuxrqFQ", "👀"),  // pack1 — "looking"
  reset:   tge("AgADJwcAAhXHAAFU", "🤬"), // pack1 — "wiping"
  model:   tge("AgADegUAAvsHAVQ", "⭐️"), // pack1
  sleep:   tge("AgADJQUAArGqAVQ", "😴"),  // pack1
  ask:     tge("AgADkQYAAlQnAAFU", "❓"),  // pack1
  happy:   tge("AgADnyAAAlpIGVY", "😊"),  // pack4
} as const;
