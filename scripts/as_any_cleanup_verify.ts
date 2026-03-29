import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

type FileCount = {
  path: string;
  before: number;
  after: number;
  changed: boolean;
};

const root = process.cwd();
const artifactsDir = resolve(root, "artifacts");

const scopeTargets = [
  "src/lib/api",
  "src/lib/catalog_api.ts",
  "src/screens/director/DirectorDashboard.tsx",
  "src/lib/postgrest.ts",
];

const countAsAny = (text: string) => (text.match(/\bas any\b/g) ?? []).length;

const listFiles = (target: string): string[] => {
  const normalized = target.replace(/\\/g, "/");
  try {
    const output = execFileSync(
      "rg",
      ["--files", normalized, "-g", "*.ts", "-g", "*.tsx"],
      { cwd: root, encoding: "utf8" },
    );
    return output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
};

const getHeadText = (filePath: string): string => {
  try {
    return execFileSync("git", ["show", `HEAD:${filePath.replace(/\\/g, "/")}`], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return "";
  }
};

const summarizeFile = (filePath: string): FileCount => {
  const absolutePath = resolve(root, filePath);
  const afterText = readFileSync(absolutePath, "utf8");
  const beforeText = getHeadText(filePath);
  return {
    path: filePath.replace(/\\/g, "/"),
    before: countAsAny(beforeText),
    after: countAsAny(afterText),
    changed: beforeText !== afterText,
  };
};

const uniqueFiles = Array.from(
  new Set(scopeTargets.flatMap((target) => (target.endsWith(".ts") || target.endsWith(".tsx") ? [target] : listFiles(target)))),
).sort();

const fileSummaries = uniqueFiles.map(summarizeFile);
const activeCoreFiles = fileSummaries.filter((entry) => entry.before > 0 || entry.after > 0);

const beforeTotal = activeCoreFiles.reduce((sum, entry) => sum + entry.before, 0);
const afterTotal = activeCoreFiles.reduce((sum, entry) => sum + entry.after, 0);

const allSrcFiles = listFiles("src");
const scopeSet = new Set(uniqueFiles.map((filePath) => filePath.replace(/\\/g, "/")));
const remainingOutsideScope = allSrcFiles
  .filter((filePath) => !scopeSet.has(filePath.replace(/\\/g, "/")))
  .map(summarizeFile)
  .filter((entry) => entry.after > 0);

const status = afterTotal === 0 ? "GREEN" : "NOT_GREEN";

mkdirSync(artifactsDir, { recursive: true });

writeFileSync(
  join(artifactsDir, "as-any-core-files.json"),
  `${JSON.stringify(
    {
      scopeTargets,
      files: activeCoreFiles,
      remainingOutsideScope: remainingOutsideScope.map((entry) => ({
        path: entry.path,
        after: entry.after,
      })),
    },
    null,
    2,
  )}\n`,
  "utf8",
);

writeFileSync(
  join(artifactsDir, "as-any-before-after.txt"),
  [
    "before after changed path",
    ...activeCoreFiles.map((entry) =>
      `${String(entry.before).padStart(6)} ${String(entry.after).padStart(5)} ${String(entry.changed).padEnd(7)} ${entry.path}`,
    ),
    "",
    `total_before=${beforeTotal}`,
    `total_after=${afterTotal}`,
    `remaining_outside_scope=${remainingOutsideScope.length}`,
  ].join("\n"),
  "utf8",
);

writeFileSync(
  join(artifactsDir, "as-any-cleanup-summary.json"),
  `${JSON.stringify(
    {
      status,
      scopeTargets,
      beforeTotal,
      afterTotal,
      cleanedFiles: activeCoreFiles.filter((entry) => entry.before > 0 && entry.after === 0).map((entry) => entry.path),
      untouchedZeroFiles: fileSummaries.filter((entry) => entry.before === 0 && entry.after === 0).map((entry) => entry.path),
      remainingOutsideScopeCount: remainingOutsideScope.length,
      remainingOutsideScope: remainingOutsideScope.map((entry) => ({
        path: entry.path,
        after: entry.after,
      })),
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(
  JSON.stringify(
    {
      status,
      beforeTotal,
      afterTotal,
      cleanedFiles: activeCoreFiles.filter((entry) => entry.before > 0 && entry.after === 0).length,
      remainingOutsideScopeCount: remainingOutsideScope.length,
      summary: relative(root, join(artifactsDir, "as-any-cleanup-summary.json")).replace(/\\/g, "/"),
    },
    null,
    2,
  ),
);
