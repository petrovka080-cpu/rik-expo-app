import type { GlobalEstimateResult } from "../ai/globalEstimate/globalEstimateTypes";

export type AiEstimatePdfInput = {
  estimate: GlobalEstimateResult;
  runtimeTraceId: string;
  route: "/chat" | "/ai" | "/request";
  generatedAt: string;
  documentMode: "draft" | "proposal" | "estimate";
};

export type AiEstimatePdfRendererPath =
  | "OPTION_A_EXISTING_RENDERER_TEMPLATE"
  | "OPTION_B_ISOLATED_AI_ESTIMATE_RENDERER"
  | "OPTION_C_DOCUMENT_ENGINE_V2";

export type AiEstimatePdfOutput = {
  pdfBytes: Uint8Array;
  mimeType: "application/pdf";
  fileName: string;
  documentNumber: string;
  estimateId: string;
  rendererPath: AiEstimatePdfRendererPath;
};

export type AiEstimatePdfTableRowViewModel = {
  index: string;
  rowNumber: string;
  code: string;
  name: string;
  category: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  total: string;
  confidence: string;
  sourceLabels: string[];
};

export type AiEstimatePdfViewModel = {
  estimateId: string;
  documentNumber: string;
  title: string;
  status: string;
  generatedAt: string;
  route: AiEstimatePdfInput["route"];
  documentMode: AiEstimatePdfInput["documentMode"];
  runtimeTraceId: string;
  work: {
    workKey: string;
    title: string;
    category: string;
    inputVolume: string;
    locale: string;
    currency: string;
  };
  metadata: { label: string; value: string }[];
  assumptions: string[];
  rows: AiEstimatePdfTableRowViewModel[];
  totals: { label: string; value: string }[];
  tax: {
    label: string;
    rate: string;
    included: string;
    amount: string;
    warning: string;
  };
  sources: string[];
  confidence: string;
  clarifyingQuestions: string[];
  footer: string[];
};

export type AiEstimatePdfValidationResult = {
  valid: boolean;
  failures: string[];
  text: string;
  details: {
    binaryValid: boolean;
    cyrillicReadable: boolean;
    mojibakeFound: boolean;
    realBorderedTablePresent: boolean;
    requiredColumnsPresent: boolean;
    totalsPresent: boolean;
    taxSourcesFooterPresent: boolean;
    plainTextDumpFound: boolean;
    markdownTableFound: boolean;
    procurementCloneFound: boolean;
    genericConstructionRowFound: boolean;
    rawMaterialKeyVisible: boolean;
    rawRateKeyVisible: boolean;
    rawSourceIdVisible: boolean;
    backendDebugTextVisible: boolean;
    rawUnitLabelsFound: boolean;
  };
};

export type AiEstimatePdfDocument = AiEstimatePdfOutput & {
  pdfId: string;
  title: string;
  contentType: "application/pdf";
  bytes: Uint8Array;
  body: string;
  base64: string;
  dataUri: string;
  text: string;
  viewModel: AiEstimatePdfViewModel;
  validation: AiEstimatePdfValidationResult;
};
