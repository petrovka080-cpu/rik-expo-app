export type ConstructionWorkType =
  | "parquet_flooring"
  | "laminate_flooring"
  | "engineered_flooring"
  | "tile_flooring"
  | "vinyl_flooring"
  | "asphalt_paving"
  | "plastering"
  | "drywall_partitions"
  | "painting"
  | "doors_installation"
  | "windows_installation"
  | "waterproofing"
  | "concrete_screed"
  | "unknown";

export type AiQuestionKnowledgeMode =
  | "internal_app_fact"
  | "public_construction_estimate"
  | "public_material_calculation"
  | "public_construction_technology"
  | "public_supplier_search"
  | "public_market_price"
  | "accounting_reference"
  | "tax_reference"
  | "finance_reference"
  | "hybrid_app_plus_external";

export type ConstructionEstimateLine = {
  nameRu: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
  total?: number;
  source: "marketplace" | "web" | "reference_price_book" | "manual";
};

export type ConstructionEstimateAnswer = {
  questionRu: string;
  workType: ConstructionWorkType;
  area?: {
    value: number;
    unit: "m2";
  };
  currency: string;
  assumptions: string[];
  materials: ConstructionEstimateLine[];
  works: ConstructionEstimateLine[];
  totals: {
    materialsTotal?: number;
    worksTotal?: number;
    deliveryTotal?: number;
    grandTotal?: number;
    formulaRu?: string;
  };
  missingInputs: string[];
  sourceDisclosure: {
    appDataUsed: boolean;
    externalSourcesUsed: boolean;
    referencePriceBookUsed: boolean;
    checkedAt?: string;
  };
  answerStartsWithResult: true;
};
