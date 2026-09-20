import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

type SnapshotFile = {
  path: string;
  bytes: number;
  sha256: string;
};

const CONTRACT = "rik-expo-app.r4-a13-6.r9-working-snapshot.v1";

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`R9_WORKING_SNAPSHOT:${code}`);
}

function sha256Bytes(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function sha256File(filePath: string): string {
  return sha256Bytes(fs.readFileSync(filePath));
}

function git(args: string[]): string {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  }).trimEnd();
}

function argument(name: string): string | null {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function safeRelative(root: string, candidate: string): string {
  const absolute = path.resolve(root, candidate);
  const relative = path.relative(root, absolute);
  invariant(relative.length > 0 && !relative.startsWith("..") && !path.isAbsolute(relative),
    `PATH_OUTSIDE_WORKTREE:${candidate}`);
  return relative.split(path.sep).join("/");
}

function copyStableFile(root: string, relativePath: string, destinationRoot: string): SnapshotFile {
  const normalized = safeRelative(root, relativePath);
  const source = path.join(root, normalized);
  invariant(fs.existsSync(source) && fs.statSync(source).isFile(), `SOURCE_FILE_MISSING:${normalized}`);
  const before = sha256File(source);
  const destination = path.join(destinationRoot, normalized);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
  const copied = sha256File(destination);
  const after = sha256File(source);
  invariant(before === copied && before === after, `SOURCE_CHANGED_DURING_COPY:${normalized}`);
  return { path: normalized, bytes: fs.statSync(source).size, sha256: before };
}

function walkFiles(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  const result: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) result.push(absolute);
    }
  };
  visit(root);
  return result.sort();
}

