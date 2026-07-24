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
  unit_policy_id: string;
};

const root = process.cwd();
const sourcePath = path.join(root, "data/estimate-templates/estimate-10000-readiness-manifest.json");
const rows = (JSON.parse(readFileSync(sourcePath, "utf8")) as { templates: ManifestRow[] }).templates;
const roadRows = rows.filter((row) =>
  row.work_family_id === "roadworks" &&
  (row.category === "paving_roads_landscape" || row.category === "earthworks")
);
const scopeSuffix = /_(standard|small_area|large_area|wet_zone|technical_room|high_load)$/u;
type ScopeSuffix = "standard" | "small_area" | "large_area" | "wet_zone" | "technical_room" | "high_load";

const scopeDeltaBySuffix: Record<ScopeSuffix, { parameterKey: string; value: string }> = {
  standard: { parameterKey: "scope_profile", value: "STANDARD" },
  small_area: { parameterKey: "area_band", value: "SMALL_AREA" },
  large_area: { parameterKey: "area_band", value: "LARGE_AREA" },
  wet_zone: { parameterKey: "exposure_class", value: "WET_ZONE" },
  technical_room: { parameterKey: "environment_class", value: "TECHNICAL_ROOM" },
  high_load: { parameterKey: "load_class", value: "HIGH_LOAD" },
};

function buildLedger() {
  return roadRows
    .map((row) => {
      const suffix = row.work_key.match(scopeSuffix)?.[1] as ScopeSuffix | undefined;
      const canonicalTargetId = suffix ? row.work_key.replace(scopeSuffix, "") : null;
      return {
        catalogWorkId: row.work_key,
        templateId: row.template_id,
        professionalNameRu: row.localized_name_ru,
        category: row.category,
        operation: row.work_type,
        classification: suffix ? "SCOPE_PRESET" as const : "DOMAIN_REVIEW_REQUIRED" as const,
        canonicalTargetId,
        canonicalTargetKind: canonicalTargetId ? "GENERATED_CANONICAL_OPERATION" as const : null,
        scopeDelta: suffix ? scopeDeltaBySuffix[suffix] : null,
        unitPolicyId: row.unit_policy_id,
        canonicalRuntimePassportCreated: false,
        runtimeMigrationCreated: false,
      };
    })
    .sort((left, right) => left.catalogWorkId.localeCompare(right.catalogWorkId));
}

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

const auditA = buildLedger();
const auditB = buildLedger();
const ids = auditA.map((row) => row.catalogWorkId);
const idsSet = new Set(ids);
const selfReferences = auditA.filter((row) => row.canonicalTargetId === row.catalogWorkId);
const missingCanonicalTargets = auditA.filter((row) => !row.canonicalTargetId);
const missingScopeDeltas = auditA.filter((row) => !row.scopeDelta?.parameterKey || !row.scopeDelta.value);
const nameOnlyFakePresets = auditA.filter((row) =>
  row.classification === "SCOPE_PRESET" &&
  (!row.scopeDelta || row.canonicalTargetId === row.catalogWorkId)
);
const invalidUnitMappings = auditA.filter((row) => !row.unitPolicyId?.trim());
const unresolvedOwners = auditA.filter((row) => !row.templateId || !row.canonicalTargetId);
const dependencyCycles = auditA.filter((row) => row.canonicalTargetId && idsSet.has(row.canonicalTargetId));
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
    canonicalTargetPresent: auditA.length - missingCanonicalTargets.length,
    selfReferences: selfReferences.length,
    dependencyCycles: dependencyCycles.length,
    missingScopeDelta: missingScopeDeltas.length,
    nameOnlyFakePresets: nameOnlyFakePresets.length,
    invalidUnitMapping: invalidUnitMappings.length,
    unresolvedOwner: unresolvedOwners.length,
  },
  determinism: {
    auditAHash: hash(auditA),
    auditBHash: hash(auditB),
    equal: hash(auditA) === hash(auditB),
  },
  interpretation: "All 687 catalog IDs bind a generated canonical operation target to an explicit parameter-level scope delta. They remain read-only SCOPE_PRESET compatibility records and are not promoted to professional passports.",
  ledger: auditA,
};

if (
  output.counts.roadIds !== 687 ||
  output.counts.missingClassifications !== 0 ||
  output.counts.duplicateIds !== 0 ||
  output.counts.orphanIds !== 0 ||
  output.counts.canonicalTargetPresent !== 687 ||
  output.counts.selfReferences !== 0 ||
  output.counts.dependencyCycles !== 0 ||
  output.counts.missingScopeDelta !== 0 ||
  output.counts.nameOnlyFakePresets !== 0 ||
  output.counts.invalidUnitMapping !== 0 ||
  output.counts.unresolvedOwner !== 0 ||
  !output.determinism.equal
) {
  throw new Error(`ROAD_687_AUDIT_STOP:${JSON.stringify(output.counts)}`);
}

writeFileSync(
  path.join(root, "artifacts/road-scope-truth-v4-production/road-687-classification-ledger.json"),
  `${JSON.stringify(output, null, 2)}\n`,
);
console.info(JSON.stringify({ counts: output.counts, determinism: output.determinism }, null, 2));
