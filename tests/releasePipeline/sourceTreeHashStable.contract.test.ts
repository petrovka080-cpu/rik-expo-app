import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  computeReleaseFingerprintPayloads,
  computeReleaseFingerprintPayload,
  computeFrontendReleaseFingerprintPayloads,
  computeReleaseFingerprints,
} from "../../scripts/release/computeReleaseFingerprints";

describe("release pipeline source tree hash", () => {
  it("is deterministic for the same source tree", () => {
    const first = computeReleaseFingerprints();
    const second = computeReleaseFingerprints();
    expect(first.sourceTreeHash).toBe(second.sourceTreeHash);
    expect(first.nativeBuildFingerprint).toBe(second.nativeBuildFingerprint);
    expect(first.jsBundleFingerprint).toBe(second.jsBundleFingerprint);
    expect(first.proofHarnessFingerprint).toBe(second.proofHarnessFingerprint);
  });

  it("binds frozen full-jest evidence to proof runners and contracts", () => {
    const files = computeReleaseFingerprintPayloads().proofHarnessHash.files.map((file) => file.path);
    expect(files).toContain("scripts/audit/runEstimateStructuredPipelineUiPdfBindingCloseout.ts");
    expect(files).toContain("tests/requestEstimate/estimateStructuredPipelineUiPdfBindingCloseout.contract.test.ts");
    expect(files).toContain("scripts/release/android/routeToScreenAck.ts");
    expect(files).toContain(
      "tests/e2e/androidOfficialRouteToScreenAck.contract.test.ts",
    );
    expect(files.some((file) => file.startsWith("artifacts/"))).toBe(false);
  });

  it("binds untracked canonical source while excluding generated Android trees", () => {
    const payloads = computeReleaseFingerprintPayloads();
    const productFiles = payloads.productSourceHash.files.map(
      (file) => file.path,
    );
    const nativeFiles = payloads.nativeBuildHash.files.map(
      (file) => file.path,
    );

    expect(productFiles).toContain(
      "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts",
    );
    expect(
      nativeFiles.some(
        (file) =>
          file.startsWith("android/.gradle-") ||
          file.startsWith("android/app/build-"),
      ),
    ).toBe(false);
  });
});

/** A tiny independent Git fixture, never a product checkout or live runtime. */
function withFingerprintFixture<T>(run: (root: string) => T): T {
  const parent = path.resolve(os.tmpdir()), prefix = path.join(parent, "release-fingerprint-fixture-");
  const root = fs.mkdtempSync(prefix);
  const git = (args: string[]) => {
    const result = spawnSync("git", args, { cwd: root, encoding: "utf8", windowsHide: true });
    if (result.status !== 0) throw new Error(result.stderr || "TEST_ONLY_GIT_FIXTURE_FAILED");
  };
  const files: Record<string, string | Buffer> = {
    "app/index.tsx": "export default 'fixture';\n",
    "src/alpha.ts": "export const value = 'AAAA';\n",
    "src/кириллица.ts": "export const привет = 'мир 🌍';\n",
    "src/deleted.ts": "removed after indexing\n",
    "assets/empty.bin": Buffer.alloc(0),
    "assets/binary.dat": Buffer.alloc(64 * 1024 * 2 + 17, 0xab),
    "migrations/one.sql": "select 1;\n",
    "supabase/migrations/two.sql": "select 2;\n",
    "package.json": "{}\n",
    "android/app/src/Main.java": "// native-only fixture\n",
    "scripts/only-proof.ts": "// proof-only fixture\n",
    "tests/only-proof.test.ts": "// proof-only fixture\n",
    "src/dist/generated.js": "excluded generated output\n",
    "src/.cache/generated.js": "excluded generated cache\n",
    "assets/coverage/generated.bin": "excluded coverage\n",
    "src/node_modules/generated.js": "excluded dependency\n",
    ".release-runtime/generated.js": "excluded runtime\n",
    "artifacts/generated.json": "excluded proof artifact\n",
  };
  let cwd: jest.SpyInstance | undefined;
  try {
    git(["init", "--quiet"]);
    for (const [relative, value] of Object.entries(files)) {
      const target = path.join(root, relative);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, value);
    }
    git(["add", "--all", "--force"]);
    fs.unlinkSync(path.join(root, "src/deleted.ts"));
    fs.writeFileSync(path.join(root, "src/untracked.ts"), "// untracked canonical source\n");
    cwd = jest.spyOn(process, "cwd").mockReturnValue(root);
    return run(root);
  } finally {
    cwd?.mockRestore();
    jest.restoreAllMocks();
    // Deletion is limited to the exact directory created by this fixture.
    const resolved = path.resolve(root);
    if (path.dirname(resolved) !== parent || !resolved.startsWith(prefix)) throw new Error("TEST_ONLY_FIXTURE_CLEANUP_OUTSIDE_ROOT");
    fs.rmSync(resolved, { recursive: true, force: true });
  }
}

it("keeps complete legacy product/JS payload bytes for UTF8, binary, empty, tracked, untracked, deleted and excluded fixture paths", () => {
  withFingerprintFixture(() => {
    const product = computeReleaseFingerprintPayload("productSourceHash"), js = computeReleaseFingerprintPayload("jsBundleFingerprint");
    const frontend = computeFrontendReleaseFingerprintPayloads();
    expect(frontend).toEqual({ productSourceHash: product, jsBundleFingerprint: js });
    expect(Object.keys(frontend)).toEqual(["productSourceHash", "jsBundleFingerprint"]);
    expect(product.files.map(file => file.path)).toEqual([
      "app/index.tsx", "assets/binary.dat", "assets/empty.bin", "migrations/one.sql", "package.json",
      "src/alpha.ts", "src/untracked.ts", "src/кириллица.ts", "supabase/migrations/two.sql",
    ]);
    expect(js.files.map(file => file.path)).toEqual([
      "app/index.tsx", "assets/binary.dat", "assets/empty.bin", "src/alpha.ts", "src/untracked.ts", "src/кириллица.ts",
    ]);
    expect(product.files.find(file => file.path === "assets/empty.bin")).toMatchObject({ bytes: 0 });
    expect(product.files.find(file => file.path === "assets/binary.dat")).toMatchObject({ bytes: 64 * 1024 * 2 + 17 });
  });
});

