import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const ROOT = resolve(__dirname, "../../..");
const EVIDENCE_ROOT = join(
  ROOT,
  ".release-runtime",
  "master11610-backend-canonical-r2",
  "evidence",
);

function argument(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  return String(
    process.argv.find((entry) => entry.startsWith(prefix))?.slice(prefix.length) ?? fallback,
  ).trim();
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function stableJson(value: unknown): string {
  if (
    value == null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
    .join(",")}}`;
}

function sourceFiles(): string[] {
  const raw = execFileSync(
    "git",
    [
      "ls-files",
      "--cached",
      "--others",
      "--exclude-standard",
      "--",
      "src",
      "app",
      "supabase",
      "android",
      "scripts",
      "tests",
      "App.tsx",
      "app.json",
      "app.config.ts",
      "babel.config.js",
      "metro.config.js",
      "package.json",
      "package-lock.json",
      "tsconfig.json",
    ],
    { cwd: ROOT, encoding: "utf8", maxBuffer: 128 * 1024 * 1024 },
  );
  return [...new Set(raw.split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean))]
    .filter(
      (path) =>
        !/(?:^|\/)(?:node_modules|\.release-runtime|artifacts|dist|\.tmp)(?:\/|$)/.test(
          path.replace(/\\/g, "/"),
        ),
    )
    .sort();
}

const label = argument("label", "current-worktree-nonterminal");
const output = argument(
  "output",
  label === "final-pre-admission"
    ? "FINAL_PRE_ADMISSION_SOURCE_FINGERPRINT_R3.json"
    : "CURRENT_WORKTREE_SOURCE_FINGERPRINT_R3.json",
);
const files = sourceFiles().map((path) => {
  const absolute = resolve(ROOT, path);
  const bytes = readFileSync(absolute);
  return {
    path: relative(ROOT, absolute).replace(/\\/g, "/"),
    bytes: bytes.byteLength,
    sha256: sha256(bytes),
  };
});
const payload = {
  schemaVersion: "master11610-source-fingerprint.r3",
  label,
  generatedAt: new Date().toISOString(),
  head: execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim(),
  headTree: execFileSync("git", ["rev-parse", "HEAD^{tree}"], {
    cwd: ROOT,
    encoding: "utf8",
  }).trim(),
  predecessor: "20d56e91bf3591945e55435f6f4b9021f8b838d0",
  fileCount: files.length,
  files,
  aggregateSha256: sha256(stableJson(files)),
  evidenceValidity:
    label === "final-pre-admission"
      ? "VALID_UNTIL_ANY_FINGERPRINTED_SOURCE_CHANGE"
      : "NONTERMINAL_BASELINE_INVALIDATED_BY_ANY_SUBSEQUENT_SOURCE_CHANGE",
};
const destination = join(EVIDENCE_ROOT, output);
mkdirSync(dirname(destination), { recursive: true });
writeFileSync(destination, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
process.stdout.write(
  `${JSON.stringify({
    output,
    fileCount: payload.fileCount,
    aggregateSha256: payload.aggregateSha256,
    evidenceValidity: payload.evidenceValidity,
  })}\n`,
);
