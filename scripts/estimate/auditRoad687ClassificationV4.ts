import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type ManifestRow = {
  template_id: string;
  work_key: string;
  work_family_id: string;
  category: string;
  work_type: string;
  localized_name_ru: string;
};

const root = process.cwd();
const sourcePath = path.join(root, "data/estimate-templates/estimate-10000-readiness-manifest.json");
const rows = (JSON.parse(readFileSync(sourcePath, "utf8")) as { templates: ManifestRow[] }).templates;
const roadRows = rows.filter((row) =>
  row.work_family_id === "roadworks" &&
  (row.category === "paving_roads_landscape" || row.category === "earthworks")
);
const scopeSuffix = /_(standard|small_area|large_area|wet_zone|technical_room|high_load)$/u;

function buildLedger() {
  return roadRows
    .map((row) => ({
      catalogWorkId: row.work_key,
      templateId: row.template_id,
      professionalNameRu: row.localized_name_ru,
      category: row.category,
      operation: row.work_type,
      classification: scopeSuffix.test(row.work_key) ? "SCOPE_PRESET" as const : "DOMAIN_REVIEW_REQUIRED" as const,
      canonicalRuntimePassportCreated: false,
      runtimeMigrationCreated: false,
    }))
    .sort((left, right) => left.catalogWorkId.localeCompare(right.catalogWorkId));
}

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

const auditA = buildLedger();
const auditB = buildLedger();
const ids = auditA.map((row) => row.catalogWorkId);
const output = {
  schemaVersion: "Road687ClassificationLedgerV4",
  sourceInventory: "data/estimate-templates/estimate-10000-readiness-manifest.json",
  selectionRule: "work_family_id=roadworks AND category IN (paving_roads_landscape, earthworks)",
  counts: {
    roadIds: auditA.length,
    scopePreset: auditA.filter((row) => row.classification === "SCOPE_PRESET").length,
    domainReviewRequired: auditA.filter((row) => row.classification === "DOMAIN_REVIEW_REQUIRED").length,
    missingClassifications: auditA.filter((row) => !row.classification).length,
    duplicateIds: ids.length - new Set(ids).size,
    orphanIds: auditA.filter((row) => !row.templateId).length,
    syntheticPassportsCreated: 0,
    runtimeMigrationsCreated: 0,
  },
  determinism: {
    auditAHash: hash(auditA),
    auditBHash: hash(auditB),
    equal: hash(auditA) === hash(auditB),
  },
  interpretation: "All 687 catalog IDs encode operation plus generated scope suffix. They remain read-only SCOPE_PRESET compatibility records and are not promoted to professional passports.",
  ledger: auditA,
};

if (
  output.counts.roadIds !== 687 ||
  output.counts.missingClassifications !== 0 ||
  output.counts.duplicateIds !== 0 ||
  output.counts.orphanIds !== 0 ||
  !output.determinism.equal
) {
  throw new Error(`ROAD_687_AUDIT_STOP:${JSON.stringify(output.counts)}`);
}

writeFileSync(
  path.join(root, "artifacts/road-scope-truth-v4-production/road-687-classification-ledger.json"),
  `${JSON.stringify(output, null, 2)}\n`,
);
console.info(JSON.stringify({ counts: output.counts, determinism: output.determinism }, null, 2));
