export interface Message { role: "user" | "assistant"; content: string; }
export type Thinking = "low" | "high";
export interface UserData { messages: Message[]; model: string; provider: string; system: string; thinking: Thinking; }

// Locked model set — 3 providers, 1 model each. No dynamic fetch/refresh anymore.
export const LOCKED_MODELS = [
  { key: "gemini", provider: "gemini", model: "gemini-flash-lite-latest", label: "Gemini Flash Lite" },
  { key: "groq", provider: "groq", model: "groq/compound", label: "Groq Compound" },
  { key: "cf", provider: "cloudflare", model: "@cf/moonshotai/kimi-k2.6", label: "CF Kimi K2.6" },
] as const;
export type ModelKey = typeof LOCKED_MODELS[number]["key"];

const DEFAULT_ENTRY = LOCKED_MODELS[0]; // gemini — fast, cheap, no rate-limit surprises. Change if you want a different default.
export const DEFAULT_MODEL = DEFAULT_ENTRY.model;
export const DEFAULT_PROVIDER = DEFAULT_ENTRY.provider;
export const DEFAULT_THINKING: Thinking = "low"; // fast replies by default; user can flip to high via /settings
export const DEFAULT_SYSTEM = "You are a concise AI assistant. Keep responses under 100 words unless asked for detail. Use bullet points for lists, markdown for emphasis. No filler, no apologies, no pleasantries. For complex requests, use a clear numbered sequence.";
export const HISTORY_TTL = 8 * 60 * 60;
export const MAX_HISTORY = 20;

function defaults(): UserData {
  return { messages: [], model: DEFAULT_MODEL, provider: DEFAULT_PROVIDER, system: DEFAULT_SYSTEM, thinking: DEFAULT_THINKING };
}

export async function getUserData(kv: KVNamespace, userId: string): Promise<UserData> {
  try {
    const raw = await kv.get(`user:${userId}`);
    return raw ? { ...defaults(), ...JSON.parse(raw) } : defaults();
  } catch { return defaults(); }
}

export async function saveUserData(kv: KVNamespace, userId: string, data: UserData) {
  await kv.put(`user:${userId}`, JSON.stringify(data), { expirationTtl: HISTORY_TTL });
}

export async function getWhitelist(kv: KVNamespace): Promise<string[]> {
  try { const r = await kv.get("whitelist"); return r ? JSON.parse(r) : []; }
  catch { return []; }
}

export async function saveWhitelist(kv: KVNamespace, list: string[]) {
  await kv.put("whitelist", JSON.stringify(list));
}

export async function getLogging(kv: KVNamespace): Promise<boolean> {
  try { return (await kv.get("settings:logging")) === "1"; }
  catch { return false; }
}

export async function setLogging(kv: KVNamespace, val: boolean) {
  await kv.put("settings:logging", val ? "1" : "0");
}

export async function getWhitelistEnabled(kv: KVNamespace): Promise<boolean> {
  try { return (await kv.get("settings:whitelist")) === "1"; }
  catch { return false; }
}

export async function setWhitelistEnabled(kv: KVNamespace, val: boolean) {
  await kv.put("settings:whitelist", val ? "1" : "0");
}
