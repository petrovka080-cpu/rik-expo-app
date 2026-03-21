import { useCallback } from "react";
import { useRouter } from "expo-router";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildPdfFileName } from "../../lib/documents/pdfDocument";
import { getPdfFlowErrorMessage, preparePdfDocument, previewPdfDocument } from "../../lib/documents/pdfDocumentActions";
import { generateWarehousePdfDocument } from "../../lib/documents/pdfDocumentGenerators";

export type WarehousePdfDocumentType = "warehouse_register" | "warehouse_materials" | "warehouse_document";

export type WarehousePdfBusyLike = {
  run?: <T>(
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

export function useWarehousePdfPreviewBoundary(params: {
  busy: WarehousePdfBusyLike;
  supabase: SupabaseClient;
  notifyError: (title: string, message?: string) => void;
}) {
  const { busy, supabase, notifyError } = params;
  const router = useRouter();

  return useCallback(async (request: WarehousePdfPreviewRequest) => {
    try {
      const template = await generateWarehousePdfDocument({
        title: request.title,
        fileName: request.fileName,
        documentType: request.documentType,
        entityId: request.entityId,
        getUri: request.getRemoteUrl,
      });
      const doc = await preparePdfDocument({
        busy,
        supabase,
        key: request.key,
        label: request.label,
        descriptor: template,
        getRemoteUrl: () => template.uri,
      });
      await previewPdfDocument(doc, { router });
    } catch (error) {
      notifyError("PDF", getPdfFlowErrorMessage(error, "Не удалось открыть PDF"));
    }
  }, [busy, notifyError, supabase, router]);
}
