import { appendMaster31DoorControlProvisionR1 as append, master31DoorControlParentR1 as parent,
  master31DoorControlProvisionPackR1 as pack, master31DoorControlCompletenessR1 as completeness,
  assertMaster31DoorControlProvisionR1 as validateInventory } from './master31DoorControlProvisionR1';
import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput } from '../backendPlatform/canonicalEstimateCompileCore';
import { canonicalEstimateStableJson } from '../backendPlatform/canonicalEstimateDeterminism';
import { canonicalEstimateSha256HexText } from '../backendPlatform/canonicalEstimateSha256';
import { validateIndependentCompletenessMapReferences } from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';

const factoryInput = (n: number) => ({ [pack.factorySelectorId]: pack.factoryChoice, [pack.factoryCountId]: n });
const selectedInput = (n: number, f: number) => ({ ...factoryInput(n), [pack.selectorId]: pack.selectedMethod, [pack.frontCountId]: f });
function compile(input: Record<string, unknown>, before = false, rowOverrides: CanonicalEstimateCompileCoreInput['rowOverrides'] = {}) {
  const d = before ? parent() : append();
  return compileCanonicalEstimateCore({ operation: 'recalculate', catalogId: pack.catalogId, compilerVersion: pack.contract,
    primaryMeasureParameterId: input[pack.factorySelectorId] === pack.factoryChoice ? pack.factoryCountId : 'q',
    parameterDefinitions: [...d.parameters], formulaDefinitions: [...d.formulas], resourceDefinitions: [...d.resources],
    submittedParameters: input, confirmedParameters: {}, rowOverrides, priceItems: [], currencyCode: 'KGS', maximumResourceRows: d.resources.length,
    hashJson: value => canonicalEstimateSha256HexText(canonicalEstimateStableJson(value)) });
}

it('retains the exact v4 computation, every factory/payment owner and every original formula', () => {
  const a = parent(), before = JSON.stringify(a), b = append(a);
  expect([a.parameters.length, a.formulas.length, a.resources.length]).toEqual([25, 93, 93]);
  expect(b.parameters.slice(0, a.parameters.length)).toEqual(a.parameters);
  expect(b.formulas.slice(0, a.formulas.length)).toEqual(a.formulas);
  for (const old of a.resources) {
    const actual = b.resources.find(r => r.row_id === old.row_id)!;
    if (!pack.closedOldNeedRowIds.includes(old.row_id)) expect(actual).toEqual(old);
    else {
      expect(actual.formula_id).toBe(old.formula_id);
      expect(actual.cost_owner_id).toBe(old.cost_owner_id);
      expect(actual.resource_graph).toEqual(old.resource_graph);
      const { completionNeedTransitionV1, ...source } = actual.source_metadata!;
      expect(source).toEqual(old.source_metadata);
      expect(completionNeedTransitionV1).toEqual({ featureContract: pack.contract,
        selectedMethodParameterId: pack.selectorId, resolvedOnlyForMethod: pack.selectedMethod,
        resolvedThroughPaidOwnerRowId: pack.ownerRowId, automaticLegacyPriceOrQuantityTransferAllowed: false });
    }
  }
  expect(JSON.stringify(a)).toBe(before);
  expect(() => append({ ...a, resources: a.resources.slice(1) })).toThrow('EXACT_V4_PARENT_REQUIRED');
});

it('keeps all22 old factory needs visible when the new optional selector is absent', async () => {
  const result = await compile({ ...factoryInput(5), q: 999, [pack.frontCountId]: 2 });
  expect(result.rows.some(r => r.row_id.startsWith(pack.prefix + ':'))).toBe(false);
  for (const need of pack.oldNeeds) {
    expect(result.preliminaryNeeds.find(n => n.row_id === need.rowId)).toMatchObject({ quantity: null });
  }
  const oldFactoryOwners = parent().resources.filter(r => r.resource_graph.costTreatment === 'OWN_COST'
    && r.row_id.startsWith('factory-door:') && !r.row_id.includes(':onsite:'));
  expect(oldFactoryOwners).toHaveLength(1);
  expect(result.rows.find(r => r.row_id === oldFactoryOwners[0].row_id)?.quantity).toBe('5');
});

