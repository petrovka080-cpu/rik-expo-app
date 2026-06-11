import type { StructuredEstimatePayload } from "../estimateStructuredPipeline/structuredEstimateTypes";

export type ProjectExecutionDraftSource = "request_estimate" | "ai_estimate" | "foreman";

export type ProjectTaskStatus = "todo";
export type ProjectTaskRoleHint = "foreman" | "worker" | "procurement" | "customer";

export type ProcurementPriceStatus = "known_catalog_price" | "price_required";

export type ProcurementConfidence = "high" | "medium" | "low";

export type ProjectChecklistItem = {
  id: string;
  title: string;
  sourceRowId?: string;
  visibleSourceLabel: string;
  kind: "quality_gate" | "handoff_note";
};

export type ProjectWorkPackage = {
  id: string;
  title: string;
  customerVisibleTitle: string;
  description?: string;
  sourceEstimateId?: string;
  sourceRowIds: string[];
  checklist: ProjectChecklistItem[];
};

export type ProjectTask = {
  id: string;
  packageId: string;
  title: string;
  description?: string;
  quantity?: number;
  unit?: string;
  status: ProjectTaskStatus;
  sourceRowId?: string;
  visibleSourceLabel: string;
  roleHint?: ProjectTaskRoleHint;
};

export type ProcurementItem = {
  id: string;
  sourceEstimateRowId: string;
  materialVisibleName: string;
  quantity: number;
  unit: string;
  catalogSearchQuery: string;
  catalogItemId?: string;
  priceStatus: ProcurementPriceStatus;
  confidence: ProcurementConfidence;
  notes?: string;
};

export type ProjectHandoffSummary = {
  sourceEstimateTitle: string;
  workPackageCount: number;
  taskCount: number;
  procurementItemCount: number;
  checklistCount: number;
  foremanHandoffFingerprint: string;
  customerProposalFingerprint: string;
  visibleWarnings: string[];
};

export type ProjectExecutionDraft = {
  projectId?: string;
  sourceEstimateId?: string;
  sourceRequestId?: string;
  sourcePayloadHash: string;
  projectTitle: string;
  customerVisibleTitle: string;
  workPackages: ProjectWorkPackage[];
  tasks: ProjectTask[];
  procurementItems: ProcurementItem[];
  handoffSummary: ProjectHandoffSummary;
  totals: {
    materialsTotal?: number;
    laborTotal?: number;
    equipmentTotal?: number;
    grandTotal?: number;
  };
  metadata: {
    source: ProjectExecutionDraftSource;
    createdAt: string;
    language: "ru";
    countryCode?: string;
    cityOrRegion?: string;
  };
};

export type ProjectExecutionDraftOptions = {
  source: ProjectExecutionDraftSource;
  countryCode?: string;
  cityOrRegion?: string;
  generatedAt: string;
  projectId?: string;
  sourceRequestId?: string;
};

export type ProjectExecutionExportSection = {
  title: string;
  rows: {
    label: string;
    quantity?: number;
    unit?: string;
    sourceLabel?: string;
  }[];
};

export type ProjectExecutionExportViewModel = {
  sourcePayloadHash: string;
  title: string;
  sections: ProjectExecutionExportSection[];
  fingerprints: {
    estimate: string;
    workPackages: string;
    tasks: string;
    procurement: string;
  };
  fakeGreenClaimed: false;
};

export type ProjectExecutionBindingPayloads = {
  request: {
    sourcePayloadHash: string;
    projectId?: string;
    workPackageCount: number;
    taskCount: number;
    procurementItemCount: number;
  };
  history: {
    sourcePayloadHash: string;
    projectFingerprint: string;
    requestDraftId?: string;
    projectDraftSaved: boolean;
  };
  foreman: {
    sourcePayloadHash: string;
    workPackages: ProjectWorkPackage[];
    tasks: ProjectTask[];
    procurementItems: ProcurementItem[];
  };
  customerProposal: ProjectExecutionExportViewModel;
  sameSourceOfTruth: boolean;
  fakeGreenClaimed: false;
};

export type ProjectExecutionBuildInput = {
  payload: StructuredEstimatePayload;
  options: ProjectExecutionDraftOptions;
};
