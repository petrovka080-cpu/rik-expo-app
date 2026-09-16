import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("exact physical norm Web acceptance harness", () => {
  const source = readFileSync(
    resolve("scripts/dev/runExactFormworkRicsNrm2WebAcceptance.ts"),
    "utf8",
  );

  test("uses the prepared successor and canonical revision/artifact APIs", () => {
    expect(source).toContain('"01f008d7-e290-5237-bf6b-c71c829c04d2"');
    expect(source).toContain('"db513288-1307-5cd8-9bbe-e625f2841074"');
    expect(source).toContain('PROFILE_ID === "strip-foundation-nrmca-cip31"');
    expect(source).toContain('PROFILE_ID === "bia-tn10-masonry"');
    expect(source).toContain('PROFILE_ID === "formwork-rics-nrm2-wet-zone"');
    expect(source).toContain('PROFILE_ID === "formwork-rics-nrm2-strip-foundation-wet-zone"');
    expect(source).toContain('PROFILE_ID === "formwork-rics-nrm2-slab-foundation-wet-zone"');
    expect(source).toContain('PROFILE_ID === "formwork-rics-nrm2-pile-cap-wet-zone"');
    expect(source).toContain('argValue("--release-id")');
    expect(source).toContain('argValue("--search-release-id")');
    expect(source).toContain('argValue("--definition-id")');
    expect(source).toContain('argValue("--catalog-id")');
    expect(source).toContain('argValue("--search-query")');
    expect(source).toContain('argValue("--output-root")');
    expect(source).toContain('"8909e3eb-e893-5592-b47e-2781396fb90d"');
    expect(source).toContain('"a525282e-2495-5a27-b327-81a38a7d59b3"');
    expect(source).toContain('"7237aa95-be0f-5b6d-a638-5f06b9381749"');
    expect(source).toContain('"d4f46211-551f-5d3b-a98d-9c359c9f2443"');
    expect(source).toContain('"1251ce4e-d68b-506e-9021-2ec392d3a3c6"');
    expect(source).toContain('"a15d0987-4289-5ba6-8780-d7c1b0e7d639"');
    expect(source).toContain('"f99c72c6-9098-560a-a96e-4de76e066ece"');
    expect(source).toContain('"cdda031e-ac2e-55c2-b2d9-7c3ea8185d74"');
    expect(source).toContain('"3deb0263-cf34-54ec-8953-a71be36ebd76"');
    expect(source).toContain('"cf7f3504-3b30-5cc9-9230-114b409f9ddb"');
    expect(source).toContain('"16217704-4a47-5138-a19b-dae1e8301e82"');
    expect(source).toContain('"1bc4c42c-dd69-5534-af66-7f9e2e300830"');
    expect(source).toContain('"jobs/recalculate"');
    expect(source).toContain("artifacts/${kind}");
    expect(source).toContain("request-estimate-parameters-toggle");
    expect(source).toContain("WEB_PREPARE_REQUIRED_HIDDEN_API_RECALCULATION");
    expect(source).toContain("assertPreliminaryScopeTruth");
    expect(source).toContain("FORMWORK_SCOPE_GAP_TRUTH_RED");
    expect(source).toContain("DATABASE_PRELIMINARY_SCOPE_PARITY_RED");
  });

  test("accepts quantity sensitivity while keeping price and procurement truthful", () => {
    expect(source).toContain("UNKNOWN_PRICE_WAS_ZEROED");
    expect(source).toContain('grandTotalStatus === "PARTIAL_NEEDS_PRICE"');
    expect(source).toContain("selectedProcurementRowCount) === 0");
    expect(source).toContain("selectedProcurementRowCount) > 0");
    expect(source).toContain("concrete_order_allowance_percent: 2");
    expect(source).toContain('product_profile_id: "method-profile:nrmca-cip31:ready-mix-order:v1"');
    expect(source).toContain("SENSITIVITY_TARGET_QUANTITY");
    expect(source).toContain("EXACT_WORK_NOT_FOUND_BY_PROFESSIONAL_NAME");
    expect(source).toContain("input.fill(SEARCH_QUERY)");
    expect(source).toContain('responseUrl.searchParams.get("query") === SEARCH_QUERY');
    expect(source).toContain("SELECTED_DETAILS.join");
    expect(source).toContain('estimator_approval_reference: "EST-FW-149."');
    expect(source).toContain("WEB_PREPARE_BUTTON");
    expect(source).toContain("prepareButton.click()");
    expect(source).toContain("MASONRY_BRICK_PROCUREMENT_SPLIT_RED");
    expect(source).toContain("MASONRY_MORTAR_PROCUREMENT_SPLIT_RED");
    expect(source).toContain("GROSS_M2=110,OPENINGS_M2=10,NET_M2=100");
    expect(source).toContain("GREEN_EXACT_BIA_TN10_MASONRY_FULL_APPLICABLE_WEB_BACKEND_PDF_PROCUREMENT_HISTORY");
    expect(source).toContain("rows.length === 18");
    expect(source).toContain("Number(procurement.projection?.selectedRowCount) === 10");
    expect(source).toContain('["wall_layout_length_m", "44"]');
    expect(source).toContain('parameterCount: 60');
    expect(source).toContain('resourceDefinitionCount: 23');
    expect(source).toContain("GREEN_EXACT_FORMWORK_RICS_NRM2_WET_ZONE_MEASUREMENT_ONLY_PRELIMINARY_WEB_BACKEND_PDF_PROCUREMENT_HISTORY");
    expect(source).toContain("GREEN_EXACT_FORMWORK_RICS_NRM2_STRIP_FOUNDATION_WET_ZONE_MEASUREMENT_ONLY_PRELIMINARY_WEB_BACKEND_PDF_PROCUREMENT_HISTORY");
    expect(source).toContain('element_type: "STRIP_FOUNDATION"');
    expect(source).toContain('single_or_double_sided_scope: "DOUBLE_SIDED"');
    expect(source).toContain("GREEN_EXACT_FORMWORK_RICS_NRM2_SLAB_FOUNDATION_WET_ZONE_MEASUREMENT_ONLY_PRELIMINARY_WEB_BACKEND_PDF_PROCUREMENT_HISTORY");
    expect(source).toContain('element_type: "SLAB_FOUNDATION"');
    expect(source).toContain("GREEN_EXACT_FORMWORK_RICS_NRM2_PILE_CAP_WET_ZONE_MEASUREMENT_ONLY_PRELIMINARY_WEB_BACKEND_PDF_PROCUREMENT_HISTORY");
    expect(source).toContain('element_type: "PILE_CAP"');
    expect(source).toContain('estimateLevel: "PRELIMINARY_QUANTITY_BOQ"');
    expect(source).toContain('scopeMode: "MEASUREMENT_ONLY"');
    expect(source).toContain("priorOneRowFullScopeAcceptanceUsable: false");
    expect(source).toContain("expectedPdfProjectedRowCount");
    expect(source).not.toContain("CANONICAL_API_AFTER_WEB_SELECTION");
  });

  test("cannot activate, deploy, release, or perform OTA", () => {
    expect(source).not.toMatch(/status\s*=\s*['"]active['"]/u);
    expect(source).toContain("activationPerformed: false");
    expect(source).toContain("deployPerformed: false");
    expect(source).toContain("releasePerformed: false");
    expect(source).toContain("otaPerformed: false");
  });
});
