import type {
  ProductionCompiledExpandedRow,
  ProductionDefaultUnit,
  ProductionTemplate10000Category,
  ProductionWorkDefinition,
} from "../../../lib/ai/estimateTemplate10000";

export type ProfessionalWorkFamilyId =
  | "demolition"
  | "earthworks"
  | "masonry"
  | "concrete"
  | "reinforcement"
  | "formwork"
  | "screed"
  | "flooring"
  | "tile"
  | "plaster"
  | "putty"
  | "paint"
  | "drywall"
  | "waterproofing"
  | "roofing"
  | "mansard_roof"
  | "facade"
  | "insulation"
  | "windows_doors"
  | "metalwork"
  | "profile_sheet_fence"
  | "diamond_concrete_drilling"
  | "carpentry"
  | "plumbing"
  | "electrical"
  | "hvac"
  | "fire_safety"
  | "low_voltage"
  | "roadworks"
  | "landscaping"
  | "cleaning_waste"
  | "transport_delivery"
  | "equipment_rental";

export type ProfessionalCatalogItemKind = "work" | "material" | "service" | "equipment";

export type ProfessionalCatalogItem = {
  catalog_item_id: string;
  kind: ProfessionalCatalogItemKind;
  family_id: ProfessionalWorkFamilyId;
  professional_name_ru: string;
  unit_policy_id: string;
  source_policy_id: string;
};

export type ProfessionalTemplateCatalogBinding = {
  template_id: string;
  work_key: string;
  category: ProductionTemplate10000Category;
  work_family_id: ProfessionalWorkFamilyId;
  calculator_family_id: string;
  work_catalog_item_id: string;
  parameter_schema_id: string;
  norm_pack_id: string;
  material_recipe_id: string;
  labor_recipe_id: string;
  service_recipe_id: string | null;
  equipment_recipe_id: string | null;
  unit_policy_id: string;
  price_policy_id: string;
  pdf_policy_id: string;
  buyer_handoff_policy_id: string;
};

export type ProfessionalRowCatalogBinding = ProfessionalCatalogItem & {
  row_code: string;
  section: ProductionCompiledExpandedRow["section"];
  unit: ProductionDefaultUnit;
  included_in_procurement: boolean;
};

export type ProfessionalTemplateDefinitionInput = Pick<
  ProductionWorkDefinition,
  "workKey" | "templateKey" | "category" | "operationKey" | "elementKey" | "systemKey" | "defaultUnit"
>;
