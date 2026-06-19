import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export type ReleaseFingerprints = {
  sourceTreeHash: string;
  nativeBuildFingerprint: string;
  jsBundleFingerprint: string;
  proofHarnessFingerprint: string;
};

export const RELEASE_PIPELINE_ARTIFACT_DIR = path.join(
  process.cwd(),
  "artifacts",
  "S_RELEASE_PIPELINE_STABILIZATION",
);

export const SOURCE_TREE_PATTERNS = [
  "app",
  "src",
  "assets",
  "package.json",
  "package-lock.json",
  "app.json",
  "app.config.js",
  "app.config.ts",
  "babel.config.js",
  "babel.config.ts",
  "metro.config.js",
  "metro.config.ts",
] as const;

export const NATIVE_BUILD_PATTERNS = [
  "android",
  "package-lock.json",
  "package.json",
  "app.json",
  "app.config.js",
  "app.config.ts",
] as const;

export const JS_BUNDLE_PATTERNS = [
  "app",
  "src",
  "assets",
  "babel.config.js",
  "babel.config.ts",
  "metro.config.js",
  "metro.config.ts",
] as const;

export const PROOF_HARNESS_PATTERNS = [
  "scripts/e2e",
  "scripts/release",
  "tests/e2e",
] as const;

type FingerprintPayload = {
  name: keyof ReleaseFingerprints;
  patterns: readonly string[];
  files: Array<{ path: string; sha256: string; bytes: number }>;
  hash: string;
};

function normalizePath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.\//, "");
}

function gitLsFiles(patterns: readonly string[]): string[] {
  const result = spawnSync("git", ["ls-files", "-z", "--", ...patterns], {
    cwd: process.cwd(),
    encoding: "buffer",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw new Error(result.stderr.toString("utf8").trim() || "git ls-files failed");
  }
  return result.stdout
    .toString("utf8")
    .split("\0")
    .map((item) => normalizePath(item.trim()))
    .filter(Boolean)
    .sort();
}

function sha256(buffer: Buffer | string): string {
  return createHash("sha256").update(buffer).digest("hex");
}

function fingerprint(name: keyof ReleaseFingerprints, patterns: readonly string[]): FingerprintPayload {
  const files = gitLsFiles(patterns).map((relativePath) => {
    const absolutePath = path.join(process.cwd(), relativePath);
    const bytes = fs.readFileSync(absolutePath);
    return {
      path: relativePath,
      sha256: sha256(bytes),
      bytes: bytes.length,
    };
  });
  const manifest = files.map((file) => `${file.path}\0${file.sha256}\0${file.bytes}`).join("\0");
  return {
    name,
    patterns: [...patterns],
    files,
    hash: sha256(manifest),
  };
}

export function computeReleaseFingerprintPayloads(): Record<keyof ReleaseFingerprints, FingerprintPayload> {
  return {
    sourceTreeHash: fingerprint("sourceTreeHash", SOURCE_TREE_PATTERNS),
    nativeBuildFingerprint: fingerprint("nativeBuildFingerprint", NATIVE_BUILD_PATTERNS),
    jsBundleFingerprint: fingerprint("jsBundleFingerprint", JS_BUNDLE_PATTERNS),
    proofHarnessFingerprint: fingerprint("proofHarnessFingerprint", PROOF_HARNESS_PATTERNS),
  };
}

export function computeReleaseFingerprints(): ReleaseFingerprints {
  const payloads = computeReleaseFingerprintPayloads();
  return {
    sourceTreeHash: payloads.sourceTreeHash.hash,
    nativeBuildFingerprint: payloads.nativeBuildFingerprint.hash,
    jsBundleFingerprint: payloads.jsBundleFingerprint.hash,
    proofHarnessFingerprint: payloads.proofHarnessFingerprint.hash,
  };
}

export function writeReleaseFingerprintsArtifact(): ReleaseFingerprints {
  const payloads = computeReleaseFingerprintPayloads();
  const fingerprints = computeReleaseFingerprints();
  fs.mkdirSync(RELEASE_PIPELINE_ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(RELEASE_PIPELINE_ARTIFACT_DIR, "fingerprints.json"),
    `${JSON.stringify({
      ...fingerprints,
      payloads,
      fake_green_claimed: false,
    }, null, 2)}\n`,
    "utf8",
  );
  return fingerprints;
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/release/computeReleaseFingerprints.ts")) {
  const shouldWrite = process.argv.includes("--write");
  const fingerprints = shouldWrite ? writeReleaseFingerprintsArtifact() : computeReleaseFingerprints();
  console.log(JSON.stringify(fingerprints, null, 2));
}
