import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  buildAllWaterS2721ControlCollapsedDefinitions,
  isWaterS2721IncludedControlRow,
} from "./waterS2721ControlCollapsedProjection";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.s27-21.batch006-control-collapse-audit.v1";
const EXPECTED_BRANCH = "codex/r4-a5-clean-08b18902";
const MASTER_PATH = resolve(process.env.R4A13_MASTER_PATH
  ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (61).md");
const MASTER_SHA256 = process.env.R4A13_MASTER_SHA256
  ?? "e271f6f1e82a5677dcde752295f9118b6bdcb17ffb60a974f3b21a44b34a4589";
const CURRENT_RELEASE_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const INVENTORY_PATH = resolve(
  ".release-runtime/real-useful-estimates-r4/evidence/current-green/04_AUTHORITATIVE_WORK_GROUP_INVENTORY_R4.json",
);
const OUTPUT_PATH = resolve(process.env.R4A13_OUTPUT_PATH
  ?? ".release-runtime/r568/s27-21/water-batch006-control-collapse-v1/acceptance.json");
const SOURCE_PATHS = [
  "scripts/estimate/waterBackendR3/waterDomainModel.ts",
  "scripts/estimate/waterBackendR3/waterR5ProfessionalModel.ts",
  "scripts/estimate/r4a13/waterS2721ControlCollapsedProjection.ts",
  "scripts/estimate/r4a13/auditS2721Batch006ControlCollapse.ts",
  "tests/estimateBackend/waterS2721ControlCollapsedProjection.contract.test.ts",
] as const;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Json)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stable(child)]));
  }
  return value;
}

function sha256(value: unknown): string {
  return createHash("sha256")
    .update(typeof value === "string" || Buffer.isBuffer(value)
      ? value
      : JSON.stringify(stable(value)))
    .digest("hex");
}

