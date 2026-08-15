import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

type Gate = "typecheck" | "focused" | "security" | "full-jest-1" | "full-jest-2";
type Json = Record<string, unknown>;

const ROOT = resolve(__dirname, "../../..");
const EVIDENCE = join(ROOT, ".release-runtime", "batch006-water-backend-r3", "evidence-a1");
const FULL_JEST_ROOT = join(ROOT, ".release-runtime", "batch006-water-backend-r3", "full-jest-a1");

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function stable(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const row = value as Json;
  return `{${Object.keys(row).sort().map((key) => `${JSON.stringify(key)}:${stable(row[key])}`).join(",")}}`;
}

function git(args: string[]): string {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 128 * 1024 * 1024 }).trim();
}

function sourceFingerprint(): { files: number; sha256: string } {
  const files = git([
    "ls-files", "--cached", "--others", "--exclude-standard", "--",
    "src", "app", "supabase", "android", "scripts", "tests", "App.tsx", "app.json", "app.config.ts",
    "babel.config.js", "metro.config.js", "package.json", "package-lock.json", "tsconfig.json",
  ]).split(/\r?\n/).filter((path) => path && existsSync(join(ROOT, path))).sort();
  const rows = files.map((path) => {
    const bytes = readFileSync(join(ROOT, path));
    return { path: path.replace(/\\/g, "/"), bytes: bytes.length, sha256: sha256(bytes) };
  });
  return { files: rows.length, sha256: sha256(stable(rows)) };
}

function overlayArgs(): string[] {
  return git(["ls-files", "--modified", "--deleted", "--others", "--exclude-standard"])
    .split(/\r?\n/).filter(Boolean).sort().map((path) => `--allow-overlay=${path.replace(/\\/g, "/")}`);
}

function gateFromArgs(): Gate {
  const value = process.argv.find((arg) => arg.startsWith("--gate="))?.slice("--gate=".length);
  if (!value || !["typecheck", "focused", "security", "full-jest-1", "full-jest-2"].includes(value)) {
    throw new Error("WATER_R5_VERIFICATION_GATE_REQUIRED");
  }
  return value as Gate;
}

function commandFor(gate: Gate): { command: string; args: string[]; timeout: number; outputDir?: string } {
  if (gate === "typecheck") {
    return { command: process.execPath, args: [join(ROOT, "scripts/typecheck/runTypecheckShards.mjs")], timeout: 30 * 60_000 };
  }
  const jest = join(ROOT, "node_modules/jest/bin/jest.js");
  if (gate === "focused") {
    return {
      command: process.execPath,
      args: [jest,
        "tests/estimateBackend/canonicalBackendR3.contract.test.ts",
        "tests/estimateBackend/waterBackendR5.contract.test.ts",
        "tests/estimateBackend/waterIndependentOracleA1.contract.test.ts",
        "src/lib/estimate/backendPlatform/formulaGraph.test.ts",
        "src/lib/estimate/backendPlatform/canonicalEstimateParameterValidation.test.ts",
        "src/lib/estimate/backendPlatform/canonicalEstimateOfflineCache.test.ts",
        "--runInBand", "--json", `--outputFile=${join(EVIDENCE, "WATER_R5_FOCUSED_JEST.json")}`],
      timeout: 30 * 60_000,
    };
  }
  if (gate === "security") {
    return {
      command: process.execPath,
      args: [jest,
        "tests/estimateBackend/canonicalBackendR3.contract.test.ts",
        "tests/security/noSecretsInFrontend.contract.test.ts",
        "tests/security/privatePdfOwnerOnly.contract.test.ts",
        "tests/security/consumerCannotReadOfficeData.contract.test.ts",
        "tests/security/companyUserCannotReadOtherCompany.contract.test.ts",
        "tests/architecture/globalEstimateBackendCalculationRequired.contract.test.ts",
        "tests/aiEstimateCore/noPriceWithoutBackendResult.contract.test.ts",
        "--runInBand", "--json", `--outputFile=${join(EVIDENCE, "WATER_R5_SECURITY_JEST.json")}`],
      timeout: 30 * 60_000,
    };
  }
  const pass = gate.endsWith("1") ? "pass-1" : "pass-2";
  const outputDir = join(FULL_JEST_ROOT, pass);
  return {
    command: process.execPath,
    args: [join(ROOT, "node_modules/tsx/dist/cli.mjs"), join(ROOT, "scripts/release/runDeterministicShardedFullJest.ts"),
      "--shards=32", "--concurrency=2", "--microbatch-files=20", `--output-dir=${outputDir}`, ...overlayArgs()],
    timeout: 4 * 60 * 60_000,
    outputDir,
  };
}

function main(): void {
  mkdirSync(EVIDENCE, { recursive: true });
  const gate = gateFromArgs();
  const identityBefore = sourceFingerprint();
  const manifest = JSON.parse(readFileSync(join(ROOT, ".release-runtime/batch006-water-backend-r3/02-backend-release/manifest.json"), "utf8")) as Json;
  if ((manifest.sourceGit as Json).worktreeSourceFingerprintSha256 !== identityBefore.sha256) {
    throw new Error(`WATER_R5_SOURCE_FINGERPRINT_DRIFT:${gate}`);
  }
  const command = commandFor(gate);
  const startedAt = new Date().toISOString();
  const started = Date.now();
  const result = spawnSync(command.command, command.args, {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=8192" },
    maxBuffer: 256 * 1024 * 1024,
    timeout: command.timeout,
    windowsHide: true,
  });
  const identityAfter = sourceFingerprint();
  const stdout = result.stdout ?? "";
  const stderr = `${result.stderr ?? ""}${result.error ? `\n${result.error.message}` : ""}`;
  const report = {
    schemaVersion: "water-r5-verification-gate.v1",
    gate,
    releaseId: manifest.releaseId,
    sourceFingerprintBefore: identityBefore,
    sourceFingerprintAfter: identityAfter,
    sourceUnchanged: identityAfter.sha256 === identityBefore.sha256,
    head: git(["rev-parse", "HEAD"]),
    tree: git(["rev-parse", "HEAD^{tree}"]),
    startedAt,
    endedAt: new Date().toISOString(),
    durationMs: Date.now() - started,
    command: [command.command, ...command.args.filter((arg) => !arg.startsWith("--allow-overlay="))],
    allowedOverlayCount: command.args.filter((arg) => arg.startsWith("--allow-overlay=")).length,
    outputDir: command.outputDir ?? null,
    exitCode: result.status,
    signal: result.signal,
    stdoutSha256: sha256(stdout),
    stderrSha256: sha256(stderr),
    stdoutTail: stdout.slice(-12_000),
    stderrTail: stderr.slice(-12_000),
    status: result.status === 0 && identityAfter.sha256 === identityBefore.sha256 ? "GREEN" : "RED",
  };
  writeFileSync(join(EVIDENCE, `WATER_R5_VERIFICATION_${gate.toUpperCase().replace(/-/g, "_")}.json`), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(report)}\n`);
  if (report.status !== "GREEN") process.exitCode = 1;
}

main();
