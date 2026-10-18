// WORK-only / NOT_RUN. Actual complete public definition preimage from root read-only probe.
import {createHash} from 'node:crypto';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../../src/lib/estimate/estimateDeterministicHash';
import {canonicalEstimateStableJson} from '../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {euroflexRecycling50SourcePackR1} from '../../src/lib/estimate/v4/euroflexRecycling50MaterialsR1';
import fixture from '../../data/estimate-benchmarks/fixtures/euroflex-current-delivery-v2-parent-r3.json';
import {prepareEuroflexFactoryHalfLayoutCurrentR3,euroflexFactoryHalfCurrentDataR3 as data,type EuroflexCurrentContextR3}
 from '../../scripts/estimate/r4a13/prepareEuroflexFactoryHalfLayoutCurrentR3';
import type {PurchaseGroupRepresentative} from '../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
const primary=data.primaryMeasureParameterId;
const hash=(v:unknown)=>createHash('sha256').update(canonicalEstimateStableJson(v)).digest('hex');
const build=(parent:PurchaseGroupRepresentative=fixture.parent,context:EuroflexCurrentContextR3=fixture.context)=>prepareEuroflexFactoryHalfLayoutCurrentR3(parent,context);
const prefix = 'euroflex:recycling-50mm:';
const provenance = { kind: 'manual', reason: 'Synthetic bounded layout/order test, not a supplier quote or installed-playground acceptance' };
const facts = { surface_length_along_rows_mm: 5250, surface_width_across_rows_mm: 4000,
 equipment_max_free_fall_height_m: 1.2, prepared_base_condition: euroflexRecycling50SourcePackR1.applicability.preparedBaseValueRu,
 fall_zone_condition: euroflexRecycling50SourcePackR1.applicability.fallZoneValueRu,
 full_usable_stock_pcs: 3, full_reserve_pcs: 2, full_supply_quantum_pcs: 8,
 half_usable_stock_pcs: 1, half_reserve_pcs: 1, half_supply_quantum_pcs: 4,
 full_supply_specification: 'TEST factory500×500×50mm,8pcs per supplier batch',
 half_supply_specification: 'TEST factory500×250×50mm,4pcs per supplier batch',
 [data.layout.confirmationParameterId]: data.layout.confirmationValueRu };