it.each([undefined, pack.unresolvedMethod])('retains old needs for unresolved method %s without inventing a front count', async method => {
  const result = await compile({ ...factoryInput(3), ...(method ? { [pack.selectorId]: method } : {}) });
  expect(result.rows.some(r => r.row_id === pack.ownerRowId)).toBe(false);
  for (const need of pack.oldNeeds) expect(result.preliminaryNeeds.find(n => n.row_id === need.rowId)?.quantity).toBeNull();
});

it('retains all old needs and unresolved new station rows when the explicit method has no F', async () => {
  const result = await compile({ ...factoryInput(4), [pack.selectorId]: pack.selectedMethod, q: 100 });
  expect(result.rows.some(r => r.row_id === pack.ownerRowId)).toBe(false);
  expect(result.preliminaryNeeds.find(n => n.row_id === pack.ownerRowId)?.quantity).toBeNull();
  for (const need of pack.oldNeeds) expect(result.preliminaryNeeds.find(n => n.row_id === need.rowId)?.quantity).toBeNull();
});

it('matches an independent literal F2/N5 whole-inventory oracle and resolves exactly3 old needs', async () => {
  const result = await compile({ ...selectedInput(5, 2), q: 999 });
  // Independent station inventory. Do not derive expectations from pack.parts or emitted rows.
  const expected: Record<string, [string, string]> = {
    provision: ['2', 'set'], level: ['2', 'item'], tape: ['2', 'item'], pencil: ['2', 'item'],
    caliper: ['2', 'item'], 'fresh-cell': ['2', 'item'], 'feeler-set': ['2', 'set'],
    'feeler-blades': ['38', 'item'], plumb: ['2', 'item'], 'plumb-line': ['10', 'm'],
    paper: ['2', 'item'], case: ['2', 'item'], 'level-case': ['2', 'item'], cloth: ['2', 'item'],
  };
  expect(result.rows.filter(r => r.row_id.startsWith(pack.prefix + ':'))).toHaveLength(14);
  for (const [suffix, [quantity, unit]] of Object.entries(expected)) {
    expect(result.rows.find(r => r.row_id === pack.prefix + ':' + suffix)).toMatchObject({ quantity, unit_id: unit, included_in_procurement: false });
  }
  const remaining = result.preliminaryNeeds.filter(n => pack.oldNeeds.some(old => old.rowId === n.row_id));
  expect(remaining.map(n => n.row_id).sort()).toEqual(pack.oldNeeds.filter(n => !['level', 'measuring-tape', 'marking-pencil'].includes(n.key)).map(n => n.rowId).sort());
  expect(remaining).toHaveLength(19);
  expect(remaining.every(n => n.quantity === null)).toBe(true);
  for (const need of pack.additionalNeeds) expect(result.preliminaryNeeds.find(n => n.row_id === need.rowId)?.quantity).toBeNull();
});

it('reuses the same physical station for100 serial doors and keeps renewal unknown', async () => {
  const one = await compile(selectedInput(1, 1)), many = await compile(selectedInput(100, 1));
  for (const key of ['provision', 'level', 'pencil', 'paper', 'fresh-cell']) {
    expect(one.rows.find(r => r.row_id === pack.prefix + ':' + key)?.quantity).toBe('1');
    expect(many.rows.find(r => r.row_id === pack.prefix + ':' + key)?.quantity).toBe('1');
  }
  for (const key of ['paper-renewal', 'pencil-renewal', 'battery-renewal']) {
    expect(many.preliminaryNeeds.find(n => n.row_id === pack.prefix + ':need:' + key)?.quantity).toBeNull();
  }
});

