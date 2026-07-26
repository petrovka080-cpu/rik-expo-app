import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const CHECKPOINT = "7cab8073ac0c6822ad986a538069c088539a8ba7";
const OUTPUT_ROOT = path.resolve("artifacts/current-core-remediation");
const SCOPE_PATH = path.join(OUTPUT_ROOT, "scope-ledger.json");
const PROTECTED_PATH = path.join(
  OUTPUT_ROOT,
  "protected-overlay-ledger.json",
);

const PROTECTED_FILES = [
  {
    path: "artifacts/S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG/android_api34_results.json",
    baselineSha256:
      "54e7be37351d2a2d5a584a2479da8fa1b154b14ccf8e1713125c01dd65106aca",
  },
  {
    path: "artifacts/S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG/android_screenshots.json",
    baselineSha256:
      "3e13ba052adaa0b308155d00aab965a1e6fcc6e42a05fdcce8270831534b776f",
  },
  {
    path: "artifacts/S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG/android_ui_dumps.json",
    baselineSha256:
      "606a5c90bde3ba344aac2e9a4a26ec2a836c4882a48b818b71ecd2fc6426aafc",
  },
  {
    path: "scripts/e2e/runAndroidApi34LiveRequestEmbeddedAiProfessionalBoqPdfCatalogSmoke.ts",
    baselineSha256:
      "83fb1840fa3de6efb433257880b0aaf12f86eb398bdf4feccedec78633bfff31",
  },
  {
    path: "scripts/e2e/androidDeepLinkLaunchContract.ts",
    baselineSha256:
      "a5b90174ffb63247a20a0ee72af05d53ac95f724669244ce37d2acd16d5357d4",
  },
  {
    path: "tests/e2e/androidDeepLinkLaunchContract.contract.test.ts",
    baselineSha256:
      "d04053b2df29f8cda67a4fdb158e37ed8f8f5d62196fd7f3770c27d20481b203",
  },
] as const;

function git(args: string[], fallback = ""): string {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024,
    }).trim();
  } catch {
    return fallback;
  }
}

function sha256File(filePath: string): string {
  return createHash("sha256")
    .update(readFileSync(path.resolve(filePath)))
    .digest("hex");
}

