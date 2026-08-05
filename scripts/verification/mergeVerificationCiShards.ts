import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { planWeightedJestShards, type WeightedJestManifestEntry } from "../release/runDeterministicShardedFullJest";
import { mergeVerificationShards, type ShardResult } from "./verificationShardMerger";

const suites = ["tests/releasePipeline/requiredArtifactPreflight.contract.test.ts", "tests/releasePipeline/preflightCanonicalEvidenceImmutability.contract.test.ts", "tests/releasePipeline/deterministicShardedFullJestRunner.contract.test.ts", "tests/releasePipeline/verificationImpactAnalyzer.contract.test.ts", "tests/releasePipeline/verificationShardMerger.contract.test.ts"];
const root = process.cwd();
const inputRoot = path.resolve(process.argv.find((item) => item.startsWith("--input-root="))?.slice(13) ?? ".release-runtime/verification-v1/downloaded-shards");
const outputPath = path.resolve(process.argv.find((item) => item.startsWith("--output="))?.slice(9) ?? ".release-runtime/verification-v1/ci-merge-summary.json");
const sha256 = (value: Buffer | string) => crypto.createHash("sha256").update(value).digest("hex");
const manifest: WeightedJestManifestEntry[] = suites.map((testPath) => { const source = fs.readFileSync(path.join(root, testPath)); const declared = (source.toString("utf8").match(/\b(?:it|test)\s*\(/g) ?? []).length; return { test_path: testPath, source_bytes: source.length, declared_tests: declared, weight: Math.max(1, source.length + declared * 4096), content_sha256: sha256(source) }; }).sort((a, b) => a.test_path.localeCompare(b.test_path));
const manifestHash = sha256(JSON.stringify(manifest));
const walk = (directory: string): string[] => fs.existsSync(directory) ? fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(path.join(directory, entry.name)) : entry.name === "shard-result.json" ? [path.join(directory, entry.name)] : []) : [];
const results = walk(inputRoot).map((file) => JSON.parse(fs.readFileSync(file, "utf8")) as ShardResult);
const subjectSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const expectedShards = planWeightedJestShards(manifest, 4);
const merged = mergeVerificationShards({ expectedShardIds: expectedShards.map((item) => item.shard_id), expectedSuites: suites, subjectSha, manifestHash, results });
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(merged, null, 2)}\n`);
if (merged.exit_code !== 0) process.exitCode = 1;
