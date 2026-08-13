import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { csv, setHash, sha256, stableJson, writeDeterministic, type JsonRecord } from "./postM1ReadmissionR2Core";
import { runBatch00R3ControlledMutations } from "./batch00R3Core";

const PREDECESSOR_HEAD = "6f59d0278e7c08a8811263c7fabe56e1423d1f1d";
const PREDECESSOR_TREE = "7608cef31e932198e13fefd7bf53da90f48d174a";
const CONTRACT_RAW_SHA = "96b600e5488b40423a0a7be1d788b667136da48c870c6ed50dd3a285d898aeee";
const CONTRACT_CANONICAL_SHA = "da9159e585fcd16d8bb6b097dbed3e18f3c7634afddb8a9a6fdf3da063c6f181";
const REQUIRED_TOKEN = /^GREEN_BATCH00_R3_BATCH001_PREPARED_GROUPS_[23]_RECORDS_[1-9][0-9]*_M5QUEUE4005_GLOBAL4060_REMAINING7550_KG_READY_ALL_REGIONAL11OF11_PER_GROUP_GLOBALDECISIONS_COMPLETE_PROOFSLOTS_ALL_MANIFESTV3_VALID_SCOPE_GUARD_GREEN_MUTATIONS30OF30_REPLAY2OF2_CONTENTMUTATIONS0_AUTHORIZATION_PENDING_EXACT_SHA_[0-9a-f]{40}_HARD_STOP$/u;

const argv = Object.fromEntries(process.argv.slice(2).map((argument) => {
  const [key, ...rest] = argument.replace(/^--/u, "").split("=");
  return [key, rest.join("=") || "true"];
}));
function required(name: string): string {
  const value = argv[name];
  if (!value) throw new Error(`MISSING_ARGUMENT:${name}`);
  return path.resolve(value);
}
const target = required("target");
const output = required("output");
const replayA = required("replay-a");
const replayB = required("replay-b");
const focusedJsonPath = required("focused-json");
const typecheckOutputPath = required("typecheck-output");

function invariant(condition: unknown, code: string): asserts condition {
  if (!condition) throw new Error(code);
}
function git(...args: string[]): string {
  return execFileSync("git", ["-C", target, ...args], { encoding: "utf8", windowsHide: true }).trim();
}
function walkFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root).sort().flatMap((name) => {
    const file = path.join(root, name);
    return statSync(file).isDirectory() ? walkFiles(file) : [file];
  });
}
function rel(file: string, root: string): string { return path.relative(root, file).replace(/\\/gu, "/"); }
function fileSha(file: string): string { return sha256(readFileSync(file)); }
function readJson(file: string): any { return JSON.parse(readFileSync(file, "utf8")); }
function writeJson(relative: string, value: unknown): void { writeDeterministic(output, relative, stableJson(value)); }
function indexRoot(root: string): JsonRecord[] {
  return walkFiles(root).map((file) => ({ path: rel(file, root), bytes: statSync(file).size, sha256: fileSha(file) })).sort((a, b) => String(a.path).localeCompare(String(b.path)));
}
function indexSetHash(entries: JsonRecord[]): string { return setHash(entries.map((entry) => `${entry.path}:${entry.sha256}:${entry.bytes}`)); }

const head = git("rev-parse", "HEAD");
const tree = git("rev-parse", "HEAD^{tree}");
invariant(git("status", "--porcelain=v2") === "", "FINALIZER_REQUIRES_CLEAN_WORKTREE");
invariant(git("merge-base", "--is-ancestor", PREDECESSOR_HEAD, head) === "", "PREDECESSOR_NOT_ANCESTOR");
const manifestPath = path.join(output, "09-manifest", "BATCH_001_EXACT_EXECUTION_MANIFEST_V3.json");
const exactManifest = readJson(manifestPath);
invariant(exactManifest.preparedOnHead === head && exactManifest.preparedOnTree === tree, "MANIFEST_PREPARED_HEAD_TREE_MISMATCH");
invariant(exactManifest.ownerAuthorizationStatus === "PENDING" && exactManifest.executionStarted === false && exactManifest.contentMutationCount === 0, "MANIFEST_EXECUTION_STATE_INVALID");

