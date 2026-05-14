import { resolveConstructionExternalIntelPolicy } from "../../src/features/ai/constructionKnowhow/constructionExternalIntelPolicy";

describe("Construction external intel policy", () => {
  it("keeps external intelligence internal-first and preview-only", () => {
    const preview = resolveConstructionExternalIntelPolicy({
      domainId: "procurement",
      internalFirstStatus: "insufficient",
      externalPreviewRequested: true,
    });

    expect(preview.status).toBe("available_preview_only");
    expect(preview.externalPreviewAllowed).toBe(true);
    expect(preview.citationsRequired).toBe(true);
    expect(preview.previewOnly).toBe(true);
    expect(preview.externalLiveFetch).toBe(false);
    expect(preview.mobileExternalFetch).toBe(false);
    expect(preview.providerCalled).toBe(false);
    expect(preview.mutationCount).toBe(0);
  });

  it("blocks domains without an external preview policy", () => {
    const blocked = resolveConstructionExternalIntelPolicy({
      domainId: "warehouse_material_flow",
      internalFirstStatus: "partial",
      externalPreviewRequested: true,
    });

    expect(blocked.status).toBe("blocked");
    expect(blocked.externalLiveFetch).toBe(false);
    expect(blocked.mobileExternalFetch).toBe(false);
  });
});
