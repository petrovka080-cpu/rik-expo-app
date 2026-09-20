import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import { CURRENT_CORE_REMEDIATION_EVIDENCE_PATHS } from "../release/currentCoreRemediationEvidencePrerequisites";

const MASTER_SHA256 =
  "e74148e27e060bf0a36eb02ce7e4e93f4d09746975025113f19d7f5ee1950007";
const SOURCE_ROOT_ENV = "R555_PREDECESSOR_EVIDENCE_SOURCE_ROOT";
const RECEIPT_PATH = path.resolve(
  ".release-runtime/r555/evidence/30_R555_MISSING_PREDECESSOR_EVIDENCE_RESTORE.json",
);

// These files describe a replay of the repository being certified.  Copying
// them from a predecessor checkout would turn a successful run on an older SHA
// into evidence for the current SHA.  They must always be regenerated locally.
const CURRENT_SHA_EVIDENCE_PATHS = new Set([
  "artifacts/S_CURRENT_GREEN_CLAIMS_REPLAY_AUDIT_matrix.json",
  "artifacts/S_CURRENT_GREEN_CLAIMS_REPLAY_AUDIT_ledger.json",
]);

function sha256(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function repositorySha(root: string): string {
  return execFileSync("git", ["-C", root, "rev-parse", "HEAD"], {
    encoding: "utf8",
    windowsHide: true,
  }).trim();
}

const configuredSourceRoot = process.env[SOURCE_ROOT_ENV];
if (!configuredSourceRoot) {
  throw new Error(`R555_PREDECESSOR_EVIDENCE_SOURCE_ROOT_REQUIRED:${SOURCE_ROOT_ENV}`);
}

const sourceRoot = path.resolve(configuredSourceRoot);
const destinationRoot = path.resolve(process.cwd());
if (sourceRoot === destinationRoot) {
  throw new Error("R555_PREDECESSOR_EVIDENCE_SOURCE_MUST_DIFFER_FROM_DESTINATION");
}

const copied: Array<{ path: string; sha256: string; bytes: number }> = [];
const alreadyPresent: string[] = [];
const missingAtSource: string[] = [];
const skippedCurrentShaEvidence: string[] = [];

for (const relativePath of CURRENT_CORE_REMEDIATION_EVIDENCE_PATHS) {
  const normalized = relativePath.replace(/\\/g, "/");
  if (
    normalized !== relativePath ||
    !normalized.startsWith("artifacts/") ||
    normalized.includes("../") ||
    path.isAbsolute(normalized)
  ) {
    throw new Error(`R555_PREDECESSOR_EVIDENCE_PATH_FORBIDDEN:${relativePath}`);
  }

  if (CURRENT_SHA_EVIDENCE_PATHS.has(relativePath)) {
    skippedCurrentShaEvidence.push(relativePath);
    continue;
  }

  const sourcePath = path.join(sourceRoot, relativePath);
  const destinationPath = path.join(destinationRoot, relativePath);
  if (existsSync(destinationPath)) {
    alreadyPresent.push(relativePath);
    continue;
  }
  if (!existsSync(sourcePath)) {
    missingAtSource.push(relativePath);
    continue;
  }

  mkdirSync(path.dirname(destinationPath), { recursive: true });
  copyFileSync(sourcePath, destinationPath);
  const sourceSha = sha256(sourcePath);
  const destinationSha = sha256(destinationPath);
  if (sourceSha !== destinationSha) {
    throw new Error(`R555_PREDECESSOR_EVIDENCE_COPY_HASH_MISMATCH:${relativePath}`);
  }
  copied.push({
    path: relativePath,
    sha256: sourceSha,
    bytes: readFileSync(destinationPath).byteLength,
  });
}

const receipt = {
  schema_version: "rik-expo-app-r555.missing-predecessor-evidence-restore.v1",
  generated_utc: new Date().toISOString(),
  status: "GREEN_MISSING_ONLY_PREDECESSOR_EVIDENCE_RESTORED",
  master_sha256: MASTER_SHA256,
  source_root: sourceRoot.replace(/\\/g, "/"),
  source_repository_sha: repositorySha(sourceRoot),
  destination_root: destinationRoot.replace(/\\/g, "/"),
  destination_repository_sha: repositorySha(destinationRoot),
  policy: {
    allowlist: "CURRENT_CORE_REMEDIATION_EVIDENCE_PATHS",
    missing_only: true,
    overwrite_existing: false,
    predecessor_only: true,
    current_r555_green_credit: false,
    current_sha_replay_evidence_copied: false,
  },
  counts: {
    allowlisted: CURRENT_CORE_REMEDIATION_EVIDENCE_PATHS.length,
    copied: copied.length,
    already_present: alreadyPresent.length,
    missing_at_source: missingAtSource.length,
    skipped_current_sha_evidence: skippedCurrentShaEvidence.length,
    overwritten: 0,
  },
  copied,
  already_present: alreadyPresent,
  missing_at_source: missingAtSource,
  skipped_current_sha_evidence: skippedCurrentShaEvidence,
};

mkdirSync(path.dirname(RECEIPT_PATH), { recursive: true });
writeFileSync(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(receipt.counts)}\n`);
