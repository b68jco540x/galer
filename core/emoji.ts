// core/emoji.ts
// Capoo custom emoji (CapooStickersEmoji 1/2/4)
// Requires bot owner has Telegram Premium
// All replies using these must use parse_mode: "HTML"

function tge(id: string, fallback: string): string {
  return `<tg-emoji emoji-id="${id}">${fallback}</tg-emoji>`;
}

export const E = {
  // --- Status ---
  ok:     tge("6260243261479193943", "👌"),  // pack2
  yes:    tge("6258165008409038598", "👍"),  // pack2
  no:     tge("6204227258622678397", "❌"),  // pack4
  warn:   tge("6260354638571113707", "⚠️"),  // pack2
  error:  tge("6053305024124029194", "😱"),  // pack1
  dead:   tge("6053166094816905153", "💀"),  // pack1

  // --- Reactions ---
  wow:    tge("6260517722774310394", "🤩"),  // pack2
  hype:   tge("6260482263524314225", "🔥"),  // pack2
  think:  tge("6204134796566730372", "🤔"),  // pack4
  eyes:   tge("6100244356629792178", "👀"),  // pack1
  star:   tge("6053128148780844410", "⭐️"), // pack1
  love:   tge("6100378329544656620", "🥰"),  // pack1
  sad:    tge("6204153475379501241", "😢"),  // pack4
  hi:     tge("6258210719745970775", "👋"),  // pack2
  thanks: tge("6260475378691738875", "🙏"),  // pack2
  lol:    tge("6053086169770493395", "😂"),  // pack1
  mind:   tge("6260058466216315537", "🤯"),  // pack2
  party:  tge("6260209524511083881", "🥳"),  // pack2
  happy:  tge("6204069513063833759", "😊"),  // pack4
  sleep:  tge("6053307051348591909", "😴"),  // pack1
  ask:    tge("6052881140916684433", "❓"),  // pack1
} as const;
