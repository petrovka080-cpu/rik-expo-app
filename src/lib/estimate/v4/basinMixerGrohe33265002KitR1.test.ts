import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import fixture from '../../../../data/estimate-benchmarks/fixtures/basin-mixer-grohe33265002-kit-r1.json';
import {basinMixerGrohe33265002PackR1 as pack, basinMixerGrohe33265002KitDefinitionR1 as definition} from './basinMixerGrohe33265002KitR1';
import {compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {canonicalEstimateOperationReferences} from '../backendPlatform/canonicalEstimateOperationComposition';

const d = definition(), p = pack.prefix, id = (key: string) => p + ':' + key;
const facts = () => ({...fixture.facts}) as Record<string, unknown>;
const provenance = {kind: 'manual', reason: 'TEST_ONLY explicit saved edit, not an actual site or offer'};
const compile = (input: Record<string, unknown>, rowOverrides: CanonicalEstimateCompileCoreInput['rowOverrides'] = {}, priceItems: CanonicalEstimateCompileCoreInput['priceItems'] = []) => compileCanonicalEstimateCore({
 operation: 'recalculate', catalogId: pack.catalogId, compilerVersion: pack.contract, primaryMeasureParameterId: pack.primaryParameterId,
 parameterDefinitions: [...d.parameters], formulaDefinitions: [...d.formulas], resourceDefinitions: [...d.resources],
 submittedParameters: input, confirmedParameters: {}, rowOverrides, priceItems, currencyCode: 'KGS', maximumResourceRows: d.resources.length,
 hashJson: async value => estimateDeterministicHash(value)});
const row = (r: Awaited<ReturnType<typeof compile>>, key: string) => r.rows.find(r => r.row_id === id(key));

it('pins actual fetched official product/manual bytes and exact model including its waste set', () => {
 for (const [path, sha] of [[pack.source.path, pack.source.sha256], [pack.source.htmlPath, pack.source.htmlSha256],
  [pack.source.secondaryTpi.path, pack.source.secondaryTpi.sha256]]) expect(createHash('sha256').update(readFileSync(resolve(process.cwd(), path))).digest('hex')).toBe(sha);
 expect(pack).toMatchObject({sku: '33265002', ean: '4005176861543', isNewWorkType: false, publicationAllowed: false, fullTechnicalAcceptance: false});
 expect(pack.source).toMatchObject({primaryBytesRetrieved: true, visuallyVerified: true, historicalPricesUsed: false, laborHoursNormSupplied: false, machineHoursNormSupplied: false});
 expect(pack.source.secondaryTpi.scopeRu).toContain('32 467');
});

it('records actual bounded current bodies separately from a novelty or delivery claim', () => {
 const raw = readFileSync(resolve(process.cwd(), pack.legacyPreimage.readEvidencePath));
 expect(createHash('sha256').update(raw).digest('hex')).toBe(pack.legacyPreimage.readEvidenceSha256);
 const result = JSON.parse(raw.toString('utf8'));
 expect(result).toMatchObject({status: 'PASS_CURRENT_PLUMBING_THREE_COMPLETE_BODIES_READ_ONLY', completeReadSet: true,
  databaseWrites: false, publication: false, bodyRowCount: 387, allTransactionsRolledBack: true, allConnectionsClosed: true});
 const bodies = JSON.parse(result.bodies.rows_pg_json) as {catalog_id: string; dataset: string; body: Record<string, unknown>}[];
 const target = bodies.filter(r => r.catalog_id === pack.catalogId);
 expect(target.filter(r => r.dataset === 'parameters')).toHaveLength(1);
 expect(target.filter(r => r.dataset === 'resources')).toHaveLength(63); expect(target.filter(r => r.dataset === 'formulas')).toHaveLength(63);
 expect(target.find(r => r.dataset === 'parameters')!.body).toMatchObject({parameter_id: 'q', unit_id: 'point'});
 expect(JSON.stringify(bodies).toLowerCase()).not.toMatch(/33265002|grohe/);
 expect(pack.legacyPreimage.parentChangedAfterRead).toBe(true);
});

it.each(fixture.independentExpected)('independent full-kit balance count$count stock$stock reserve$reserve', async e => {
 const r = await compile({...facts(), [pack.primaryParameterId]: e.count, grohe33265002_usable_stock_item: e.stock,
  grohe33265002_required_reserve_item: e.reserve, ...(e.stock !== '0' ? {grohe33265002_stock_reference: 'TEST_ONLY verified complete compatible stock'} : {})});
 expect(row(r, 'kit-consumed')?.quantity ?? '0').toBe(e.consumed);
 expect(row(r, 'kit-order')?.quantity ?? '0').toBe(e.order); expect(row(r, 'kit-remaining')?.quantity ?? '0').toBe(e.remaining);
 expect(r.rows.filter(r => r.included_in_procurement).every(r => r.row_id === id('kit-order'))).toBe(true);
 expect(r.rows.filter(r => r.included_in_estimate).every(r => r.unit_price === null)).toBe(true);
});

it('uses one complete product owner; three installed product references never mean six individually bought hoses', async () => {
 const r = await compile(facts(), {[id('kit-order')]: {unitPrice: '100', provenance}});
 expect(row(r, 'kit-order')).toMatchObject({quantity: '3', amount: '300'}); expect(r.totals.amount).toBe('300');
 for (const component of pack.components) {
  expect(row(r, component.id)).toMatchObject({quantity: '3', included_in_estimate: false, included_in_procurement: false});
  expect(d.resources.find(r => r.row_id === id(component.id))!.cost_owner_id).toBe(id('kit-order'));
 }
 expect(pack.components.find(c => c.id === 'flexible-hoses-reference')!.quantityMeaningRu).toContain('не число отдельных шлангов');
});

it.each(['grohe33265002_supply_reference', 'grohe33265002_usable_stock_item', 'grohe33265002_required_reserve_item'])
 ('missing supply fact%s retains physical demand but cannot make a priced order', async key => {
  const input = facts(); delete input[key]; const r = await compile(input, {[id('kit-order')]: {unitPrice: '77', provenance}});
  expect(row(r, 'kit-consumed')?.quantity).toBe('3'); expect(row(r, 'kit-order')).toBeUndefined(); expect(r.totals.amount).toBe('0');
  expect(r.preliminaryNeeds.some(x => x.row_id === id('kit-order') && x.missing_parameter_ids.includes(key))).toBe(true);
 });

it('positive stock requires exact complete-product evidence rather than a hidden default', async () => {
 const r = await compile({...facts(), grohe33265002_usable_stock_item: '2'});
 expect(row(r, 'kit-order')).toBeUndefined(); expect(row(r, 'kit-consumed')?.quantity).toBe('3');
 expect(d.runtimeInput).toEqual({}); expect(d.parameters.every(q => q.default_value === null)).toBe(true);
});

it.each(['grohe33265002_product_scope', 'grohe33265002_site_scope'])('missing exact applicability%s leaves no automatic procurement', async key => {
 const input = facts(); delete input[key]; const r = await compile(input);
 expect(row(r, 'kit-order')).toBeUndefined(); expect(r.preliminaryNeeds.some(x => x.missing_parameter_ids.includes(key))).toBe(true);
});

it.each([{grohe33265002_install_count: '1.5'}, {grohe33265002_install_count: '-1'}, {grohe33265002_usable_stock_item: '0.5'},
 {grohe33265002_required_reserve_item: '-1'}, {grohe33265002_product_scope: 'GROHE 32467002 without waste'},
 {grohe33265002_site_scope: 'Нужны переходники и новая раковина'}, {q: '3'}, {grohe33265002_labor_hours: '1'}])
 ('rejects incompatible, fractional or inherited point input%j', async bad => {
  await expect(compile({...facts(), ...bad})).rejects.toMatchObject({code: 'PARAMETER_VALIDATION_FAILED'});
 });

it('does not infer installation count from old q, or automatically migrate point revisions', async () => {
 const input = facts(); delete input[pack.primaryParameterId]; const r = await compile(input);
 expect(row(r, 'kit-order')).toBeUndefined(); expect(r.preliminaryNeeds.some(x => x.missing_parameter_ids.includes(pack.primaryParameterId))).toBe(true);
 expect(d.parameters.some(q => q.parameter_id === 'q')).toBe(false);
 expect(pack.unitMigration).toMatchObject({required: true, legacyParameterId: 'q', legacyUnitId: 'point', newUnitId: 'item',
  automaticLegacyPointConversionAllowed: false, savedRevisionRewriteAllowed: false});
 expect(pack.legacyPreimage).toMatchObject({parameterCount: 1, formulaCount: 63, resourceCount: 63, legacyGenericPriceOwnersInherited: false, recheckBeforeIntegrationRequired: true});
});

it('work price requires one explicit contract scope and reference; manufacturer hours stay absent', async () => {
 const missing = await compile(facts(), {[id('complete-installation-work')]: {unitPrice: '77', provenance}});
 expect(row(missing, 'complete-installation-work')).toBeUndefined(); expect(missing.totals.amount).toBe('0');
 const input = {...facts(), grohe33265002_work_scope: pack.laborValueRu, grohe33265002_work_reference: 'TEST_ONLY quote: one complete installation, handtools included'};
 const r = await compile(input, {[id('complete-installation-work')]: {unitPrice: '77', provenance}});
 expect(row(r, 'complete-installation-work')).toMatchObject({unit_id: 'item', quantity: '3', amount: '231', included_in_procurement: false});
 expect(r.totals.amount).toBe('231'); expect(d.resources.some(r => ['man_hour', 'machine_hour', 'hour', 'm3', 'trip'].includes(r.unit_id))).toBe(false);
 expect(d.resources.find(r => r.row_id === id('complete-installation-work'))!.source_metadata?.normativeTrace).toEqual([]);
 for (const op of pack.operations) expect(row(r, 'process-' + op.id)).toMatchObject({quantity: '3', included_in_estimate: false, included_in_procurement: false});
});

it.each(['kit-consumed', 'kit-remaining', 'flexible-hoses-reference', 'waste-set-reference', 'mounting-set-reference', 'complete-installation-work', 'process-local-check'])
 ('protects derived physical quantity%s from direct replacement', async key => {
  await expect(compile({...facts(), grohe33265002_work_scope: pack.laborValueRu, grohe33265002_work_reference: 'TEST_ONLY scope'},
   {[id(key)]: {quantity: '77', provenance}})).rejects.toMatchObject({code: 'ROW_AMENDMENT_INVALID'});
 });

it('preserves whole manual order, price, title and exclusion, and exposes underordering', async () => {
 const edits = {[id('kit-order')]: {quantity: '2', unitPrice: '77', titleRu: 'TEST_ONLY согласованные комплекты', provenance}};
 const before = JSON.stringify(edits); const r = await compile(facts(), edits);
 expect(row(r, 'kit-order')).toMatchObject({quantity: '2', unit_price: '77', amount: '154', title_ru: 'TEST_ONLY согласованные комплекты'});
 expect(row(r, 'kit-consumed')?.quantity).toBe('3'); expect(row(r, 'kit-shortage')?.quantity).toBe('1'); expect(JSON.stringify(edits)).toBe(before);
 const excluded = await compile(facts(), {[id('kit-order')]: {...edits[id('kit-order')], includedInEstimate: false, includedInProcurement: false}});
 expect(excluded.totals.amount).toBe('0'); expect(row(excluded, 'kit-order')?.included_in_procurement).toBe(false);
});

it('rejects a fractional saved complete-kit order rather than buying part of a mixer', async () => {
 await expect(compile(facts(), {[id('kit-order')]: {quantity: '2.5', unitPrice: '77', provenance}})).rejects.toMatchObject({code: 'ROW_AMENDMENT_INVALID'});
});

it.each([...pack.components.map(c => c.id), ...pack.operations.map(o => 'process-' + o.id)])
 ('included reference%s cannot be paid/procured by price77 or manual inclusion', async key => {
  const r = await compile(facts(), {[id(key)]: {unitPrice: '77', includedInEstimate: true, includedInProcurement: true, provenance}});
  expect(row(r, key)).toMatchObject({included_in_estimate: false, included_in_procurement: false}); expect(r.totals.amount).toBe('0');
 });

it.each(pack.needs)('unknown need$id cannot be hidden with0/77 or a fake price', async need => {
 const parameter = 'grohe33265002_application_need_' + need.id.replaceAll('-', '_');
 for (const value of ['0', '77']) await expect(compile({...facts(), [parameter]: value})).rejects.toMatchObject({code: 'PARAMETER_VALIDATION_FAILED'});
 const r = await compile(facts(), {[id('open-' + need.id)]: {unitPrice: '77', provenance}});
 expect(row(r, 'open-' + need.id)).toBeUndefined(); expect(r.preliminaryNeeds.some(x => x.row_id === id('open-' + need.id) && x.quantity === null)).toBe(true);
});

it('ordinary compile never inherits generic legacy price keys or a guessed contractor rate', async () => {
 const evidence = JSON.parse(readFileSync(resolve(process.cwd(), pack.legacyPreimage.readEvidencePath), 'utf8'));
 const bodies = JSON.parse(evidence.bodies.rows_pg_json) as {catalog_id: string; dataset: string; body: {cost_owner_id: string; unit_id: string}}[];
 const oldResources = bodies.filter(r => r.catalog_id === pack.catalogId && r.dataset === 'resources');
 expect(oldResources).toHaveLength(63);
 const oldPrices = oldResources.map(r => ({price_key: r.body.cost_owner_id, unit_id: r.body.unit_id, currency_code: 'KGS', unit_price: '77', snapshot_id: 'TEST_ONLY_ACTUAL_LEGACY_KEY'}));
 const r = await compile(facts(), {}, oldPrices);
 expect(row(r, 'kit-order')).toMatchObject({quantity: '3', unit_price: null}); expect(r.totals.amount).toBe('0');
 expect(d.resources.every(r => r.row_id.startsWith(p + ':'))).toBe(true); expect(d.resources).toHaveLength(20);
 expect(d.resources.filter(r => r.resource_graph.costTreatment === 'OWN_COST').map(r => r.row_id)).toEqual([id('kit-order'), id('complete-installation-work')]);
});

it('all resources link technological subworks, every row has a valid deterministic hash, and the work owner covers all five steps', () => {
 for (const r of d.resources) {
  expect(canonicalEstimateOperationReferences(r.resource_graph.operationCompositionV1)).not.toHaveLength(0);
  const {row_sha256, ...body} = r; expect(row_sha256).toBe(estimateDeterministicHash(body));
 }
 const whole = d.resources.find(r => r.row_id === id('complete-installation-work'))!;
 expect(canonicalEstimateOperationReferences(whole.resource_graph.operationCompositionV1).map(x => x.operationId).sort())
  .toEqual(pack.operations.map(o => id('operation:' + o.id)).sort());
});

it('public questions explain where to obtain facts, while unproved quantities stay internal and unpriced', () => {
 for (const q of d.parameters) {
  if (q.parameter_id.startsWith('grohe33265002_application_need_') || q.parameter_id.startsWith('effective_resource_quantity_')) {
   expect(q.truth_metadata.visibility_role).toBe('INTERNAL_ONLY'); continue;
  }
  expect(q.title_ru.endsWith('?')).toBe(true); const guide = q.truth_metadata.guide as Record<string, unknown>;
  expect(typeof guide.guide_short_ru).toBe('string'); expect(String(guide.guide_short_ru).length).toBeLessThan(330);
  expect(guide.full_condition_ru).toContain(pack.source.locatorRu);
 }
});
