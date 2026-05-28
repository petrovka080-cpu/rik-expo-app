import type {
  EstimateRowSourceEvidence,
  GlobalEstimateConfidence,
  GlobalEstimateResult,
  GlobalEstimateSectionType,
} from "../globalEstimate/globalEstimateTypes";

export type EstimatePresentationActionId =
  | "make_estimate_pdf"
  | "save_estimate"
  | "create_request"
  | "update_prices"
  | "clarify_estimate";

export type EstimatePresentationAction = {
  id: EstimatePresentationActionId;
  label: string;
  visible: boolean;
};

export type EstimatePresentationRow = {
  sectionNumber: string;
  sectionTitle: string;
  sectionType: GlobalEstimateSectionType;
  rowNumber: string;
  code: string;
  rateKey?: string;
  materialKey?: string;
  catalogItemId?: string | null;
  name: string;
  quantity: number;
  unit: string;
  displayQuantity: string;
  unitPrice: number;
  displayUnitPrice: string;
  total: number;
  displayTotal: string;
  currency: string;
  priceStatus: GlobalEstimateResult["sections"][number]["rows"][number]["priceStatus"];
  sourceId: string;
  sourceEvidence: EstimateRowSourceEvidence[];
  sourceLabel?: string;
  confidence: GlobalEstimateConfidence;
};

export type EstimatePresentationSection = {
  sectionNumber: string;
  title: string;
  type: GlobalEstimateSectionType;
  rows: EstimatePresentationRow[];
};

export type EstimatePresentationLocalContext = {
  countryCode: string;
  locationLabel: string;
  currency: string;
  taxLabel: string;
  confidence: GlobalEstimateConfidence;
  displayLine: string;
};

export type EstimatePresentationViewModel = {
  estimateId: string;
  workKey: string;
  workTitle: string;
  workCategory: string;
  originalText?: string;
  localContext: EstimatePresentationLocalContext;
  assumptions: string[];
  sections: EstimatePresentationSection[];
  rows: EstimatePresentationRow[];
  totals: GlobalEstimateResult["totals"];
  tax: GlobalEstimateResult["tax"];
  sourceConfidence: GlobalEstimateConfidence;
  sourceLabels: string[];
  costIncreaseFactors: string[];
  clarifyingQuestions: string[];
  actions: EstimatePresentationAction[];
};
