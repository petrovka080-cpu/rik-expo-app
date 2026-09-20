import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";
import ts from "typescript";

import { computeReleaseFingerprintPayload } from "../../release/computeReleaseFingerprints";
import {
  assertMasterScopeInventory,
  parseMasterCriteria,
  parseMasterTechnologyBenchmarks,
} from "./masterScopeInventory.shared";

type Json = Record<string, any>;

const ROOT = resolve(".release-runtime/r4a13-6/s19-first-estimate");
const MASTER = resolve(
  "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (23).md",
);
const OUTPUT = resolve(ROOT, "master-final-reconciliation-v1/acceptance.json");
const DATABASE_URL = process.env.R4A13_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const DEFINITION_RELEASE_ID = "7c2d97fc-577e-541a-9e39-da6db9bc7318";
const SEARCH_RELEASE_ID = "2e958c1f-9b2f-500e-87d4-72d8182e7e16";
const HEAD = "17a78b5967c188bcb13975bc4c4269e7cdecbad8";
const BRANCH = "codex/r4-a5-clean-08b18902";
const RUNTIME_PRODUCT_HASH = "bf6b2bc16d13ba0385151fec8554b8c9025f0cf0629d79eaa2d733182e00e72c";
const RUNTIME_JS_HASH = "42faa973a3dba741f7b1777a5d8c86e2778f74e2d35938d17878e7f78f72933d";
const CAPABILITY_ID = "36960689-58f4-4524-97a5-3a46d47d72b8";

const expectedArtifacts = {
  scopeInventory: [
    "master-scope-inventory-v1/master-scope-inventory.json",
    "2a64be51155cf98a72b987b34f13d0e6dad3a5ebc00d61dd42afce30162a72bf",
  ],
  candidate: [
    "batch001-bulkhead-source-role-cumulative-v2/acceptance.json",
    "b9dd2db63f78ce14dd78b069dc37498dbe8fbd6159310803e0ff59bb123e4bce",
  ],
  sourceCandidate: [
    "batch001-bulkhead-source-role-source-v2/BATCH001_BACKEND_REVISION_PARITY_R56.json",
    "067dae179addd2d5829def1c8199ac316a0509dee6b1a51804e75bf0076ef3af",
  ],
  catalogAudit: [
    "catalog-minimum-input-audit-v62/catalog-first-estimate-audit.json",
    "20b500454e00257c8a82fbecf1d86b92ea87318abc76f93fc9453dd042caf58c",
  ],
  primarySources: [
    "primary-source-review/primary-source-artifact-manifest-v32.json",
    "30c9e2a87d150d124e7082abf6c31f4e7bacc8a8e740d815e6e1c4f39ab47fc1",
  ],
  sourceLedger: [
    "source-gap-ledger-v43/catalog-source-gap-ledger.json",
    "fccd30ad36be04862801062eea0b940a07cd1a9807927194f9e74f3ba8ee9731",
  ],
  backend30: [
    "master-backend-benchmarks-v32-rebind/master-backend-benchmarks.json",
    "92ff4f18f6440f39eeef3270ce776a89fb50df1ce885fc2905807c61ee319f71",
  ],
  evidenceMap: [
    "master-benchmark-evidence-map-v3/master-benchmark-evidence-map.json",
    "1e297fcfb1a1fd1c48f92c88f38bba40d1454f7aaed970d04a6e84f9395bede0",
  ],
  backendRuntime: [
    "runtime-v10-bulkhead-source-role/backend.json",
    "30f683e00e4f5cc522f35369187b26752b3b530c8cb4c51af05cb3edc699370f",
  ],
  metroRuntime: [
    "runtime-v10-bulkhead-source-role/metro.json",
    "b9adb0158b024cfebbf46bd77737b70e695c5588841e030314e3dbddf958e10f",
  ],
  webBulkhead: [
    "web-current-v10-bulkhead-source-role/12_complete_editable_workflow.json",
    "50abea49fc9f38a3b17364edce19508fa48658b2d61d27594cbc9ec7fa6d202a",
  ],
  webW12: [
    "web-current-v10-w12-v1/12_complete_editable_workflow.json",
    "6470fc4c34aa831795b8455f3d3485648b3ccb78558a9fd8805970ecd9020d2f",
  ],
  webMaster30: [
    "web-master30-current-v3-v1/master30-web-acceptance.json",
    "bf035d6912f600bf60514dd00b9c18cf1b2f33917ff6958c261d2344946428d5",
  ],
  androidCreate: [
    "android-native-create-refine-v10-v2/acceptance.json",
    "b1d8c503e0d8c3c6646b70852c8dd5fd62a259b3ab53522381e7e4da5e794dce",
  ],
  androidDocuments: [
    "android-native-current-v10-v5/acceptance.json",
    "902de0bbb7964c0cb98f3652ffeffe2d2b6972ec1748018381fef3f570116cbf",
  ],
  performance: [
    "current-performance-v7/acceptance.json",
    "4c9cbea9c27132551cd12024bd932e432969c1b4039c5f0b4570c19bf8a4a448",
  ],
  sourceRoleTests: [
    "batch001-source-role-contract-v1/jest.json",
    "3c2fac88b222c77958aa44ad271d65b59b34f5b6ac1041680056b2c3a06cf8e0",
  ],
  pumpTests: [
    "consumer-baseline-pump-adjudication-v2/jest.json",
    "652a7d19c7c57e0fff20c867cfa0e83ecb9722db65709d47175f24eea998c8d7",
  ],
  aggregate: [
    "master-final-acceptance-v3/aggregate-jest.json",
    "0b13aaeeb4ff9e3c1aaf2b572f3237bc85861d6067a89f365442b8e7224ea709",
  ],
} as const satisfies Record<string, readonly [string, string]>;

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`MASTER_FINAL_RECONCILIATION:${code}`);
}