it.each([0, -1, 1.5, 6, 1000001])('rejects invalid or excessive F=%s without reducing old needs', async f => {
  await expect(compile(selectedInput(5, f))).rejects.toBeDefined();
});
it('rejects a foreign method and source norm injection instead of accepting guessed quantities', async () => {
  await expect(compile({ ...selectedInput(5, 2), [pack.selectorId]: 'Чужой метод' })).rejects.toBeDefined();
  await expect(compile({ ...selectedInput(5, 2), factory_door_onsite_level_quantity: 9 })).rejects.toBeDefined();
});

it('retains exact legacy q outputs, saved names/prices and totals with no new tool norm', async () => {
  const old = parent().resources[0].row_id;
  const overrides = { [old]: { quantity: '7', unitPrice: '120.5', titleRu: 'Моё сохранённое наименование',
    provenance: { kind: 'manual' as const, reason: 'Retained prior revision' } } };
  const input = { q: 100, [pack.factorySelectorId]: 'Прежний общий расчёт' };
  const a = await compile(input, true, overrides), b = await compile(input, false, overrides);
  expect(b.rows).toEqual(a.rows); expect(b.preliminaryNeeds).toEqual(a.preliminaryNeeds); expect(b.totals).toEqual(a.totals);
  const oldIds = new Set(parent().formulas.map(f => f.formula_id));
  for (const formula of append().formulas.filter(f => !oldIds.has(f.formula_id))) expect(formula.input_parameter_ids).not.toContain('q');
});

it('uses one separate provision payment owner and never charges or purchases its mirrored components', async () => {
  const proof = { kind: 'manual' as const, reason: 'Explicit initial station provision quote' };
  const result = await compile(selectedInput(5, 2), false, {
    [pack.ownerRowId]: { unitPrice: '100', provenance: proof },
    [pack.prefix + ':level']: { unitPrice: '999', provenance: proof },
  });
  expect(Number(result.totals.amount)).toBe(200);
  for (const part of pack.parts) {
    const row = result.rows.find(r => r.row_id === part.rowId)!;
    expect(row.included_in_estimate).toBe(false); expect(row.included_in_procurement).toBe(false);
    expect((row.calculation_trace as { resourceGraph: { includedInResourceOwnerRowId: string } }).resourceGraph.includedInResourceOwnerRowId).toBe(pack.ownerRowId);
  }
});

it('rejects incomplete toolkit, wrong quantity/unit or a second payment owner and retains potential scope', () => {
  const d = append(), map = completeness();
  for (const suffix of ['level', 'caliper', 'fresh-cell', 'feeler-set', 'plumb', 'plumb-line', 'paper']) {
    expect(() => validateInventory({ ...d, resources: d.resources.filter(r => r.row_id !== pack.prefix + ':' + suffix) })).toThrow('INVENTORY_OR_OWNER_INVALID');
  }
  const id = pack.prefix + ':level';
  expect(() => validateInventory({ ...d, resources: d.resources.map(r => r.row_id === id ? { ...r, unit_id: 'm' } : r) })).toThrow('INVENTORY_OR_OWNER_INVALID');
  expect(() => validateInventory({ ...d, parameters: d.parameters.map(p => p.parameter_id === pack.frontCountId ? { ...p, unit_id: 'm' } : p) })).toThrow('EXPLICIT_FRONT_FACT_REQUIRED');
  expect(() => validateInventory({ ...d, resources: d.resources.map(r => r.row_id === id ? { ...r, resource_graph: { ...r.resource_graph, costTreatment: 'OWN_COST' } } : r) })).toThrow('INVENTORY_OR_OWNER_INVALID');
  expect(() => validateInventory({ ...d, formulas: d.formulas.map(f => f.formula_id === pack.prefix + ':formula:level' ? { ...f, expression_source: pack.factoryCountId } : f) })).toThrow('INVENTORY_OR_OWNER_INVALID');
  expect(map.generatedFromCurrentRows).toBe(false);
  expect(map.unresolvedOnsiteNeedRowIds).toHaveLength(34);
  expect(map.unresolvedOnsiteNeedRowIds).toEqual(expect.arrayContaining(pack.oldNeeds.map(n => n.rowId)));
  expect(map.conditionalCompleteProvision.resolvedNeedRowIds).toEqual(pack.closedOldNeedRowIds);
  expect(map.fullTechnicalAcceptance).toBe(false); expect(map.completeInstallation).toBe(false);
  expect(validateIndependentCompletenessMapReferences({ completenessMap: map, formulaDefinitions: d.formulas, resourceDefinitions: d.resources })).toEqual([]);
});

