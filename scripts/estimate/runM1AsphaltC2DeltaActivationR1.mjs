import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync, appendFileSync } from "node:fs";
import path from "node:path";

const HEAD = "0d9bb68c9b438758eba019376f4a0906d3825bd6";
const TREE = "5af5bee6dfff80f6ef71abce9e46ded54d5b262c";
const CURRENT_TOKEN = "RED_M1_ASPHALT_FIVE_P0_REMEDIATION_C2_KG_CONSTRUCTION_NORM_PRIMARY_NOT_LOCATOR_READY_AFFECTED_63_NO_BATCH_NO_EXTERNAL_ACTION";
const DELTA_HASH = "b4929ec8b9a92cb624e20ec4d0bdc4ccc259d237a9aa9777f9c15550c142c543";
const OLD_CLAIMED_HASH = "d69fdbf348f5a34dd8a725fd6a2480b45f70752547eaf3efa01baeba74e24de3";
const OLD_ACTUAL_HASH = "98ba14185f69cdf9f11b78651c1f0edaa50b5f4aad7a1e6045193ac4a8a2df1b";
const argv = Object.fromEntries(process.argv.slice(2).map((argument) => {
  const [key, ...rest] = argument.replace(/^--/u, "").split("=");
  return [key, rest.join("=") || true];
}));
const repoRoot = process.cwd();
const evidenceRoot = path.resolve(String(argv["evidence-root"] ?? path.join(
  ".release-runtime", "master-11610-group-batches-r1", "03-m1-asphalt-five-p0-remediation-r1",
)));
const activatedAtUtc = String(argv["activated-at-utc"] ?? "");
const oldContractFile = path.resolve(String(argv["old-contract"] ?? ""));
const deltaContractFile = path.resolve(String(argv["delta-contract"] ?? ""));
const deltaRoot = path.join(evidenceRoot, "delta-c2");
const journalFile = path.join(evidenceRoot, "JOURNAL.jsonl");

const EXPECTED_UNTRACKED_10 = Object.freeze([
  "scripts/estimate/extractM1AsphaltOfficialPdfTextR1.mjs",
  "scripts/estimate/fetchM1AsphaltOfficialLinkedDocumentsR1.mjs",
  "scripts/estimate/fetchM1AsphaltOfficialSourceSnapshotsR1.mjs",
  "scripts/estimate/fetchM1AsphaltOfficialSupplementalSourceSnapshotsR1.mjs",
  "scripts/estimate/invokeM1AsphaltWindowsOcrR1.ps1",
  "scripts/estimate/renderM1AsphaltOfficialPdfPagesR1.mjs",
  "scripts/estimate/runM1AsphaltOfficialSourceStatusR1.mjs",
  "scripts/estimate/runM1AsphaltRemediationR1ExpectedScope.mjs",
  "scripts/estimate/runM1AsphaltRemediationR1IdentityAndArithmetic.mjs",
  "scripts/estimate/runM1AsphaltRemediationR1RedCloseout.mjs",
]);

const REQUIRED_HASHES = Object.freeze({
  "closeout/MANIFEST.json": "c82eec490dd2d98eb652f0c7489bc5ba776c7442c46dc447c07c5f0fbfe1698a",
  "closeout/EXACT_SHA_EVIDENCE_INDEX.json": "72276f87d9e5ab2ee271bcfc78334e9595e25a6a2aa44e1963d72d60e55bb50d",
  "closeout/M1_ASPHALT_REMEDIATION_FINAL_REPORT.md": "5188a3ca29f4a6d4217339ab50d923868700b4ef2922f3fc3c254d117009c18e",
  "closeout/M1_ASPHALT_REMEDIATION_TOKEN.txt": "67607fb365eda7fba59d425d61400b97dde4c67842abfb03d34163b8848daa52",
  "JOURNAL.jsonl": "a5617c77ceb505e85b411f15a9d24a174b2e70ccdecdcd3478cb6faafa4fa090",
  "identity/M1_R63_GLOBAL55_EXTERNAL8_IDENTITY_LEDGER.csv": "c07463d286b573bb3493c6b40d90aaa81e13a5eddc8be9fb8a0e708a0d52b52f",
  "identity/M1_R63_GLOBAL_DENOMINATOR_PARTITION_PROOF.json": "ccca7ac0c672119bc1e52c5fb6592d47c54e7d4b50dc40f9514cf459a35def6e",
  "program-arithmetic/MASTER_11610_PROGRAM_ARITHMETIC_CORRECTION_MANIFEST.json": "1272a149caab74c140c00640fc26a30fc21a0090faa0987a907bee6a6b14674b",
  "cohorts/R63_REMEDIATION_COHORT_MANIFEST.json": "908b004218ea8bf93a1a76b26e5a6bb665f25ed27072d740e659bf174dda3508",
  "cohorts/R63_EXPECTED_SCOPE_SUMMARY.json": "5963a2d65feefa5785a593cf25aa191ec896d27bae1a8a366484a160360ff641",
  "cohorts/C1_ENABLING_REMOVAL_DRAINAGE_AND_SURFACE_REPAIR/EXPECTED_SCOPE.jsonl": "a7b358be9994d88466d60e0f7f7e289f976b4b6092c14f82447d08e89b406194",
  "cohorts/C2_PLACEMENT_COMPACTION_FINISH_AND_LAYER_ENTRYPOINTS/EXPECTED_SCOPE.jsonl": "a78dbbd3aecb7a72d035599ab676fa6cf3cb827f3d482274c2c07f2aa061c943",
  "cohorts/C3_FULL_ROAD_BRIDGE_PARKING_ACCESS_ASSEMBLIES/EXPECTED_SCOPE.jsonl": "e9d0b2b1c57810db3ae50c75d7546dc891f8683a60f3b8310c817c6bcdf959c2",
});

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function hashFile(file) {
  return sha256(readFileSync(file));
}

