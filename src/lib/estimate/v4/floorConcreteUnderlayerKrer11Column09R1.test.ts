import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {floorConcreteUnderlayerDefinitionR1 as definition, floorConcreteUnderlayerPackR1 as pack,
 floorConcreteUnderlayerPrimaryR1 as volume, floorConcreteUnderlayerPrefixR1 as prefix,
 floorConcreteUnderlayerScenarioFactsR1 as facts, floorConcreteUnderlayerCompletenessMapR1 as completeness,
 floorConcreteUnderlayerNeedParameterIdsR1 as needParameters} from './floorConcreteUnderlayerKrer11Column09R1';
import {compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {canonicalEstimateResourceOperationSections, canonicalEstimateOperationReferences} from '../backendPlatform/canonicalEstimateOperationComposition';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {validateIndependentCompletenessMapReferences} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
const d = definition(), id = (suffix: string) => prefix + ':' + suffix;
const provenance = {kind: 'manual', reason: 'TEST_ONLY explicit saved edit; not a supplier offer or normative source'};
const compile = (submittedParameters: Record<string, unknown>, rowOverrides: CanonicalEstimateCompileCoreInput['rowOverrides'] = {},
 priceItems: CanonicalEstimateCompileCoreInput['priceItems'] = []) => compileCanonicalEstimateCore({operation: 'recalculate',
 catalogId: pack.proposedIdentity.catalogId, compilerVersion: pack.contract, primaryMeasureParameterId: volume,
 parameterDefinitions: [...d.parameters], formulaDefinitions: [...d.formulas], resourceDefinitions: [...d.resources],
 submittedParameters, confirmedParameters: {}, rowOverrides, priceItems, currencyCode: 'KGS', maximumResourceRows: d.resources.length,
 hashJson: async value => estimateDeterministicHash(value)});
const row = (r: Awaited<ReturnType<typeof compile>>, suffix: string) => r.rows.find(r => r.row_id === id(suffix));

it('pins the actual official11 PDF and only exact00209, with no guessed catalogue/group or publication', () => {
 expect(createHash('sha256').update(readFileSync(resolve(process.cwd(), pack.source.path))).digest('hex'))
  .toBe('e56ef148df993609c325b7d505c54b1806e8185a4fd7a1550b15266144538223');
 expect(pack.normId).toBe('11-01-002-09'); expect(pack.source.pages).toEqual([5, 6, 7, 8, 9]);
 expect(pack.measurement.denominator).toBe('1'); expect(pack.source.historicalPricesUsed).toBe(false);
 expect([pack.catalogId, pack.workKey, pack.groupId]).toEqual([null, null, null]);
 expect([pack.identityAdmitted, pack.publicationAllowed, pack.fullTechnicalAcceptance]).toEqual([false, false, false]);
});
it('builds a real common-core definition with32 parameters,53 formulas/resources and no defaults', () => {
 expect([d.parameters.length, d.formulas.length, d.resources.length]).toEqual([32, 53, 53]);
 expect(d.ordinaryParameterIds).toEqual([volume]); expect(d.runtimeInput).toEqual({});
 expect(d.parameters.every(p => p.default_value === null)).toBe(true);
 expect(d.parameters.map(p => p.ordinal)).toEqual(Array.from({length: 32}, (_, i) => i));
 expect(d.resources.map(r => r.ordinal)).toEqual(Array.from({length: 53}, (_, i) => i));
 expect(new Set(d.parameters.map(p => p.parameter_id)).size).toBe(32);
 expect(new Set(d.formulas.map(p => p.formula_id)).size).toBe(53);
 expect(d.resources.filter(r => r.resource_graph.costTreatment === 'OWN_COST').map(r => r.row_id).sort())
  .toEqual(['whole-labor', 'concrete-b125-order', 'bitumen-latex-mastic-order', 'water-order', 'softwood-board-order'].map(id).sort());
});
it.each([
 ['1', '1.8', '0.48', '1.02', '0.002', '0.35', '0.001'],
 ['12.5', '22.5', '6', '12.75', '0.025', '4.375', '0.0125'],
 ['0.125', '0.225', '0.06', '0.1275', '0.00025', '0.04375', '0.000125'],
] as const)('uses all six independently transcribed exact rates for%s netm3', async (v, labour, vibrator, concrete, mastic, water, boards) => {
 const r = await compile(facts(v));
 for (const [suffix, quantity] of [['whole-labor', labour], ['surface-vibrator-consumed', vibrator], ['concrete-b125-consumed', concrete],
  ['bitumen-latex-mastic-consumed', mastic], ['water-consumed', water], ['softwood-board-consumed', boards]]) expect(row(r, suffix)?.quantity).toBe(quantity);
 expect(r.rows).toHaveLength(47); expect(r.preliminaryNeeds).toHaveLength(5);
 expect(r.rows.every(r => r.unit_price === null)).toBe(true); expect(r.totals.amount).toBe('0');
 expect(r.rows.filter(r => r.included_in_procurement)).toHaveLength(4);
});
it('zero volume creates no minimum job, resource, order or unresolved quantity', async () => {
 const r = await compile(facts('0')); expect(r.rows).toEqual([]); expect(r.preliminaryNeeds).toEqual([]); expect(r.totals.amount).toBe('0');
});
it('missing geometry stays unknown and never uses the example12.5 or a default100', async () => {
 const input = facts(); delete input[volume]; const r = await compile(input);
 expect(row(r, 'whole-labor')).toBeUndefined(); expect(row(r, 'concrete-b125-consumed')).toBeUndefined();
 expect(r.preliminaryNeeds.some(n => n.missing_parameter_ids.includes(volume))).toBe(true); expect(r.totals.amount).toBe('0');
});
it('missing exact method withholds this source rather than assuming a slab or concrete paver', async () => {
 const input = facts(); delete input[pack.scopeFact.id]; const r = await compile(input);
 expect(row(r, 'whole-labor')).toBeUndefined(); expect(row(r, 'surface-vibrator-consumed')).toBeUndefined();
 expect(r.preliminaryNeeds.some(n => n.missing_parameter_ids.includes(pack.scopeFact.id))).toBe(true);
});
it.each([
 {[volume]: '-1'}, {[volume]: 'UNKNOWN'}, {[volume]: 'NaN'},
 {[pack.scopeFact.id]: 'Несущая железобетонная плита'}, {[pack.scopeFact.id]: 'Бетоноукладочная машина по КРЕР27'},
 {[pack.scopeFact.id]: 'Цементная стяжка20мм'}, {[pack.machine.fulfillmentParameterId]: 'Минимальная смена8ч'},
 {floor_area_m2: '100'}, {layer_thickness_mm: '100'}, {reinforcement_kg: '77'},
])('rejects incompatible scope, proxy geometry or invented extra parameter%j', async change => {
 await expect(compile({...facts(), ...change})).rejects.toMatchObject({code: 'PARAMETER_VALIDATION_FAILED'});
});
it.each(pack.materials.flatMap(m => ['stock', 'reserve', 'quantum', 'specification'].map(suffix => ({m, suffix}))))
 ('known consumption survives missing supply fact$m.id/$suffix and price cannot create an order', async ({m, suffix}) => {
  const input = facts(); delete input[m.parameterPrefix + '_' + suffix];
  const r = await compile(input, {[id(m.id + '-order')]: {unitPrice: '77', provenance}});
  expect(row(r, m.id + '-consumed')).toBeDefined(); expect(row(r, m.id + '-order')).toBeUndefined();
  expect(r.preliminaryNeeds.some(n => n.row_id === id(m.id + '-order') && n.missing_parameter_ids.includes(m.parameterPrefix + '_' + suffix))).toBe(true);
  expect(r.totals.amount).toBe('0');
 });
it.each(pack.materials)('positive stock for$id needs its own compatibility reference', async m => {
 const input = {...facts(), [m.parameterPrefix + '_stock']: '0.001'};
 const r = await compile(input); expect(row(r, m.id + '-consumed')).toBeDefined(); expect(row(r, m.id + '-order')).toBeUndefined();
 expect(r.preliminaryNeeds.some(n => n.missing_parameter_ids.includes(m.parameterPrefix + '_stock_reference'))).toBe(true);
});
it.each(pack.materials.flatMap(m => [
 {m, suffix: 'stock', value: '-1'}, {m, suffix: 'reserve', value: '-1'}, {m, suffix: 'quantum', value: '0'},
]))('rejects negative stock/reserve and zero quantum for$m.id/$suffix', async ({m, suffix, value}) => {
 await expect(compile({...facts(), [m.parameterPrefix + '_' + suffix]: value})).rejects.toMatchObject({code: 'PARAMETER_VALIDATION_FAILED'});
});
it('keeps concrete consumption12.75, stock1, reserve.25, quantum.5, order12 and remaining.25 separately', async () => {
 const m = pack.materials[0]!, k = m.parameterPrefix;
 const r = await compile({...facts(), [k + '_stock']: '1', [k + '_stock_reference']: 'TEST_ONLY compatible B12.5 batch', [k + '_reserve']: '0.25', [k + '_quantum']: '0.5'});
 for (const [suffix, quantity] of [['consumed', '12.75'], ['available', '1'], ['required-reserve', '0.25'], ['supply-quantum', '0.5'],
  ['order', '12'], ['order-multiples', '24'], ['remaining', '0.25'], ['free', '0'], ['shortage', '0'], ['reserve-deficit', '0']]) expect(row(r, 'concrete-b125-' + suffix)?.quantity).toBe(quantity);
});
it('keeps mastic in tonnes: consumption.025, compatible stock.004, reserve.001 and quantum.01 order.03', async () => {
 const k = pack.materials[1]!.parameterPrefix;
 const r = await compile({...facts(), [k + '_stock']: '0.004', [k + '_stock_reference']: 'TEST_ONLY exact compatible mastic', [k + '_reserve']: '0.001', [k + '_quantum']: '0.01'});
 expect(row(r, 'bitumen-latex-mastic-consumed')).toMatchObject({quantity: '0.025', unit_id: 't'});
 expect(row(r, 'bitumen-latex-mastic-order')?.quantity).toBe('0.03'); expect(row(r, 'bitumen-latex-mastic-remaining')?.quantity).toBe('0.009');
 expect(row(r, 'bitumen-latex-mastic-free')?.quantity).toBe('0.008');
});
it('does not round normative lumber consumption.0125 to a piece or claim a physical package', async () => {
 const r = await compile(facts()); expect(row(r, 'softwood-board-consumed')?.quantity).toBe('0.0125');
 expect(row(r, 'softwood-board-order')?.quantity).toBe('0.013'); expect(row(r, 'softwood-board-remaining')?.quantity).toBe('0.0005');
 expect(d.resources.find(r => r.row_id === id('softwood-board-order'))?.source_metadata?.physicalPackageCompositionProven).toBe(false);
});
it('saved insufficient order keeps source demand and exposes the consumption deficit', async () => {
 const r = await compile(facts(), {[id('concrete-b125-order')]: {quantity: '12', provenance}});
 expect(row(r, 'concrete-b125-consumed')?.quantity).toBe('12.75'); expect(row(r, 'concrete-b125-order')?.quantity).toBe('12');
 expect(row(r, 'concrete-b125-shortage')?.quantity).toBe('0.75');
});
it.each(['whole-labor', 'surface-vibrator-consumed', 'surface-vibrator-own', 'concrete-b125-consumed', 'water-remaining', 'included-planning', 'included-joints'])
 ('protects derived physical/source/control quantity%s from direct row replacement', async suffix => {
  await expect(compile(facts(), {[id(suffix)]: {quantity: '77', provenance}})).rejects.toMatchObject({code: 'ROW_AMENDMENT_INVALID'});
 });
it('pays the whole22.5h once at CONTROL77, preserving manual title and exclusion', async () => {
 const override = {unitPrice: '77', titleRu: 'TEST_ONLY мой заголовок труда', provenance}, before = JSON.stringify(override);
 const r = await compile(facts(), {[id('whole-labor')]: override});
 expect(row(r, 'whole-labor')).toMatchObject({quantity: '22.5', unit_price: '77', amount: '1732.5', title_ru: override.titleRu}); expect(r.totals.amount).toBe('1732.5');
 expect(JSON.stringify(override)).toBe(before);
 const excluded = await compile(facts(), {[id('whole-labor')]: {...override, includedInEstimate: false, includedInProcurement: false}});
 expect(row(excluded, 'whole-labor')?.included_in_estimate).toBe(false); expect(excluded.totals.amount).toBe('0');
});
it('preserves a valid material order13, manual77 and title while physical consumption stays12.75', async () => {
 const overrides = {[id('concrete-b125-order')]: {quantity: '13', unitPrice: '77', titleRu: 'TEST_ONLY подтверждённая партия', provenance}};
 const r = await compile(facts(), overrides); expect(row(r, 'concrete-b125-order')).toMatchObject({quantity: '13', unit_price: '77', amount: '1001', title_ru: 'TEST_ONLY подтверждённая партия'});
 expect(row(r, 'concrete-b125-consumed')?.quantity).toBe('12.75'); expect(r.totals.amount).toBe('1001');
 expect((await compile(facts(), overrides)).rows).toEqual(r.rows);
});
it.each(['surface-vibrator-consumed', 'surface-vibrator-own', 'concrete-b125-consumed', 'water-remaining', ...pack.operations.map(o => 'included-' + o.id)])
 ('manual/snapshot price77 on reference%s cannot create a second payment or purchase', async suffix => {
  const target = d.resources.find(r => r.row_id === id(suffix))!;
  // Included work shares the labour price owner. A snapshot for that owner is
  // rightly the labour price, so only its own manual price is tested here.
  for (const route of suffix.startsWith('included-') ? ['manual'] as const : ['manual', 'snapshot'] as const) {
   const r = await compile(facts(), {[target.row_id]: {includedInEstimate: true, includedInProcurement: true, provenance, ...(route === 'manual' ? {unitPrice: '77'} : {})}},
    route === 'snapshot' ? [{price_key: target.cost_owner_id!, unit_id: target.unit_id, currency_code: 'KGS', unit_price: '77', snapshot_id: 'TEST_ONLY_REFERENCE_PRICE'}] : []);
   expect(row(r, suffix)).toMatchObject({included_in_estimate: false, included_in_procurement: false}); expect(r.totals.amount).toBe('0');
  }
 });
it.each([pack.machine.ownValueRu, pack.machine.hiredValueRu])('keeps exactly one vibrator fulfillment%s and gates its money/order before financial admission', async choice => {
 const r = await compile({...facts(), [pack.machine.fulfillmentParameterId]: choice});
 const selected = r.rows.filter(r => [id('surface-vibrator-own'), id('surface-vibrator-hired')].includes(r.row_id));
 expect(selected).toHaveLength(1); expect(selected[0]).toMatchObject({quantity: '6', included_in_estimate: false, included_in_procurement: false});
 expect(r.preliminaryNeeds.some(n => n.row_id === id('open-machine-price-scope'))).toBe(true);
 expect(d.resources.some(r => /operator|машинист/iu.test(r.title_ru + r.row_id))).toBe(false);
});
it.each([...pack.needs.map(n => n.id), 'machine-price-scope'])('unknown need%s cannot become a quantity, price or order from0/1/77', async key => {
 const parameter = 'floor_concrete_underlayer_application_need_' + key.replaceAll('-', '_');
 for (const value of ['0', '1', '77']) {
  await expect(compile({...facts(), [parameter]: value})).rejects.toMatchObject({code: 'PARAMETER_VALIDATION_FAILED'});
  await expect(compile(facts(), {[id('open-' + key)]: {quantity: value, unitPrice: '77', provenance}})).rejects.toMatchObject({code: 'ROW_AMENDMENT_INVALID'});
 }
 const r = await compile(facts(), {[id('open-' + key)]: {unitPrice: '77', provenance}});
 expect(row(r, 'open-' + key)).toBeUndefined(); expect(r.preliminaryNeeds.some(n => n.row_id === id('open-' + key) && n.quantity === null)).toBe(true);
});
it('declares source-owned unresolved quantities as internal and leaves supplier/geometry questions public with concise help', () => {
 for (const q of d.parameters) {
  if (q.parameter_id.startsWith('effective_resource_quantity_')) {expect(q.truth_metadata.visibility_role).toBe('INTERNAL_ONLY'); continue;}
  if (q.parameter_id.startsWith('floor_concrete_underlayer_application_need_')) {
   expect(q.truth_metadata).toMatchObject({visibility_role: 'INTERNAL_ONLY', value_source_role: 'UNRESOLVED_APPLICATION_NORM'}); continue;
  }
  expect(q.title_ru.endsWith('?')).toBe(true);
  const guide = q.truth_metadata.guide as Record<string, unknown>;
  expect(String(guide.guide_short_ru).length).toBeLessThan(320);
  expect(String(guide.guide_short_ru)).not.toMatch(/ROOT|admission|compiler|catalogId|NOT_RUN/iu);
  expect(guide.full_condition_ru).toContain(pack.source.locatorRu);
 }
 expect(needParameters).toHaveLength(4);
});
it('relates the one whole labour resource to all four real stages without dividing hours or creating other paid work', () => {
 const worker = d.resources.find(r => r.row_id === id('whole-labor'))!;
 expect(canonicalEstimateOperationReferences(worker.resource_graph.operationCompositionV1).map(o => o.operationTitleRu)).toEqual(pack.operations.map(o => o.titleRu));
 const sections = canonicalEstimateResourceOperationSections(d.resources.map(r => ({rowId: r.row_id, titleRu: r.title_ru, operation: r.resource_graph.operationCompositionV1})));
 for (const o of pack.operations) {
  const included = d.resources.find(r => r.row_id === id('included-' + o.id))!;
  expect(included.cost_owner_id).toBe(id('whole-labor')); expect(included.resource_graph).toMatchObject({parentCostOwnerId: id('whole-labor'), costTreatment: 'INCLUDED_IN_RESOURCE_ROWS'});
  const section = sections.find(s => s.operation?.operationId === id('operation:' + o.id))!;
  expect(section.resourceIds.includes(worker.row_id) || section.sharedResources.some(r => r.rowId === worker.row_id)).toBe(true);
 }
 const water = d.resources.find(r => r.row_id === id('water-consumed'))!;
 expect(canonicalEstimateOperationReferences(water.resource_graph.operationCompositionV1).map(o => o.operationId)).toEqual([id('operation:curing'), id('operation:placement')]);
 const mastic = d.resources.find(r => r.row_id === id('bitumen-latex-mastic-consumed'))!;
 expect(canonicalEstimateOperationReferences(mastic.resource_graph.operationCompositionV1)[0]?.operationId).toBe(id('operation:joints'));
});
it('independent53-entry composition covers every emitted row and all four included labour children', () => {
 const map = completeness(); expect(map.generatedFromCurrentRows).toBe(false); expect(map.entries).toHaveLength(53);
 expect(validateIndependentCompletenessMapReferences({completenessMap: map, formulaDefinitions: d.formulas, resourceDefinitions: d.resources})).toEqual([]);
 expect(map.entries.map(e => e.resolution.rowId).sort()).toEqual(d.resources.map(r => r.row_id).sort());
 expect(pack.operations.map(o => o.printedRu)).toEqual(['Планировка основания', 'Устройство подстилающего слоя с разравниванием и уплотнением', 'Устройство деформационных швов', 'Уход за подстилающими слоями']);
});
