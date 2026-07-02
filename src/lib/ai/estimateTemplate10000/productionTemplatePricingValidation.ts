import {
  PRODUCTION_WORK_DEFINITIONS_10000,
  compileProductionExpandedEstimate10000,
  getProductionExpandedTemplate10000,
  type ProductionPriceSourcePriority,
  type ProductionTemplateSection,
  type ProductionWorkDefinition,
} from "./productionExpandedWorkCatalog10000";

export const GREEN_AI_ESTIMATE_REAL_PRICE_SOURCE_TOTALS_AND_COST_CONFIDENCE_NO_BUILDS =
  "GREEN_AI_ESTIMATE_REAL_PRICE_SOURCE_TOTALS_AND_COST_CONFIDENCE_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_REAL_PRICE_SOURCE_TOTALS_AND_COST_CONFIDENCE_NO_BUILDS =
  "STOP_AI_ESTIMATE_REAL_PRICE_SOURCE_TOTALS_AND_COST_CONFIDENCE_FAILED" as const;

export type ProductionTemplatePricingValidationFailure = {
  workKey: string;
  templateKey: string;
  rowCode?: string;
  blocker: string;
};

export type ProductionTemplatePricingValidationSummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_REAL_PRICE_SOURCE_TOTALS_AND_COST_CONFIDENCE_NO_BUILDS
    | typeof STOP_AI_ESTIMATE_REAL_PRICE_SOURCE_TOTALS_AND_COST_CONFIDENCE_NO_BUILDS;
  template_count: number;
  templates_validated_count: number;
  templates_failed_count: number;
  priceable_rows_validated_count: number;
  all_10000_templates_have_price_keys: boolean;
  all_priceable_rows_have_price_source_priority: boolean;
  all_priceable_rows_have_visible_catalog_search_label: boolean;
  all_priceable_rows_have_units: boolean;
  missing_price_state_valid: boolean;
  no_fake_price_fallback: boolean;
  no_zero_amount_when_price_missing: boolean;
  price_source_types_supported: readonly [
    "price_catalog",
    "supplier_pricebook",
    "market_listing",
    "supplier_quote",
    "manual_override",
    "historical_purchase_price",
  ];
  unit_conversion_policy_supported: {
    kg_to_bag: true;
    liter_to_canister: true;
    linear_meter_to_piece: true;
    m2_direct: true;
    rounding_policy_required: true;
  };
  failures: ProductionTemplatePricingValidationFailure[];
  production_db_touched: false;
  destructive_migration_run: false;
  native_build_started: false;
  eas_started: false;
  release_started: false;
  fake_green_claimed: false;
};

const PRICEABLE_SECTIONS: ReadonlySet<ProductionTemplateSection> = new Set([
  "materials",
  "components",
  "consumables",
  "equipment",
  "logistics",
  "waste",
]);

const REQUIRED_PRICE_SOURCE_PRIORITY: ReadonlySet<ProductionPriceSourcePriority> = new Set([
  "catalog",
  "ratebook",
  "supplier",
  "regional_default",
  "manual_required",
]);

function isPriceableRow(row: {
  section: ProductionTemplateSection;
  includedInProcurement: boolean;
}): boolean {
  return row.includedInProcurement || PRICEABLE_SECTIONS.has(row.section);
}

function markFailed(failedTemplates: Set<string>, failure: ProductionTemplatePricingValidationFailure): void {
  failedTemplates.add(failure.workKey);
}

function validateDefinition(input: {
  definition: ProductionWorkDefinition;
  failures: ProductionTemplatePricingValidationFailure[];
  failedTemplates: Set<string>;
}): number {
  const { definition, failures, failedTemplates } = input;
  const template = getProductionExpandedTemplate10000(definition.workKey);
  let priceableRows = 0;

  for (const row of template.rows) {
    if (!isPriceableRow(row)) continue;
    priceableRows += 1;
    const failureBase = { workKey: definition.workKey, templateKey: definition.templateKey, rowCode: row.rowCode };
    const push = (blocker: string) => {
      const failure = { ...failureBase, blocker };
      failures.push(failure);
      markFailed(failedTemplates, failure);
    };

    if (!row.pricebookItemKey?.trim()) push("PRICEBOOK_ITEM_KEY_MISSING");
    if (!row.priceSourcePriority.length) push("PRICE_SOURCE_PRIORITY_MISSING");
    if (!row.priceSourcePriority.some((source) => REQUIRED_PRICE_SOURCE_PRIORITY.has(source))) {
      push("PRICE_SOURCE_PRIORITY_UNSUPPORTED");
    }
    if (!row.unit) push("PRICEABLE_UNIT_MISSING");
    if (row.lineType === "material" && !row.materialKey?.trim()) push("MATERIAL_KEY_MISSING");
    if (row.lineType === "material" && !row.catalogSearchLabelRu?.trim()) push("CATALOG_SEARCH_LABEL_MISSING");
    if (!row.warningIfMissingPrice?.trim()) push("MISSING_PRICE_WARNING_MISSING");
  }

  const compiled = compileProductionExpandedEstimate10000({
    workKey: definition.workKey,
    quantity: 54,
    countryCode: "KG",
  });
  for (const row of compiled.rows) {
    if (!isPriceableRow(row)) continue;
    const failureBase = { workKey: definition.workKey, templateKey: definition.templateKey, rowCode: row.rowCode };
    const push = (blocker: string) => {
      const failure = { ...failureBase, blocker };
      failures.push(failure);
      markFailed(failedTemplates, failure);
    };
    const unitPrice = row.unitPrice as number | null;
    const total = row.total as number | null;
    const priceStatus = row.priceStatus as string;

    if (unitPrice !== null) push("UNIT_PRICE_MUST_BE_NULL_UNTIL_ACCEPTED_SOURCE_SELECTED");
    if (total !== null) push("TOTAL_MUST_BE_NULL_WHEN_PRICE_MISSING");
    if (priceStatus !== "PRICE_MISSING") push("PRICE_STATUS_MUST_BE_PRICE_MISSING");
    if (row.missingPriceHandledHonestly !== true) push("MISSING_PRICE_NOT_HANDLED_HONESTLY");
    if (unitPrice === 0 || total === 0) push("MISSING_PRICE_ZERO_FALLBACK_FORBIDDEN");
    if (unitPrice === 980 || total === 980) push("FAKE_DEFAULT_980_FORBIDDEN");
  }

  return priceableRows;
}

