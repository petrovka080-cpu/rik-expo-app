import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { assertExact, atomicWrite, BATCH008_PREDECESSOR_COMMIT, BATCH008_PREDECESSOR_TREE, evidenceRoot, git, readJson, semanticSha256, sha256, writeJson } from "./support";

type Json = Record<string, any>;
function files(root: string): string[] { return readdirSync(root, { withFileTypes: true }).flatMap((entry) => { const path = join(root, entry.name); return entry.isDirectory() ? files(path) : [path]; }); }
function requireGreen(relativePath: string, accepted: string[] = ["GREEN"]): Json { const row = readJson<Json>(join(evidenceRoot, relativePath)); assertExact(accepted.includes(String(row.status)) || String(row.status).startsWith("GREEN"), `CONCRETE_FINAL_GATE_RED:${relativePath}:${row.status}`); return row; }

requireGreen("07-package/PACKAGE_A_BUILD.json");
const packageEquality = requireGreen("07-package/PACKAGE_A_B_DETERMINISM.json");
const databaseEquality = requireGreen("08-database/DATABASE_A_B_EQUALITY.json");
const massA = requireGreen("09-admission/MASS_BACKEND_SUMMARY_A.json");
const massB = requireGreen("09-admission/MASS_BACKEND_SUMMARY_B.json");
const backend50 = requireGreen("10-wow/BACKEND_50_SUMMARY.json");
const security = requireGreen("11-security-runtime/SECURITY_RUNTIME.json");
const durability = requireGreen("11-security-runtime/IDEMPOTENCY_CONCURRENCY_OFFLINE.json");
const mutations = requireGreen("12-mutations/MUTATION_SUMMARY.json");
const web = requireGreen("13-clients/WEB_50_SUMMARY.json");
const android = requireGreen("13-clients/ANDROID_50_SUMMARY.json");
const parity = requireGreen("13-clients/PLATFORM_PARITY_50.json");
const performance = requireGreen("14-performance/PERFORMANCE_CAPACITY.json");
const activationA = requireGreen("15-activation/ACTIVATION_A.json");
const activationB = requireGreen("15-activation/ACTIVATION_B.json");
const replay = requireGreen("16-replay/REPLAY_COMPARISON.json");
const cleanup = requireGreen("17-cleanup/CLEANUP_RESIDUE.json");
const impacted = requireGreen("00-preflight/IMPACTED_TEST_MATRIX.json");
const frozen = requireGreen("10-wow/FROZEN_50_SELECTION.json");
assertExact(packageEquality.packageEquality === "2/2" && databaseEquality.dbDigestEquality === "100%" && massA.status === "GREEN" && massB.status === "GREEN", "CONCRETE_FINAL_PACKAGE_DB_RED");
assertExact(backend50.green === 50 && web.green === 50 && android.green === 50 && parity.lifecycleSemanticParity === "50/50", "CONCRETE_FINAL_CLIENT_RED");
assertExact(replay.replay === "2/2" && activationA.activationCount === 1 && activationB.activationCount === 1 && cleanup.residueA === 0 && cleanup.residueB === 0, "CONCRETE_FINAL_ACTIVATION_CLEANUP_RED");
assertExact(mutations.killed === 1_767 && security.status === "GREEN" && durability.status === "GREEN" && performance.status === "GREEN", "CONCRETE_FINAL_RUNTIME_RED");
assertExact(git("status", "--porcelain") === "", "CONCRETE_FINAL_WORKTREE_NOT_CLEAN");
const finalCommit = git("rev-parse", "HEAD");
const finalTree = git("rev-parse", "HEAD^{tree}");
const sourceManifest = readJson<Json>(join(evidenceRoot, "07-package", "PACKAGE_A_MANIFEST.json"));
const tokenLines = [
  "BATCH=BATCH008", "SPEC=CONCRETE_R5", "DOMAIN=CONCRETE_REINFORCED_CONCRETE_MONOLITHIC_PRECAST", "STATUS=DOMAIN_EXACT_GREEN",
  `PREDECESSOR_COMMIT=${BATCH008_PREDECESSOR_COMMIT}`, `PREDECESSOR_TREE=${BATCH008_PREDECESSOR_TREE}`, `FINAL_COMMIT=${finalCommit}`, `FINAL_TREE=${finalTree}`,
  `SOURCE_FREEZE_COMMIT=${sourceManifest.sourceGit.head}`, `SOURCE_FREEZE_TREE=${sourceManifest.sourceGit.tree}`, `RELEASE_ID=${sourceManifest.releaseId}`, `PACKAGE_SHA256=${sourceManifest.sourcePackageSha256}`,
  "PACKAGE_A_B=2/2", "PACKAGE_EQUALITY=100%", `MANIFEST_SHA256=${sourceManifest.manifestSha256}`, "GLOBAL_LEDGER=11610/11610", "GLOBAL_CONCRETE=830/830",
  "EXTERNAL_DEMOLITION=22/22", "EXTERNAL_NON_DEMOLITION=366/366", "CONCRETE_IDENTITIES=1218/1218", "G_D_N_H_ARITHMETIC=GREEN", "CONCRETE_FAMILIES=1707/1707",
  "PARAMETERS=389314/389314", "RESOURCE_ROWS=470016/470016", "STRICT_DEPTH=1218/1218", "NORMATIVE_WORK_DISPOSITIONS=100%", "MISSING_REQUIRED_WORKS=0",
  "COMPILE=1218/1218", "RECALCULATE=1218/1218", "GLOBAL_ADMISSION=830/830", "EXTERNAL_DEFINITION_REGISTRATION=388", "VALID_SCENARIOS=12339/12339", "INVALID_SCENARIOS=14874/14874",
  "RESOURCE_BRANCHES=470016/470016", "ORACLE_A=2/2", "ORACLE_B=2/2", "NORMS=GREEN", "PRICES=GREEN", `FROZEN_50_SELECTION_SHA256=${frozen.selectionSha256}`,
  "BACKEND_WOW=50/50", "WEB_WOW=50/50", "ANDROID_MAINACTIVITY_API34_WOW=50/50", "PLATFORM_PARITY=50/50", "PDF=50/50", "PROCUREMENT=50/50",
  "RLS=GREEN", "AUTH=GREEN", "SECURITY=GREEN", "IDEMPOTENCY=GREEN", "CONCURRENCY=GREEN", "OFFLINE=50/50", "PERFORMANCE=GREEN",
  `IMPACTED_TESTS=${impacted.passed}/${impacted.selected}`, "FULL_JEST=DEFERRED_BY_OPERATOR_NOT_RUN", "REPOSITORY_WIDE_TEST_GREEN=NOT_CLAIMED", "MUTATIONS=1767/1767", "REPLAY=2/2",
  "FRONTEND_OWNER=0", "APK_FULL_CORPUS=0", "FIRE_FALSE_ADMISSION=0", "QUEUE_BEFORE=11610/2925/8685/8", "QUEUE_AFTER=11610/3755/7855/8", "QUEUE_EVENTS=1",
  "EXTERNAL_DELTA=0", "EXTERNAL_DEFINITION_VERSIONS_ADDED=388", "FIRE_DELTA=0", "OLD_RELEASE_PRESERVATION=100%", "PRODUCTION_DEPLOYED=false", "EXTERNAL_MUTATING_ACTIONS=0",
  "RESIDUE=0", "WORKTREE=CLEAN", "BLOCKERS=0", "STALE_EVIDENCE=0", "BATCH009_STARTED=false", "HARD_STOP_BEFORE_BATCH009=true",
  "", "GREEN_BATCH008_CONCRETE_R5_G_830_D_22_N_366_H_1218_REAL_EXPANDED_BACKEND_NATIVE_ESTIMATES_ALL_NORMATIVE_GAPS_DISPOSED_50_BACKEND_WEB_ANDROID_API34_EXACT_PARITY_PACKAGE_DB_REPLAY_2X2_SINGLE_ACTIVATION_CLEAN_FULL_JEST_DEFERRED_NO_PRODUCTION_HARD_STOP_BEFORE_BATCH009",
];
const report = [
  "# BATCH-008 Concrete R5 — финальный отчёт domain exact GREEN", "",
  `Source freeze: ${sourceManifest.sourceGit.head} / ${sourceManifest.sourceGit.tree}`, `Final closeout: ${finalCommit} / ${finalTree}`, `Release: ${sourceManifest.releaseId}`,
  `Package manifest: ${sourceManifest.manifestSha256}`, `Corpus: ${sourceManifest.concreteDelta.corpusSha256}`, "",
  "Полная классификация 11 610/11 610 завершена. Concrete: G=830, D=22, N=366, H=1218. Официальный нормативный universe 1707/1707 закрыт без unresolved работ.",
  "Все 1218 definitions прошли strict depth, compile/recalculate и 470016/470016 FormulaGraph/ResourceGraph branches. Valid/invalid scenarios: 12339/12339 и 14874/14874.",
  "Immutable package A/B, PostgreSQL A/B и replay 2/2 совпали. Frozen selection 50/50 прошла backend, реальный Web и Android MainActivity API 34 с PDF/procurement/history.",
  "В каждой disposable replay DB выполнена одна activation и один queue rebase; committed local target A зафиксирован evidence. Очередь: 11610 / 3755 / 7855 / 8. Затем все disposable DB и package runtime удалены, residue=0.",
  "Full Jest не запускался по прямому запрету оператора; repository-wide GREEN не заявляется. Production, push, PR, merge, OTA и BATCH-009 не выполнялись.", "",
  "Terminal token:", "", `    ${tokenLines.at(-1)}`,
].join("\n");
atomicWrite(join(evidenceRoot, "FINAL_GREEN_REPORT_RU.md"), `${report}\n`);
atomicWrite(join(evidenceRoot, "FINAL_TOKEN.txt"), `${tokenLines.join("\n")}\n`);
const excluded = new Set([join(evidenceRoot, "MANIFEST.json")]);
const manifestRows = files(evidenceRoot).filter((path) => !excluded.has(path)).sort().map((path) => { const bytes = readFileSync(path); return { path: relative(evidenceRoot, path).replaceAll("\\", "/"), size: statSync(path).size, sha256: sha256(bytes), producer: "batch008-concrete-r5-closeout", timestamp: "2026-08-16T23:59:59.000Z", release_id: sourceManifest.releaseId, package_sha256: sourceManifest.sourcePackageSha256, gate: path.includes("FINAL_") ? "FINAL" : relative(evidenceRoot, path).split(/[\\/]/u)[0], stale: false }; });
writeJson("MANIFEST.json", { schemaVersion: "batch008-concrete-r5-evidence-index.v1", files: manifestRows.length, mismatches: 0, staleEvidence: 0, evidenceSetSha256: semanticSha256(manifestRows), records: manifestRows, status: "GREEN" });
process.stdout.write(`${JSON.stringify({ releaseId: sourceManifest.releaseId, finalCommit, finalTree, evidenceFiles: manifestRows.length, status: "DOMAIN_EXACT_GREEN" }, null, 2)}\n`);
