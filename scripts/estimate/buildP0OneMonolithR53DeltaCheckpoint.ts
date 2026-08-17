import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const SPEC_SHA256 = "1692ec051abcda1e4b973e1a3c9d053c22e17748ee5838d23f83d631f1b341b2";
const SOURCE_CHECKPOINT_ADDRESS = "30f366222eba23bc9dc1645b278a96bd623fdf3a2c88058216ff2da1825f09f5";
const SOURCE_CHECKPOINT_ROOT = path.join(".release-runtime", "r53cp", SOURCE_CHECKPOINT_ADDRESS);
const DELTA_ROOT = path.join(".release-runtime", "r53delta");

function git(args: readonly string[], encoding: BufferEncoding | "buffer" = "utf8"): string | Buffer {
  return execFileSync("git", [...args], {
    cwd: process.cwd(),
    encoding: encoding === "buffer" ? "buffer" : encoding,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function sha256(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function currentPaths(): string[] {
  const output = git(["ls-files", "--modified", "--others", "--exclude-standard", "-z"], "buffer") as Buffer;
  return output.toString("utf8").split("\0").filter(Boolean).sort((left, right) => left.localeCompare(right));
}

function headBuffer(relativePath: string): Buffer | null {
  try {
    return git(["show", `HEAD:${relativePath.replace(/\\/g, "/")}`], "buffer") as Buffer;
  } catch {
    return null;
  }
}

function canonicalAddress(files: readonly { path: string; sha256: string; bytes: number }[]): string {
  const canonical = files.map((file) => `${file.path}\0${file.sha256}\0${file.bytes}\n`).join("");
  return sha256(Buffer.from(canonical, "utf8"));
}

export function buildP0OneMonolithR53DeltaCheckpoint() {
  const sourceManifestPath = path.join(SOURCE_CHECKPOINT_ROOT, "CHECKPOINT_MANIFEST.json");
  if (!fs.existsSync(sourceManifestPath)) throw new Error("R53_SOURCE_CHECKPOINT_MANIFEST_MISSING");
  const sourceManifest = JSON.parse(fs.readFileSync(sourceManifestPath, "utf8")) as {
    specSha256: string;
    contentAddressSha256: string;
    files: Array<{ path: string; sha256: string; bytes: number }>;
  };
  if (sourceManifest.specSha256 !== SPEC_SHA256 || sourceManifest.contentAddressSha256 !== SOURCE_CHECKPOINT_ADDRESS) {
    throw new Error("R53_SOURCE_CHECKPOINT_IDENTITY_MISMATCH");
  }
  const deleted = String(git(["ls-files", "--deleted"], "utf8")).trim();
  if (deleted) throw new Error(`R53_DELTA_DELETED_TRACKED_PATHS:${deleted.replace(/\r?\n/g, "|")}`);
  const sourceByPath = new Map(sourceManifest.files.map((file) => [file.path.replace(/\\/g, "/"), file]));
  const deltaFiles = currentPaths().flatMap((relativePath) => {
    const normalizedPath = relativePath.replace(/\\/g, "/");
    const current = fs.readFileSync(relativePath);
    const currentSha256 = sha256(current);
    const source = sourceByPath.get(normalizedPath);
    const head = source ? null : headBuffer(normalizedPath);
    const baseSha256 = source?.sha256 ?? (head ? sha256(head) : null);
    if (baseSha256 === currentSha256) return [];
    return [{
      path: normalizedPath,
      bytes: current.length,
      sha256: currentSha256,
      base: source ? "r53-checkpoint-30f366" : head ? "successor-head-f2dac926" : "new-after-r53-checkpoint",
      baseSha256,
    }];
  });
  const contentAddressSha256 = canonicalAddress(deltaFiles);
  const checkpointRoot = path.join(DELTA_ROOT, contentAddressSha256);
  const filesRoot = path.join(checkpointRoot, "f");
  for (const file of deltaFiles) {
    const sourcePath = path.resolve(file.path);
    const destinationPath = path.join(filesRoot, ...file.path.split("/"));
    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    fs.copyFileSync(sourcePath, destinationPath);
    const copied = fs.readFileSync(destinationPath);
    if (sha256(copied) !== file.sha256 || copied.length !== file.bytes) {
      throw new Error(`R53_DELTA_COPY_VERIFY_FAILED:${file.path}`);
    }
  }
  const manifest = {
    schemaVersion: "p0-one-monolith-r5.3-content-addressed-delta-checkpoint.v1",
    specSha256: SPEC_SHA256,
    createdAt: new Date().toISOString(),
    repository: process.cwd(),
    branch: String(git(["branch", "--show-current"], "utf8")).trim(),
    head: String(git(["rev-parse", "HEAD"], "utf8")).trim(),
    tree: String(git(["rev-parse", "HEAD^{tree}"], "utf8")).trim(),
    sourceCheckpointContentAddressSha256: SOURCE_CHECKPOINT_ADDRESS,
    contentAddressSha256,
    deltaFileCount: deltaFiles.length,
    copiedAndRehashed: deltaFiles.length,
    missingTrackedPaths: [],
    files: deltaFiles,
  };
  fs.mkdirSync(checkpointRoot, { recursive: true });
  const manifestPath = path.join(checkpointRoot, "DELTA_CHECKPOINT_MANIFEST.json");
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  const manifestSha256 = sha256(fs.readFileSync(manifestPath));
  return { ...manifest, manifestPath, manifestSha256, status: "DELTA_CHECKPOINT_CREATED_AND_COPY_VERIFIED" };
}

if (require.main === module) {
  console.log(JSON.stringify(buildP0OneMonolithR53DeltaCheckpoint(), null, 2));
}
