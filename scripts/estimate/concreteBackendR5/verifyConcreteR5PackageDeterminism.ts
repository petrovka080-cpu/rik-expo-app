import { createHash } from "node:crypto";
import { createReadStream, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { assertExact, evidenceRoot, runtimeRoot, writeJson } from "./support";

function argument(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

async function proof(root: string, file: string): Promise<{ bytes: number; sha256: string }> {
  const hash = createHash("sha256");
  let bytes = 0;
  for await (const chunk of createReadStream(join(root, file))) { const data = chunk as Buffer; hash.update(data); bytes += data.length; }
  return { bytes, sha256: hash.digest("hex") };
}

async function main(): Promise<void> {
  const a = resolve(argument("a", join(runtimeRoot, "release-a")));
  const b = resolve(argument("b", join(runtimeRoot, "release-b")));
  const manifestA = JSON.parse(readFileSync(join(a, "manifest.json"), "utf8"));
  const manifestB = JSON.parse(readFileSync(join(b, "manifest.json"), "utf8"));
  const files = [...new Set([...manifestA.files.map((row: any) => row.file), "manifest.json", "source-fingerprint.json"])].sort();
  const rows = [];
  for (const file of files) {
    const [left, right] = await Promise.all([proof(a, file), proof(b, file)]);
    rows.push({ file, a: left, b: right, equal: left.bytes === right.bytes && left.sha256 === right.sha256 });
  }
  assertExact(manifestA.releaseId === manifestB.releaseId && manifestA.manifestSha256 === manifestB.manifestSha256 && manifestA.sourcePackageSha256 === manifestB.sourcePackageSha256, "CONCRETE_PACKAGE_MANIFEST_IDENTITY_RED");
  assertExact(manifestA.sourceGit.head === manifestB.sourceGit.head && manifestA.sourceGit.tree === manifestB.sourceGit.tree && manifestA.sourceGit.worktreeSourceFingerprintSha256 === manifestB.sourceGit.worktreeSourceFingerprintSha256, "CONCRETE_PACKAGE_SOURCE_FREEZE_RED");
  assertExact(rows.every((row) => row.equal), "CONCRETE_PACKAGE_BYTES_RED");
  assertExact(manifestA.concreteDelta.definitions === 1_218 && manifestA.concreteDelta.resources === 470_016 && manifestA.actual.works === 4_272 && manifestA.actual.resources === 1_157_018, "CONCRETE_PACKAGE_CARDINALITY_RED");
  const result = {
    schemaVersion: "batch008-concrete-r5-package-determinism.v1",
    releaseIdA: manifestA.releaseId,
    releaseIdB: manifestB.releaseId,
    manifestSha256A: manifestA.manifestSha256,
    manifestSha256B: manifestB.manifestSha256,
    sourcePackageSha256A: manifestA.sourcePackageSha256,
    sourcePackageSha256B: manifestB.sourcePackageSha256,
    sourceHead: manifestA.sourceGit.head,
    sourceTree: manifestA.sourceGit.tree,
    sourceFingerprintSha256: manifestA.sourceGit.worktreeSourceFingerprintSha256,
    contentCorpusSha256: manifestA.concreteDelta.corpusSha256,
    files: rows,
    packageEquality: "2/2",
    packageBytesEqual: true,
    mismatches: 0,
    status: "GREEN_PACKAGE_A_B_BYTE_IDENTICAL_INDEPENDENT_BUILDS",
  };
  writeJson("07-package/PACKAGE_A_B_DETERMINISM.json", result);
  writeJson("07-package/PACKAGE_A_MANIFEST.json", manifestA);
  writeJson("07-package/PACKAGE_B_MANIFEST.json", manifestB);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`); process.exitCode = 1; });
