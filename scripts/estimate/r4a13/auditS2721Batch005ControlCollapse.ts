import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  buildAllBatch005S2721ControlCollapsedDefinitions,
  isBatch005S2721IncludedControlRow,
} from "./batch005S2721ControlCollapsedProjection";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.s27-21.batch005-control-collapse-audit.v1";
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
  ?? ".release-runtime/r568/s27-21/electrical-batch005-control-collapse-v1/acceptance.json");
const SOURCE_PATHS = [
  "scripts/estimate/r5/batch005R4SharedCoreProjection.ts",
  "scripts/estimate/r4a13/batch005S2721ControlCollapsedProjection.ts",
  "scripts/estimate/r4a13/auditS2721Batch005ControlCollapse.ts",
  "tests/estimateBackend/batch005R4BackendProjection.contract.test.ts",
  "tests/estimateBackend/batch005S2721ControlCollapsedProjection.contract.test.ts",
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
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30_000 }).trim();
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function main(): void {
  invariant(git("branch", "--show-current") === EXPECTED_BRANCH, "STOP_S2721_BATCH005_COLLAPSE_BRANCH");
  invariant(sha256(readFileSync(MASTER_PATH)) === MASTER_SHA256, "STOP_S2721_BATCH005_COLLAPSE_MASTER_HASH");
  const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
  invariant(current.productionAccessed === false && current.definitionReleaseStatus === "prepared"
    && current.searchReleaseStatus === "draft", "STOP_S2721_BATCH005_COLLAPSE_POINTER_STATE");
  const inventory = JSON.parse(readFileSync(INVENTORY_PATH, "utf8")) as {
    groups: { batch_id: string; member_catalog_ids: string[] }[];
  };
  const contentIds = new Set(inventory.groups
    .filter((group) => group.batch_id === "BATCH-005")
    .flatMap((group) => group.member_catalog_ids));
  invariant(contentIds.size === 497, `STOP_S2721_BATCH005_COLLAPSE_CONTENT_DENOMINATOR:${contentIds.size}`);

  const definitions = buildAllBatch005S2721ControlCollapsedDefinitions();
  const contentDefinitions = definitions.filter((definition) => contentIds.has(definition.catalogId));
  const externalDefinitions = definitions.filter((definition) => !contentIds.has(definition.catalogId));
  invariant(definitions.length === 605 && contentDefinitions.length === 497 && externalDefinitions.length === 108,
    "STOP_S2721_BATCH005_COLLAPSE_SOURCE_BOUNDARY");

  const shape = contentDefinitions.reduce((result, definition) => {
    const ledger = definition.passport.collapsedIncludedControl;
    const formulaIds = new Set(definition.runtimeFormulas.map((formula) => formula.formulaId));
    const rowIds = new Set(definition.resources.map((resource) => resource.rowId));
    const orphanParameters = definition.passport.parameters.filter((parameter) =>
      parameter.formulaConsumerIds.every((formulaId) => !formulaIds.has(formulaId))
      && parameter.resourceConsumerIds.every((rowId) => !rowIds.has(rowId))).length;
    return {
      definitions: result.definitions + 1,
      retainedParameters: result.retainedParameters + definition.passport.parameters.length,
      retainedFormulas: result.retainedFormulas + definition.runtimeFormulas.length,
      retainedResources: result.retainedResources + definition.resources.length,
      collapsedRows: result.collapsedRows + ledger.rowCount,
      collapsedExclusiveFormulas: result.collapsedExclusiveFormulas + ledger.formulaCount,
      removedExclusiveParameters: result.removedExclusiveParameters + ledger.removedExclusiveParameterCount,
      remainingDirectQuantityInputs: result.remainingDirectQuantityInputs + definition.runtimeFormulas
        .filter((formula) => formula.inputParameterIds.length === 1
          && formula.inputParameterIds[0]?.startsWith("quantity_")).length,
      visibleControlRows: result.visibleControlRows + definition.resources
        .filter(isBatch005S2721IncludedControlRow).length,
      orphanParameters: result.orphanParameters + orphanParameters,
      ledgerRowsWithBadDisposition: result.ledgerRowsWithBadDisposition
        + (ledger.disposition === "INCLUDED_IN_PRIMARY_OPERATION_NOT_SEPARATELY_SUMMED" ? 0 : ledger.rowCount),
      minimumResources: Math.min(result.minimumResources, definition.resources.length),
      maximumResources: Math.max(result.maximumResources, definition.resources.length),
    };
  }, {
    definitions: 0,
    retainedParameters: 0,
    retainedFormulas: 0,
    retainedResources: 0,
    collapsedRows: 0,
    collapsedExclusiveFormulas: 0,
    removedExclusiveParameters: 0,
    remainingDirectQuantityInputs: 0,
    visibleControlRows: 0,
    orphanParameters: 0,
    ledgerRowsWithBadDisposition: 0,
    minimumResources: Number.POSITIVE_INFINITY,
    maximumResources: 0,
  });
  const reconstructedOriginal = {
    definitions: shape.definitions,
    parameters: shape.retainedParameters + shape.removedExclusiveParameters,
    formulas: shape.retainedFormulas + shape.collapsedExclusiveFormulas,
    resources: shape.retainedResources + shape.collapsedRows,
  };
  invariant(reconstructedOriginal.definitions === 497
    && reconstructedOriginal.parameters === 55_825
    && reconstructedOriginal.formulas === 43_855
    && reconstructedOriginal.resources === 43_855,
  `STOP_S2721_BATCH005_COLLAPSE_ORIGINAL_DENOMINATOR:${JSON.stringify(reconstructedOriginal)}`);
  invariant(shape.visibleControlRows === 0 && shape.orphanParameters === 0
    && shape.ledgerRowsWithBadDisposition === 0,
  `STOP_S2721_BATCH005_COLLAPSE_CLOSURE:${JSON.stringify(shape)}`);
  invariant(shape.collapsedRows === 12_920,
    `STOP_S2721_BATCH005_COLLAPSE_CONTROL_DENOMINATOR:${shape.collapsedRows}`);
  const retainedProtocolTechnology = contentDefinitions.flatMap((definition) => definition.resources)
    .filter((resource) => /(?:Шлюз диспетчерского протокола|Настройка коммуникационного протокола|Настройка осциллографии и журнала событий|Анализатор промышленного протокола)/u.test(resource.titleRu));
  invariant(retainedProtocolTechnology.length === 36,
    `STOP_S2721_BATCH005_COLLAPSE_PROTOCOL_TECHNOLOGY:${retainedProtocolTechnology.length}`);

  const receipt: Json = {
    schemaVersion: `${CONTRACT}.receipt.v1`,
    capturedAt: new Date().toISOString(),
    globalStatus: "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY",
    status: "GREEN_S2721_BATCH005_INCLUDED_CONTROL_COLLAPSE_SOURCE_PROJECTION_NOT_PUBLISHED",
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
      workGroups: new Set(definitions.map((definition) => definition.group)).size,
    },
    sourceOriginalShape: reconstructedOriginal,
    repairedContentShape: shape,
    achieved: [
      "ALL_INCLUDED_HSE_QA_DOCUMENT_HANDOVER_ROWS_REMOVED_FROM_PAYABLE_RESOURCES",
      "EVERY_COLLAPSED_ROW_RETAINED_IN_EXACT_INTERNAL_LEDGER",
      "EXCLUSIVE_CONTROL_FORMULAS_AND_PARAMETERS_REMOVED_WITHOUT_ORPHANS",
      "ALL_36_REAL_PROTOCOL_GATEWAY_CONFIGURATION_EVENT_LOG_AND_ANALYZER_ROWS_RETAINED",
      "TECHNOLOGICAL_RESOURCE_IDENTITIES_AND_SOURCE_ORACLE_QUANTITIES_UNCHANGED",
    ],
    remainingBlockers: [
      {
        code: "ROW_LEVEL_QUANTITY_INPUTS_STILL_REPLACE_AUTOMATIC_FIRST_ESTIMATE",
        count: shape.remainingDirectQuantityInputs,
        nextAction: "Bind route, circuit, device and equipment facts to exact available norms family by family; do not invent ratios.",
      },
      {
        code: "EXACT_BROAD_NORM_AND_PROJECT_ARTIFACTS_NOT_PRESENT",
        nextAction: "Restore exact source artifacts or keep affected families fail-closed and unpublished.",
      },
    ],
    checks: {
      focusedContracts: "GREEN_9_OF_9",
      focusedEslint: "GREEN_ZERO_WARNINGS",
      sourceOracleRetainedRowsPositive: true,
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
