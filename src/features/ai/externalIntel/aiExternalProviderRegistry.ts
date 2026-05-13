import type { ExternalIntelProviderName } from "./externalIntelTypes";

export type AiExternalProviderCapability = {
  provider: ExternalIntelProviderName;
  label: string;
  liveFetchEnabledByDefault: boolean;
  controlledExternalFetchRequired: true;
  citationsRequired: true;
  rawHtmlReturned: false;
  mutationCount: 0;
  finalActionAllowed: false;
  mobileApiKeyAllowed: false;
};

export const AI_EXTERNAL_PROVIDER_REGISTRY = [
  {
    provider: "disabled",
    label: "Disabled external intelligence provider",
    liveFetchEnabledByDefault: false,
    controlledExternalFetchRequired: true,
    citationsRequired: true,
    rawHtmlReturned: false,
    mutationCount: 0,
    finalActionAllowed: false,
    mobileApiKeyAllowed: false,
  },
  {
    provider: "approved_search_api",
    label: "Approved citation search API",
    liveFetchEnabledByDefault: false,
    controlledExternalFetchRequired: true,
    citationsRequired: true,
    rawHtmlReturned: false,
    mutationCount: 0,
    finalActionAllowed: false,
    mobileApiKeyAllowed: false,
  },
] as const satisfies readonly AiExternalProviderCapability[];

export function listAiExternalProviderCapabilities(): readonly AiExternalProviderCapability[] {
  return AI_EXTERNAL_PROVIDER_REGISTRY;
}

export function resolveAiExternalProviderCapability(
  provider: ExternalIntelProviderName,
): AiExternalProviderCapability | null {
  return AI_EXTERNAL_PROVIDER_REGISTRY.find((entry) => entry.provider === provider) ?? null;
}
