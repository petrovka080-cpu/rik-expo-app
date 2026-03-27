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

const isPassedPdfSummary = (summary: SummaryLike) =>
  summary.status === "passed" &&
  summary.finalSourceKind === "remote-url" &&
  summary.finalScheme === "https" &&
  summary.initialScheme === "https" &&
  summary.signedUrlStatus === 200 &&
  Number(summary.signedUrlBytes ?? 0) > 0 &&
  summary.error == null;

const isPassedRuntimeSummary = (summary: SummaryLike) =>
  summary.status === "passed" &&
  summary.webPassed === true &&
  summary.androidPassed === true &&
  (summary.iosPassed === true || typeof summary.iosResidual === "string");

function main() {
  const tsc = run("npx", ["tsc", "--noEmit", "--pretty", "false"]);
  const eslint = run("npx", [
    "eslint",
    "scripts/director_reports_runtime_verify.ts",
    "scripts/director_reports_pdf_backend_cutover.ts",
  ]);
  const runtime = run("npx", ["tsx", "scripts/director_reports_runtime_verify.ts"]);
  const productionPdf = run("node", ["artifacts/pdf_batchh2_smoke.mjs"]);
  const subcontractPdf = run("node", ["artifacts/pdf_batchh3_smoke.mjs"]);

  const runtimeSummary = readJson("artifacts/director-reports-runtime.summary.json");
  const productionSummary = readJson("artifacts/pdf-batchh2-smoke.summary.json");
  const subcontractSummary = readJson("artifacts/pdf-batchh3-smoke.summary.json");
  const productionAssertions = asRecord(productionSummary.assertions);
  const subcontractAssertions = asRecord(subcontractSummary.assertions);

  const pdfServiceSource = readText("src/screens/director/director.reports.pdfService.ts");
  const structural = {
    productionBackendPrimary:
      pdfServiceSource.includes("generateDirectorProductionReportPdfViaBackend") &&
      pdfServiceSource.includes("[director.reports.pdf] production backend fallback"),
    subcontractBackendPrimary:
      pdfServiceSource.includes("generateDirectorSubcontractReportPdfViaBackend") &&
      pdfServiceSource.includes("[director.reports.pdf] subcontract backend fallback"),
    productionFallbackUsed: productionAssertions.no_pdf_fallback !== true,
    subcontractFallbackUsed: subcontractAssertions.no_pdf_fallback !== true,
  };

  const productionPdfPassed = isPassedPdfSummary(productionSummary);
  const subcontractPdfPassed = isPassedPdfSummary(subcontractSummary);
  const runtimePassed = isPassedRuntimeSummary(runtimeSummary);
  const gate =
    tsc.status === 0 &&
    eslint.status === 0 &&
    runtime.status === 0 &&
    productionPdf.status === 0 &&
    subcontractPdf.status === 0 &&
    runtimePassed &&
    productionPdfPassed &&
    subcontractPdfPassed &&
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
    runtimePassed,
    productionPdfPassed,
    subcontractPdfPassed,
    primaryOwnerProduction: productionSummary.renderer ? "backend_production_report_v1" : null,
    primaryOwnerSubcontract: subcontractSummary.renderer ? "backend_subcontract_report_v1" : null,
    fallbackUsedProduction: structural.productionFallbackUsed,
    fallbackUsedSubcontract: structural.subcontractFallbackUsed,
    webPassed: runtimeSummary.webPassed === true && productionPdfPassed && subcontractPdfPassed,
    androidPassed: runtimeSummary.androidPassed === true,
    iosPassed: runtimeSummary.iosPassed === true,
    iosResidual: typeof runtimeSummary.iosResidual === "string" ? runtimeSummary.iosResidual : null,
    productionRenderer: productionSummary.renderer ?? null,
    subcontractRenderer: subcontractSummary.renderer ?? null,
    productionStoragePath: productionSummary.storagePath ?? null,
    subcontractStoragePath: subcontractSummary.storagePath ?? null,
    runtimeGateOk: runtimeSummary.status === "passed",
  };

  writeJson(`${artifactBase}.json`, {
    summary,
    commands: {
      tsc,
      eslint,
      runtime,
      productionPdf,
      subcontractPdf,
    },
    runtimeSummary,
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
