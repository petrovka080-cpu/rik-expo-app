import type { GlobalEstimateConfidence } from "../ai/globalEstimate";
import type {
  StructuredEstimatePayload,
  StructuredEstimateRow,
} from "../estimateStructuredPipeline/structuredEstimateTypes";

export type ForemanEstimateSource = "foreman_ai_professional_estimate";

export type ForemanApprovalStatus =
  | "draft"
  | "sent_to_director"
  | "director_approved"
  | "director_rejected";

export type ForemanEstimateSection =
  | "materials"
  | "labor"
  | "equipment"
  | "delivery"
  | "tax"
  | "quality_control"
  | "overhead"
  | "debug";

export type ForemanEstimateCurrency = string;

export type ForemanEstimatePriceStatus =
  | "priced"
  | "manual_price_required"
  | "not_for_procurement";

export type ForemanEstimateContext = {
  objectName: string;
  levelName: string;
  systemName: string;
  zoneName: string;
  sourceScreen: "foreman_materials";
};

export type ForemanDraftEstimateRow = {
  source: ForemanEstimateSource;
  approvalStatus: ForemanApprovalStatus;
  estimateId: string;
  estimateRevisionId: string;
  payloadFingerprint: string;
  rowId: string;
  rowNumber: string;
  section: ForemanEstimateSection;
  sectionTitle: string;
  code: string;
  rik_code: string;
  visibleName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  currency: ForemanEstimateCurrency;
  confidence: GlobalEstimateConfidence;
  priceStatus: ForemanEstimatePriceStatus;
  includedInEstimate: boolean;
  includedInProcurement: boolean;
  buyerProcurementEligible: boolean;
  requestDraftKind: "material" | "work" | "service" | null;
  note: string | null;
  context: ForemanEstimateContext;
  structuredRow: StructuredEstimateRow;
};

export type ForemanRequestDraftLine = {
  rik_code: string;
  qty: number;
  errorLabel: string;
  meta: {
    note?: string | null;
    app_code?: string | null;
    kind?: string | null;
    name_human?: string | null;
    uom?: string | null;
  };
};

export type ForemanAiEstimateDraftMapping = {
  source: ForemanEstimateSource;
  approvalStatus: "draft";
  context: ForemanEstimateContext;
  payload: StructuredEstimatePayload;
  payloadFingerprint: string;
  estimateRevisionId: string;
  rows: ForemanDraftEstimateRow[];
  requestDraftLines: ForemanRequestDraftLine[];
  buyerPreviewRows: ForemanDraftEstimateRow[];
  totals: {
    estimateTotal: number;
    buyerProcurementTotal: number;
    currency: string;
  };
  fakeGreenClaimed: false;
};

export type ForemanAiEstimateRowEdit = {
  rowId: string;
  visibleName?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  includedInEstimate?: boolean | null;
  includedInProcurement?: boolean | null;
};

export type ForemanBuyerProcurementRow = {
  source: ForemanEstimateSource;
  request_item_id?: string | null;
  rik_code: string;
  name_human: string;
  qty: number;
  uom: string | null;
  kind: "material";
  note: string | null;
  estimateId: string;
  estimateRevisionId: string;
  sourceRowId: string;
  unitPrice: number;
  total: number;
  currency: string;
};

export type ForemanEstimateParityIssue = {
  severity: "error" | "warning";
  code: string;
  rowId?: string;
  message: string;
};

export type ForemanEstimateParityReport = {
  ok: boolean;
  sourceRowCount: number;
  foremanDraftLineCount: number;
  buyerProcurementRowCount: number;
  issues: ForemanEstimateParityIssue[];
  fakeGreenClaimed: false;
};
