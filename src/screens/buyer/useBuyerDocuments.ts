import { useCallback } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import type { SupabaseClient } from "@supabase/supabase-js";

import { buildPdfFileName } from "../../lib/documents/pdfDocument";
import {
  getPdfFlowErrorMessage,
  prepareAndPreviewPdfDocument,
} from "../../lib/documents/pdfDocumentActions";
import type { ProposalHeadLite, ProposalViewLine } from "./buyer.types";
import { generateBuyerProposalPdfDocument } from "./buyerProposalPdf.service";

export type OpenBuyerProposalPdfSnapshot = {
  head?: ProposalHeadLite | null;
  lines?: ProposalViewLine[] | null;
};

export function useBuyerDocuments(params: {
  busy: unknown;
  supabase: SupabaseClient;
  /** XR-PDF: dismiss callback for the parent modal (if any). */
  onBeforeNavigate?: (() => void | Promise<void>) | null;
}) {
  const { busy, supabase, onBeforeNavigate } = params;
  const router = useRouter();

  const openProposalPdf = useCallback(
    async (pid: string | number, snapshot?: OpenBuyerProposalPdfSnapshot | null) => {
      const id = String(pid || "").trim();
      if (!id) return;

      try {
        const title = `Предложение ${id.slice(0, 8)}`;
        const fileName = buildPdfFileName({
          documentType: "proposal",
          title: "predlozhenie",
          entityId: id,
        });
        const template = await generateBuyerProposalPdfDocument({
          proposalId: id,
          title,
          fileName,
          head: snapshot?.head ?? null,
          lines: snapshot?.lines ?? null,
        });
        await prepareAndPreviewPdfDocument({
          busy,
          supabase,
          key: `pdf:proposal:${id}`,
          label: "Открываю PDF…",
          descriptor: {
            ...template,
            title,
            fileName,
          },
          router,
          // XR-PDF: dismiss parent modal before pushing PDF viewer route
          onBeforeNavigate,
        });
      } catch (error) {
        Alert.alert("PDF", getPdfFlowErrorMessage(error, "Не удалось открыть PDF"));
      }
    },
    [busy, onBeforeNavigate, supabase, router],
  );

  return { openProposalPdf };
}
