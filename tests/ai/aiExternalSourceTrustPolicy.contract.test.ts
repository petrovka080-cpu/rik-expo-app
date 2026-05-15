import {
  AI_EXTERNAL_SOURCE_TRUST_POLICY_CONTRACT,
  resolveAiExternalSourceTrustPolicy,
} from "../../src/features/ai/externalIntel/aiExternalSourceTrustPolicy";

const input = {
  domain: "procurement" as const,
  query: "cement suppliers Bishkek",
  internalEvidenceRefs: ["internal_app:request:abc"],
  marketplaceChecked: true,
  sourcePolicyIds: ["supplier_public_catalog.default"],
  limit: 5,
};

describe("AI external source trust policy", () => {
  it("keeps cited external preview internal-first, preview-only, and disabled by default", () => {
    expect(AI_EXTERNAL_SOURCE_TRUST_POLICY_CONTRACT).toMatchObject({
      internalFirstRequired: true,
      marketplaceCheckRequired: true,
      citationsRequired: true,
      externalLiveFetchDefault: false,
      external_live_fetch_default: false,
      externalResultConfidenceRequired: true,
      rawHtmlReturned: false,
      mutationCount: 0,
      uncontrolledExternalFetch: false,
      noFakeSuppliers: true,
    });

    expect(resolveAiExternalSourceTrustPolicy(input)).toMatchObject({
      allowed: true,
      status: "preview_ready_live_fetch_disabled",
      citationsRequired: true,
      citations_required: true,
      externalLiveFetchDefault: false,
      external_live_fetch_default: false,
      externalResultConfidenceRequired: true,
      external_result_confidence_required: true,
      rawHtmlReturned: false,
      raw_html_returned: false,
      previewOnly: true,
      finalActionAllowed: false,
      finalActionForbidden: true,
      mutationCount: 0,
      mutation_count: 0,
      providerCalled: false,
      controlledExternalFetchRequired: true,
      uncontrolledExternalFetch: false,
      blockers: [],
    });
  });

  it("blocks external preview until internal evidence and marketplace check are present", () => {
    expect(resolveAiExternalSourceTrustPolicy({ ...input, internalEvidenceRefs: [] })).toMatchObject({
      allowed: false,
      status: "blocked_internal_first",
      blockers: ["BLOCKED_EXTERNAL_INTERNAL_FIRST_REQUIRED"],
    });
    expect(resolveAiExternalSourceTrustPolicy({ ...input, marketplaceChecked: false })).toMatchObject({
      allowed: false,
      status: "blocked_internal_first",
      blockers: ["BLOCKED_EXTERNAL_INTERNAL_FIRST_REQUIRED"],
    });
  });

  it("blocks unregistered source policies instead of inventing sources", () => {
    expect(resolveAiExternalSourceTrustPolicy({ ...input, sourcePolicyIds: ["unknown.source"] })).toMatchObject({
      allowed: false,
      status: "blocked_source_policy",
      policies: [],
      blockers: ["BLOCKED_EXTERNAL_SOURCE_POLICY"],
    });
  });
});
