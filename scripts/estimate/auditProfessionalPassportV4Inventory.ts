import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { professionalEstimatePassportId } from "../../src/lib/estimate/v4/professionalEstimatePassportV4";

type BaseRow = {
  template_id: string; work_key: string; work_family_id: string; category: string;
  work_type: string; localized_name_ru: string; parameter_schema_status?: string;
  formula_status?: string; material_recipe_status?: string; norm_source_status?: string;
  calculator_family_id: string;
};
type ExpandedRow = { template_id: string; work_family_id: string; template_level: string };

const basePath = "data/estimate-templates/estimate-10000-readiness-manifest.json";
const expandedPath = "data/estimate-catalog/expanded-complex/templates.json";
const base = (JSON.parse(readFileSync(basePath, "utf8")) as { templates: BaseRow[] }).templates;
const expanded = JSON.parse(readFileSync(expandedPath, "utf8")) as ExpandedRow[];
const scopePattern = /_(standard|small_area|large_area|wet_zone|technical_room)$/;
const branch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
const sha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const timestamp = new Date().toISOString();
const root = path.resolve("artifacts/professional-passport-v4");
const sourceInventory = [basePath, expandedPath];

const ledger = [
  ...base.map((row) => ({
    catalogWorkId: row.work_key,
    professionalEstimatePassportId: professionalEstimatePassportId(row.work_key),
    domain: row.work_family_id,
    workType: row.work_type,
    workSubtype: row.category,
    resultUnit: null,
    currentEngine: row.calculator_family_id,
    currentTemplateId: row.template_id,
    targetCalculationStrategyId: row.calculator_family_id,
    currentReadiness: "TEMPLATE_PRESENT_PROFESSIONAL_TRUTH_UNVERIFIED",
    missingP0: row.parameter_schema_status !== "WORK_SPECIFIC",
    missingFormula: row.formula_status !== "PRESENT",
    missingBoq: row.material_recipe_status !== "PRESENT",
    missingSources: row.norm_source_status !== "READY_SOURCE_BACKED",
    missingGolden: true,
    wrongUnitRisk: true,
    genericModelRisk: true,
    migrationWave: null,
    blocker: scopePattern.test(row.work_key) ? "SYNTHETIC_SCOPE_ID" : "AUTHORITATIVE_REAL_WORK_NOT_PROVEN",
    domainReviewRequired: true,
    inventoryKind: "base_10000"
  })),
  ...expanded.map((row) => {
    const compatibilityId = `expanded-template:${row.template_id}`;
    return {
      catalogWorkId: compatibilityId,
      professionalEstimatePassportId: professionalEstimatePassportId(compatibilityId),
      domain: row.work_family_id,
      workType: row.template_level,
      workSubtype: "expanded_complex_template",
      resultUnit: null,
      currentEngine: row.work_family_id,
      currentTemplateId: row.template_id,
      targetCalculationStrategyId: `expanded:${row.work_family_id}`,
      currentReadiness: "TEMPLATE_PRESENT_CATALOG_WORK_ID_MISSING",
      missingP0: true, missingFormula: true, missingBoq: true, missingSources: true,
      missingGolden: true, wrongUnitRisk: true, genericModelRisk: true, migrationWave: null,
      blocker: "CATALOG_WORK_ID_MISSING",
      domainReviewRequired: true,
      inventoryKind: "expanded_complex_1610"
    };
  })
];

const current35 = base.filter((row) => row.work_key.startsWith("paving_roads_landscape_interior_asphalt_"));
const counts = {
  inventory_total: ledger.length,
  base_templates: base.length,
  expanded_templates: expanded.length,
  unique_catalog_ids: new Set(ledger.map((row) => row.catalogWorkId)).size,
  unique_passport_ids: new Set(ledger.map((row) => row.professionalEstimatePassportId)).size,
  synthetic_scope_ids: base.filter((row) => scopePattern.test(row.work_key)).length,
  expanded_templates_missing_catalog_work_id: expanded.length,
  current_wave_a_ids: current35.length,
  current_wave_a_synthetic_ids: current35.filter((row) => scopePattern.test(row.work_key)).length,
  proven_real_distinct_wave_a_works: 0
};
const blockers = [
  "The 11,610 corpus is 10,000 generated base templates plus 1,610 expanded templates, not proof of 11,610 real works.",
  `${counts.synthetic_scope_ids} base IDs encode generated scope variants.`,
  `${counts.expanded_templates_missing_catalog_work_id} expanded templates have no catalogWorkId.`,
  "All current 35 Wave A IDs are synthetic operation+scope combinations."
];
const envelope = (payload: unknown) => ({
  branch, exact_sha: sha, timestamp, source_inventory: sourceInventory,
  counts, blockers, fake_green_claimed: false, payload
});
mkdirSync(root, { recursive: true });
copyFileSync("data/estimate-catalog/professional-estimate-passport-v4.schema.json", path.join(root, "professional-estimate-passport-v4.schema.json"));
copyFileSync("docs/estimate/professional-estimate-passport-v4-contract.md", path.join(root, "professional-estimate-passport-v4-contract.md"));
writeFileSync(path.join(root, "estimate-11610-authoritative-inventory-audit.json"), JSON.stringify(envelope({ status: "STOP_ESTIMATE_V4_AUTHORITATIVE_11610_INVENTORY_NOT_PROVEN_NO_RELEASE" }), null, 2));
writeFileSync(path.join(root, "estimate-11610-migration-ledger.json"), JSON.stringify(envelope(ledger), null, 2));
writeFileSync(path.join(root, "roadworks-wave-a-current-35-origin-audit.json"), JSON.stringify(envelope(current35.map((row) => ({ catalogWorkId: row.work_key, classification: "SYNTHETIC_SCOPE_ID" }))), null, 2));
writeFileSync(path.join(root, "roadworks-wave-a-35-distinct-work-inventory.json"), JSON.stringify(envelope([]), null, 2));
writeFileSync(path.join(root, "legacy-synthetic-scope-compatibility-map.json"), JSON.stringify(envelope(current35.map((row) => ({
  legacySyntheticId: row.work_key,
  requestedCatalogWorkId: row.work_key,
  calculationStrategyId: row.calculator_family_id,
  scopePresetId: row.work_key.match(scopePattern)?.[1] ?? null,
  replacementRealWorkId: null,
  migrationStatus: "REQUIRES_USER_RESELECTION"
}))), null, 2));
writeFileSync(path.join(root, "passport-strategy-ownership-matrix.json"), JSON.stringify(envelope(ledger.map((row) => ({
  catalogWorkId: row.catalogWorkId,
  passportId: row.professionalEstimatePassportId,
  calculationStrategyId: row.targetCalculationStrategyId
}))), null, 2));
writeFileSync(path.join(root, "phase-final-acceptance.md"), `# Phase final acceptance\n\nSHA: ${sha}\n\nSTOP_ESTIMATE_V4_AUTHORITATIVE_11610_INVENTORY_NOT_PROVEN_NO_RELEASE\n\nFake green claimed: false\n`);
console.info(JSON.stringify({ counts, blockers, fake_green_claimed: false }, null, 2));
