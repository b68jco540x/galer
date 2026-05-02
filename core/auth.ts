import type { Env } from "./types.ts";
import { getWhitelist } from "./kv.ts";

export function isOwner(env: Env, userId: string): boolean {
  return userId === String(env.OWNER_ID);
}

export async function isAllowed(env: Env, userId: string): Promise<boolean> {
  if (isOwner(env, userId)) return true;
  return (await getWhitelist(env.KV)).includes(userId);
}
