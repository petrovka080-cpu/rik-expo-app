import pack from '../../../../data/estimate-benchmarks/source-packs/concrete-base-planned-preparation-two-s27-69.json';
import {buildConcreteBasePlannedPreparationS2769 as build,compileConcreteBasePlannedPreparationS2769 as compile} from './concreteBasePlannedPreparationS2769';
import {canonicalApprovedBaselineRuntimeParameters as baseline} from '../backendPlatform/canonicalEstimateApprovedBaseline';
import {compileAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {floorPreparationFreshDefaultsS2769 as defaults,assertFloorPreparationRecalculationChoiceS2769 as choice} from '../backendPlatform/canonicalFloorPreparationIntentS2769';
import type {PurchaseGroupRepresentative as Model} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
const frozen=require('../../../../data/estimate-benchmarks/fixtures/concrete-base-two-parents-s27-69.json') as {models:Model[]};
const facts=(p:Model)=>({...p.baseline.input_values,[pack.barrierAreaId]:12,[pack.dustAreaId]:35.5,[pack.conditionsId]:pack.conditionsValue});
const row=(r:Awaited<ReturnType<typeof compile>>,suffix:string)=>r.rows.find(row=>row.row_id.endsWith(suffix));
test.each(frozen.models)('closes both mandatory operations with independent m3/m2 measures: $definition.catalog_id',async p=>{
 const r=await compile(p,facts(p)),brick=p.definition.catalog_id.includes('brick_rubble');
 expect(r.rows).toHaveLength(21);expect(r.preliminaryNeeds).toHaveLength(0);
 expect(row(r,':labor')?.quantity).toBe(brick?'27.69':'31.7015');
 expect(row(r,':compressor-hired')?.quantity).toBe(brick?'6.603':'8.023');
 expect(row(r,':hammers-hired')?.quantity).toBe(brick?'13.206':'16.046');
 expect(r.rows.find(x=>x.row_id==='f09:temporary_vertical_protective_barrier_board_frame:labor')?.quantity).toBe('6.2928');
 expect(row(r,':vacuum')?.quantity).toBe('3.55');
 expect(r.rows.filter(row=>row.included_in_procurement)).toHaveLength(11);
 expect(r.rows.every(row=>row.unit_price==null)).toBe(true);
 for(const original of p.resources.filter(row=>!row.row_id.endsWith(':adjacent-protection')&&!row.row_id.endsWith(':dust-control'))){
  const next=build(p).resources.find(r=>r.row_id===original.row_id)!;expect(next.cost_owner_id).toBe(original.cost_owner_id);expect(next.inclusion_ast).toEqual(original.inclusion_ast);
 }
});
test('changing concrete volume cannot change dust or barrier measurements',async()=>{
 const p=frozen.models[0]!,a=await compile(p,facts(p)),b=await compile(p,{...facts(p),base_volume_m3:7.1});
 expect(Number(row(b,':labor')?.quantity)).toBe(Number(row(a,':labor')?.quantity)*2);
 expect(row(b,':vacuum')?.quantity).toBe(row(a,':vacuum')?.quantity);
 expect(b.rows.find(r=>r.row_id==='f09:temporary_vertical_protective_barrier_board_frame:labor')?.quantity).toBe('6.2928');
});
test.each([pack.barrierAreaId,pack.dustAreaId,pack.conditionsId])('missing actual fact remains open, not inferred from volume: %s',async id=>{
 const p=frozen.models[0]!,input:Record<string,unknown>=facts(p);delete input[id];
 const r=await compile(p,input);expect(r.preliminaryNeeds.some(n=>n.missing_parameter_ids.includes(id))).toBe(true);
 expect(baseline(build(p).baseline)).not.toHaveProperty(id);
});
test.each(frozen.models)('legacy choice retains old quantities AND both open requirements: $definition.catalog_id',async p=>{
 const input=p.baseline.input_values,old=await compileAutomaticConstructionOwnerR1({catalogId:String(p.definition.catalog_id),compilerVersion:'OLD_CONTROL',primaryMeasureParameterId:'base_volume_m3',
  definition:{parameters:p.parameters,formulas:p.formulas,resources:p.resources,runtimeInput:baseline(p.baseline),runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:['base_volume_m3']} as unknown as AutomaticOwnerDefinition,submittedParameters:input});
 expect(()=>choice({catalogId:String(p.definition.catalog_id),parentParameters:input,submittedParameters:{base_volume_m3:4}})).toThrow('Выберите состав');
 const r=await compile(p,{...input,[pack.modeId]:pack.legacyMode},baseline(build(p).baseline));
 expect(r.rows.map(x=>[x.row_id,x.quantity,x.included_in_estimate,x.included_in_procurement])).toEqual(old.rows.map(x=>[x.row_id,x.quantity,x.included_in_estimate,x.included_in_procurement]));
 expect(r.preliminaryNeeds.map(n=>[n.row_id,n.quantity])).toEqual(old.preliminaryNeeds.map(n=>[n.row_id,n.quantity]));
 expect(r.preliminaryNeeds).toHaveLength(2);
});
test.each(['protection','dedusting'] as const)('another method has exactly one retained application gap: %s',async key=>{
 const p=frozen.models[0]!,method=key==='protection'?pack.barrierMethodId:pack.dustMethodId,value=key==='protection'?pack.otherBarrierValue:pack.otherDustValue;
 const r=await compile(p,{...facts(p),[method]:value});
 expect(r.preliminaryNeeds).toHaveLength(1);expect(r.preliminaryNeeds[0]!.row_id).toMatch(key==='protection'?/:adjacent-protection$/u:/:dust-control$/u);
 await expect(compile(p,{...facts(p),[method]:value,[key==='protection'?'open_qty_adjacent_protection':'open_qty_dust_control']:1})).rejects.toThrow();
});
test.each(['provided','covered','notRequired'] as const)('nonpayable states require evidence, no inactive area/normal-condition questions: %s',async state=>{
 const p=frozen.models[0]!,input={...p.baseline.input_values,...Object.fromEntries(pack.stages.map(s=>[s.id,s[state]]))};
 const missing=await compile(p,input);expect(missing.preliminaryNeeds).toHaveLength(2);
 const r=await compile(p,{...input,...Object.fromEntries(pack.stages.map(s=>[s.evidenceId,state==='covered'?'Смета З-12, этап и владелец стоимости защиты':'Акт участка12; этап принят или доказана ненужность']))});
 expect(r.rows.some(x=>x.row_id.startsWith('dust:')||x.row_id.startsWith('f09:temporary_vertical'))).toBe(false);
 expect(r.preliminaryNeeds.every(n=>(n.calculation_trace as {resourceGraph?:{scopeRequirementDecisionV1?:{status:string}}}).resourceGraph?.scopeRequirementDecisionV1?.status==='COMPLETED')).toBe(true);
 expect(r.preliminaryNeeds.some(n=>n.missing_parameter_ids.includes(pack.conditionsId)||n.missing_parameter_ids.includes(pack.dustAreaId))).toBe(false);
});
test('new assumptions match the shared reversible intent; no fixture becomes a fresh object fact',()=>{
 const p=frozen.models[0]!,r=build(p),approved=baseline(r.baseline);
 expect(approved).toEqual(defaults);expect(r.resources).toHaveLength(p.resources.length+16);
 expect(r.passport.decision.quantityScope).toBe('PARTIAL');expect(r.passport.decision.independentCompletenessMap.generatedFromCurrentRows).toBe(false);
 const barrierExpectations=r.passport.decision.independentCompletenessMap.entries.filter((e:{condition:string})=>e.condition==='EXACT_PLANNED_FULL_BARRIER_WITH_OWN_MEASURE');
 expect(barrierExpectations).toHaveLength(13); // 11 rows + included dismantling + horizontal-rate boundary.
 expect(barrierExpectations.find((e:{expectedResourceId:string})=>e.expectedResourceId==='required-operation:temporary-barrier-dismantling').resolution.kind).toBe('INCLUDED_IN_PARENT');
 expect(barrierExpectations.find((e:{expectedResourceId:string})=>e.expectedResourceId==='adjacent-operation:horizontal-temporary-protective-barrier').resolution.kind).toBe('NOT_APPLICABLE');
});
