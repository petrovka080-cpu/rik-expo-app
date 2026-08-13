import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import { DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3 } from "../../src/lib/estimate/v4/domains/interiorFinishesComplete";
import { compileBatch001Work } from "./batch001R2TestSupport";

function replayProjection(catalogId: string) {
  const result = compileBatch001Work(catalogId);
  return {
    catalogId,
    status: result.compile_result.status,
    projectAssemblyId: result.compile_result.compilation?.project_assembly_id,
    draft: result.draft ? {
      selectedWork: result.draft.selectedWork,
      items: result.draft.items.map((item) => ({
        titleRu: item.titleRu,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        formulaId: item.formulaId,
        formulaGraphV3: item.sourceParameters?.formulaGraphV3,
        resourceGraphV3: item.sourceParameters?.professionalResourceGraphV3,
        semanticOwner: item.sourceParameters?.semanticOwner,
      })),
    } : null,
  };
}

describe("BATCH001 R2 replay 2/2", () => {
  test("replay 1 reproduces all 16 semantic projections byte-deterministically", () => {
    const first = DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3.map(replayProjection);
    const second = DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3.map(replayProjection);
    expect(estimateDeterministicHash(second)).toBe(estimateDeterministicHash(first));
    expect(second).toEqual(first);
  });

  test("replay 2 remains identical when the compile order is reversed", () => {
    const expected = new Map<string, ReturnType<typeof replayProjection>>(
      DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3.map((id) => [id, replayProjection(id)]),
    );
    const reversed = [...DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3].reverse().map(replayProjection);
    for (const projection of reversed) expect(projection).toEqual(expected.get(projection.catalogId));
  });
});
