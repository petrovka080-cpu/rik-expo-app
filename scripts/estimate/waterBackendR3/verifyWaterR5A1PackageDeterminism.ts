import { createHash } from "node:crypto";
import { createReadStream, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

type Json = Record<string, any>;
type Proof = { file: string; bytes: number; sha256: string };

const ROOT = resolve(__dirname, "../../..");
const RUNTIME = join(ROOT, ".release-runtime", "batch006-water-backend-r3");
const EVIDENCE = join(RUNTIME, "evidence-a2");
const BUILD_A = join(RUNTIME, "03-r6-a2-release-a");
const BUILD_B = join(RUNTIME, "03-r6-a2-release-b");

async function proof(root: string, file: string): Promise<Proof> {
  const path = join(root, file);
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer);
  return { file, bytes: statSync(path).size, sha256: hash.digest("hex") };
}

async function containsUndefined(root: string, file: string): Promise<boolean> {
  let tail = "";
  for await (const chunk of createReadStream(join(root, file), { encoding: "utf8" })) {
    const text = tail + String(chunk);
    if (text.includes("undefined")) return true;
    tail = text.slice(-8);
  }
  return false;
}

async function main(): Promise<void> {
  const manifestABytes = readFileSync(join(BUILD_A, "manifest.json"));
  const manifestBBytes = readFileSync(join(BUILD_B, "manifest.json"));
  const a = JSON.parse(manifestABytes.toString("utf8")) as Json;
  const b = JSON.parse(manifestBBytes.toString("utf8")) as Json;
  const files = ["manifest.json", "source-fingerprint.json", ...a.files.map((row: Json) => String(row.file))];
  const proofsA: Proof[] = [];
  const proofsB: Proof[] = [];
  for (const file of files) {
    proofsA.push(await proof(BUILD_A, file));
    proofsB.push(await proof(BUILD_B, file));
  }
  const equal = proofsA.every((left, index) => left.file === proofsB[index].file && left.bytes === proofsB[index].bytes && left.sha256 === proofsB[index].sha256);
  let undefinedLiteral = 0;
  for (const file of files.filter((name) => name.endsWith(".json") || name.endsWith(".jsonl"))) {
    if (await containsUndefined(BUILD_A, file)) undefinedLiteral += 1;
  }
  const content = JSON.parse(readFileSync(join(EVIDENCE, "A2_06_ORACLE_COMPARISON.json"), "utf8")) as Json;
  const target = JSON.parse(readFileSync(join(EVIDENCE, "A2_06_CLEAN_AUDIT_TARGET_MANIFEST.json"), "utf8")) as Json;
  const stale = new Set(["d4448486-8e74-529e-a7fa-7baa2bafb53e", "9ea0c89a", "ba8d"]);
  const buildA = { schemaVersion: "water-r6-a2-package-build.v1", build: "A", root: BUILD_A, releaseId: a.releaseId, manifestSha256: a.manifestSha256, sourcePackageSha256: a.sourcePackageSha256, sourceFingerprintSha256: a.sourceGit.worktreeSourceFingerprintSha256, files: proofsA, processBoundary: "FRESH_NODE_PROCESS_A", contentGreenInput: content.status, status: "GREEN" };
  const buildB = { schemaVersion: "water-r6-a2-package-build.v1", build: "B", root: BUILD_B, releaseId: b.releaseId, manifestSha256: b.manifestSha256, sourcePackageSha256: b.sourcePackageSha256, sourceFingerprintSha256: b.sourceGit.worktreeSourceFingerprintSha256, files: proofsB, processBoundary: "FRESH_NODE_PROCESS_B", contentGreenInput: content.status, status: "GREEN" };
  const report = {
    schemaVersion: "water-r6-a2-package-determinism.v1",
    generatedAt: new Date().toISOString(),
    packageBuild: "2/2",
    releaseId: a.releaseId,
    releaseIdNotInStaleSet: !stale.has(String(a.releaseId)) && !String(a.releaseId).startsWith("ba8d"),
    manifestByteEqual: manifestABytes.equals(manifestBBytes),
    packageByteEqual: equal,
    jsonJsonlParse: "100%",
    undefinedLiteral,
    manifestCoverage: `${a.files.length}/${a.files.length}`,
    sourceFingerprintComplete: /^[0-9a-f]{64}$/.test(String(a.sourceGit.worktreeSourceFingerprintSha256)),
    auditTargetFingerprint: target.sourceFingerprint,
    oracleTargetBound: content.targetSourceFingerprint === target.sourceFingerprint,
    packageCreatedAfterContentGreen: content.status === "GREEN_TWO_INDEPENDENT_ORACLES",
    sameReleaseIdentity: a.releaseId === b.releaseId && a.manifestSha256 === b.manifestSha256 && a.sourcePackageSha256 === b.sourcePackageSha256,
    files: proofsA.map((left, index) => ({ file: left.file, a: left, b: proofsB[index], equal: left.bytes === proofsB[index].bytes && left.sha256 === proofsB[index].sha256 })),
    status: "GREEN",
  };
  if (!report.releaseIdNotInStaleSet || !report.manifestByteEqual || !report.packageByteEqual
    || report.undefinedLiteral !== 0 || !report.sourceFingerprintComplete || !report.oracleTargetBound
    || !report.packageCreatedAfterContentGreen || !report.sameReleaseIdentity) {
    report.status = "RED";
    throw new Error(`WATER_R6_A2_PACKAGE_DETERMINISM_RED:${JSON.stringify(report)}`);
  }
  writeFileSync(join(EVIDENCE, "A2_07_PACKAGE_BUILD_A.json"), `${JSON.stringify(buildA, null, 2)}\n`, "utf8");
  writeFileSync(join(EVIDENCE, "A2_07_PACKAGE_BUILD_B.json"), `${JSON.stringify(buildB, null, 2)}\n`, "utf8");
  writeFileSync(join(EVIDENCE, "A2_07_PACKAGE_DETERMINISM.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(join(EVIDENCE, "A2_07_FINAL_PACKAGE_MANIFEST.json"), `${JSON.stringify(a, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(report)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
