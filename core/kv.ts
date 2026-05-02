import type { KVNamespace } from "https://raw.githubusercontent.com/skymethod/denoflare/v0.7.0/common/cloudflare_workers_types.d.ts";

export interface Message { role: "user" | "assistant"; content: string; }
export interface UserData { messages: Message[]; model: string; system: string; }

export const DEFAULT_MODEL = "llama-3.3-70b-versatile";
export const DEFAULT_SYSTEM = "You are a concise AI assistant. Reply briefly and directly. No filler, no repetition. Use markdown only when helpful.";
export const HISTORY_TTL = 8 * 60 * 60;
export const MAX_HISTORY = 20;

function defaults(): UserData {
  return { messages: [], model: DEFAULT_MODEL, system: DEFAULT_SYSTEM };
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

export async function getModels(kv: KVNamespace): Promise<string[]> {
  try { const r = await kv.get("models"); return r ? JSON.parse(r) : [DEFAULT_MODEL]; }
  catch { return [DEFAULT_MODEL]; }
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