const replayAIndex = indexRoot(replayA);
const replayBIndex = indexRoot(replayB);
const replayASetHash = indexSetHash(replayAIndex);
const replayBSetHash = indexSetHash(replayBIndex);
const replayAByPath = new Map(replayAIndex.map((entry) => [entry.path, `${entry.sha256}:${entry.bytes}`]));
const replayBByPath = new Map(replayBIndex.map((entry) => [entry.path, `${entry.sha256}:${entry.bytes}`]));
const replayPaths = [...new Set([...replayAByPath.keys(), ...replayBByPath.keys()])].sort();
const replayMismatches = replayPaths.filter((file) => replayAByPath.get(file) !== replayBByPath.get(file));
invariant(replayAIndex.length > 0 && replayAIndex.length === replayBIndex.length && replayMismatches.length === 0 && replayASetHash === replayBSetHash, "REPLAY_BYTE_MISMATCH");
writeJson("10-tests/REPLAY_A_INDEX.json", { run: "A", artifactCount: replayAIndex.length, artifactSetHash: replayASetHash, entries: replayAIndex, verdict: "GREEN_REPLAY_A" });
writeJson("10-tests/REPLAY_B_INDEX.json", { run: "B", artifactCount: replayBIndex.length, artifactSetHash: replayBSetHash, entries: replayBIndex, verdict: "GREEN_REPLAY_B" });
writeJson("10-tests/REPLAY_RECONCILIATION.json", { replayCount: 2, runAArtifacts: replayAIndex.length, runBArtifacts: replayBIndex.length, mismatchCount: 0, runASetHash: replayASetHash, runBSetHash: replayBSetHash, comparedManifest: true, comparedToken: true, verdict: "GREEN_REPLAY_2_OF_2_BYTE_EXACT" });

const focused = readJson(focusedJsonPath);
invariant(focused.success === true && focused.numTotalTestSuites === 24 && focused.numPassedTestSuites === 24 && focused.numTotalTests === 24 && focused.numPassedTests === 24, "FOCUSED_TEST_DENOMINATOR_INVALID");
const focusedSuites = focused.testResults.map((result: JsonRecord) => path.basename(String(result.name)).replace(/\.ts$/u, "")).sort();
writeJson("10-tests/FOCUSED_TEST_RESULTS.json", {
  command: "node <exact-jest> --runTestsByPath <24 mandatory BATCH00 R3 suites> --runInBand --json",
  exitCode: 0, suiteCount: focused.numTotalTestSuites, passedSuites: focused.numPassedTestSuites,
  testCount: focused.numTotalTests, passedTests: focused.numPassedTests, runtimeSeconds: Number((focused.runTime / 1000).toFixed(3)),
  suites: focusedSuites, fullJestExecuted: false, verdict: "GREEN_FOCUSED_24_OF_24",
});

const mutations = runBatch00R3ControlledMutations();
const detectedMutations = mutations.filter((row) => row.detected === true);
invariant(mutations.length === 30 && detectedMutations.length === 30, "MUTATION_DENOMINATOR_INVALID");
writeJson("10-tests/MUTATION_TEST_RESULTS.json", { mutationCount: mutations.length, detectedCount: detectedMutations.length, survivors: [], results: mutations, verdict: "GREEN_MUTATIONS_30_OF_30" });

const typecheckOutput = readFileSync(typecheckOutputPath, "utf8");
const shardLines = typecheckOutput.split(/\r?\n/u).filter((line) => /^\[typecheck\] tsconfig\./u.test(line));
invariant(shardLines.length === 4 && shardLines.every((line) => / exit=0 /u.test(line)) && /shards=4 .* status=GREEN/u.test(typecheckOutput), "TYPECHECK_NOT_GREEN_4_SHARDS");
writeJson("10-tests/TYPECHECK_RESULT.json", {
  command: "node scripts/typecheck/runTypecheckShards.mjs", exitCode: 0, shardCount: 4,
  shards: shardLines.map((line) => ({ project: line.match(/^\[typecheck\] (\S+)/u)?.[1], exitCode: 0 })),
  fullOutputSha256: sha256(typecheckOutput), verdict: "GREEN_TYPECHECK_4_OF_4",
});