it('rejects coordinated source-pack/row omissions and unit changes against the independent fixed roster', () => {
  const d = append();
  for (const key of ['fresh-cell', 'plumb-line']) {
    const index = pack.parts.findIndex(p => p.key === key), removed = pack.parts.splice(index, 1)[0];
    try {
      expect(() => validateInventory({ ...d, resources: d.resources.filter(r => r.row_id !== removed.rowId) }))
        .toThrow('FIXED_WHOLE_ROSTER_REQUIRED');
    } finally { pack.parts.splice(index, 0, removed); }
  }
  const part = pack.parts.find(p => p.key === 'level')!, originalUnit = part.unitId;
  part.unitId = 'm';
  try {
    expect(() => validateInventory({ ...d, resources: d.resources.map(r => r.row_id === part.rowId ? { ...r, unit_id: 'm' } : r) }))
      .toThrow('INVENTORY_OR_OWNER_INVALID');
  } finally { part.unitId = originalUnit; }
});

it('separates organisational inventory quantities from manufacturer capabilities and forbids legacy price fallback', () => {
  const rows = append().resources;
  for (const part of pack.parts) {
    const metadata = rows.find(r => r.row_id === part.rowId)!.source_metadata!;
    expect(metadata.automaticGenericPriceInheritanceAllowed).toBe(false);
    expect(metadata.physicalProvisionMethodEvidence).toMatchObject({ kind: 'ENGINEERING_ORGANIZATION',
      methodVersion: 'door-control-serial-front/r1', manufacturerQuantityNormClaimed: false });
    if (part.sourceKey === 'method') expect(metadata.normativeTrace).toEqual([]);
  }
  const owner = rows.find(r => r.row_id === pack.ownerRowId)!;
  expect(owner.source_metadata?.automaticGenericPriceInheritanceAllowed).toBe(false);
  expect(owner.source_metadata?.normativeTrace).toEqual([]);
});

it('keeps source capabilities and normal/reverse accuracy separate from actual acceptance and tool wear', () => {
  expect(Number(pack.capabilities.levelNormalErrorMmPerM)).toBe(0.5);
  expect(Number(pack.capabilities.levelReverseErrorMmPerM)).toBe(0.75);
  expect(Number(pack.capabilities.acceptanceLimitsFromDsv.verticalMmPerM)).toBe(1.5);
  expect(Number(pack.capabilities.caliperResolutionMm)).toBe(0.01);
  // Two inside/difference readings conservatively use shift error twice:0.08mm<1mm variation limit.
  expect(2 * Number(pack.capabilities.caliperSmpeMm)).toBe(0.08);
  expect(2 * Number(pack.capabilities.caliperSmpeMm)).toBeLessThan(Number(pack.capabilities.acceptanceLimitsFromDsv.gapVariationMm));
  expect(pack.capabilities.paperCheckForceNorm).toBeNull();
  expect(pack.actualMeasurementsOrAcceptanceProved).toBe(false); expect(pack.newInstallationNormClosures).toBe(0);
  for (const row of append().resources.filter(r => r.row_id.startsWith(pack.prefix + ':'))) {
    expect(row.title_ru).not.toMatch(/STABILA|Mitutoyo|FACOM|Torex|SR44|500-196|80 ASM/iu);
    expect(row.source_metadata?.full_technical_acceptance).toBe(false);
  }
});
