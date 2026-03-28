import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const projectRoot = process.cwd();
const artifactDir = path.join(projectRoot, "artifacts");
const summaryPath = path.join(artifactDir, "director-reports-payloads-wave1-summary.json");
const smokePath = path.join(artifactDir, "director-reports-payloads-wave1-smoke.json");
const beforeAfterPath = path.join(artifactDir, "director-reports-payloads-wave1-before-after.txt");

const facadePath = "src/lib/api/director_reports.payloads.ts";
const familyFiles = [
  "src/lib/api/director_reports.payloads.materials.ts",
  "src/lib/api/director_reports.payloads.discipline.ts",
  "src/lib/api/director_reports.payloads.snapshots.ts",
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
  const materialsSource = readText("src/lib/api/director_reports.payloads.materials.ts");
  const disciplineSource = readText("src/lib/api/director_reports.payloads.discipline.ts");
  const snapshotsSource = readText("src/lib/api/director_reports.payloads.snapshots.ts");

  const removedBodies = [
    "function buildPayloadFromFactRows(",
    "function buildDisciplinePayloadFromFactRowsLegacy(",
    "function buildDisciplinePayloadFromFactRows(",
    "function collectDisciplinePriceInputs(",
    "const materialSnapshotFromPayload =",
    "const worksSnapshotFromPayload =",
  ];

  const payloads = await import("../src/lib/api/director_reports.payloads");

  const sampleRows = [
    {
      issue_id: "issue-1",
      issue_item_id: "item-1",
      iss_date: "2026-03-29",
      request_id: "req-1",
      request_item_id: "req-item-1",
      object_id_resolved: "obj-1",
      object_name_resolved: "Объект A",
      work_name_resolved: "Работы",
      level_name_resolved: "Этаж 1",
      system_name_resolved: "ОВ",
      zone_name_resolved: "Зона 1",
      material_name_resolved: "Кабель",
      rik_code_resolved: "RIK-001",
      uom_resolved: "м",
      qty: 12,
      is_without_request: false,
      item_kind: "material" as const,
    },
    {
      issue_id: "issue-2",
      issue_item_id: "item-2",
      iss_date: "2026-03-29",
      request_id: null,
      request_item_id: null,
      object_id_resolved: null,
      object_name_resolved: "Без объекта",
      work_name_resolved: "Без вида работ",
      level_name_resolved: "Без этажа",
      system_name_resolved: null,
      zone_name_resolved: null,
      material_name_resolved: "Лента",
      rik_code_resolved: "RIK-002",
      uom_resolved: "шт",
      qty: 3,
      is_without_request: true,
      item_kind: "material" as const,
    },
  ];

  const reportPayload = payloads.buildPayloadFromFactRows({
    from: "2026-03-01",
    to: "2026-03-31",
    objectName: null,
    rows: sampleRows,
  });
  const disciplinePayload = payloads.buildDisciplinePayloadFromFactRows(sampleRows, {
    price_by_code: new Map([
      ["RIK-001", 10],
      ["RIK-002", 5],
    ]),
  });
  const priceInputs = payloads.collectDisciplinePriceInputs(sampleRows);
  const materialSnapshot = payloads.materialSnapshotFromPayload(reportPayload);
  const worksSnapshot = payloads.worksSnapshotFromPayload(disciplinePayload);

  const smoke = {
    facadeExportsMaterialBuilder: typeof payloads.buildPayloadFromFactRows === "function",
    facadeExportsDisciplineBuilder: typeof payloads.buildDisciplinePayloadFromFactRows === "function",
    facadeExportsLegacyDisciplineBuilder:
      typeof payloads.buildDisciplinePayloadFromFactRowsLegacy === "function",
    facadeExportsSnapshots:
      typeof payloads.materialSnapshotFromPayload === "function"
      && typeof payloads.worksSnapshotFromPayload === "function",
    facadeExportsPct: typeof payloads.pct === "function" && payloads.pct(1, 4) === 25,
    materialRowsOk: Array.isArray(reportPayload.rows) && reportPayload.rows.length === 2,
    disciplineWorksOk: Array.isArray(disciplinePayload.works) && disciplinePayload.works.length >= 1,
    priceInputsOk:
      priceInputs.requestItemIds.length === 1
      && priceInputs.rowCodes.length === 2
      && priceInputs.costInputs.length === 2,
    snapshotsOk:
      materialSnapshot.rows_count === 2
      && worksSnapshot.works_count === disciplinePayload.works.length,
  };

  const summary = {
    status:
      currentSource.includes('from "./director_reports.payloads.materials"')
      && currentSource.includes('from "./director_reports.payloads.discipline"')
      && currentSource.includes('from "./director_reports.payloads.snapshots"')
      && removedBodies.every((marker) => !currentSource.includes(marker))
      && familyFiles.every((file) => fs.existsSync(path.join(projectRoot, file)))
      && materialsSource.includes("function buildPayloadFromFactRows(")
      && disciplineSource.includes("function buildDisciplinePayloadFromFactRows(")
      && disciplineSource.includes("function collectDisciplinePriceInputs(")
      && snapshotsSource.includes("const materialSnapshotFromPayload =")
      && Object.values(smoke).every(Boolean)
        ? "GREEN"
        : "NOT GREEN",
    before: {
      payloadsLines: countLines(baselineSource),
      payloadsBytes: Buffer.byteLength(baselineSource, "utf8"),
    },
    after: {
      payloadsLines: countLines(currentSource),
      payloadsBytes: Buffer.byteLength(currentSource, "utf8"),
      familyFiles,
      familyLines: Object.fromEntries(
        familyFiles.map((file) => [file, countLines(readText(file))]),
      ),
    },
    checks: {
      facadeExportsMaterials: currentSource.includes('from "./director_reports.payloads.materials"'),
      facadeExportsDiscipline: currentSource.includes('from "./director_reports.payloads.discipline"'),
      facadeExportsSnapshots: currentSource.includes('from "./director_reports.payloads.snapshots"'),
      oldBodiesRemoved: removedBodies.every((marker) => !currentSource.includes(marker)),
      familyFilesPresent: familyFiles.every((file) => fs.existsSync(path.join(projectRoot, file))),
      materialsCarriesBuilder: materialsSource.includes("function buildPayloadFromFactRows("),
      disciplineCarriesBuilders:
        disciplineSource.includes("function buildDisciplinePayloadFromFactRows(")
        && disciplineSource.includes("function collectDisciplinePriceInputs("),
      snapshotsCarryPayloadSnapshots: snapshotsSource.includes("const materialSnapshotFromPayload ="),
    },
    smoke,
  };

  const beforeAfter = [
    "Director Reports Payloads Wave 1",
    `before_lines=${summary.before.payloadsLines}`,
    `after_lines=${summary.after.payloadsLines}`,
    `before_bytes=${summary.before.payloadsBytes}`,
    `after_bytes=${summary.after.payloadsBytes}`,
    "",
    "moved_to_payloads_materials:",
    "- buildPayloadFromFactRows",
    "",
    "moved_to_payloads_discipline:",
    "- pct",
    "- buildDisciplinePayloadFromFactRowsLegacy",
    "- buildDisciplinePayloadFromFactRows",
    "- collectDisciplinePriceInputs",
    "",
    "moved_to_payloads_snapshots:",
    "- materialSnapshotFromPayload",
    "- worksSnapshotFromPayload",
    "",
    "payloads_facade_keeps:",
    "- compatibility exports only",
  ].join("\n");

  writeJson(summaryPath, summary);
  writeJson(smokePath, smoke);
  fs.mkdirSync(path.dirname(beforeAfterPath), { recursive: true });
  fs.writeFileSync(beforeAfterPath, `${beforeAfter}\n`);

  console.log(
    JSON.stringify(
      {
        status: summary.status,
        beforeLines: summary.before.payloadsLines,
        afterLines: summary.after.payloadsLines,
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