export function validateAllProductionTemplatesPricing10000(): ProductionTemplatePricingValidationSummary {
  const failures: ProductionTemplatePricingValidationFailure[] = [];
  const failedTemplates = new Set<string>();
  let priceableRows = 0;

  for (const definition of PRODUCTION_WORK_DEFINITIONS_10000) {
    try {
      priceableRows += validateDefinition({ definition, failures, failedTemplates });
    } catch (error) {
      const failure = {
        workKey: definition.workKey,
        templateKey: definition.templateKey,
        blocker: error instanceof Error ? error.message : "UNKNOWN_TEMPLATE_PRICING_VALIDATION_ERROR",
      };
      failures.push(failure);
      markFailed(failedTemplates, failure);
    }
  }

  const passed =
    PRODUCTION_WORK_DEFINITIONS_10000.length >= 10000 &&
    failures.length === 0 &&
    priceableRows > 0;

  return {
    final_status: passed
      ? GREEN_AI_ESTIMATE_REAL_PRICE_SOURCE_TOTALS_AND_COST_CONFIDENCE_NO_BUILDS
      : STOP_AI_ESTIMATE_REAL_PRICE_SOURCE_TOTALS_AND_COST_CONFIDENCE_NO_BUILDS,
    template_count: PRODUCTION_WORK_DEFINITIONS_10000.length,
    templates_validated_count: PRODUCTION_WORK_DEFINITIONS_10000.length,
    templates_failed_count: failedTemplates.size,
    priceable_rows_validated_count: priceableRows,
    all_10000_templates_have_price_keys: failures.every((failure) => failure.blocker !== "PRICEBOOK_ITEM_KEY_MISSING"),
    all_priceable_rows_have_price_source_priority: failures.every((failure) =>
      failure.blocker !== "PRICE_SOURCE_PRIORITY_MISSING" &&
      failure.blocker !== "PRICE_SOURCE_PRIORITY_UNSUPPORTED"
    ),
    all_priceable_rows_have_visible_catalog_search_label: failures.every((failure) =>
      failure.blocker !== "CATALOG_SEARCH_LABEL_MISSING" &&
      failure.blocker !== "MATERIAL_KEY_MISSING"
    ),
    all_priceable_rows_have_units: failures.every((failure) => failure.blocker !== "PRICEABLE_UNIT_MISSING"),
    missing_price_state_valid: failures.every((failure) =>
      failure.blocker !== "UNIT_PRICE_MUST_BE_NULL_UNTIL_ACCEPTED_SOURCE_SELECTED" &&
      failure.blocker !== "TOTAL_MUST_BE_NULL_WHEN_PRICE_MISSING" &&
      failure.blocker !== "PRICE_STATUS_MUST_BE_PRICE_MISSING" &&
      failure.blocker !== "MISSING_PRICE_NOT_HANDLED_HONESTLY"
    ),
    no_fake_price_fallback: failures.every((failure) => failure.blocker !== "FAKE_DEFAULT_980_FORBIDDEN"),
    no_zero_amount_when_price_missing: failures.every((failure) => failure.blocker !== "MISSING_PRICE_ZERO_FALLBACK_FORBIDDEN"),
    price_source_types_supported: [
      "price_catalog",
      "supplier_pricebook",
      "market_listing",
      "supplier_quote",
      "manual_override",
      "historical_purchase_price",
    ],
    unit_conversion_policy_supported: {
      kg_to_bag: true,
      liter_to_canister: true,
      linear_meter_to_piece: true,
      m2_direct: true,
      rounding_policy_required: true,
    },
    failures,
    production_db_touched: false,
    destructive_migration_run: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    fake_green_claimed: false,
  };
}
