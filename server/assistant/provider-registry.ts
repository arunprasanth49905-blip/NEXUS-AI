import type { AssistantProvider } from './types.js';
import { GeminiAssistantProvider } from './providers/gemini.js';
import { LocalAssistantProvider } from './providers/local.js';

export class AssistantProviderRegistry {
  private providers = new Map<string, AssistantProvider>();

  constructor() {
    this.register(new GeminiAssistantProvider());
    this.register(new LocalAssistantProvider());
  }

  public register(provider: AssistantProvider): void {
    this.providers.set(provider.id.toLowerCase(), provider);
  }

  public get(id: string): AssistantProvider | undefined {
    return this.providers.get(id.toLowerCase());
  }

  public list(): AssistantProvider[] {
    return Array.from(this.providers.values());
  }
}
