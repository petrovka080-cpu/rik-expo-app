import type { AiDomainQueryResult } from "./aiDomainContextBundle";
import type { AiDomainName, AiDomainQuery, AiDomainQueryKind } from "./aiDomainQueryTypes";

export type AiDomainProviderHealth = {
  ready: boolean;
  reasonRu?: string;
};

export type AiDomainProvider = {
  domain: AiDomainName;
  capabilities: AiDomainQueryKind[];
  canHandle: (query: AiDomainQuery) => boolean;
  execute: (query: AiDomainQuery) => Promise<AiDomainQueryResult>;
  getLinkedObjects?: (sourceRefId: string) => Promise<AiDomainQueryResult>;
  healthCheck: () => Promise<AiDomainProviderHealth>;
};

export type AiDomainProviderRegistry = {
  providers: AiDomainProvider[];
  getProvider: (domain: AiDomainName) => AiDomainProvider | undefined;
  healthCheck: () => Promise<Record<AiDomainName, AiDomainProviderHealth>>;
};

export function createAiDomainProviderRegistry(
  providers: AiDomainProvider[],
): AiDomainProviderRegistry {
  return {
    providers,
    getProvider: (domain) => providers.find((provider) => provider.domain === domain),
    healthCheck: async () => {
      const entries = await Promise.all(
        providers.map(async (provider) => [provider.domain, await provider.healthCheck()] as const),
      );
      return Object.fromEntries(entries) as Record<AiDomainName, AiDomainProviderHealth>;
    },
  };
}