function git(...args) {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }).trim();
}

function writeNew(relative, value) {
  const file = path.join(deltaRoot, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  invariant(!existsSync(file), `DELTA_ARTIFACT_ALREADY_EXISTS:${relative}`);
  writeFileSync(file, value, "utf8");
  return file;
}

invariant(activatedAtUtc && !Number.isNaN(Date.parse(activatedAtUtc)), "ACTIVATED_AT_UTC_INVALID");
invariant(existsSync(oldContractFile), "OLD_CONTRACT_FILE_MISSING");
invariant(existsSync(deltaContractFile), "DELTA_CONTRACT_FILE_MISSING");
invariant(git("rev-parse", "HEAD") === HEAD, "CURRENT_HEAD_MISMATCH");
invariant(git("rev-parse", "HEAD^{tree}") === TREE, "CURRENT_TREE_MISMATCH");
invariant(hashFile(oldContractFile) === OLD_ACTUAL_HASH, "OLD_ACTUAL_CONTRACT_HASH_MISMATCH");
invariant(hashFile(deltaContractFile) === DELTA_HASH, "DELTA_CONTRACT_HASH_MISMATCH");

const verifiedInputs = [];
for (const [relative, expectedHash] of Object.entries(REQUIRED_HASHES)) {
  const file = path.join(evidenceRoot, ...relative.split("/"));
  invariant(existsSync(file), `CHECKPOINT_INPUT_MISSING:${relative}`);
  const actualHash = hashFile(file);
  invariant(actualHash === expectedHash, `CHECKPOINT_HASH_MISMATCH:${relative}:${actualHash}`);
  verifiedInputs.push({ path: relative, sha256: actualHash, verdict: "EXACT_REUSED_NOT_REGENERATED" });
}
invariant(readFileSync(path.join(evidenceRoot, "closeout", "M1_ASPHALT_REMEDIATION_TOKEN.txt"), "utf8").trim() === CURRENT_TOKEN, "CURRENT_RED_TOKEN_MISMATCH");

const statusLines = git("status", "--short").split(/\r?\n/u).filter(Boolean);
const statusPaths = statusLines.map((line) => line.slice(3).replaceAll("\\", "/"));
for (const expected of EXPECTED_UNTRACKED_10) invariant(statusLines.includes(`?? ${expected}`), `EXPECTED_UNTRACKED_FILE_MISSING:${expected}`);
const preexistingPaths = statusPaths.filter((entry) => entry !== "scripts/estimate/runM1AsphaltC2DeltaActivationR1.mjs");
invariant(preexistingPaths.length === 10, `PREEXISTING_UNTRACKED_COUNT_MISMATCH:${preexistingPaths.length}`);
invariant(JSON.stringify(preexistingPaths.sort()) === JSON.stringify([...EXPECTED_UNTRACKED_10].sort()), "PREEXISTING_UNTRACKED_SET_MISMATCH");

const inventory = EXPECTED_UNTRACKED_10.map((relative) => {
  const file = path.join(repoRoot, ...relative.split("/"));
  return {
    path: relative,
    size: statSync(file).size,
    sha256: hashFile(file),
    createdByCurrentRemediation: true,
    requiredForContinuation: true,
    classification: "VERSIONED_TOOL",
    finalDisposition: "ADD_TO_EXACT_REMEDIATION_COMMIT",
    reason: "Скрипт создал или проверил immutable evidence R1/R2/R3 и необходим для воспроизводимости delta continuation.",
  };
});

const reconciliation = {
  schemaVersion: "m1-asphalt-c2-autonomous-delta-r1:contract-identity-reconciliation:v1",
  reconciledAtUtc: activatedAtUtc,
  previousClaimedContractSha256: OLD_CLAIMED_HASH,
  actualExecutedAttachmentSha256: OLD_ACTUAL_HASH,
  anyMatch: false,
  executedContractIdentity: OLD_ACTUAL_HASH,
  oldClaimedHashActivationOracleAllowed: false,
  historyRewritten: false,
  deltaContractSha256: DELTA_HASH,
  deltaContractBindingRole: "AUTHORIZED_CONTINUATION_FROM_R3_C2",
  verdict: "GREEN_CONTRACT_IDENTITY_RECONCILED_NO_R0_R2_RESTART",
};
const reconciliationFile = writeNew("REMEDIATION_CONTRACT_IDENTITY_RECONCILIATION.json", `${JSON.stringify(reconciliation, null, 2)}\n`);
const inventoryFile = writeNew("CURRENT_UNTRACKED_10_FILE_INVENTORY.json", `${JSON.stringify({
  schemaVersion: "m1-asphalt-c2-autonomous-delta-r1:current-untracked-inventory:v1",
  capturedAtUtc: activatedAtUtc,
  count: inventory.length,
  files: inventory,
  unrelatedFilesTouched: 0,
  verdict: "GREEN_10_OF_10_CLASSIFIED",
}, null, 2)}\n`);
const activation = {
  schemaVersion: "m1-asphalt-c2-autonomous-delta-r1:activation-current-red-binding:v1",
  activatedAtUtc,
  mode: "CONTINUE_CURRENT_M1_ASPHALT_REMEDIATION_FROM_R3_C2",
  policy: "AUTONOMOUS_RUN_TO_GREEN_WITH_BOUNDED_MANDATORY_TESTS",
  currentHead: HEAD,
  currentTree: TREE,
  currentGate: "R3/C2_OFFICIAL_SOURCE_READINESS",
  currentStatus: "RED_ACCEPTED_AS_CONTINUATION_CHECKPOINT",
  currentToken: CURRENT_TOKEN,
  deltaContractSha256: DELTA_HASH,
  R0R1R2Regenerated: false,
  verifiedReusedInputs: verifiedInputs,
  contractIdentityReconciliation: { path: "delta-c2/REMEDIATION_CONTRACT_IDENTITY_RECONCILIATION.json", sha256: hashFile(reconciliationFile) },
  untrackedInventory: { path: "delta-c2/CURRENT_UNTRACKED_10_FILE_INVENTORY.json", sha256: hashFile(inventoryFile) },
  downstreamStarted: false,
  verdict: "GREEN_DELTA_ACTIVATED_CONTINUE_FROM_R3_C2",
};
const activationFile = writeNew("DELTA_ACTIVATION_AND_CURRENT_RED_BINDING.json", `${JSON.stringify(activation, null, 2)}\n`);

const journal = readFileSync(journalFile, "utf8").trim().split(/\r?\n/u);
invariant(journal.length === 7 && journal.at(-1)?.startsWith("JOURNAL|seq=7|"), "JOURNAL_SEQ7_CHECKPOINT_MISMATCH");
const entry = [
  "JOURNAL", "seq=8", `utc=${activatedAtUtc}`, `head=${HEAD}`, `tree=${TREE}`,
  "gate=R3/C2_DELTA", "route=null", "status=IN_PROGRESS",
  "проверка=Применён автономный delta-контракт; R0–R2 hash-verified и сохранены без перегенерации",
  "найдено=Текущий RED checkpoint exact; contract identity reconciled; 10/10 untracked tooling files классифицированы как VERSIONED_TOOL",
  "affected=R63-001..R63-063/63", "rows=0", "locators=0", "crosswalk=0/693", "durable=2/63", "tests=NOT_STARTED",
  `evidence=delta-c2/DELTA_ACTIVATION_AND_CURRENT_RED_BINDING.json/${hashFile(activationFile)}`,
  "следующее=Проверка допустимых официальных source routes A–D",
].join("|");
appendFileSync(journalFile, `${entry}\n`, "utf8");

process.stdout.write(`${JSON.stringify({
  verdict: activation.verdict,
  head: HEAD,
  tree: TREE,
  deltaContractSha256: DELTA_HASH,
  checkpointInputsVerified: verifiedInputs.length,
  untrackedFilesClassified: inventory.length,
  activationSha256: hashFile(activationFile),
  reconciliationSha256: hashFile(reconciliationFile),
  inventorySha256: hashFile(inventoryFile),
  journalSequence: 8,
  next: "R3_C2_SOURCE_ROUTES_A_TO_D",
}, null, 2)}\n`);
