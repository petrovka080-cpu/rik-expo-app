import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {ct29ExistingMineralDeliveryCleanupPackR2 as ct29ExistingMineralPackS2754,ct29ExistingMineralPrefixS2754} from '../../src/lib/estimate/v4/ct29ExistingMineralSeriesS2754';
import {ct29IndoorDeliveryCleanupPackR2 as pack,ct29IndoorDeliveryCleanupPackSha256R2 as packSha,
 ct29IndoorDeliveryCleanupCompletenessMapR2,buildCt29IndoorDeliveryCleanupDefinitionR2} from '../../src/lib/estimate/v4/ct29IndoorDeliveryCleanupR2';
import {compileAutomaticConstructionOwnerR1} from '../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {compileCanonicalEstimateCore} from '../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../../src/lib/estimate/estimateDeterministicHash';
import {canonicalEstimateResourceOperationSections} from '../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';
import {validateIndependentCompletenessMapReferences} from '../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import {parseCanonicalPublicResourcePresentationV1,canonicalPublicResourceDisplayPresentationV1} from '../../src/lib/estimate/backendPlatform/canonicalPublicResourcePresentationV1';

const prefix=ct29ExistingMineralPrefixS2754(1),id=(key:string)=>prefix+':'+key,definition=buildCt29IndoorDeliveryCleanupDefinitionR2(ct29ExistingMineralPackS2754(1),prefix),
 geometry={plaster_area_m2:160,layer_thickness_mm:10.5},input={...geometry,ct29_delivery_distance_km:20};
const compile=(p:Record<string,unknown>)=>compileAutomaticConstructionOwnerR1({catalogId:pack.catalogId,compilerVersion:pack.contract,
 primaryMeasureParameterId:'plaster_area_m2',definition,submittedParameters:p});
const qty=(r:Awaited<ReturnType<typeof compile>>,key:string)=>r.rows.find(row=>row.row_id===id(key))?.quantity;
const graph=(r:any)=>r.calculation_trace?.resourceGraph??{};
const recalculate=(rowOverrides:Parameters<typeof compileCanonicalEstimateCore>[0]['rowOverrides'],submittedParameters:Record<string,unknown>=input)=>compileCanonicalEstimateCore({
 operation:'recalculate',compilerVersion:pack.contract,catalogId:pack.catalogId,primaryMeasureParameterId:'plaster_area_m2',
 parameterDefinitions:[...definition.parameters],formulaDefinitions:[...definition.formulas],resourceDefinitions:[...definition.resources],
 submittedParameters,confirmedParameters:{},currencyCode:'KGS',hashJson:estimateDeterministicHash,maximumResourceRows:definition.resources.length,rowOverrides});

