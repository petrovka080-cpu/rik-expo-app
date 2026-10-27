import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import fixture from '../../../../data/estimate-benchmarks/fixtures/facade-ceresit-ct190-kz-material-subworks-r1.json';
import {facadeCeresitCt190PackR1 as pack, facadeCeresitCt190MaterialDefinitionR1 as materialDefinition,
 facadeCeresitCt190SuccessorDefinitionR1 as successor, facadeCeresitCt190ChoiceParameterR1 as choice,facadeCeresitCt190GeometryR5 as geometryIds} from './facadeCeresitCt190MaterialSubworksR1';
import {FACADE_MINERAL_WOOL_INSTALLATION_ACCEPTANCE_INPUT as legacyFacts,
 FACADE_MINERAL_WOOL_INSTALLATION_PARAMETERS as legacyParameters, FACADE_MINERAL_WOOL_INSTALLATION_FORMULAS as legacyFormulas,
 FACADE_MINERAL_WOOL_INSTALLATION_RESOURCES as legacyResources} from './facadeMineralWoolInstallationR1';
import {compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import type {AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {canonicalEstimateOperationReferences} from '../backendPlatform/canonicalEstimateOperationComposition';
import {canonicalPublicResourceDisplayPresentationV1 as publicDisplay} from '../backendPlatform/canonicalPublicResourcePresentationV1';

const d = materialDefinition(), p = pack.prefix, id = (key: string) => p + ':' + key;
const provenance = {kind: 'manual', reason: 'TEST_ONLY explicit saved edit, not an actual offer'};
const facts = () => ({...fixture.facts}) as Record<string, unknown>;
const compile = (input: Record<string, unknown>, overrides: CanonicalEstimateCompileCoreInput['rowOverrides'] = {},
 priceItems: CanonicalEstimateCompileCoreInput['priceItems'] = [], definition: Pick<AutomaticOwnerDefinition, 'parameters' | 'formulas' | 'resources'> = d) => {
 const managed=new Set(definition.parameters.filter(parameter=>{
  const provenance=parameter.truth_metadata?.provenance;
  return parameter.truth_metadata?.visibility_role==='INTERNAL_ONLY'&&parameter.truth_metadata?.value_source_role!=='UNRESOLVED_APPLICATION_NORM'
   &&provenance!==null&&typeof provenance==='object'&&!Array.isArray(provenance)
   &&(provenance as Record<string,unknown>).consumer_input_role_v1==='APPLICATION_TECHNICAL';
 }).map(parameter=>parameter.parameter_id));
 // TEST_ONLY exact fixtures use the trusted channel. Unknown/protected norm
 // keys remain raw; raw authority rejection is exercised separately below.
 return compileCanonicalEstimateCore({
  operation: 'recalculate', catalogId: pack.catalogId, compilerVersion: pack.contract, primaryMeasureParameterId: 'area_m2',
  parameterDefinitions: [...definition.parameters], formulaDefinitions: [...definition.formulas], resourceDefinitions: [...definition.resources],
  submittedParameters:Object.fromEntries(Object.entries(input).filter(([id])=>!managed.has(id))),confirmedParameters:Object.fromEntries(Object.entries(input).filter(([id])=>managed.has(id))), rowOverrides: overrides, priceItems, currencyCode: 'KGS', maximumResourceRows: definition.resources.length,
  hashJson: async value => estimateDeterministicHash(value)});
};
const row = (r: Awaited<ReturnType<typeof compile>>, key: string) => r.rows.find(r => r.row_id === id(key));

it('pins fetched primary KZ source bytes, approximate rates and original range without mixing BY/RU editions', () => {
 expect(createHash('sha256').update(readFileSync(resolve(process.cwd(), pack.source.artifactRelativePath))).digest('hex')).toBe(pack.source.sha256);
 expect(pack.source.bytes).toBe(654746); expect(pack.source.livePrimaryRetrieved).toBe(true);
 expect(pack.rates).toMatchObject({attachmentKgPerM2: '5', baseLayerKgPerM2: '5.8', waterLPerPackageMin: '5.75', waterLPerPackageMax: '6.25', packageKg: '25', approximate: true});
 expect([pack.isNewWorkType, pack.publicationAllowed, pack.fullTechnicalAcceptance]).toEqual([false, false, false]);
 expect(pack.conditions.potlifeConflictRequiresManufacturerClarification).toBe(true);
});

it.each(fixture.expected)('independent takeoff for attachment$attach and base$base m2', async e => {
 const r = await compile({...facts(), area_m2: e.attach, ct190_base_layer_area_m2: e.base});
 for (const [key, quantity] of [['dry-mix-consumed', e.total], ['dry-mix-order', e.order], ['dry-mix-bags', e.bags],
  ['dry-mix-remaining', e.remaining], ['water-min', e.waterMin], ['water-max', e.waterMax]]) expect(row(r, key)?.quantity).toBe(quantity);
 if (e.attach !== '0') expect(row(r, 'attachment-consumed')?.quantity).toBe(e.attachment);
 else expect(row(r, 'attachment-consumed')).toBeUndefined();
 expect(row(r, 'base-layer-consumed')?.quantity).toBe(e.baseLayer);
 expect(r.rows.filter(r => r.included_in_procurement).map(r => r.row_id)).toEqual([id('dry-mix-order')]);
 expect(r.rows.filter(r => r.included_in_estimate).every(r => r.unit_price == null)).toBe(true);
});

it('uses one common 25kg bag for two1m2 subworks, avoiding separate rounded purchases', async () => {
 const r = await compile({...facts(), area_m2: '1', ct190_base_layer_area_m2: '1'});
 expect(row(r, 'dry-mix-bags')?.quantity).toBe('1'); expect(row(r, 'dry-mix-order')?.quantity).toBe('25');
 expect(d.resources.filter(r => r.resource_graph.costTreatment === 'OWN_COST').map(r => r.row_id)).toEqual([id('dry-mix-order'), id('water-used')]);
});

it.each(['ct190_usable_stock_kg', 'ct190_required_reserve_kg', 'ct190_supply_reference'])('missing supply fact%s keeps demand but cannot create priced order', async key => {
 const input = facts(); delete input[key];
 const r = await compile(input, {[id('dry-mix-order')]: {unitPrice: '77', provenance}});
 expect(row(r, 'dry-mix-consumed')?.quantity).toBe('1080'); expect(row(r, 'dry-mix-order')).toBeUndefined();
 expect(r.preliminaryNeeds.some(n => n.row_id === id('dry-mix-order') && n.missing_parameter_ids.includes(key))).toBe(true);
 expect(r.totals.amount).toBe('0');
});

it('does not guess a second geometry from first area', async () => {
 const input = facts(); delete input.ct190_base_layer_area_m2;
 const r = await compile(input); expect(row(r, 'attachment-consumed')?.quantity).toBe('500');
 expect(row(r, 'base-layer-consumed')).toBeUndefined(); expect(row(r, 'dry-mix-order')).toBeUndefined();
});

it('compatible stock/reserve produce one order and accurate leftover, without extra waste percent', async () => {
 const r = await compile({...facts(), ct190_usable_stock_kg: '31', ct190_stock_reference: 'TEST_ONLY checked KZ dry stock', ct190_required_reserve_kg: '10'});
 expect(row(r, 'dry-mix-consumed')?.quantity).toBe('1080'); expect(row(r, 'dry-mix-order')?.quantity).toBe('1075');
 expect(row(r, 'dry-mix-bags')?.quantity).toBe('43'); expect(row(r, 'dry-mix-remaining')?.quantity).toBe('26'); expect(row(r, 'dry-mix-free')?.quantity).toBe('16');
});

it('positive stock requires source-compatible checked stock, no fake default', async () => {
 const r = await compile({...facts(), ct190_usable_stock_kg: '1'});
 expect(row(r, 'dry-mix-consumed')?.quantity).toBe('1080'); expect(row(r, 'dry-mix-order')).toBeUndefined();
 expect(d.runtimeInput).toEqual({}); expect(d.parameters.every(q => q.default_value === null)).toBe(true);
});

it.each(['5.75', '6', '6.25'])('mix water%sL is based on consumed1080kg rather than1100kg order', async amount => {
 const r = await compile({...facts(), ct190_actual_water_l_per_25kg: amount});
 expect(row(r, 'water-used')?.quantity).toBe({'5.75': '248.4', '6': '259.2', '6.25': '270'}[amount]);
 expect(row(r, 'water-used')?.included_in_procurement).toBe(false);
});

it('keeps both water boundaries visible without arbitrary midpoint or zero', async () => {
 const r = await compile(facts()); expect(row(r, 'water-used')).toBeUndefined();
 expect(row(r, 'water-min')?.quantity).toBe('248.4'); expect(row(r, 'water-max')?.quantity).toBe('270');
 expect(r.preliminaryNeeds.some(n => n.row_id === id('water-used') && n.missing_parameter_ids.includes('ct190_actual_water_l_per_25kg'))).toBe(true);
});

it.each([{ct190_actual_water_l_per_25kg: '5.74'}, {ct190_actual_water_l_per_25kg: '6.26'}, {ct190_usable_stock_kg: '-1'},
 {ct190_required_reserve_kg: '-1'}, {area_m2: '-1'}, {ct190_base_layer_area_m2: '-1'}, {ct190_product_scope: 'CT190 BY'},
 {ct190_product_scope: 'CT190 зима'}, {ct190_product_scope: 'CT85 EPS'}, {ct190_labor_hours: '1'}])('rejects incompatible/invented fact%j', async bad => {
 await expect(compile({...facts(), ...bad})).rejects.toMatchObject({code: 'PARAMETER_VALIDATION_FAILED'});
});

it.each(['attachment-consumed', 'base-layer-consumed', 'dry-mix-consumed', 'water-min', 'water-max', 'water-used', 'dry-mix-remaining'])
 ('keeps explicit manual quantity%s separate from source norm and rejects an unprovenanced replacement', async key => {
  const input={...facts(),ct190_actual_water_l_per_25kg:'6'},automatic=await compile(input);
  await expect(compile(input,{[id(key)]:{quantity:'77'}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
  const result=await compile(input,{[id(key)]:{quantity:'77',provenance}}),original=row(automatic,key),changed=row(result,key);
  expect(original).toBeDefined();expect(changed).toBeDefined();if(!original||!changed)throw Error('ACTUAL_AUTOMATIC_AND_MANUAL_RESOURCE_REQUIRED');
  expect(changed.quantity).toBe('77');expect(changed.calculation_trace).toMatchObject({manualQuantityOverride:true,calculatedQuantityBeforeOverride:original.quantity,manualAmendment:provenance,derivedQuantityEditPolicy:{mode:'PARAMETERS_ONLY'}});
  expect(result.parameters).toEqual(automatic.parameters);expect(result.preliminaryNeeds.map(need=>need.row_id)).toEqual(automatic.preliminaryNeeds.map(need=>need.row_id));
  expect([changed.included_in_estimate,changed.included_in_procurement]).toEqual([original.included_in_estimate,original.included_in_procurement]);
  expect(result.rows.filter(resource=>resource.included_in_procurement).map(resource=>resource.row_id)).toEqual([id('dry-mix-order')]);
  expect(row(result,'dry-mix-order')?.quantity).toBe(row(automatic,'dry-mix-order')?.quantity);
 });

it('preserves valid manual order/price/title/exclusion and exposes underordering deficit', async () => {
 const edits = {[id('dry-mix-order')]: {quantity: '1075', unitPrice: '77', titleRu: 'TEST_ONLY моя партия', provenance}};
 const before = JSON.stringify(edits); const r = await compile(facts(), edits);
 expect(row(r, 'dry-mix-order')).toMatchObject({quantity: '1075', unit_price: '77', amount: '82775', title_ru: 'TEST_ONLY моя партия'});
 expect(row(r, 'dry-mix-consumed')?.quantity).toBe('1080'); expect(row(r, 'dry-mix-shortage')?.quantity).toBe('5'); expect(JSON.stringify(edits)).toBe(before);
 const excluded = await compile(facts(), {[id('dry-mix-order')]: {...edits[id('dry-mix-order')], includedInEstimate: false, includedInProcurement: false}});
 expect(excluded.totals.amount).toBe('0'); expect(row(excluded, 'dry-mix-order')?.included_in_procurement).toBe(false);
});

it.each(['attachment-consumed', 'base-layer-consumed', 'dry-mix-consumed', 'water-min', 'water-max', 'dry-mix-bags', 'process-attachment', 'process-base-layer'])
 ('reference row%s cannot be paid or procured by price77/manual inclusion', async key => {
  const r = await compile(facts(), {[id(key)]: {unitPrice: '77', includedInEstimate: true, includedInProcurement: true, provenance}});
  expect(row(r, key)).toMatchObject({included_in_estimate: false, included_in_procurement: false}); expect(r.totals.amount).toBe('0');
 });

it.each(pack.needs)('unknown need$id cannot be closed by0/77 or priced into procurement', async n => {
 const parameter = 'ct190_application_need_' + n.id.replaceAll('-', '_');
 for (const value of ['0', '77']) await expect(compile({...facts(), [parameter]: value})).rejects.toMatchObject({code: 'PARAMETER_VALIDATION_FAILED'});
 const r = await compile(facts(), {[id('open-' + n.id)]: {unitPrice: '77', provenance}});
 expect(row(r, 'open-' + n.id)).toBeUndefined(); expect(r.preliminaryNeeds.some(x => x.row_id === id('open-' + n.id) && x.quantity === null)).toBe(true);
});

it('every emitted resource links subject subworks and one shared mix owner references both uses', () => {
 for (const r of d.resources) expect(canonicalEstimateOperationReferences(r.resource_graph.operationCompositionV1)).not.toHaveLength(0);
 expect(canonicalEstimateOperationReferences(d.resources.find(r => r.row_id === id('dry-mix-order'))!.resource_graph.operationCompositionV1).map(o => o.operationId))
  .toEqual([id('operation:attachment'), id('operation:base-layer')]);
 for (const r of d.resources) {const {row_sha256, ...body} = r; expect(row_sha256).toBe(estimateDeterministicHash(body));}
});

it('new successor keeps every old unrelated resource and formula while gating exactly the old adhesive cost owner', () => {
 const s = successor(); const oldById = new Map(legacyResources.map(r => [r.row_id, r]));
 expect(s.formulas.slice(0, legacyFormulas.length)).toEqual(legacyFormulas);
 for (const r of s.resources.filter(r => oldById.has(r.row_id))) {
  const original = oldById.get(r.row_id)!;
  const {row_sha256: _a, ordinal: _o, ...actual} = r;
  const {row_sha256: _b, ordinal: _p, ...expected} = original;
  if (r.row_id === pack.legacyOwner.rowId) expect(actual).toEqual({...expected, inclusion_ast: {kind: 'equals', parameterId: choice, value: pack.legacyValueRu}});
  else expect(actual).toEqual(expected);
 }
 expect(s.parameters.map(q => q.parameter_id).length).toBe(new Set(s.parameters.map(q => q.parameter_id)).size);
 for (const r of s.resources) {const {row_sha256, ...body} = r; expect(row_sha256).toBe(estimateDeterministicHash(body));}
});

it('legacy successor branch preserves manual adhesive quantity77/price2/title/exclusion and all old totals', async () => {
 const edits = {[pack.legacyOwner.rowId]: {quantity: '77', unitPrice: '2', titleRu: 'TEST_ONLY прежний клей', provenance}};
 const old = await compile({...legacyFacts}, edits, [], {parameters: legacyParameters, formulas: legacyFormulas, resources: legacyResources});
 const next = await compile({...legacyFacts, [choice]: pack.legacyValueRu}, edits, [], successor());
 expect(next.rows.map(r => [r.row_id, r.quantity, r.unit_price, r.amount, r.title_ru, r.included_in_estimate, r.included_in_procurement]))
  .toEqual(old.rows.map(r => [r.row_id, r.quantity, r.unit_price, r.amount, r.title_ru, r.included_in_estimate, r.included_in_procurement]));
 expect(next.totals.amount).toBe('154'); expect(next.preliminaryNeeds).toEqual([]);
});

it('CT190 successor disables old adhesive payment/quantity demand, never inherits its old price', async () => {
 const input: Record<string, unknown> = {...legacyFacts, ...facts(), [choice]: pack.selectedValueRu};
 delete input.facade_adhesive_mass_kg; delete input.facade_adhesive_designation;
 const r = await compile(input, {}, [{price_key: pack.legacyOwner.rowId, unit_id: 'kg', currency_code: 'KGS', unit_price: '77', snapshot_id: 'TEST_ONLY_LEGACY_MIX_PRICE'}], successor());
 expect(r.rows.some(r => r.row_id === pack.legacyOwner.rowId)).toBe(false);
 expect(row(r, 'dry-mix-order')).toMatchObject({quantity: '1100', unit_price: null}); expect(r.totals.amount).toBe('0');
 expect(r.preliminaryNeeds.some(n => n.missing_parameter_ids.includes('facade_adhesive_mass_kg'))).toBe(false);
});

it('unknown/missing new choice never silently selects an incompatible source or rewrites legacy definitions', async () => {
 const before = JSON.stringify({legacyParameters, legacyFormulas, legacyResources}); successor();
 expect(JSON.stringify({legacyParameters, legacyFormulas, legacyResources})).toBe(before);
 await expect(compile({...legacyFacts, [choice]: 'CT190 BY'}, {}, [], successor())).rejects.toMatchObject({code: 'PARAMETER_VALIDATION_FAILED'});
 const r = await compile({...legacyFacts}, {}, [], successor()); expect(row(r, 'dry-mix-order')).toBeUndefined();
 expect(r.preliminaryNeeds.some(n => n.missing_parameter_ids.includes(choice))).toBe(true);
});

it('existing material subset exposes only two measured areas and retains technical readback outside the form',()=>{
 expect(d.parameters.filter(parameter=>parameter.truth_metadata.visibility_role==='USER_INPUT').map(parameter=>parameter.parameter_id)).toEqual([...geometryIds]);
 expect(successor().parameters.filter(parameter=>parameter.truth_metadata.visibility_role==='USER_INPUT').map(parameter=>parameter.parameter_id).sort()).toEqual(['area_m2','ct190_base_layer_area_m2',choice].sort());
 for(const parameter of d.parameters.filter(parameter=>!geometryIds.some(id=>id===parameter.parameter_id)&&parameter.truth_metadata.value_source_role!=='UNRESOLVED_APPLICATION_NORM'&&parameter.truth_metadata.value_source_role!=='COMPILER_DERIVED_RESOURCE_QUANTITY')){
  expect(parameter.truth_metadata.visibility_role).toBe('INTERNAL_ONLY');
  expect(parameter.truth_metadata.provenance).toMatchObject({consumer_input_role_v1:'APPLICATION_TECHNICAL',source_readback_only_v1:true,consumer_question_allowed:false});
 }
});
it('raw source fact echoes cannot enter direct core even with equal trusted readback',async()=>{
 const confirmedParameters=Object.fromEntries(Object.entries(facts()).filter(([id])=>!geometryIds.some(geometry=>geometry===id)));
 for(const key of ['ct190_product_scope','ct190_usable_stock_kg','ct190_required_reserve_kg','ct190_actual_water_l_per_25kg'])for(const value of [facts()[key],null,undefined])
  await expect(compileCanonicalEstimateCore({operation:'compile',catalogId:pack.catalogId,compilerVersion:pack.contract,primaryMeasureParameterId:'area_m2',parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:{area_m2:'100',ct190_base_layer_area_m2:'100',[key]:value},confirmedParameters,priceItems:[],currencyCode:'KGS',maximumResourceRows:d.resources.length,hashJson:async value=>estimateDeterministicHash(value)})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
});
it('functional public names retain exact source identity internally without changing shared owners',()=>{
 for(const resource of d.resources){
  const display=publicDisplay({rowId:resource.row_id,titleRu:resource.title_ru,descriptor:resource.resource_graph.publicResourcePresentationV1,graph:resource.resource_graph});
  expect(display?.nameRu??resource.title_ru).not.toMatch(/Ceresit|CT\s*190|\bKZ\b/i);expect(resource.section).not.toMatch(/Ceresit|CT\s*190/i);
 }
 expect(d.resources.find(resource=>resource.row_id===id('dry-mix-order'))?.resource_graph.publicResourcePresentationV1).toMatchObject({brandAndModelRu:'Ceresit CT 190, KZ, 25 кг'});
 const order=d.resources.find(resource=>resource.row_id===id('dry-mix-order'));expect(order).toBeDefined();if(!order)throw Error('ACTUAL_SHARED_ORDER_REQUIRED');
 expect(order.title_ru).toBe('CT 190 исполнения KZ, мешки 25 кг');
 expect(publicDisplay({rowId:order.row_id,titleRu:order.title_ru,descriptor:order.resource_graph.publicResourcePresentationV1,graph:order.resource_graph})?.nameRu).toBe('Клеевая и армирующая смесь для фасадного утеплителя, мешок 25 кг');
 expect(d.resources.filter(resource=>resource.resource_graph.costTreatment==='OWN_COST').map(resource=>resource.row_id)).toEqual([id('dry-mix-order'),id('water-used')]);
 expect(d.runtimeInput).toEqual({});expect(d.parameters.every(parameter=>parameter.default_value===null)).toBe(true);
});