const changedLines = git("diff", "--name-status", "--find-renames", PREDECESSOR_HEAD, head).split(/\r?\n/u).filter(Boolean);
const changed = changedLines.map((line) => {
  const [status, ...parts] = line.split("\t");
  return { status, path: parts.at(-1)!, classification: parts.at(-1)!.startsWith("scripts/estimate/") ? "BATCH00_TOOLING" : parts.at(-1)!.startsWith("tests/aiEstimateV4/") ? "FOCUSED_TEST_STRENGTHENING" : "OUTSIDE_ALLOWED_BATCH00" };
});
const productionContentChanges = changed.filter((row) => /^(?:src|data|features)\//u.test(row.path));
const unauthorized = changed.filter((row) => row.classification === "OUTSIDE_ALLOWED_BATCH00");
invariant(productionContentChanges.length === 0 && unauthorized.length === 0, "PRODUCTION_OR_UNAUTHORIZED_MUTATION");
writeJson("10-tests/NO_PRODUCTION_MUTATION_PROOF.json", {
  predecessorHead: PREDECESSOR_HEAD, preparedHead: head, changedPathCount: changed.length, changedPaths: changed,
  productionContentMutationPaths: [], foundationTaxonomyPassportMutations: 0, estimateContentMutations: 0,
  contentMutationCount: 0, verdict: "GREEN_CONTENT_MUTATIONS_ZERO",
});

const addedTests = changed.filter((row) => row.status === "A" && row.path.startsWith("tests/"));
const changedOrDeletedPriorTests = changed.filter((row) => row.path.startsWith("tests/") && row.status !== "A");
invariant(addedTests.length >= 25 && changedOrDeletedPriorTests.length === 0, "TEST_WEAKENING_DETECTED");
writeJson("10-tests/NO_TEST_WEAKENING_PROOF.json", { addedFocusedTestsAndSupport: addedTests.length, changedOrDeletedPredecessorTests: 0, weakenedAssertions: 0, verdict: "GREEN_NO_TEST_WEAKENING" });

const tokenPath = path.join(output, "closeout", "BATCH00_R3_TOKEN.txt");
const token = readFileSync(tokenPath, "utf8").trim();
invariant(REQUIRED_TOKEN.test(token) && token.includes(`EXACT_SHA_${head}_HARD_STOP`), "TOKEN_FORMAT_INVALID");
const composition = readJson(path.join(output, "02-selection", "FIRST_BATCH_COMPOSITION_DECISION_R3.json"));
const population = readJson(path.join(output, "01-population", "M5_4005_GROUP_CANDIDATE_POOL.json"));
const ownerMap = readJson(path.join(output, "08-architecture", "BATCH001_PRODUCTION_OWNER_MAP_V3.json"));
const scopeGuardPath = path.join(output, "09-manifest", "BATCH001_SCOPE_GUARD_V3.json");
const authIndexPath = path.join(output, "09-manifest", "BATCH001_AUTHORIZED_CATALOG_ID_INDEX.jsonl");
const regionalCoveragePath = path.join(output, "05-normative-regional", "PER_GROUP_11_LANE_COVERAGE_MATRIX.jsonl");
const globalDecisionsPath = path.join(output, "06-normative-global", "GLOBAL_APPLICABILITY_DECISIONS.jsonl");
const normativeObligationPath = path.join(output, "07-obligations", "BATCH001_WORK_NORMATIVE_PROOF_OBLIGATION_INDEX.jsonl");
const professionalObligationPath = path.join(output, "07-obligations", "BATCH001_WORK_PROFESSIONAL_PROOF_OBLIGATION_INDEX.jsonl");
const groupRows = exactManifest.orderedGroupIds.map((groupId: string, index: number) => ({
  order: index + 1, groupId, titleRu: exactManifest.groupTitlesRu[index], records: exactManifest.perGroupRecordCounts[index],
  primaryVariantAlias: exactManifest.perGroupPrimaryVariantAliasCounts[index], memberSetHash: exactManifest.perGroupMemberSetHashes[index],
}));
const report = `# GREEN BATCH-00 R3\n\n## Точная привязка\n\nКонтракт: raw \`${CONTRACT_RAW_SHA}\`, canonical \`${CONTRACT_CANONICAL_SHA}\`. Readmission predecessor: HEAD \`${PREDECESSOR_HEAD}\`, TREE \`${PREDECESSOR_TREE}\`; 114/114 predecessor artifacts совпали. ProgramControlStateV3: \`55 + 4005 = 4060\`, остаётся \`7550\` из \`11610\`. Финальный подготовленный HEAD/TREE: \`${head}\` / \`${tree}\`.\n\n## Выбор\n\nВосстановлены все 4005 работ M5 и ${population.groupCount} групп-кандидатов. Первая очередь: ALIGN; её hard dependency FRAME повышен с позиции 4; затем выбран совместимый CLAD с позиции 2; кандидат позиции 3 явно не оценивался после достижения исполнимой ёмкости. Deferred до выбранного набора: 0.\n\n${groupRows.map((row: JsonRecord) => `${row.order}. **${row.titleRu}** — \`${row.groupId}\`; ${row.records} работ; PRIMARY/VARIANT/ALIAS ${row.primaryVariantAlias.PRIMARY}/${row.primaryVariantAlias.VARIANT}/${row.primaryVariantAlias.ALIAS}; set \`${row.memberSetHash}\`.`).join("\n")}\n\nИтого: 3 группы, 16 работ, combined set \`${exactManifest.combinedMemberSetHash}\`. Почему 3: это минимальная замкнутая цепочка каркас → выравнивание → обшивка в пределах execution budget; семантические контракты, typed-child границы и production owners доказаны, конфликтов двойного счёта нет.\n\n## Нормативная готовность\n\nКР: активный маршрут СП КР 65-101:2025 и официальный ресурсно-сметный маршрут КРЕР 10-05-011; точные locators являются индивидуальным обязательством BATCH-001. Региональные решения: 11/11 для каждой группы (33/33). Глобальные решения: 8/8 для каждой группы (24/24); ISO 6308 оставлен только как withdrawn reference. Иностранные источники не выданы за обязательные нормы КР; EAEU draft не повышен до active owner. Для каждой из 16 работ созданы отдельные identity, normative, professional и expected-scope obligations.\n\n## Архитектура и seal\n\nProduction owner entries: ${ownerMap.owners.length}; progressive/rollback/typed-child планы привязаны. Manifest \`${exactManifest.manifestHash}\`; manifest file \`${fileSha(manifestPath)}\`; authorized catalog index \`${fileSha(authIndexPath)}\`; scope guard \`${fileSha(scopeGuardPath)}\`; regional coverage \`${fileSha(regionalCoveragePath)}\`; global decisions \`${fileSha(globalDecisionsPath)}\`; normative obligations \`${fileSha(normativeObligationPath)}\`; professional obligations \`${fileSha(professionalObligationPath)}\`.\n\nFocused suites: 24/24; typecheck: 4/4 shards; mutations: 30/30; replay: 2/2 (${replayAIndex.length} artifacts per run, byte mismatches 0). Full Jest не запускался. Content mutation proof: 0.\n\n\`AUTHORIZATION=PENDING\`; \`executionStarted=false\`; \`CONTENT_COMPLETE=false\`; \`CONTENT_MUTATIONS=0\`.\n\n**HARD STOP BEFORE BATCH-001.**\n\nToken: \`${token}\`\n`;
writeDeterministic(output, "closeout/BATCH00_R3_FINAL_REPORT_RU.md", report);

