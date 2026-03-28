import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const projectRoot = process.cwd();
const artifactDir = path.join(projectRoot, "artifacts");
const summaryPath = path.join(artifactDir, "director-reports-transport-wave1-summary.json");
const smokePath = path.join(artifactDir, "director-reports-transport-wave1-smoke.json");
const beforeAfterPath = path.join(artifactDir, "director-reports-transport-wave1-before-after.txt");

const transportPath = "src/lib/api/director_reports.transport.ts";
const familyFiles = [
  "src/lib/api/director_reports.observability.ts",
  "src/lib/api/director_reports.transport.base.ts",
  "src/lib/api/director_reports.transport.production.ts",
];

const readText = (relativePath: string) => fs.readFileSync(path.join(projectRoot, relativePath), "utf8").replace(/^\uFEFF/, "");
const countLines = (text: string) => text.split(/\r?\n/).length;
const writeJson = (targetPath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, `${JSON.stringify(payload, null, 2)}\n`);
};

async function main() {
  const baselineSource = execSync(`git show HEAD:${transportPath}`, {
    cwd: projectRoot,
    encoding: "utf8",
  }).replace(/^\uFEFF/, "");
  const currentSource = readText(transportPath);
  const baseSource = readText("src/lib/api/director_reports.transport.base.ts");
  const productionSource = readText("src/lib/api/director_reports.transport.production.ts");
  const observabilitySource = readText("src/lib/api/director_reports.observability.ts");

  const removedBodies = [
    "async function runTypedRpc<TRow>(",
    "async function fetchRequestsRowsSafe(",
    "async function fetchRequestsDisciplineRowsSafe(",
    "async function fetchIssueHeadsViaAccRpc(",
    "async function fetchIssueLinesViaAccRpc(",
    "async function fetchIssuePriceMapByCode(",
    "async function fetchDirectorReportCanonicalMaterials(",
    "async function fetchDirectorReportCanonicalWorks(",
    "async function fetchDirectorReportCanonicalOptions(",
    "async function fetchPriceByRequestItemId(",
  ];

  const transport = await import("../src/lib/api/director_reports.transport");
  const transportBase = await import("../src/lib/api/director_reports.transport.base");
  const transportProduction = await import("../src/lib/api/director_reports.transport.production");
  const observability = await import("../src/lib/api/director_reports.observability");

  const smoke = {
    facadeExportsCanonicalMaterials: typeof transport.fetchDirectorReportCanonicalMaterials === "function",
    facadeExportsCanonicalWorks: typeof transport.fetchDirectorReportCanonicalWorks === "function",
    facadeExportsCanonicalOptions: typeof transport.fetchDirectorReportCanonicalOptions === "function",
    facadeExportsPriceLookup: typeof transport.fetchPriceByRequestItemId === "function",
    baseExportsTypedRpc: typeof transportBase.runTypedRpc === "function",
    baseEmptyRequestLookupOk: Array.isArray(await transportBase.fetchRequestsRowsSafe([])),
    baseEmptyDisciplineLookupOk: Array.isArray(await transportBase.fetchRequestsDisciplineRowsSafe([])),
    baseEmptyIssueLinesOk: Array.isArray(await transportBase.fetchIssueLinesViaAccRpc([])),
    productionEmptyRequestItemPriceOk:
      (await transportProduction.fetchPriceByRequestItemId([])) instanceof Map
      && (await transportProduction.fetchPriceByRequestItemId([])).size === 0,
    observabilityExportOk: typeof observability.recordDirectorReportsTransportWarning === "function",
  };

  const summary = {
    status:
      currentSource.includes('from "./director_reports.observability"')
      && currentSource.includes('from "./director_reports.transport.base"')
      && currentSource.includes('from "./director_reports.transport.production"')
      && removedBodies.every((marker) => !currentSource.includes(marker))
      && familyFiles.every((file) => fs.existsSync(path.join(projectRoot, file)))
      && baseSource.includes("issue_lines_acc_rpc_failed")
      && productionSource.includes("fetchDirectorReportCanonicalMaterials")
      && observabilitySource.includes("recordDirectorReportsTransportWarning")
      && Object.values(smoke).every(Boolean)
        ? "GREEN"
        : "NOT GREEN",
    before: {
      transportLines: countLines(baselineSource),
      transportBytes: Buffer.byteLength(baselineSource, "utf8"),
    },
    after: {
      transportLines: countLines(currentSource),
      transportBytes: Buffer.byteLength(currentSource, "utf8"),
      familyFiles,
      familyLines: Object.fromEntries(
        familyFiles.map((file) => [file, countLines(readText(file))]),
      ),
    },
    checks: {
      facadeImportsObservability: currentSource.includes('from "./director_reports.observability"'),
      facadeImportsBase: currentSource.includes('from "./director_reports.transport.base"'),
      facadeImportsProduction: currentSource.includes('from "./director_reports.transport.production"'),
      oldBodiesRemoved: removedBodies.every((marker) => !currentSource.includes(marker)),
      familyFilesPresent: familyFiles.every((file) => fs.existsSync(path.join(projectRoot, file))),
      baseCarriesAccRpcWarnings: baseSource.includes("issue_lines_acc_rpc_failed"),
      productionCarriesCanonicalFetchers: productionSource.includes("fetchDirectorReportCanonicalMaterials"),
      observabilityCarriesTransportWarn: observabilitySource.includes("recordDirectorReportsTransportWarning"),
    },
    smoke,
  };

  const beforeAfter = [
    "Director Reports Transport Wave 1",
    `before_lines=${summary.before.transportLines}`,
    `after_lines=${summary.after.transportLines}`,
    `before_bytes=${summary.before.transportBytes}`,
    `after_bytes=${summary.after.transportBytes}`,
    "",
    "moved_to_observability:",
    "- recordDirectorReportsTransportWarning",
    "",
    "moved_to_transport_base:",
    "- runTypedRpc",
    "- fetchRequestsRowsSafe",
    "- fetchRequestsDisciplineRowsSafe",
    "- fetchIssueHeadsViaAccRpc",
    "- fetchIssueLinesViaAccRpc",
    "",
    "moved_to_transport_production:",
    "- fetchIssuePriceMapByCode",
    "- fetchDirectorReportCanonicalMaterials",
    "- fetchDirectorReportCanonicalWorks",
    "- fetchDirectorReportCanonicalOptions",
    "- fetchPriceByRequestItemId",
    "",
    "transport_facade_keeps:",
    "- fact source fallback chain",
    "- table/view/rpc orchestration",
    "- public compatibility exports",
  ].join("\n");

  writeJson(summaryPath, summary);
  writeJson(smokePath, smoke);
  fs.mkdirSync(path.dirname(beforeAfterPath), { recursive: true });
  fs.writeFileSync(beforeAfterPath, `${beforeAfter}\n`);

  console.log(
    JSON.stringify(
      {
        status: summary.status,
        beforeLines: summary.before.transportLines,
        afterLines: summary.after.transportLines,
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
