import snapshot from '../../../../data/estimate-benchmarks/fixtures/stone-cubes-four-v5-parents-s27-69.json';
import {buildStoneCubesWasteSuccessorS2769,compileStoneCubesWasteS2769,assertStoneCubesWasteSelectionS2769,stoneCubesWasteBindingS2769 as binding,
 stoneCubesWasteModeIdS2769 as mode} from './stoneCubesWasteScopeS2769';
import {compileCanonicalEstimateCore} from '../backendPlatform/canonicalEstimateCompileCore';
import type {PurchaseGroupRepresentative} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
const reps=snapshot.reps as unknown as PurchaseGroupRepresentative[],prefix='f09:stone_tile_floor_demolition:';
const facts=(index:number)=>({...reps[index]!.baseline.input_values,stone_cubes_work_scope_confirmed:binding.confirmedWorkScopeValue});
const external={stone_cubes_waste_mass_t:'1.25',stone_cubes_haul_distance_km:'12',stone_cubes_waste_service_coverage:binding.coverageValue,
 stone_cubes_transport_designation:'Подтверждённый транспорт контрольной услуги',stone_cubes_waste_packaging_description:'Тара и затаривание включены в услугу',
 stone_cubes_waste_receiver_designation:'Контрольный объект приёма',stone_cubes_waste_service_specification_ref:'VALIDATION_FIXTURE / полная спецификация',
 stone_cubes_waste_lowering_loading_scope:'Спуск и погрузка вне включённых перемещений КРЕР; труд и тара включены в единую цену'};
