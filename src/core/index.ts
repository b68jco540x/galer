import { Bot } from "grammy";
import type { Env } from "./types.js";
import type { Message, Thinking } from "./kv.js";

export interface Provider {
  name: string;
  chat(env: Env, messages: Message[], model: string, system: string, thinking: Thinking): Promise<string>;
}

export interface BotModule {
  name: string;
  enabled: boolean;
  register(bot: Bot, env: Env): void;
}

const providers: Provider[] = [];
const modules: BotModule[] = [];

export function registerProvider(p: Provider) { providers.push(p); }
export function registerModule(m: BotModule) { modules.push(m); }

export function getProvider(env: Env, providerName?: string): Provider {
  const byName = providers.find(p => p.name === providerName);
  return byName ?? providers[0];
}

export function loadModules(bot: Bot, env: Env) {
  for (const mod of modules) {
    if (mod.enabled) mod.register(bot, env);
  }
}
