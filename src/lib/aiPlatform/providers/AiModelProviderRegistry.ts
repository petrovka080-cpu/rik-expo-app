import type { AiModelProviderPort } from "./AiModelProviderPort";
import { InMemoryAiModelProvider } from "./InMemoryAiModelProvider";

export type AiModelProviderRegistry = {
  register(provider: AiModelProviderPort): void;
  get(providerKey: string): AiModelProviderPort | null;
  require(providerKey: string): AiModelProviderPort;
  list(): AiModelProviderPort[];
};

export function createAiModelProviderRegistry(
  providers: readonly AiModelProviderPort[] = [new InMemoryAiModelProvider()],
): AiModelProviderRegistry {
  const byKey = new Map<string, AiModelProviderPort>();
  providers.forEach((provider) => byKey.set(provider.providerKey, provider));
  return {
    register(provider) {
      byKey.set(provider.providerKey, provider);
    },
    get(providerKey) {
      return byKey.get(providerKey) ?? null;
    },
    require(providerKey) {
      const provider = byKey.get(providerKey);
      if (!provider) throw new Error(`AI model provider is not registered: ${providerKey}`);
      return provider;
    },
    list() {
      return [...byKey.values()];
    },
  };
}