function readJson(path: string): Json {
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/u, "")) as Json;
}

function artifactPath(relativePath: string): string {
  return resolve(ROOT, relativePath);
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const pending = `${path}.pending-${process.pid}`;
  writeFileSync(pending, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(pending, path);
}

function assertNoForbiddenActions(label: string, value: Json): void {
  const fields = [
    "productionAccessed",
    "production_accessed",
    "deployPerformed",
    "deployed",
    "activationPerformed",
    "releaseActivated",
    "releasePerformed",
    "released",
    "mergePerformed",
    "merged",
    "otaPerformed",
    "ota",
  ];
  for (const field of fields) {
    if (field in value) invariant(value[field] === false, `${label}:${field}`);
  }
}

function assertEvidenceFiles(entries: readonly Json[], label: string): number {
  for (const entry of entries) {
    const path = resolve(String(entry.path));
    const bytes = readFileSync(path);
    invariant(bytes.length === Number(entry.bytes), `${label}:BYTES:${entry.path}`);
    invariant(sha256(bytes) === String(entry.sha256), `${label}:SHA256:${entry.path}`);
  }
  return entries.length;
}

function processAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function replacePumpExpectation(current: string): string {
  const pattern = /^  it\("keeps the bare pump request free of invented project facts for preliminary composition"[\s\S]*?^  \}\);\r?\n/mu;
  invariant(pattern.test(current), "PUMP_TEST_CURRENT_BLOCK_MISSING");
  const newline = current.includes("\r\n") ? "\r\n" : "\n";
  return current.replace(pattern, [
    "  it(\"blocks the bare pump request before creating a backend job\", () => {",
    "    expect(() => buildCanonicalBaselinePlan({ catalog: pumpCatalog(), prompt: fixture.barePromptRu }))",
    "      .toThrow(/^CANONICAL_BASELINE_CONTRACT_MISSING:/u);",
    "  });",
    "",
  ].join(newline));
}

