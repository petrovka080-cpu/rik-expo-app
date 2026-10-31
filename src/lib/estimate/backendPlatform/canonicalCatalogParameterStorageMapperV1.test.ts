import {
  canonicalCatalogParameterGuideViewV1 as guide,
  canonicalCatalogParameterStorageViewV1 as mapParameter,
} from './canonicalCatalogParameterStorageMapperV1';

const guideKeys = [
  'guideKind', 'guideShortRu', 'guideMin', 'guideMax', 'guideTarget', 'minInclusive',
  'maxInclusive', 'guideOptions', 'canonicalUnit', 'displayUnit', 'guideBasis',
  'precision', 'step', 'guideCondition', 'guideValidationPolicy', 'sourceRole',
  'sourceDocument', 'sourceEditionStatus', 'sourceLocator', 'guideVersion',
  'sourceSnapshotHash', 'applicability', 'exclusions', 'verifiedAt',
];
const parameterKeys = [
  'parameterId', 'ordinal', 'valueType', 'unitId', 'titleRu', 'required',
  'preliminaryCompilationAllowed', 'defaultValue', 'constraints',
  'semanticParameterKey', 'visibilityRole', 'descriptionRu', 'requiredWhen',
  'visibleWhen', 'allowedRangeOrOptions', 'defaultPolicy', 'valueSourceRole',
  'guide', 'compositeItemSchema', 'sharedInputBindingPolicy', 'derivedFrom',
  'normativeLinks', 'formulaConsumers', 'resourceBranchConsumers',
  'validationRules', 'conflictsWith', 'provenance',
];
const row = (extra: Readonly<Record<string, unknown>> = {}) => ({
  parameter_id: 'selected_length', ordinal: 0, value_type: 'decimal', unit_id: 'm',
  title_ru: 'Длина', required: true, default_value: null, constraints_json: null,
  ...extra,
});
function freezeDeep(value: unknown): void {
  if (value !== null && typeof value === 'object') {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
}

describe('the shared production catalog storage parameter DTO', () => {
  it('maps all24 guide fields without coercion or invented values', () => {
    const options = ['1.2300', '2.0000'];
    const input = {
      guide_kind: 'range', guide_short_ru: 'По проекту', guide_min: '0.0000',
      guide_max: 10, guide_target: null, min_inclusive: false, max_inclusive: true,
      guide_options: options, canonical_unit: 'm', display_unit: 'мм',
      guide_basis: { revision: 'EXPLICIT' }, precision: 4, step: '0.0100',
      guide_condition: { field: 'kind', equals: 'selected' },
      guide_validation_policy: 'PROJECT_REQUIRED', source_role: 'PROJECT',
      source_document: 'TEST_ONLY_DOCUMENT', source_edition_status: 'PINNED',
      source_locator: 'section7', guide_version: 'v1', source_snapshot_hash: 'a'.repeat(64),
      applicability: ['chosen'], exclusions: [], verified_at: 'raw-opaque-time',
    };
    expect(guide(input)).toStrictEqual({
      guideKind: 'range', guideShortRu: 'По проекту', guideMin: '0.0000',
      guideMax: 10, guideTarget: null, minInclusive: false, maxInclusive: true,
      guideOptions: options, canonicalUnit: 'm', displayUnit: 'мм',
      guideBasis: { revision: 'EXPLICIT' }, precision: 4, step: '0.0100',
      guideCondition: { field: 'kind', equals: 'selected' },
      guideValidationPolicy: 'PROJECT_REQUIRED', sourceRole: 'PROJECT',
      sourceDocument: 'TEST_ONLY_DOCUMENT', sourceEditionStatus: 'PINNED',
      sourceLocator: 'section7', guideVersion: 'v1', sourceSnapshotHash: 'a'.repeat(64),
      applicability: ['chosen'], exclusions: [], verifiedAt: 'raw-opaque-time',
    });
    expect(Object.keys(guide(input)!)).toStrictEqual(guideKeys);
    expect(guide(input)!.guideOptions).toBe(options);
  });

  it.each([undefined, null, false, 0, 'raw-guide', []])('keeps non-record guide %p absent', input => {
    expect(guide(input)).toBeUndefined();
  });

  it('keeps all undefined guide properties present and distinguishes null', () => {
    const empty = guide({})!;
    expect(Object.keys(empty)).toStrictEqual(guideKeys);
    for (const key of guideKeys) expect(Object.hasOwn(empty, key)).toBe(true);
    expect(empty.guideMin).toBeUndefined();
    expect(guide({ guide_min: null })!.guideMin).toBeNull();
    expect(guide({ guide_min: 0 })!.guideMin).toBe(0);
  });

  it('preserves the full DTO property presence for omitted metadata', () => {
    const output = mapParameter({});
    expect(Object.keys(output)).toStrictEqual(parameterKeys);
    for (const key of parameterKeys) expect(Object.hasOwn(output, key)).toBe(true);
    expect(output.required).toBeUndefined();
    expect(output.preliminaryCompilationAllowed).toBe(false);
    expect(output.defaultValue).toBeUndefined();
    expect(output.constraints).toBeUndefined();
    expect(output.guide).toBeUndefined();
    expect(output.compositeItemSchema).toBeUndefined();
    expect(output.provenance).toBeUndefined();
  });

  it('maps the existing snake-case truth properties and the nested provenance only', () => {
    const provenance = { document: 'TEST_ONLY_SOURCE', sourceAdmission: false };
    const truth = {
      preliminary_compilation_allowed: true, semantic_parameter_key: 'length',
      visibility_role: 'USER_INPUT', description_ru: 'Из проекта',
      required_when: { field: 'selected', equals: true }, visible_when: null,
      allowed_range_or_options: ['a', 'b'], default_policy: 'NO_DEFAULT',
      value_source_role: 'OBJECT', shared_input_binding_policy: 'EXACT_BINDING',
      derived_from: ['geometry'], normative_links: [], formula_consumers: ['length'],
      resource_branch_consumers: ['material'], validation_rules: ['positive'],
      conflicts_with: [], provenance,
    };
    const output = mapParameter(row({ truth_metadata: truth }));
    expect(output).toStrictEqual({
      parameterId: 'selected_length', ordinal: 0, valueType: 'decimal', unitId: 'm',
      titleRu: 'Длина', required: true, preliminaryCompilationAllowed: true,
      defaultValue: null, constraints: null, semanticParameterKey: 'length',
      visibilityRole: 'USER_INPUT', descriptionRu: 'Из проекта',
      requiredWhen: { field: 'selected', equals: true }, visibleWhen: null,
      allowedRangeOrOptions: ['a', 'b'], defaultPolicy: 'NO_DEFAULT', valueSourceRole: 'OBJECT',
      guide: undefined, compositeItemSchema: undefined, sharedInputBindingPolicy: 'EXACT_BINDING',
      derivedFrom: ['geometry'], normativeLinks: [], formulaConsumers: ['length'],
      resourceBranchConsumers: ['material'], validationRules: ['positive'], conflictsWith: [], provenance,
    });
    expect(output.provenance).toBe(provenance);
    expect(output.provenance).not.toBe(truth);
    expect(mapParameter(row({ truth_metadata: { visibility_role: 'ONLY' } })).provenance).toBeUndefined();
  });

  it.each([undefined, null, 'serialized-truth', 0, false])('retains empty-truth behavior for %p', truth => {
    const output = mapParameter(row({ required: 'raw-required', truth_metadata: truth }));
    expect(output.required).toBe('raw-required');
    expect(output.preliminaryCompilationAllowed).toBe(false);
    expect(output.provenance).toBeUndefined();
    expect(output.compositeItemSchema).toBeUndefined();
  });

  it('preserves the original object test for array truth without pretending it is a guide', () => {
    const truth = Object.assign([], { visibility_role: 'ARRAY_PROPERTY', preliminary_compilation_allowed: 'true' });
    const output = mapParameter(row({ truth_metadata: truth }));
    expect(output.visibilityRole).toBe('ARRAY_PROPERTY');
    expect(output.preliminaryCompilationAllowed).toBe(false);
    expect(guide(truth)).toBeUndefined();
  });

  it('maps nested composite and subfield guides while retaining strict boolean and nullish defaults', () => {
    const output = mapParameter(row({ truth_metadata: { composite_item_schema: {
      item_label_ru: 'Секция', minimum_items: 0, maximum_items: null, reorderable: 'true',
      subfields: [{ subfield_id: 'width', label_ru: 'Ширина', value_type: 'decimal', unit_id: 'm',
        required: true, constraints: null, guide: { guide_min: '0.0100' },
        formula_consumers: null, resource_branch_consumers: ['area'] },
      { subfield_id: 'note', required: 'true', constraints: [], formula_consumers: 'raw-string',
        resource_branch_consumers: 0, guide: [] }],
    } } }));
    const composite = output.compositeItemSchema!;
    expect(composite.itemLabelRu).toBe('Секция');
    expect(composite.minimumItems).toBe(0);
    expect(composite.maximumItems).toBeNull();
    expect(composite.reorderable).toBe(false);
    expect(composite.subfields).toHaveLength(2);
    expect(composite.subfields[0]).toStrictEqual({
      subfieldId: 'width', labelRu: 'Ширина', valueType: 'decimal', unitId: 'm', required: true,
      constraints: {}, guide: guide({ guide_min: '0.0100' }), formulaConsumers: [], resourceBranchConsumers: ['area'],
    });
    expect(composite.subfields[1]).toStrictEqual({
      subfieldId: 'note', labelRu: undefined, valueType: undefined, unitId: undefined, required: false,
      constraints: [], guide: undefined, formulaConsumers: 'raw-string', resourceBranchConsumers: 0,
    });
  });

  it('preserves composite object/array versus primitive boundaries and the existing null-subfield error', () => {
    for (const composite of [undefined, null, false, 'raw-schema']) {
      expect(mapParameter(row({ truth_metadata: { composite_item_schema: composite } })).compositeItemSchema).toBeUndefined();
    }
    expect(mapParameter(row({ truth_metadata: { composite_item_schema: [] } })).compositeItemSchema)
      .toStrictEqual({ itemLabelRu: undefined, minimumItems: undefined, maximumItems: undefined, reorderable: false, subfields: [] });
    expect(mapParameter(row({ truth_metadata: { composite_item_schema: { reorderable: true, subfields: 'raw' } } })).compositeItemSchema)
      .toStrictEqual({ itemLabelRu: undefined, minimumItems: undefined, maximumItems: undefined, reorderable: true, subfields: [] });
    expect(() => mapParameter(row({ truth_metadata: { composite_item_schema: { subfields: [null] } } }))).toThrow(TypeError);
  });

  it('preserves raw decimal strings, numbers, negative zero, nulls and array identities', () => {
    const exact = '9007199254740993.1230000000000001';
    const constraints = { minimum: '1.2300', maximum: 1e120 };
    const output = mapParameter(row({ ordinal: -0, required: null, default_value: exact,
      constraints_json: constraints, truth_metadata: { provenance: null, guide: { guide_min: -0, guide_max: exact } } }));
    expect(Object.is(output.ordinal, -0)).toBe(true);
    expect(Object.is(output.guide!.guideMin, -0)).toBe(true);
    expect(output.required).toBeNull();
    expect(output.defaultValue).toBe(exact);
    expect(output.guide!.guideMax).toBe(exact);
    expect(output.constraints).toBe(constraints);
    expect(output.provenance).toBeNull();
  });

  it('does not mutate deeply frozen storage rows or nested metadata', () => {
    const input = row({ truth_metadata: { preliminary_compilation_allowed: true, provenance: { raw: 'kept' },
      guide: { guide_options: ['1.2300'] }, composite_item_schema: { subfields: [{ subfield_id: 'x', constraints: {} }] } } });
    const snapshot = structuredClone(input);
    freezeDeep(input);
    const output = mapParameter(input);
    expect(input).toStrictEqual(snapshot);
    expect(output.parameterId).toBe('selected_length');
    expect(output.preliminaryCompilationAllowed).toBe(true);
  });
});
