import type { Env } from "./types.js";
import { getFileUrl, toBase64 } from "./media.js";

export const CF_VISION_MODEL = "@cf/moonshotai/kimi-k2.6";

// Vision is locked to this one model for the whole bot — gemini/groq slots don't do
// vision (gpt-oss/compound has none; gemini's is skipped on purpose to keep 1 code path).
export async function cfVision(env: Env, fileId: string, prompt: string): Promise<string> {
  const url = await getFileUrl(env.BOT_TOKEN, fileId);
  const imgRes = await fetch(url);
  const b64 = toBase64(await imgRes.arrayBuffer());
  const mime = imgRes.headers.get("content-type") ?? "image/jpeg";
  const result = await env.AI.run(CF_VISION_MODEL, {
    messages: [{ role: "user", content: [
      { type: "text", text: prompt },
      { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } },
    ]}],
  } as Parameters<Ai["run"]>[1]);
  // Kimi K2.6 returns an OpenAI chat-completions shape (choices[].message.content),
  // not the plain { response: string } most other Workers AI text-gen models use.
  const r = result as { choices?: { message?: { content?: string } }[] };
  return r.choices?.[0]?.message?.content ?? "Could not analyze image.";
}