function compile(parameters: Record<string, unknown> = facts, overrides: NonNullable<CanonicalEstimateCompileCoreInput['rowOverrides']> = {}) {
 const d = build().previewRepresentative;
 return compileCanonicalEstimateCore({ operation: Object.keys(overrides).length ? 'recalculate' : 'compile', compilerVersion: data.contract, catalogId: data.catalogId,
 primaryMeasureParameterId: primary, parameterDefinitions: [...d.parameters] as CanonicalEstimateCompileCoreInput['parameterDefinitions'],
 formulaDefinitions: [...d.formulas] as CanonicalEstimateCompileCoreInput['formulaDefinitions'],
 resourceDefinitions: [...d.resources] as CanonicalEstimateCompileCoreInput['resourceDefinitions'],
 submittedParameters: parameters, confirmedParameters: {}, currencyCode: 'KGS', priceItems: [], rowOverrides: overrides,
 maximumResourceRows: d.resources.length, hashJson: estimateDeterministicHash });
}
const row = (result: Awaited<ReturnType<typeof compile>>, id: string) => result.rows.find(item => item.row_id === prefix + id)!;
describe('actual delivery-v2 to factory-half-v3 through the shared compiler', () => {
 it.each([
  [6000,4000,'24','92','8'], [5250,4000,'21','80','8'], [5750,4500,'25.875','99','9'],
  [6000,4500,'27','104','8'], [500,1000,'0.5','1','2'], [250,500,'0.125','0','1'],
 ])('balances independent physical format counts for %sx%s mm', async (length,width,area,full,half) => {
  const result = await compile({ ...facts, surface_length_along_rows_mm: length, surface_width_across_rows_mm: width });
  expect(result.parameters[primary]).toBe(area);
  expect(row(result,'full-consumed').quantity).toBe(full); expect(row(result,'half-consumed').quantity).toBe(half);
  expect(result.preliminaryNeeds.some(need => need.row_id === prefix+'open-layout')).toBe(false);
 });
 it('retains all25 actual current row/unit/cost owners and changes only two consumption formula expressions', () => {
  const before=fixture.parent, after=build().previewRepresentative;
  expect(after.resources.map(r=>[r.row_id,r.unit_id,r.cost_owner_id,r.resource_graph.costTreatment]))
   .toEqual(before.resources.map(r=>[r.row_id,r.unit_id,r.cost_owner_id,r.resource_graph.costTreatment]));
  expect(after.formulas.filter(f=>f.expression_source!==before.formulas.find(old=>old.formula_id===f.formula_id)?.expression_source).map(f=>f.formula_id).sort())
   .toEqual([prefix+'formula:full-consumed',prefix+'formula:half-consumed']);
  expect(after.formulas.find(f=>f.formula_id===prefix+'formula:full-consumed')!.input_parameter_ids).toContain(primary);
  expect(after.parameters).toHaveLength(45);expect(after.resources).toHaveLength(25);expect(after.formulas).toHaveLength(25);
 });
 it('uses two independent paid order owners and leaves consumption informational', async () => {
  const result=await compile(facts,{[prefix+'full-order']:{unitPrice:'77',provenance},[prefix+'half-order']:{unitPrice:'3',provenance}});
  expect(row(result,'full-order')).toMatchObject({quantity:'80',unit_price:'77',amount:'6160'});
  expect(row(result,'half-order')).toMatchObject({quantity:'8',unit_price:'3',amount:'24'});
  expect(row(result,'full-packages').quantity).toBe('10'); expect(row(result,'half-packages').quantity).toBe('2');
  expect(row(result,'full-remaining').quantity).toBe('3'); expect(row(result,'full-free').quantity).toBe('1');
  for(const id of ['full-consumed','half-consumed']) expect(row(result,id).included_in_estimate).toBe(false);
  expect(result.rows.filter(r=>r.included_in_estimate&&r.amount!=null).reduce((total,r)=>total+Number(r.amount),0)).toBe(6184);
 });
 it('retains manual77 quantity/title/price and exact reserve deficit without ready procurement', async () => {
  const result=await compile({...facts,full_supply_quantum_pcs:1},{[prefix+'full-order']:{quantity:'77',unitPrice:'77',titleRu:'Моя красная плитка',includedInProcurement:true,provenance}});
  expect(row(result,'full-order')).toMatchObject({quantity:'77',unit_price:'77',amount:'5929',title_ru:'Моя красная плитка',included_in_procurement:false});
  expect(row(result,'full-consumed').quantity).toBe('80'); expect(row(result,'full-reserve-deficit').quantity).toBe('2');
 });
 it('keeps the existing supplier quantum guard instead of rounding a manual77 order into8-piece batches', async () => {
  await expect(compile(facts,{[prefix+'full-order']:{quantity:'77',unitPrice:'77',provenance}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID',message:expect.stringContaining('whole supply quantum')});
 });
 it('retains exclusions without inventing a replacement paid owner', async () => {
  const result=await compile(facts,{[prefix+'half-order']:{quantity:'8',includedInEstimate:false,provenance}});
  expect(row(result,'half-order').included_in_estimate).toBe(false);
  expect(result.rows.filter(r=>data.calculatedOrderOwners.some(o=>o.rowId===r.row_id)&&r.included_in_estimate).map(r=>r.row_id)).toEqual([prefix+'full-order']);
 });
 it('requires the actual end-layout confirmation only in new half-module cases', async () => {
  const missing={...facts} as Record<string,unknown>;delete missing[data.layout.confirmationParameterId];
  const fresh=await compile(missing);
  expect(fresh.preliminaryNeeds.some(n=>n.missing_parameter_ids.includes(data.layout.confirmationParameterId))).toBe(true);
  const legacy=await compile({...missing,surface_length_along_rows_mm:6000});
  expect(legacy.preliminaryNeeds.some(n=>n.missing_parameter_ids.includes(data.layout.confirmationParameterId))).toBe(false);
 });
 it.each([[5251,4000],[5250,4250],[125,500]])('keeps unsupported %sx%s geometry in the original application-owned layout need', async (length,width) => {
  const result=await compile({...facts,surface_length_along_rows_mm:length,surface_width_across_rows_mm:width});
  expect(result.preliminaryNeeds.some(n=>n.row_id===prefix+'open-layout')).toBe(true);
 });
 it('does not round submillimetres into a fit or admit fall height above1.5m', async () => {
  await expect(compile({...facts,surface_length_along_rows_mm:'5250.000000001'})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
  await expect(compile({...facts,equipment_max_free_fall_height_m:1.500000001})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
 });
 it('leaves unknown supply facts/price and all eight installation obligations open', async () => {
  const missing={...facts} as Record<string,unknown>;delete missing.full_reserve_pcs;
  const result=await compile(missing);
  expect(result.preliminaryNeeds.some(n=>n.row_id===prefix+'full-order')).toBe(true);
  for(const need of data.unresolvedInstallationNeeds) expect(result.preliminaryNeeds.some(n=>n.row_id===prefix+'open-'+need.key&&n.quantity==null)).toBe(true);
  const known=await compile(); expect(row(known,'full-order').unit_price).toBeNull(); expect(row(known,'half-order').unit_price).toBeNull();
 });
});

describe('exact actual parent adapter and paid/open/delivery boundary',()=>{
 it('accepts actual complete44/25/25/16 graph, proposes3 without IDs or publication',()=>{
  const before=hash(fixture.parent),out=build();
  expect(before).toBe(data.expectedCurrent.parentStableSha256);expect(hash(fixture.parent)).toBe(before);
  expect(out).toMatchObject({originalDefinitionId:'8094686a-d912-5016-870c-81e6c81deb07',originalDefinitionVersion:2,
   proposedDefinitionVersion:3,newDefinitionId:null,newBaselineId:null,publicationReady:false,runtimeAccepted:false,preservedNormativeBindingCount:16});
  expect(out.previewRepresentative.definition.definition_sha256).toBeNull();expect(out.previewRepresentative.passport.payload_sha256).toBeNull();
 });
 it('preserves exactly two calculated pcs orders and the separate unresolved kg glue owner',()=>{
  const next=build().previewRepresentative;
  expect(next.resources.filter(r=>r.category==='material'&&r.resource_graph.costTreatment==='OWN_COST').map(r=>r.row_id).sort())
   .toEqual([...data.calculatedOrderOwners,...data.preservedUnresolvedMaterialOwners].map(r=>r.rowId).sort());
  const glue=data.preservedUnresolvedMaterialOwners[0].rowId;
  expect(next.resources.find(r=>r.row_id===glue)).toEqual(fixture.parent.resources.find(r=>r.row_id===glue));
  expect(next.parameters.find(p=>p.parameter_id==='unresolved_perimeter_glue')).toEqual(fixture.parent.parameters.find(p=>p.parameter_id==='unresolved_perimeter_glue'));
 });
 it('retains all17 delivery parameters, row/formula and16 normative bindings byte-equivalent',()=>{
  const next=build().previewRepresentative;
  expect(next.parameters.filter(p=>data.preservedDeliveryParameterIds.includes(p.parameter_id)))
   .toEqual(fixture.parent.parameters.filter(p=>data.preservedDeliveryParameterIds.includes(p.parameter_id)));
  expect(next.resources.find(r=>r.row_id===data.preservedDeliveryRowId)).toEqual(fixture.parent.resources.find(r=>r.row_id===data.preservedDeliveryRowId));
  expect(next.formulas.find(f=>f.formula_id===data.preservedDeliveryFormulaId)).toEqual(fixture.parent.formulas.find(f=>f.formula_id===data.preservedDeliveryFormulaId));
  expect(next.bindings).toEqual(fixture.parent.bindings);
  expect(next.resources.find(r=>r.row_id===data.preservedDeliveryRowId)!.resource_graph.selectedMaterialDeliveryR1.serverAdmissionRequired).toBe(true);
 });
 it('maps all25 row manual fields by exact same ID/unit/owner, never crosses full/half',()=>{
  const out=build();expect(out.sameRowManualFieldBindings).toHaveLength(25);
  for(const binding of out.sameRowManualFieldBindings){
   expect(binding.parentRowId).toBe(binding.successorRowId);
   const before=fixture.parent.resources.find(r=>r.row_id===binding.parentRowId)!;
   expect([binding.unitId,binding.costOwnerId]).toEqual([before.unit_id,before.cost_owner_id]);
  }
  expect(out.manualPriceMigrationBindings).toEqual({'euroflex:recycling-50mm:full-order':'euroflex:recycling-50mm:full-order',
   'euroflex:recycling-50mm:half-order':'euroflex:recycling-50mm:half-order'});
  expect(out.automaticGenericPriceInheritanceAllowed).toBe(false);
 });
 it('rejects historicalv1 and future version drift before any transformation',()=>{
  const parent=structuredClone(fixture.parent);parent.definition.id='0cd3d0a2-78e1-57d6-92aa-9352544d8dda';parent.definition.definition_version=1;
  expect(()=>build(parent)).toThrow('EXACT_CURRENT_DELIVERY_V2_REQUIRED');
 });
 it('rejects a full order retyped frompcs tokg rather than inheriting its price',()=>{
  const parent=structuredClone(fixture.parent);parent.resources.find(r=>r.row_id===data.calculatedOrderOwners[0].rowId)!.unit_id='kg';
  expect(()=>build(parent)).toThrow('CALCULATED_PCS_ORDER_OWNER_REQUIRED');
 });
 it('rejects a glue obligation relabelled as calculated or procurable',()=>{
  const parent=structuredClone(fixture.parent);parent.resources.find(r=>r.row_id===data.preservedUnresolvedMaterialOwners[0].rowId)!.source_metadata.sourceNormQuantityAccepted=true;
  expect(()=>build(parent)).toThrow('EXACT_UNRESOLVED_GLUE_OWNER_REQUIRED');
 });
 it('rejects arbitrary extra material owners even with the EUROFLEX prefix',()=>{
  const parent=structuredClone(fixture.parent);parent.resources.find(r=>r.row_id===data.preservedUnresolvedMaterialOwners[0].rowId)!.row_id='euroflex:recycling-50mm:open-unproved-extra';
  expect(()=>build(parent)).toThrow('EXACT_AUTHORED_ID_SETS_REQUIRED');
 });
 it('rejects missing delivery row and changed delivery metadata instead of rebuilding oldR1',()=>{
  const missing=structuredClone(fixture.parent);missing.resources=missing.resources.filter(r=>r.row_id!==data.preservedDeliveryRowId);
  expect(()=>build(missing)).toThrow('CURRENT_DELIVERY_SHAPE_REQUIRED');
  const changed=structuredClone(fixture.parent);Object.assign(changed.resources.find(r=>r.row_id===data.preservedDeliveryRowId)!.source_metadata,{serverAdmissionBypassed:true});
  expect(()=>build(changed)).toThrow('EXACT_COMPLETE_PREIMAGE_REQUIRED');
 });
 it('rejects release pair, primaryunit and price-route preimage drift',()=>{
  expect(()=>build(fixture.parent,{...fixture.context,searchReleaseId:'00000000-0000-0000-0000-000000000000'})).toThrow('EXACT_PARENT_PAIR_REQUIRED');
  expect(()=>build(fixture.parent,{...fixture.context,primaryUnitId:'pcs'})).toThrow('PRIMARY_UNIT_REQUIRED');
  expect(()=>build(fixture.parent,{...fixture.context,priceRouteBindings:[{price_key:'unproved'}]})).toThrow('PRICE_BINDING_PREIMAGE_DRIFT');
 });
});
