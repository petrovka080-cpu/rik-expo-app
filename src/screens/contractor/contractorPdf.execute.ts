import { router } from "expo-router";

import type { DocumentDescriptor } from "../../lib/documents/pdfDocument";
import { preparePdfDocument, previewPdfDocument } from "../../lib/documents/pdfDocumentActions";
import { supabase } from "../../lib/supabaseClient";

export async function previewContractorActPdfDocument(
  descriptor: DocumentDescriptor,
): Promise<void> {
  const doc = await preparePdfDocument({
    supabase,
    descriptor,
  });
  await previewPdfDocument(doc, { router });
}