describe('CT29 delivery is derived from the actual order and permitted distance; cleanup has one real overhead owner',()=>{
 test('exact source bytes and the retained geometry pack remain pinned; physical unit definition is not a vehicle norm or tariff',()=>{
  const sha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
  expect(sha('data/estimate-benchmarks/source-packs/ct29-indoor-delivery-cleanup-r2.json')).toBe(packSha);
  expect(sha(pack.baseSourcePack)).toBe(pack.baseSourcePackSha256);
  expect(sha('.release-runtime/r568/ct29-indoor-delivery-cleanup-r2/sources/'+pack.transportSource.file)).toBe(pack.transportSource.sha256);
  expect(sha('.release-runtime/r568/ct29-indoor-geometry-r1/sources/kr-overheads-method.pdf')).toBe(pack.cleanupSource.sha256);
  expect(pack.transportSource.admittedRole).toContain('NOT_A_TRUCK_RATE_OR_TARIFF');
  expect(pack.cleanupSource.locator).toContain('III.11–12');
 });
 test('ordinary input is area/thickness and measured distance; no production/vehicle question or hidden distance default',()=>{
  expect(definition.parameters.filter(p=>p.required&&p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id))
   .toEqual(['plaster_area_m2','layer_thickness_mm']);
  const distance=definition.parameters.find(p=>p.parameter_id==='ct29_delivery_distance_km')!;
  expect(distance).toMatchObject({required:false,default_value:null,unit_id:'km',constraints_json:{min:0},
   truth_metadata:{visibility_role:'USER_INPUT',value_source_role:'USER_INPUT',source_confirmation_required:false}});
  expect(definition.parameters.some(p=>/logistics_cleanup_qty|payload|vehicle|crew|trip|reserve|planned_whole/.test(p.parameter_id))).toBe(false);
  expect(definition.runtimeInput).toEqual({});
  for(const r of definition.resources){
   expect(parseCanonicalPublicResourcePresentationV1(r.resource_graph.publicResourcePresentationV1)).not.toBeNull();
   const visible=canonicalPublicResourceDisplayPresentationV1({rowId:r.row_id,titleRu:r.title_ru,descriptor:r.resource_graph.publicResourcePresentationV1})!;
   expect(visible.nameRu).not.toMatch(/Норматив|КРЕР|разряд|PDF|§|net|рецепт/iu);
  }
 });
 test('160×10.5 and20km calculates3025kg new order and60.5 t·km; all material and normative hours stay unchanged',async()=>{
  const r=await compile(input);
  expect(qty(r,'25kg-order')).toBe('3025');expect(qty(r,'delivery')).toBe('60.5');
  expect(qty(r,'net-mixture')).toBe('3024');expect(qty(r,'25kg-minimum-batches')).toBe('121');
  expect(qty(r,'25kg-mix-water-consumed')).toBe('750.2');expect(qty(r,'labor')).toBe('87.1752');expect(qty(r,'mixer')).toBe('2.8056');
  const row=r.rows.find(row=>row.row_id===id('delivery'))!;
  expect(row).toMatchObject({unit_id:'t_km',unit_price:null,included_in_estimate:true,included_in_procurement:true});
  expect(definition.resources.find(row=>row.row_id===id('delivery'))!.source_metadata).toMatchObject({
   basisOwnerRowId:id('25kg-order'),transportMassBasis:'EFFECTIVE_ORDER_DRY_MASS_KG',actualGrossCargoMassNotClaimed:true,
   vehicleTripsHoursFuelNotInferred:true,automaticTariffForbidden:true,insideHandlingExcludedFromFreightTariff:true});
  expect(r.preliminaryNeeds.filter(n=>n.need_state==='QUANTITY_REQUIRED').map(n=>n.row_id)).toEqual(['curing-water'].map(id));
  for(const key of ['scope-tools','scope-cleanup']){
   expect(r.preliminaryNeeds.find(n=>n.row_id===id(key))).toMatchObject({quantity:null,need_state:'CONDITION_REQUIRED',missing_parameter_ids:[],unit_id:'',unit_price:null,selected:false,
    procurement_eligible:false,calculation_trace:{resourceGraph:{costTreatment:'INFORMATIONAL_SCOPE',scopeRequirementDecisionV1:{status:'INCLUDED',missingObjectFactParameterIds:[],
     coveringRowIds:[id('labor')],numericNormAccepted:false,separatePaymentAccepted:false}}}});
   expect(r.rows.some(n=>n.row_id===id(key))).toBe(false);
  }
 });
 test('stock reduces freight with the new order, but never reduces mixing water or normative labor; fully covered order needs no route',async()=>{
  const a=await compile(input),b=await compile({...input,ct29_25kg_stock_bags:3}),covered=await compile({...geometry,ct29_25kg_stock_bags:150});
  expect(qty(b,'25kg-order')).toBe('2950');expect(qty(b,'delivery')).toBe('59');
  for(const key of ['net-mixture','25kg-minimum-batches','25kg-mix-water-consumed','labor','mixer'])expect(qty(b,key)).toBe(qty(a,key));
  expect(qty(covered,'25kg-order')).toBe('0');
  expect(covered.rows.some(row=>row.row_id===id('delivery'))).toBe(false);
  expect(covered.preliminaryNeeds.some(row=>row.row_id===id('delivery'))).toBe(false);
 });
 test('manual whole-bag order correction drives freight through existing effective resource quantity; it is not a second static mass calculation',async()=>{
  const r=await recalculate({[id('25kg-order')]:{quantity:'3050',provenance:{kind:'manual',reason:'One additional25kg bag ordered'}}});
  expect(qty(r,'25kg-order')).toBe('3050');expect(qty(r,'delivery')).toBe('61');
  expect(qty(r,'25kg-prepared-mixture')).toBe('3025');expect(qty(r,'25kg-mix-water-consumed')).toBe('750.2');
 });
 test('distance and changed geometry recalculate, while absent distance remains a real measured-route need and negative distance is rejected',async()=>{
  const fractional=await compile({...input,ct29_25kg_stock_bags:3,ct29_delivery_distance_km:22.5});
  expect(qty(fractional,'delivery')).toBe('66.375');
  const changed=await compile({...input,plaster_area_m2:162.5,layer_thickness_mm:11.25});
  expect(qty(changed,'25kg-order')).toBe('3300');expect(qty(changed,'delivery')).toBe('66');
  const missing=await compile(geometry);
  expect(missing.preliminaryNeeds.find(n=>n.row_id===id('delivery'))).toMatchObject({quantity:null,missing_parameter_ids:['ct29_delivery_distance_km']});
  const zero=await compile({...input,ct29_delivery_distance_km:0});expect(qty(zero,'delivery')).toBe('0');
  await expect(compile({...input,ct29_delivery_distance_km:-.01})).rejects.toThrow();
 });
 test('overhead cleanup is documented scope, not invented zero/one/tonnes/hours; excluding its provider breaks coverage',async()=>{
  const r=await compile(input),scope=r.preliminaryNeeds.find(n=>n.row_id===id('scope-cleanup'))!;
  expect(scope.quantity).toBeNull();expect(graph(scope).scopeRequirementDecisionV1).toMatchObject({status:'INCLUDED',coveringRowIds:[id('labor')],
   numericNormAccepted:false,separatePaymentAccepted:false});
  expect(definition.resources.find(n=>n.row_id===id('scope-cleanup'))!.resource_graph.scopeRequirementV1).toMatchObject({
   costExclusionBreaksScopeV1:true,sourceEvidence:[{sha256:pack.cleanupSource.sha256,locator:pack.cleanupSource.locator}]});
  expect(r.rows.some(n=>n.row_id===id('scope-cleanup')&&n.included_in_procurement)).toBe(false);
  const excluded=await recalculate({[id('labor')]:{includedInEstimate:false,provenance:{kind:'manual',reason:'Provider excluded'}}});
  expect(graph(excluded.preliminaryNeeds.find(n=>n.row_id===id('scope-cleanup'))!).scopeRequirementDecisionV1).toMatchObject({status:'REQUIRED_RESOURCE_EXCLUDED'});
 });
 test('operation resources and independent completeness map retain one paid delivery owner, normative handling and included cleanup',async()=>{
  const r=await compile(input),rows=[...r.rows,...r.preliminaryNeeds],sections=canonicalEstimateResourceOperationSections(rows.map(row=>({
   rowId:row.row_id,operation:graph(row).operationCompositionV1,titleRu:String(row.title_ru)})));
  expect(sections.find(s=>s.operation?.operationId===id('operation:delivery'))!.resourceIds).toEqual([id('delivery')]);
  const completion=sections.find(s=>s.operation?.operationId===id('operation:completion'))!;
  expect(completion.resourceIds).toContain(id('scope-cleanup'));
  expect(completion.sharedResources).toEqual(expect.arrayContaining([expect.objectContaining({rowId:id('labor')})]));
  expect(sections.find(s=>s.operation?.operationId===id('operation:handling'))!.resourceIds).toEqual(expect.arrayContaining([id('loader'),id('hoist')]));
  expect(r.rows.filter(n=>n.category==='service'&&n.included_in_estimate).map(n=>n.row_id)).toEqual([id('delivery')]);
  const map=ct29IndoorDeliveryCleanupCompletenessMapR2(ct29ExistingMineralPackS2754(1),prefix);
  expect(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources})).toEqual([]);
  expect(map.entries.some(e=>e.expectedResourceId==='logistics-cleanup')).toBe(false);
 });
 test('exact care remains application-owned and cannot be closed by a user norm or an unrelated source; the successor does not claim FULL',async()=>{
  const r=await compile(input),care=r.preliminaryNeeds.find(n=>n.row_id===id('curing-water'))!;
  expect(care).toMatchObject({quantity:null,need_state:'QUANTITY_REQUIRED',missing_parameter_ids:['ct29_curing_water_l']});
  expect(pack.readiness.fullTechnicalAcceptance).toBe(false);
  await expect(compile({...input,ct29_curing_water_l:10})).rejects.toThrow('unresolved application norm cannot be supplied');
  expect(definition.formulas.some(f=>/0\.63|630/.test(f.expression_source??''))).toBe(false);
 });
});
