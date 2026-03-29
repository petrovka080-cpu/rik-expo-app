import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

type SummaryLike = Record<string, unknown>;

const projectRoot = process.cwd();
const artifactBase = path.join(projectRoot, "artifacts", "director-reports-pdf-backend-cutover");

const run = (command: string, args: string[]) => {
  const result =
    process.platform === "win32" && command === "npx"
      ? spawnSync("npx.cmd", args, {
          cwd: projectRoot,
          encoding: "utf8",
          timeout: 20 * 60 * 1000,
          shell: true,
        })
      : spawnSync(command, args, {
          cwd: projectRoot,
          encoding: "utf8",
          timeout: 20 * 60 * 1000,
        });

  return {
    command: `${command} ${args.join(" ")}`,
    status: result.status ?? 1,
    stdout: String(result.stdout ?? ""),
    stderr: String(result.stderr ?? ""),
    error: result.error?.message ?? null,
  };
};

const readText = (relativePath: string) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

const extractSection = (source: string, startMarker: string, endMarker?: string) => {
  const start = source.indexOf(startMarker);
  if (start < 0) return "";
  const end = endMarker ? source.indexOf(endMarker, start + startMarker.length) : -1;
  return end >= 0 ? source.slice(start, end) : source.slice(start);
};

const readJson = (relativePath: string): SummaryLike => {
  const fullPath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(fullPath)) return {};
  return JSON.parse(fs.readFileSync(fullPath, "utf8")) as SummaryLike;
};

const asRecord = (value: unknown): SummaryLike =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as SummaryLike) : {};