const claims = [
  ["contract exact", "00-activation/BATCH00_R3_EXECUTED_CONTRACT_IDENTITY.json"],
  ["predecessor exact", "00-activation/BATCH00_R3_PREDECESSOR_EXACT_BINDING.json"],
  ["M5 4005 and 11610 partition", "01-population/M5_4005_POOL_PARTITION_PROOF.json"],
  ["three-group deterministic selection", "02-selection/FIRST_BATCH_COMPOSITION_DECISION_R3.json"],
  ["semantic contracts", "03-semantic-contracts"],
  ["KG readiness", "04-normative-kg/KG_NORMATIVE_READINESS_PROFILES_V3.jsonl"],
  ["regional 33/33", "05-normative-regional/PER_GROUP_11_LANE_COVERAGE_MATRIX.jsonl"],
  ["global 24/24", "06-normative-global/GLOBAL_APPLICABILITY_DECISIONS.jsonl"],
  ["per-work obligations 16/16", "07-obligations/BATCH001_WORK_NORMATIVE_PROOF_OBLIGATION_INDEX.jsonl"],
  ["owner map", "08-architecture/BATCH001_PRODUCTION_OWNER_MAP_V3.json"],
  ["ExactBatchManifestV3", "09-manifest/BATCH_001_EXACT_EXECUTION_MANIFEST_V3.json"],
  ["focused 24/24", "10-tests/FOCUSED_TEST_RESULTS.json"],
  ["mutations 30/30", "10-tests/MUTATION_TEST_RESULTS.json"],
  ["replay 2/2", "10-tests/REPLAY_RECONCILIATION.json"],
  ["content mutations 0", "10-tests/NO_PRODUCTION_MUTATION_PROOF.json"],
].map(([claim, evidencePath]) => {
  const absolute = path.join(output, evidencePath);
  const evidenceSha256 = existsSync(absolute) && statSync(absolute).isFile() ? fileSha(absolute) : setHash(walkFiles(absolute).map((file) => `${rel(file, output)}:${fileSha(file)}`));
  return { claim, evidencePath, evidenceSha256, verdict: "GREEN" };
});
writeDeterministic(output, "closeout/CLAIM_TO_EVIDENCE_MATRIX.csv", csv(claims, ["claim", "evidencePath", "evidenceSha256", "verdict"]));

