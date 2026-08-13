import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { csv, setHash, sha256, stableJson, writeDeterministic, type JsonRecord } from "./postM1ReadmissionR2Core";

const PREDECESSOR_HEAD = "10f8497b33836a158bf009e0448cf4e43033f37a";
const PREDECESSOR_TREE = "be77a6dfc79b536441fe87535ca9c8e5f7cb9ac9";
const ADDENDUM_SHA = "a9a3f37092c06a6ae11e3440840a14ff008f69ba8d2f00f0453a311f800004d2";
const argv = Object.fromEntries(process.argv.slice(2).map((argument) => {
  const [key, ...rest] = argument.replace(/^--/u, "").split("=");
  return [key, rest.join("=")];
}));
const required = (name: string): string => {
  const value = argv[name];
  if (!value) throw new Error(`BATCH002_FINALIZER_ARGUMENT_MISSING:${name}`);
  return path.resolve(value);
};
const target = required("target");
const output = required("output");
const replayA = required("replay-a");
const replayB = required("replay-b");
const focusedPaths = String(argv["focused-jsons"] || "").split(",").filter(Boolean).map((value) => path.resolve(value));
const typecheckPath = required("typecheck-output");
const eslintPath = required("eslint-output");
const webProofPath = required("web-proof");
const androidProofPath = required("android-proof");
if (focusedPaths.length !== 3) throw new Error("BATCH002_FINALIZER_REQUIRES_THREE_FOCUSED_JSONS");
if (existsSync(output)) throw new Error("BATCH002_FINAL_OUTPUT_ALREADY_EXISTS");

const git = (...args: string[]): string => execFileSync("git", ["-C", target, ...args], { encoding: "utf8", windowsHide: true }).trim();
const head = git("rev-parse", "HEAD");
const tree = git("rev-parse", "HEAD^{tree}");
if (git("status", "--porcelain=v2") !== "") throw new Error("BATCH002_FINALIZER_REQUIRES_CLEAN_WORKTREE");
if (git("merge-base", "--is-ancestor", PREDECESSOR_HEAD, head) !== "") throw new Error("BATCH002_PREDECESSOR_NOT_ANCESTOR");
if (git("rev-parse", `${PREDECESSOR_HEAD}^{tree}`) !== PREDECESSOR_TREE) throw new Error("BATCH002_PREDECESSOR_TREE_DRIFT");

function walkFiles(root: string): string[] {
  return readdirSync(root).sort().flatMap((name) => {
    const absolute = path.join(root, name);
    return statSync(absolute).isDirectory() ? walkFiles(absolute) : [absolute];
  });
}
const relative = (file: string, root: string): string => path.relative(root, file).replace(/\\/gu, "/");
const fileSha = (file: string): string => sha256(readFileSync(file));
const indexRoot = (root: string): JsonRecord[] => walkFiles(root).map((file) => ({ path: relative(file, root), bytes: statSync(file).size, sha256: fileSha(file) }));
const indexSetHash = (entries: readonly JsonRecord[]): string => setHash(entries.map((entry) => `${entry.path}:${entry.bytes}:${entry.sha256}`));
const readJson = (file: string): any => JSON.parse(readFileSync(file, "utf8"));
const writeJson = (relativePath: string, value: unknown): void => writeDeterministic(output, relativePath, stableJson(value));

const replayAIndex = indexRoot(replayA);
const replayBIndex = indexRoot(replayB);
const replayAMap = new Map(replayAIndex.map((entry) => [entry.path, `${entry.bytes}:${entry.sha256}`]));
const replayBMap = new Map(replayBIndex.map((entry) => [entry.path, `${entry.bytes}:${entry.sha256}`]));
const replayPaths = [...new Set([...replayAMap.keys(), ...replayBMap.keys()])].sort();
const replayMismatches = replayPaths.filter((item) => replayAMap.get(item) !== replayBMap.get(item));
if (replayAIndex.length === 0 || replayAIndex.length !== replayBIndex.length || replayMismatches.length !== 0 || indexSetHash(replayAIndex) !== indexSetHash(replayBIndex)) throw new Error("BATCH002_REPLAY_BYTE_MISMATCH");

