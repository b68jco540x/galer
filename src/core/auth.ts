import type { Env } from "./types.js";
import { getWhitelist, getWhitelistEnabled } from "./kv.js";

export function isOwner(env: Env, userId: string): boolean {
  return userId === String(env.OWNER_ID);
}

export async function isAllowed(env: Env, userId: string): Promise<boolean> {
  if (isOwner(env, userId)) return true;
  if (!(await getWhitelistEnabled(env.KV))) return true;
  return (await getWhitelist(env.KV)).includes(userId);
}
