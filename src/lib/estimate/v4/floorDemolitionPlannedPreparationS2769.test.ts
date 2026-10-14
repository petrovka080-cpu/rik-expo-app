import pack from '../../../../data/estimate-benchmarks/source-packs/floor-demolition-planned-preparation-thirteen-s27-69.json';
import {buildFloorDemolitionPlannedPreparationS2769 as build,compileFloorDemolitionPlannedPreparationS2769 as compile} from './floorDemolitionPlannedPreparationS2769';
import {floorPreparationFreshDefaultsS2769 as defaults,floorPreparationRuntimeDefaultsS2769 as runtime,floorPreparationEditingParametersS2769 as editing} from '../backendPlatform/canonicalFloorPreparationIntentS2769';
import {compileAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition as Definition} from './automaticConstructionOwnerR1';
import {canonicalApprovedBaselineRuntimeParameters as baseline} from '../backendPlatform/canonicalEstimateApprovedBaseline';
import type {PurchaseGroupRepresentative as Model} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
const frozen=require('../../../../data/estimate-benchmarks/fixtures/planned-floor-thirteen-parents-s27-69.json') as {models:Model[]};
const covering=require('../../../../data/estimate-benchmarks/source-packs/floor-demolition-series-s27-52.json');
const stone=require('../../../../data/estimate-benchmarks/source-packs/stone-cubes-waste-four-s27-69.json');
const asphalt=require('../../../../data/estimate-benchmarks/source-packs/asphalt-floor-waste-four-s27-69.json');
const scopeStatus=(n:Record<string,unknown>)=>(n.calculation_trace as {resourceGraph?:{scopeRequirementDecisionV1?:{status:string}}})?.resourceGraph?.scopeRequirementDecisionV1?.status;
function facts(parent:Model,planned=true):Record<string,unknown>{
 const id=String(parent.definition.catalog_id),wood=id.includes(':master:'),a=id.includes('_dismantle_');
 return {floor_covering_area_m2:35.5,...(wood?{existing_covering_confirmed:parent.baseline.input_values.existing_covering_confirmed,
  object_conditions:planned?pack.plannedWoodConditions:covering.normalConditionValue,waste_handling_mode:covering.retainModeValue,
  ...(parent.parameters.some(p=>p.parameter_id==='mechanism_fulfillment')?{mechanism_fulfillment:'Механизм предоставлен исполнителем; оплачивается эксплуатация по смете'}:{})}:
  a?{asphalt_floor_work_scope_confirmed:asphalt.confirmedWorkScopeValue,asphalt_floor_waste_handling_mode:asphalt.retainModeValue}:
   {stone_cubes_work_scope_confirmed:stone.confirmedWorkScopeValue,stone_cubes_waste_handling_mode:stone.retainModeValue}),
  ...(planned?{[pack.barrierAreaId]:12,[pack.conditionsId]:pack.conditionsValue}:{})};
}
function oldCompile(parent:Model,input:Record<string,unknown>){return compileAutomaticConstructionOwnerR1({catalogId:String(parent.definition.catalog_id),compilerVersion:'prior-frozen-control',
 primaryMeasureParameterId:'floor_covering_area_m2',definition:{parameters:parent.parameters,formulas:parent.formulas,resources:parent.resources,
  runtimeInput:baseline(parent.baseline),runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:['floor_covering_area_m2']} as unknown as Definition,submittedParameters:input});}

test.each(frozen.models)('planned preparation completes quantities and preserves old resource owners: $definition.catalog_id',async parent=>{
 const r=await compile(parent,facts(parent)),next=build(parent);
 expect(r.preliminaryNeeds).toHaveLength(0);
 expect(r.rows.find(row=>row.row_id==='f09:temporary_vertical_protective_barrier_board_frame:labor')?.quantity).toBe('6.2928');
 expect(r.rows.find(row=>row.row_id.endsWith(':vacuum'))?.quantity).toBe('3.55');
 expect(r.rows.find(row=>row.row_id.endsWith(':workers'))?.quantity).toBe('3.55');
 expect(r.rows.filter(row=>row.row_id.includes('machinist')).every(row=>row.unit_price==null)).toBe(true);
 for(const row of parent.resources)expect(next.resources.find(x=>x.row_id===row.row_id)?.cost_owner_id).toBe(row.cost_owner_id);
 expect(next.resources).toHaveLength(parent.resources.length+18);
 expect(baseline(next.baseline)[pack.barrierAreaId]).toBeUndefined();
 expect(baseline(next.baseline)[pack.conditionsId]).toBeUndefined();
 expect(next.passport.decision.quantityScope).toBe('PARTIAL');
});