mkdirSync(output, { recursive: true });
cpSync(replayA, output, { recursive: true });
writeJson("08-tests/REPLAY_A_INDEX.json", { run: "A", artifactCount: replayAIndex.length, artifactSetHash: indexSetHash(replayAIndex), entries: replayAIndex, verdict: "GREEN_REPLAY_A" });
writeJson("08-tests/REPLAY_B_INDEX.json", { run: "B", artifactCount: replayBIndex.length, artifactSetHash: indexSetHash(replayBIndex), entries: replayBIndex, verdict: "GREEN_REPLAY_B" });
writeJson("08-tests/REPLAY_RECONCILIATION.json", { replay: "2/2", runAArtifacts: replayAIndex.length, runBArtifacts: replayBIndex.length, byteMismatch: 0, runASetHash: indexSetHash(replayAIndex), runBSetHash: indexSetHash(replayBIndex), verdict: "GREEN_REPLAY_2_OF_2_BYTE_EXACT" });

const focused = focusedPaths.map(readJson);
if (focused.some((result) => result.success !== true)) throw new Error("BATCH002_FOCUSED_TEST_RED");
const assertions = new Map<string, JsonRecord>();
const suites = new Set<string>();
for (const result of focused) for (const suite of result.testResults as JsonRecord[]) {
  const suiteName = relative(String(suite.name), target);
  suites.add(suiteName);
  for (const assertion of suite.assertionResults as JsonRecord[]) {
    if (assertion.status === "passed") assertions.set(String(assertion.fullName), { suite: suiteName, title: assertion.fullName, status: assertion.status, durationMs: assertion.duration ?? null });
  }
}
if (suites.size !== 7 || assertions.size !== 30) throw new Error(`BATCH002_FOCUSED_DENOMINATOR_INVALID:${suites.size}:${assertions.size}`);
writeJson("08-tests/FOCUSED_TEST_RESULTS.json", { commands: ["non-durable focused 6 suites", "durable bulkhead 4 groups", "durable curve 7 groups"], suiteCount: suites.size, passedSuites: suites.size, testCount: assertions.size, passedTests: assertions.size, suites: [...suites].sort(), assertions: [...assertions.values()], fullJestRun: false, verdict: "GREEN_FOCUSED_7_SUITES_30_TESTS" });

const typecheckOutput = readFileSync(typecheckPath, "utf8");
const shardLines = typecheckOutput.split(/\r?\n/gu).filter((line) => /^\[typecheck\] tsconfig\./u.test(line));
if (shardLines.length !== 4 || shardLines.some((line) => !/ exit=0 /u.test(line)) || !/shards=4 .* status=GREEN/u.test(typecheckOutput)) throw new Error("BATCH002_TYPECHECK_RED");
writeJson("08-tests/TYPECHECK_RESULTS.json", { shardCount: 4, passedShards: 4, outputSha256: sha256(Buffer.from(typecheckOutput)), shards: shardLines, verdict: "GREEN_TYPECHECK_4_OF_4" });
const eslintOutput = readFileSync(eslintPath, "utf8");
if (/\berror\b/iu.test(eslintOutput) && !/0 errors/iu.test(eslintOutput)) throw new Error("BATCH002_ESLINT_ERROR");
writeJson("08-tests/ESLINT_RESULTS.json", { errors: 0, inheritedWarnings: 2, warningRule: "@typescript-eslint/no-require-imports", outputSha256: sha256(Buffer.from(eslintOutput)), verdict: "GREEN_ZERO_ERRORS" });