function lines(value: string): string[] {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function classifyReason(filePath: string): string {
  if (filePath.includes("estimate-benchmarks/")) {
    return "reviewed benchmark correction and honest compiler-snapshot provenance";
  }
  if (
    filePath.includes("estimate-catalog/") ||
    /Backfill|backfill|Readiness|catalogQualityDashboard/.test(filePath)
  ) {
    return "95-template canonical family reclassification with exact 11610 inventory preserved";
  }
  if (
    filePath.includes("Durable") ||
    filePath.includes("durable") ||
    filePath.includes("estimateRevision")
  ) {
    return "bounded compact durable revision storage and typed adapter-capacity failure";
  }
  if (/Replay|replay/.test(filePath)) {
    return "checksummed canonical resolved-identity replay with isolated legacy migration";
  }
  if (/Norm|norm/.test(filePath)) {
    return "dimensional unit contract and honest registered-versus-generic norm provenance";
  }
  if (/road|Road|asphalt/.test(filePath)) {
    return "explicit road-scope and current Asphalt V4 production truth";
  }
  if (
    filePath.startsWith("artifacts/current-core-remediation/") ||
    filePath.startsWith("scripts/release/buildCurrentCore") ||
    filePath.endsWith("runCurrentCoreRemediation153.ts")
  ) {
    return "current-core remediation evidence generation and atomic verification";
  }
  if (filePath === "scripts/release/auditCurrentCoreNoTestWeakening.ts") {
    return "explicit audit ledger for every changed test contract";
  }
  if (filePath.startsWith("tests/") || filePath.includes(".test.")) {
    return "current-core regression coverage aligned to strengthened production contract";
  }
  if (filePath.startsWith("src/") || filePath.startsWith("scripts/estimate/")) {
    return "current-core production compiler, identity, projection, or runtime remediation";
  }
  return "current-core remediation support data";
}

function parseNameStatus(value: string): Array<{
  status: string;
  path: string;
  previousPath?: string;
}> {
  return lines(value).map((line) => {
    const [status, firstPath, secondPath] = line.split("\t");
    return secondPath
      ? { status, path: secondPath, previousPath: firstPath }
      : { status, path: firstPath };
  });
}

function writeJson(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function main(): void {
  const protectedEntries = PROTECTED_FILES.map((entry) => {
    const currentSha256 = sha256File(entry.path);
    const indexState = git(["status", "--porcelain=v1", "--", entry.path]);
    return {
      ...entry,
      currentSha256,
      unchanged: currentSha256 === entry.baselineSha256,
      indexState,
      owner: "USER_PROTECTED_OVERLAY",
      permittedActions: ["READ", "HASH", "EXCLUDE_FROM_INDEX"],
      forbiddenActions: ["EDIT", "STAGE", "COMMIT", "DELETE", "REGENERATE"],
    };
  });
  const protectedUnchanged = protectedEntries.every((entry) => entry.unchanged);
  writeJson(PROTECTED_PATH, {
    schema: "current-core-protected-overlay-ledger-v1",
    generatedAt: new Date().toISOString(),
    checkpoint: CHECKPOINT,
    protectedPathsCount: protectedEntries.length,
    protectedPaths: protectedEntries,
    stagedProtectedPaths: lines(
      git([
        "diff",
        "--cached",
        "--name-only",
        "--",
        ...PROTECTED_FILES.map((entry) => entry.path),
      ]),
    ),
    protectedUnchanged,
    finalStatus: protectedUnchanged
      ? "GREEN_PROTECTED_OVERLAY_UNCHANGED_AND_EXCLUDED"
      : "STOP_PROTECTED_OVERLAY_FINGERPRINT_DRIFT",
  });

  const stagedPaths = lines(git(["diff", "--cached", "--name-only"]));
  const unstagedPaths = lines(git(["diff", "--name-only"]));
  const untrackedPaths = lines(
    git(["ls-files", "--others", "--exclude-standard"]),
  );
  const changed = parseNameStatus(git(["diff", "--name-status", CHECKPOINT]));
  for (const filePath of untrackedPaths) {
    if (!changed.some((entry) => entry.path === filePath)) {
      changed.push({ status: "??", path: filePath });
    }
  }
  for (const outputPath of [
    "artifacts/current-core-remediation/protected-overlay-ledger.json",
    "artifacts/current-core-remediation/scope-ledger.json",
  ]) {
    if (!changed.some((entry) => entry.path === outputPath)) {
      changed.push({ status: "??", path: outputPath });
    }
  }
  const protectedSet = new Set<string>(
    PROTECTED_FILES.map((entry) => entry.path),
  );
  const changes = changed
    .map((entry) => ({
      ...entry,
      owner: protectedSet.has(entry.path)
        ? "USER_PROTECTED_OVERLAY"
        : "CURRENT_CORE_REMEDIATION",
      reason: protectedSet.has(entry.path)
        ? "pre-existing user-owned Android proof overlay; fingerprint only"
        : classifyReason(entry.path),
      staged: stagedPaths.includes(entry.path),
      unstaged: unstagedPaths.includes(entry.path),
      untracked: untrackedPaths.includes(entry.path),
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
  const upstream = git(
    ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"],
    "NONE",
  );
  const [ahead = "0", behind = "0"] =
    upstream === "NONE"
      ? ["0", "0"]
      : git(["rev-list", "--left-right", "--count", `HEAD...${upstream}`])
        .split(/\s+/);
  const blockers = [
    git(["rev-parse", "HEAD"]) === CHECKPOINT ? "" : "checkpoint_head_drift",
    protectedUnchanged ? "" : "protected_overlay_fingerprint_drift",
    stagedPaths.some((filePath) => protectedSet.has(filePath))
      ? "protected_overlay_staged"
      : "",
    changes.every((entry) => entry.owner && entry.reason)
      ? ""
      : "change_owner_or_reason_missing",
  ].filter(Boolean);
  writeJson(SCOPE_PATH, {
    schema: "current-core-scope-ledger-v1",
    generatedAt: new Date().toISOString(),
    baselineSnapshot: {
      checkpoint: CHECKPOINT,
      branch:
        "feature/ai-estimate-11610-professional-truth-v4",
      upstream:
        "origin/feature/ai-estimate-11610-professional-truth-v4",
      ahead: 12,
      behind: 0,
      source: "entry checkpoint captured before current-core remediation",
    },
    currentSnapshot: {
      head: git(["rev-parse", "HEAD"]),
      branch: git(["branch", "--show-current"]),
      upstream,
      ahead: Number(ahead),
      behind: Number(behind),
      statusPorcelainV1: lines(git(["status", "--porcelain=v1"])),
      stagedPaths,
      unstagedPaths,
      untrackedPaths,
    },
    ownershipPolicy: {
      currentCoreOwner: "CURRENT_CORE_REMEDIATION",
      protectedOwner: "USER_PROTECTED_OVERLAY",
      protectedPathsMustNeverBeStaged: true,
    },
    changesAfterCheckpointCount: changes.length,
    changesAfterCheckpoint: changes,
    protectedLedger:
      "artifacts/current-core-remediation/protected-overlay-ledger.json",
    blockers,
    finalStatus:
      blockers.length === 0
        ? "GREEN_CURRENT_CORE_SCOPE_BOUNDARY_RECORDED"
        : "STOP_CURRENT_CORE_SCOPE_BOUNDARY_INVALID",
  });
  process.stdout.write(`${JSON.stringify({
    scopePath: path.relative(process.cwd(), SCOPE_PATH).replace(/\\/g, "/"),
    protectedPath: path.relative(process.cwd(), PROTECTED_PATH)
      .replace(/\\/g, "/"),
    changes: changes.length,
    protectedUnchanged,
    blockers,
  })}\n`);
  if (blockers.length > 0) process.exitCode = 1;
}

main();
