import { Alert } from "react-native";

import { getPdfFlowErrorMessage } from "../../lib/documents/pdfDocumentActions";
import {
  prepareContractorActPdfData,
  type GenerateActPdfArgs,
} from "./contractorPdf.data";
import { previewContractorActPdfDocument } from "./contractorPdf.execute";
import { renderContractorActPdfDocument } from "./contractorPdf.render";

export type { ContractorPdfWork, GenerateActPdfArgs } from "./contractorPdf.data";

export type ActPdfMode = "normal" | "summary";

export async function generateActPdf(
  args: GenerateActPdfArgs,
  /** XR-PDF: dismiss callback for the parent modal (if any). */
  onBeforeNavigate?: (() => void | Promise<void>) | null,
) {
  const prepared = prepareContractorActPdfData(args);
  if (!prepared) return;

  try {
    const descriptor = await renderContractorActPdfDocument(prepared);
    await previewContractorActPdfDocument(descriptor, onBeforeNavigate);
  } catch (error: unknown) {
    const message = getPdfFlowErrorMessage(error, "Не удалось открыть PDF");
    if (__DEV__) console.warn("[contractor-pdf] generate_failed", { errorMessage: message });
    Alert.alert("Ошибка PDF", message);
  }
}
