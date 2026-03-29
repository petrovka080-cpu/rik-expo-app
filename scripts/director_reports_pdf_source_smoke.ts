import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";

type GlobalDevFlag = typeof globalThis & { __DEV__?: boolean };

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });
(globalThis as GlobalDevFlag).__DEV__ = false;

const projectRoot = process.cwd();
const productionBase = path.join(projectRoot, "artifacts", "pdf-batchh2-smoke");
const subcontractBase = path.join(projectRoot, "artifacts", "pdf-batchh3-smoke");
const financeBase = path.join(projectRoot, "artifacts", "pdf-batchh-smoke");

const writeJson = (fullPath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const readJson = (relativePath: string): Record<string, unknown> => {
  const fullPath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(fullPath)) return {};
  return JSON.parse(fs.readFileSync(fullPath, "utf8")) as Record<string, unknown>;
};

const isoDate = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const minusDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
};

async function resolveSelectedObjectName() {
  const existingCutover = readJson("artifacts/director-reports-backend-cutover.summary.json");
  const selectedFromArtifact = String(existingCutover.selectedObjectName ?? "").trim();
  if (selectedFromArtifact) return selectedFromArtifact;

  const transportScopeService = await import("../src/lib/api/directorReportsTransport.service");
  const defaultTransport = await transportScopeService.loadDirectorReportTransportScope({
    from: "",
    to: "",
    objectName: null,
    includeDiscipline: false,
    skipDisciplinePrices: false,
    bypassCache: true,
  });

  for (const objectName of defaultTransport.options.objects.slice(0, 8)) {
    const objectScope = await transportScopeService.loadDirectorReportTransportScope({
      from: "",
      to: "",
      objectName,
      includeDiscipline: false,
      skipDisciplinePrices: false,
      bypassCache: true,
    });
    if ((objectScope.report?.rows?.length ?? 0) > 0) {
      return objectName;
    }
  }

  return defaultTransport.options.objects[0] ?? null;
}

async function main() {
  const pdfSourceService = await import("../src/lib/api/directorPdfSource.service");
  const selectedObjectName = await resolveSelectedObjectName();
  const periodFrom = isoDate(minusDays(30));
  const periodTo = isoDate(new Date());

  let financeError: string | null = null;
  let productionError: string | null = null;
  let subcontractError: string | null = null;

  const financeSummary = await (async () => {
    try {
      const source = await pdfSourceService.getDirectorFinancePdfSource({
        periodFrom: null,
        periodTo: null,
      });
      const summary = {
        status:
          source.source === "rpc:pdf_director_finance_source_v1" &&
          source.branchMeta.sourceBranch === "rpc_v1"
            ? "passed"
            : "failed",
        source: source.source,
        sourceBranch: source.branchMeta.sourceBranch,
        fallbackReason: source.branchMeta.fallbackReason ?? null,
        financeRows: source.financeRows.length,
        spendRows: source.spendRows.length,
        selectedObjectName: null,
        assertions: {
          no_pdf_fallback:
            source.source === "rpc:pdf_director_finance_source_v1" &&
            source.branchMeta.sourceBranch === "rpc_v1",
        },
        error: null,
      };
      writeJson(`${financeBase}.summary.json`, summary);
      writeJson(`${financeBase}.json`, { summary, source });
      return summary;
    } catch (error) {
      financeError = error instanceof Error ? error.message : String(error);
      const summary = {
        status: "failed",
        source: null,
        sourceBranch: null,
        fallbackReason: null,
        financeRows: 0,
        spendRows: 0,
        selectedObjectName: null,
        assertions: { no_pdf_fallback: false },
        error: financeError,
      };
      writeJson(`${financeBase}.summary.json`, summary);
      writeJson(`${financeBase}.json`, { summary });
      return summary;
    }
  })();

  const productionSummary = await (async () => {
    try {
      const source = await pdfSourceService.getDirectorProductionPdfSource({
        periodFrom,
        periodTo,
        objectName: selectedObjectName,
        preferPriceStage: "priced",
      });
      const summary = {
        status:
          source.source === "transport:director_report_scope_rpc_v1" &&
          source.branchMeta.sourceBranch === "rpc_v1" &&
          Array.isArray(source.repData.rows) &&
          Array.isArray(source.repDiscipline.works)
            ? "passed"
            : "failed",
        source: source.source,
        sourceBranch: source.branchMeta.sourceBranch,
        fallbackReason: source.branchMeta.fallbackReason ?? null,
        selectedObjectName,
        periodFrom,
        periodTo,
        reportRows: Array.isArray(source.repData.rows) ? source.repData.rows.length : 0,
        disciplineWorks: Array.isArray(source.repDiscipline.works) ? source.repDiscipline.works.length : 0,
        assertions: {
          no_pdf_fallback:
            source.source === "transport:director_report_scope_rpc_v1" &&
            source.branchMeta.sourceBranch === "rpc_v1",
        },
        error: null,
      };
      writeJson(`${productionBase}.summary.json`, summary);
      writeJson(`${productionBase}.json`, { summary, source });
      return summary;
    } catch (error) {
      productionError = error instanceof Error ? error.message : String(error);
      const summary = {
        status: "failed",
        source: null,
        sourceBranch: null,
        fallbackReason: null,
        selectedObjectName,
        periodFrom,
        periodTo,
        reportRows: 0,
        disciplineWorks: 0,
        assertions: { no_pdf_fallback: false },
        error: productionError,
      };
      writeJson(`${productionBase}.summary.json`, summary);
      writeJson(`${productionBase}.json`, { summary });
      return summary;
    }
  })();

  const subcontractSummary = await (async () => {
    try {
      const source = await pdfSourceService.getDirectorSubcontractPdfSource({
        periodFrom,
        periodTo,
        objectName: selectedObjectName,
      });
      const summary = {
        status:
          source.source === "rpc:pdf_director_subcontract_source_v1" &&
          source.branchMeta.sourceBranch === "rpc_v1" &&
          Array.isArray(source.rows)
            ? "passed"
            : "failed",
        source: source.source,
        sourceBranch: source.branchMeta.sourceBranch,
        fallbackReason: source.branchMeta.fallbackReason ?? null,
        selectedObjectName,
        periodFrom,
        periodTo,
        rows: Array.isArray(source.rows) ? source.rows.length : 0,
        assertions: {
          no_pdf_fallback:
            source.source === "rpc:pdf_director_subcontract_source_v1" &&
            source.branchMeta.sourceBranch === "rpc_v1",
        },
        error: null,
      };
      writeJson(`${subcontractBase}.summary.json`, summary);
      writeJson(`${subcontractBase}.json`, { summary, source });
      return summary;
    } catch (error) {
      subcontractError = error instanceof Error ? error.message : String(error);
      const summary = {
        status: "failed",
        source: null,
        sourceBranch: null,
        fallbackReason: null,
        selectedObjectName,
        periodFrom,
        periodTo,
        rows: 0,
        assertions: { no_pdf_fallback: false },
        error: subcontractError,
      };
      writeJson(`${subcontractBase}.summary.json`, summary);
      writeJson(`${subcontractBase}.json`, { summary });
      return summary;
    }
  })();

  const overall = {
    status:
      financeSummary.status === "passed" &&
      productionSummary.status === "passed" &&
      subcontractSummary.status === "passed"
        ? "passed"
        : "failed",
    selectedObjectName,
    finance: financeSummary,
    production: productionSummary,
    subcontract: subcontractSummary,
  };

  console.log(JSON.stringify(overall, null, 2));

  if (overall.status !== "passed") {
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