test.each(reps.map((p,index)=>[String(p.definition.catalog_id),index] as const))('retained scope needs positive facts and preserves the old labor owner: %s',async(_id,index)=>{
 const parent=reps[index]!,before=JSON.stringify(parent),model=buildStoneCubesWasteSuccessorS2769(parent),r=await compileStoneCubesWasteS2769(parent,{...facts(index),[mode]:binding.retainModeValue});
 expect(JSON.stringify(parent)).toBe(before);expect(model.resources).toHaveLength(9);expect(model.parameters).toHaveLength(18);
 expect(r.rows).toHaveLength(3);expect(r.preliminaryNeeds).toHaveLength(0);
 expect(r.rows.find(row=>row.row_id===prefix+'labor')?.quantity).toBe('13.9089');
 expect(r.rows.filter(row=>row.included_in_estimate).map(row=>row.row_id)).toEqual([prefix+'labor']);
 expect(r.rows.filter(row=>row.included_in_procurement)).toHaveLength(0);
 for(const old of parent.formulas)expect(model.formulas.find(f=>f.formula_id===old.formula_id)).toEqual(old);
 for(const old of parent.resources)expect(model.resources.find(row=>row.row_id===old.row_id)?.cost_owner_id).toBe(old.cost_owner_id);
});
test('an unanswered waste mode preserves all four needs; a legacy choice cannot create a complete estimate',async()=>{
 for(const selected of [undefined,binding.legacyModeValue]){
  const r=await compileStoneCubesWasteS2769(reps[0]!,{...facts(0),[mode]:selected});
  expect(r.rows).toHaveLength(2);expect(r.preliminaryNeeds).toHaveLength(4);
  expect(r.rows.some(row=>row.row_id.includes(':waste-'))).toBe(false);
 }
});
test.each(reps.map((p,index)=>[String(p.definition.catalog_id),index] as const))('external service is measured once and does not duplicate the four old cost owners: %s',async(_id,index)=>{
 const r=await compileStoneCubesWasteS2769(reps[index]!,{...facts(index),...external,[mode]:binding.contractorModeValue});
 expect(r.rows).toHaveLength(4);expect(r.preliminaryNeeds).toHaveLength(0);
 expect(r.rows.find(row=>row.row_id===prefix+'waste-service')?.quantity).toBe('1.25');
 expect(r.rows.filter(row=>row.included_in_estimate)).toHaveLength(2);expect(r.rows.filter(row=>row.included_in_procurement)).toHaveLength(1);
 expect(r.rows.every(row=>!['packaging','other-descent','offsite-haul','disposal'].some(key=>row.row_id===prefix+key))).toBe(true);
 expect(r.rows.every(row=>row.unit_price==null)).toBe(true);
});
test('mass and the full service specification remain object facts, never technical quantities inferred from area',async()=>{
 for(const missing of ['stone_cubes_waste_mass_t','stone_cubes_waste_service_specification_ref','stone_cubes_waste_lowering_loading_scope','stone_cubes_waste_receiver_designation']){
  const r=await compileStoneCubesWasteS2769(reps[0]!,{...facts(0),...external,[mode]:binding.contractorModeValue,[missing]:undefined});
  expect(r.rows.some(row=>row.row_id===prefix+'waste-service')).toBe(false);expect(r.preliminaryNeeds).toHaveLength(1);
 }
 const r=await compileStoneCubesWasteS2769(reps[0]!,{...facts(0),...external,[mode]:binding.onSiteExtraModeValue,
  stone_cubes_haul_distance_km:undefined,stone_cubes_waste_receiver_designation:undefined,stone_cubes_transport_designation:undefined});
 expect(r.preliminaryNeeds).toHaveLength(0);expect(r.rows.find(row=>row.row_id===prefix+'waste-onsite-service')?.quantity).toBe('1.25');
});
test('old manual prices stay on the six old owners and can be restored without copying them onto the new service',async()=>{
 const model=buildStoneCubesWasteSuccessorS2769(reps[0]!);
 const overrides={[prefix+'labor']:{unitPrice:'123.45',provenance:{kind:'manual',reason:'Сохранённая согласованная цена'}},
  [prefix+'packaging']:{unitPrice:'7',provenance:{kind:'manual',reason:'Сохранённая отдельная цена тары'}}};
 const compile=(selected:string)=>compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:binding.contract,catalogId:String(reps[0]!.definition.catalog_id),
  primaryMeasureParameterId:'floor_covering_area_m2',parameterDefinitions:model.parameters as never,formulaDefinitions:model.formulas as never,
  resourceDefinitions:model.resources as never,submittedParameters:{...facts(0),...external,[mode]:selected},confirmedParameters:{},currencyCode:'KGS',
  priceItems:[],rowOverrides:overrides as never,maximumResourceRows:9,hashJson:async v=>JSON.stringify(v)});
 const retained=await compile(binding.retainModeValue),externalResult=await compile(binding.contractorModeValue);
 expect(retained.rows.find(row=>row.row_id===prefix+'labor')?.unit_price).toBe('123.45');
 expect(externalResult.rows.find(row=>row.row_id===prefix+'waste-service')?.unit_price).toBeNull();
 expect(overrides[prefix+'packaging']?.unitPrice).toBe('7');
});
test('old source confirmations cannot substitute the new actual work-scope fact',async()=>{
 const r=await compileStoneCubesWasteS2769(reps[0]!,{...facts(0),...external,[mode]:binding.contractorModeValue,stone_cubes_work_scope_confirmed:undefined});
 expect(r.rows).toHaveLength(0);
});
test('the modern form needs one work-scope fact and the waste mode without repeated normative declarations',async()=>{
 const model=buildStoneCubesWasteSuccessorS2769(reps[0]!);
 const r=await compileStoneCubesWasteS2769(reps[0]!,{floor_covering_area_m2:'35.5',stone_cubes_work_scope_confirmed:binding.confirmedWorkScopeValue,[mode]:binding.retainModeValue});
 expect(r.rows).toHaveLength(3);expect(r.preliminaryNeeds).toHaveLength(0);
 expect(model.parameters.slice(0,3).map(p=>p.parameter_id)).toEqual(['floor_covering_area_m2',mode,'stone_cubes_work_scope_confirmed']);
});
test('a full service cannot silently reinstate a previously excluded waste task',()=>{
 for(const selection of [
  {contractVersion:'canonical-estimate-composition-selection/v1',excludedRowIds:[prefix+'packaging'],excludedOperationKeys:[]},
  {contractVersion:'canonical-estimate-composition-selection/v1',excludedRowIds:[],excludedOperationKeys:[JSON.stringify(['stone-cubes-waste-plan','other-descent'])]},
 ]){
  let error;try{assertStoneCubesWasteSelectionS2769({[mode]:binding.contractorModeValue},selection);}catch(caught){error=caught;}
  expect(error).toMatchObject({code:'COMPOSITION_SERVICE_SCOPE_CONFLICT'});
  expect(()=>assertStoneCubesWasteSelectionS2769({[mode]:binding.retainModeValue},selection)).not.toThrow();
 }
 expect(()=>assertStoneCubesWasteSelectionS2769({[mode]:binding.contractorModeValue},
  {contractVersion:'canonical-estimate-composition-selection/v1',excludedRowIds:[],excludedOperationKeys:[]})).not.toThrow();
});
