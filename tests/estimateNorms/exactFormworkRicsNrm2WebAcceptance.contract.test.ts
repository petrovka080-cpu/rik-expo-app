import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("exact physical norm Web acceptance harness", () => {
  const source = readFileSync(
    resolve("scripts/dev/runExactFormworkRicsNrm2WebAcceptance.ts"),
    "utf8",
  );

  test("uses the prepared successor and canonical revision/artifact APIs", () => {
    expect(source).toContain('"8791b75f-683f-5e72-a56a-54abc2f82379"');
    expect(source).toContain('"0dab7419-7eb5-5f0c-bdd6-57a39fcd6ee7"');
    expect(source).toContain('PROFILE_ID === "strip-foundation-nrmca-cip31"');
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
    expect(source).toContain("SENSITIVITY_TARGET_QUANTITY");
    expect(source).toContain("EXACT_WORK_NOT_FOUND_BY_PROFESSIONAL_NAME");
    expect(source).toContain("input.fill(SEARCH_QUERY)");
    expect(source).toContain("SELECTED_DETAILS.join");
    expect(source).toContain("WEB_PREPARE_BUTTON");
    expect(source).toContain("prepareButton.click()");
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
