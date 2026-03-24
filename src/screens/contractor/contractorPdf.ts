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

export async function generateActPdf(args: GenerateActPdfArgs) {
  const prepared = prepareContractorActPdfData(args);
  if (!prepared) return;

  try {
    const descriptor = await renderContractorActPdfDocument(prepared);
    await previewContractorActPdfDocument(descriptor);
  } catch (error: unknown) {
    const message = getPdfFlowErrorMessage(error, "Не удалось открыть PDF");
    console.warn("[contractor-pdf] generate_failed", { errorMessage: message });
    Alert.alert("Ошибка PDF", message);
  }
}
