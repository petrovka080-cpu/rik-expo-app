/** The existing Edge catalog storage DTO projection, shared without admission or coercion.
 * Arrays/string values retain their original legacy treatment. No Core, I/O or Deno import. */
type CanonicalCatalogCompositeStorageV1 = Readonly<{
  item_label_ru?: unknown;
  minimum_items?: unknown;
  maximum_items?: unknown;
  reorderable?: unknown;
  subfields?: unknown;
}>;
type CanonicalCatalogParameterTruthStorageV1 = Record<string, unknown> & {
  composite_item_schema?: CanonicalCatalogCompositeStorageV1 | null;
};
function parameterGuideView(source: unknown) {
  if (!source || typeof source !== "object" || Array.isArray(source)) return undefined;
  const guide = source as Record<string, unknown>;
  return {
    guideKind: guide.guide_kind,
    guideShortRu: guide.guide_short_ru,
    guideMin: guide.guide_min,
    guideMax: guide.guide_max,
    guideTarget: guide.guide_target,
    minInclusive: guide.min_inclusive,
    maxInclusive: guide.max_inclusive,
    guideOptions: guide.guide_options,
    canonicalUnit: guide.canonical_unit,
    displayUnit: guide.display_unit,
    guideBasis: guide.guide_basis,
    precision: guide.precision,
    step: guide.step,
    guideCondition: guide.guide_condition,
    guideValidationPolicy: guide.guide_validation_policy,
    sourceRole: guide.source_role,
    sourceDocument: guide.source_document,
    sourceEditionStatus: guide.source_edition_status,
    sourceLocator: guide.source_locator,
    guideVersion: guide.guide_version,
    sourceSnapshotHash: guide.source_snapshot_hash,
    applicability: guide.applicability,
    exclusions: guide.exclusions,
    verifiedAt: guide.verified_at,
  };
}

export { parameterGuideView as canonicalCatalogParameterGuideViewV1 };

export const canonicalCatalogParameterStorageViewV1 = (parameter: Readonly<Record<string, unknown>>) => {
        const truth = parameter.truth_metadata && typeof parameter.truth_metadata === "object"
          ? parameter.truth_metadata as CanonicalCatalogParameterTruthStorageV1
          : {};
        return {
          parameterId: parameter.parameter_id,
          ordinal: parameter.ordinal,
          valueType: parameter.value_type,
          unitId: parameter.unit_id,
          titleRu: parameter.title_ru,
          required: parameter.required,
          preliminaryCompilationAllowed: truth.preliminary_compilation_allowed === true,
          defaultValue: parameter.default_value,
          constraints: parameter.constraints_json,
          semanticParameterKey: truth.semantic_parameter_key,
          visibilityRole: truth.visibility_role,
          descriptionRu: truth.description_ru,
          requiredWhen: truth.required_when,
          visibleWhen: truth.visible_when,
          allowedRangeOrOptions: truth.allowed_range_or_options,
          defaultPolicy: truth.default_policy,
          valueSourceRole: truth.value_source_role,
          guide: parameterGuideView(truth.guide),
          compositeItemSchema: truth.composite_item_schema && typeof truth.composite_item_schema === "object" ? {
            itemLabelRu: truth.composite_item_schema.item_label_ru,
            minimumItems: truth.composite_item_schema.minimum_items,
            maximumItems: truth.composite_item_schema.maximum_items,
            reorderable: truth.composite_item_schema.reorderable === true,
            subfields: Array.isArray(truth.composite_item_schema.subfields)
              ? truth.composite_item_schema.subfields.map((subfield: Record<string, unknown>) => ({
                subfieldId: subfield.subfield_id,
                labelRu: subfield.label_ru,
                valueType: subfield.value_type,
                unitId: subfield.unit_id,
                required: subfield.required === true,
                constraints: subfield.constraints ?? {},
                guide: parameterGuideView(subfield.guide),
                formulaConsumers: subfield.formula_consumers ?? [],
                resourceBranchConsumers: subfield.resource_branch_consumers ?? [],
              }))
              : [],
          } : undefined,
          sharedInputBindingPolicy: truth.shared_input_binding_policy,
          derivedFrom: truth.derived_from,
          normativeLinks: truth.normative_links,
          formulaConsumers: truth.formula_consumers,
          resourceBranchConsumers: truth.resource_branch_consumers,
          validationRules: truth.validation_rules,
          conflictsWith: truth.conflicts_with,
          provenance: truth.provenance,
        };
      };
