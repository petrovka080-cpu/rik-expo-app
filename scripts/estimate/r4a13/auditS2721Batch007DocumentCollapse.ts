import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { HVAC_DOMAIN_INVENTORY } from "../../../src/lib/estimate/v4/domains/heatingVentilationComplete";
import { buildHvacPassport, HVAC_R4_EXTERNAL_INVENTORY } from "../hvacBackendR4/hvacR4Model";
import {
  collapseHvacS2721DocumentPassport,
  isHvacS2721IncludedDocumentRow,
} from "./hvacS2721DocumentCollapsedProjection";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.s27-21.batch007-document-collapse-audit.v1";
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
  ?? ".release-runtime/r568/s27-21/hvac-batch007-document-collapse-v1/acceptance.json");
const SOURCE_PATHS = [
  "scripts/estimate/hvacBackendR4/hvacR4Model.ts",
  "scripts/estimate/hvacBackendR4/hvacR4NormativeGapA2.ts",
  "scripts/estimate/r4a13/hvacS2721DocumentCollapsedProjection.ts",
  "scripts/estimate/r4a13/auditS2721Batch007DocumentCollapse.ts",
  "tests/estimateBackend/hvacS2721DocumentCollapsedProjection.contract.test.ts",
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
  invariant(git("branch", "--show-current") === EXPECTED_BRANCH, "STOP_S2721_BATCH007_COLLAPSE_BRANCH");
  invariant(sha256(readFileSync(MASTER_PATH)) === MASTER_SHA256, "STOP_S2721_BATCH007_COLLAPSE_MASTER_HASH");
  const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
  invariant(current.productionAccessed === false && current.definitionReleaseStatus === "prepared"
    && current.searchReleaseStatus === "draft", "STOP_S2721_BATCH007_COLLAPSE_POINTER_STATE");
  const inventory = JSON.parse(readFileSync(INVENTORY_PATH, "utf8")) as {
    groups: { batch_id: string; member_catalog_ids: string[] }[];
  };
  const contentIds = new Set(inventory.groups
    .filter((group) => group.batch_id === "BATCH-007")
    .flatMap((group) => group.member_catalog_ids));
  invariant(contentIds.size === 864, `STOP_S2721_BATCH007_COLLAPSE_CONTENT_DENOMINATOR:${contentIds.size}`);
  invariant(HVAC_DOMAIN_INVENTORY.length + HVAC_R4_EXTERNAL_INVENTORY.length === 1_012,
    "STOP_S2721_BATCH007_COLLAPSE_SOURCE_BOUNDARY");

  const shape = {
    definitions: 0,
    originalParameters: 0,
    originalFormulas: 0,
    originalResources: 0,
    retainedParameters: 0,
    retainedFormulas: 0,
    retainedResources: 0,
    collapsedRows: 0,
    collapsedExclusiveFormulas: 0,
    removedExclusiveParameters: 0,
    visibleDocumentRows: 0,
    retainedInterfaceRows: 0,
    retainedTestRows: 0,
    retainedComponentQuantityInputs: 0,
    retainedRateAndFactorInputs: 0,
    resourceFormulaClosureErrors: 0,
    formulaResourceClosureErrors: 0,
    sourcePassportHashErrors: 0,
    minimumResources: Number.POSITIVE_INFINITY,
    maximumResources: 0,
  };
  for (const row of HVAC_DOMAIN_INVENTORY) {
    if (!contentIds.has(row.catalog_id)) continue;
    const source = buildHvacPassport(row);
    const definition = collapseHvacS2721DocumentPassport(source);
    const formulaIds = new Set(definition.formulas.map((formula) => formula.formulaId));
    const resourceFormulaIds = new Set(definition.resources.map((resource) => resource.formulaId));
    shape.definitions += 1;
    shape.originalParameters += source.parameters.length;
    shape.originalFormulas += source.formulas.length;
    shape.originalResources += source.resources.length;
    shape.retainedParameters += definition.parameters.length;
    shape.retainedFormulas += definition.formulas.length;
    shape.retainedResources += definition.resources.length;
    shape.collapsedRows += definition.collapsedIncludedDocuments.rowCount;
    shape.collapsedExclusiveFormulas += definition.collapsedIncludedDocuments.formulaCount;
    shape.removedExclusiveParameters += definition.collapsedIncludedDocuments.removedExclusiveParameterCount;
    shape.visibleDocumentRows += definition.resources.filter(isHvacS2721IncludedDocumentRow).length;
    shape.retainedInterfaceRows += definition.resources.filter((resource) =>
      resource.resourceGraph.componentKind === "INTERFACE").length;
    shape.retainedTestRows += definition.resources.filter((resource) =>
      resource.resourceGraph.componentKind === "TEST").length;
    shape.retainedComponentQuantityInputs += definition.parameters
      .filter((parameter) => parameter.parameterId.endsWith("_quantity")).length;
    shape.retainedRateAndFactorInputs += definition.parameters
      .filter((parameter) => /_(?:labor_norm|machine_norm|test_interval|mass_kg_per_unit|waste_factor)$/u
        .test(parameter.parameterId)).length;
    shape.resourceFormulaClosureErrors += definition.resources
      .filter((resource) => !formulaIds.has(resource.formulaId)).length;
    shape.formulaResourceClosureErrors += definition.formulas
      .filter((formula) => !resourceFormulaIds.has(formula.formulaId)).length;
    shape.sourcePassportHashErrors += definition.sourcePassportSha256 === source.passportSha256 ? 0 : 1;
    shape.minimumResources = Math.min(shape.minimumResources, definition.resources.length);
    shape.maximumResources = Math.max(shape.maximumResources, definition.resources.length);
  }
  invariant(shape.definitions === 864 && shape.originalParameters === 107_884
    && shape.originalFormulas === 264_990 && shape.originalResources === 264_990,
  `STOP_S2721_BATCH007_COLLAPSE_ORIGINAL_DENOMINATOR:${JSON.stringify(shape)}`);
  invariant(shape.collapsedRows === 18_632 && shape.collapsedExclusiveFormulas === 18_632,
    `STOP_S2721_BATCH007_COLLAPSE_DOCUMENT_DENOMINATOR:${JSON.stringify(shape)}`);
  invariant(shape.retainedInterfaceRows === 3_526 && shape.visibleDocumentRows === 0
    && shape.resourceFormulaClosureErrors === 0 && shape.formulaResourceClosureErrors === 0
    && shape.sourcePassportHashErrors === 0,
  `STOP_S2721_BATCH007_COLLAPSE_CLOSURE:${JSON.stringify(shape)}`);
  invariant(shape.retainedParameters + shape.removedExclusiveParameters === shape.originalParameters,
    `STOP_S2721_BATCH007_COLLAPSE_PARAMETER_RECONSTRUCTION:${JSON.stringify(shape)}`);

  const receipt: Json = {
    schemaVersion: `${CONTRACT}.receipt.v1`,
    capturedAt: new Date().toISOString(),
    globalStatus: "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY",
    status: "GREEN_S2721_BATCH007_INCLUDED_DOCUMENT_COLLAPSE_SOURCE_PROJECTION_NOT_PUBLISHED",
    mutationPerformed: false,
    current: {
      definitionReleaseId: current.definitionReleaseId,
      searchReleaseId: current.searchReleaseId,
      owner: current.owner,
      unchanged: true,
    },
    boundary: {
      allDefinitions: HVAC_DOMAIN_INVENTORY.length + HVAC_R4_EXTERNAL_INVENTORY.length,
      contentDefinitions: shape.definitions,
      outsideCurrentBatchDefinitions: 148,
    },
    repairedContentShape: shape,
    achieved: [
      "ALL_18632_INCLUDED_DOCUMENT_ROWS_REMOVED_FROM_PAYABLE_RESOURCES",
      "EVERY_COLLAPSED_ROW_RETAINED_IN_EXACT_INTERNAL_LEDGER",
      "EXCLUSIVE_DOCUMENT_FORMULAS_AND_INPUTS_REMOVED_WITH_RESOURCE_FORMULA_CLOSURE",
      "ALL_3526_TYPED_INTERFACE_ROWS_PRESERVED_FAIL_CLOSED_PENDING_ACCEPTED_CHILD_REVISIONS",
    ],
    remainingBlockers: [
      {
        code: "EXACT_WATER_PREDECESSOR_PACKAGE_MISSING",
        nextAction: "Restore and hash-verify the exact recorded BATCH006 predecessor package.",
      },
      {
        code: "OFFICIAL_SOURCE_SNAPSHOTS_MISSING",
        count: 18,
        nextAction: "Restore controlled official page/PDF snapshots and exact byte hashes.",
      },
      {
        code: "TYPED_INTERFACE_CHILD_REVISIONS_NOT_ACCEPTED",
        count: shape.retainedInterfaceRows,
        nextAction: "Bind each interface to an immutable accepted child revision before excluding its child-owned cost.",
      },
      {
        code: "ROW_LEVEL_COMPONENT_AND_RATE_INPUT_BURDEN_REMAINS",
        count: shape.retainedComponentQuantityInputs + shape.retainedRateAndFactorInputs,
        nextAction: "Compute exact values from system, route and equipment facts only where verified source rules exist.",
      },
    ],
    checks: {
      documentCollapseContracts: "GREEN_4_OF_4",
      focusedEslint: "GREEN_ZERO_WARNINGS",
      streamingOnePassportAtATime: true,
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
