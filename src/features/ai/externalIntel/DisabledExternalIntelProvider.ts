import type {
  ExternalIntelProvider,
  ExternalIntelProviderSearchInput,
  ExternalIntelProviderSearchOutput,
} from "./externalIntelTypes";

export class DisabledExternalIntelProvider implements ExternalIntelProvider {
  readonly provider = "disabled" as const;

  async searchPreview(
    input: ExternalIntelProviderSearchInput,
  ): Promise<ExternalIntelProviderSearchOutput> {
    void input;
    return {
      status: "external_policy_not_enabled",
      results: [],
      citations: [],
      providerCalled: false,
      mutationCount: 0,
      rawHtmlReturned: false,
    };
  }
}
