import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {ct29ExistingMineralDefinitionS2754 as definitionFor,
 ct29ExistingMineralPrefixS2754,ct29ExistingMineralGeometryPackR1 as ct29ExistingMineralPackS2754,
 ct29ExistingMineralAdvancedPackS2754} from '../../src/lib/estimate/v4/ct29ExistingMineralSeriesS2754';
import {compileAutomaticConstructionOwnerR1} from '../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {buildCt29AdvancedPlasterDefinitionS2754,buildCt29IndoorGeometryDefinitionR1,
 buildCt29PlasterCompletenessMapS2754,ct29IndoorGeometrySourcePackR1 as pack,
 ct29IndoorGeometrySourceSha256R1 as packHash} from '../../src/lib/estimate/v4/ct29IndoorPlasterS2754';
import {compileCanonicalEstimateCore} from '../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../../src/lib/estimate/estimateDeterministicHash';
import {canonicalEstimateResourceOperationSections} from '../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';

const index=1,prefix=ct29ExistingMineralPrefixS2754(index),id=(key:string)=>prefix+':'+key;
// Retain every quantitative/history assertion for the immutable R1 predecessor.
const definition=buildCt29IndoorGeometryDefinitionR1(ct29ExistingMineralPackS2754(index),prefix),geometry={plaster_area_m2:160,layer_thickness_mm:10.5};
const compile=(input:Record<string,unknown>)=>compileAutomaticConstructionOwnerR1({catalogId:pack.catalogId,
 compilerVersion:pack.contract,primaryMeasureParameterId:'plaster_area_m2',definition,submittedParameters:input});
const graph=(row:Record<string,unknown>)=>(row.calculation_trace as {resourceGraph?:Record<string,unknown>})?.resourceGraph??{};
const quantity=(r:Awaited<ReturnType<typeof compile>>,key:string)=>r.rows.find(row=>row.row_id===id(key))?.quantity;