const writeJson = (fullPath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const isPassedSourceSummary = (summary: SummaryLike) =>
  summary.status === "passed" &&
  summary.error == null &&
  asRecord(summary.assertions).no_pdf_fallback === true;

function main() {
  const tsc = run("npx", ["tsc", "--noEmit", "--pretty", "false"]);
  const eslint = run("npx", [
    "eslint",
    "scripts/director_reports_pdf_source_smoke.ts",
    "scripts/director_reports_pdf_backend_cutover.ts",
  ]);
  const pdfSourceSmoke = run("npx", ["tsx", "scripts/director_reports_pdf_source_smoke.ts"]);

  const reportsCutoverSummary = readJson("artifacts/director-reports-backend-cutover.summary.json");
  const financeSummary = readJson("artifacts/pdf-batchh-smoke.summary.json");
  const productionSummary = readJson("artifacts/pdf-batchh2-smoke.summary.json");
  const subcontractSummary = readJson("artifacts/pdf-batchh3-smoke.summary.json");

  const pdfServiceSource = readText("src/screens/director/director.reports.pdfService.ts");
  const financePdfServiceSource = readText("src/screens/director/director.finance.pdfService.ts");
  const pdfSourceServiceSource = readText("src/lib/api/directorPdfSource.service.ts");
  const financeGetterSource = extractSection(
    pdfSourceServiceSource,
    "export async function getDirectorFinancePdfSource(",
    "async function fetchDirectorProductionPdfSourceViaRpc(",
  );
  const productionGetterSource = extractSection(
    pdfSourceServiceSource,
    "export async function getDirectorProductionPdfSource(",
    "async function fetchDirectorSubcontractPdfSourceViaRpc(",
  );
  const subcontractGetterSource = extractSection(
    pdfSourceServiceSource,
    "export async function getDirectorSubcontractPdfSource(",
  );
  const financePdfSource = financeSummary;
  const structural = {
    productionBackendPrimary:
      pdfServiceSource.includes("generateDirectorProductionReportPdfViaBackend") &&
      pdfServiceSource.includes("[director.reports.pdf] production backend fallback"),
    subcontractBackendPrimary:
      pdfServiceSource.includes("generateDirectorSubcontractReportPdfViaBackend") &&
      pdfServiceSource.includes("[director.reports.pdf] subcontract backend fallback"),
    financeSourcePrimary:
      financeGetterSource.includes('assertDirectorPdfRpcPrimary(') &&
      !financeGetterSource.includes("buildDirectorFinancePdfFallbackSource(") &&
      !financeGetterSource.includes("return legacySource") &&
      !financeGetterSource.includes("legacy_fallback"),
    productionSourcePrimary:
      productionGetterSource.includes('assertDirectorPdfRpcPrimary(') &&
      !productionGetterSource.includes("buildDirectorProductionPdfFallbackSource(") &&
      !productionGetterSource.includes("return legacySource") &&
      !productionGetterSource.includes("legacy_fallback"),
    subcontractSourcePrimary:
      subcontractGetterSource.includes('assertDirectorPdfRpcPrimary(') &&
      !subcontractGetterSource.includes("buildDirectorSubcontractPdfFallbackSource(") &&
      !subcontractGetterSource.includes("return legacySource") &&
      !subcontractGetterSource.includes("legacy_fallback"),
    financeFallbackLocalRowsRemoved:
      financePdfServiceSource.includes("resolveDirectorFinanceFallbackRows") &&
      financePdfServiceSource.includes("const source = await getDirectorFinancePdfSource(") &&
      !financePdfServiceSource.includes("client_filtered_support_rows"),
    financeFallbackUsed:
      financeSummary.status !== "passed" ||
      financePdfSource.sourceBranch !== "rpc_v1",
    productionFallbackUsed: asRecord(productionSummary.assertions).no_pdf_fallback !== true,
    subcontractFallbackUsed: asRecord(subcontractSummary.assertions).no_pdf_fallback !== true,
  };

  const financePdfPassed = isPassedSourceSummary(financeSummary);
  const productionPdfPassed = isPassedSourceSummary(productionSummary);
  const subcontractPdfPassed = isPassedSourceSummary(subcontractSummary);
  const reportsCutoverPassed =
    reportsCutoverSummary.status === "passed" && reportsCutoverSummary.gate === "GREEN";
  const gate =
    tsc.status === 0 &&
    eslint.status === 0 &&
    pdfSourceSmoke.status === 0 &&
    reportsCutoverPassed &&
    financePdfPassed &&
    productionPdfPassed &&
    subcontractPdfPassed &&
    structural.financeSourcePrimary &&
    structural.productionSourcePrimary &&
    structural.subcontractSourcePrimary &&
    structural.financeFallbackLocalRowsRemoved &&
    !structural.financeFallbackUsed &&
    structural.productionBackendPrimary &&
    structural.subcontractBackendPrimary &&
    !structural.productionFallbackUsed &&
    !structural.subcontractFallbackUsed
      ? "GREEN"
      : "NOT_GREEN";

  const summary = {
    status: gate === "GREEN" ? "passed" : "failed",
    gate,
    tscPassed: tsc.status === 0,
    eslintPassed: eslint.status === 0,
    reportsCutoverPassed,
    financePdfPassed,
    productionPdfPassed,
    subcontractPdfPassed,
    primaryOwnerFinance: financeSummary.source ?? null,
    primaryOwnerProduction: productionSummary.source ?? null,
    primaryOwnerSubcontract: subcontractSummary.source ?? null,
    fallbackUsedFinance: structural.financeFallbackUsed,
    fallbackUsedProduction: structural.productionFallbackUsed,
    fallbackUsedSubcontract: structural.subcontractFallbackUsed,
    financePdfSource: financeSummary,
    selectedObjectName: productionSummary.selectedObjectName ?? subcontractSummary.selectedObjectName ?? null,
  };

  writeJson(`${artifactBase}.json`, {
    summary,
    commands: {
      tsc,
      eslint,
      pdfSourceSmoke,
    },
    reportsCutoverSummary,
    financeSummary,
    productionSummary,
    subcontractSummary,
    structural,
  });
  writeJson(`${artifactBase}.summary.json`, summary);

  console.log(JSON.stringify(summary, null, 2));

  if (gate !== "GREEN") {
    process.exitCode = 1;
  }
}

main();
