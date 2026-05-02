import { Bot } from "https://deno.land/x/grammy@v1.42.0/mod.ts";
import type { Env } from "./types.ts";
import type { Message } from "./kv.ts";

// --- Provider interface ---
export interface Provider {
  name: string;
  models: string[];  // prefixes this provider handles e.g. ["llama", "mixtral", "gemma"]
  chat(env: Env, messages: Message[], model: string, system: string): Promise<string>;
  vision(env: Env, fileId: string, prompt: string): Promise<string>;
  fetchModels(env: Env): Promise<string[]>;
}

// --- Module interface ---
export interface BotModule {
  name: string;
  enabled: boolean;
  register(bot: Bot, env: Env): void;
}

const providers: Provider[] = [];
const modules: BotModule[] = [];

export function registerProvider(p: Provider) {
  providers.push(p);
}

export function registerModule(m: BotModule) {
  modules.push(m);
}

export function getProvider(env: Env, model?: string): Provider {
  const m = model ?? "";
  const match = providers.find(p => p.models.some(prefix => m.includes(prefix)));
  return match ?? providers[0];
}

export function loadModules(bot: Bot, env: Env) {
  for (const mod of modules) {
    if (mod.enabled) mod.register(bot, env);
  }
}
