import { execFileSync, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { planWeightedJestShards, type WeightedJestManifestEntry } from "../release/runDeterministicShardedFullJest";

const suites = [
  "tests/releasePipeline/requiredArtifactPreflight.contract.test.ts",
  "tests/releasePipeline/preflightCanonicalEvidenceImmutability.contract.test.ts",
  "tests/releasePipeline/deterministicShardedFullJestRunner.contract.test.ts",
  "tests/releasePipeline/verificationImpactAnalyzer.contract.test.ts",
  "tests/releasePipeline/verificationShardMerger.contract.test.ts",
];
const value = (name: string) => process.argv.find((item) => item.startsWith(`--${name}=`))?.slice(name.length + 3);
const shardId = Number(value("shard-id"));
const shardCount = Number(value("shard-count") ?? 4);
if (!Number.isInteger(shardId) || shardId < 0 || !Number.isInteger(shardCount) || shardId >= shardCount) throw new Error("invalid_ci_shard_coordinates");
const root = process.cwd();
const sha256 = (data: Buffer | string) => crypto.createHash("sha256").update(data).digest("hex");
const manifest: WeightedJestManifestEntry[] = suites.map((testPath) => {
  const source = fs.readFileSync(path.join(root, testPath));
  const declared = (source.toString("utf8").match(/\b(?:it|test)\s*\(/g) ?? []).length;
  return { test_path: testPath, source_bytes: source.length, declared_tests: declared, weight: Math.max(1, source.length + declared * 4096), content_sha256: sha256(source) };
});
const manifestHash = sha256(JSON.stringify(manifest.sort((a, b) => a.test_path.localeCompare(b.test_path))));
const shard = planWeightedJestShards(manifest, shardCount)[shardId];
const subjectSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const outputDir = path.resolve(value("output-dir") ?? path.join(".release-runtime", "verification-v1", "ci-shards", String(shardId)));
fs.mkdirSync(outputDir, { recursive: true });
const jestResult = path.join(outputDir, "jest-result.json");
const started = new Date();
const child = spawnSync(process.execPath, [path.join(root, "node_modules/jest/bin/jest.js"), ...shard.test_files, "--runInBand", "--json", `--outputFile=${jestResult}`], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, windowsHide: true });
fs.writeFileSync(path.join(outputDir, "stdout.log"), child.stdout ?? "", "utf8");
fs.writeFileSync(path.join(outputDir, "stderr.log"), child.stderr ?? "", "utf8");
const result = fs.existsSync(jestResult) ? JSON.parse(fs.readFileSync(jestResult, "utf8")) as Record<string, unknown> : {};
const failedAssertions = Array.isArray(result.testResults) ? (result.testResults as Array<Record<string, unknown>>).flatMap((suiteResult) => Array.isArray(suiteResult.assertionResults) ? (suiteResult.assertionResults as Array<Record<string, unknown>>).filter((assertion) => assertion.status === "failed").map((assertion) => String(assertion.fullName ?? assertion.title ?? "unknown")) : []) : [];
const summary = { schema: "verification-ci-shard-result/v1", shard_id: shardId, subject_sha: subjectSha, manifest_hash: manifestHash, started_at: started.toISOString(), ended_at: new Date().toISOString(), exit_code: child.status ?? 1, suites: shard.test_files, failed_assertions: failedAssertions };
fs.writeFileSync(path.join(outputDir, "shard-result.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
if (summary.exit_code !== 0 || failedAssertions.length > 0) process.exitCode = 1;
