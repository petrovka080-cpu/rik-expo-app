export type ProfessionalMaterialType =
  | "bulk_material"
  | "linear_material"
  | "sheet_material"
  | "piece_material"
  | "set_material"
  | "wet_mix"
  | "equipment_rental"
  | "transport_service"
  | "consumable"
  | "service";

export type ProfessionalMaterialQuantityState =
  | "calculated"
  | "requires_source_quantity"
  | "not_applicable"
  | "blocked";

export type ProfessionalMaterialQuantityFormulaInputs = Record<string, number | string | boolean | null>;

export type ProfessionalMaterialQuantityLine = {
  rowId: string;
  templateId: string;
  family: string;
  materialName: string;
  materialType: ProfessionalMaterialType;
  unit: string;
  baseQuantity: number;
  wastePercent: number;
  lossPercent: number;
  netQuantity: number;
  grossQuantity: number;
  procurementUnit: string;
  procurementPackageSize: number;
  procurementQuantity: number;
  formula: string;
  formulaInputs: ProfessionalMaterialQuantityFormulaInputs;
  formulaResult: number;
  sourceId: string;
  citationLabel: string;
  calculationTrace: string;
  quantityDependsOnParams: string[];
  quantityState: ProfessionalMaterialQuantityState;
};

export type ProfessionalMaterialQuantityNorm = {
  normId: string;
  family: string;
  rowIdPattern?: string | null;
  materialKeyPattern?: string | null;
  materialNamePattern?: string | null;
  materialType: ProfessionalMaterialType;
  unit?: string | null;
  formula: string;
  formulaInputsRequired: string[];
  wastePercent?: number | null;
  lossPercent?: number | null;
  procurementUnit?: string | null;
  procurementPackageSize?: number | null;
  sourceId: string;
  citationLabel: string;
};

export type ProfessionalMaterialQuantityBlockingReason =
  | "procurement_row_without_quantity_line"
  | "procurement_row_without_formula"
  | "procurement_row_without_formula_inputs"
  | "procurement_row_without_source_citation"
  | "base_quantity_not_positive"
  | "waste_or_loss_negative"
  | "gross_quantity_less_than_net"
  | "procurement_quantity_less_than_gross"
  | "procurement_rounding_invalid"
  | "static_quantity_noise_detected"
  | "buyer_handoff_quantity_mismatch";

export type ProfessionalMaterialQuantityAccuracyValidation = {
  passed: boolean;
  templateId: string;
  family: string;
  procurementRowsCount: number;
  materialQuantityLinesCount: number;
  formulaBackedLinesCount: number;
  sourceBackedLinesCount: number;
  roundingBackedLinesCount: number;
  wasteBackedLinesCount: number;
  dynamicParamBackedLinesCount: number;
  blockedRows: {
    rowId: string;
    materialName: string;
    reasons: ProfessionalMaterialQuantityBlockingReason[];
  }[];
  blockingReasons: ProfessionalMaterialQuantityBlockingReason[];
};
