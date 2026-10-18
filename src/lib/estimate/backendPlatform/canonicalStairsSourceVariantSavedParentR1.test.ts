import {
  assertCanonicalStairsSourceVariantSavedParentR1 as guard,
  canonicalStairsSourceVariantCatalogR1 as catalogId,
  canonicalStairsSourceVariantParameterR1 as key,
  canonicalStairsSourceVariantDokaR1 as doka,
  canonicalStairsSourceVariantLegacyR1 as legacy,
  type CanonicalStairsSourceVariantSavedParentInputR1 as Input,
} from './canonicalStairsSourceVariantSavedParentR1';

const legacyStates = [
  { name: 'missing', parameters: {} },
  { name: 'null', parameters: { [key]: null } },
  { name: 'explicit', parameters: { [key]: legacy } },
];
const input = (parent: Record<string, unknown>, submitted: Record<string, unknown>,
  effective: Record<string, unknown> = { ...parent, ...submitted }): Input => ({
  phase: 'WORKER', operation: 'recalculate', catalogId,
  parent: { catalogId, parameters: parent }, submittedParameters: submitted, effectiveParameters: effective,
});
const rejects = (value: Input, reason: string) => expect(() => guard(value)).toThrow(expect.objectContaining({
  code: 'STAIRS_SOURCE_VARIANT_CHANGE_REVIEW_REQUIRED', httpStatus: 409, reason,
}));