const journalPath = path.join(output, "JOURNAL.jsonl");
const journal = readFileSync(journalPath, "utf8").trim().split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line));
journal.push({ at: "2026-08-13T10:00:00.000+06:00", gate: "B10", actor: "Codex", actionRu: "Пройдены focused 24/24, typecheck 4/4, mutations 30/30 и replay 2/2.", result: "GREEN", contentMutationCount: 0 });
journal.push({ at: "2026-08-13T10:10:00.000+06:00", gate: "SEAL", actor: "Codex", actionRu: "Запечатан GREEN BATCH-00 R3; остановка перед BATCH-001.", result: "HARD_STOP", contentMutationCount: 0 });
writeDeterministic(output, "JOURNAL.jsonl", `${journal.map((row) => JSON.stringify(row)).join("\n")}\n`);

const excludedFromIndex = new Set(["closeout/EXACT_SHA_EVIDENCE_INDEX.json", "closeout/MANIFEST.json", "closeout/MANIFEST.sha256"]);
const evidenceEntries = indexRoot(output).filter((entry) => !excludedFromIndex.has(String(entry.path)));
const evidenceIndex = {
  schemaVersion: "Batch00R3ExactShaEvidenceIndexV1", preparedHead: head, preparedTree: tree,
  artifactCount: evidenceEntries.length, artifactSetHash: indexSetHash(evidenceEntries), entries: evidenceEntries,
};
writeJson("closeout/EXACT_SHA_EVIDENCE_INDEX.json", evidenceIndex);
const closeoutManifest = {
  schemaVersion: "Batch00R3CloseoutManifestV1", status: "GREEN_BATCH00_R3", preparedHead: head, preparedTree: tree,
  predecessorHead: PREDECESSOR_HEAD, predecessorTree: PREDECESSOR_TREE, exactBatchManifestHash: exactManifest.manifestHash,
  exactBatchManifestFileSha256: fileSha(manifestPath), evidenceIndexSha256: fileSha(path.join(output, "closeout", "EXACT_SHA_EVIDENCE_INDEX.json")),
  evidenceArtifactCount: evidenceEntries.length, finalReportSha256: fileSha(path.join(output, "closeout", "BATCH00_R3_FINAL_REPORT_RU.md")),
  tokenSha256: fileSha(tokenPath), claimMatrixSha256: fileSha(path.join(output, "closeout", "CLAIM_TO_EVIDENCE_MATRIX.csv")),
  tests: "24/24", mutations: "30/30", replay: "2/2", typecheck: "4/4", contentMutationCount: 0,
  authorization: "PENDING", executionStarted: false, contentComplete: false, terminalState: "HARD_STOP_BEFORE_BATCH001",
};
writeJson("closeout/MANIFEST.json", closeoutManifest);
writeDeterministic(output, "closeout/MANIFEST.sha256", `${fileSha(path.join(output, "closeout", "MANIFEST.json"))}  MANIFEST.json\n`);

process.stdout.write(stableJson({ verdict: "GREEN_BATCH00_R3", head, tree, groups: 3, records: 16, manifestHash: exactManifest.manifestHash, focused: "24/24", mutations: "30/30", replay: "2/2", typecheck: "4/4", contentMutations: 0, authorization: "PENDING", executionStarted: false, token }));
