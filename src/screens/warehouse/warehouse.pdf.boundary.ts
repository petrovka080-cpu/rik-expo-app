import { useCallback } from "react";
import { useRouter } from "expo-router";

import { buildPdfFileName, type DocumentDescriptor } from "../../lib/documents/pdfDocument";
import type { PdfDocumentSupabaseLike } from "../../lib/documents/pdfDocumentActionTypes";
import { getPdfFlowErrorMessage, prepareAndPreviewPdfDocument } from "../../lib/documents/pdfDocumentActions";
import { createPdfSource } from "../../lib/pdfFileContract";
import { recordCatchDiscipline } from "../../lib/observability/catchDiscipline";

export type WarehousePdfDocumentType = "warehouse_register" | "warehouse_materials" | "warehouse_document";

export type WarehousePdfBusyLike = {
  run?: <T,>(
    fn: () => Promise<T>,
    opts?: { key?: string; label?: string; minMs?: number },
  ) => Promise<T | null>;
  isBusy?: (key?: string) => boolean;
  show?: (key?: string, label?: string) => void;
  hide?: (key?: string) => void;
};

export type WarehousePdfPreviewRequest = {
  key: string;
  label: string;
  title: string;
  fileName: string;
  documentType: WarehousePdfDocumentType;
  entityId?: string;
  getRemoteUrl: () => Promise<string>;
};

export type WarehousePdfPreviewRequestInput = {
  key?: unknown;
  label?: unknown;
  title?: unknown;
  fileName?: unknown;
  documentType?: unknown;
  entityId?: unknown;
  getRemoteUrl?: unknown;
} | null | undefined;

export type WarehousePdfOffloadContract<TPayload, TFlow extends string> = {
  version: 1;
  flow: TFlow;
  template: string;
  title: string;
  fileName: string;
  documentType: WarehousePdfDocumentType;
  entityId?: string;
  payload: TPayload;
};

export type WarehousePdfPreviewInvalidReason =
  | "invalid_request"
  | "invalid_document_type"
  | "missing_source_loader"
  | "missing_busy_key"
  | "missing_label"
  | "missing_title"
  | "missing_file_name";

export type WarehousePdfPreviewContract =
  | {
      kind: "invalid";
      reason: WarehousePdfPreviewInvalidReason;
      errorMessage: string;
    }
  | {
      kind: "ready";
      request: WarehousePdfPreviewRequest;
      supabase: PdfDocumentSupabaseLike;
    };

type WarehousePdfMode = "issue" | "incoming";
type PendingWarehousePdfDescriptor = Omit<DocumentDescriptor, "uri" | "fileSource"> & {
  uri?: string;
  fileSource?: never;
};

type WarehousePdfBusyKeyArgs =
  | {
      kind: "register" | "materials";
      reportsMode: WarehousePdfMode;
      periodFrom?: string | null;
      periodTo?: string | null;
    }
  | {
      kind: "object-work";
      periodFrom?: string | null;
      periodTo?: string | null;
    }
  | {
      kind: "document";
      reportsMode: WarehousePdfMode;
      docId: string | number;
    }
  | {
      kind: "day-register" | "day-materials";
      reportsMode: WarehousePdfMode;
      dayLabel: string;
    };

const WAREHOUSE_PDF_DOCUMENT_TYPES: readonly WarehousePdfDocumentType[] = [
  "warehouse_register",
  "warehouse_materials",
  "warehouse_document",
];
const WAREHOUSE_PDF_PREVIEW_SUPABASE: PdfDocumentSupabaseLike = {};

const normalizeBusyPart = (value: unknown, fallback: string) => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

export function buildWarehousePdfBusyKey(args: WarehousePdfBusyKeyArgs) {
  switch (args.kind) {
    case "register":
      return `pdf:warehouse:register:${args.reportsMode}:${normalizeBusyPart(args.periodFrom, "all")}:${normalizeBusyPart(args.periodTo, "all")}`;
    case "materials":
      return `pdf:warehouse:materials:${args.reportsMode}:${normalizeBusyPart(args.periodFrom, "all")}:${normalizeBusyPart(args.periodTo, "all")}`;
    case "object-work":
      return `pdf:warehouse:object-work:${normalizeBusyPart(args.periodFrom, "all")}:${normalizeBusyPart(args.periodTo, "all")}`;
    case "document":
      return `pdf:warehouse:document:${args.reportsMode}:${normalizeBusyPart(args.docId, "unknown")}`;
    case "day-register":
      return `pdf:warehouse:day-register:${args.reportsMode}:${normalizeBusyPart(args.dayLabel, "day")}`;
    case "day-materials":
      return `pdf:warehouse:day-materials:${args.reportsMode}:${normalizeBusyPart(args.dayLabel, "day")}`;
    default:
      return "pdf:warehouse";
  }
}