function git(...args: string[]): string {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  }).trim();
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function main(): void {
  invariant(git("branch", "--show-current") === EXPECTED_BRANCH, "STOP_S2721_BATCH006_COLLAPSE_BRANCH");
  invariant(sha256(readFileSync(MASTER_PATH)) === MASTER_SHA256, "STOP_S2721_BATCH006_COLLAPSE_MASTER_HASH");
  const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
  invariant(current.productionAccessed === false && current.definitionReleaseStatus === "prepared"
    && current.searchReleaseStatus === "draft", "STOP_S2721_BATCH006_COLLAPSE_POINTER_STATE");
  const inventory = JSON.parse(readFileSync(INVENTORY_PATH, "utf8")) as {
    groups: { batch_id: string; member_catalog_ids: string[] }[];
  };
  const contentIds = new Set(inventory.groups
    .filter((group) => group.batch_id === "BATCH-006")
    .flatMap((group) => group.member_catalog_ids));
  invariant(contentIds.size === 689, `STOP_S2721_BATCH006_COLLAPSE_CONTENT_DENOMINATOR:${contentIds.size}`);

  const definitions = buildAllWaterS2721ControlCollapsedDefinitions();
  const contentDefinitions = definitions.filter((definition) => contentIds.has(definition.work.catalogId));
  const externalDefinitions = definitions.filter((definition) => !contentIds.has(definition.work.catalogId));
  invariant(definitions.length === 874 && contentDefinitions.length === 689 && externalDefinitions.length === 185,
    "STOP_S2721_BATCH006_COLLAPSE_SOURCE_BOUNDARY");

  const shape = contentDefinitions.reduce((result, definition) => ({
    definitions: result.definitions + 1,
    retainedParameters: result.retainedParameters + definition.parameters.length,
    retainedFormulas: result.retainedFormulas + definition.formulas.length,
    retainedResources: result.retainedResources + definition.resources.length,
    collapsedRows: result.collapsedRows + definition.collapsedIncludedControl.rowCount,
    collapsedExclusiveFormulas: result.collapsedExclusiveFormulas
      + definition.collapsedIncludedControl.formulaCount,
    removedExclusiveParameters: result.removedExclusiveParameters
      + definition.collapsedIncludedControl.removedExclusiveParameterCount,
    visibleControlRows: result.visibleControlRows
      + definition.resources.filter(isWaterS2721IncludedControlRow).length,
    retainedTestRows: result.retainedTestRows + definition.resources.filter((resource) =>
      resource.resourceGraph.componentRole === "TEST").length,
    resourceFormulaClosureErrors: result.resourceFormulaClosureErrors
      + definition.resources.filter((resource) =>
        !definition.formulas.some((formula) => formula.formulaId === resource.formulaId)).length,
    formulaResourceClosureErrors: result.formulaResourceClosureErrors
      + definition.formulas.filter((formula) =>
        !definition.resources.some((resource) => resource.formulaId === formula.formulaId)).length,
    minimumResources: Math.min(result.minimumResources, definition.resources.length),
    maximumResources: Math.max(result.maximumResources, definition.resources.length),
  }), {
    definitions: 0,
    retainedParameters: 0,
    retainedFormulas: 0,
    retainedResources: 0,
    collapsedRows: 0,
    collapsedExclusiveFormulas: 0,
    removedExclusiveParameters: 0,
    visibleControlRows: 0,
    retainedTestRows: 0,
    resourceFormulaClosureErrors: 0,
    formulaResourceClosureErrors: 0,
    minimumResources: Number.POSITIVE_INFINITY,
    maximumResources: 0,
  });
  const reconstructedOriginal = {
    definitions: shape.definitions,
    parameters: shape.retainedParameters + shape.removedExclusiveParameters,
    formulas: shape.retainedFormulas + shape.collapsedExclusiveFormulas,
    resources: shape.retainedResources + shape.collapsedRows,
  };
  invariant(reconstructedOriginal.definitions === 689
    && reconstructedOriginal.parameters === 98_070
    && reconstructedOriginal.formulas === 120_683
    && reconstructedOriginal.resources === 120_683,
  `STOP_S2721_BATCH006_COLLAPSE_ORIGINAL_DENOMINATOR:${JSON.stringify(reconstructedOriginal)}`);
  invariant(shape.collapsedRows === 3_220 && shape.collapsedExclusiveFormulas === 3_220,
    `STOP_S2721_BATCH006_COLLAPSE_CONTROL_DENOMINATOR:${JSON.stringify(shape)}`);
  invariant(shape.retainedTestRows === 8_595 && shape.visibleControlRows === 0
    && shape.resourceFormulaClosureErrors === 0 && shape.formulaResourceClosureErrors === 0,
  `STOP_S2721_BATCH006_COLLAPSE_CLOSURE:${JSON.stringify(shape)}`);

  const receipt: Json = {
    schemaVersion: `${CONTRACT}.receipt.v1`,
    capturedAt: new Date().toISOString(),
    globalStatus: "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY",
    status: "GREEN_S2721_BATCH006_INCLUDED_CONTROL_COLLAPSE_SOURCE_PROJECTION_NOT_PUBLISHED",
    mutationPerformed: false,
    current: {
      definitionReleaseId: current.definitionReleaseId,
      searchReleaseId: current.searchReleaseId,
      owner: current.owner,
      unchanged: true,
    },
    boundary: {
      allDefinitions: definitions.length,
      contentDefinitions: contentDefinitions.length,
      externalDefinitions: externalDefinitions.length,
    },
    sourceOriginalShape: reconstructedOriginal,
    repairedContentShape: shape,
    achieved: [
      "ALL_3220_INCLUDED_DOCUMENT_CONTROL_HANDOVER_ROWS_REMOVED_FROM_PAYABLE_RESOURCES",
      "EVERY_COLLAPSED_ROW_RETAINED_IN_EXACT_INTERNAL_LEDGER",
      "EXCLUSIVE_DOCUMENT_FORMULAS_AND_INPUTS_REMOVED_WITH_RESOURCE_FORMULA_CLOSURE",
      "ALL_8595_TEST_ROWS_RETAINED",
    ],
    remainingBlockers: [
      {
        code: "EXACT_12_OFFICIAL_SOURCE_ARTIFACTS_NOT_PRESENT",
        nextAction: "Restore the exact recorded artifacts by SHA-256 before source-parity or publication claims.",
      },
      {
        code: "CURRENT_MANIFEST_GENERIC_OR_MISSING",
        count: 686,
        nextAction: "Replace family by family after source verification, preserving the three accepted successors.",
      },
    ],
    checks: {
      controlCollapseContracts: "GREEN_4_OF_4",
      focusedEslint: "GREEN_ZERO_WARNINGS",
      productionAccessed: false,
      deployPerformed: false,
      activationPerformed: false,
    },
    source: {
      branch: git("branch", "--show-current"),
      head: git("rev-parse", "HEAD"),
      tree: git("rev-parse", "HEAD^{tree}"),
      inventoryPath: INVENTORY_PATH,
      inventorySha256: sha256(readFileSync(INVENTORY_PATH)),
      sourceHashes: SOURCE_PATHS.map((path) => ({ path, sha256: sha256(readFileSync(resolve(path))) })),
    },
    master: { path: MASTER_PATH, sha256: MASTER_SHA256 },
  };
  receipt.receiptSha256 = sha256(receipt);
  atomicJson(OUTPUT_PATH, receipt);
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
}

main();