test.each(frozen.models)('old absence keeps exact historical quantities; no planned facts inferred: $definition.catalog_id',async parent=>{
 const input=facts(parent,false),next=build(parent),old=await oldCompile(parent,input);
 const safe=runtime({catalogId:String(parent.definition.catalog_id),baseline:baseline(next.baseline),parentParameters:input});
 const r=await compile(parent,input,safe);
 expect(safe[pack.modeId]).toBe(pack.legacyMode);
 expect(safe).not.toHaveProperty(pack.stages[0]!.id);expect(safe).not.toHaveProperty(pack.stages[1]!.id);
 expect(r.rows.map(row=>[row.row_id,row.quantity,row.included_in_estimate,row.included_in_procurement])).toEqual(old.rows.map(row=>[row.row_id,row.quantity,row.included_in_estimate,row.included_in_procurement]));
 expect(r.preliminaryNeeds).toEqual(old.preliminaryNeeds);
 expect(editing(String(parent.definition.catalog_id),input)[pack.modeId]).toBe(pack.legacyMode);
 expect(input).not.toHaveProperty(pack.modeId);
});

test('a planned branch cannot turn the old provided-preparation literal into planning intent',async()=>{
 const p=frozen.models.find(p=>p.definition.catalog_id.includes(':master:'))!;
 expect(()=>compile(p,{...facts(p),object_conditions:pack.oldWoodConditions})).toThrow('Прежняя отметка');
 expect(build(p).parameters.find(p=>p.parameter_id==='object_conditions')?.constraints_json.values).toEqual([pack.oldWoodConditions,pack.plannedWoodConditions]);
});
test('independent barrier area and normal site conditions remain actual facts',async()=>{
 const p=frozen.models[0]!,input=facts(p);delete input[pack.barrierAreaId];
 const noBarrier=await compile(p,input);expect(noBarrier.preliminaryNeeds.some(n=>n.missing_parameter_ids.includes(pack.barrierAreaId))).toBe(true);
 expect(noBarrier.rows.some(r=>r.row_id.startsWith('f09:temporary_vertical'))).toBe(false);
 const noConditions=facts(p);delete noConditions[pack.conditionsId];
 const result=await compile(p,noConditions);expect(result.preliminaryNeeds.some(n=>n.missing_parameter_ids.includes(pack.conditionsId))).toBe(true);
});
test.each(pack.stages)('other method remains an application norm gap: $key',async s=>{
 const p=frozen.models[0]!,method=s.key==='protection'?pack.barrierMethodId:pack.dustMethodId;
 const r=await compile(p,{...facts(p),[method]:s.key==='protection'?pack.otherBarrierValue:pack.otherDustValue});
 expect(r.preliminaryNeeds.some(n=>n.row_id==='floor-demolition-preparation:'+s.key+':other-method')).toBe(true);
 await expect(compile(p,{...facts(p),[method]:s.key==='protection'?pack.otherBarrierValue:pack.otherDustValue,['floor_demolition_'+s.key+'_quantity_application']:1})).rejects.toThrow();
});
test.each(['provided','covered','notRequired'] as const)('stage states remain distinct and require their own evidence: %s',async choice=>{
 const p=frozen.models[0]!,input={...facts(p),...Object.fromEntries(pack.stages.map(s=>[s.id,s[choice]]))};
 const noEvidence=await compile(p,input);
 expect(noEvidence.preliminaryNeeds.filter(n=>scopeStatus(n)==='OBJECT_FACT_REQUIRED')).toHaveLength(2);
 const r=await compile(p,{...input,...Object.fromEntries(pack.stages.map(s=>[s.evidenceId,choice==='covered'?'Смета-защита-1; владелец стоимости защиты; этап ещё планируется':'Акт или обоснование участка №12']))});
 expect(r.rows.some(row=>row.row_id.startsWith('dust:')||row.row_id.startsWith('f09:temporary_vertical'))).toBe(false);
 expect(r.preliminaryNeeds.filter(n=>scopeStatus(n)==='COMPLETED')).toHaveLength(2);
 expect(pack.stages.every(s=>r.parameters[s.id]===s[choice])).toBe(true);
});
test('fresh defaults are visible assumptions, old editing and runtime policies agree, unrelated work unchanged',()=>{
 const p=frozen.models[0]!,b=baseline(build(p).baseline);
 for(const [id,v] of Object.entries(defaults)){expect(b[id]).toBe(v);expect(build(p).baseline.input_classification[id]).toBe('ASSUMPTION');}
 expect(runtime({catalogId:String(p.definition.catalog_id),baseline:b,parentParameters:null})).toEqual(b);
 expect(runtime({catalogId:String(p.definition.catalog_id),baseline:b,parentParameters:{},submittedParameters:{[pack.modeId]:pack.plannedMode}})).toEqual(b);
 expect(runtime({catalogId:'other',baseline:b,parentParameters:{}})).toEqual(b);
 const values={area:12};expect(editing('other',values)).toBe(values);
});