it("reads every overlapping path only once per fresh scan using one bounded buffer, and never reads native/proof-only files", () => {
  withFingerprintFixture(root => {
    const opened = jest.spyOn(fs, "openSync"), reads = jest.spyOn(fs, "readSync"), buffered = jest.spyOn(fs, "readFileSync");
    const first = computeFrontendReleaseFingerprintPayloads();
    const paths = () => opened.mock.calls.map(call => call[0]).filter((value): value is string => typeof value === "string" && value.startsWith(root + path.sep));
    const firstPaths = paths();
    expect(new Set(firstPaths).size).toBe(firstPaths.length);
    expect(firstPaths.filter(value => value === path.join(root, "src/deleted.ts"))).toHaveLength(1);
    expect(firstPaths.some(value => value.includes("only-proof") || value.endsWith("Main.java"))).toBe(false);
    const calls: readonly unknown[][] = reads.mock.calls;
    expect(calls.length).toBeGreaterThan(first.productSourceHash.files.length);
    expect(calls.every(call => { const length = call[3]; return typeof length === "number" && length <= 64 * 1024; })).toBe(true);
    expect(new Set(calls.map(call => call[1])).size).toBe(1);
    expect(buffered).not.toHaveBeenCalled();
    const second = computeFrontendReleaseFingerprintPayloads();
    expect(second).toEqual(first);
    expect(paths()).toHaveLength(firstPaths.length * 2);
    for (const file of firstPaths) expect(paths().filter(value => value === file)).toHaveLength(2);
  });
});

it("rereads changed same-size same-mtime bytes and deletion across independent pre/post scans", () => {
  withFingerprintFixture(root => {
    const target = path.join(root, "src/alpha.ts");
    fs.writeFileSync(target, "AAAA");
    const original = fs.statSync(target), first = computeFrontendReleaseFingerprintPayloads();
    fs.writeFileSync(target, "BBBB");
    fs.utimesSync(target, original.atime, original.mtime);
    const changed = computeFrontendReleaseFingerprintPayloads();
    expect(changed.productSourceHash.hash).not.toBe(first.productSourceHash.hash);
    expect(changed.jsBundleFingerprint.hash).not.toBe(first.jsBundleFingerprint.hash);
    expect(changed.productSourceHash.files.find(file => file.path === "src/alpha.ts")?.bytes).toBe(4);
    expect(changed.productSourceHash).toEqual(computeReleaseFingerprintPayload("productSourceHash"));
    fs.unlinkSync(target);
    const deleted = computeFrontendReleaseFingerprintPayloads();
    expect(deleted.productSourceHash.hash).not.toBe(changed.productSourceHash.hash);
    expect(deleted.productSourceHash.files.some(file => file.path === "src/alpha.ts")).toBe(false);
    expect(deleted.jsBundleFingerprint).toEqual(computeReleaseFingerprintPayload("jsBundleFingerprint"));
  });
});

it("propagates a read error, closes its descriptor and leaves no successful cache across another scan", () => {
  withFingerprintFixture(() => {
    const failure = Object.assign(new Error("TEST_ONLY_READ_FAILURE"), { code: "EIO" });
    const reads = jest.spyOn(fs, "readSync").mockImplementationOnce(() => { throw failure; });
    const closed = jest.spyOn(fs, "closeSync");
    expect(() => computeFrontendReleaseFingerprintPayloads()).toThrow(failure);
    expect(closed).toHaveBeenCalledTimes(1);
    reads.mockRestore(); closed.mockRestore();
    expect(computeFrontendReleaseFingerprintPayloads().productSourceHash).toEqual(computeReleaseFingerprintPayload("productSourceHash"));
  });
});

it("prints exactly the existing three-field ordered JSON identity through the real CLI module", () => {
  withFingerprintFixture(() => {
    const product = computeReleaseFingerprintPayload("productSourceHash"), js = computeReleaseFingerprintPayload("jsBundleFingerprint");
    let output = "";
    jest.spyOn(process.stdout, "write").mockImplementation(chunk => { output += String(chunk); return true; });
    jest.isolateModules(() => { require("../../scripts/dev/printLocalDeveloperBuildIdentity"); });
    expect(output).toBe(JSON.stringify({ sourceTreeHash: product.hash, productSourceHash: product.hash, jsBundleFingerprint: js.hash }));
  });
});

it("retains full native/proof/candidate APIs unchanged beside the narrow frontend scan", () => {
  withFingerprintFixture(() => {
    const before = computeReleaseFingerprintPayloads(), fingerprints = computeReleaseFingerprints();
    computeFrontendReleaseFingerprintPayloads();
    expect(computeReleaseFingerprintPayloads()).toEqual(before);
    expect(computeReleaseFingerprints()).toEqual(fingerprints);
    expect(before.nativeBuildHash.files.map(file => file.path)).toContain("android/app/src/Main.java");
    expect(before.proofHarnessHash.files.map(file => file.path)).toContain("scripts/only-proof.ts");
    expect(before.proofHarnessHash.files.map(file => file.path)).toContain("tests/only-proof.test.ts");
  });
});