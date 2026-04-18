import { formatDashPeriodText, nnum } from "../api/pdf_director.format.ts";

export type DirectorProductionReportPdfRequest = {
  version: "v1";
  companyName?: string | null;
  generatedBy?: string | null;
  periodFrom?: string | null;
  periodTo?: string | null;
  objectName?: string | null;
  preferPriceStage?: "base" | "priced" | null;
};

type DirectorProductionLevel = {
  object_name?: string | null;
  total_docs: number;
  total_positions: number;
  free_positions: number;
};

type DirectorProductionWork = {
  work_type_name: string | null;
  total_positions: number;
  req_positions: number;
  free_positions: number;
  total_docs: number;
  levels: DirectorProductionLevel[];
};

type DirectorProductionMaterial = {
  name_human_ru: string | null;
  rik_code: string | null;
  uom: string | null;
  docs_cnt: number;
  qty_total: number;
  qty_without_request: number;
};

type DirectorProductionKpi = {
  issues_total: number;
  items_total: number;
  issues_without_object: number;
  items_without_request: number;
};

type DirectorProductionDisciplineSummary = {
  issue_cost_total: number;
  purchase_cost_total: number;
  issue_to_purchase_pct: number;
};

export type DirectorProductionDiscipline = {
  works?: DirectorProductionWork[] | null;
  summary?: DirectorProductionDisciplineSummary | null;
};

export type DirectorProductionReportData = {
  kpi?: DirectorProductionKpi | null;
  rows?: DirectorProductionMaterial[] | null;
  discipline?: DirectorProductionDiscipline | null;
};

export type DirectorProductionReportPdfInputShared = {
  companyName?: string | null;
  generatedBy?: string | null;
  periodFrom?: string | null;
  periodTo?: string | null;
  objectName?: string | null;
  repData?: DirectorProductionReportData | null;
  repDiscipline?: DirectorProductionDiscipline | null;
};

export type DirectorProductionReportPdfModelShared = {
  companyName: string;
  generatedBy: string;
  periodText: string;
  objectName: string;
  generatedAt: string;
  worksRows: {
    workTypeName: string;
    totalPositions: number;
    reqPositions: number;
    freePositions: number;
    totalDocs: number;
    isWithoutWork: boolean;
  }[];
  rowsLimitedNote: string;
  objectRows: {
    obj: string;
    docs: number;
    positions: number;
    noReq: number;
    noWork: number;
  }[];
  materialRows: {
    title: string;
    qtyTotal: number;
    uom: string;
    docsCount: number;
    qtyWithoutRequest: number;
  }[];
  issuesTotal: number;
  itemsTotal: number;
  itemsNoRequest: number;
  withoutWork: number;
  issuesNoObject: number;
  issueCost: number;
  purchaseCost: number;
  ratioPct: number;
  problemRows: {
    problem: string;
    count: number;
    comment: string;
  }[];
};

const toText = (value: unknown) => String(value ?? "").trim();

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseDirectorProductionLevel(value: unknown): DirectorProductionLevel | null {
  const row = asRecord(value);
  if (!row) return null;
  return {
    object_name: row.object_name == null ? null : toText(row.object_name),
    total_docs: nnum(row.total_docs),
    total_positions: nnum(row.total_positions),
    free_positions: nnum(row.free_positions),
  };
}

function parseDirectorProductionWork(value: unknown): DirectorProductionWork | null {
  const row = asRecord(value);
  if (!row) return null;
  return {
    work_type_name: row.work_type_name == null ? null : toText(row.work_type_name),
    total_positions: nnum(row.total_positions),
    req_positions: nnum(row.req_positions),
    free_positions: nnum(row.free_positions),
    total_docs: nnum(row.total_docs),
    levels: Array.isArray(row.levels)
      ? row.levels
          .map(parseDirectorProductionLevel)
          .filter((level): level is DirectorProductionLevel => !!level)
      : [],
  };
}

function parseDirectorProductionMaterial(value: unknown): DirectorProductionMaterial | null {
  const row = asRecord(value);
  if (!row) return null;
  return {
    name_human_ru: row.name_human_ru == null ? null : toText(row.name_human_ru),
    rik_code: row.rik_code == null ? null : toText(row.rik_code),
    uom: row.uom == null ? null : toText(row.uom),
    docs_cnt: nnum(row.docs_cnt),
    qty_total: nnum(row.qty_total),
    qty_without_request: nnum(row.qty_without_request ?? row.qty_free),
  };
}

function parseDirectorProductionData(value: unknown): DirectorProductionReportData {
  const row = asRecord(value);
  if (!row) return {};

  const kpi = asRecord(row.kpi);
  const discipline = asRecord(row.discipline);
  const summary = asRecord(discipline?.summary);

  return {
    kpi: kpi
      ? {
          issues_total: nnum(kpi.issues_total),
          items_total: nnum(kpi.items_total),
          issues_without_object: nnum(kpi.issues_without_object ?? kpi.issues_no_obj),
          items_without_request: nnum(kpi.items_without_request ?? kpi.items_free),
        }
      : null,
    rows: Array.isArray(row.rows)
      ? row.rows
          .map(parseDirectorProductionMaterial)
          .filter((item): item is DirectorProductionMaterial => !!item)
      : [],
    discipline: discipline
      ? {
          works: Array.isArray(discipline.works)
            ? discipline.works
                .map(parseDirectorProductionWork)
                .filter((work): work is DirectorProductionWork => !!work)
            : [],
          summary: summary
            ? {
                issue_cost_total: nnum(summary.issue_cost_total),
                purchase_cost_total: nnum(summary.purchase_cost_total),
                issue_to_purchase_pct: nnum(summary.issue_to_purchase_pct),
              }
            : null,
        }
      : null,
  };
}

