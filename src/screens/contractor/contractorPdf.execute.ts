import { router } from "expo-router";

import type { DocumentDescriptor } from "../../lib/documents/pdfDocument";
import { prepareAndPreviewPdfDocument } from "../../lib/documents/pdfDocumentActions";
import { supabase } from "../../lib/supabaseClient";

export async function previewContractorActPdfDocument(
  descriptor: DocumentDescriptor,
): Promise<void> {
  await prepareAndPreviewPdfDocument({
    supabase,
    key: `pdf:contractor:act:${descriptor.entityId ?? descriptor.fileName}`,
    label: "Открываю PDF…",
    descriptor,
    router,
  });
}
