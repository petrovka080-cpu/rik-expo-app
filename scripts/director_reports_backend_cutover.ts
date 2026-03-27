import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import dotenv from "dotenv";

type GlobalDevFlag = typeof globalThis & { __DEV__?: boolean };
type UnknownRecord = Record<string, unknown>;

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });
(globalThis as GlobalDevFlag).__DEV__ = false;

const projectRoot = process.cwd();
const runtimeSummaryPath = path.join(projectRoot, "artifacts/director-reports-runtime.summary.json");
const fullOutPath = path.join(projectRoot, "artifacts/director-reports-backend-cutover.json");
const summaryOutPath = path.join(projectRoot, "artifacts/director-reports-backend-cutover.summary.json");

type NumericParity = {
  left: number;
  right: number;
  delta: number;
  match: boolean;
};

type SetParity = {
  match: boolean;
  leftCount: number;
  rightCount: number;
  mismatchCount: number;
  sampleLeft: string[];
  sampleRight: string[];
};

type ScenarioResult = {
  name: string;
  objectName: string | null;
  reportOnlyOwnerOk: boolean;
  fullOwnerOk: boolean;
  fallbackUsed: boolean;
  rawEnvelopeOk: boolean;
  rawRpcError: string | null;
  sourceVersionOk: boolean;
  optionsParityOk: boolean;
  reportRowsParityOk: boolean;
  reportModeParityOk: boolean;
  kpiParityOk: boolean;
  disciplineSummaryParityOk: boolean;
  disciplineWorksParityOk: boolean;
  disciplineLevelsParityOk: boolean;
  disciplineMaterialsParityOk: boolean;
  metaParityOk: boolean;
  stableIdsOk: boolean;
  disciplinePricesReady: boolean;
  optionsParity: {
    rawVsTransport: SetParity;
    transportVsUi: SetParity;
    reportOnlyVsFull: SetParity;
    objectIdPairsRawVsTransport: SetParity;
    objectIdPairsTransportVsUi: SetParity;
  };
  reportRowsParity: {
    rawVsTransport: SetParity;
    transportVsUi: SetParity;
    reportOnlyVsFull: SetParity;
  };
  kpiParity: Record<string, NumericParity>;
  disciplineSummaryParity: Record<string, NumericParity>;
  disciplineParity: {
    worksRawVsTransport: SetParity;
    worksTransportVsUi: SetParity;
    levelsRawVsTransport: SetParity;
    levelsTransportVsUi: SetParity;
    materialsRawVsTransport: SetParity;
    materialsTransportVsUi: SetParity;
  };
  metaParity: {
    reportOnlyReportMeta: boolean;
    fullReportMeta: boolean;
    fullDisciplineMeta: boolean;
  };
  counts: {
    options: number;
    reportRows: number;
    works: number;
    levels: number;
    materials: number;
  };
};

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as UnknownRecord) : {};

const readJson = (fullPath: string): UnknownRecord | null => {
  if (!fs.existsSync(fullPath)) return null;
  return JSON.parse(fs.readFileSync(fullPath, "utf8")) as UnknownRecord;
};

const isPassedRuntimeSummary = (summary: UnknownRecord | null) => summary?.status === "passed";

