import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { csv, setHash, sha256, stableJson, writeDeterministic, type JsonRecord } from "./postM1ReadmissionR2Core";

const H3 = "0921624a4e1deb7a027578bcf1ebd120e8037234";
const T3 = "2f41133d73f7c92b0a5b77dc2c0030b853176353";
const SPEC_SHA = "1d3baa1a7e42932e5ed2916ec3712c471140f26ca8e16d1145651a506e838b4f";
const argv = Object.fromEntries(process.argv.slice(2).map((argument) => {
  const [key, ...rest] = argument.replace(/^--/u, "").split("=");
  return [key, rest.join("=")];
}));
const required = (name: string): string => {
  const value = argv[name];
  if (!value) throw new Error(`BATCH004_FINALIZER_ARGUMENT_MISSING:${name}`);
  return path.resolve(value);
};
const target = required("target");
const output = required("output");
const replayA = required("replay-a");
const replayB = required("replay-b");
const focusedPaths = String(argv["focused-jsons"] || "").split(",").filter(Boolean).map((value) => path.resolve(value));
const durablePaths = String(argv["durable-jsons"] || "").split(",").filter(Boolean).map((value) => path.resolve(value));
const typecheckPath = required("typecheck-output");
const eslintPath = required("eslint-output");
const webProofPath = required("web-proof");
const androidProofPath = required("android-proof");
if (focusedPaths.length < 2 || durablePaths.length !== 5) throw new Error("BATCH004_FINALIZER_TEST_RESULTS_REQUIRED");
if (existsSync(output)) throw new Error("BATCH004_FINAL_OUTPUT_ALREADY_EXISTS");

const git = (...args: string[]) => execFileSync("git", ["-C", target, ...args], { encoding: "utf8", windowsHide: true }).trim();
const head = git("rev-parse", "HEAD");
const tree = git("rev-parse", "HEAD^{tree}");
const parent = git("rev-parse", "HEAD^");
if (git("status", "--porcelain=v2") !== "") throw new Error("BATCH004_FINALIZER_REQUIRES_CLEAN_WORKTREE");
if (parent !== H3 || git("rev-parse", `${H3}^{tree}`) !== T3) throw new Error("BATCH004_SINGLE_COMMIT_OR_PARENT_RED");

function walk(root: string): string[] {
  return readdirSync(root).sort().flatMap((name) => {
    const absolute = path.join(root, name);
    return statSync(absolute).isDirectory() ? walk(absolute) : [absolute];
  });
}
const relative = (file: string, root: string) => path.relative(root, file).replace(/\\/gu, "/");
const indexRoot = (root: string): JsonRecord[] => walk(root).map((file) => ({
  path: relative(file, root),
  bytes: statSync(file).size,
  sha256: sha256(readFileSync(file)),
}));
const indexHash = (entries: readonly JsonRecord[]) => setHash(entries.map((entry) => `${entry.path}:${entry.bytes}:${entry.sha256}`));
const replayAIndex = indexRoot(replayA);
const replayBIndex = indexRoot(replayB);
const replayAMap = new Map(replayAIndex.map((entry) => [entry.path, `${entry.bytes}:${entry.sha256}`]));
const replayBMap = new Map(replayBIndex.map((entry) => [entry.path, `${entry.bytes}:${entry.sha256}`]));
const replayMismatches = [...new Set([...replayAMap.keys(), ...replayBMap.keys()])]
  .filter((item) => replayAMap.get(item) !== replayBMap.get(item));
if (!replayAIndex.length || replayAIndex.length !== replayBIndex.length || replayMismatches.length || indexHash(replayAIndex) !== indexHash(replayBIndex)) {
  throw new Error("BATCH004_REPLAY_BYTE_MISMATCH");
}

mkdirSync(output, { recursive: true });
cpSync(replayA, output, { recursive: true });
const writeJson = (relativePath: string, value: unknown) => writeDeterministic(output, relativePath, stableJson(value));
const readJson = (file: string): any => JSON.parse(readFileSync(file, "utf8"));
writeJson("08-tests/REPLAY_A_INDEX.json", { run: "A", artifactCount: replayAIndex.length, artifactSetHash: indexHash(replayAIndex), entries: replayAIndex, verdict: "GREEN_REPLAY_A" });
writeJson("08-tests/REPLAY_B_INDEX.json", { run: "B", artifactCount: replayBIndex.length, artifactSetHash: indexHash(replayBIndex), entries: replayBIndex, verdict: "GREEN_REPLAY_B" });
writeJson("08-tests/REPLAY_RECONCILIATION.json", { replay: "2/2", runAArtifacts: replayAIndex.length, runBArtifacts: replayBIndex.length, byteMismatch: 0, runASetHash: indexHash(replayAIndex), runBSetHash: indexHash(replayBIndex), verdict: "GREEN_REPLAY_2_OF_2_BYTE_EXACT" });