export function normalizeDirectorProductionReportPdfRequest(
  value: unknown,
): DirectorProductionReportPdfRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("director production report pdf request must be an object");
  }

  const row = value as Record<string, unknown>;
  const version = toText(row.version);
  const companyName = toText(row.companyName);
  const generatedBy = toText(row.generatedBy);
  const periodFrom = toText(row.periodFrom);
  const periodTo = toText(row.periodTo);
  const objectName = toText(row.objectName);
  const preferPriceStage = toText(row.preferPriceStage).toLowerCase();

  if (version !== "v1") {
    throw new Error(
      `director production report pdf request invalid version: ${version || "<empty>"}`,
    );
  }

  return {
    version: "v1",
    companyName: companyName || null,
    generatedBy: generatedBy || null,
    periodFrom: periodFrom || null,
    periodTo: periodTo || null,
    objectName: objectName || null,
    preferPriceStage: preferPriceStage === "base" ? "base" : "priced",
  };
}

export function prepareDirectorProductionReportPdfModelShared(
  input: DirectorProductionReportPdfInputShared,
): DirectorProductionReportPdfModelShared {
  const companyName = toText(input.companyName) || "RIK Construction";
  const generatedBy = toText(input.generatedBy) || "Директор";
  const from = toText(input.periodFrom);
  const to = toText(input.periodTo);
  const objectName = toText(input.objectName) || "Все объекты";
  const generatedAt = new Date().toLocaleString("ru-RU");

  const data = parseDirectorProductionData(input.repData);
  const kpi = data.kpi ?? {
    issues_total: 0,
    items_total: 0,
    issues_without_object: 0,
    items_without_request: 0,
  };
  const rows = data.rows ?? [];
  const discipline = input.repDiscipline ?? data.discipline ?? null;
  const works = discipline?.works ?? [];
  const disciplineSummary = discipline?.summary ?? {
    issue_cost_total: 0,
    purchase_cost_total: 0,
    issue_to_purchase_pct: 0,
  };

  const issuesTotal = kpi.issues_total;
  const itemsTotal = kpi.items_total;
  const issuesNoObject = kpi.issues_without_object;
  const itemsNoRequest = kpi.items_without_request;

  const worksSorted = [...works].sort(
    (left, right) => nnum(right.total_positions) - nnum(left.total_positions),
  );
  const worksTop = worksSorted.slice(0, 50);
  const materialRows = [...rows]
    .sort((left, right) => nnum(right.qty_total) - nnum(left.qty_total))
    .slice(0, 60)
    .map((row) => ({
      title: toText(row.name_human_ru ?? row.rik_code ?? "—"),
      qtyTotal: nnum(row.qty_total),
      uom: toText(row.uom),
      docsCount: nnum(row.docs_cnt),
      qtyWithoutRequest: nnum(row.qty_without_request),
    }));

  const byObject = new Map<string, { docs: number; positions: number; noReq: number; noWork: number }>();
  for (const work of worksSorted) {
    for (const level of work.levels) {
      const obj = toText(level.object_name ?? objectName ?? "Без объекта") || "Без объекта";
      const current = byObject.get(obj) ?? { docs: 0, positions: 0, noReq: 0, noWork: 0 };
      current.docs += nnum(level.total_docs);
      current.positions += nnum(level.total_positions);
      current.noReq += nnum(level.free_positions);
      if (toText(work.work_type_name).toLowerCase() === "без вида работ") {
        current.noWork += nnum(level.total_positions);
      }
      byObject.set(obj, current);
    }
  }

  const objectRows = Array.from(byObject.entries())
    .map(([obj, value]) => ({ obj, ...value }))
    .sort((left, right) => right.positions - left.positions);

  const withoutWork = worksSorted
    .filter((work) => toText(work.work_type_name).toLowerCase() === "без вида работ")
    .reduce((sum: number, work) => sum + nnum(work.total_positions), 0);

  const issueCost = nnum(disciplineSummary.issue_cost_total);
  const purchaseCost = nnum(disciplineSummary.purchase_cost_total);
  const ratioPct = nnum(disciplineSummary.issue_to_purchase_pct);

  return {
    companyName,
    generatedBy,
    periodText: formatDashPeriodText(from, to),
    objectName,
    generatedAt,
    worksRows: worksTop.map((work) => ({
      workTypeName: toText(work.work_type_name) || "—",
      totalPositions: nnum(work.total_positions),
      reqPositions: nnum(work.req_positions),
      freePositions: nnum(work.free_positions),
      totalDocs: nnum(work.total_docs),
      isWithoutWork: toText(work.work_type_name).toLowerCase() === "без вида работ",
    })),
    rowsLimitedNote: worksSorted.length > worksTop.length ? `Показаны top ${worksTop.length} строк.` : "",
    objectRows,
    materialRows,
    issuesTotal,
    itemsTotal,
    itemsNoRequest,
    withoutWork,
    issuesNoObject,
    issueCost,
    purchaseCost,
    ratioPct,
    problemRows: [
      {
        problem: "Без вида работ",
        count: withoutWork,
        comment: "Требует контроля источника",
      },
      {
        problem: "Без заявки",
        count: itemsNoRequest,
        comment: "Есть выдачи без request item",
      },
      {
        problem: "Без объекта",
        count: issuesNoObject,
        comment: "Проверить привязку объекта",
      },
    ],
  };
}