export const createWarehousePdfFileName = (params: {
  documentType: WarehousePdfDocumentType;
  title: string;
  entityId?: string;
}) =>
  buildPdfFileName({
    documentType: params.documentType,
    title: params.title,
    entityId: params.entityId,
  });

const requireWarehousePdfText = (value: unknown, field: string) => {
  const text = String(value ?? "").trim();
  if (!text) {
    throw new Error(`Warehouse PDF ${field} is missing`);
  }
  return text;
};

const readWarehousePdfText = (value: unknown) => String(value ?? "").trim();

const toWarehousePdfInvalidContract = (
  reason: WarehousePdfPreviewInvalidReason,
  errorMessage: string,
): WarehousePdfPreviewContract => ({
  kind: "invalid",
  reason,
  errorMessage,
});

const isWarehousePdfDocumentType = (
  value: unknown,
): value is WarehousePdfDocumentType =>
  WAREHOUSE_PDF_DOCUMENT_TYPES.includes(value as WarehousePdfDocumentType);

export const normalizeWarehousePdfRemoteUrl = (value: unknown) => {
  if (typeof value !== "string") {
    throw new Error("Warehouse PDF source URI is invalid");
  }
  return createPdfSource(requireWarehousePdfText(value, "source URI")).uri;
};

export function resolveWarehousePdfPreviewContract(
  request: WarehousePdfPreviewRequestInput,
): WarehousePdfPreviewContract {
  if (!request || typeof request !== "object") {
    return toWarehousePdfInvalidContract(
      "invalid_request",
      "Warehouse PDF request is invalid",
    );
  }

  if (!isWarehousePdfDocumentType(request.documentType)) {
    return toWarehousePdfInvalidContract(
      "invalid_document_type",
      "Warehouse PDF document type is invalid",
    );
  }

  if (typeof request.getRemoteUrl !== "function") {
    return toWarehousePdfInvalidContract(
      "missing_source_loader",
      "Warehouse PDF source loader is missing",
    );
  }
  const getRemoteUrl = request.getRemoteUrl;

  const key = readWarehousePdfText(request.key);
  if (!key) {
    return toWarehousePdfInvalidContract(
      "missing_busy_key",
      "Warehouse PDF busy key is missing",
    );
  }

  const label = readWarehousePdfText(request.label);
  if (!label) {
    return toWarehousePdfInvalidContract(
      "missing_label",
      "Warehouse PDF label is missing",
    );
  }

  const title = readWarehousePdfText(request.title);
  if (!title) {
    return toWarehousePdfInvalidContract(
      "missing_title",
      "Warehouse PDF title is missing",
    );
  }

  const fileName = readWarehousePdfText(request.fileName);
  if (!fileName) {
    return toWarehousePdfInvalidContract(
      "missing_file_name",
      "Warehouse PDF file name is missing",
    );
  }

  const entityId = readWarehousePdfText(request.entityId);

  return {
    kind: "ready",
    request: {
      key,
      label,
      title,
      fileName,
      documentType: request.documentType,
      entityId: entityId || undefined,
      getRemoteUrl: async () => {
        const rawUrl = await getRemoteUrl();
        return normalizeWarehousePdfRemoteUrl(rawUrl);
      },
    },
    supabase: WAREHOUSE_PDF_PREVIEW_SUPABASE,
  };
}

export function useWarehousePdfPreviewBoundary(params: {
  busy: WarehousePdfBusyLike;
  notifyError: (title: string, message?: string) => void;
}) {
  const { busy, notifyError } = params;
  const router = useRouter();

  return useCallback(async (request: WarehousePdfPreviewRequestInput) => {
    try {
      const contract = resolveWarehousePdfPreviewContract(request);
      if (contract.kind !== "ready") {
        throw new Error(contract.errorMessage);
      }

      const safeRequest = contract.request;
      const template: PendingWarehousePdfDescriptor = {
        title: safeRequest.title,
        fileName: safeRequest.fileName,
        documentType: safeRequest.documentType,
        source: "generated",
        originModule: "warehouse",
        mimeType: "application/pdf",
        entityId: safeRequest.entityId,
      };
      await prepareAndPreviewPdfDocument({
        busy,
        supabase: contract.supabase,
        key: safeRequest.key,
        label: safeRequest.label,
        descriptor: template,
        getRemoteUrl: safeRequest.getRemoteUrl,
        router,
      });
    } catch (error) {
      recordCatchDiscipline({
        screen: "warehouse",
        surface: "warehouse_pdf_open",
        event: "warehouse_pdf_open_failed",
        kind: "critical_fail",
        error,
        category: "ui",
        sourceKind: "pdf:warehouse",
        errorStage: "open_view",
      });
      notifyError("PDF", getPdfFlowErrorMessage(error, "Не удалось открыть PDF"));
    }
  }, [busy, notifyError, router]);
}
