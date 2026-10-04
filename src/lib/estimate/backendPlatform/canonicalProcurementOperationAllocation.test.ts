import {
  assertCanonicalProcurementJobRendererVersion,
  buildCanonicalProcurementProjection,
  canonicalArtifactFileIdentity,
  canonicalProcurementRequestKey,
  CANONICAL_PROCUREMENT_GENERATOR_VERSION,
  selectCanonicalArtifactRows,
} from "./canonicalEstimateArtifactContract";

const operation = (groupId: string, operationId: string) => ({
  contractVersion: "canonical-operation-resource/v1",
  groupId, operationId, groupTitleRu: "Бетонирование", operationTitleRu: operationId,
  completionCriterionRu: "Выполнена принятая проектная операция",
});
const row = (id: string, ref: unknown, included = true) => ({
  row_id: id, ordinal: 1, section: "materials", category: "material", title_ru: "Вода",
  unit_id: "m3", quantity: "3.200", unit_price: "10.00", amount: "32.00",
  included_in_estimate: included, included_in_procurement: included, procurement_eligible: included,
  ownership_status: "OWNED", row_sha256: id,
  calculation_trace: { resourceGraph: { operationCompositionV1: ref }, manualAmendment: { quantity: "3.200" } },
});
const revision = { id: "owned", release_id: "prepared", catalog_id: "pour", checksum_sha256: "checksum", row_count: 5 };

describe("procurement operation allocation and renderer recovery", () => {
  it("preserves exact quantities, prices, manual changes and row identity for each operation", () => {
    const refs = [operation("concrete", "supply"), operation("concrete", "curing")];
    const sourceRows = [row("water-supply", refs[0]), row("water-curing", refs[1]), row("kit-included", refs[1], false)];
    const before = JSON.stringify(sourceRows);
    const selected = selectCanonicalArtifactRows(sourceRows);
    const result = buildCanonicalProcurementProjection({ revision, ...selected });
    expect(result.rows.map(r => [r.rowId, r.quantity, r.unitId, r.amount, r.rowSha256, r.manualAmendment]))
      .toEqual(sourceRows.slice(0, 2).map(r => [r.row_id, r.quantity, r.unit_id, r.amount, r.row_sha256, r.calculation_trace.manualAmendment]));
    expect(result.operationGroups).toEqual([
      { operation: refs[0], rowIds: ["water-supply"] }, { operation: refs[1], rowIds: ["water-curing"] },
    ]);
    expect(result.groups).toEqual([{ section: "materials", category: "material", rowIds: ["water-supply", "water-curing"] }]);
    expect(result.selectedRowCount).toBe(2);
    expect(JSON.stringify(sourceRows)).toBe(before);
  });

  it("uses unambiguous group and operation pairs without merging different operations", () => {
    const sourceRows = [row("a", operation("a\u0000b", "c")), row("b", operation("a", "b\u0000c")), row("c", operation("a", "b\u0000c"))];
    const result = buildCanonicalProcurementProjection({ revision, procurementRows: sourceRows });
    expect(result.operationGroups.map(g => g.rowIds)).toEqual([["a"], ["b", "c"]]);
  });

  it("keeps legacy and invalid references readable without fabricating an operation", () => {
    const result = buildCanonicalProcurementProjection({ revision, procurementRows: [row("legacy", undefined), row("invalid", { ...operation("g", "o"), completionCriterionRu: "" })] });
    expect(result.rows).toHaveLength(2);
    expect(result.rows.every(r => !Object.hasOwn(r, "operation"))).toBe(true);
    expect(result.operationGroups).toEqual([]);
  });

  it("binds renderer-marked jobs and rejects malformed or stale payloads", () => {
    expect(() => assertCanonicalProcurementJobRendererVersion({})).not.toThrow();
    expect(() => assertCanonicalProcurementJobRendererVersion({ rendererVersion: CANONICAL_PROCUREMENT_GENERATOR_VERSION })).not.toThrow();
    for (const value of [null, [], "payload", { rendererVersion: null }, { rendererVersion: "canonical-procurement.r2" }]) {
      expect(() => assertCanonicalProcurementJobRendererVersion(value)).toThrow();
    }
  });

  it("isolates legacy caller keys by renderer and keeps maximum length input distinct", () => {
    const legacyKey = "consumer-procurement-owned";
    const key = canonicalProcurementRequestKey(legacyKey);
    expect(key).not.toBe(legacyKey);
    expect(canonicalProcurementRequestKey(` ${legacyKey} `)).toBe(key);
    expect(canonicalProcurementRequestKey("x".repeat(200))).not.toBe(canonicalProcurementRequestKey("x".repeat(199) + "y"));
    expect(canonicalProcurementRequestKey("x".repeat(200)).length).toBeLessThanOrEqual(200);
  });

  it("keeps earlier procurement and professional PDF bytes addressable on renderer change", () => {
    for (const kind of ["procurement", "professional_pdf"]) {
      expect(canonicalArtifactFileIdentity(kind, "revision", "old-bytes"))
        .not.toBe(canonicalArtifactFileIdentity(kind, "revision", "new-bytes"));
    }
    expect(canonicalArtifactFileIdentity("pdf", "revision", "new-bytes")).toBe("revision");
  });
});