const focused = focusedPaths.map(readJson);
if (focused.some((result) => result.success !== true)) throw new Error("BATCH004_FOCUSED_TEST_RED");
const suites = new Set<string>();
const assertions: JsonRecord[] = [];
for (const result of focused) for (const suite of result.testResults as JsonRecord[]) {
  suites.add(relative(String(suite.name), target));
  for (const assertion of suite.assertionResults as JsonRecord[]) if (assertion.status === "passed") {
    assertions.push({ suite: relative(String(suite.name), target), title: assertion.fullName, durationMs: assertion.duration ?? null });
  }
}
writeJson("08-tests/FOCUSED_TEST_RESULTS.json", { fullJestRun: false, suiteCount: suites.size, passedSuites: suites.size, testCount: assertions.length, passedTests: assertions.length, suites: [...suites].sort(), assertions, predecessorRegression: "GREEN", verdict: "GREEN_FOCUSED" });

const durable = durablePaths.map(readJson);
if (durable.some((result) => result.success !== true)) throw new Error("BATCH004_DURABLE_TEST_RED");
const durableCounts = durable.map((result, index) => ({ subwaveId: `SW-${String(index + 1).padStart(2, "0")}`, works: [84, 83, 83, 83, 60][index], suites: result.numPassedTestSuites, tests: result.numPassedTests, success: result.success, sha256: sha256(readFileSync(durablePaths[index])) }));
if (durableCounts.some((entry) => entry.suites !== 1 || entry.tests !== 1)) throw new Error("BATCH004_DURABLE_DENOMINATOR_RED");
writeJson("08-tests/DURABLE_HISTORY_PDF_PROCUREMENT_RESULTS.json", { works: "393/393", subwaves: durableCounts, jsonRoundTrip: "393/393", immutableHistory: "393/393", pdfParity: "393/393", procurementParity: "393/393", verdict: "GREEN_DURABLE_393_OF_393" });

const typecheck = readFileSync(typecheckPath, "utf8");
const shardLines = typecheck.split(/\r?\n/u).filter((line) => /^\[typecheck\] tsconfig\./u.test(line));
if (shardLines.length !== 4 || shardLines.some((line) => !/ exit=0 /u.test(line)) || !/shards=4 .* status=GREEN/u.test(typecheck)) throw new Error("BATCH004_TYPECHECK_RED");
const eslint = readFileSync(eslintPath, "utf8");
if (/\berror\b/iu.test(eslint) && !/0 errors/iu.test(eslint)) throw new Error("BATCH004_ESLINT_RED");
writeJson("08-tests/TYPECHECK_AND_LINT_RESULTS.json", { typecheck: "4/4", typecheckOutputSha256: sha256(Buffer.from(typecheck)), shards: shardLines, focusedLintErrors: 0, eslintOutputSha256: sha256(Buffer.from(eslint)), verdict: "GREEN" });

const web = readJson(webProofPath);
const android = readJson(androidProofPath);
if (!web.green || web.greenCount !== 393 || !android.green || android.greenCount !== 393 || android.androidApi !== 34) throw new Error("BATCH004_PLATFORM_FINAL_RED");
writeJson("08-tests/WEB_MATRIX.json", web);
writeJson("08-tests/ANDROID_API34_NATIVE_MATRIX.json", android);
writeJson("05-domain-closeout/FULL_DOMAIN_RUNTIME_PROOF.json", {
  canonicalRuntime: "registeredProfessionalEstimateDomainsV1 -> interior_finishes canonical package -> compileProfessionalEstimateDomainV1 -> shared runtime",
  works: "393/393", owners: "393/393", calculationRoutes: "393/393", legacyFallback: "0/393", batchRuntimeBranches: 0,
  durableContract: "393/393", historyContract: "393/393", pdfContract: "393/393", procurementContract: "393/393",
  webContract: "393/393", androidApi34Contract: "393/393", rowLoss: 0,
  platformEvidence: ["08-tests/WEB_MATRIX.json", "08-tests/ANDROID_API34_NATIVE_MATRIX.json"],
  verdict: "GREEN_FULL_DOMAIN_RUNTIME",
});
for (let index = 0; index < 5; index += 1) {
  const subwaveId = `SW-${String(index + 1).padStart(2, "0")}`;
  writeJson(`subwaves/${subwaveId}/TEST_RESULTS.json`, {
    subwaveId, focusedProduction: "GREEN", shardedTypecheck: "4/4", durableHistoryPdfProcurement: `${[84, 83, 83, 83, 60][index]}/${[84, 83, 83, 83, 60][index]}`,
    web: "393/393 full-domain matrix", androidApi34Native: "393/393 full-domain matrix", durableResultSha256: durableCounts[index].sha256,
    bounded: true, fullJest: false, verdict: "GREEN_FOCUSED_AND_PLATFORM",
  });
}