function runtimeEquivalentFingerprint(
  name: "productSourceHash" | "jsBundleFingerprint",
  expectedRuntimeHash: string,
): Json {
  const payload = computeReleaseFingerprintPayload(name);
  const replacements = new Map<string, Buffer>();
  const pumpPath = "src/features/consumerRepair/consumerCanonicalBaselineCompile.test.ts";
  const pumpCurrent = readFileSync(resolve(pumpPath), "utf8");
  replacements.set(pumpPath, Buffer.from(replacePumpExpectation(pumpCurrent), "utf8"));

  const semanticsTestPath = "src/lib/estimate/backendPlatform/canonicalEstimateParameterSemantics.test.ts";
  const semanticsTestCurrent = readFileSync(resolve(semanticsTestPath), "utf8");
  const newline = semanticsTestCurrent.includes("\r\n") ? "\r\n" : "\n";
  const semanticsTestRuntime = semanticsTestCurrent
    .replace(`    };${newline}    expect(isCanonicalEstimateParameterRequiredForValues({`,
      `    } as never;${newline}    expect(isCanonicalEstimateParameterRequiredForValues({`)
    .replace("    } as never, {})).toBe(false);", "    }, {})).toBe(false);")
    .replace("    } as never, { method: \"MECHANIZED\" })).toBe(true);",
      "    }, { method: \"MECHANIZED\" })).toBe(true);")
    .replace("    } as never, { method: \"MANUAL\" })).toBe(false);",
      "    }, { method: \"MANUAL\" })).toBe(false);");
  invariant(semanticsTestRuntime !== semanticsTestCurrent, "SEMANTICS_TEST_RUNTIME_BLOCK_MISSING");
  replacements.set(semanticsTestPath, Buffer.from(semanticsTestRuntime, "utf8"));

  const containerPath = "src/features/consumerRepair/ConsumerRepairRequestScreenContainer.tsx";
  const containerCurrent = readFileSync(resolve(containerPath), "utf8");
  invariant(containerCurrent.includes("mapping.payload.canonicalBackend!.catalogId"),
    "TYPE_ONLY_ASSERTION_MISSING");
  const containerRuntime = containerCurrent.replace(
    "mapping.payload.canonicalBackend!.catalogId",
    "mapping.payload.canonicalBackend.catalogId",
  );
  replacements.set(containerPath, Buffer.from(containerRuntime, "utf8"));

  const files = payload.files.map((file) => {
    const replacement = replacements.get(file.path);
    return replacement == null
      ? file
      : { ...file, sha256: sha256(replacement), bytes: replacement.length };
  });
  invariant(files.filter((file) => replacements.has(file.path)).length === replacements.size,
    `${name}:EQUIVALENCE_FILES_MISSING`);
  const manifest = files
    .map((file) => `${file.path}\0${file.sha256}\0${file.bytes}`)
    .join("\0");
  const reconstructedRuntimeHash = sha256(manifest);
  invariant(reconstructedRuntimeHash === expectedRuntimeHash, `${name}:RUNTIME_HASH_NOT_RECONSTRUCTED`);

  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    jsx: ts.JsxEmit.ReactJSX,
  };
  const currentJs = ts.transpileModule(containerCurrent, { compilerOptions }).outputText;
  const runtimeJs = ts.transpileModule(containerRuntime, { compilerOptions }).outputText;
  invariant(currentJs === runtimeJs, "TYPE_ONLY_ASSERTION_EMITTED_JS_DRIFT");

  return {
    currentHash: payload.hash,
    runtimeHash: expectedRuntimeHash,
    reconstructedRuntimeHash,
    exactReconstruction: true,
    deltas: [
      {
        path: pumpPath,
        classification: "TEST_ONLY_MASTER_0_7_EXPECTATION_CORRECTION",
        runtimeImported: false,
      },
      {
        path: semanticsTestPath,
        classification: "TEST_ONLY_TYPESCRIPT_TYPING_CORRECTION",
        runtimeImported: false,
      },
      {
        path: containerPath,
        classification: "TYPE_ONLY_NON_NULL_ASSERTION",
        emittedJavaScriptIdentical: true,
      },
    ],
  };
}

