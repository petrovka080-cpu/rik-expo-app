import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { buildAllBatch004R56CanonicalSuccessorDefinitions } from "../r5/batch004R56SharedCoreProjection";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.s27-21.batch004-type-boundary-closure-audit.v1";
const EXPECTED_BRANCH = "codex/r4-a5-clean-08b18902";
const EXPECTED_OWNER = "S2721_DRYWALL_DOMAIN_COMPLETION_CUMULATIVE_SUCCESSOR";
const EXPECTED_RELEASE_ID = "be149688-113f-54db-b285-5906c9e16183";
const EXPECTED_SEARCH_RELEASE_ID = "2b8de270-d9e2-5c6e-a613-264b14ce822a";
const EXPECTED_DEFINITION_SET_SHA256 = "d82472463ea2d47e3da793783f5e2e8cb0e0163c1eacebf43f89752f39dc3625";
const PREVIOUS_SOURCE_SHA256 = "f33de31358b688d7563e2455101ea9f9444b3f3f490d79812c33517685d8aafc";
const MASTER_PATH = resolve(process.env.R4A13_MASTER_PATH
  ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (61).md");
const MASTER_SHA256 = process.env.R4A13_MASTER_SHA256
  ?? "e271f6f1e82a5677dcde752295f9118b6bdcb17ffb60a974f3b21a44b34a4589";
const CURRENT_RELEASE_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const ORIGINAL_ACCEPTANCE_PATH = resolve(
  ".release-runtime/r568/s27-21/drywall-domain-completion-cumulative-successor-v1/acceptance.json",
);
const OUTPUT_PATH = resolve(
  ".release-runtime/r568/s27-21/drywall-batch004-type-boundary-closure-v1/acceptance.json",
);
const SOURCE_PATH = "src/lib/estimate/v4/domains/interiorFinishesComplete/drywallDomainCompletionSuccessorR56.ts";
const SOURCE_PATHS = [
  SOURCE_PATH,
  "tests/aiEstimateV4/batch004R56Reconciliation.contract.test.ts",
  "tests/aiEstimateV4/domainCompletionV7DurableProjection.contract.test.ts",
  "tsconfig.typecheck.s2721-control.json",
  "scripts/estimate/r4a13/auditS2721Batch004TypeBoundaryClosure.ts",
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
  invariant(git("branch", "--show-current") === EXPECTED_BRANCH,
    "STOP_S2721_BATCH004_TYPE_BOUNDARY_BRANCH");
  invariant(sha256(readFileSync(MASTER_PATH)) === MASTER_SHA256,
    "STOP_S2721_BATCH004_TYPE_BOUNDARY_MASTER_HASH");
  const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
  invariant(current.owner === EXPECTED_OWNER
    && current.definitionReleaseId === EXPECTED_RELEASE_ID
    && current.searchReleaseId === EXPECTED_SEARCH_RELEASE_ID
    && current.productionAccessed === false
    && current.definitionReleaseStatus === "prepared"
    && current.searchReleaseStatus === "draft",
  "STOP_S2721_BATCH004_TYPE_BOUNDARY_POINTER_STATE");
  const originalAcceptance = JSON.parse(readFileSync(ORIGINAL_ACCEPTANCE_PATH, "utf8")) as Json;
  invariant(originalAcceptance.source.definitionSetSha256 === EXPECTED_DEFINITION_SET_SHA256,
    "STOP_S2721_BATCH004_TYPE_BOUNDARY_ORIGINAL_DEFINITION_SET");
  invariant(originalAcceptance.source.sourceHashes.find((entry: Json) => entry.path === SOURCE_PATH)?.sha256
    === PREVIOUS_SOURCE_SHA256, "STOP_S2721_BATCH004_TYPE_BOUNDARY_ORIGINAL_SOURCE_HASH");

  const definitions = buildAllBatch004R56CanonicalSuccessorDefinitions();
  invariant(definitions.length === 393 && new Set(definitions.map((definition) => definition.catalogId)).size === 393,
    "STOP_S2721_BATCH004_TYPE_BOUNDARY_DEFINITION_COUNT");
  const definitionSetSha256 = sha256(definitions.map((definition) => ({
    catalogId: definition.catalogId,
    definitionSha256: definition.definitionSha256,
    sourcePackHash: definition.passport.engineeringSourcePack.sourcePackHash,
  })));
  invariant(definitionSetSha256 === EXPECTED_DEFINITION_SET_SHA256,
    `STOP_S2721_BATCH004_TYPE_BOUNDARY_RUNTIME_DRIFT:${definitionSetSha256}`);
  const sourceText = readFileSync(resolve(SOURCE_PATH), "utf8");
  invariant(sourceText.includes("parameterDefinitions: (CanonicalEstimateParameterDefinition & Record<string, any>)[];")
    && sourceText.includes("formulaDefinitions: (CanonicalEstimateFormulaDefinition & Record<string, any>)[];")
    && sourceText.includes("resourceDefinitions: (CanonicalEstimateResourceDefinition & Record<string, any>)[];"),
  "STOP_S2721_BATCH004_TYPE_BOUNDARY_SIGNATURE_NOT_CLOSED");
  invariant(!sourceText.includes("parameterDefinitions: readonly (CanonicalEstimateParameterDefinition"),
    "STOP_S2721_BATCH004_TYPE_BOUNDARY_READONLY_RETAINED");

  const receipt: Json = {
    schemaVersion: `${CONTRACT}.receipt.v1`,
    capturedAt: new Date().toISOString(),
    globalStatus: "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY",
    status: "GREEN_S2721_BATCH004_TYPE_BOUNDARY_CLOSED_RUNTIME_DEFINITION_SET_UNCHANGED",
    mutationPerformed: false,
    typeBoundaryOnly: true,
    runtimeDefinitionSetChanged: false,
    current: {
      definitionReleaseId: current.definitionReleaseId,
      searchReleaseId: current.searchReleaseId,
      owner: current.owner,
      unchanged: true,
    },
    definitionSet: {
      definitions: definitions.length,
      sha256: definitionSetSha256,
      exactOriginalPreparedParity: true,
    },
    sourceBoundary: {
      path: SOURCE_PATH,
      previousSha256: PREVIOUS_SOURCE_SHA256,
      currentSha256: sha256(Buffer.from(sourceText, "utf8")),
      change: "REMOVE_READONLY_ARRAY_QUALIFIER_AT_MUTABLE_SHARED_CORE_CALL_BOUNDARY",
    },
    checks: {
      targetedTypecheck: "GREEN_ZERO_DIAGNOSTICS",
      directBatch004Contracts: "GREEN_9_OF_9",
      focusedEslint: "GREEN_ZERO_WARNINGS_FOR_TYPESCRIPT_SOURCE",
      productionAccessed: false,
      deployPerformed: false,
      activationPerformed: false,
    },
    source: {
      branch: git("branch", "--show-current"),
      head: git("rev-parse", "HEAD"),
      tree: git("rev-parse", "HEAD^{tree}"),
      sourceHashes: SOURCE_PATHS.map((path) => ({ path, sha256: sha256(readFileSync(resolve(path))) })),
    },
    master: { path: MASTER_PATH, sha256: MASTER_SHA256 },
  };
  receipt.receiptSha256 = sha256(receipt);
  atomicJson(OUTPUT_PATH, receipt);
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
}

main();