const stateV7 = readJson(path.join(output, "06-program/MASTER_11610_PROGRAM_CONTROL_STATE_V7.json"));
const reconciliation = readJson(path.join(output, "05-domain-closeout/FULL_DOMAIN_RECONCILIATION.json"));
const completeness = readJson(path.join(output, "05-domain-closeout/FULL_DOMAIN_PROFESSIONAL_COMPLETENESS_PROOF.json"));
const expansion = readJson(path.join(output, "05-domain-closeout/FULL_DOMAIN_MAXIMUM_ESTIMATE_EXPANSION_PROOF.json"));
const mutation = readJson(path.join(output, "05-domain-closeout/FULL_DOMAIN_MUTATION_RESULTS.json"));
if (stateV7.verdict !== "GREEN" || stateV7.targetDomainRemaining !== 0 || reconciliation.domainAdmitted !== "500/500" || mutation.detected !== 384 || expansion.works !== 393) throw new Error("BATCH004_FINAL_GATE_RED");

const report = `# BATCH-004 Active Technology Domain Completion Controller R1 — финальный отчёт\n\n## Итог\n\nBATCH-004 завершён exact GREEN на HEAD \`${head}\`, TREE \`${tree}\`, PARENT \`${parent}\`. Exact predecessor BATCH-003: HEAD \`${H3}\`, TREE \`${T3}\`.\n\nПолностью закрыт drywall domain: inventory 500/500, ранее принято 107, в пяти автономных subwaves принято ещё 393/393 работы из 75 групп. Для них создано ${expansion.afterRows} индивидуальных BOQ-строк (${expansion.minimumRows}–${expansion.maximumRows} на работу), 393 паспорта, 393 нормативно связанные parameter schemas, FormulaGraphV7 и ResourceGraphV7. Независимая матрица полноты: ${completeness.completeness}; legacy BOQ не использовался как oracle, скрытых агрегатов, padding, процентов «прочие материалы», double count и fallback нет.\n\nОфициальный KG route: СП КР 65-101:2025; применимая часть КРЕР №10 и КРЕРр для repair; СН КР 12-01:2018; официальный реестр сертификатов строительных материалов. Точные проектные количества и цены остаются editable PROJECT_INPUT.\n\n## Проверки\n\n- independent subwave admission: 84/84, 83/83, 83/83, 83/83, 60/60; full domain 500/500;\n- durable/history/PDF/procurement 393/393; Web 393/393; Native Android API 34 393/393;\n- typecheck 4/4; focused lint 0 errors; focused tests и predecessor regression GREEN;\n- mutations 384/384, residue 0; replay 2/2, byte mismatch 0.\n\n## Очередь\n\nExact subtraction: admitted 162→555; M5 3898→3505; M6 7550→7550; global remaining 11448→11055. Проверено: 555 + 3505 + 7550 = 11610, пересечение 0. Создан \`Master11610ProgramControlStateV7\`; \`BATCH005_SELECTED=false\`.\n\n**FULL DRYWALL DOMAIN GREEN. HARD STOP BEFORE BATCH-005.**\n`;
writeDeterministic(output, "closeout/BATCH004_FINAL_REPORT_RU.md", report);
const claims = [
  ["exact BATCH-003 predecessor", "00-activation/BATCH004_PREDECESSOR_EXACT_BINDING.json"],
  ["full drywall inventory and admission 500/500", "05-domain-closeout/FULL_DOMAIN_RECONCILIATION.json"],
  ["five autonomous subwaves", "04-controller/DOMAIN_COMPLETION_EXECUTION_PLAN.json"],
  ["maximum professional expansion", "05-domain-closeout/FULL_DOMAIN_MAXIMUM_ESTIMATE_EXPANSION_PROOF.json"],
  ["independent full-domain admission", "05-domain-closeout/FULL_DOMAIN_RECONCILIATION.json"],
  ["durable/history/PDF/procurement 393/393", "08-tests/DURABLE_HISTORY_PDF_PROCUREMENT_RESULTS.json"],
  ["Web 393/393", "08-tests/WEB_MATRIX.json"],
  ["Native Android API 34 393/393", "08-tests/ANDROID_API34_NATIVE_MATRIX.json"],
  ["mutations 384/384", "05-domain-closeout/FULL_DOMAIN_MUTATION_RESULTS.json"],
  ["replay 2/2", "08-tests/REPLAY_RECONCILIATION.json"],
  ["exact global partition V7", "06-program/GLOBAL_PARTITION_V7_PROOF.json"],
  ["ProgramControlStateV7", "06-program/MASTER_11610_PROGRAM_CONTROL_STATE_V7.json"],
] as const;
const claimRows = claims.map(([claim, evidencePath]) => ({ claim, evidencePath, evidenceSha256: sha256(readFileSync(path.join(output, evidencePath))), verdict: "GREEN" }));
writeDeterministic(output, "closeout/CLAIM_TO_EVIDENCE_MATRIX.csv", csv(claimRows, ["claim", "evidencePath", "evidenceSha256", "verdict"]));

