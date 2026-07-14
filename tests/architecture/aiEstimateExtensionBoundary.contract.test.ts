import { validateAiEstimateExtensionBoundary } from "../../src/lib/estimate/extension/validateAiEstimateExtensionBoundary";

describe("AI estimate extension boundary", () => {
  it("keeps procurement, pricing, and fulfillment extensions read-only and versioned", () => {
    const result = validateAiEstimateExtensionBoundary();

    expect(result.ok).toBe(true);
    expect(result.no_extension_mutates_revision).toBe(true);
    expect(result.no_extension_writes_ledger_directly).toBe(true);
    expect(result.approved_revision_only).toBe(true);
  });
});