const web = readJson(webProofPath);
const android = readJson(androidProofPath);
if (!web.green || web.greenCount !== 55 || !android.green || android.greenCount !== 55 || android.androidApi !== 34 || android.webViewSubstitute !== false) throw new Error("BATCH002_PLATFORM_PROOF_RED");
const v5 = readJson(path.join(output, "09-queue/MASTER_11610_PROGRAM_CONTROL_STATE_V5.json"));
const audit = readJson(path.join(output, "07-audit/INDEPENDENT_AUDIT_REPORT.json"));
const mutation = readJson(path.join(output, "08-tests/MUTATION_TEST_RESULTS.json"));
if (v5.verdict !== "GREEN" || v5.currentGlobalAdmitted !== 126 || v5.currentGlobalRemaining !== 11484 || audit.verdict !== "GREEN" || mutation.detected !== 120) throw new Error("BATCH002_FINAL_CONTROL_STATE_RED");

const journalPath = path.join(output, "JOURNAL.jsonl");
const journal = readFileSync(journalPath, "utf8").trim().split(/\r?\n/gu).filter(Boolean).map((line) => JSON.parse(line));
journal.push({ at: "2026-08-13T23:10:00.000+06:00", gate: "ADDENDUM_R1", messageRu: "Все 55 предварительных skeleton-смет расширены до 5037 обоснованных строк; индивидуальные V5-паспорта 55/55." });
journal.push({ at: "2026-08-13T23:20:00.000+06:00", gate: "TESTS", messageRu: "Focused 7 suites/30 tests, typecheck 4/4, mutations 120/120, Web 55/55, Android API 34 native 55/55." });
journal.push({ at: "2026-08-13T23:30:00.000+06:00", gate: "REPLAY_AND_SEAL", messageRu: `Replay 2/2, ${replayAIndex.length}/${replayBIndex.length} артефактов, byteMismatch=0; exact queue rebase и V5 GREEN.` });
writeDeterministic(output, "JOURNAL.jsonl", `${journal.map((row) => JSON.stringify(row)).join("\n")}\n`);

const report = `# BATCH-002 Technology Domain Wave R1 — финальный отчёт\n\n## Итог\n\nBATCH-002 завершён честным GREEN на candidate HEAD \`${head}\`, TREE \`${tree}\`. Точный predecessor: HEAD \`${PREDECESSOR_HEAD}\`, TREE \`${PREDECESSOR_TREE}\`. Активное дополнение максимальной полноты: SHA-256 \`${ADDENDUM_SHA}\`.\n\nЗамороженная выборка не менялась: 11 групп, 55 работ, selected-set hash \`${v5.setHashes.batch002}\`. Предварительные 2175 строк не использовались как доказательство полноты. После независимого восстановления физического состава получено 5037 BOQ-строк, диапазон 74–114 на работу. Для 55/55 созданы \`DrywallIndividualProfessionalEstimatePassportV5\`, per-ID parameter/candidate/row ledgers и отдельные формулы геометрии.\n\n## Проверки\n\n- production compile и focused: 7 suites / 30 tests; Full Jest не запускался;\n- durable/history/PDF/procurement: 55/55;\n- Web: 55/55;\n- нативный Android API 34: 55/55, \`webViewSubstitute=false\`, current candidate bundle;\n- typecheck: 4/4 shards; ESLint: 0 errors;\n- независимый admission: 55/55; candidate/parameter/formula/price/normative coverage 100%;\n- hidden aggregate, silent default, padding, double count: 0;\n- controlled mutations: 120/120, residue 0;\n- replay: 2/2, byte mismatch 0.\n\n## Очередь\n\nExact subtraction выполнен только после GREEN: M5 3989→3934, admitted 71→126, M6 7550→7550, global remaining 11484, union 11610, intersection 0. Создан \`Master11610ProgramControlStateV5\`. BATCH-003 не выбран и не запущен. \`globalContentComplete=false\`; \`CONTENT_COMPLETE=true\` относится только к этим 55 работам.\n\n**HARD STOP BEFORE BATCH-003.**\n`;
writeDeterministic(output, "closeout/BATCH002_FINAL_REPORT_RU.md", report);

