import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { canonicalEstimateStableJson } from "../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism";
import {
  DRYWALL_DOMAIN_COMPLETION_CATALOG_IDS_V7,
  drywallDomainExpectedCandidatesV7,
} from "../../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallDomainCompletionProfessionalV7";

const MASTER = resolve("C:/Users/User/Downloads/MASTER_EXECUTION_TZ_R5_CANONICAL_MONOLITH_GREEN_AND_CLEANUP_RU (8).md");
const MASTER_SHA256 = "9402f9cb2b9e0891ea1eb0179f4c4f5832c0b5f4d23e98121667095c9bc285c8";
const OUTPUT = resolve(".release-runtime/real-professional-estimates-r4/evidence/11-batch004-r56/discovery");
const REPORT = resolve(OUTPUT, "BATCH004_R56_PREDECESSOR_CONTENT_AUDIT.json");
const VERDICTS = resolve(OUTPUT, "BATCH004_R56_PREDECESSOR_CATALOG_VERDICTS.jsonl");
const SOURCE_FILES = [
  "src/lib/estimate/v4/domains/interiorFinishesComplete/drywallDomainCompletionProfessionalV7.ts",
  "src/lib/estimate/v4/domains/interiorFinishesComplete/domainPackage.ts",
  "src/lib/estimate/v4/domains/interiorFinishesComplete/inventory.ts",
] as const;

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function atomicWrite(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, content, "utf8");
  renameSync(temporary, path);
}

function atomicJson(path: string, value: unknown): void {
  atomicWrite(path, `${JSON.stringify(value, null, 2)}\n`);
}

function parseCatalogId(catalogId: string): { family: string; operation: string; variant: string; group: string } {
  const match = catalogId.match(/^drywall_ceiling_interior_(.+)_(prepare|frame|align|insulate|clad|finish_joint|repair|install)_(large_area|small_area|standard|technical_room|wet_zone|high_load)$/u);
  if (!match) throw new Error(`BATCH004_R56_DISCOVERY_ID_PARSE_RED:${catalogId}`);
  return {
    family: match[1],
    operation: match[2].toUpperCase(),
    variant: match[3],
    group: `${match[1]}|${match[2].toUpperCase()}`,
  };
}

const DOCUMENT_OR_INTERNAL = /(?:journal|record|register|photo|act|handover|review|coordination|control|measurement|briefing|survey)/iu;
const DELIVERY_FRAGMENT = /(?:delivery|loading|unloading|movement|lift|storage|mobilization)/iu;
const WASTE_FRAGMENT = /(?:waste_collection|waste_sorting|waste_loading|waste_haul|waste_receiver)/u;
const GENERIC_EXECUTION = /(?:installer_labor|specialist_labor|hand_tools|hand_detail|operation)$/iu;

if (sha256(readFileSync(MASTER)) !== MASTER_SHA256) throw new Error("BATCH004_R56_DISCOVERY_MASTER_DRIFT");
if (DRYWALL_DOMAIN_COMPLETION_CATALOG_IDS_V7.length !== 393) throw new Error("BATCH004_R56_DISCOVERY_DENOMINATOR_RED");

const prevalence = new Map<string, number>();
const verdicts = DRYWALL_DOMAIN_COMPLETION_CATALOG_IDS_V7.map((catalogId) => {
  const identity = parseCatalogId(catalogId);
  const rows = drywallDomainExpectedCandidatesV7(catalogId);
  for (const row of rows) prevalence.set(row.candidateId, (prevalence.get(row.candidateId) ?? 0) + 1);
  const documentationRows = rows.filter((row) => row.category === "documentation");
  const genericHourRows = rows.filter((row) => row.unitId === "man_hour" || row.unitId === "machine_hour");
  const internalControlRows = rows.filter((row) => DOCUMENT_OR_INTERNAL.test(row.candidateId));
  const deliveryFragments = rows.filter((row) => DELIVERY_FRAGMENT.test(row.candidateId));
  const wasteFragments = rows.filter((row) => WASTE_FRAGMENT.test(row.candidateId));
  const genericExecutionRows = rows.filter((row) => GENERIC_EXECUTION.test(row.candidateId));
  const defectCount = documentationRows.length + genericHourRows.length + internalControlRows.length
    + Math.max(0, deliveryFragments.length - 1) + Math.max(0, wasteFragments.length - 1)
    + genericExecutionRows.length;
  return {
    catalogId,
    ...identity,
    predecessorRowCount: rows.length,
    counters: {
      documentationRows: documentationRows.length,
      genericHourRows: genericHourRows.length,
      internalControlRows: internalControlRows.length,
      deliveryFragments: deliveryFragments.length,
      duplicateDeliveryFragments: Math.max(0, deliveryFragments.length - 1),
      wasteFragments: wasteFragments.length,
      duplicateWasteFragments: Math.max(0, wasteFragments.length - 1),
      genericExecutionRows: genericExecutionRows.length,
      defectCount,
    },
    examples: {
      documentation: documentationRows.map((row) => row.candidateId),
      genericHours: genericHourRows.map((row) => `${row.candidateId}:${row.unitId}`),
      internalControl: internalControlRows.map((row) => row.candidateId),
      delivery: deliveryFragments.map((row) => row.candidateId),
      waste: wasteFragments.map((row) => row.candidateId),
    },
    status: defectCount === 0 ? "GREEN_PREDECESSOR_CONTENT" : "RED_CONTENT_NOISE_SUCCESSOR_REQUIRED",
  };
});

