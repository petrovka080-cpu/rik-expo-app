import type { ProfessionalBoqRow } from "./estimateDraftRevisionContract";

export type ProfessionalBoqMaterialSlotType =
  | "primary_material"
  | "auxiliary_material"
  | "fastener"
  | "consumable"
  | "sealant_or_adhesive"
  | "membrane_or_insulation"
  | "reinforcement"
  | "formwork"
  | "bedding_or_backfill"
  | "equipment_wear"
  | "transport_packaging";

export type ProfessionalBoqMaterialSlot = {
  slotKey: string;
  slotType: ProfessionalBoqMaterialSlotType;
  required: boolean;
  expectedNames: string[];
  expectedUnits: string[];
  matchedRowIds: string[];
  quantityTraceRequired: boolean;
  sourceCitationRequired: boolean;
};

export type FamilyMaterialSlotPolicySlot = {
  slotKey: string;
  expectedNames: string[];
  expectedUnits: string[];
  minMatchedRows: number;
  requiredWhen?:
    | "prompt_mentions_gate_or_wicket"
    | "prompt_mentions_water_tower_or_tank"
    | "prompt_mentions_gabion";
};

export type FamilyMaterialSlotPolicy = {
  family: string;
  appliesToTemplateIds: string[];
  materialRequired: boolean;
  materialNotRequiredReason?: string;
  requiredSlots: FamilyMaterialSlotPolicySlot[];
  optionalButExpectedSlots: FamilyMaterialSlotPolicySlot[];
  minWorkRows: number;
  minMaterialRows: number;
  minEquipmentRows: number;
  minServiceRows: number;
  allowsServiceOnlyEstimate: boolean;
};

export type ProfessionalBoqMaterialCompleteness = {
  templateId: string;
  family: string;
  prompt: string;
  fullBoqRowsCount: number;
  visibleMainRowsCount: number;
  requiredMaterialSlots: ProfessionalBoqMaterialSlot[];
  missingRequiredSlots: string[];
  missingOptionalButExpectedSlots: string[];
  fullSnapshotRowsCount: number;
  pdfRowsCount: number;
  buyerHandoffRowsCount: number;
  rowCapDetected: boolean;
  backendTruncationDetected: boolean;
  pdfTruncationDetected: boolean;
  buyerTruncationDetected: boolean;
};

export type ProfessionalBoqMaterialCompletenessBlockingReason =
  | "backend_row_cap_45_detected"
  | "snapshot_rows_less_than_calculator_rows"
  | "detail_drawer_rows_less_than_snapshot_rows"
  | "pdf_rows_less_than_snapshot_rows"
  | "buyer_handoff_missing_procurement_rows"
  | "required_material_slot_missing"
  | "generic_material_bucket_used"
  | "fake_filler_material_used"
  | "material_quantity_without_formula"
  | "material_without_source_citation"
  | "duplicate_noise_rows_found";

export type ProfessionalBoqMaterialCompletenessValidation = {
  completeness: ProfessionalBoqMaterialCompleteness;
  passed: boolean;
  blockingReasons: ProfessionalBoqMaterialCompletenessBlockingReason[];
  genericMaterialBucketCount: number;
  fakeFillerMaterialCount: number;
  materialQuantityWithoutFormulaCount: number;
  materialWithoutSourceCitationCount: number;
  duplicateNoiseRowsCount: number;
  procurementRowsExpectedCount: number;
  buyerHandoffMissingProcurementRowIds: string[];
};

export type ProfessionalBoqRowsArtifactSet = {
  calculatorRows: readonly ProfessionalBoqRow[];
  snapshotRows?: readonly ProfessionalBoqRow[];
  detailDrawerRowsCount?: number;
  pdfBody?: string | null;
  pdfRowsCount?: number;
  buyerHandoffRowIds?: readonly string[];
};
