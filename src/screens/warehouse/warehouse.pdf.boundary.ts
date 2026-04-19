import { useCallback } from "react";
import { useRouter } from "expo-router";

import { buildPdfFileName, type DocumentDescriptor } from "../../lib/documents/pdfDocument";
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

const normalizeWarehousePdfPreviewRequest = (
  request: WarehousePdfPreviewRequest,
): WarehousePdfPreviewRequest => ({
  key: requireWarehousePdfText(request.key, "busy key"),
  label: requireWarehousePdfText(request.label, "label"),
  title: requireWarehousePdfText(request.title, "title"),
  fileName: requireWarehousePdfText(request.fileName, "file name"),
  documentType: request.documentType,
  entityId: request.entityId ? String(request.entityId).trim() : undefined,
  getRemoteUrl: async () => {
    const rawUrl = await request.getRemoteUrl();
    return createPdfSource(requireWarehousePdfText(rawUrl, "source URI")).uri;
  },
});

export function useWarehousePdfPreviewBoundary(params: {
  busy: WarehousePdfBusyLike;
  notifyError: (title: string, message?: string) => void;
}) {
  const { busy, notifyError } = params;
  const router = useRouter();

  return useCallback(async (request: WarehousePdfPreviewRequest) => {
    try {
      const safeRequest = normalizeWarehousePdfPreviewRequest(request);
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
        supabase: null,
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
