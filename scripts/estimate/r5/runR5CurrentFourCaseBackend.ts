import { existsSync, readFileSync, renameSync } from "node:fs";
import { resolve } from "node:path";

import { computeReleaseFingerprints } from "../../release/computeReleaseFingerprints";
import { currentBranch, currentHead } from "../../release/releasePipelineRuntime";
import { canonicalWorkSearchQueryFromPrompt } from "../../../src/lib/estimate/backendPlatform/canonicalEstimateSearchInput";
import { evaluateFormulaGraph } from "../../../src/lib/estimate/backendPlatform/formulaGraph";
import {
  R41_OFFICIAL_ANDROID_SURFACE_DEFINITIONS,
  compileR41SurfaceDefinitionRows,
} from "../r4/r41OfficialAndroidSurfaceDefinitions";
import {
  api,
  argument,
  atomicJson,
  fileProof,
  invariant,
  sha256,
  stableJson,
  waitJob,
  type Json,
} from "../r4/r4WorkGroupSurfaceShared";

const MASTER_SHA256 = "45352facf763cd0c628a3e0c8b8bc882821928da5b8eeb9caa386b76e07a3c43";
const SUCCESSOR_RELEASE_ID = "eb3f1734-d52a-5011-b2de-da1f567d90b0";
const SUCCESSOR_SEARCH_RELEASE_ID = "0793f1ba-d7ea-51c3-9587-4f82a58aa774";
const OUTPUT = resolve(".release-runtime/r5/evidence/06_R5_CURRENT_FOUR_CASE_BACKEND.json");
const ABSTRACT_PUBLIC_ROW = /^(?:оборудование доступа|состав заделки|профиль усиления|материал по маршруту)$/iu;

const OFFICIAL_PROMPTS = new Map<string, string>([
  [
    "r41_surface_electrical_turnkey_explicit",
    "электрика под ключ 100 кв метров площадь длина трассы 500 метров 10 розеток 10 выключателей 10 точек освещения",
  ],
  ["r41_surface_roof_waterproofing", "гидроизоляция крыши 100 кв м"],
  ["r41_surface_paving_stone_laying", "смета на укладку брусчатки на 587 кв м"],
  ["r41_surface_house_electrical_area", "смета на электромонтаж дома 180 кв м"],
]);

function parametersFor(catalogId: string): Record<string, number> {
  const definition = R41_OFFICIAL_ANDROID_SURFACE_DEFINITIONS.find((item) => item.catalogId === catalogId);
  invariant(definition, `R5_FOUR_DEFINITION_MISSING:${catalogId}`);
  return Object.fromEntries(definition.parameters.map((parameter) => [parameter.parameterId, parameter.baselineValue]));
}

function modifiedParameters(catalogId: string): Record<string, number> {
  const definition = R41_OFFICIAL_ANDROID_SURFACE_DEFINITIONS.find((item) => item.catalogId === catalogId);
  invariant(definition, `R5_FOUR_DEFINITION_MISSING:${catalogId}`);
  const parameters = parametersFor(catalogId);
  const primary = definition.parameters[0]!;
  parameters[primary.parameterId] = primary.baselineValue + 1;
  return parameters;
}

function exactRowParity(catalogId: string, parameters: Record<string, number>, actual: Json[]) {
  const definition = R41_OFFICIAL_ANDROID_SURFACE_DEFINITIONS.find((item) => item.catalogId === catalogId);
  invariant(definition, `R5_FOUR_DEFINITION_MISSING:${catalogId}`);
  const expected = compileR41SurfaceDefinitionRows(definition);
  const byTitle = new Map(actual.map((row) => [String(row.titleRu), row]));
  const mismatches: string[] = [];
  for (const row of expected) {
    const observed = byTitle.get(row.titleRu);
    if (!observed) {
      mismatches.push(`ROW_MISSING:${row.rowId}`);
      continue;
    }
    const expectedQuantity = Number(evaluateFormulaGraph(row.ast, parameters));
    const actualQuantity = Number(observed.quantity);
    if (String(observed.unitId) !== row.unitId) mismatches.push(`UNIT:${row.rowId}`);
    if (!Number.isFinite(actualQuantity) || Math.abs(actualQuantity - expectedQuantity) > 1e-8) {
      mismatches.push(`QUANTITY:${row.rowId}:${actualQuantity}:${expectedQuantity}`);
    }
  }
  if (actual.length !== expected.length) mismatches.push(`ROW_COUNT:${actual.length}:${expected.length}`);
  return { expected, mismatches };
}

