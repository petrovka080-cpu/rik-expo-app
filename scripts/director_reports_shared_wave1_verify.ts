import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const projectRoot = process.cwd();
const artifactDir = path.join(projectRoot, "artifacts");
const summaryPath = path.join(artifactDir, "director-reports-shared-wave1-summary.json");
const smokePath = path.join(artifactDir, "director-reports-shared-wave1-smoke.json");
const beforeAfterPath = path.join(artifactDir, "director-reports-shared-wave1-before-after.txt");

const facadePath = "src/lib/api/director_reports.shared.ts";
const familyFiles = [
  "src/lib/api/director_reports.types.ts",
  "src/lib/api/director_reports.normalizers.ts",
  "src/lib/api/director_reports.context.ts",
];

const readText = (relativePath: string) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8").replace(/^\uFEFF/, "");
const countLines = (text: string) => text.split(/\r?\n/).length;
const writeJson = (targetPath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, `${JSON.stringify(payload, null, 2)}\n`);
};

async function main() {
  const baselineSource = execSync(`git show HEAD:${facadePath}`, {
    cwd: projectRoot,
    encoding: "utf8",
  }).replace(/^\uFEFF/, "");
  const currentSource = readText(facadePath);
  const typesSource = readText("src/lib/api/director_reports.types.ts");
  const normalizersSource = readText("src/lib/api/director_reports.normalizers.ts");
  const contextSource = readText("src/lib/api/director_reports.context.ts");

  const removedBodies = [
    "type DirectorReportOptions = {",
    "const normalizeCodeNameRow =",
    "const resolveDirectorFactContext =",
    "function parseFreeIssueContext(",
  ];

  const shared = await import("../src/lib/api/director_reports.shared");

  const smoke = {
    facadeExportsTypesAndHelpers:
      typeof shared.resolveDirectorFactContext === "function"
      && typeof shared.normalizeCodeNameRow === "function"
      && typeof shared.toNum === "function",
    facadeExportsContext: typeof shared.canonicalObjectName === "function",
    typeSplitPresent:
      typesSource.includes("type DirectorReportOptions = {")
      && typesSource.includes("type AccIssueLine = {"),
    normalizersSplitPresent:
      normalizersSource.includes("const normalizeCodeNameRow =")
      && normalizersSource.includes("const normalizeRefSystemLookupRow ="),
    contextSplitPresent:
      contextSource.includes("const resolveDirectorFactContext =")
      && contextSource.includes("function parseFreeIssueContext("),
    sampleContextOk:
      shared.resolveDirectorFactContext({
        issue_object_name: "Объект A",
        issue_work_name: "Работы",
      }).object_name_resolved === "Объект A",
    sampleNormalizerOk:
      shared.normalizeCodeNameRow({ code: "SYS", display_name: "Система" })?.code === "SYS",
    sampleIdentityOk:
      shared.resolveDirectorObjectIdentity({ object_name_display: "Объект A" }).object_name_canonical === "Объект A",
    sampleParallelChunkOk:
      Array.isArray(shared.chunk([1, 2, 3], 2)) && shared.chunk([1, 2, 3], 2).length === 2,
  };

  const summary = {
    status:
      currentSource.includes('from "./director_reports.types"')
      && currentSource.includes('from "./director_reports.normalizers"')
      && currentSource.includes('from "./director_reports.context"')
      && removedBodies.every((marker) => !currentSource.includes(marker))
      && familyFiles.every((file) => fs.existsSync(path.join(projectRoot, file)))
      && Object.values(smoke).every(Boolean)
        ? "GREEN"
        : "NOT GREEN",
    before: {
      sharedLines: countLines(baselineSource),
      sharedBytes: Buffer.byteLength(baselineSource, "utf8"),
    },
    after: {
      sharedLines: countLines(currentSource),
      sharedBytes: Buffer.byteLength(currentSource, "utf8"),
      familyFiles,
      familyLines: Object.fromEntries(
        familyFiles.map((file) => [file, countLines(readText(file))]),
      ),
    },
    checks: {
      facadeExportsTypes: currentSource.includes('from "./director_reports.types"'),
      facadeExportsNormalizers: currentSource.includes('from "./director_reports.normalizers"'),
      facadeExportsContext: currentSource.includes('from "./director_reports.context"'),
      oldBodiesRemoved: removedBodies.every((marker) => !currentSource.includes(marker)),
      familyFilesPresent: familyFiles.every((file) => fs.existsSync(path.join(projectRoot, file))),
    },
    smoke,
  };

  const beforeAfter = [
    "Director Reports Shared Wave 1",
    `before_lines=${summary.before.sharedLines}`,
    `after_lines=${summary.after.sharedLines}`,
    `before_bytes=${summary.before.sharedBytes}`,
    `after_bytes=${summary.after.sharedBytes}`,
    "",
    "moved_to_types:",
    "- director report/fact/naming row types",
    "",
    "moved_to_normalizers:",
    "- typed row normalizers",
    "- asRecord / firstNonEmpty / toNum",
    "",
    "moved_to_context:",
    "- object identity helpers",
    "- fact context resolution",
    "- free issue parsing",
    "- range/chunk helpers",
  ].join("\n");

  writeJson(summaryPath, summary);
  writeJson(smokePath, smoke);
  fs.mkdirSync(path.dirname(beforeAfterPath), { recursive: true });
  fs.writeFileSync(beforeAfterPath, `${beforeAfter}\n`);

  console.log(
    JSON.stringify(
      {
        status: summary.status,
        beforeLines: summary.before.sharedLines,
        afterLines: summary.after.sharedLines,
        smoke,
      },
      null,
      2,
    ),
  );

  if (summary.status !== "GREEN") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
