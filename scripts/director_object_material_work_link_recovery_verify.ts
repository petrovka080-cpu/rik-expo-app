import fs from "node:fs";
import path from "node:path";

import { config as loadDotenv } from "dotenv";

type GlobalDevFlag = typeof globalThis & { __DEV__?: boolean };

loadDotenv({ path: ".env.local", override: false });
loadDotenv({ path: ".env", override: false });
(globalThis as GlobalDevFlag).__DEV__ = false;

const projectRoot = process.cwd();
const artifactsDir = path.join(projectRoot, "artifacts");

const writeJson = (relativePath: string, payload: unknown) => {
  const fullPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
};

const countLevels = (works: Array<{ levels?: unknown[] }> | null | undefined) =>
  (works ?? []).reduce((sum, work) => sum + (Array.isArray(work.levels) ? work.levels.length : 0), 0);

const countMaterials = (works: Array<{ levels?: Array<{ materials?: unknown[] }> }> | null | undefined) =>
  (works ?? []).reduce(
    (sum, work) =>
      sum +
      (Array.isArray(work.levels)
        ? work.levels.reduce(
            (levelSum, level) => levelSum + (Array.isArray(level.materials) ? level.materials.length : 0),
            0,
          )
        : 0),
    0,
  );

const firstSample = <T>(rows: T[], count = 5) => rows.slice(0, count);