async function runCase(apiRoot: string, catalogId: string) {
  const definition = R41_OFFICIAL_ANDROID_SURFACE_DEFINITIONS.find((item) => item.catalogId === catalogId);
  invariant(definition, `R5_FOUR_DEFINITION_MISSING:${catalogId}`);
  const prompt = OFFICIAL_PROMPTS.get(catalogId);
  invariant(prompt, `R5_FOUR_PROMPT_MISSING:${catalogId}`);
  const searchQuery = canonicalWorkSearchQueryFromPrompt(prompt);
  const search = await api(
    apiRoot,
    `search/catalog?query=${encodeURIComponent(searchQuery)}&mode=PHRASE&pageSize=20`,
  );
  const searchItems = search.items as Json[];
  invariant(Number(search.literalTotalCount) === 1 && searchItems.length === 1,
    `R5_FOUR_SEARCH_DENOMINATOR_RED:${catalogId}`);
  const selected = searchItems[0]!;
  invariant(selected.catalogId === catalogId && selected.matchType === "T2_EXACT_ALIAS"
    && selected.estimateReady === true && selected.selectableMode === "PROFESSIONAL"
    && selected.contentAdmission?.allowed === true,
  `R5_FOUR_SEARCH_ADMISSION_RED:${catalogId}`);
  invariant(search.searchIndexReleaseId === SUCCESSOR_SEARCH_RELEASE_ID,
    `R5_FOUR_SEARCH_RELEASE_RED:${catalogId}`);

  const parameters = parametersFor(catalogId);
  const primaryMeasureParameterId = definition.parameters[0]!.parameterId;
  const compileRequest = {
    idempotencyKey: `r5-current-four-compile-v2-${SUCCESSOR_RELEASE_ID}-${catalogId}`,
    catalogId,
    sourceRequestText: prompt,
    primaryMeasureParameterId,
    parameters,
    currencyCode: "KGS",
  };
  const firstAccepted = await api(apiRoot, "jobs/compile", {
    method: "POST",
    body: JSON.stringify(compileRequest),
  });
  const replayAccepted = await api(apiRoot, "jobs/compile", {
    method: "POST",
    body: JSON.stringify(compileRequest),
  });
  invariant(firstAccepted.jobId === replayAccepted.jobId && replayAccepted.created === false,
    `R5_FOUR_COMPILE_IDEMPOTENCY_RED:${catalogId}`);
  const job = await waitJob(apiRoot, String(firstAccepted.jobId));
  const revisionId = String(job.resultRevisionId ?? "");
  invariant(revisionId, `R5_FOUR_REVISION_MISSING:${catalogId}`);
  const [revision, rowsResponse] = await Promise.all([
    api(apiRoot, `revisions/${revisionId}`),
    api(apiRoot, `revisions/${revisionId}/rows?limit=200`),
  ]);
  const rows = rowsResponse.rows as Json[];
  const parity = exactRowParity(catalogId, parameters, rows);
  invariant(parity.mismatches.length === 0, `R5_FOUR_ROW_PARITY_RED:${catalogId}:${parity.mismatches.join(",")}`);
  invariant(revision.releaseId === SUCCESSOR_RELEASE_ID && revision.catalogId === catalogId,
    `R5_FOUR_REVISION_LINEAGE_RED:${catalogId}`);
  invariant(rows.every((row) => Number(row.quantity) > 0 && !ABSTRACT_PUBLIC_ROW.test(String(row.titleRu).trim())),
    `R5_FOUR_ROW_CONTENT_RED:${catalogId}`);

  const childParameters = modifiedParameters(catalogId);
  const childRequest = {
    idempotencyKey: `r5-current-four-child-v2-${SUCCESSOR_RELEASE_ID}-${catalogId}`,
    catalogId,
    parentRevisionId: revisionId,
    parameters: childParameters,
    currencyCode: "KGS",
  };
  const childAccepted = await api(apiRoot, "jobs/recalculate", {
    method: "POST",
    body: JSON.stringify(childRequest),
  });
  const childReplayAccepted = await api(apiRoot, "jobs/recalculate", {
    method: "POST",
    body: JSON.stringify(childRequest),
  });
  invariant(childAccepted.jobId === childReplayAccepted.jobId && childReplayAccepted.created === false,
    `R5_FOUR_CHILD_IDEMPOTENCY_RED:${catalogId}`);
  const childJob = await waitJob(apiRoot, String(childAccepted.jobId));
  const childRevisionId = String(childJob.resultRevisionId ?? "");
  invariant(childRevisionId && childRevisionId !== revisionId,
    `R5_FOUR_CHILD_REVISION_MISSING:${catalogId}`);
  const [childRevision, childRowsResponse] = await Promise.all([
    api(apiRoot, `revisions/${childRevisionId}`),
    api(apiRoot, `revisions/${childRevisionId}/rows?limit=200`),
  ]);
  const childRows = childRowsResponse.rows as Json[];
  const childParity = exactRowParity(catalogId, childParameters, childRows);
  invariant(childParity.mismatches.length === 0,
    `R5_FOUR_CHILD_ROW_PARITY_RED:${catalogId}:${childParity.mismatches.join(",")}`);
  invariant(childRevision.parentRevisionId === revisionId
    && childRevision.releaseId === SUCCESSOR_RELEASE_ID
    && childRevision.checksumSha256 !== revision.checksumSha256,
  `R5_FOUR_CHILD_LINEAGE_RED:${catalogId}`);

  const sections = [...new Set(rows.map((row) => String(row.section)))];
  const sectionText = sections.join(" ").toLocaleLowerCase("ru-RU");
  const categoryText = rows.map((row) => String(row.category)).join(" ").toLocaleLowerCase("ru-RU");
  const scopePresence = {
    materialsPresent: sectionText.includes("материал"),
    worksPresent: sectionText.includes("работ") || sectionText.includes("монтаж") || sectionText.includes("подготов"),
    equipmentPresent: sectionText.includes("оборудован") || sectionText.includes("механизм") || categoryText.includes("equipment"),
    logisticsPresent: sectionText.includes("логист") || sectionText.includes("достав"),
    wastePresent: sectionText.includes("отход"),
  };
  invariant(Object.values(scopePresence).every(Boolean),
    `R5_FOUR_SCOPE_COMPLETENESS_RED:${catalogId}:${stableJson(scopePresence)}`);
  return {
    caseId: catalogId,
    prompt,
    search: {
      query: searchQuery,
      literalTotalCount: Number(search.literalTotalCount),
      catalogId: selected.catalogId,
      matchType: selected.matchType,
      estimateReady: selected.estimateReady,
      admitted: selected.contentAdmission?.allowed === true,
      searchReleaseId: search.searchIndexReleaseId,
    },
    compile: {
      jobId: firstAccepted.jobId,
      firstCreated: firstAccepted.created,
      replayCreated: replayAccepted.created,
      replaySameJob: firstAccepted.jobId === replayAccepted.jobId,
      revisionId,
      releaseId: revision.releaseId,
      checksumSha256: revision.checksumSha256,
      rowCount: rows.length,
      nonPositiveRows: rows.filter((row) => Number(row.quantity) <= 0).length,
      pricedRows: rows.filter((row) => row.unitPrice != null).length,
      priceRequiredRows: rows.filter((row) => row.unitPrice == null).length,
      abstractPublicRows: rows.filter((row) => ABSTRACT_PUBLIC_ROW.test(String(row.titleRu).trim())).length,
      sections,
      ...scopePresence,
      exactFormulaRowParity: `${rows.length}/${parity.expected.length}`,
    },
    child: {
      jobId: childAccepted.jobId,
      replayCreated: childReplayAccepted.created,
      replaySameJob: childAccepted.jobId === childReplayAccepted.jobId,
      parentRevisionId: childRevision.parentRevisionId,
      revisionId: childRevisionId,
      checksumChanged: childRevision.checksumSha256 !== revision.checksumSha256,
      exactFormulaRowParity: `${childRows.length}/${childParity.expected.length}`,
    },
    verdict: "GREEN",
  };
}

