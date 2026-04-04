export type WarehousePdfDocumentKind =
  | "issue_form"
  | "incoming_form"
  | "issue_register"
  | "incoming_register"
  | "issue_day_register"
  | "incoming_day_register"
  | "issue_materials"
  | "incoming_materials"
  | "issue_day_materials"
  | "incoming_day_materials"
  | "object_work";

type WarehousePdfRequestBase = {
  version: "v1";
  role: "warehouse";
  generatedBy?: string | null;
  companyName?: string | null;
  warehouseName?: string | null;
};

export type WarehouseIssueFormPdfRequest = WarehousePdfRequestBase & {
  documentType: "warehouse_document";
  documentKind: "issue_form";
  issueId: number;
};

export type WarehouseIncomingFormPdfRequest = WarehousePdfRequestBase & {
  documentType: "warehouse_document";
  documentKind: "incoming_form";
  incomingId: string;
};

type WarehouseRangePdfRequestBase = WarehousePdfRequestBase & {
  periodFrom?: string | null;
  periodTo?: string | null;
  dayLabel?: string | null;
};

export type WarehouseRegisterPdfRequest = WarehouseRangePdfRequestBase & {
  documentType: "warehouse_register";
  documentKind:
    | "issue_register"
    | "incoming_register"
    | "issue_day_register"
    | "incoming_day_register";
};

export type WarehouseMaterialsPdfRequest = WarehouseRangePdfRequestBase & {
  documentType: "warehouse_materials";
  documentKind:
    | "issue_materials"
    | "incoming_materials"
    | "issue_day_materials"
    | "incoming_day_materials"
    | "object_work";
  objectId?: string | null;
  objectName?: string | null;
};

export type WarehousePdfRequest =
  | WarehouseIssueFormPdfRequest
  | WarehouseIncomingFormPdfRequest
  | WarehouseRegisterPdfRequest
  | WarehouseMaterialsPdfRequest;

const trimText = (value: unknown) => String(value ?? "").trim();

const isWarehouseDocumentKind = (
  value: string,
): value is WarehousePdfDocumentKind =>
  value === "issue_form" ||
  value === "incoming_form" ||
  value === "issue_register" ||
  value === "incoming_register" ||
  value === "issue_day_register" ||
  value === "incoming_day_register" ||
  value === "issue_materials" ||
  value === "incoming_materials" ||
  value === "issue_day_materials" ||
  value === "incoming_day_materials" ||
  value === "object_work";

const normalizeRangeField = (value: unknown) => {
  const text = trimText(value);
  return text || null;
};

const normalizeCommonFields = (row: Record<string, unknown>) => {
  const version = trimText(row.version);
  const role = trimText(row.role).toLowerCase();
  const documentType = trimText(row.documentType);
  const documentKind = trimText(row.documentKind);
  const generatedBy = trimText(row.generatedBy);
  const companyName = trimText(row.companyName);
  const warehouseName = trimText(row.warehouseName);

  if (version !== "v1") {
    throw new Error(`warehouse pdf payload invalid version: ${version || "<empty>"}`);
  }
  if (role !== "warehouse") {
    throw new Error(`warehouse pdf payload invalid role: ${role || "<empty>"}`);
  }
  if (!isWarehouseDocumentKind(documentKind)) {
    throw new Error(`warehouse pdf payload invalid documentKind: ${documentKind || "<empty>"}`);
  }

  return {
    version: "v1" as const,
    role: "warehouse" as const,
    documentType,
    documentKind,
    generatedBy: generatedBy || null,
    companyName: companyName || null,
    warehouseName: warehouseName || null,
  };
};

export function normalizeWarehousePdfRequest(value: unknown): WarehousePdfRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("warehouse pdf payload must be an object");
  }

  const row = value as Record<string, unknown>;
  const common = normalizeCommonFields(row);

  if (common.documentType === "warehouse_document" && common.documentKind === "issue_form") {
    const issueId = Number(trimText(row.issueId));
    if (!Number.isFinite(issueId) || issueId <= 0) {
      throw new Error("warehouse pdf payload missing issueId");
    }
    return {
      ...common,
      documentType: "warehouse_document",
      documentKind: "issue_form",
      issueId: Math.trunc(issueId),
    };
  }

  if (common.documentType === "warehouse_document" && common.documentKind === "incoming_form") {
    const incomingId = trimText(row.incomingId);
    if (!incomingId) {
      throw new Error("warehouse pdf payload missing incomingId");
    }
    return {
      ...common,
      documentType: "warehouse_document",
      documentKind: "incoming_form",
      incomingId,
    };
  }

  if (
    common.documentType === "warehouse_register" &&
    (common.documentKind === "issue_register" ||
      common.documentKind === "incoming_register" ||
      common.documentKind === "issue_day_register" ||
      common.documentKind === "incoming_day_register")
  ) {
    const dayLabel = normalizeRangeField(row.dayLabel);
    if (
      (common.documentKind === "issue_day_register" ||
        common.documentKind === "incoming_day_register") &&
      !dayLabel
    ) {
      throw new Error("warehouse pdf payload missing dayLabel");
    }
    return {
      ...common,
      documentType: "warehouse_register",
      documentKind: common.documentKind,
      periodFrom: normalizeRangeField(row.periodFrom),
      periodTo: normalizeRangeField(row.periodTo),
      dayLabel,
    };
  }

  if (
    common.documentType === "warehouse_materials" &&
    (common.documentKind === "issue_materials" ||
      common.documentKind === "incoming_materials" ||
      common.documentKind === "issue_day_materials" ||
      common.documentKind === "incoming_day_materials" ||
      common.documentKind === "object_work")
  ) {
    const dayLabel = normalizeRangeField(row.dayLabel);
    if (
      (common.documentKind === "issue_day_materials" ||
        common.documentKind === "incoming_day_materials") &&
      !dayLabel
    ) {
      throw new Error("warehouse pdf payload missing dayLabel");
    }
    return {
      ...common,
      documentType: "warehouse_materials",
      documentKind: common.documentKind,
      periodFrom: normalizeRangeField(row.periodFrom),
      periodTo: normalizeRangeField(row.periodTo),
      dayLabel,
      objectId: normalizeRangeField(row.objectId),
      objectName: normalizeRangeField(row.objectName),
    };
  }

  throw new Error(
    `warehouse pdf payload invalid documentType/documentKind combination: ${common.documentType || "<empty>"}/${common.documentKind || "<empty>"}`,
  );
}
