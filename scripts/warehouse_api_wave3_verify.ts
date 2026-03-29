import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const projectRoot = process.cwd();
const artifactDir = path.join(projectRoot, "artifacts");
const summaryPath = path.join(artifactDir, "warehouse-api-wave3-summary.json");
const splitPath = path.join(artifactDir, "warehouse-api-module-split.json");
const contractPath = path.join(artifactDir, "warehouse-api-export-contract.json");
const runtimeSummaryPath = path.join(artifactDir, "warehouse-stock-cutover-v1.summary.json");

const warehouseApiPath = "src/screens/warehouse/warehouse.api.ts";
const stockReportsServicePath = "src/screens/warehouse/warehouse.stockReports.service.ts";

const writeJson = (targetPath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const countLines = (text: string) => text.split(/\r?\n/).length;

async function main() {
  const baselineSource = execSync(`git show HEAD:${warehouseApiPath}`, {
    cwd: projectRoot,
    encoding: "utf8",
  });
  const currentSource = fs.readFileSync(path.join(projectRoot, warehouseApiPath), "utf8");
  const serviceSource = fs.readFileSync(path.join(projectRoot, stockReportsServicePath), "utf8");
  const runtimeSummary = fs.existsSync(runtimeSummaryPath)
    ? (JSON.parse(fs.readFileSync(runtimeSummaryPath, "utf8")) as { gate?: string; status?: string })
    : null;

  const contract = {
    stockReexports: [
      "apiFetchStock",
      "apiFetchStockRpc",
      "apiFetchStockRpcV2",
      "apiEnrichStockNamesFromRikRu",
    ].every((key) => currentSource.includes(key)),
    reportReexports: [
      "apiEnsureIssueLines",
      "apiFetchReports",
      "apiFetchIssuedMaterialsReportFast",
      "apiFetchIssuedByObjectReportFast",
      "apiFetchIncomingReports",
      "apiFetchIncomingMaterialsReportFast",
      "apiFetchIncomingLines",
    ].every((key) => currentSource.includes(key)),
    stockTypeReexports:
      currentSource.includes('from "./warehouse.stockReports.service";') &&
      currentSource.includes("WarehouseStockFetchResult") &&
      currentSource.includes("WarehouseStockWindowMeta"),
    reportTypeReexports:
      currentSource.includes('from "./warehouse.stockReports.service";') &&
      currentSource.includes("IssuedMaterialsFastRow") &&
      currentSource.includes("IncomingMaterialsFastRow"),
  };

  const split = {
    before: {
      lines: countLines(baselineSource),
      bytes: Buffer.byteLength(baselineSource, "utf8"),
    },
    after: {
      lines: countLines(currentSource),
      bytes: Buffer.byteLength(currentSource, "utf8"),
    },
    service: {
      lines: countLines(serviceSource),
      bytes: Buffer.byteLength(serviceSource, "utf8"),
    },
    newServicePresent: fs.existsSync(path.join(projectRoot, stockReportsServicePath)),
    extractedBodiesRemoved: [
      "export async function apiFetchStockRpcV2(",
      "export async function apiFetchStockRpc(",
      "export async function apiFetchStock(",
      "export async function apiFetchReports(",
      "export async function apiFetchIncomingLines(",
    ].every((marker) => !currentSource.includes(marker)),
    serviceBodiesPresent: [
      "export async function apiFetchStockRpcV2(",
      "export async function apiFetchStockRpc(",
      "export async function apiFetchStock(",
      "export async function apiFetchReports(",
      "export async function apiFetchIncomingLines(",
    ].every((marker) => serviceSource.includes(marker)),
  };

  const runtime = {
    artifactPresent: runtimeSummary != null,
    gate: runtimeSummary?.gate ?? "missing",
    status: runtimeSummary?.status ?? "missing",
    stockParityGreen: runtimeSummary?.gate === "GREEN",
  };

  const summary = {
    status:
      split.after.bytes < split.before.bytes &&
      split.newServicePresent &&
      split.extractedBodiesRemoved &&
      split.serviceBodiesPresent &&
      Object.values(contract).every(Boolean) &&
      runtime.stockParityGreen
        ? "GREEN"
        : "NOT_GREEN",
    split,
    contract,
    runtime,
  };

  writeJson(summaryPath, summary);
  writeJson(splitPath, split);
  writeJson(contractPath, contract);

  console.log(JSON.stringify(summary, null, 2));

  if (summary.status !== "GREEN") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