async function main() {
  const apiRoot = argument("api-root", "http://127.0.0.1:8765/canonical-estimate");
  const fingerprints = computeReleaseFingerprints();
  const cases = [];
  for (const definition of R41_OFFICIAL_ANDROID_SURFACE_DEFINITIONS) {
    cases.push(await runCase(apiRoot, definition.catalogId));
  }
  invariant(cases.length === 4 && cases.every((item) => item.verdict === "GREEN"),
    "R5_CURRENT_FOUR_BACKEND_NOT_GREEN");
  const priorCandidate = resolve(
    ".release-runtime/real-useful-estimates-r4/evidence/current-green/18_OFFICIAL_ANDROID_SURFACE_CANDIDATE_R41.json",
  );
  invariant(existsSync(priorCandidate), "R5_SUPERSEDED_CANDIDATE_EVIDENCE_MISSING");
  const priorCandidateSha256 = sha256(readFileSync(priorCandidate));
  const payload = {
    schemaVersion: "r5-current-four-case-backend.v1",
    generatedUtc: new Date().toISOString(),
    masterSha256: MASTER_SHA256,
    sourceHead: currentHead(),
    sourceBranch: currentBranch(),
    sourceTreeSha256: fingerprints.sourceTreeHash,
    sourceManifestSha256: fingerprints.productSourceHash,
    proofHarnessSha256: fingerprints.proofHarnessHash,
    commandIdentity: "tsx scripts/estimate/r5/runR5CurrentFourCaseBackend.ts",
    denominator: 4,
    passed: 4,
    failed: 0,
    skipped: 0,
    releaseId: SUCCESSOR_RELEASE_ID,
    searchReleaseId: SUCCESSOR_SEARCH_RELEASE_ID,
    supersededCandidate: {
      releaseId: "5dfa943e-b37f-500b-a4c5-4cafcef2e0b0",
      evidencePath: priorCandidate.replaceAll("\\", "/"),
      evidenceSha256: priorCandidateSha256,
      mutated: false,
    },
    cases,
    failures: [],
    blockers: [],
    fakeGreenClaimed: false,
    productionAccessed: false,
    productionDeployed: false,
    productionReleased: false,
  };
  const artifact = {
    ...payload,
    artifactSha256: sha256(stableJson(payload)),
  };
  if (existsSync(OUTPUT)) {
    const predecessor = JSON.parse(readFileSync(OUTPUT, "utf8")) as Json;
    if (predecessor.releaseId !== SUCCESSOR_RELEASE_ID) {
      const archive = OUTPUT.replace(/\.json$/u, `.superseded-${String(predecessor.releaseId).slice(0, 8)}.json`);
      invariant(!existsSync(archive), `R5_CURRENT_FOUR_ARCHIVE_EXISTS:${archive}`);
      renameSync(OUTPUT, archive);
    }
  }
  atomicJson(OUTPUT, artifact);
  process.stdout.write(`${JSON.stringify({
    status: "GREEN_R5_CURRENT_FOUR_CASE_BACKEND",
    expected: 4,
    passed: 4,
    failed: 0,
    artifact: fileProof(OUTPUT),
  }, null, 2)}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
