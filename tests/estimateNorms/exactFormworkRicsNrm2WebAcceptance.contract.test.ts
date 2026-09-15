import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("exact physical norm Web acceptance harness", () => {
  const source = readFileSync(
    resolve("scripts/dev/runExactFormworkRicsNrm2WebAcceptance.ts"),
    "utf8",
  );

  test("uses the prepared successor and canonical revision/artifact APIs", () => {
    expect(source).toContain('"8791b75f-683f-5e72-a56a-54abc2f82379"');
    expect(source).toContain('"320b582e-5a6d-5354-b3bf-f801e4490303"');
    expect(source).toContain('PROFILE_ID === "strip-foundation-nrmca-cip31"');
    expect(source).toContain('PROFILE_ID === "bia-tn10-masonry"');
    expect(source).toContain('PROFILE_ID === "formwork-rics-nrm2-wet-zone"');
    expect(source).toContain('"c7dc256f-52fb-55ba-9aad-e9f6b961303a"');
    expect(source).toContain('"8521574b-e7e1-583c-a2c6-4117147c4c62"');
    expect(source).toContain('"eba96ed6-9f4d-51c3-87a7-d6ff08b11982"');
    expect(source).toContain('"26079b08-6bfe-55fc-a436-baadd734f024"');
    expect(source).toContain('"jobs/recalculate"');
    expect(source).toContain("artifacts/${kind}");
    expect(source).toContain("request-estimate-parameters-toggle");
    expect(source).toContain("WEB_PREPARE_REQUIRED_HIDDEN_API_RECALCULATION");
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
    expect(source).toContain("SELECTED_DETAILS.join");
    expect(source).toContain("WEB_PREPARE_BUTTON");
    expect(source).toContain("prepareButton.click()");
    expect(source).toContain("MASONRY_BRICK_PROCUREMENT_SPLIT_RED");
    expect(source).toContain("MASONRY_MORTAR_PROCUREMENT_SPLIT_RED");
    expect(source).toContain("GROSS_M2=110,OPENINGS_M2=10,NET_M2=100");
    expect(source).toContain("GREEN_EXACT_BIA_TN10_MASONRY_WEB_BACKEND_PDF_PROCUREMENT_HISTORY");
    expect(source).toContain("GREEN_EXACT_FORMWORK_RICS_NRM2_WET_ZONE_WEB_BACKEND_PDF_PROCUREMENT_HISTORY");
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
