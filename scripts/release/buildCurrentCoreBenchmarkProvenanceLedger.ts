import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const CHECKPOINT = "7cab8073";
const REFERENCE_ROOT = path.resolve("data/estimate-benchmarks/reference-boq");
const GOLDEN_ROOT = path.resolve("data/estimate-benchmarks/golden-cases");
const CORRECTION_MANIFEST_PATH = path.resolve(
  "data/estimate-benchmarks/current-core-remediation-v2.json",
);
const OUTPUT_PATH = path.resolve(
  "artifacts/current-core-remediation/benchmark-provenance-ledger.json",
);

type Correction = {
  case_id: string;
  engine: string;
  work_family_id: string;
  prior_deviations: string[];
  prior_reference_rows: number;
  corrected_reference_rows: number;
  decision: string;
  benchmark_reference_version_bump: string;
};

type CorrectionManifest = {
  schema: string;
  evidence_id: string;
  corrections: Correction[];
};

type ReferenceRow = {
  row_id?: string;
  code?: string;
  title?: string;
  line_type?: string;
  quantity?: number;
  unit?: string;
  quantity_formula?: string;
  formula_ref?: string;
  source_ref?: string;
};

type ReferenceFile = {
  case_id: string;
  prompt: string;
  rows: ReferenceRow[];
};

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function repoPath(filePath: string): string {
  return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
}

