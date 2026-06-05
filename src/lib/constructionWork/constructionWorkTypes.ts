export type ConstructionWorkMeasurementKind =
  | "area"
  | "volume"
  | "length"
  | "count"
  | "weight"
  | "time"
  | "lump_sum";

export type ConstructionWorkComplexityLevel = "basic" | "standard" | "complex";
export type ConstructionWorkSourceKind = "internal_custom" | "licensed_external" | "public_reference" | "custom";
export type ConstructionWorkAliasKind = "canonical_title" | "work_key_phrase" | "user_phrase" | "abbreviation";
export type ConstructionWorkClassificationStandard =
  | "internal"
  | "masterformat_like"
  | "uniformat_like"
  | "omniclass_like"
  | "custom";
export type ConstructionWorkLinkKind =
  | "material"
  | "equipment"
  | "tool"
  | "service"
  | "supplier_offer"
  | "warehouse_item";
export type ConstructionWorkRecipeRowKind =
  | "material"
  | "labor"
  | "equipment"
  | "overhead"
  | "risk"
  | "timeline";

export type ConstructionWorkDomain = {
  id: string;
  domain_key: string;
  title_ru: string;
  title_en: string | null;
  description_ru: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ConstructionWorkDefinition = {
  id: string;
  work_key: string;
  domain_key: string;
  system_key: string | null;
  element_key: string | null;
  operation_key: string;
  title_ru: string;
  title_en: string | null;
  description_ru: string | null;
  default_unit: string;
  measurement_kind: ConstructionWorkMeasurementKind;
  complexity_level: ConstructionWorkComplexityLevel;
  is_active: boolean;
  source_kind: ConstructionWorkSourceKind;
  created_at: string;
  updated_at: string;
};

export type ConstructionWorkAlias = {
  id: string;
  work_id: string;
  alias_text: string;
  normalized_alias: string;
  language: string;
  alias_kind: ConstructionWorkAliasKind;
  confidence_weight: number;
  is_active: boolean;
  created_at: string;
};

export type ConstructionWorkClassificationCode = {
  id: string;
  work_id: string;
  standard: ConstructionWorkClassificationStandard;
  code: string;
  title: string | null;
  mapping_kind: string;
  source_license: string | null;
  is_official: boolean;
  created_at: string;
};

export type ConstructionWorkCatalogLink = {
  id: string;
  work_id: string;
  catalog_item_id: string;
  link_kind: ConstructionWorkLinkKind;
  quantity_formula: string | null;
  default_waste_percent: number | null;
  is_required: boolean;
  sort_order: number;
  created_at: string;
};

export type ConstructionWorkRecipeRow = {
  id: string;
  work_id: string;
  row_kind: ConstructionWorkRecipeRowKind;
  title_ru: string;
  unit: string;
  quantity_formula: string;
  unit_price_source: string;
  sort_order: number;
  is_required: boolean;
  created_at: string;
};

export type ConstructionWorkQueryError = {
  message?: string;
};

export type ConstructionWorkQueryResult<T> = {
  data: T[] | T | null;
  error: ConstructionWorkQueryError | null;
};

export type ConstructionWorkQueryBuilder<T> = PromiseLike<ConstructionWorkQueryResult<T>> & {
  eq(column: string, value: unknown): ConstructionWorkQueryBuilder<T>;
  order(column: string, options?: { ascending?: boolean }): ConstructionWorkQueryBuilder<T>;
  limit(count: number): ConstructionWorkQueryBuilder<T>;
  maybeSingle(): PromiseLike<ConstructionWorkQueryResult<T>>;
};

export type ConstructionWorkReadClient = {
  from<T = unknown>(table: string): {
    select(columns: string): ConstructionWorkQueryBuilder<T>;
  };
};
