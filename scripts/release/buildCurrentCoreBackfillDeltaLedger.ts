import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { buildCatalogBackfillBatches } from "../estimate/buildCatalogBackfillBatches";

const BASELINE_SHA = "d5b1a35ddddb449828cfbb4a2f0908b49054cd82";
const BASELINE_ARTIFACT_PATH = "data/estimate-catalog/catalog-backfill-batches.json";
const OUTPUT_PATH =
  "artifacts/current-core-remediation/backfill-4222-4127-delta-ledger.json";

type Assignment = ReturnType<
  typeof buildCatalogBackfillBatches
>["template_assignments"][number];

type HistoricalAssignment = {
  template_id: string;
  work_key: string;
  work_family_id: string;
  priority: string;
  readiness_status: string;
  calculator_family_id: string;
  norm_pack_id: string;
};

type HistoricalArtifact = {
  batches: Record<string, { template_count: number }>;
  template_assignments: HistoricalAssignment[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`BACKFILL_BASELINE_STRING_INVALID:${key}`);
  }
  return value;
}

function parseHistoricalAssignment(value: unknown): HistoricalAssignment {
  if (!isRecord(value)) throw new Error("BACKFILL_BASELINE_ASSIGNMENT_INVALID");
  return {
    template_id: requiredString(value, "template_id"),
    work_key: requiredString(value, "work_key"),
    work_family_id: requiredString(value, "work_family_id"),
    priority: requiredString(value, "priority"),
    readiness_status: requiredString(value, "readiness_status"),
    calculator_family_id: requiredString(value, "calculator_family_id"),
    norm_pack_id: requiredString(value, "norm_pack_id"),
  };
}

function parseHistoricalArtifact(text: string): HistoricalArtifact {
  const parsed: unknown = JSON.parse(text);
  if (!isRecord(parsed) || !isRecord(parsed.batches) || !Array.isArray(parsed.template_assignments)) {
    throw new Error("BACKFILL_BASELINE_ARTIFACT_INVALID");
  }
  const batches: HistoricalArtifact["batches"] = {};
  for (const [key, value] of Object.entries(parsed.batches)) {
    if (!isRecord(value) || typeof value.template_count !== "number") {
      throw new Error(`BACKFILL_BASELINE_BATCH_INVALID:${key}`);
    }
    batches[key] = { template_count: value.template_count };
  }
  return {
    batches,
    template_assignments: parsed.template_assignments.map(parseHistoricalAssignment),
  };
}

function gitOutput(args: string[]): string {
  return execFileSync("git", args, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  }).trim();
}

function countDuplicates(values: readonly string[]): number {
  return values.length - new Set(values).size;
}

function oldAssignmentMap(artifact: HistoricalArtifact): Map<string, HistoricalAssignment> {
  return new Map(artifact.template_assignments.map((item) => [item.template_id, item]));
}

function isP1CountDelta(
  oldAssignment: HistoricalAssignment,
  currentAssignment: Assignment,
): boolean {
  return oldAssignment.priority === "P1_HIGH_VOLUME_REPAIR" &&
    currentAssignment.priority !== "P1_HIGH_VOLUME_REPAIR";
}