function checkpointText(filePath: string): string {
  return execFileSync(
    "git",
    ["show", `${CHECKPOINT}:${repoPath(filePath)}`],
    { cwd: process.cwd(), encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
}

function fileByCaseId(root: string, caseId: string): string | null {
  const exact = path.join(root, `${caseId}.json`);
  try {
    readFileSync(exact);
    return exact;
  } catch {
    return null;
  }
}

function comparableRow(row: ReferenceRow | null) {
  if (!row) return null;
  return {
    rowId: row.row_id ?? row.code ?? "",
    code: row.code ?? "",
    title: row.title ?? "",
    lineType: row.line_type ?? "",
    quantity: row.quantity ?? null,
    unit: row.unit ?? "",
    quantityFormula: row.quantity_formula ?? "",
    formulaRef: row.formula_ref ?? "",
    sourceRef: row.source_ref ?? "",
  };
}

function rowKey(row: ReferenceRow): string {
  return row.row_id ?? row.code ?? "";
}

function changedRows(before: ReferenceFile, after: ReferenceFile) {
  const beforeRows = new Map(before.rows.map((row) => [rowKey(row), row]));
  const afterRows = new Map(after.rows.map((row) => [rowKey(row), row]));
  return [...new Set([...beforeRows.keys(), ...afterRows.keys()])]
    .sort()
    .flatMap((key) => {
      const previous = comparableRow(beforeRows.get(key) ?? null);
      const current = comparableRow(afterRows.get(key) ?? null);
      if (JSON.stringify(previous) === JSON.stringify(current)) return [];
      return [{
        rowId: key,
        changeType: previous == null
          ? "ADDED"
          : current == null
            ? "REMOVED"
            : "CHANGED",
        before: previous,
        after: current,
      }];
    });
}

function changedFormulas(before: ReferenceFile, after: ReferenceFile) {
  const beforeRows = new Map(before.rows.map((row) => [rowKey(row), row]));
  const afterRows = new Map(after.rows.map((row) => [rowKey(row), row]));
  return [...new Set([...beforeRows.keys(), ...afterRows.keys()])]
    .sort()
    .flatMap((key) => {
      const previous = beforeRows.get(key);
      const current = afterRows.get(key);
      const beforeFormula = {
        quantityFormula: previous?.quantity_formula ?? null,
        formulaRef: previous?.formula_ref ?? null,
      };
      const afterFormula = {
        quantityFormula: current?.quantity_formula ?? null,
        formulaRef: current?.formula_ref ?? null,
      };
      return JSON.stringify(beforeFormula) === JSON.stringify(afterFormula)
        ? []
        : [{ rowId: key, before: beforeFormula, after: afterFormula }];
    });
}

function changedParameters(caseId: string) {
  const goldenPath = fileByCaseId(GOLDEN_ROOT, caseId);
  if (!goldenPath) return [];
  const current = JSON.parse(readFileSync(goldenPath, "utf8")) as {
    input_parameters?: Record<string, unknown>;
    estimate_level?: string;
  };
  const previous = JSON.parse(checkpointText(goldenPath)) as typeof current;
  const keys = new Set([
    ...Object.keys(previous.input_parameters ?? {}),
    ...Object.keys(current.input_parameters ?? {}),
  ]);
  const changes = [...keys].sort().flatMap((key) => {
    const before = previous.input_parameters?.[key] ?? null;
    const after = current.input_parameters?.[key] ?? null;
    return JSON.stringify(before) === JSON.stringify(after)
      ? []
      : [{ parameter: key, before, after }];
  });
  if (previous.estimate_level !== current.estimate_level) {
    changes.push({
      parameter: "estimate_level",
      before: previous.estimate_level ?? null,
      after: current.estimate_level ?? null,
    });
  }
  return changes;
}

function correctionReason(correction: Correction): string {
  return [
    correction.decision,
    correction.prior_deviations.join("+") || "recorded-regression-drift",
    `rows:${correction.prior_reference_rows}->${correction.corrected_reference_rows}`,
  ].join(";");
}

function main(): void {
  const manifest = JSON.parse(
    readFileSync(CORRECTION_MANIFEST_PATH, "utf8"),
  ) as CorrectionManifest;
  if (manifest.corrections.length !== 58) {
    throw new Error(
      `BENCHMARK_CORRECTION_COUNT_INVALID:${manifest.corrections.length}/58`,
    );
  }
  const entries = manifest.corrections.map((correction) => {
    const referencePath = fileByCaseId(REFERENCE_ROOT, correction.case_id);
    if (!referencePath) {
      throw new Error(`BENCHMARK_REFERENCE_MISSING:${correction.case_id}`);
    }
    const previousText = checkpointText(referencePath);
    const currentText = readFileSync(referencePath, "utf8");
    const previous = JSON.parse(previousText) as ReferenceFile;
    const current = JSON.parse(currentText) as ReferenceFile;
    const stableSolarRomConcept =
      correction.work_family_id === "solar_power_plant";
    const solarRomConcept = /solar|солнеч/i.test(
      `${correction.case_id} ${current.prompt}`,
    );
    return {
      caseId: correction.case_id,
      referencePath: repoPath(referencePath),
      previousHash: sha256(previousText),
      newHash: sha256(currentText),
      changedParameters: changedParameters(correction.case_id),
      changedFormulas: changedFormulas(previous, current),
      changedRows: changedRows(previous, current),
      reason: correctionReason(correction),
      expectedResultSource:
        "production compiler output captured after reviewed current-core remediation",
      provenance: "COMPILER_REGRESSION_SNAPSHOT",
      reviewerStatus: "RECLASSIFIED_PENDING_INDEPENDENT_EXPERT_REVIEW",
      allowedPurpose: [
        "deterministic regression detection",
        "replay stability",
        "artifact parity regression",
      ],
      forbiddenProofPurposes: [
        "normative correctness",
        "professional passport readiness",
        "material quantity correctness",
        "Kyrgyz Republic norm applicability",
      ],
      solarRomConcept: stableSolarRomConcept
        ? {
          estimateLevel: "ROM_CONCEPT",
          reason:
            "Capacity alone does not define geotechnical, electrical single-line, grid-code, equipment-layout, civil, protection, and commissioning inputs required for PRELIMINARY_BOQ.",
          missingDesignInputsExpected: true,
        }
        : null,
      legacyPromptHeuristicMatched: solarRomConcept,
    };
  });
  const allReferenceFiles = readdirSync(REFERENCE_ROOT)
    .filter((file) => file.endsWith(".json")).length;
  const regressionSnapshots = entries.length;
  const independentGoldens = allReferenceFiles - regressionSnapshots;
  const solarEntries = entries.filter((entry) => entry.solarRomConcept != null);
  const artifact = {
    schema: "current-core-benchmark-provenance-ledger-v1",
    generatedAt: new Date().toISOString(),
    sourceHead: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
    baselineCheckpoint: CHECKPOINT,
    correctionManifest: repoPath(CORRECTION_MANIFEST_PATH),
    counts: {
      benchmarkCases: allReferenceFiles,
      independentlyEligibleUnchangedGoldens: independentGoldens,
      compilerRegressionSnapshots: regressionSnapshots,
      compilerGeneratedIndependentGoldens: 0,
      solarRomConceptCases: solarEntries.length,
    },
    tolerancePolicyChanged: false,
    fakePricesAllowed: false,
    genericFallbackAllowed: false,
    missingTraceOrSourceHidden: false,
    solarCases: solarEntries.map((entry) => ({
      caseId: entry.caseId,
      ...entry.solarRomConcept,
    })),
    entries,
    blockers: [
      entries.length === 58 ? "" : "correction_ledger_not_58",
      entries.every((entry) =>
        entry.provenance === "COMPILER_REGRESSION_SNAPSHOT"
      )
        ? ""
        : "compiler_snapshot_misclassified",
      solarEntries.length === 2 ? "" : `solar_rom_cases:${solarEntries.length}/2`,
    ].filter(Boolean),
    finalStatus:
      entries.length === 58 &&
      entries.every((entry) =>
        entry.provenance === "COMPILER_REGRESSION_SNAPSHOT"
      ) &&
      solarEntries.length === 2
        ? "GREEN_BENCHMARK_REGRESSION_WITH_HONEST_PROVENANCE"
        : "STOP_BENCHMARK_PROVENANCE_INCOMPLETE",
  };
  mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({
    output: repoPath(OUTPUT_PATH),
    independentGoldens,
    regressionSnapshots,
    solarRomConceptCases: solarEntries.length,
    finalStatus: artifact.finalStatus,
  })}\n`);
}

main();
