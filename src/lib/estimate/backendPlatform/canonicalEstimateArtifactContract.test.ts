import {
  buildCanonicalArtifactMetadata,
  buildCanonicalProcurementProjection,
  canonicalArtifactQuantity,
  selectCanonicalArtifactRows,
} from "./canonicalEstimateArtifactContract";

const revision = {
  id: "revision-1",
  release_id: "release-1",
  catalog_id: "catalog-1",
  checksum_sha256: "a".repeat(64),
  row_count: 3,
  currency_code: "KGS",
  source_request_hash: "b".repeat(64),
};

const rows = [
  { row_id: "material", ordinal: 0, section: "materials", category: "material", title_ru: "Материал", unit_id: "m2", quantity: "12.5", unit_price: null, amount: null, currency_code: "KGS", procurement_eligible: true, included_in_estimate: true, included_in_procurement: true, ownership_status: "OWNED", row_sha256: "c".repeat(64) },
  { row_id: "labor", ordinal: 1, section: "labor", category: "labor", title_ru: "Работа", unit_id: "m2", quantity: "10", unit_price: null, amount: null, currency_code: "KGS", procurement_eligible: false, included_in_estimate: true, included_in_procurement: false, ownership_status: "OWNED", row_sha256: "d".repeat(64) },
  { row_id: "legacy", ordinal: 2, section: "legacy", category: "legacy", title_ru: "Legacy", unit_id: "item", quantity: "999", unit_price: null, amount: null, currency_code: "KGS", procurement_eligible: true, included_in_estimate: false, included_in_procurement: false, ownership_status: "MIGRATED_UNOWNED_EXCLUDED_FROM_TOTAL", row_sha256: "e".repeat(64) },
];

describe("canonical estimate artifact contract", () => {
  it("selects immutable revision rows once for PDF and procurement", () => {
    const selection = selectCanonicalArtifactRows(rows);
    expect(selection.estimateRows.map((row) => row.row_id)).toEqual(["material", "labor"]);
    expect(selection.procurementRows.map((row) => row.row_id)).toEqual(["material"]);
    expect(canonicalArtifactQuantity(selection.procurementRows[0]?.quantity)).toBe("12,5");
  });

  it("builds the one canonical procurement projection and artifact provenance", () => {
    const selection = selectCanonicalArtifactRows(rows);
    const projection = buildCanonicalProcurementProjection({ revision, procurementRows: selection.procurementRows });
    expect(projection.schemaVersion).toBe("canonical_estimate_procurement_r7");
    expect(projection.rows).toHaveLength(1);
    expect(projection.rows[0]?.quantity).toBe("12.5");
    expect(buildCanonicalArtifactMetadata({
      operation: "procurement",
      renderer: "test",
      revision,
      sourceRowCount: selection.sourceRows.length,
      projectedRowCount: selection.procurementRows.length,
      selectedProcurementRowCount: selection.procurementRows.length,
    })).toMatchObject({ sourceRowCount: 3, projectedRowCount: 1, selectedProcurementRowCount: 1 });
  });
});