export function buildCurrentCoreBackfillDeltaLedger() {
  const baselineText = gitOutput([
    "show",
    `${BASELINE_SHA}:${BASELINE_ARTIFACT_PATH}`,
  ]);
  const baseline = parseHistoricalArtifact(baselineText);
  const current = buildCatalogBackfillBatches({ writeFiles: false });
  const oldByTemplate = oldAssignmentMap(baseline);
  const currentByTemplate = new Map(
    current.template_assignments.map((item) => [item.template_id, item]),
  );
  const deltaAssignments = current.template_assignments.filter((item) => {
    const oldAssignment = oldByTemplate.get(item.template_id);
    return oldAssignment ? isP1CountDelta(oldAssignment, item) : false;
  });
  const entries = deltaAssignments.map((item) => {
    const oldAssignment = oldByTemplate.get(item.template_id);
    if (!oldAssignment) throw new Error(`BACKFILL_BASELINE_ENTRY_MISSING:${item.template_id}`);
    const expectedCurrentFamily = item.work_key.startsWith("concrete_foundation_")
      ? "concrete"
      : item.work_key.startsWith("electrical_interior_")
        ? "electrical"
        : null;
    const intended = oldAssignment.work_family_id === "transport_delivery" &&
      expectedCurrentFamily === item.work_family_id;
    return {
      catalogWorkId: item.work_key,
      sourceTemplateId: item.template_id,
      oldClassification: oldAssignment.priority,
      currentClassification: item.priority,
      oldCanonicalOwner: {
        workFamilyId: oldAssignment.work_family_id,
        calculatorFamilyId: oldAssignment.calculator_family_id,
        normPackId: oldAssignment.norm_pack_id,
      },
      currentCanonicalOwner: {
        workFamilyId: item.work_family_id,
        calculatorFamilyId: item.calculator_family_id,
        normPackId: item.norm_pack_id,
      },
      oldRouteCompiler: {
        route: "catalog_family_prefix_fallback",
        compiler: oldAssignment.calculator_family_id,
      },
      currentRouteCompiler: {
        route: "typed_work_key_family_resolution",
        compiler: item.calculator_family_id,
      },
      sourceTemplate: item.template_id,
      reason:
        "The former family resolver matched a generic delivery token before the concrete/electrical semantic owner. The typed work-key owner now wins.",
      reasonCode: "CANONICAL_OWNER_CORRECTION",
      intentional: intended,
      migrationRequired: false,
      migrationDecision:
        "No catalog id or formula payload was deleted. Only the derived batch/family owner changes; new revisions resolve through the typed owner.",
      acceptedFix:
        "Keep the catalogWorkId and template identity; classify by concrete/electrical owner instead of transport_delivery.",
      finalStatus: intended ? "RECLASSIFIED_ACCOUNTED" : "REVIEW_REQUIRED",
      readinessBefore: oldAssignment.readiness_status,
      readinessAfter: item.readiness_status,
    };
  });

  const baselineIds = baseline.template_assignments.map((item) => item.template_id);
  const currentIds = current.template_assignments.map((item) => item.template_id);
  const lostIds = baselineIds.filter((id) => !currentByTemplate.has(id));
  const newIds = currentIds.filter((id) => !oldByTemplate.has(id));
  const blockers = [
    baseline.batches.P1_HIGH_VOLUME_REPAIR?.template_count === 4222
      ? ""
      : "BASELINE_P1_COUNT_NOT_4222",
    current.batches.P1_HIGH_VOLUME_REPAIR.template_count === 4127
      ? ""
      : "CURRENT_P1_COUNT_NOT_4127",
    entries.length === 95 ? "" : `DELTA_ENTRY_COUNT:${entries.length}`,
    entries.every((entry) => entry.intentional) ? "" : "UNINTENTIONAL_DELTA_PRESENT",
    lostIds.length === 0 ? "" : `LOST_IDS:${lostIds.length}`,
    newIds.length === 0 ? "" : `UNEXPECTED_NEW_IDS:${newIds.length}`,
    countDuplicates(baselineIds) === 0 ? "" : "BASELINE_DUPLICATE_TEMPLATE_IDS",
    countDuplicates(currentIds) === 0 ? "" : "CURRENT_DUPLICATE_TEMPLATE_IDS",
    current.template_assignments.every((item) => Boolean(item.priority && item.work_family_id))
      ? ""
      : "UNCLASSIFIED_CURRENT_ASSIGNMENT",
  ].filter(Boolean);

  return {
    schema: "current-core-backfill-4222-4127-delta-ledger-v1",
    generatedAt: new Date().toISOString(),
    source: {
      baselineSha: BASELINE_SHA,
      baselineArtifactPath: BASELINE_ARTIFACT_PATH,
      currentHead: gitOutput(["rev-parse", "HEAD"]),
      currentBuilder: "scripts/estimate/buildCatalogBackfillBatches.ts",
      causalChangeCommit: "9d0de719e7597210f442e7a6c8118e225ff9dfaf",
    },
    counts: {
      baselineP1: baseline.batches.P1_HIGH_VOLUME_REPAIR?.template_count ?? null,
      currentP1: current.batches.P1_HIGH_VOLUME_REPAIR.template_count,
      explainedDelta: entries.length,
      baselineCatalogAssignments: baseline.template_assignments.length,
      currentCatalogAssignments: current.template_assignments.length,
      lostOrUnaccounted: lostIds.length,
      unexpectedNew: newIds.length,
      duplicateOwnership: countDuplicates(currentIds),
      unclassified: current.template_assignments.filter(
        (item) => !item.priority || !item.work_family_id,
      ).length,
    },
    transitionSummary: {
      transportDeliveryToConcrete: entries.filter(
        (entry) => entry.currentCanonicalOwner.workFamilyId === "concrete",
      ).length,
      transportDeliveryToElectrical: entries.filter(
        (entry) => entry.currentCanonicalOwner.workFamilyId === "electrical",
      ).length,
    },
    entries,
    blockers,
    finalStatus: blockers.length === 0
      ? "GREEN_BACKFILL_4222_4127_DELTA_FULLY_ACCOUNTED"
      : "STOP_BACKFILL_4222_4127_DELTA_UNACCOUNTED",
  };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/release/buildCurrentCoreBackfillDeltaLedger.ts")) {
  const ledger = buildCurrentCoreBackfillDeltaLedger();
  const outputPath = path.join(process.cwd(), OUTPUT_PATH);
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    outputPath: OUTPUT_PATH,
    finalStatus: ledger.finalStatus,
    counts: ledger.counts,
    transitionSummary: ledger.transitionSummary,
    blockers: ledger.blockers,
  }, null, 2));
  process.exitCode = ledger.blockers.length === 0 ? 0 : 1;
}
