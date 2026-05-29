import type { GlobalEstimateResult } from "../ai/globalEstimate/globalEstimateTypes";

export type RuntimeTrace = {
  traceId?: string;
  input?: string;
  screenContext?: string;
  selectedRoute?: string;
  selectedTool?: string;
  workKey?: string;
  [key: string]: unknown;
};

export type EstimatePdfInput = {
  estimate: GlobalEstimateResult;
  runtimeTrace?: RuntimeTrace;
  generatedAt: string;
  language: "ru" | "en" | string;
};

export type EstimatePdfRowViewModel = {
  rowNumber: string;
  sectionTitle: string;
  name: string;
  quantity: string;
  unitPrice: string;
  total: string;
  sourceLabels: string[];
  confidence: string;
};

export type EstimatePdfSectionViewModel = {
  sectionNumber: string;
  title: string;
  type: string;
  rows: EstimatePdfRowViewModel[];
};

export type EstimatePdfViewModel = {
  estimateId: string;
  title: string;
  workKey: string;
  workTitle: string;
  generatedAt: string;
  language: string;
  originalText?: string;
  sections: EstimatePdfSectionViewModel[];
  totals: {
    materials: string;
    labor: string;
    tax: string;
    grand: string;
  };
  tax: {
    label: string;
    rate?: string;
    included: boolean;
    amount: string;
    warning?: string;
  };
  assumptions: string[];
  costIncreaseFactors: string[];
  clarifyingQuestions: string[];
  sources: string[];
  runtimeTrace: RuntimeTrace;
};

export type EstimatePdfDocument = {
  pdfId: string;
  title: string;
  fileName: string;
  contentType: "application/pdf";
  bytes: Uint8Array;
  body: string;
  base64: string;
  dataUri: string;
  text: string;
};

export type EstimatePdfValidationResult = {
  valid: boolean;
  text: string;
  failures: string[];
  details: {
    binaryValid: boolean;
    eofPresent: boolean;
    textExtractable: boolean;
    cyrillicReadable: boolean;
    mojibakeFound: boolean;
    blankText: boolean;
    genericConstructionRowsFound: boolean;
    requiredTextMissing: string[];
  };
};