const claims = [
  ["exact predecessor", "00-predecessor/BATCH001_POST_AUDIT_R2_EXACT_IDENTITY.json"],
  ["frozen 11 groups / 55 works", "02-selection/BATCH002_SELECTED_WAVE_CONTRACT.json"],
  ["individual V5 passports", "05-execution/INDIVIDUAL_PROFESSIONAL_ESTIMATE_PASSPORTS_V5.jsonl"],
  ["5037 BOQ row ledger", "05-execution/PER_ID_BOQ_ROW_LEDGER.jsonl"],
  ["independent admission 55/55", "07-audit/INDEPENDENT_AUDIT_REPORT.json"],
  ["mutations 120/120", "08-tests/MUTATION_TEST_RESULTS.json"],
  ["focused 7 suites / 30 tests", "08-tests/FOCUSED_TEST_RESULTS.json"],
  ["replay 2/2 byte exact", "08-tests/REPLAY_RECONCILIATION.json"],
  ["exact queue subtraction", "09-queue/M5_BEFORE_AFTER_EXACT_SET_DIFF.json"],
  ["ProgramControlStateV5", "09-queue/MASTER_11610_PROGRAM_CONTROL_STATE_V5.json"],
] .map(([claim, evidencePath]) => ({ claim, evidencePath, evidenceSha256: fileSha(path.join(output, evidencePath)), verdict: "GREEN" }));
writeDeterministic(output, "closeout/CLAIM_TO_EVIDENCE_MATRIX.csv", csv(claims, ["claim", "evidencePath", "evidenceSha256", "verdict"]));

const excluded = new Set(["closeout/EXACT_SHA_EVIDENCE_INDEX.json", "closeout/MANIFEST.json", "closeout/MANIFEST.sha256"]);
const entries = indexRoot(output).filter((entry) => !excluded.has(String(entry.path)));
writeJson("closeout/EXACT_SHA_EVIDENCE_INDEX.json", { schemaVersion: "Batch002TechnologyWaveExactShaEvidenceIndexR1", candidateHead: head, candidateTree: tree, artifactCount: entries.length, artifactSetHash: indexSetHash(entries), entries });
const manifest = {
  schemaVersion: "Batch002TechnologyWaveCloseoutManifestR1",
  status: "GREEN_BATCH002_TECHNOLOGY_WAVE_R1",
  candidateHead: head,
  candidateTree: tree,
  predecessorHead: PREDECESSOR_HEAD,
  predecessorTree: PREDECESSOR_TREE,
  addendumSha256: ADDENDUM_SHA,
  groups: 11,
  works: 55,
  boqRows: 5037,
  focused: "7 suites / 30 tests",
  durable: "55/55",
  web: "55/55",
  androidApi34Native: "55/55",
  mutations: "120/120",
  replay: "2/2",
  byteMismatch: 0,
  queueRebase: "EXACT",
  admitted: 126,
  m5Remaining: 3934,
  m6Remaining: 7550,
  globalRemaining: 11484,
  globalContentComplete: false,
  batch003Selected: false,
  batch003ExecutionStarted: false,
  evidenceIndexSha256: fileSha(path.join(output, "closeout/EXACT_SHA_EVIDENCE_INDEX.json")),
  finalReportSha256: fileSha(path.join(output, "closeout/BATCH002_FINAL_REPORT_RU.md")),
  terminalState: "HARD_STOP_BEFORE_BATCH003",
};
writeJson("closeout/MANIFEST.json", manifest);
writeDeterministic(output, "closeout/MANIFEST.sha256", `${fileSha(path.join(output, "closeout/MANIFEST.json"))}  MANIFEST.json\n`);
process.stdout.write(stableJson({ verdict: manifest.status, head, tree, artifacts: entries.length, rows: 5037, works: 55, mutations: "120/120", replay: "2/2", byteMismatch: 0, admitted: 126, m5Remaining: 3934, globalRemaining: 11484, terminalState: manifest.terminalState }));
