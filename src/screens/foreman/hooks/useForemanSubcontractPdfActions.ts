import { useCallback } from "react";
import { Alert } from "react-native";

import { supabase } from "../../../lib/supabaseClient";
import { buildPdfFileName } from "../../../lib/documents/pdfDocument";
import type { PdfViewerRouterLike } from "../../../lib/documents/pdfDocumentActions";
import { prepareAndPreviewGeneratedPdfFromDescriptorFactory } from "../../../lib/pdf/pdf.runner";
import { buildForemanRequestPdfDescriptor } from "../foreman.requestPdf.service";
import {
  guardPdfRequest,
} from "./foreman.subcontractController.guards";

type PdfActionsParams = {
  requestId: string;
  displayNo: string;
  foremanName: string;
  router: PdfViewerRouterLike;
  closeSubcontractFlow: () => void;
  closeRequestHistory: () => void;
};

export function useForemanSubcontractPdfActions({
  requestId,
  displayNo,
  foremanName,
  router,
  closeSubcontractFlow,
  closeRequestHistory,
}: PdfActionsParams) {
  const onPdf = useCallback(async () => {
    const pdfGuard = guardPdfRequest(requestId);
    if (!pdfGuard.ok) {
      Alert.alert("PDF", "Сначала создайте черновик заявки.");
      return;
    }
    const rid = pdfGuard.requestId;
    const createDescriptor = async () => {
      const template = await buildForemanRequestPdfDescriptor({
        requestId: rid,
        generatedBy: foremanName || null,
        displayNo: displayNo || null,
        title: displayNo ? `Черновик ${displayNo}` : `Черновик ${rid}`,
      });
      const title = displayNo ? `Черновик ${displayNo}` : `Черновик ${rid}`;
      return {
        ...template,
        title,
        fileName: buildPdfFileName({
          documentType: "request",
          title: displayNo || "chernovik",
          entityId: rid,
        }),
      };
    };
    await prepareAndPreviewGeneratedPdfFromDescriptorFactory({
      supabase,
      key: `pdf:subcontracts-request:${rid}`,
      label: "Открываю PDF...",
      createDescriptor,
      router,
      // XR-PDF: dismiss the subcontract DraftSheet modal before pushing PDF viewer
      onBeforeNavigate: closeSubcontractFlow,
    });
  }, [closeSubcontractFlow, displayNo, foremanName, requestId, router]);

  const openRequestHistoryPdf = useCallback(async (reqId: string) => {
    const rid = String(reqId || "").trim();
    if (!rid) return;
    const createDescriptor = async () => {
      const template = await buildForemanRequestPdfDescriptor({
        requestId: rid,
        generatedBy: foremanName || null,
        title: `Заявка ${rid}`,
      });
      return {
        ...template,
        title: `Заявка ${rid}`,
        fileName: buildPdfFileName({
          documentType: "request",
          title: rid,
          entityId: rid,
        }),
      };
    };
    await prepareAndPreviewGeneratedPdfFromDescriptorFactory({
      supabase,
      key: `pdf:history:${rid}`,
      label: "Открываю PDF...",
      createDescriptor,
      router,
      // XR-PDF: dismiss the request history modal before pushing PDF viewer
      onBeforeNavigate: closeRequestHistory,
    });
  }, [closeRequestHistory, foremanName, router]);

  // XR-PDF: closeRequestHistory is now wired via onBeforeNavigate inside openRequestHistoryPdf,
  // so no manual dismiss is needed here.
  const handleRequestHistorySelect = useCallback(async (reqId: string) => {
    await openRequestHistoryPdf(reqId);
  }, [openRequestHistoryPdf]);

  return {
    onPdf,
    openRequestHistoryPdf,
    handleRequestHistorySelect,
  };
}
