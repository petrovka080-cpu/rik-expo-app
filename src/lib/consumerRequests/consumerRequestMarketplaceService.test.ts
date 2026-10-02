import { canonicalConsumerRepairMarketplaceProjection } from "./consumerRequestMarketplaceService";

const REVISION_ID = "2f635df2-5b2d-4965-9984-62c3fda1759b";
const RELEASE_ID = "43ff52c6-4dc2-575f-a429-c879b483f52e";

function row(input: {
  rowCode: string;
  sourceCategory: string;
  itemCategory: string;
  itemType?: string;
}) {
  return {
    itemType: input.itemType ?? "service",
    titleRu: input.rowCode,
    quantity: 0.625,
    unit: "machine_hour",
    unitPrice: null,
    category: input.itemCategory,
    sourceParameters: {
      rowCode: input.rowCode,
      rowSha256: "a".repeat(64),
      canonicalBackendRevisionId: REVISION_ID,
      canonicalBackendReleaseId: RELEASE_ID,
      canonicalBackendCatalogId: "canonical-work:anchor-group-concrete-placement:r1",
      includedInEstimate: false,
      includedInProcurement: false,
      smartEstimateProjectionV2: {
        sourceCategory: input.sourceCategory,
      },
    },
  };
}

describe("canonical consumer estimate marketplace projection", () => {
  it("preserves canonical backend row category instead of the UI section category", () => {
    const projection = canonicalConsumerRepairMarketplaceProjection({
      draft: { selectedWorkTitleRu: "Anchor group concrete placement" },
      items: [
        row({
          rowCode: "anchor-group-pour:included:pump-operator",
          sourceCategory: "construction_work",
          itemCategory: "equipment",
        }),
        row({
          rowCode: "anchor-group-pour:equipment:pump",
          sourceCategory: "equipment",
          itemCategory: "equipment",
        }),
        row({
          rowCode: "anchor-group-pour:logistics:pump-setup",
          sourceCategory: "service",
          itemCategory: "work",
          itemType: "work",
        }),
      ],
    } as never, {
      artifactId: "procurement:test",
      kind: "procurement",
      revisionId: REVISION_ID,
      releaseId: RELEASE_ID,
      status: "ready",
      sha256: "b".repeat(64),
      revisionChecksumSha256: "c".repeat(64),
    });

    expect(projection.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        rik_code: "anchor-group-pour:included:pump-operator",
        canonical_category: "construction_work",
        kind: "work",
      }),
      expect.objectContaining({
        rik_code: "anchor-group-pour:equipment:pump",
        canonical_category: "equipment",
        kind: "rent",
      }),
      expect.objectContaining({
        rik_code: "anchor-group-pour:logistics:pump-setup",
        canonical_category: "service",
        kind: "service",
      }),
    ]));
  });
});
