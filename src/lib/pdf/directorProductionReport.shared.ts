import { formatDashPeriodText, nnum } from "../api/pdf_director.format";

export type DirectorProductionReportPdfRequest = {
  version: "v1";
  companyName?: string | null;
  generatedBy?: string | null;
  periodFrom?: string | null;
  periodTo?: string | null;
  objectName?: string | null;
  preferPriceStage?: "base" | "priced" | null;
};

export type DirectorProductionReportPdfInputShared = {
  companyName?: string | null;
  generatedBy?: string | null;
  periodFrom?: string | null;
  periodTo?: string | null;
  objectName?: string | null;
  repData?: any;
  repDiscipline?: any;
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

  const data = input.repData ?? {};
  const kpi = data?.kpi ?? {};
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const discipline = input.repDiscipline ?? data?.discipline ?? null;
  const works = Array.isArray(discipline?.works) ? discipline.works : [];
  const disciplineSummary = discipline?.summary ?? {};

  const issuesTotal = nnum(kpi?.issues_total);
  const itemsTotal = nnum(kpi?.items_total);
  const issuesNoObject = nnum(kpi?.issues_without_object ?? kpi?.issues_no_obj);
  const itemsNoRequest = nnum(kpi?.items_without_request ?? kpi?.items_free);

  const worksSorted = [...works].sort(
    (left: any, right: any) => nnum(right?.total_positions) - nnum(left?.total_positions),
  );
  const worksTop = worksSorted.slice(0, 50);
  const materialRows = [...rows]
    .sort((left: any, right: any) => nnum(right?.qty_total) - nnum(left?.qty_total))
    .slice(0, 60)
    .map((row: any) => ({
      title: toText(row?.name_human_ru ?? row?.rik_code ?? "—"),
      qtyTotal: nnum(row?.qty_total),
      uom: toText(row?.uom),
      docsCount: nnum(row?.docs_cnt),
      qtyWithoutRequest: nnum(row?.qty_without_request ?? row?.qty_free),
    }));

  const byObject = new Map<string, { docs: number; positions: number; noReq: number; noWork: number }>();
  for (const work of worksSorted) {
    const levels = Array.isArray(work?.levels) ? work.levels : [];
    for (const level of levels) {
      const obj = toText((level as any)?.object_name ?? objectName ?? "Без объекта") || "Без объекта";
      const current = byObject.get(obj) ?? { docs: 0, positions: 0, noReq: 0, noWork: 0 };
      current.docs += nnum((level as any)?.total_docs);
      current.positions += nnum((level as any)?.total_positions);
      current.noReq += nnum((level as any)?.free_positions);
      if (toText(work?.work_type_name).toLowerCase() === "без вида работ") {
        current.noWork += nnum((level as any)?.total_positions);
      }
      byObject.set(obj, current);
    }
  }

  const objectRows = Array.from(byObject.entries())
    .map(([obj, value]) => ({ obj, ...value }))
    .sort((left, right) => right.positions - left.positions);

  const withoutWork = worksSorted
    .filter((work: any) => toText(work?.work_type_name).toLowerCase() === "без вида работ")
    .reduce((sum: number, work: any) => sum + nnum(work?.total_positions), 0);

  const issueCost = nnum(disciplineSummary?.issue_cost_total);
  const purchaseCost = nnum(disciplineSummary?.purchase_cost_total);
  const ratioPct = nnum(disciplineSummary?.issue_to_purchase_pct);

  return {
    companyName,
    generatedBy,
    periodText: formatDashPeriodText(from, to),
    objectName,
    generatedAt,
    worksRows: worksTop.map((work: any) => ({
      workTypeName: toText(work?.work_type_name) || "—",
      totalPositions: nnum(work?.total_positions),
      reqPositions: nnum(work?.req_positions),
      freePositions: nnum(work?.free_positions),
      totalDocs: nnum(work?.total_docs),
      isWithoutWork: toText(work?.work_type_name).toLowerCase() === "без вида работ",
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