function main(): void {
  const root = path.resolve(git(["rev-parse", "--show-toplevel"]));
  invariant(root === path.resolve(process.cwd()), "RUN_FROM_ACTIVE_WORKTREE_ROOT");
  const masterPath = path.resolve(argument("master") ?? "");
  const webReportPath = path.resolve(argument("web-report") ?? "");
  invariant(fs.existsSync(masterPath) && fs.statSync(masterPath).isFile(), "MASTER_FILE_MISSING");
  invariant(fs.existsSync(webReportPath) && fs.statSync(webReportPath).isFile(), "WEB_REPORT_MISSING");
  const webReport = JSON.parse(fs.readFileSync(webReportPath, "utf8")) as Record<string, any>;
  invariant(String(webReport.status).startsWith("GREEN_R9_BRIDGE_200_X_32"), "WEB_REPORT_NOT_GREEN");

  const outputRoot = path.resolve(root, ".release-runtime/r4a13-6/r9-working-snapshots");
  fs.mkdirSync(outputRoot, { recursive: true });
  const snapshotId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}`;
  const staging = path.join(outputRoot, `.staging-${snapshotId}`);
  const archivePath = path.join(outputRoot, `R9_WORKING_SNAPSHOT_${snapshotId}.zip`);
  const receiptPath = path.join(outputRoot, `R9_WORKING_SNAPSHOT_${snapshotId}.receipt.json`);
  invariant(!fs.existsSync(staging) && !fs.existsSync(archivePath) && !fs.existsSync(receiptPath),
    "SNAPSHOT_TARGET_ALREADY_EXISTS");
  fs.mkdirSync(staging, { recursive: false });

  try {
    const changedPaths = git(["ls-files", "-m", "-o", "--exclude-standard", "-z"])
      .split("\0").filter(Boolean).map((value) => safeRelative(root, value)).sort();
    const deletedPaths = git(["diff", "--name-only", "--diff-filter=D", "HEAD"])
      .split(/\r?\n/u).filter(Boolean).map((value) => safeRelative(root, value)).sort();
    const filesRoot = path.join(staging, "files");
    const files = changedPaths.map((relativePath) => copyStableFile(root, relativePath, filesRoot));

    const proofCandidates = new Set<string>([
      webReportPath,
      path.resolve(String(webReport.pdf?.path ?? "")),
      ...Object.values(webReport.screenshots ?? {}).map((value) => path.resolve(String(value))),
      ...walkFiles(path.resolve(root, ".release-runtime/r4a13-6/r9-complete-estimates/sources")),
      masterPath,
    ]);
    const proofsRoot = path.join(staging, "proofs");
    const proofs: SnapshotFile[] = [];
    for (const source of [...proofCandidates].sort()) {
      if (!source || !fs.existsSync(source) || !fs.statSync(source).isFile()) continue;
      const relative = source.startsWith(root + path.sep)
        ? path.relative(root, source)
        : path.join("master", path.basename(source));
      const normalized = relative.split(path.sep).join("/");
      const before = sha256File(source);
      const destination = path.join(proofsRoot, normalized);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(source, destination);
      const after = sha256File(source);
      invariant(before === after && before === sha256File(destination), `PROOF_CHANGED_DURING_COPY:${normalized}`);
      proofs.push({ path: normalized, bytes: fs.statSync(source).size, sha256: before });
    }

    const patchText = git(["diff", "--binary", "--full-index", "HEAD"]);
    const cachedPatchText = git(["diff", "--cached", "--binary", "--full-index", "HEAD"]);
    fs.writeFileSync(path.join(staging, "git-diff-head.patch"), `${patchText}\n`, "utf8");
    fs.writeFileSync(path.join(staging, "git-diff-cached.patch"), `${cachedPatchText}\n`, "utf8");
    const remoteUrl = git(["remote", "get-url", "origin"]).replace(/:\/\/[^/@]+@/u, "://");
    const identity = {
      root,
      branch: git(["branch", "--show-current"]),
      head: git(["rev-parse", "HEAD"]),
      headTree: git(["rev-parse", "HEAD^{tree}"]),
      indexTree: git(["write-tree"]),
      remoteUrl,
      remoteBranchSha: git(["ls-remote", "--heads", "origin", git(["branch", "--show-current"])]),
      statusPorcelainV2: git(["status", "--porcelain=v2", "--untracked-files=all"]),
      worktrees: git(["worktree", "list", "--porcelain"]),
      localHeadRefs: git(["show-ref", "--heads"]),
    };
    const manifest = {
      contract: CONTRACT,
      snapshotId,
      capturedAt: new Date().toISOString(),
      identity,
      master: { path: masterPath, bytes: fs.statSync(masterPath).size, sha256: sha256File(masterPath) },
      webAcceptance: { path: webReportPath, sha256: sha256File(webReportPath), status: webReport.status },
      files,
      deletedPaths,
      proofs,
      fileCount: files.length,
      fileBytes: files.reduce((sum, file) => sum + file.bytes, 0),
      proofCount: proofs.length,
      proofBytes: proofs.reduce((sum, file) => sum + file.bytes, 0),
      patchSha256: sha256Bytes(patchText),
      cachedPatchSha256: sha256Bytes(cachedPatchText),
      host: { platform: process.platform, arch: process.arch, hostname: os.hostname() },
    };
    const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
    fs.writeFileSync(path.join(staging, "manifest.json"), manifestText, "utf8");
    fs.writeFileSync(path.join(staging, "manifest.sha256"), `${sha256Bytes(manifestText)}  manifest.json\n`, "utf8");

    execFileSync("tar.exe", ["-a", "-c", "-f", archivePath, "-C", staging, "."], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 256 * 1024 * 1024,
    });
    invariant(fs.existsSync(archivePath) && fs.statSync(archivePath).size > 0, "ARCHIVE_NOT_CREATED");
    const archiveEntries = execFileSync("tar.exe", ["-t", "-f", archivePath], {
      cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 256 * 1024 * 1024,
    }).split(/\r?\n/u).filter(Boolean);
    invariant(archiveEntries.some((entry) => /manifest\.json$/u.test(entry)), "ARCHIVE_MANIFEST_MISSING");
    invariant(archiveEntries.length >= files.length + proofs.length + 4, "ARCHIVE_ENTRY_COUNT_RED");

    const receipt = {
      contract: CONTRACT,
      snapshotId,
      capturedAt: manifest.capturedAt,
      archivePath,
      archiveBytes: fs.statSync(archivePath).size,
      archiveSha256: sha256File(archivePath),
      archiveEntries: archiveEntries.length,
      sourceFileCount: files.length,
      sourceFileBytes: manifest.fileBytes,
      proofCount: proofs.length,
      proofBytes: manifest.proofBytes,
      head: identity.head,
      headTree: identity.headTree,
      indexTree: identity.indexTree,
      branch: identity.branch,
      masterSha256: manifest.master.sha256,
      webAcceptanceSha256: manifest.webAcceptance.sha256,
      verified: true,
    };
    fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
    process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
  } finally {
    const relative = path.relative(outputRoot, staging);
    if (fs.existsSync(staging) && relative && !relative.startsWith("..") && !path.isAbsolute(relative)) {
      fs.rmSync(staging, { recursive: true, force: true });
    }
  }
}

main();