describe('saved standard stair source method admission; pure WORK candidate, not runtime PASS', () => {
  it.each([{}, { [key]: null }, { [key]: legacy }, { [key]: doka }])(
    'allows a new estimate in either phase, leaving ordinary source validation intact: %j', parameters => {
      for (const phase of ['INTAKE', 'WORKER'] as const) expect(() => guard({ phase, operation: 'compile', catalogId,
        parent: null, submittedParameters: parameters, effectiveParameters: parameters })).not.toThrow();
    },
  );

  it.each(legacyStates.flatMap(parent => legacyStates.map(child => ({ name: parent.name + '->' + child.name,
    parent: parent.parameters, child: child.parameters }))))('retains legacy semantics: $name', row => {
    const value = input(row.parent, row.child);
    expect(() => guard({ ...value, phase: 'INTAKE' })).not.toThrow();
    expect(() => guard(value)).not.toThrow();
  });

  it.each(legacyStates)('blocks saved legacy->$Doka even without manual rows: $name', row => {
    const value = input(row.parameters, { [key]: doka });
    rejects({ ...value, phase: 'INTAKE' }, 'SAVED_SOURCE_VARIANT_SWITCH');
    rejects(value, 'SAVED_SOURCE_VARIANT_SWITCH');
  });

  it.each([{ name: 'null', parameters: { [key]: null } }, { name: 'explicitLegacy', parameters: { [key]: legacy } }])(
    'blocks saved Doka->legacy: $name', row => {
      const value = input({ [key]: doka }, row.parameters);
      rejects({ ...value, phase: 'INTAKE' }, 'SAVED_SOURCE_VARIANT_SWITCH');
      rejects(value, 'SAVED_SOURCE_VARIANT_SWITCH');
    },
  );

  it.each([{ name: 'explicit', parameters: { [key]: doka } }, { name: 'omitted', parameters: {} },
    { name: 'undefinedOmittedOnWire', parameters: { [key]: undefined } }])('allows same Doka method: $name', row => {
      const value = input({ [key]: doka }, row.parameters, { [key]: doka, stairs_concrete_volume_m3: '12' });
      expect(() => guard({ ...value, phase: 'INTAKE' })).not.toThrow();
      expect(() => guard(value)).not.toThrow();
    },
  );

  it.each(legacyStates)('worker refuses loss of inherited Doka through effective resolution: $name', row => {
    const value = input({ [key]: doka }, {}, row.parameters);
    expect(() => guard({ ...value, phase: 'INTAKE' })).not.toThrow();
    rejects(value, 'EFFECTIVE_SAVED_SOURCE_VARIANT_SWITCH');
  });

  it('worker refuses unexpected baseline activation of Doka for a legacy parent', () => {
    const value = input({}, {}, { [key]: doka });
    expect(() => guard({ ...value, phase: 'INTAKE' })).not.toThrow();
    rejects(value, 'EFFECTIVE_SAVED_SOURCE_VARIANT_SWITCH');
  });

  it('does not let an effective fallback hide an explicit prohibited request', () => {
    rejects(input({}, { [key]: doka }, {}), 'SAVED_SOURCE_VARIANT_SWITCH');
    rejects(input({ [key]: doka }, { [key]: null }, { [key]: doka }), 'SAVED_SOURCE_VARIANT_SWITCH');
  });

  it('requires actual effective worker parameters rather than guessing from request intent', () => {
    const value = input({ [key]: doka }, {});
    delete (value as { effectiveParameters?: unknown }).effectiveParameters;
    rejects(value, 'EFFECTIVE_WORKER_PARAMETERS_REQUIRED');
  });

  it.each(['', 'doka', ' KRER06_111_01_DOKA ', 'UNKNOWN', 1, false, [], {}])(
    'does not normalize an invalid parent selector into a valid method: %j', value => {
      rejects(input({ [key]: value }, {}), 'INVALID_PARENT_SELECTOR');
    },
  );

  it.each(['', 'doka', 'EXISTING', 1, [], {}])('rejects invalid submitted selector: %j', value => {
    rejects(input({}, { [key]: value }), 'INVALID_SUBMITTED_SELECTOR');
  });

  it.each(['', 'doka', 'UNKNOWN', false, [], {}])('rejects invalid effective selector: %j', value => {
    rejects(input({}, {}, { [key]: value }), 'INVALID_EFFECTIVE_SELECTOR');
  });

  it('does not treat invalid saved parameter payload as a new/legacy estimate', () => {
    rejects({ ...input({}, {}), parent: null }, 'EXACT_SAVED_PARENT_REQUIRED');
    rejects({ ...input({}, {}), parent: { catalogId, parameters: null } }, 'INVALID_PARENT_PARAMETERS');
    rejects({ ...input({}, {}), parent: { catalogId: 'another-existing-catalog', parameters: {} } }, 'EXACT_SAVED_PARENT_REQUIRED');
    rejects({ ...input({}, {}), submittedParameters: [] }, 'INVALID_SUBMITTED_PARAMETERS');
  });

  it('does not interpret compile with a saved parent as new-estimate permission', () => {
    rejects({ ...input({}, { [key]: doka }), operation: 'compile' }, 'NEW_ESTIMATE_HAS_PARENT');
  });

  it('preserves unrelated catalogs without applying source-method policy', () => {
    const other = { ...input({}, { [key]: doka }), catalogId: 'canonical-work:base:concrete_foundation_interior_stairs_concrete_form_high_load',
      parent: null, submittedParameters: null, effectiveParameters: null };
    expect(() => guard(other)).not.toThrow();
  });

  it('same-method children may change ordinary facts; other validation remains outside this guard', () => {
    expect(() => guard(input({ [key]: doka, stairs_concrete_volume_m3: '10' },
      { stairs_concrete_volume_m3: '12' }, { [key]: doka, stairs_concrete_volume_m3: '12' }))).not.toThrow();
  });

  it('blocks before a compiler callback and leaves all saved manual rights untouched', () => {
    const saved = Object.freeze({ parameters: Object.freeze({ [key]: legacy }),
      rowOverrides: Object.freeze({ old_formwork: Object.freeze({ quantity: '7', unitPrice: '77', titleRu: 'Моя строка',
        includedInEstimate: false, includedInProcurement: false, provenance: Object.freeze({ kind: 'manual' }) }) }),
      customRows: Object.freeze([{ clientRowId: 'saved-extra', titleRu: 'Моя допработа' }]),
      preliminaryNeeds: Object.freeze([{ row_id: 'old-pending', missing_parameter_ids: ['scope'] }]) });
    const before = JSON.stringify(saved), compile = jest.fn();
    const run = () => { guard(input(saved.parameters, { [key]: doka })); compile(); };
    expect(run).toThrow('Способ расчёта количеств лестницы нельзя менять');
    expect(compile).not.toHaveBeenCalled();
    expect(JSON.stringify(saved)).toBe(before);
  });

  it('accepts same-method children without editing parameters, exclusions, titles or prices', () => {
    const p = Object.freeze({ [key]: doka, stairs_concrete_volume_m3: '10' });
    const requested = Object.freeze({ stairs_concrete_volume_m3: '12' });
    const effective = Object.freeze({ ...p, ...requested });
    const value = Object.freeze(input(p, requested, effective)), before = JSON.stringify(value);
    expect(() => guard(value)).not.toThrow();
    expect(JSON.stringify(value)).toBe(before);
    expect(Object.hasOwn(requested, key)).toBe(false);
  });
});
