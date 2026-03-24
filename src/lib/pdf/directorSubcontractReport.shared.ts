import { fmtDateOnly, formatDashPeriodText, nnum } from "../api/pdf_director.format";

export type DirectorSubcontractReportPdfRequest = {
  version: "v1";
  companyName?: string | null;
  generatedBy?: string | null;
  periodFrom?: string | null;
  periodTo?: string | null;
  objectName?: string | null;
};

export type DirectorSubcontractReportPdfInputShared = {
  companyName?: string | null;
  generatedBy?: string | null;
  periodFrom?: string | null;
  periodTo?: string | null;
  objectName?: string | null;
};

export type DirectorSubcontractReportPdfModelShared = {
  companyName: string;
  generatedBy: string;
  periodText: string;
  objectText: string;
  generatedAt: string;
  totalRows: number;
  approvedCount: number;
  contractorCount: number;
  objectCount: number;
  sumApproved: number;
  noAmount: number;
  noWork: number;
  noObject: number;
  noContractor: number;
  contractorRows: {
    contractor: string;
    count: number;
    amount: number;
    objects: number;
    works: number;
  }[];
  objectRows: {
    objectName: string;
    count: number;
    amount: number;
    contractors: number;
    works: number;
  }[];
  approvedRows: {
    displayNo: string;
    contractor: string;
    objectName: string;
    workType: string;
    status: string;
    totalPrice: number;
    approvedAt: string;
  }[];
  workRows: {
    workType: string;
    count: number;
    amount: number;
    contractors: number;
  }[];
  pendingCount: number;
  rejectedCount: number;
};

const DEFAULT_COMPANY_NAME = "RIK Construction";
const DEFAULT_GENERATED_BY = "\u0414\u0438\u0440\u0435\u043a\u0442\u043e\u0440";
const DEFAULT_OBJECT_TEXT = "\u0412\u0441\u0435 \u043e\u0431\u044a\u0435\u043a\u0442\u044b";
const DEFAULT_NO_CONTRACTOR = "\u0411\u0435\u0437 \u043f\u043e\u0434\u0440\u044f\u0434\u0447\u0438\u043a\u0430";
const DEFAULT_NO_OBJECT = "\u0411\u0435\u0437 \u043e\u0431\u044a\u0435\u043a\u0442\u0430";
const DEFAULT_NO_WORK = "\u0411\u0435\u0437 \u0432\u0438\u0434\u0430 \u0440\u0430\u0431\u043e\u0442";

function toText(value: unknown) {
  return String(value ?? "").trim();
}

export function normalizeDirectorSubcontractReportPdfRequest(
  value: unknown,
): DirectorSubcontractReportPdfRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("director subcontract report pdf request must be an object");
  }

  const row = value as Record<string, unknown>;
  const version = toText(row.version);
  const companyName = toText(row.companyName);
  const generatedBy = toText(row.generatedBy);
  const periodFrom = toText(row.periodFrom);
  const periodTo = toText(row.periodTo);
  const objectName = toText(row.objectName);

  if (version !== "v1") {
    throw new Error(
      `director subcontract report pdf request invalid version: ${version || "<empty>"}`,
    );
  }

  return {
    version: "v1",
    companyName: companyName || null,
    generatedBy: generatedBy || null,
    periodFrom: periodFrom || null,
    periodTo: periodTo || null,
    objectName: objectName || null,
  };
}

