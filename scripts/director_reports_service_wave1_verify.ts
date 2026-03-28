import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const projectRoot = process.cwd();
const artifactDir = path.join(projectRoot, "artifacts");
const summaryPath = path.join(artifactDir, "director-reports-service-wave1-summary.json");
const smokePath = path.join(artifactDir, "director-reports-service-wave1-smoke.json");
const beforeAfterPath = path.join(artifactDir, "director-reports-service-wave1-before-after.txt");

const facadePath = "src/lib/api/director_reports.service.ts";
const familyFiles = [
  "src/lib/api/director_reports.service.shared.ts",
  "src/lib/api/director_reports.service.options.ts",
  "src/lib/api/director_reports.service.report.ts",
  "src/lib/api/director_reports.service.discipline.ts",
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
  const sharedSource = readText("src/lib/api/director_reports.service.shared.ts");
  const optionsSource = readText("src/lib/api/director_reports.service.options.ts");
  const reportSource = readText("src/lib/api/director_reports.service.report.ts");
  const disciplineSource = readText("src/lib/api/director_reports.service.discipline.ts");

  const removedBodies = [
    "export async function fetchDirectorWarehouseReportOptionsTracked(",
    "export async function fetchDirectorWarehouseReportTracked(",
    "export async function fetchDirectorWarehouseReportDisciplineTracked(",
    "const summarizeDisciplinePayload =",
    "const trackedResult =",
  ];

  const service = await import("../src/lib/api/director_reports.service");

  const smoke = {
    facadeExportsOptionsTracked:
      typeof service.fetchDirectorWarehouseReportOptionsTracked === "function",
    facadeExportsReportTracked:
      typeof service.fetchDirectorWarehouseReportTracked === "function",
    facadeExportsDisciplineTracked:
      typeof service.fetchDirectorWarehouseReportDisciplineTracked === "function",
    facadeExportsHelpers:
      typeof service.trackedResult === "function"
      && typeof service.summarizeDisciplinePayload === "function"
      && typeof service.recordDirectorReportsServiceWarning === "function",
    disciplineSummaryOk:
      service.summarizeDisciplinePayload({
        summary: {
          total_qty: 0,
          total_docs: 0,
          total_positions: 0,
          pct_without_work: 0,
          pct_without_level: 0,
          pct_without_request: 0,
          issue_cost_total: 0,
          purchase_cost_total: 0,
          issue_to_purchase_pct: 0,
          unpriced_issue_pct: 0,
        },
        works: [
          {
            id: "work-1",
            work_type_name: "Работы",
            total_qty: 1,
            total_docs: 1,
            total_positions: 1,
            share_total_pct: 100,
            req_positions: 1,
            free_positions: 0,
            levels: [
              {
                id: "level-1",
                level_name: "Этаж 1",
                total_qty: 1,
                total_docs: 1,
                total_positions: 1,
                share_in_work_pct: 100,
                req_positions: 1,
                free_positions: 0,
                materials: [
                  {
                    material_name: "Кабель",
                    rik_code: "RIK-001",
                    uom: "м",
                    qty_sum: 1,
                    docs_count: 1,
                  },
                ],
              },
            ],
          },
        ],
      }).materials === 1,
    trackedResultMetaOk:
      service.trackedResult(
        { objects: [], objectIdByName: {} },
        {
          stage: "options",
          branch: "empty",
          chain: ["empty"],
          cacheLayer: "none",
        },
      ).meta.branch === "empty",
  };

  const summary = {
    status:
      currentSource.includes('from "./director_reports.service.shared"')
      && currentSource.includes('from "./director_reports.service.options"')
      && currentSource.includes('from "./director_reports.service.report"')
      && currentSource.includes('from "./director_reports.service.discipline"')
      && removedBodies.every((marker) => !currentSource.includes(marker))
      && familyFiles.every((file) => fs.existsSync(path.join(projectRoot, file)))
      && sharedSource.includes("export const trackedResult =")
      && optionsSource.includes("fetchDirectorWarehouseReportOptionsTracked")
      && reportSource.includes("fetchDirectorWarehouseReportTracked")
      && disciplineSource.includes("fetchDirectorWarehouseReportDisciplineTracked")
      && Object.values(smoke).every(Boolean)
        ? "GREEN"
        : "NOT GREEN",
    before: {
      serviceLines: countLines(baselineSource),
      serviceBytes: Buffer.byteLength(baselineSource, "utf8"),
    },
    after: {
      serviceLines: countLines(currentSource),
      serviceBytes: Buffer.byteLength(currentSource, "utf8"),
      familyFiles,
      familyLines: Object.fromEntries(
        familyFiles.map((file) => [file, countLines(readText(file))]),
      ),
    },
    checks: {
      facadeExportsShared: currentSource.includes('from "./director_reports.service.shared"'),
      facadeExportsOptions: currentSource.includes('from "./director_reports.service.options"'),
      facadeExportsReport: currentSource.includes('from "./director_reports.service.report"'),
      facadeExportsDiscipline: currentSource.includes('from "./director_reports.service.discipline"'),
      oldBodiesRemoved: removedBodies.every((marker) => !currentSource.includes(marker)),
      familyFilesPresent: familyFiles.every((file) => fs.existsSync(path.join(projectRoot, file))),
      sharedCarriesTrackedResult: sharedSource.includes("export const trackedResult ="),
      optionsCarriesFetcher: optionsSource.includes("fetchDirectorWarehouseReportOptionsTracked"),
      reportCarriesFetcher: reportSource.includes("fetchDirectorWarehouseReportTracked"),
      disciplineCarriesFetcher: disciplineSource.includes("fetchDirectorWarehouseReportDisciplineTracked"),
    },
    smoke,
  };

  const beforeAfter = [
    "Director Reports Service Wave 1",
    `before_lines=${summary.before.serviceLines}`,
    `after_lines=${summary.after.serviceLines}`,
    `before_bytes=${summary.before.serviceBytes}`,
    `after_bytes=${summary.after.serviceBytes}`,
    "",
    "moved_to_service_shared:",
    "- trackedResult",
    "- recordDirectorReportsServiceWarning",
    "- summarizeDisciplinePayload",
    "- fetch meta/branch types",
    "",
    "moved_to_service_options:",
    "- fetchDirectorWarehouseReportOptionsTracked",
    "- fetchDirectorWarehouseReportOptions",
    "",
    "moved_to_service_report:",
    "- fetchDirectorWarehouseReportTracked",
    "- fetchDirectorWarehouseReport",
    "",
    "moved_to_service_discipline:",
    "- fetchDirectorWarehouseReportDisciplineTracked",
    "- fetchDirectorWarehouseReportDiscipline",
  ].join("\n");

  writeJson(summaryPath, summary);
  writeJson(smokePath, smoke);
  fs.mkdirSync(path.dirname(beforeAfterPath), { recursive: true });
  fs.writeFileSync(beforeAfterPath, `${beforeAfter}\n`);

  console.log(
    JSON.stringify(
      {
        status: summary.status,
        beforeLines: summary.before.serviceLines,
        afterLines: summary.after.serviceLines,
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
