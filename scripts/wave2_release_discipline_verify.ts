import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  type ReleaseLedger,
  evaluateReleaseDiscipline,
  normalizeRepoPath,
} from "./_shared/wave2ReleaseDiscipline";

const projectRoot = process.cwd();
const defaultLedgerPath = "artifacts/release-ledgers/wave2-operational-hardening-subphase1.json";

const readJson = <T,>(relativePath: string): T =>
  JSON.parse(fs.readFileSync(path.join(projectRoot, relativePath), "utf8")) as T;

const writeJson = (relativePath: string, payload: unknown) => {
  const fullPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
};

const writeText = (relativePath: string, payload: string) => {
  const fullPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, payload, "utf8");
};

const run = (file: string, args: string[]) => {
  const result = spawnSync(file, args, { cwd: projectRoot, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr || `${file} ${args.join(" ")} failed`);
  }
  return result.stdout.trim();
};

const listTrackedPaths = () =>
  run("git", ["ls-files"])
    .split(/\r?\n/)
    .map(normalizeRepoPath)
    .filter(Boolean);

const listDirtyPaths = () =>
  (spawnSync("git", ["status", "--short", "--untracked-files=all"], {
    cwd: projectRoot,
    encoding: "utf8",
  }).stdout || "")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => ({
      gitCode: line.slice(0, 2),
      path: normalizeRepoPath(line.slice(3)),
    }))
    .filter((entry) => entry.path);

function main() {
  const ledgerArg = process.argv[2];
  const ledgerPath = normalizeRepoPath(ledgerArg || defaultLedgerPath);
  const ledger = readJson<ReleaseLedger>(ledgerPath);
  const tracked = new Set(listTrackedPaths());
  const dirtyPaths = listDirtyPaths();
  const existingPaths = new Set([
    ...tracked,
    ...dirtyPaths.map((entry) => entry.path),
    "artifacts/release-discipline-summary.json",
    "artifacts/release-discipline-proof.md",
  ]);
  const evaluation = evaluateReleaseDiscipline(ledger, dirtyPaths, existingPaths);
  const branch = run("git", ["branch", "--show-current"]);

  const summary = {
    generatedAt: new Date().toISOString(),
    batchName: ledger.batchName,
    ledgerPath,
    branch,
    status: evaluation.greenDefinitionSatisfied && ledger.honestStatus === "GREEN" ? "GREEN" : "NOT GREEN",
    greenDefinitionSatisfied: evaluation.greenDefinitionSatisfied,
    honestStatus: ledger.honestStatus,
    ledgerMissingFields: evaluation.ledgerMissingFields,
    missingRequiredProofs: evaluation.missingRequiredProofs,
    releaseMappingValid: evaluation.releaseMappingValid,
    worktree: {
      dirtyCount: dirtyPaths.length,
      dirtyAssessments: evaluation.dirtyAssessments,
      unaccountedDirtyPaths: evaluation.unaccountedDirtyPaths,
      forbiddenLocalOnlyPaths: evaluation.forbiddenLocalOnlyPaths,
      unknownDirtyPaths: evaluation.unknownDirtyPaths,
    },
    requiredProofArtifacts: ledger.proofArtifacts.required,
    knownExclusions: ledger.knownExclusions,
    exactTestCommands: ledger.exactTestCommands,
    exactScriptsVerifiers: ledger.exactScriptsVerifiers,
    exactChangedFiles: ledger.exactChangedFiles,
    exactSqlMigrations: ledger.exactSqlMigrations,
    ota: ledger.ota,
  };

  const proof = [
    "# Release Discipline Proof",
    "",
    `- Batch: \`${ledger.batchName}\``,
    `- Ledger: \`${ledgerPath}\``,
    `- Branch: \`${branch}\``,
    `- Final release-discipline status: **${summary.status}**`,
    "",
    "## GREEN definition checks",
    `- Ledger fields complete: ${evaluation.ledgerMissingFields.length === 0 ? "yes" : "no"}`,
    `- Required proofs present: ${evaluation.missingRequiredProofs.length === 0 ? "yes" : "no"}`,
    `- Release mapping valid: ${evaluation.releaseMappingValid ? "yes" : "no"}`,
    `- Unaccounted dirty paths: ${evaluation.unaccountedDirtyPaths.length}`,
    `- Forbidden local-only paths: ${evaluation.forbiddenLocalOnlyPaths.length}`,
    `- Unknown dirty paths: ${evaluation.unknownDirtyPaths.length}`,
    "",
    "## Worktree discipline",
    `- Dirty entries scanned: ${dirtyPaths.length}`,
    `- Known exclusions declared: ${ledger.knownExclusions.length}`,
    "",
    "## Required proof artifacts",
    ...ledger.proofArtifacts.required.map((artifact) => `- \`${artifact}\``),
    "",
    "## Known exclusions",
    ...(ledger.knownExclusions.length > 0
      ? ledger.knownExclusions.map((entry) => `- \`${entry.path}\` (${entry.classification}): ${entry.reason}`)
      : ["- none"]),
    "",
    "## Release mapping",
    `- commitSha: \`${ledger.commitSha ?? "null"}\``,
    `- pushTarget: \`${ledger.pushTarget ?? "null"}\``,
    `- ota.published: \`${String(ledger.ota.published)}\``,
    `- ota.development: \`${ledger.ota.development ?? "null"}\``,
    `- ota.preview: \`${ledger.ota.preview ?? "null"}\``,
    `- ota.production: \`${ledger.ota.production ?? "null"}\``,
    `- ota.note: \`${ledger.ota.note ?? "null"}\``,
    "",
  ].join("\n");

  writeJson("artifacts/release-discipline-summary.json", summary);
  writeText("artifacts/release-discipline-proof.md", proof);
  console.log(JSON.stringify(summary, null, 2));

  if (!evaluation.greenDefinitionSatisfied) {
    process.exitCode = 1;
  }
}

main();