const sourceFiles = SOURCE_FILES.map((path) => ({ path, sha256: sha256(readFileSync(resolve(path))) }));
const repeatedRows = [...prevalence.entries()]
  .filter(([, count]) => count >= 300)
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([candidateId, count]) => ({ candidateId, definitionCount: count }));
const groups = [...new Set(verdicts.map((entry) => entry.group))].sort();
const totals = verdicts.reduce((accumulator, entry) => ({
  rows: accumulator.rows + entry.predecessorRowCount,
  documentationRows: accumulator.documentationRows + entry.counters.documentationRows,
  genericHourRows: accumulator.genericHourRows + entry.counters.genericHourRows,
  internalControlRows: accumulator.internalControlRows + entry.counters.internalControlRows,
  duplicateDeliveryFragments: accumulator.duplicateDeliveryFragments + entry.counters.duplicateDeliveryFragments,
  duplicateWasteFragments: accumulator.duplicateWasteFragments + entry.counters.duplicateWasteFragments,
  genericExecutionRows: accumulator.genericExecutionRows + entry.counters.genericExecutionRows,
  defectCount: accumulator.defectCount + entry.counters.defectCount,
}), {
  rows: 0,
  documentationRows: 0,
  genericHourRows: 0,
  internalControlRows: 0,
  duplicateDeliveryFragments: 0,
  duplicateWasteFragments: 0,
  genericExecutionRows: 0,
  defectCount: 0,
});
const reportWithoutHash = {
  contract: "real-professional-estimates-r5.6.batch004-predecessor-content-audit.v1",
  generatedAt: new Date().toISOString(),
  masterSha256: MASTER_SHA256,
  sourceFiles,
  sourceStateId: sha256(canonicalEstimateStableJson(sourceFiles)),
  denominator: {
    definitions: verdicts.length,
    familyOperationGroups: groups.length,
    uniqueCatalogIds: new Set(verdicts.map((entry) => entry.catalogId)).size,
  },
  totals,
  repeatedRows,
  predecessorAccepted: false,
  requiredAction: "BUILD_R56_CANONICAL_SUCCESSOR_ON_SHARED_CORE",
  forbiddenShortcut: "DO_NOT_ACCEPT_OR_REPLAY_V7_AS_GREEN",
  verdicts,
  releasePerformed: false,
  deployPerformed: false,
  otaPerformed: false,
  mergePerformed: false,
  pushPerformed: false,
  batch009Performed: false,
  status: "RED_R56_BATCH004_PREDECESSOR_CONTENT_NOISE_SUCCESSOR_REQUIRED",
};
const report = { ...reportWithoutHash, payloadSha256: sha256(canonicalEstimateStableJson(reportWithoutHash)) };
atomicJson(REPORT, report);
atomicWrite(VERDICTS, `${verdicts.map((entry) => JSON.stringify(entry)).join("\n")}\n`);
process.stdout.write(`${JSON.stringify({
  status: report.status,
  definitions: verdicts.length,
  groups: groups.length,
  totals,
  repeatedRows: repeatedRows.length,
  report: REPORT,
  reportSha256: sha256(readFileSync(REPORT)),
}, null, 2)}\n`);
