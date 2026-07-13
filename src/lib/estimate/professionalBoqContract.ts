import type { ConsumerRepairAiDraft, ConsumerRepairDraftBundle } from "../consumerRequests";
import type { RequestEstimateViewModel } from "../../features/consumerRepair/requestEstimateViewModel";
import type { ConsumerRepairProcurementHandoff } from "../../features/procurement/consumerRepairProcurementHandoff";

export const PROFESSIONAL_BOQ_RUNTIME_CONTRACT_ID = "professional_boq_runtime_contract_v1" as const;
export const PROFESSIONAL_BOQ_RUNTIME_SOURCE_ID = "src_professional_boq_runtime_contract_2026_07_05" as const;
export const GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_RUNTIME_CONTRACT =
  "GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_RUNTIME_CONTRACT_SEALED_COMMITTED_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_PROFESSIONAL_BOQ_RUNTIME_CONTRACT =
  "STOP_AI_ESTIMATE_PROFESSIONAL_BOQ_RUNTIME_CONTRACT_INCOMPLETE_NO_GREEN" as const;

export type ProfessionalBoqRiskLevel = "standard" | "elevated" | "regulated";

export type ProfessionalBoqRiskPolicy = {
  riskLevel: ProfessionalBoqRiskLevel;
  riskCodes: string[];
  summaryNoteRu: string;
  publicNotesRu: string[];
  missingInputsRu: string[];
  requiresSpecialist: boolean;
};

export type ProfessionalBoqAssumptions = {
  assumptionsRu: string[];
  missingInputsRu: string[];
  pricePolicyRu: string;
  drawingsPolicyRu: string;
  drawingsNotRequiredForPreliminaryBoq?: true;
  professionalDefaultsApplied?: boolean;
  defaultAssumptionsRu?: string[];
  finalContractStatusBlockedUntilReview?: true;
};

export type ProfessionalBoqRuntimeContractInput = {
  prompt: string;
  draft: ConsumerRepairAiDraft;
  viewModel?: RequestEstimateViewModel | null;
  approvedBundle?: ConsumerRepairDraftBundle | null;
  pdfBody?: string | null;
  buyerHandoff?: ConsumerRepairProcurementHandoff | null;
};

export type ProfessionalBoqRuntimeContractValidation = {
  passed: boolean;
  failures: string[];
};