describe('Exact CT29 existing cement-lime inside has a geometry-only ordinary successor',()=>{
 test('same en_GL product, max20mm, material and normative-machine sources remain explicit and hashed',()=>{
  expect(pack.catalogId).toBe('canonical-work:master:ct29_existing_cement_lime_plaster_indoor_standard');
  expect(pack.product).toMatchObject({edition:'C_CT29_TDS_1_0120',dryKgM2Mm:1.8,bagKg:25,waterMinLPerBag:5.7,waterMaxLPerBag:6.2,maxPassMm:20});
  expect(pack.normative).toMatchObject({normId:'КРЕР15-02-019-03',laborPersonHPer100M2:51.89,mixer65LMachineHPer100M2:1.67,
   loader5tMachineHPer100M2:.04,mastLift500kg45mMachineHPer100M2:.16,waterM3ReferencePer100M2:.63,tableWaterAdmittedAsCt29AllOperationWater:false});
  expect(pack.sources.find(s=>s.id==='krer_general')!.locators).toEqual(expect.arrayContaining([expect.objectContaining({pdfPage:9,section:'4.2'})]));
  expect(pack.sources.find(s=>s.id==='kr_method')!.locators).toEqual(expect.arrayContaining([expect.objectContaining({pdfPage:15,sections:['4.22','4.23']})]));
  expect(packHash).toBe(createHash('sha256').update(readFileSync('data/estimate-benchmarks/source-packs/ct29-indoor-geometry-r1.json')).digest('hex'));
 });

 test('only area/thickness are mandatory; stock is optional and source norms cannot become consumer questions',()=>{
  const questions=definition.parameters.filter(p=>p.required&&p.truth_metadata.visibility_role==='USER_INPUT');
  expect(questions.map(p=>p.parameter_id)).toEqual(['plaster_area_m2','layer_thickness_mm']);
  expect(definition.parameters.find(p=>p.parameter_id==='ct29_25kg_stock_bags')).toMatchObject({required:false,value_type:'integer',constraints_json:{min:0}});
  expect(definition.parameters.some(p=>/base_confirmed|conditions_confirmed|project_detail|layer_applicability|planned_whole|water_stock|water_reserve|water_quantum|supplier/.test(p.parameter_id))).toBe(false);
  expect(definition.parameters.find(p=>p.parameter_id==='ct29_curing_water_l')!.truth_metadata)
   .toMatchObject({visibility_role:'INTERNAL_ONLY',value_source_role:'UNRESOLVED_APPLICATION_NORM'});
  expect(definition.runtimeInput).toEqual({});
 });

 test('160m² x10.5mm: independent mass, whole batches, range and normative hours are all calculated',async()=>{
  const result=await compile(geometry);
  expect(quantity(result,'net-mixture')).toBe('3024');
  expect(quantity(result,'25kg-minimum-batches')).toBe('121');
  expect(quantity(result,'25kg-prepared-mixture')).toBe('3025');
  expect(quantity(result,'25kg-plan-excess')).toBe('1');
  expect(quantity(result,'25kg-order')).toBe('3025');
  expect(quantity(result,'25kg-ordered-bags')).toBe('121');
  expect(quantity(result,'25kg-mix-water-min')).toBe('689.7');
  expect(quantity(result,'25kg-mix-water-max')).toBe('750.2');
  expect(quantity(result,'25kg-mix-water-consumed')).toBe('750.2');
  expect(quantity(result,'labor')).toBe('87.1752');
  expect(quantity(result,'mixer')).toBe('2.8056');
  expect(quantity(result,'loader')).toBe('0.0672');
  expect(quantity(result,'hoist')).toBe('0.2688');
  expect(quantity(result,'machine-operators')).toBe('3.1416');
  expect(result.rows.find(row=>row.row_id===id('machine-operators'))!.included_in_estimate).toBe(false);
  const mixer=definition.resources.find(row=>row.row_id===id('mixer'))!;
  expect(mixer.source_metadata!.normativeMachineNotActualDrillTime).toBe(true);
  expect(mixer.title_ru).toContain('Нормативный растворосмеситель');
 });

 test('assigned stock3 bags changes purchase by75kg, while demand, prepared batches and water remain identical',async()=>{
  const before=await compile(geometry),after=await compile({...geometry,ct29_25kg_stock_bags:3});
  expect(quantity(after,'25kg-order')).toBe('2950');
  expect(quantity(after,'25kg-ordered-bags')).toBe('118');
  for(const key of ['net-mixture','25kg-minimum-batches','25kg-prepared-mixture','25kg-plan-excess','25kg-mix-water-consumed','labor','mixer'])
   expect(quantity(after,key)).toBe(quantity(before,key));
  const covered=await compile({...geometry,ct29_25kg_stock_bags:150});
  expect(quantity(covered,'25kg-order')).toBe('0');
  expect(quantity(covered,'25kg-prepared-mixture')).toBe('3025');
  await expect(compile({...geometry,ct29_25kg_stock_bags:-1})).rejects.toThrow();
  await expect(compile({...geometry,ct29_25kg_stock_bags:1.5})).rejects.toThrow();
 });

 test('KRER thickness adjustment only increases above10mm; manufacturer20mm pass limit remains a real constraint',async()=>{
  const thin=await compile({...geometry,layer_thickness_mm:5}),base=await compile({...geometry,layer_thickness_mm:10}),max=await compile({...geometry,layer_thickness_mm:20});
  expect(quantity(thin,'net-mixture')).toBe('1440');
  expect(quantity(thin,'labor')).toBe('83.024');
  expect(quantity(base,'labor')).toBe('83.024');
  expect(quantity(max,'labor')).toBe('166.048');
  expect(quantity(max,'mixer')).toBe('5.344');
  expect(quantity(max,'net-mixture')).toBe('5760');
  await expect(compile({...geometry,layer_thickness_mm:20.001})).rejects.toThrow();
  await expect(compile({...geometry,ct29_whole_batches:1})).rejects.toThrow();
  await expect(compile({...geometry,project_detail_reference:'not required in this ordinary branch'})).rejects.toThrow();
 });

 test('care water stays an actual application norm gap; no table-water pool or user-supplied norm can fake FULL',async()=>{
  const result=await compile(geometry),care=result.preliminaryNeeds.find(row=>row.row_id===id('curing-water'))!;
  expect(ct29ExistingMineralPackS2754(index).sourceNeeds.map(gap=>gap.id).sort()).toEqual(['curing-water','logistics-cleanup']);
  expect(result.preliminaryNeeds.filter(row=>row.need_state==='QUANTITY_REQUIRED').map(row=>row.row_id).sort())
   .toEqual([id('curing-water'),id('logistics-cleanup')].sort());
  expect(result.preliminaryNeeds.find(row=>row.row_id===id('scope-tools'))).toMatchObject({quantity:null,
   need_state:'CONDITION_REQUIRED',missing_parameter_ids:[],unit_id:'',unit_price:null,selected:false,procurement_eligible:false,calculation_trace:{resourceGraph:{costTreatment:'INFORMATIONAL_SCOPE',
    scopeRequirementDecisionV1:{status:'INCLUDED',missingObjectFactParameterIds:[],coveringRowIds:[id('labor')],numericNormAccepted:false,separatePaymentAccepted:false}}}});
  expect(result.rows.some(row=>row.row_id===id('scope-tools'))).toBe(false);
  expect(care).toMatchObject({quantity:null,need_state:'QUANTITY_REQUIRED',missing_parameter_ids:['ct29_curing_water_l']});
  expect(graph(care).costTreatment).toBe('OWN_COST');
  expect(graph(care).scopeRequirementDecisionV1).toBeUndefined();
  expect(pack.readiness).toMatchObject({fullTechnicalAcceptance:false,geometryOnlyFullBranch:false,requiredNonGeometryQuestions:0});
  expect(pack.readiness.openAuthorObligationsRu).toEqual(expect.arrayContaining([expect.stringContaining('Прямое нормативное покрытие ухода CT29')]));
  expect(definition.resources.filter(r=>r.category==='material'&&r.procurement_eligible&&/water/.test(r.row_id)).map(r=>r.row_id))
   .toEqual([id('25kg-mix-water-consumed')]);
  expect(definition.formulas.every(f=>typeof f.expression_source==='string')).toBe(true);
  expect(definition.formulas.some(f=>f.expression_source?.includes('0.63')||f.expression_source?.includes('630'))).toBe(false);
  await expect(compile({...geometry,ct29_curing_water_l:20})).rejects.toThrow('unresolved application norm cannot be supplied');
  const amended=await compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:pack.contract,catalogId:pack.catalogId,
   parameterDefinitions:[...definition.parameters],formulaDefinitions:[...definition.formulas],resourceDefinitions:[...definition.resources],
   submittedParameters:geometry,confirmedParameters:{},currencyCode:'KGS',hashJson:estimateDeterministicHash,maximumResourceRows:definition.resources.length,
   rowOverrides:{[id('curing-water')]:{quantity:20,unitPrice:2,provenance:{kind:'manual',reason:'A saved preliminary budget is not a source norm'}},
    [id('logistics-cleanup')]:{quantity:'3.75',unitPrice:'1301.25',provenance:{kind:'manual',reason:'User edits the same delivery row'}}}});
  expect(amended.preliminaryNeeds.find(row=>row.row_id===id('curing-water'))).toMatchObject({quantity:'20',need_state:'QUANTITY_REQUIRED',missing_parameter_ids:['ct29_curing_water_l']});
  expect(amended.preliminaryNeeds.find(row=>row.row_id===id('logistics-cleanup'))).toMatchObject({quantity:'3.75',unit_price:'1301.25',
   need_state:'QUANTITY_REQUIRED',missing_parameter_ids:['ct29_logistics_cleanup_qty']});
  const tiny=await compile({plaster_area_m2:.01,layer_thickness_mm:10});
  expect(quantity(tiny,'25kg-minimum-batches')).toBe('1');
  expect(quantity(tiny,'25kg-mix-water-consumed')).toBe('6.2');
  expect(tiny.preliminaryNeeds.some(row=>row.row_id===id('curing-water')&&row.quantity===null)).toBe(true);
  expect(result.preliminaryNeeds.find(row=>row.row_id===id('logistics-cleanup'))).toMatchObject({quantity:null,
   missing_parameter_ids:['ct29_logistics_cleanup_qty']});
  expect(definition.parameters.find(p=>p.parameter_id==='ct29_logistics_cleanup_qty')!.truth_metadata)
   .toMatchObject({visibility_role:'INTERNAL_ONLY',value_source_role:'UNRESOLVED_APPLICATION_NORM'});
  await expect(compile({...geometry,ct29_logistics_cleanup_qty:1})).rejects.toThrow('unresolved application norm cannot be supplied');
 });

 test('actual resources connect the mixing/application/handling/care operations with no duplicate paid labor or dry mixture',async()=>{
  const result=await compile(geometry),all=[...result.rows,...result.preliminaryNeeds];
  const sections=canonicalEstimateResourceOperationSections(all.map(row=>({rowId:row.row_id,operation:graph(row).operationCompositionV1,titleRu:String(row.title_ru)})));
  const mixing=sections.find(s=>s.operation?.operationId===id('operation:mixing'))!;
  expect(mixing.resourceIds).toEqual(expect.arrayContaining([id('25kg-order'),id('25kg-mix-water-consumed'),id('mixer')]));
  const application=sections.find(s=>s.operation?.operationId===id('operation:application'))!;
  expect(application.resourceIds).toContain(id('labor'));
  const handling=sections.find(s=>s.operation?.operationId===id('operation:handling'))!;
  expect(handling.resourceIds).toEqual(expect.arrayContaining([id('loader'),id('hoist')]));
  const care=sections.find(s=>s.operation?.operationId===id('operation:curing'))!;
  expect(care.resourceIds).toContain(id('curing-water'));
  expect(result.rows.filter(row=>row.category==='labor'&&row.included_in_estimate).map(row=>row.row_id)).toEqual([id('labor')]);
  expect(result.rows.filter(row=>row.category==='material'&&row.included_in_procurement&&/order$/.test(row.row_id)).map(row=>row.row_id)).toEqual([id('25kg-order')]);
 });

 test('published overhead covers tools only while its real labor provider remains selected',async()=>{
  const result=await compile(geometry),scope=result.preliminaryNeeds.find(row=>row.row_id===id('scope-tools'))!;
  expect(graph(scope).scopeRequirementDecisionV1).toMatchObject({status:'INCLUDED',coveringRowIds:[id('labor')],numericNormAccepted:false,separatePaymentAccepted:false});
  const tool=definition.resources.find(row=>row.row_id===id('scope-tools'))!;
  expect(tool.resource_graph.scopeRequirementV1).toMatchObject({costExclusionBreaksScopeV1:true,sourceEvidence:expect.arrayContaining([
   expect.objectContaining({sha256:pack.sources.find(s=>s.id==='kr_overheads')!.sha256})])});
  const excluded=await compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:pack.contract,catalogId:pack.catalogId,
   parameterDefinitions:[...definition.parameters],formulaDefinitions:[...definition.formulas],resourceDefinitions:[...definition.resources],
   submittedParameters:geometry,confirmedParameters:{},currencyCode:'KGS',hashJson:estimateDeterministicHash,maximumResourceRows:definition.resources.length,
   rowOverrides:{[id('labor')]:{includedInEstimate:false,provenance:{kind:'manual',reason:'The user excludes the labor provider'}}}});
  expect(graph(excluded.preliminaryNeeds.find(row=>row.row_id===id('scope-tools'))!).scopeRequirementDecisionV1).toMatchObject({status:'REQUIRED_RESOURCE_EXCLUDED'});
 });

 test('advanced history and the other three existing systems stay separate; no ordinary project questionnaire returns',()=>{
  const advancedPack=ct29ExistingMineralAdvancedPackS2754(index),advanced=buildCt29AdvancedPlasterDefinitionS2754(advancedPack,prefix);
  expect(advanced.parameters.some(p=>p.parameter_id==='project_detail_reference'&&p.required)).toBe(true);
  for(const other of [0,2,3])expect(definitionFor(other).parameters.some(p=>p.parameter_id==='project_detail_reference'&&p.required)).toBe(true);
  const map=buildCt29PlasterCompletenessMapS2754(ct29ExistingMineralPackS2754(index),prefix);
  expect(map.entries.some(entry=>entry.expectedResourceId==='curing-water'&&entry.quantityRule==='OPEN_APPLICATION_SOURCE_QUANTITY_NEVER_USER_INPUT')).toBe(true);
  expect(()=>buildCt29IndoorGeometryDefinitionR1({...advancedPack,catalogId:'unrelated-system'},prefix)).toThrow('EXACT_CT29_CEMENT_LIME_INDOOR_GEOMETRY_SCOPE_REQUIRED');
 });
});
