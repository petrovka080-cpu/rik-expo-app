import { createHash } from "node:crypto";
import { createReadStream, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

type Json = Record<string, any>;
const ROOT = resolve(__dirname, "../../..");
const RUNTIME = join(ROOT, ".release-runtime", "batch007-hvac-r4");
const EVIDENCE = join(RUNTIME, "evidence");

function argument(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

async function proof(path: string): Promise<{ bytes: number; sha256: string }> {
  const digest = createHash("sha256");
  let bytes = 0;
  for await (const chunk of createReadStream(path)) {
    digest.update(chunk as Buffer);
    bytes += (chunk as Buffer).length;
  }
  return { bytes, sha256: digest.digest("hex") };
}

async function main(): Promise<void> {
  const a = resolve(argument("a", join(RUNTIME, "release-a")));
  const b = resolve(argument("b", join(RUNTIME, "release-b")));
  const ma = JSON.parse(readFileSync(join(a, "manifest.json"), "utf8")) as Json;
  const mb = JSON.parse(readFileSync(join(b, "manifest.json"), "utf8")) as Json;
  const names = ["manifest.json", "source-fingerprint.json", ...ma.files.map((row: Json) => row.file)].sort();
  const rows = [];
  for (const file of names) {
    const left = await proof(join(a, file));
    const right = await proof(join(b, file));
    rows.push({ file, a: left, b: right, equal: left.bytes === right.bytes && left.sha256 === right.sha256 });
  }
  const report = {
    schemaVersion: "batch007-hvac-r4-a2-package-determinism.v1",
    releaseIdA: ma.releaseId,
    releaseIdB: mb.releaseId,
    manifestSha256A: ma.manifestSha256,
    manifestSha256B: mb.manifestSha256,
    sourcePackageSha256A: ma.sourcePackageSha256,
    sourcePackageSha256B: mb.sourcePackageSha256,
    sourceFingerprintSha256A: ma.sourceGit.worktreeSourceFingerprintSha256,
    sourceFingerprintSha256B: mb.sourceGit.worktreeSourceFingerprintSha256,
    files: rows,
    packageBytesEqual: rows.every((row) => row.equal),
    status: rows.every((row) => row.equal) && ma.releaseId === mb.releaseId && ma.manifestSha256 === mb.manifestSha256 && ma.sourcePackageSha256 === mb.sourcePackageSha256 ? "GREEN_PACKAGE_A_B_BYTE_IDENTICAL_INDEPENDENT_BUILDS" : "RED",
  };
  if (report.status === "RED") throw new Error(`HVAC_PACKAGE_A_B_MISMATCH:${JSON.stringify(report)}`);
  writeFileSync(join(EVIDENCE, "07-package", "PACKAGE_A_B_DETERMINISM.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
