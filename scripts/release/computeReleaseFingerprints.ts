import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export type ReleaseFingerprints = {
  sourceTreeHash: string;
  nativeBuildFingerprint: string;
  jsBundleFingerprint: string;
  proofHarnessFingerprint: string;
  productSourceHash: string;
  proofHarnessHash: string;
  nativeBuildHash: string;
  candidateHash: string;
  apkBuildKey: string;
  buildProfile: string;
};

export const RELEASE_PIPELINE_ARTIFACT_DIR = path.join(
  process.cwd(),
  "artifacts",
  "S_RELEASE_PIPELINE_RECOVERY",
);

export const RELEASE_PIPELINE_RUNTIME_ROOT = path.join(process.cwd(), ".release-runtime");

export const DEFAULT_ANDROID_BUILD_PROFILE = "release";

export const PRODUCT_SOURCE_PATTERNS = [
  "app",
  "src",
  "components",
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
  "migrations",
  "supabase/migrations",
] as const;

export const SOURCE_TREE_PATTERNS = PRODUCT_SOURCE_PATTERNS;

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
  "components",
  "assets",
  "babel.config.js",
  "babel.config.ts",
  "metro.config.js",
  "metro.config.ts",
] as const;

export const PROOF_HARNESS_PATTERNS = [
  "scripts",
  "tests",
] as const;

const SOURCE_FINGERPRINT_EXCLUDE_PATTERNS = [
  ".tmp_*",
  "android/.gradle",
  "android/.gradle-*",
  "android/build",
  "android/build-*",
  "android/app/build",
  "android/app/build-*",
  "**/.cxx",
  "**/.cache",
  "**/coverage",
  "**/dist",
  "**/node_modules",
  "*.apk",
  "*.aab",
] as const;

export type FingerprintPayload = {
  name: "productSourceHash" | "nativeBuildHash" | "jsBundleFingerprint" | "proofHarnessHash";
  patterns: readonly string[];
  files: Array<{ path: string; sha256: string; bytes: number }>;
  hash: string;
};

export function computeReleaseFingerprintPayload(
  name: FingerprintPayload["name"],
): FingerprintPayload {
  const patterns = name === "productSourceHash"
    ? PRODUCT_SOURCE_PATTERNS
    : name === "nativeBuildHash"
      ? NATIVE_BUILD_PATTERNS
      : name === "jsBundleFingerprint"
        ? JS_BUNDLE_PATTERNS
        : PROOF_HARNESS_PATTERNS;
  return fingerprint(name, patterns);
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.\//, "");
}

function gitSourceFiles(patterns: readonly string[]): string[] {
  const exclusions = SOURCE_FINGERPRINT_EXCLUDE_PATTERNS.map(
    (pattern) => `:(exclude)${pattern}`,
  );
  const result = spawnSync(
    "git",
    [
      "ls-files",
      "--cached",
      "--others",
      "--exclude-standard",
      "-z",
      "--",
      ...patterns,
      ...exclusions,
    ],
    {
    cwd: process.cwd(),
    encoding: "buffer",
    stdio: ["ignore", "pipe", "pipe"],
    },
  );
  if (result.status !== 0) {
    throw new Error(result.stderr.toString("utf8").trim() || "git ls-files failed");
  }
  return Array.from(new Set(result.stdout
    .toString("utf8")
    .split("\0")
    .map((item) => normalizePath(item.trim()))
    .filter(Boolean)))
    .sort();
}

function sha256(buffer: Buffer | string): string {
  return createHash("sha256").update(buffer).digest("hex");
}

function readExistingFile(relativePath: string): Buffer | null {
  const absolutePath = path.join(process.cwd(), relativePath);
  try {
    return fs.readFileSync(absolutePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function compositeHash(parts: readonly string[]): string {
  return sha256(parts.join("\0"));
}

function fingerprint(name: FingerprintPayload["name"], patterns: readonly string[]): FingerprintPayload {
  const files = gitSourceFiles(patterns)
    .map((relativePath) => {
      const bytes = readExistingFile(relativePath);
      if (!bytes) return null;
      return {
        path: relativePath,
        sha256: sha256(bytes),
        bytes: bytes.length,
      };
    })
    .filter((file): file is { path: string; sha256: string; bytes: number } => Boolean(file));
  const manifest = files.map((file) => `${file.path}\0${file.sha256}\0${file.bytes}`).join("\0");
  return {
    name,
    patterns: [...patterns],
    files,
    hash: sha256(manifest),
  };
}

export function computeReleaseFingerprintPayloads(): Record<FingerprintPayload["name"], FingerprintPayload> {
  return {
    productSourceHash: computeReleaseFingerprintPayload("productSourceHash"),
    nativeBuildHash: computeReleaseFingerprintPayload("nativeBuildHash"),
    jsBundleFingerprint: computeReleaseFingerprintPayload("jsBundleFingerprint"),
    proofHarnessHash: computeReleaseFingerprintPayload("proofHarnessHash"),
  };
}

export function computeReleaseFingerprints(): ReleaseFingerprints {
  const payloads = computeReleaseFingerprintPayloads();
  const buildProfile = process.env.RELEASE_ANDROID_BUILD_PROFILE?.trim() || DEFAULT_ANDROID_BUILD_PROFILE;
  const productSourceHash = payloads.productSourceHash.hash;
  const nativeBuildHash = payloads.nativeBuildHash.hash;
  const proofHarnessHash = payloads.proofHarnessHash.hash;
  const candidateHash = compositeHash([productSourceHash, proofHarnessHash, nativeBuildHash]);
  const apkBuildKey = compositeHash([productSourceHash, nativeBuildHash, buildProfile]);
  return {
    sourceTreeHash: productSourceHash,
    nativeBuildFingerprint: nativeBuildHash,
    jsBundleFingerprint: payloads.jsBundleFingerprint.hash,
    proofHarnessFingerprint: proofHarnessHash,
    productSourceHash,
    proofHarnessHash,
    nativeBuildHash,
    candidateHash,
    apkBuildKey,
    buildProfile,
  };
}

export function releasePipelineRuntimeDir(candidateId: string, ...segments: string[]): string {
  return path.join(RELEASE_PIPELINE_RUNTIME_ROOT, candidateId, ...segments);
}

export function writeReleaseFingerprintsArtifact(): ReleaseFingerprints {
  const payloads = computeReleaseFingerprintPayloads();
  const fingerprints = computeReleaseFingerprints();
  const runtimeDir = path.join(RELEASE_PIPELINE_RUNTIME_ROOT, "fingerprints-preview");
  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.writeFileSync(
    path.join(runtimeDir, "fingerprints.json"),
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