const writeJson = (fullPath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const runNpx = (args: string[], timeoutMs = 15 * 60 * 1000) => {
  if (process.platform === "win32") {
    return spawnSync("cmd.exe", ["/d", "/s", "/c", `npx ${args.join(" ")}`], {
      cwd: projectRoot,
      encoding: "utf8",
      timeout: timeoutMs,
    });
  }
  return spawnSync("npx", args, {
    cwd: projectRoot,
    encoding: "utf8",
    timeout: timeoutMs,
  });
};

const compareNumber = (left: unknown, right: unknown, epsilon = 0.001): NumericParity => {
  const leftNumber = Number(left ?? 0);
  const rightNumber = Number(right ?? 0);
  const safeLeft = Number.isFinite(leftNumber) ? leftNumber : 0;
  const safeRight = Number.isFinite(rightNumber) ? rightNumber : 0;
  const delta = safeLeft - safeRight;
  return {
    left: safeLeft,
    right: safeRight,
    delta,
    match: Math.abs(delta) <= epsilon,
  };
};

const compareStringSets = (left: string[], right: string[]): SetParity => {
  const safeLeft = [...left].sort();
  const safeRight = [...right].sort();
  let mismatchCount = Math.abs(safeLeft.length - safeRight.length);
  const max = Math.min(safeLeft.length, safeRight.length);
  for (let index = 0; index < max; index += 1) {
    if (safeLeft[index] !== safeRight[index]) mismatchCount += 1;
  }
  return {
    match: mismatchCount === 0,
    leftCount: safeLeft.length,
    rightCount: safeRight.length,
    mismatchCount,
    sampleLeft: safeLeft.slice(0, 5),
    sampleRight: safeRight.slice(0, 5),
  };
};

const normalizeText = (value: unknown) => String(value ?? "").trim();

const reportRowSignature = (row: UnknownRecord) =>
  [
    normalizeText(row.rik_code),
    normalizeText(row.name_human_ru),
    normalizeText(row.uom),
    Number(row.qty_total ?? 0).toFixed(3),
    Number(row.docs_cnt ?? 0).toFixed(3),
    Number(row.qty_free ?? row.qty_without_request ?? 0).toFixed(3),
    Number(row.docs_free ?? row.docs_without_request ?? 0).toFixed(3),
  ].join("|");

const workSignature = (work: UnknownRecord) =>
  [
    normalizeText(work.id),
    normalizeText(work.work_type_name),
    Number(work.total_qty ?? 0).toFixed(3),
    Number(work.total_docs ?? 0).toFixed(3),
    Number(work.total_positions ?? 0).toFixed(3),
    Number(work.share_total_pct ?? 0).toFixed(3),
    Number(work.req_positions ?? 0).toFixed(3),
    Number(work.free_positions ?? 0).toFixed(3),
    Number(work.location_count ?? 0).toFixed(3),
  ].join("|");

const levelSignature = (workId: string, level: UnknownRecord) =>
  [
    workId,
    normalizeText(level.id),
    normalizeText(level.level_name),
    normalizeText(level.object_name),
    normalizeText(level.system_name),
    normalizeText(level.zone_name),
    normalizeText(level.location_label),
    Number(level.total_qty ?? 0).toFixed(3),
    Number(level.total_docs ?? 0).toFixed(3),
    Number(level.total_positions ?? 0).toFixed(3),
    Number(level.share_in_work_pct ?? 0).toFixed(3),
    Number(level.req_positions ?? 0).toFixed(3),
    Number(level.free_positions ?? 0).toFixed(3),
  ].join("|");

const materialSignature = (workId: string, levelId: string, material: UnknownRecord) =>
  [
    workId,
    levelId,
    normalizeText(material.rik_code),
    normalizeText(material.material_name),
    normalizeText(material.uom),
    Number(material.qty_sum ?? 0).toFixed(3),
    Number(material.docs_count ?? 0).toFixed(3),
    Number(material.unit_price ?? 0).toFixed(3),
    Number(material.amount_sum ?? 0).toFixed(3),
  ].join("|");

const flattenWorkSignatures = (payload: unknown) => {
  const works = Array.isArray(asRecord(payload).works) ? (asRecord(payload).works as unknown[]) : [];
  return works.map((work) => workSignature(asRecord(work)));
};

const flattenLevelSignatures = (payload: unknown) => {
  const works = Array.isArray(asRecord(payload).works) ? (asRecord(payload).works as unknown[]) : [];
  const out: string[] = [];
  for (const work of works) {
    const workRecord = asRecord(work);
    const workId = normalizeText(workRecord.id);
    const levels = Array.isArray(workRecord.levels) ? workRecord.levels : [];
    for (const level of levels) {
      out.push(levelSignature(workId, asRecord(level)));
    }
  }
  return out;
};

const flattenMaterialSignatures = (payload: unknown) => {
  const works = Array.isArray(asRecord(payload).works) ? (asRecord(payload).works as unknown[]) : [];
  const out: string[] = [];
  for (const work of works) {
    const workRecord = asRecord(work);
    const workId = normalizeText(workRecord.id);
    const levels = Array.isArray(workRecord.levels) ? workRecord.levels : [];
    for (const level of levels) {
      const levelRecord = asRecord(level);
      const levelId = normalizeText(levelRecord.id);
      const materials = Array.isArray(levelRecord.materials) ? levelRecord.materials : [];
      for (const material of materials) {
        out.push(materialSignature(workId, levelId, asRecord(material)));
      }
    }
  }
  return out;
};

const objectIdPairSignatures = (value: unknown) => {
  const record = asRecord(value);
  return Object.entries(record)
    .map(([key, item]) => `${key}|${item == null ? "null" : String(item)}`)
    .sort();
};

const metaSignature = (value: unknown) => {
  const record = asRecord(value);
  const chain = Array.isArray(record.chain) ? record.chain.map((item) => String(item)) : [];
  return JSON.stringify({
    stage: normalizeText(record.stage),
    branch: normalizeText(record.branch),
    chain,
    cacheLayer: normalizeText(record.cacheLayer),
    pricedStage: record.pricedStage == null ? null : String(record.pricedStage),
  });
};

const isMetaEqual = (left: unknown, right: unknown) => metaSignature(left) === metaSignature(right);

const summarizeDisciplineCounts = (payload: unknown) => {
  const works = Array.isArray(asRecord(payload).works) ? (asRecord(payload).works as unknown[]) : [];
  let levels = 0;
  let materials = 0;
  for (const work of works) {
    const workRecord = asRecord(work);
    const levelRows = Array.isArray(workRecord.levels) ? workRecord.levels : [];
    levels += levelRows.length;
    for (const level of levelRows) {
      const levelRecord = asRecord(level);
      const materialRows = Array.isArray(levelRecord.materials) ? levelRecord.materials : [];
      materials += materialRows.length;
    }
  }
  return {
    works: works.length,
    levels,
    materials,
  };
};

async function main() {
  const transportScopeService = await import("../src/lib/api/directorReportsTransport.service");
  const uiScopeService = await import("../src/lib/api/directorReportsScope.service");
  const adapters = await import("../src/lib/api/director_reports.adapters");
  const supabaseModule = await import("../src/lib/supabaseClient");

  const tscRun = runNpx(["tsc", "--noEmit", "--pretty", "false"]);
  const eslintRun = runNpx([
    "eslint",
    "src/lib/api/directorReportsTransport.service.ts",
    "src/lib/api/directorReportsScope.service.ts",
    "src/screens/director/hooks/useDirectorReportsController.ts",
    "scripts/director_reports_runtime_verify.ts",
    "scripts/director_reports_backend_cutover.ts",
  ]);

  const existingRuntimeSummary = readJson(runtimeSummaryPath);
  const shouldReuseRuntimeSummary = isPassedRuntimeSummary(existingRuntimeSummary);
  const runtimeRun = shouldReuseRuntimeSummary
    ? {
        status: 0,
        stdout: "Reused existing passed director reports runtime summary artifact.",
        stderr: "",
      }
    : runNpx(["tsx", "scripts/director_reports_runtime_verify.ts"], 20 * 60 * 1000);
  const runtimeSummary = shouldReuseRuntimeSummary ? existingRuntimeSummary : readJson(runtimeSummaryPath);

  const defaultTransport = await transportScopeService.loadDirectorReportTransportScope({
    from: "",
    to: "",
    objectName: null,
    includeDiscipline: true,
    skipDisciplinePrices: false,
    bypassCache: true,
  });

  let selectedObjectName: string | null = null;
  for (const objectName of defaultTransport.options.objects.slice(0, 8)) {
    const objectScope = await transportScopeService.loadDirectorReportTransportScope({
      from: "",
      to: "",
      objectName,
      includeDiscipline: true,
      skipDisciplinePrices: false,
      bypassCache: true,
    });
    if ((objectScope.report?.rows?.length ?? 0) > 0 || (objectScope.discipline?.works?.length ?? 0) > 0) {
      selectedObjectName = objectName;
      break;
    }
  }
  if (!selectedObjectName) {
    selectedObjectName = defaultTransport.options.objects[0] ?? null;
  }

  const scenarios = [
    { name: "default_scope", from: "", to: "", objectName: null as string | null },
    { name: "selected_object_scope", from: "", to: "", objectName: selectedObjectName },
  ].filter((scenario, index) => index === 0 || scenario.objectName != null);

  const scenarioResults: ScenarioResult[] = [];

  for (const scenario of scenarios) {
    const rawRpc = await supabaseModule.supabase.rpc("director_report_transport_scope_v1", {
      p_from: scenario.from || null,
      p_to: scenario.to || null,
      p_object_name: scenario.objectName ?? null,
      p_include_discipline: true,
      p_include_costs: true,
    });
    const rawRoot = asRecord(rawRpc.data);
    const rawEnvelopeOk =
      !rawRpc.error &&
      normalizeText(rawRoot.document_type) === "director_report_transport_scope" &&
      normalizeText(rawRoot.version) === "v1" &&
      rawRoot.options_payload != null &&
      rawRoot.report_payload != null &&
      rawRoot.discipline_payload != null;

    const rawOptions = rawEnvelopeOk ? adapters.adaptCanonicalOptionsPayload(rawRoot.options_payload) : null;
    const rawReport = rawEnvelopeOk ? adapters.adaptCanonicalMaterialsPayload(rawRoot.report_payload) : null;
    const rawDiscipline = rawEnvelopeOk ? adapters.adaptCanonicalWorksPayload(rawRoot.discipline_payload) : null;

    const reportOnlyTransport = await transportScopeService.loadDirectorReportTransportScope({
      from: scenario.from,
      to: scenario.to,
      objectName: scenario.objectName,
      includeDiscipline: false,
      skipDisciplinePrices: true,
      bypassCache: true,
    });
    const reportOnlyUi = await uiScopeService.loadDirectorReportUiScope({
      from: scenario.from,
      to: scenario.to,
      objectName: scenario.objectName,
      includeDiscipline: false,
      skipDisciplinePrices: true,
      bypassCache: true,
    });
    const fullTransport = await transportScopeService.loadDirectorReportTransportScope({
      from: scenario.from,
      to: scenario.to,
      objectName: scenario.objectName,
      includeDiscipline: true,
      skipDisciplinePrices: false,
      bypassCache: true,
    });
    const fullUi = await uiScopeService.loadDirectorReportUiScope({
      from: scenario.from,
      to: scenario.to,
      objectName: scenario.objectName,
      includeDiscipline: true,
      skipDisciplinePrices: false,
      bypassCache: true,
    });

    const rawOptionSignatures = Array.isArray(rawOptions?.objects) ? rawOptions.objects.map((item) => String(item)) : [];
    const transportOptionSignatures = fullTransport.options.objects.map((item) => String(item));
    const uiOptionSignatures = fullUi.optionsState.objects.map((item) => String(item));

    const rawOptionIdPairs = objectIdPairSignatures(rawOptions?.objectIdByName);
    const transportOptionIdPairs = objectIdPairSignatures(fullTransport.options.objectIdByName);
    const uiOptionIdPairs = objectIdPairSignatures(fullUi.optionsState.objectIdByName);

    const rawReportRows = Array.isArray(rawReport?.rows) ? rawReport.rows.map((row) => reportRowSignature(asRecord(row))) : [];
    const reportOnlyTransportRows = Array.isArray(reportOnlyTransport.report?.rows)
      ? reportOnlyTransport.report.rows.map((row) => reportRowSignature(asRecord(row as unknown as UnknownRecord)))
      : [];
    const fullTransportRows = Array.isArray(fullTransport.report?.rows)
      ? fullTransport.report.rows.map((row) => reportRowSignature(asRecord(row as unknown as UnknownRecord)))
      : [];
    const fullUiRows = Array.isArray(fullUi.report?.rows)
      ? fullUi.report.rows.map((row) => reportRowSignature(asRecord(row as unknown as UnknownRecord)))
      : [];

    const kpiFields = ["issues_total", "issues_without_object", "items_total", "items_without_request"];
    const kpiParity = Object.fromEntries(
      kpiFields.map((field) => [
        field,
        compareNumber(asRecord(rawReport?.kpi)[field], asRecord(fullUi.report?.kpi)[field]),
      ]),
    ) as Record<string, NumericParity>;

    const disciplineSummaryFields = [
      "total_qty",
      "total_docs",
      "total_positions",
      "pct_without_work",
      "pct_without_level",
      "pct_without_request",
      "issue_cost_total",
      "purchase_cost_total",
      "issue_to_purchase_pct",
      "unpriced_issue_pct",
    ];
    const disciplineSummaryParity = Object.fromEntries(
      disciplineSummaryFields.map((field) => [
        field,
        compareNumber(asRecord(asRecord(rawDiscipline).summary)[field], asRecord(asRecord(fullUi.discipline).summary)[field]),
      ]),
    ) as Record<string, NumericParity>;

    const rawWorkSignatures = flattenWorkSignatures(rawDiscipline);
    const fullTransportWorkSignatures = flattenWorkSignatures(fullTransport.discipline);
    const fullUiWorkSignatures = flattenWorkSignatures(fullUi.discipline);

    const rawLevelSignatures = flattenLevelSignatures(rawDiscipline);
    const fullTransportLevelSignatures = flattenLevelSignatures(fullTransport.discipline);
    const fullUiLevelSignatures = flattenLevelSignatures(fullUi.discipline);

    const rawMaterialSignatures = flattenMaterialSignatures(rawDiscipline);
    const fullTransportMaterialSignatures = flattenMaterialSignatures(fullTransport.discipline);
    const fullUiMaterialSignatures = flattenMaterialSignatures(fullUi.discipline);

    const workIdSet = new Set<string>();
    const levelIdSet = new Set<string>();
    let stableIdsOk = true;
    const works = Array.isArray(fullUi.discipline?.works) ? fullUi.discipline.works : [];
    for (const work of works) {
      const workId = normalizeText((work as unknown as UnknownRecord).id);
      if (!workId || workIdSet.has(workId)) stableIdsOk = false;
      workIdSet.add(workId);
      const levels = Array.isArray((work as unknown as UnknownRecord).levels)
        ? ((work as unknown as UnknownRecord).levels as unknown[])
        : [];
      for (const level of levels) {
        const levelId = normalizeText(asRecord(level).id);
        if (!levelId || levelIdSet.has(levelId)) stableIdsOk = false;
        levelIdSet.add(levelId);
      }
    }

    const result: ScenarioResult = {
      name: scenario.name,
      objectName: scenario.objectName,
      reportOnlyOwnerOk:
        reportOnlyTransport.branchMeta.transportBranch === "rpc_scope_v1" &&
        reportOnlyTransport.reportMeta.branch === "transport_rpc" &&
        reportOnlyUi.reportMeta?.branch === "transport_rpc",
      fullOwnerOk:
        fullTransport.branchMeta.transportBranch === "rpc_scope_v1" &&
        fullTransport.reportMeta.branch === "transport_rpc" &&
        fullTransport.disciplineMeta?.branch === "transport_rpc" &&
        fullUi.reportMeta?.branch === "transport_rpc" &&
        fullUi.disciplineMeta?.branch === "transport_rpc",
      fallbackUsed:
        reportOnlyTransport.branchMeta.transportBranch !== "rpc_scope_v1" ||
        fullTransport.branchMeta.transportBranch !== "rpc_scope_v1",
      rawEnvelopeOk:
        rawEnvelopeOk &&
        !!rawOptions &&
        !!rawReport &&
        !!rawDiscipline,
      rawRpcError: rawRpc.error ? String(rawRpc.error.message ?? rawRpc.error) : null,
      sourceVersionOk:
        fullTransport.source === "transport:director_report_scope_rpc_v1" &&
        fullTransport.branchMeta.rpcVersion === "v1",
      optionsParityOk:
        compareStringSets(rawOptionSignatures, transportOptionSignatures).match &&
        compareStringSets(transportOptionSignatures, uiOptionSignatures).match &&
        compareStringSets(rawOptionIdPairs, transportOptionIdPairs).match &&
        compareStringSets(transportOptionIdPairs, uiOptionIdPairs).match &&
        compareStringSets(reportOnlyTransport.options.objects, fullTransport.options.objects).match,
      reportRowsParityOk:
        compareStringSets(rawReportRows, fullTransportRows).match &&
        compareStringSets(fullTransportRows, fullUiRows).match,
      reportModeParityOk:
        compareStringSets(reportOnlyTransportRows, fullTransportRows).match &&
        compareStringSets(reportOnlyTransportRows, fullUiRows).match,
      kpiParityOk: Object.values(kpiParity).every((entry) => entry.match),
      disciplineSummaryParityOk: Object.values(disciplineSummaryParity).every((entry) => entry.match),
      disciplineWorksParityOk:
        compareStringSets(rawWorkSignatures, fullTransportWorkSignatures).match &&
        compareStringSets(fullTransportWorkSignatures, fullUiWorkSignatures).match,
      disciplineLevelsParityOk:
        compareStringSets(rawLevelSignatures, fullTransportLevelSignatures).match &&
        compareStringSets(fullTransportLevelSignatures, fullUiLevelSignatures).match,
      disciplineMaterialsParityOk:
        compareStringSets(rawMaterialSignatures, fullTransportMaterialSignatures).match &&
        compareStringSets(fullTransportMaterialSignatures, fullUiMaterialSignatures).match,
      metaParityOk:
        isMetaEqual(reportOnlyTransport.reportMeta, reportOnlyUi.reportMeta) &&
        isMetaEqual(fullTransport.reportMeta, fullUi.reportMeta) &&
        isMetaEqual(fullTransport.disciplineMeta, fullUi.disciplineMeta),
      stableIdsOk,
      disciplinePricesReady: fullUi.disciplinePricesReady === true,
      optionsParity: {
        rawVsTransport: compareStringSets(rawOptionSignatures, transportOptionSignatures),
        transportVsUi: compareStringSets(transportOptionSignatures, uiOptionSignatures),
        reportOnlyVsFull: compareStringSets(reportOnlyTransport.options.objects, fullTransport.options.objects),
        objectIdPairsRawVsTransport: compareStringSets(rawOptionIdPairs, transportOptionIdPairs),
        objectIdPairsTransportVsUi: compareStringSets(transportOptionIdPairs, uiOptionIdPairs),
      },
      reportRowsParity: {
        rawVsTransport: compareStringSets(rawReportRows, fullTransportRows),
        transportVsUi: compareStringSets(fullTransportRows, fullUiRows),
        reportOnlyVsFull: compareStringSets(reportOnlyTransportRows, fullTransportRows),
      },
      kpiParity,
      disciplineSummaryParity,
      disciplineParity: {
        worksRawVsTransport: compareStringSets(rawWorkSignatures, fullTransportWorkSignatures),
        worksTransportVsUi: compareStringSets(fullTransportWorkSignatures, fullUiWorkSignatures),
        levelsRawVsTransport: compareStringSets(rawLevelSignatures, fullTransportLevelSignatures),
        levelsTransportVsUi: compareStringSets(fullTransportLevelSignatures, fullUiLevelSignatures),
        materialsRawVsTransport: compareStringSets(rawMaterialSignatures, fullTransportMaterialSignatures),
        materialsTransportVsUi: compareStringSets(fullTransportMaterialSignatures, fullUiMaterialSignatures),
      },
      metaParity: {
        reportOnlyReportMeta: isMetaEqual(reportOnlyTransport.reportMeta, reportOnlyUi.reportMeta),
        fullReportMeta: isMetaEqual(fullTransport.reportMeta, fullUi.reportMeta),
        fullDisciplineMeta: isMetaEqual(fullTransport.disciplineMeta, fullUi.disciplineMeta),
      },
      counts: {
        options: fullTransport.options.objects.length,
        reportRows: fullTransport.report?.rows?.length ?? 0,
        works: summarizeDisciplineCounts(fullTransport.discipline).works,
        levels: summarizeDisciplineCounts(fullTransport.discipline).levels,
        materials: summarizeDisciplineCounts(fullTransport.discipline).materials,
      },
    };

    scenarioResults.push(result);
  }

  const tscPassed = tscRun.status === 0;
  const eslintPassed = eslintRun.status === 0;
  const webPassed = runtimeSummary?.webPassed === true;
  const androidPassed = runtimeSummary?.androidPassed === true;
  const iosPassed = runtimeSummary?.iosPassed === true;
  const iosResidual =
    typeof runtimeSummary?.iosResidual === "string" && runtimeSummary.iosResidual.trim()
      ? runtimeSummary.iosResidual.trim()
      : null;
  const runtimeGateOk = webPassed && androidPassed && (iosPassed || !!iosResidual);

  const primaryOwner =
    scenarioResults.every((result) => result.reportOnlyOwnerOk && result.fullOwnerOk)
      ? "transport_scope_v1"
      : "mixed";
  const fallbackUsed = scenarioResults.some((result) => result.fallbackUsed);
  const contractShapeOk =
    scenarioResults.every((result) => result.rawEnvelopeOk && result.sourceVersionOk && result.disciplinePricesReady);
  const clientOwnedReportTruthRemoved = scenarioResults.every(
    (result) =>
      result.reportOnlyOwnerOk &&
      result.fullOwnerOk &&
      result.optionsParityOk &&
      result.reportRowsParityOk &&
      result.reportModeParityOk &&
      result.kpiParityOk &&
      result.disciplineSummaryParityOk &&
      result.disciplineWorksParityOk &&
      result.disciplineLevelsParityOk &&
      result.disciplineMaterialsParityOk &&
      result.metaParityOk &&
      result.stableIdsOk,
  );

  const defaultScopeResult = scenarioResults.find((result) => result.name === "default_scope") ?? null;
  const selectedObjectResult = scenarioResults.find((result) => result.name === "selected_object_scope") ?? null;

  const defaultScopeParityOk =
    defaultScopeResult != null &&
    defaultScopeResult.optionsParityOk &&
    defaultScopeResult.reportRowsParityOk &&
    defaultScopeResult.reportModeParityOk &&
    defaultScopeResult.kpiParityOk &&
    defaultScopeResult.disciplineSummaryParityOk &&
    defaultScopeResult.disciplineWorksParityOk &&
    defaultScopeResult.disciplineLevelsParityOk &&
    defaultScopeResult.disciplineMaterialsParityOk &&
    defaultScopeResult.metaParityOk &&
    defaultScopeResult.stableIdsOk;
  const selectedObjectScopeParityOk =
    selectedObjectResult == null ||
    (selectedObjectResult.optionsParityOk &&
      selectedObjectResult.reportRowsParityOk &&
      selectedObjectResult.reportModeParityOk &&
      selectedObjectResult.kpiParityOk &&
      selectedObjectResult.disciplineSummaryParityOk &&
      selectedObjectResult.disciplineWorksParityOk &&
      selectedObjectResult.disciplineLevelsParityOk &&
      selectedObjectResult.disciplineMaterialsParityOk &&
      selectedObjectResult.metaParityOk &&
      selectedObjectResult.stableIdsOk);

  const status =
    tscPassed &&
    eslintPassed &&
    runtimeRun.status === 0 &&
    runtimeGateOk &&
    primaryOwner === "transport_scope_v1" &&
    !fallbackUsed &&
    contractShapeOk &&
    defaultScopeParityOk &&
    selectedObjectScopeParityOk &&
    clientOwnedReportTruthRemoved
      ? "passed"
      : "failed";

  const artifact = {
    status,
    gate: status === "passed" ? "GREEN" : "NOT_GREEN",
    primaryOwner,
    sourceVersion: "director_report_transport_scope_v1",
    fallbackUsed,
    contractShapeOk,
    clientOwnedReportTruthRemoved,
    selectedObjectName,
    scenarios: scenarioResults,
    staticChecks: {
      tscPassed,
      eslintPassed,
      tscRun: {
        status: tscRun.status,
        stdout: tscRun.stdout,
        stderr: tscRun.stderr,
      },
      eslintRun: {
        status: eslintRun.status,
        stdout: eslintRun.stdout,
        stderr: eslintRun.stderr,
      },
    },
    runtime: {
      reusedExistingSummary: shouldReuseRuntimeSummary,
      webPassed,
      androidPassed,
      iosPassed,
      iosResidual,
      runtimeGateOk,
      runtimeRun: {
        status: runtimeRun.status,
        stdout: runtimeRun.stdout,
        stderr: runtimeRun.stderr,
      },
      runtimeSummary,
    },
  };

  const summary = {
    status: artifact.status,
    gate: artifact.gate,
    primaryOwner: artifact.primaryOwner,
    sourceVersion: artifact.sourceVersion,
    fallbackUsed: artifact.fallbackUsed,
    contractShapeOk: artifact.contractShapeOk,
    clientOwnedReportTruthRemoved: artifact.clientOwnedReportTruthRemoved,
    defaultScopeParityOk,
    selectedObjectScopeParityOk,
    selectedObjectName,
    tscPassed,
    eslintPassed,
    webPassed,
    androidPassed,
    iosPassed,
    iosResidual,
    runtimeSummaryReused: shouldReuseRuntimeSummary,
    runtimeGateOk,
  };

  writeJson(fullOutPath, artifact);
  writeJson(summaryOutPath, summary);

  console.log(JSON.stringify(summary, null, 2));
  if (status !== "passed") {
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