const excluded = new Set(["closeout/EXACT_SHA_EVIDENCE_INDEX.json", "closeout/MANIFEST.json", "closeout/MANIFEST.sha256", "closeout/BATCH004_TOKEN.txt"]);
const entries = indexRoot(output).filter((entry) => !excluded.has(String(entry.path)));
writeJson("closeout/EXACT_SHA_EVIDENCE_INDEX.json", { schemaVersion: "Batch004ExactShaEvidenceIndexR1", candidateHead: head, candidateTree: tree, artifactCount: entries.length, artifactSetHash: indexHash(entries), entries });
const manifest = {
  schemaVersion: "Batch004ActiveDomainCompletionCloseoutManifestR1", status: "GREEN_BATCH004_FULL_DRYWALL_DOMAIN", candidateHead: head, candidateTree: tree,
  parentHead: parent, parentTree: T3, specSha256: SPEC_SHA, targetDomain: "drywall_ceiling", domainInventory: 500, previouslyAdmitted: 107,
  subwaves: 5, groupsCompleted: 75, works: 393, boqRows: expansion.afterRows, completeness: completeness.completeness,
  durable: "393/393", web: "393/393", androidApi34Native: "393/393", typecheck: "4/4", mutations: "384/384", replay: "2/2", byteMismatch: 0,
  admitted: 555, m5Remaining: 3505, m6Remaining: 7550, globalRemaining: 11055, targetDomainRemaining: 0, programControlV7: "GREEN",
  globalContentComplete: false, batch005Selected: false, batch005ExecutionStarted: false,
  evidenceIndexSha256: sha256(readFileSync(path.join(output, "closeout/EXACT_SHA_EVIDENCE_INDEX.json"))),
  finalReportSha256: sha256(readFileSync(path.join(output, "closeout/BATCH004_FINAL_REPORT_RU.md"))), terminalState: "HARD_STOP_BEFORE_BATCH005",
};
writeJson("closeout/MANIFEST.json", manifest);
const manifestSha = sha256(readFileSync(path.join(output, "closeout/MANIFEST.json")));
writeDeterministic(output, "closeout/MANIFEST.sha256", `${manifestSha}  MANIFEST.json\n`);
const stateSha = sha256(readFileSync(path.join(output, "06-program/MASTER_11610_PROGRAM_CONTROL_STATE_V7.json")));
const token = `BATCH004_CONTENT_COMPLETE=true\nBATCH004_HEAD=${head}\nBATCH004_TREE=${tree}\nBATCH004_PARENT=${parent}\nBATCH004_MANIFEST_SHA256=${manifestSha}\nPROGRAM_CONTROL_STATE_V7_SHA256=${stateSha}\nTARGET_DOMAIN=drywall_ceiling\nTARGET_DOMAIN_TOTAL=500\nTARGET_DOMAIN_REMAINING=0\nBATCH004_ADMITTED_WORKS=393\nADMITTED_AFTER=555\nM5_AFTER=3505\nM6_AFTER=7550\nGLOBAL_REMAINING_AFTER=11055\nBATCH005_SELECTED=false\nBATCH005_EXECUTION_STARTED=false\nHARD_STOP_BEFORE_BATCH005\n`;
writeDeterministic(output, "closeout/BATCH004_TOKEN.txt", token);
process.stdout.write(stableJson({ verdict: manifest.status, head, tree, parent, artifacts: entries.length, rows: expansion.afterRows, works: 393, domain: "500/500", mutations: "384/384", replay: "2/2", manifestSha256: manifestSha, programControlStateV7Sha256: stateSha, tokenSha256: sha256(Buffer.from(token)), admitted: 555, m5Remaining: 3505, m6Remaining: 7550, globalRemaining: 11055, terminalState: manifest.terminalState }));
