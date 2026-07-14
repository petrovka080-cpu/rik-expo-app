export type WorkOntologyCategory =
  | "demolition"
  | "earthworks"
  | "concrete_foundation"
  | "masonry"
  | "waterproofing"
  | "roofing"
  | "insulation"
  | "facade"
  | "plaster_paint"
  | "drywall_ceiling"
  | "tile_stone"
  | "flooring"
  | "doors_windows"
  | "carpentry_metal"
  | "electrical"
  | "plumbing"
  | "heating_hvac"
  | "ventilation"
  | "paving_roads_landscape"
  | "special_repair";

export type WorkOntologyUnit = "m2" | "m3" | "linear_m" | "piece" | "set" | "kg" | "ton";

export type WorkOntologyCountry = "KG" | "KZ" | "RU" | "UZ";

export type WorkOntologyCurrency = "KGS" | "KZT" | "RUB" | "UZS";

export type WorkOntologySupportStatus =
  | "SUPPORTED"
  | "RECIPE_MISSING"
  | "PRICEBOOK_SCOPE_MISSING"
  | "UNSUPPORTED";

export type ConstructionWorkOntologyEntry = {
  canonical_work_key: string;
  visible_name_ru: string;
  category: WorkOntologyCategory;
  synonyms_ru: string[];
  negative_synonyms_ru: string[];
  expected_units: WorkOntologyUnit[];
  default_unit: WorkOntologyUnit;
  recipe_scope: string | null;
  material_recipe_scope: string | null;
  pricebook_scope: string | null;
  ambiguity_group: string | null;
  supported: boolean;
  support_status: WorkOntologySupportStatus;
  confidence_floor: number;
};

export type RealWorkOntologyCase = {
  id: string;
  user_input_ru: string;
  expected_canonical_work_key: string;
  expected_visible_work_name_ru: string;
  category: WorkOntologyCategory;
  quantity: number | null;
  unit: WorkOntologyUnit | null;
  country: WorkOntologyCountry;
  region: string;
  expected_currency: WorkOntologyCurrency;
  ambiguity_group?: string;
  must_not_match?: string[];
  expected_recipe_scope: string | null;
  expected_pricebook_scope: string | null;
  must_have_recipe: boolean;
  must_have_material_recipe: boolean;
};

export type WorkOntologyMatchStatus =
  | "RESOLVED"
  | "AMBIGUOUS_WORK_INPUT"
  | "WORK_NOT_SUPPORTED"
  | "RECIPE_MISSING"
  | "PRICEBOOK_SCOPE_MISSING"
  | "LOW_CONFIDENCE_MATCH";

export type WorkOntologyCandidateScore = {
  canonical_work_key: string;
  visible_name_ru: string;
  category: WorkOntologyCategory;
  score: number;
  confidence: number;
  reasons: string[];
};

export type WorkOntologyIntentResult = {
  user_input: string;
  normalized_intent: string;
  canonical_work_key: string | null;
  selected_work_key: string | null;
  visible_work_name_ru: string | null;
  category: WorkOntologyCategory | null;
  quantity: number | null;
  unit: WorkOntologyUnit | null;
  expected_unit: WorkOntologyUnit | null;
  recipe_scope: string | null;
  material_recipe_scope: string | null;
  pricebook_scope: string | null;
  country: WorkOntologyCountry;
  region: string;
  expected_currency: WorkOntologyCurrency;
  confidence: number;
  ambiguity_status: WorkOntologyMatchStatus;
  candidates: WorkOntologyCandidateScore[];
  ui_payload: {
    selected_work_key: string | null;
    visible_work_name_ru: string | null;
    quantity: number | null;
    unit: WorkOntologyUnit | null;
    recipe_scope: string | null;
    material_recipe_scope: string | null;
    pricebook_scope: string | null;
  };
  pdf_payload: {
    selected_work_key: string | null;
    visible_work_name_ru: string | null;
    quantity: number | null;
    unit: WorkOntologyUnit | null;
    recipe_scope: string | null;
    material_recipe_scope: string | null;
    pricebook_scope: string | null;
  };
  fake_green_claimed: false;
};

export type WorkOntologyConfusionPairCase = {
  id: string;
  left_work_key: string;
  right_work_key: string;
  user_input_ru: string;
  expected_canonical_work_key: string;
  must_not_match: string;
  category: WorkOntologyCategory;
  quantity: number;
  unit: WorkOntologyUnit;
};

export type WorkOntologyRecipeBindingCase = {
  id: string;
  canonical_work_key: string;
  visible_work_name_ru: string;
  category: WorkOntologyCategory;
  expected_unit: WorkOntologyUnit;
  recipe_scope: string;
  material_recipe_scope: string;
  pricebook_scope: string;
};