export function prepareDirectorSubcontractReportPdfModelShared(
  input: DirectorSubcontractReportPdfInputShared,
  rowsInput: unknown[],
): DirectorSubcontractReportPdfModelShared {
  const companyName = toText(input.companyName) || DEFAULT_COMPANY_NAME;
  const generatedBy = toText(input.generatedBy) || DEFAULT_GENERATED_BY;
  const from = toText(input.periodFrom);
  const to = toText(input.periodTo);
  const objectName = toText(input.objectName) || null;
  const generatedAt = new Date().toLocaleString("ru-RU");

  const rows: any[] = Array.isArray(rowsInput) ? rowsInput : [];
  const approvedLike = rows.filter((row: any) =>
    ["approved", "closed"].includes(toText(row?.status)),
  );
  const approved = rows.filter((row: any) => toText(row?.status) === "approved");
  const pending = rows.filter((row: any) => toText(row?.status) === "pending");
  const rejected = rows.filter((row: any) => toText(row?.status) === "rejected");

  const sumApproved = approvedLike.reduce((sum: number, row: any) => sum + nnum(row?.total_price), 0);
  const noAmount = approvedLike.filter((row: any) => nnum(row?.total_price) <= 0).length;
  const noWork = approvedLike.filter((row: any) => !toText(row?.work_type)).length;
  const noObject = approvedLike.filter((row: any) => !toText(row?.object_name)).length;
  const noContractor = approvedLike.filter((row: any) => !toText(row?.contractor_org)).length;

  const byContractor = new Map<string, { count: number; amount: number; objects: Set<string>; works: Set<string> }>();
  const byObject = new Map<string, { count: number; amount: number; contractors: Set<string>; works: Set<string> }>();
  const byWork = new Map<string, { count: number; amount: number; contractors: Set<string> }>();

  for (const row of approvedLike) {
    const contractor = toText(row?.contractor_org) || DEFAULT_NO_CONTRACTOR;
    const objectValueText = toText(row?.object_name) || DEFAULT_NO_OBJECT;
    const workType = toText(row?.work_type) || DEFAULT_NO_WORK;
    const amount = nnum(row?.total_price);

    const contractorValue = byContractor.get(contractor) ?? {
      count: 0,
      amount: 0,
      objects: new Set<string>(),
      works: new Set<string>(),
    };
    contractorValue.count += 1;
    contractorValue.amount += amount;
    contractorValue.objects.add(objectValueText);
    contractorValue.works.add(workType);
    byContractor.set(contractor, contractorValue);

    const objectValue = byObject.get(objectValueText) ?? {
      count: 0,
      amount: 0,
      contractors: new Set<string>(),
      works: new Set<string>(),
    };
    objectValue.count += 1;
    objectValue.amount += amount;
    objectValue.contractors.add(contractor);
    objectValue.works.add(workType);
    byObject.set(objectValueText, objectValue);

    const workValue = byWork.get(workType) ?? {
      count: 0,
      amount: 0,
      contractors: new Set<string>(),
    };
    workValue.count += 1;
    workValue.amount += amount;
    workValue.contractors.add(contractor);
    byWork.set(workType, workValue);
  }

  return {
    companyName,
    generatedBy,
    periodText: formatDashPeriodText(from, to),
    objectText: objectName || DEFAULT_OBJECT_TEXT,
    generatedAt,
    totalRows: rows.length,
    approvedCount: approved.length,
    contractorCount: byContractor.size,
    objectCount: byObject.size,
    sumApproved,
    noAmount,
    noWork,
    noObject,
    noContractor,
    contractorRows: Array.from(byContractor.entries())
      .map(([contractor, value]) => ({
        contractor,
        count: value.count,
        amount: value.amount,
        objects: value.objects.size,
        works: value.works.size,
      }))
      .sort((left, right) => right.amount - left.amount),
    objectRows: Array.from(byObject.entries())
      .map(([objectNameValue, value]) => ({
        objectName: objectNameValue,
        count: value.count,
        amount: value.amount,
        contractors: value.contractors.size,
        works: value.works.size,
      }))
      .sort((left, right) => right.amount - left.amount),
    approvedRows: [...approvedLike]
      .sort((left: any, right: any) =>
        toText(right?.approved_at).localeCompare(toText(left?.approved_at)),
      )
      .map((row: any) => ({
        displayNo: toText(row?.display_no ?? row?.id).slice(0, 20),
        contractor: toText(row?.contractor_org) || "-",
        objectName: toText(row?.object_name) || "-",
        workType: toText(row?.work_type) || "-",
        status: toText(row?.status) || "-",
        totalPrice: nnum(row?.total_price),
        approvedAt: fmtDateOnly(toText(row?.approved_at)),
      })),
    workRows: Array.from(byWork.entries())
      .map(([workType, value]) => ({
        workType,
        count: value.count,
        amount: value.amount,
        contractors: value.contractors.size,
      }))
      .sort((left, right) => right.amount - left.amount),
    pendingCount: pending.length,
    rejectedCount: rejected.length,
  };
}