async function main() {
  const {
    loadDirectorReportTransportScope,
  } = await import("../src/lib/api/directorReportsTransport.service");
  const {
    fetchDirectorWarehouseReportDisciplineTracked,
    fetchDirectorWarehouseReportOptionsTracked,
  } = await import("../src/lib/api/director_reports");
  const { fetchFactRowsForDiscipline } = await import("../src/lib/api/director_reports.transport");
  const {
    buildDirectorObjectLinkedIssues,
    summarizeDirectorObjectLinkedIssues,
  } = await import("../src/lib/api/director_reports.linkedIssues");
  const { hasCanonicalWorksDetailLevels } = await import("../src/lib/api/director_reports.fallbacks");
  const { WITHOUT_WORK } = await import("../src/lib/api/director_reports.shared");

  const optionsResult = await fetchDirectorWarehouseReportOptionsTracked({
    from: "",
    to: "",
  });
  const objectIdByName = optionsResult.payload.objectIdByName;

  const transportScope = await loadDirectorReportTransportScope({
    from: "",
    to: "",
    objectName: null,
    includeDiscipline: true,
    skipDisciplinePrices: false,
    bypassCache: true,
  });

  const disciplineTracked = await fetchDirectorWarehouseReportDisciplineTracked(
    {
      from: "",
      to: "",
      objectName: null,
      objectIdByName,
    },
    { skipPrices: false },
  );

  const rowsResult = await fetchFactRowsForDiscipline({
    from: "1970-01-01",
    to: "2099-12-31",
    objectName: null,
    objectIdByName,
    skipMaterialNameResolve: false,
  });

  const linkedIssues = buildDirectorObjectLinkedIssues(rowsResult.rows);
  const linkedSummary = summarizeDirectorObjectLinkedIssues(linkedIssues);
  const linkedRows = linkedIssues.filter((issue) => issue.linkState === "linked");
  const partialRows = linkedIssues.filter((issue) => issue.linkState === "partial");
  const unlinkedRows = linkedIssues.filter((issue) => issue.linkState === "unlinked");

  const selectedObjectName =
    linkedRows.find((issue) => issue.objectName)?.objectName ??
    disciplineTracked.payload.works
      .flatMap((work) => work.levels ?? [])
      .map((level) => String(level.object_name ?? "").trim())
      .find(Boolean) ??
    null;

  const objectScoped =
    selectedObjectName == null
      ? null
      : await loadDirectorReportTransportScope({
          from: "",
          to: "",
          objectName: selectedObjectName,
          includeDiscipline: true,
          skipDisciplinePrices: false,
          bypassCache: true,
        });

  const syntheticIssues = buildDirectorObjectLinkedIssues([
    {
      issue_id: "synthetic-linked",
      issue_item_id: "li-1",
      iss_date: "2026-03-29",
      request_id: "req-1",
      request_item_id: "req-item-1",
      object_id_resolved: "obj-1",
      object_name_resolved: "Объект A",
      work_name_resolved: "Армирование",
      level_name_resolved: "1 этаж",
      system_name_resolved: "Армирование",
      zone_name_resolved: "Секция 1",
      material_name_resolved: "Материал 1",
      rik_code_resolved: "MAT-1",
      uom_resolved: "шт",
      qty: 1,
      is_without_request: false,
      item_kind: "material",
    },
    {
      issue_id: "synthetic-partial",
      issue_item_id: "pa-1",
      iss_date: "2026-03-29",
      request_id: "req-2",
      request_item_id: "req-item-2",
      object_id_resolved: "obj-2",
      object_name_resolved: "Объект B",
      work_name_resolved: WITHOUT_WORK,
      level_name_resolved: "2 этаж",
      system_name_resolved: "ОВ",
      zone_name_resolved: "Секция 2",
      material_name_resolved: "Материал 2",
      rik_code_resolved: "MAT-2",
      uom_resolved: "шт",
      qty: 1,
      is_without_request: false,
      item_kind: "material",
    },
    {
      issue_id: "synthetic-unlinked",
      issue_item_id: "un-1",
      iss_date: "2026-03-29",
      request_id: null,
      request_item_id: null,
      object_id_resolved: null,
      object_name_resolved: "Без объекта",
      work_name_resolved: WITHOUT_WORK,
      level_name_resolved: "Без этажа",
      system_name_resolved: null,
      zone_name_resolved: null,
      material_name_resolved: "Материал 3",
      rik_code_resolved: "MAT-3",
      uom_resolved: "шт",
      qty: 1,
      is_without_request: true,
      item_kind: "material",
    },
  ]);
  const syntheticStateMap = Object.fromEntries(
    syntheticIssues.map((issue) => [issue.issueId, issue.linkState]),
  );

  const transportWorks = transportScope.discipline?.works ?? [];
  const transportLevels = countLevels(transportWorks);
  const transportMaterials = countMaterials(transportWorks);
  const transportWithoutWorkPositions = transportWorks
    .filter((work) => String(work.work_type_name ?? "").trim().startsWith(WITHOUT_WORK))
    .reduce((sum, work) => sum + Number(work.total_positions ?? 0), 0);

  const transportObjectNames = new Set(
    transportWorks
      .flatMap((work) => work.levels ?? [])
      .map((level) => String(level.object_name ?? "").trim())
      .filter(Boolean),
  );

  const linkMapArtifact = {
    gate: "director_object_material_work_link_recovery",
    selectedObjectName,
    sourceChain: {
      transportSource: transportScope.source,
      transportBranch: transportScope.branchMeta.transportBranch,
      transportFallbackReason: transportScope.branchMeta.fallbackReason ?? null,
      disciplineBranch: disciplineTracked.meta.branch,
      disciplineChain: disciplineTracked.meta.chain,
      disciplineRowsSource: rowsResult.source,
      disciplineRowsChain: rowsResult.chain,
    },
    requestOwnedContext: [
      "request_id",
      "request_item_id",
      "object_id_resolved",
      "object_name_resolved",
      "level_name_resolved",
      "system_name_resolved",
      "zone_name_resolved",
      "work_name_resolved",
    ],
    warehouseIssueContext: [
      "issue_id",
      "issue_item_id",
      "request_id",
      "request_item_id",
      "object_name_resolved",
      "work_name_resolved",
    ],
    liveCounts: {
      factRows: rowsResult.rows.length,
      linkedIssues: linkedSummary.linkedCount,
      partialIssues: linkedSummary.partialCount,
      unlinkedIssues: linkedSummary.unlinkedCount,
      documents: linkedSummary.documentsCount,
      positions: linkedSummary.positionsCount,
      materials: linkedSummary.materialsCount,
      objects: linkedSummary.objectsCount,
      works: linkedSummary.worksCount,
      levels: linkedSummary.levelsCount,
    },
    samples: {
      linked: firstSample(linkedRows),
      partial: firstSample(partialRows),
      unlinked: firstSample(unlinkedRows),
    },
  };

  const linkedSummaryArtifact = {
    gate: "director_object_material_work_link_recovery",
    selectedObjectName,
    summary: linkedSummary,
    transport: {
      branch: transportScope.branchMeta.transportBranch,
      fallbackReason: transportScope.branchMeta.fallbackReason ?? null,
      disciplineWorks: transportWorks.length,
      disciplineLevels: transportLevels,
      disciplineMaterials: transportMaterials,
      objectNames: Array.from(transportObjectNames.values()).sort((a, b) => a.localeCompare(b, "ru")),
    },
  };

  const splitArtifact = {
    gate: "director_object_material_work_link_recovery",
    linkedCount: linkedSummary.linkedCount,
    partialCount: linkedSummary.partialCount,
    unlinkedCount: linkedSummary.unlinkedCount,
    samples: {
      linked: firstSample(linkedRows),
      partial: firstSample(partialRows),
      unlinked: firstSample(unlinkedRows),
    },
    syntheticSmoke: syntheticStateMap,
  };

  const objectAggregationArtifact = {
    gate: "director_object_material_work_link_recovery",
    transport: {
      source: transportScope.source,
      branch: transportScope.branchMeta.transportBranch,
      fallbackReason: transportScope.branchMeta.fallbackReason ?? null,
      hasLinkedDetailLevels: hasCanonicalWorksDetailLevels(transportScope.discipline),
      objects: transportObjectNames.size,
      documents: Number(transportScope.discipline?.summary.total_docs ?? 0),
      positions: Number(transportScope.discipline?.summary.total_positions ?? 0),
      works: transportWorks.length,
      levels: transportLevels,
      materials: transportMaterials,
      withoutWorkPositions: transportWithoutWorkPositions,
      selectedObject: selectedObjectName,
      selectedObjectBranch: objectScoped?.branchMeta.transportBranch ?? null,
      selectedObjectWorks: objectScoped?.discipline?.works.length ?? 0,
      selectedObjectLevels: countLevels(objectScoped?.discipline?.works ?? []),
      selectedObjectHasLinkedDetailLevels: objectScoped ? hasCanonicalWorksDetailLevels(objectScoped.discipline) : null,
    },
    linkedSummary,
  };

  const green =
    (transportScope.branchMeta.transportBranch !== "rpc_scope_v1" ||
      hasCanonicalWorksDetailLevels(transportScope.discipline)) &&
    linkedSummary.documentsCount > 0 &&
    linkedSummary.positionsCount > 0 &&
    linkedSummary.materialsCount > 0 &&
    linkedSummary.objectsCount > 0 &&
    linkedSummary.linkedCount > 0 &&
    transportWorks.length > 0 &&
    transportLevels > 0 &&
    transportMaterials > 0 &&
    (objectScoped == null ||
      ((objectScoped.branchMeta.transportBranch !== "rpc_scope_v1" ||
        hasCanonicalWorksDetailLevels(objectScoped.discipline)) &&
        (objectScoped.discipline?.works.length ?? 0) > 0 &&
        countLevels(objectScoped.discipline?.works ?? []) > 0)) &&
    syntheticStateMap["synthetic-linked"] === "linked" &&
    syntheticStateMap["synthetic-partial"] === "partial" &&
    syntheticStateMap["synthetic-unlinked"] === "unlinked";

  writeJson("artifacts/director-object-material-work-link-map.json", linkMapArtifact);
  writeJson("artifacts/director-object-linked-issues-summary.json", linkedSummaryArtifact);
  writeJson("artifacts/director-linked-vs-partial-vs-unlinked.json", splitArtifact);
  writeJson("artifacts/director-object-aggregation-runtime-proof.json", {
    ...objectAggregationArtifact,
    status: green ? "GREEN" : "NOT GREEN",
  });

  console.log(
    JSON.stringify(
      {
        gate: "director_object_material_work_link_recovery",
        status: green ? "GREEN" : "NOT GREEN",
        transportBranch: transportScope.branchMeta.transportBranch,
        transportFallbackReason: transportScope.branchMeta.fallbackReason ?? null,
        linkedSummary,
        transportCounts: {
          works: transportWorks.length,
          levels: transportLevels,
          materials: transportMaterials,
        },
        selectedObjectName,
      },
      null,
      2,
    ),
  );

  if (!green) process.exitCode = 1;
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
