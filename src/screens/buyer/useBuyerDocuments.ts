import { useCallback } from "react";
import { runPdfTop } from "../../lib/pdfRunner";
import { exportProposalPdf } from "../../lib/catalog_api";
import type { SupabaseClient } from "@supabase/supabase-js";

export function useBuyerDocuments(params: {
  busy: unknown;
  supabase: SupabaseClient;
}) {
  const { busy, supabase } = params;

  const openProposalPdf = useCallback(
    async (pid: string | number) => {
      const id = String(pid || "").trim();
      if (!id) return;

      await runPdfTop({
        busy,
        supabase,
        key: `pdf:proposal:${id}`,
        label: "Открываю PDF…",
        mode: "preview",
        fileName: `Предложение_${id.slice(0, 8)}`,
        getRemoteUrl: () => exportProposalPdf(id, "preview"),
      });
    },
    [busy, supabase],
  );

  return { openProposalPdf };
}
