export type AsphaltRelatedOperationClassV4 =
  | "NEW_FULL_CONSTRUCTION"
  | "PAVE_ON_CONFIRMED_PREPARED_BASE"
  | "INSTALL_BINDER_LAYER"
  | "INSTALL_WEARING_LAYER"
  | "OVERLAY"
  | "SURFACE_TREATMENT"
  | "LOCAL_PATCH_REPAIR"
  | "AREA_CARD_REPAIR"
  | "JOINT_OR_EDGE_REPAIR"
  | "PARTIAL_DEPTH_MILLING"
  | "PARTIAL_DEPTH_REMOVAL"
  | "COLD_MILLING"
  | "LOCAL_BREAKUP"
  | "FULL_DEPTH_DEMOLITION"
  | "MECHANICAL_BREAKOUT"
  | "REMOVE_AND_HAUL"
  | "RECYCLE_OR_REGENERATE"
  | "BASE_REPAIR_AND_REINSTATE"
  | "DEMOLISH_AND_REINSTATE"
  | "DEMOLITION_AND_REINSTATEMENT"
  | "SPECIAL_CONTEXT_APPLICATION";

export type AsphaltRelatedApplicationContextV4 =
  | "ROAD"
  | "PARKING"
  | "YARD_OR_SITE"
  | "SIDEWALK_OR_PATH"
  | "BRIDGE_OR_STRUCTURE"
  | "INDUSTRIAL_OR_TECHNICAL_FLOOR"
  | "WET_OR_SPECIAL_ZONE"
  | "LOCAL_REPAIR_ZONE";

export type AsphaltRelatedProfileV4 = {
  canonicalWorkKey: string;
  canonicalCatalogRecordId: string;
  catalogRecordIds: readonly string[];
  professionalNameRu: string;
  uiGroup: "ROADWORKS" | "DEMOLITION_WORKS";
  semanticDomains: readonly ("ASPHALT_RELATED" | "ROADWORKS" | "DEMOLITION")[];
  surfaceMaterial: "ASPHALT_CONCRETE";
  operationClass: AsphaltRelatedOperationClassV4;
  applicationContext: AsphaltRelatedApplicationContextV4;
  passportId: string;
  passportVersion: string;
  calculationStrategyId: string;
  calculationProfileId: string;
  parameterSchemaId: string;
  formulaGraphVersion: string;
  normativeCompositionId: string;
  positiveVectorId: string;
  forbiddenOwnerSetId: string;
  requiredParameters: readonly string[];
  optionalParameters: readonly string[];
};