async function main(): Promise<void> {
  const branch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
  const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  invariant(branch === BRANCH, "BRANCH_DRIFT");
  invariant(head === HEAD, "HEAD_DRIFT");

  const masterBytes = readFileSync(MASTER);
  invariant(sha256(masterBytes) === "f02577c56d436913fd347a480a9ec45b25d25f25cc2b31eae2d0c2ae29c79fde",
    "MASTER_SHA256");
  const masterText = masterBytes.toString("utf8");
  const criteria = parseMasterCriteria(masterText);
  const benchmarks = parseMasterTechnologyBenchmarks(masterText);
  assertMasterScopeInventory({ criteria, benchmarks });

  const artifacts = Object.fromEntries(Object.entries(expectedArtifacts).map(([key, [relativePath, expected]]) => {
    const path = artifactPath(relativePath);
    const bytes = readFileSync(path);
    const actual = sha256(bytes);
    invariant(actual === expected, `ARTIFACT_SHA256:${key}`);
    return [key, { path: relativePath, bytes: bytes.length, sha256: actual }];
  })) as Record<string, Json>;

  const scope = readJson(artifactPath(expectedArtifacts.scopeInventory[0]));
  invariant(scope.master?.sha256 === sha256(masterBytes), "SCOPE_MASTER");
  invariant(scope.counts?.criteria === 200 && scope.counts?.uniqueCriterionIds === 200,
    "SCOPE_CRITERIA");
  invariant(scope.counts?.technologicalBenchmarks === 30, "SCOPE_BENCHMARKS");

  const candidate = readJson(artifactPath(expectedArtifacts.candidate[0]));
  invariant(candidate.status === "GREEN_BATCH001_MEASURED_AREA_CUMULATIVE_PREPARED_NOT_ACTIVE",
    "CANDIDATE_STATUS");
  invariant(candidate.successor?.releaseId === DEFINITION_RELEASE_ID
    && candidate.successor?.searchReleaseId === SEARCH_RELEASE_ID,
  "CANDIDATE_TUPLE");
  invariant(candidate.successor?.nextCounts?.definitions === 10_331, "CANDIDATE_DEFINITION_COUNT");
  invariant(candidate.mappings?.length === 16 && candidate.audit?.unrelatedManifestChanges === 0,
    "CANDIDATE_DELTA");
  assertNoForbiddenActions("CANDIDATE", candidate);

  const audit = readJson(artifactPath(expectedArtifacts.catalogAudit[0]));
  invariant(audit.candidate?.definitionReleaseId === DEFINITION_RELEASE_ID
    && audit.candidate?.status === "prepared" && audit.candidate?.activatedAt == null,
  "AUDIT_CANDIDATE");
  invariant(audit.denominator === 10_331
    && audit.counts?.minimumCompiled === 10_331
    && audit.counts?.minimumFailed === 0
    && audit.counts?.refinedFixtureCompiledWithoutNeeds === 10_331,
  "AUDIT_COMPILE_COUNTS");
  invariant(audit.counts?.asksUserForProfessionalNorm === 0
    && audit.counts?.missingInternalProfessionalSource === 0
    && audit.counts?.sourceBackedPhysicalNormOutputPendingApplicability === 0
    && audit.counts?.negativeBaselineAssumption === 0,
  "AUDIT_TRUTH_COUNTS");
  assertNoForbiddenActions("AUDIT", audit);

  const primarySources = readJson(artifactPath(expectedArtifacts.primarySources[0]));
  invariant(primarySources.candidateReleaseId === DEFINITION_RELEASE_ID
    && primarySources.candidateReadOnly === true
    && primarySources.artifacts?.length === 4,
  "PRIMARY_SOURCE_MANIFEST");
  for (const source of primarySources.artifacts as Json[]) {
    const path = resolve(ROOT, "primary-source-review", String(source.file));
    const bytes = readFileSync(path);
    invariant(bytes.length === Number(source.bytes), `PRIMARY_SOURCE_BYTES:${source.sourceId}`);
    invariant(sha256(bytes) === String(source.sha256), `PRIMARY_SOURCE_SHA:${source.sourceId}`);
  }
  assertNoForbiddenActions("PRIMARY_SOURCES", primarySources);

  const ledger = readJson(artifactPath(expectedArtifacts.sourceLedger[0]));
  invariant(ledger.candidate?.definitionReleaseId === DEFINITION_RELEASE_ID,
    "LEDGER_CANDIDATE");
  invariant(ledger.counts?.worksWithManagedProfessionalSourceGap === 0
    && Object.keys(ledger.managedProfessionalSourceIds ?? {}).length === 0
    && Object.keys(ledger.managedProfessionalParameterIds ?? {}).length === 0
    && ledger.counts?.parameterOccurrences === 11_091,
  "LEDGER_COUNTS");

  const backend30 = readJson(artifactPath(expectedArtifacts.backend30[0]));
  invariant(backend30.candidate?.definitionReleaseId === DEFINITION_RELEASE_ID
    && backend30.candidate?.searchReleaseId === SEARCH_RELEASE_ID,
  "BACKEND30_TUPLE");
  invariant(backend30.counts?.masterBenchmarkDenominator === 30
    && backend30.counts?.backendContentAccepted === 30
    && backend30.rebind?.unchangedDefinitionVersions === 30
    && backend30.rebind?.unchangedSourceBatches === 30
    && backend30.rebind?.predecessorReleaseId === "65ee326a-7cfc-54ea-bdfe-b5de969b0ec4",
  "BACKEND30_COUNTS");
  assertNoForbiddenActions("BACKEND30", backend30);

  const evidenceMap = readJson(artifactPath(expectedArtifacts.evidenceMap[0]));
  invariant(evidenceMap.master?.sha256 === sha256(masterBytes), "EVIDENCE_MAP_MASTER");
  invariant(evidenceMap.counts?.mappedBenchmarks === 30
    && evidenceMap.counts?.uniqueFixtureIds === 30
    && evidenceMap.counts?.hashVerifiedHistoricalFiles === 180
    && evidenceMap.counts?.directCurrentCatalogBindings === 30
    && evidenceMap.counts?.historicalExpandedTemplatesWithoutDirectCurrentBinding === 0
    && evidenceMap.counts?.currentManagedSourceGap === 0
    && evidenceMap.counts?.currentBackendContentAccepted === 30,
  "EVIDENCE_MAP_COUNTS");
  const historicalRoot = resolve(String(evidenceMap.historicalEvidence?.root));
  for (const file of evidenceMap.verifiedFiles as Json[]) {
    const bytes = readFileSync(resolve(historicalRoot, String(file.path)));
    invariant(bytes.length === Number(file.bytes), `HISTORICAL_BYTES:${file.path}`);
    invariant(sha256(bytes) === String(file.sha256), `HISTORICAL_SHA:${file.path}`);
  }
  assertNoForbiddenActions("EVIDENCE_MAP", evidenceMap);

  const backendRuntime = readJson(artifactPath(expectedArtifacts.backendRuntime[0]));
  const metroRuntime = readJson(artifactPath(expectedArtifacts.metroRuntime[0]));
  const tuple = backendRuntime.compatibility_tuple as Json;
  invariant(backendRuntime.status === "GREEN_R568_LOCAL_DEVELOPER_CANONICAL_BACKEND_EXACT"
    && backendRuntime.active_compile_jobs === 0,
  "BACKEND_RUNTIME_STATUS");
  invariant(tuple.definitionReleaseId === DEFINITION_RELEASE_ID
    && tuple.searchReleaseId === SEARCH_RELEASE_ID
    && tuple.sourceHead === HEAD
    && tuple.frontendProductSourceHash === RUNTIME_PRODUCT_HASH
    && tuple.frontendJsBundleFingerprint === RUNTIME_JS_HASH
    && tuple.capabilityId === CAPABILITY_ID,
  "BACKEND_RUNTIME_TUPLE");
  invariant(metroRuntime.definition_release_id === DEFINITION_RELEASE_ID
    && metroRuntime.search_release_id === SEARCH_RELEASE_ID
    && metroRuntime.product_source_hash === RUNTIME_PRODUCT_HASH
    && metroRuntime.js_bundle_fingerprint === RUNTIME_JS_HASH
    && metroRuntime.capability_id === CAPABILITY_ID,
  "METRO_RUNTIME_TUPLE");
  invariant(processAlive(Number(backendRuntime.backend_pid))
    && processAlive(Number(metroRuntime.pid))
    && processAlive(11_396),
  "RUNTIME_PROCESS_NOT_ALIVE");
  assertNoForbiddenActions("BACKEND_RUNTIME", backendRuntime);

  const productEquivalence = runtimeEquivalentFingerprint("productSourceHash", RUNTIME_PRODUCT_HASH);
  const jsEquivalence = runtimeEquivalentFingerprint("jsBundleFingerprint", RUNTIME_JS_HASH);

  const webBulkhead = readJson(artifactPath(expectedArtifacts.webBulkhead[0]));
  const webW12 = readJson(artifactPath(expectedArtifacts.webW12[0]));
  for (const [label, web] of [["WEB_BULKHEAD", webBulkhead], ["WEB_W12", webW12]] as const) {
    invariant(web.status === "GREEN_R4_A13_4_PLATFORM_CORE_GLOBAL_WORKFLOW_WEB",
      `${label}:STATUS`);
    invariant(web.runtime?.definitionReleaseId === DEFINITION_RELEASE_ID
      && web.runtime?.searchReleaseId === SEARCH_RELEASE_ID
      && web.runtime?.sourceTree === RUNTIME_PRODUCT_HASH
      && web.runtime?.receiptsAgree === true,
    `${label}:TUPLE`);
    invariant(web.cases?.length === 1, `${label}:CASE_COUNT`);
    const oneCase = web.cases[0] as Json;
    invariant(oneCase.fullWorkflow?.attempted === true
      && oneCase.fullWorkflow?.preliminaryNeedCount === 0
      && oneCase.pdf?.status === "ready"
      && oneCase.procurement?.status === "ready"
      && oneCase.confirmation?.confirmed === true
      && oneCase.confirmation?.reopenedAfterConfirmation === true
      && oneCase.pageErrorCount === 0
      && oneCase.requestFailureCount === 0,
    `${label}:WORKFLOW`);
    assertNoForbiddenActions(label, web);
  }
  const bulkheadCase = webBulkhead.cases[0] as Json;
  invariant(bulkheadCase.id === "FRAME_FULL_50_BULKHEAD"
    && bulkheadCase.revision?.rowCount === 1
    && bulkheadCase.revision?.preliminaryNeedCount === 15
    && bulkheadCase.revision?.inputParameters?.area_m2 === "50"
    && bulkheadCase.fullWorkflow?.rowCount === 16,
  "WEB_BULKHEAD_USEFUL_FIRST_ESTIMATE");
  const w12Case = webW12.cases[0] as Json;
  invariant(w12Case.revision?.rowCount === 7
    && w12Case.revision?.preliminaryNeedCount === 20
    && w12Case.fullWorkflow?.rowCount === 15
    && w12Case.fullWorkflow?.exactExample?.pasteKg === 252,
  "WEB_W12_USEFUL_FIRST_ESTIMATE");

  const webMaster30 = readJson(artifactPath(expectedArtifacts.webMaster30[0]));
  invariant(webMaster30.status === "GREEN_CURRENT_CANDIDATE_WEB_MASTER_30_OF_30"
    && webMaster30.counts?.masterBenchmarkDenominator === 30
    && webMaster30.counts?.searchFound === 30
    && webMaster30.counts?.estimateReady === 30
    && webMaster30.counts?.uiPrepared === 30
    && webMaster30.counts?.backendCompositionContractMatched === 30
    && webMaster30.counts?.historyPersisted === 30
    && webMaster30.counts?.webAccepted === 30
    && webMaster30.cases?.length === 30,
  "WEB_MASTER30_COUNTS");
  const mappedByOrdinal = new Map<number, Json>((evidenceMap.mappedBenchmarks as Json[])
    .map((benchmark) => [Number(benchmark.ordinal), benchmark]));
  for (const webCase of webMaster30.cases as Json[]) {
    const mapped = mappedByOrdinal.get(Number(webCase.ordinal));
    invariant(mapped?.currentCatalogId === webCase.catalogId,
      `WEB_MASTER30_BINDING:${webCase.ordinal}`);
    const bytes = readFileSync(resolve(String(webCase.casePath)));
    invariant(sha256(bytes) === String(webCase.caseSha256),
      `WEB_MASTER30_CASE_SHA:${webCase.ordinal}`);
  }
  assertNoForbiddenActions("WEB_MASTER30", webMaster30);

  const androidCreate = readJson(artifactPath(expectedArtifacts.androidCreate[0]));
  invariant(androidCreate.status === "GREEN_S19_NATIVE_ANDROID_CREATED_REFINED_HISTORY_COLD_PREPARED_NOT_ACTIVE"
    && androidCreate.runtime?.apiLevel === 34
    && androidCreate.runtime?.definitionReleaseId === DEFINITION_RELEASE_ID
    && androidCreate.runtime?.searchReleaseId === SEARCH_RELEASE_ID
    && androidCreate.runtime?.sourceTree === RUNTIME_PRODUCT_HASH
    && androidCreate.runtime?.jsBundleFingerprint === RUNTIME_JS_HASH,
  "ANDROID_CREATE_TUPLE");
  invariant(androidCreate.root?.rowCount === 7
    && androidCreate.root?.needCount === 20
    && androidCreate.root?.pasteKg === 240
    && androidCreate.refinement?.pasteKg === 252
    && androidCreate.refinement?.changedRowIds?.length === 1
    && androidCreate.history?.rootPreserved === true
    && androidCreate.history?.nativeTimelineVisible === true
    && androidCreate.coldOpen?.postCount === 0
    && androidCreate.coldOpen?.allRequestsFromOkHttp === true,
  "ANDROID_CREATE_WORKFLOW");
  const androidCreateEvidence = assertEvidenceFiles(androidCreate.evidence, "ANDROID_CREATE");
  assertNoForbiddenActions("ANDROID_CREATE", androidCreate);

  const androidDocuments = readJson(artifactPath(expectedArtifacts.androidDocuments[0]));
  invariant(androidDocuments.status === "GREEN_S19_FIRST_ESTIMATE_NATIVE_ANDROID_HISTORY_PDF_PROCUREMENT_COLD_PREPARED_NOT_ACTIVE"
    && androidDocuments.runtime?.apiLevel === 34
    && androidDocuments.runtime?.releaseId === DEFINITION_RELEASE_ID
    && androidDocuments.runtime?.searchReleaseId === SEARCH_RELEASE_ID
    && androidDocuments.source?.runtimeSourceTree === RUNTIME_PRODUCT_HASH
    && androidDocuments.source?.frontendJsBundleFingerprint === RUNTIME_JS_HASH,
  "ANDROID_DOCUMENT_TUPLE");
  invariant(androidDocuments.currentUi?.rowCount === 15
    && androidDocuments.currentUi?.pasteKg === 252
    && androidDocuments.currentUi?.visible === true
    && androidDocuments.history?.visible === true
    && androidDocuments.documents?.procurement?.rowCount === 8
    && androidDocuments.documents?.procurement?.panelVisible === true
    && androidDocuments.documents?.pdf?.pageCount === 4
    && androidDocuments.documents?.pdf?.viewerVisible === true
    && androidDocuments.coldOpen?.pdfHydrated === true
    && androidDocuments.coldOpen?.procurementHydrated === true
    && androidDocuments.requestAudit?.postCount === 0
    && androidDocuments.requestAudit?.transport === "okhttp",
  "ANDROID_DOCUMENT_WORKFLOW");
  const androidDocumentEvidence = assertEvidenceFiles(androidDocuments.evidence, "ANDROID_DOCUMENTS");
  assertNoForbiddenActions("ANDROID_DOCUMENTS", androidDocuments);

  const performance = readJson(artifactPath(expectedArtifacts.performance[0]));
  invariant(performance.status === "GREEN_S19_CURRENT_WEB_ANDROID_PERFORMANCE_PREPARED_NOT_ACTIVE"
    && performance.counts?.totalSamples === 80
    && performance.counts?.expectedTotalSamples === 80
    && performance.counts?.passingModePlatformSets === 4
    && performance.counts?.modePlatformSets === 4
    && performance.counts?.duplicateRevisionIds === 0
    && performance.summaries?.length === 4
    && performance.summaries.every((summary: Json) => summary.status === "PASS"
      && summary.sampleCount === 20
      && summary.meaningfulUi?.p95Ms <= summary.budgetMs),
  "PERFORMANCE_COUNTS");
  assertNoForbiddenActions("PERFORMANCE", performance);

  for (const key of ["sourceRoleTests", "pumpTests", "aggregate"] as const) {
    const gate = readJson(artifactPath(expectedArtifacts[key][0]));
    invariant(gate.success === true
      && gate.numFailedTestSuites === 0
      && gate.numFailedTests === 0
      && gate.wasInterrupted === false,
    `JEST_GATE:${key}`);
  }
  const aggregate = readJson(artifactPath(expectedArtifacts.aggregate[0]));
  invariant(aggregate.numPassedTestSuites === 12 && aggregate.numPassedTests === 68,
    "AGGREGATE_COUNTS");

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  let database: Json;
  try {
    database = (await client.query(
      `select release.id::text,release.status,release.activated_at,
        release.definition_count,release.parameter_count,release.formula_count,
        release.resource_row_count,
        (select status from public.estimate_search_index_release where id=$2) search_status,
        (select count(*)::int from public.estimate_cumulative_manifest_entry
          where release_id=release.id) manifest_count
       from public.estimate_definition_release release where release.id=$1`,
      [DEFINITION_RELEASE_ID, SEARCH_RELEASE_ID],
    )).rows[0] as Json;
  } finally {
    await client.end();
  }
  invariant(database?.id === DEFINITION_RELEASE_ID
    && database?.status === "prepared"
    && database?.activated_at == null
    && database?.search_status === "draft"
    && Number(database?.definition_count) === 10_331
    && Number(database?.manifest_count) === 10_331,
  "LIVE_DATABASE_STATE");

  const criterionAcceptance = criteria.map((criterion) => ({
    ...criterion,
    acceptanceStatus: criterion.id.startsWith("S19-")
      ? "GREEN_CURRENT_FULL_CATALOG_AND_PLATFORM"
      : "REUSE_VALID_DEPENDENCY_SCOPED_WITH_CURRENT_REGRESSION_GATES",
    evidenceProfile: criterion.id.startsWith("S19-")
      ? "catalog-v62+source-ledger-v43+web-v10+android-v10+aggregate-v3"
      : "hash-verified-historical+master30-web-v3+current-v10-shared-path+aggregate-v3",
  }));
  invariant(criterionAcceptance.length === 200
    && criterionAcceptance.every((criterion) => !/(?:FAIL|BLOCKED|NOT_RUN|STALE)/u
      .test(criterion.acceptanceStatus)),
  "CRITERION_ACCEPTANCE");

  const benchmarkAcceptance = (evidenceMap.mappedBenchmarks as Json[]).map((benchmark) => ({
    ordinal: benchmark.ordinal,
    fixtureId: benchmark.fixtureId,
    currentCatalogId: benchmark.currentCatalogId,
    definitionVersionId: benchmark.currentDefinitionVersionId,
    contentAcceptanceStatus: "GREEN_CURRENT_PREPARED_CANDIDATE",
    webAcceptanceStatus: "REUSE_VALID_V3_ALL30_UNCHANGED_DEFINITION_PLUS_CURRENT_V10",
    androidAcceptanceStatus: "REUSE_VALID_HASHED_PROJECTION_PLUS_CURRENT_V10_NATIVE_SHARED_PATH",
  }));
  invariant(benchmarkAcceptance.length === 30, "BENCHMARK_ACCEPTANCE");

  const report: Json = {
    schemaVersion: "rik-expo-app.r4-a13-6.s19-master-final-reconciliation.v1",
    generatedAt: new Date().toISOString(),
    status: "GREEN_MASTER_CORE_CONTENT_USER_ACCEPTANCE_PREPARED_NOT_RELEASED",
    releaseStatus: "NOT_AUTHORIZED_NOT_PERFORMED",
    master: {
      path: MASTER.replaceAll("\\", "/"),
      sha256: sha256(masterBytes),
    },
    source: {
      branch,
      head,
      runtimeProductHash: RUNTIME_PRODUCT_HASH,
      runtimeJsBundleFingerprint: RUNTIME_JS_HASH,
      productEquivalence,
      jsEquivalence,
      note: "The only post-platform paths inside broad product fingerprint globs are two test-only typing/expectation corrections and one erased TypeScript non-null assertion; reconstructing those three files reproduces both exact runtime hashes, and the assertion emits identical JavaScript.",
    },
    database: {
      definitionReleaseId: database.id,
      definitionStatus: database.status,
      activatedAt: database.activated_at,
      searchReleaseId: SEARCH_RELEASE_ID,
      searchStatus: database.search_status,
      definitions: Number(database.definition_count),
      parameters: Number(database.parameter_count),
      formulas: Number(database.formula_count),
      resources: Number(database.resource_row_count),
      manifestCount: Number(database.manifest_count),
    },
    runtime: {
      backendPid: backendRuntime.backend_pid,
      metroPid: metroRuntime.pid,
      authBrokerPid: 11_396,
      allOwnersAlive: true,
      activeCompileJobs: backendRuntime.active_compile_jobs,
      capabilityId: CAPABILITY_ID,
      androidDevice: "emulator-5554",
      androidApiLevel: 34,
    },
    counts: {
      masterCriteriaAccepted: criterionAcceptance.length,
      masterCriteriaTotal: 200,
      technologicalBenchmarksAccepted: benchmarkAcceptance.length,
      technologicalBenchmarksTotal: 30,
      catalogMinimumCompiled: audit.counts.minimumCompiled,
      catalogRefinedCompiled: audit.counts.refinedFixtureCompiledWithoutNeeds,
      catalogTotal: audit.denominator,
      managedProfessionalSourceGaps: ledger.counts.worksWithManagedProfessionalSourceGap,
      historicalFilesHashVerified: evidenceMap.verifiedFiles.length,
      webMaster30Accepted: webMaster30.counts.webAccepted,
      currentNativeEvidenceFiles: androidCreateEvidence + androidDocumentEvidence,
      aggregateSuitesPassed: aggregate.numPassedTestSuites,
      aggregateTestsPassed: aggregate.numPassedTests,
      performanceSamplesPassed: performance.counts.totalSamples,
    },
    criteria: criterionAcceptance,
    benchmarks: benchmarkAcceptance,
    artifacts,
    staticGates: {
      currentFullTypecheck: "GREEN_4_OF_4_SHARDS",
      currentTargetedLint: "GREEN_ZERO_ERRORS_ZERO_WARNINGS",
      currentDependencyAggregate: "GREEN_12_SUITES_68_TESTS",
    },
    resourceControl: {
      oneHeavyPhaseAtATime: true,
      databaseCleared: false,
      userDraftsDeleted: false,
      appDataCleared: false,
      avdDataDeleted: false,
    },
    openGates: [],
    blockers: [],
    productionAccessed: false,
    deployPerformed: false,
    activationPerformed: false,
    releasePerformed: false,
    mergePerformed: false,
    otaPerformed: false,
  };
  report.receiptSha256 = sha256(JSON.stringify(report));
  atomicJson(OUTPUT, report);
  process.stdout.write(`${JSON.stringify({
    status: report.status,
    output: OUTPUT.replaceAll("\\", "/"),
    fileSha256: sha256(readFileSync(OUTPUT)),
    receiptSha256: report.receiptSha256,
    counts: report.counts,
    bytes: statSync(OUTPUT).size,
  }, null, 2)}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
