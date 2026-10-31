import {createHash} from 'node:crypto';
import fixtures from '../../../../data/estimate-benchmarks/fixtures/remaining-three-resource-parents-r5.json';
import matrix from '../../../../data/estimate-benchmarks/source-packs/remaining-three-project-resource-composition-r5.json';
import {remainingThreeProjectResourceCompositionR5,type RemainingThreeResourceKeyR5 as Key} from './remainingThreeProjectResourceCompositionR5';
import type {AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {projectResourceParameterPrefixR1 as prefix,projectResourceSeparateR1 as separate,projectResourceIncludedR1 as included,
 projectResourceNotRequiredR1 as notRequired,projectResourceRequiredR1 as required,projectResourceIncludedInPositionR1 as includedIn} from './projectSubworkResourceScheduleR1';
import {canonicalEstimateStableJson} from '../backendPlatform/canonicalEstimateDeterminism';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {canonicalEstimateOperationReferences} from '../backendPlatform/canonicalEstimateOperationComposition';
import {canonicalPublicResourceDisplayPresentationV1,canonicalPublicResourceRowKindV1,parseCanonicalPublicResourcePresentationV1} from '../backendPlatform/canonicalPublicResourcePresentationV1';
const keys:Key[]=['hydro','paint','trench'];
const measures={hydro:'tested_steel_pipe_length_m',paint:'actual_flat_metal_oil_painted_area_m2',trench:'actual_manual_trench_bank_volume_m3'};
const parent=(key:Key)=>structuredClone(fixtures[key]) as unknown as AutomaticOwnerDefinition;
const provenance={kind:'manual' as const,reason:'VALIDATION_FIXTURE; не реальная цена или ведомость'};
const row=(key:Key,id:string,branch='separate')=>'subwork-resource:'+key+'_r5:'+id+':'+branch;
function facts(key:Key){
 const result:Record<string,unknown>={...fixtures[key].validationInput};
 for(const item of matrix.positions[key]){const p=prefix(key+'_r5',item.key);
  if(item.optional){result[p+'_required']=notRequired;continue;}
  Object.assign(result,{[p+'_payment']:included,[p+'_quantity']:'1',[p+'_specification']:'Проверочный ресурс',
   [p+'_reference']:'VALIDATION_FIXTURE; проверочная ведомость, не реальный договор'});
 }return result;
}
function selected(key:Key,input:Record<string,unknown>,id:string,payment=separate,quantity='1'){
 const p=prefix(key+'_r5',id);return {...input,...(matrix.positions[key].find(item=>item.key===id)?.optional?{[p+'_required']:required}:{}),[p+'_payment']:payment,[p+'_quantity']:quantity,
  [p+'_specification']:'Проверочный ресурс',[p+'_reference']:'VALIDATION_FIXTURE; отдельная непересекающаяся граница цены'};
}
function compile(key:Key,definition:AutomaticOwnerDefinition,input:Record<string,unknown>,rowOverrides:CanonicalEstimateCompileCoreInput['rowOverrides']={}){
 return compileCanonicalEstimateCore({operation:'recalculate',catalogId:matrix.sources[key].catalogId,compilerVersion:matrix.contract,
  primaryMeasureParameterId:measures[key],parameterDefinitions:[...definition.parameters],formulaDefinitions:[...definition.formulas],resourceDefinitions:[...definition.resources],
  submittedParameters:input,confirmedParameters:{},priceItems:[],currencyCode:'KGS',maximumResourceRows:definition.resources.length,rowOverrides,
  hashJson:value=>createHash('sha256').update(canonicalEstimateStableJson(value)).digest('hex')});
}
test.each(keys)('%s retains source quantities, units, inclusion, whole labour and price gates exactly',key=>{
 const p=parent(key),before=JSON.stringify(p),next=remainingThreeProjectResourceCompositionR5(p,key);
 expect(JSON.stringify(p)).toBe(before);expect(next.parameters.slice(0,p.parameters.length)).toEqual(p.parameters);
 expect(next.formulas.slice(0,p.formulas.length)).toEqual(p.formulas);
 for(const old of p.resources){const retained=next.resources.find(row=>row.row_id===old.row_id)!;
  for(const field of ['unit_id','formula_id','cost_owner_id','inclusion_ast','title_ru'])expect(retained[field as keyof typeof retained]).toEqual(old[field as keyof typeof old]);
  if(old.unit_id!=='')expect(retained.resource_graph.costTreatment).toBe(old.resource_graph.costTreatment);
  expect(retained.source_metadata?.normativeTrace).toEqual(old.source_metadata?.normativeTrace);
 }
 expect(next.parameters.length).toBeLessThanOrEqual(256);expect(next.resources.length).toBeLessThanOrEqual(128);
 expect(()=>remainingThreeProjectResourceCompositionR5(next,key)).toThrow('THREE_RESOURCE_ALREADY_APPLIED');
});
test.each(keys)('%s connects every provision resource to named subworks without a new norm or default purchase',key=>{
 const p=parent(key),next=remainingThreeProjectResourceCompositionR5(p,key),oldIds=new Set(p.parameters.map(p=>p.parameter_id));
 expect(matrix.positions[key].length).toBeGreaterThan(20);
 for(const resource of next.resources){expect(canonicalEstimateOperationReferences(resource.resource_graph.operationCompositionV1).length).toBeGreaterThan(0);
  if(resource.row_id.startsWith('subwork-resource:')&&!resource.row_id.includes(':ownership-check:')){
   expect(resource.source_metadata).toMatchObject({projectTakeoffNotNorm:true,universal_consumption_claimed:false,automaticGenericPriceInheritanceAllowed:false});
   expect(resource.cost_owner_id).toBe(resource.row_id);
  }
 }
 for(const parameter of next.parameters.filter(p=>!oldIds.has(p.parameter_id)))expect(parameter.truth_metadata.value_source_role).toBe('PROJECT_SPECIFIC_INPUT');
 expect(next.runtimeInput).toEqual(p.runtimeInput);
 expect(next.resources.some(row=>row.unit_id===''&&row.resource_graph.costTreatment==='OWN_COST')).toBe(false);
});
test.each(keys)('%s preserves whole labour and a saved manual77 price when project provision is included',async key=>{
 const p=parent(key),next=remainingThreeProjectResourceCompositionR5(p,key);
 const priced=p.resources.find(row=>row.category==='labor'&&row.resource_graph.costTreatment==='OWN_COST')!;
 const overrides={[priced.row_id]:{unitPrice:'77',provenance}};
 const before=await compile(key,p,fixtures[key].validationInput,overrides),after=await compile(key,next,facts(key),overrides);
 expect(before.rows.find(row=>row.row_id===priced.row_id)?.unit_price).toBe('77');
 for(const old of before.rows.filter(row=>row.unit_price!=null||row.included_in_estimate)){
  const retained=after.rows.find(row=>row.row_id===old.row_id)!;expect(retained).toBeDefined();
  for(const field of ['quantity','unit_id','unit_price','amount','included_in_estimate','included_in_procurement','title_ru'])expect(retained[field as keyof typeof retained]).toEqual(old[field as keyof typeof old]);
 }
 expect(after.totals.amount).toBe(before.totals.amount);
 expect(after.rows.filter(row=>row.row_id.startsWith('subwork-resource:')&&!row.row_id.includes(':ownership-check:')).every(row=>row.unit_price==null&&!row.included_in_estimate&&!row.included_in_procurement)).toBe(true);
});
test.each(keys)('%s missing project provision remains an open need rather than a zero purchase',async key=>{
 const result=await compile(key,remainingThreeProjectResourceCompositionR5(parent(key),key),fixtures[key].validationInput);
 expect(result.preliminaryNeeds.some(row=>row.row_id.startsWith('subwork-resource:'))).toBe(true);
 expect(result.rows.some(row=>row.row_id.startsWith('subwork-resource:')&&row.included_in_estimate)).toBe(false);
});
test('hydraulic pump and its original four materials keep their price boundaries and have no duplicate paid replacement',()=>{
 const p=parent('hydro'),next=remainingThreeProjectResourceCompositionR5(p,'hydro');
 const pump=next.resources.find(row=>row.row_id.endsWith(':hydraulic-plant-consumed'))!;
 expect(pump.resource_graph.costTreatment).toBe('INFORMATIONAL_SCOPE');expect(pump.procurement_eligible).toBe(false);
 for(const suffix of ['water','paint','linseed-oil','linen'])expect(next.resources.filter(row=>row.row_id.endsWith(':'+suffix)&&row.resource_graph.costTreatment==='OWN_COST')).toHaveLength(1);
 expect(matrix.positions.hydro.some(position=>position.category==='equipment'&&/pump|plant/u.test(position.key))).toBe(false);
 expect(matrix.positions.hydro.some(position=>['water','paint','linseed-oil','linen'].includes(position.key))).toBe(false);
});
test('a real paint order is explicit, paid once, and is not a second normative consumption charge',async()=>{
 const next=remainingThreeProjectResourceCompositionR5(parent('paint'),'paint');
 const result=await compile('paint',next,selected('paint',facts('paint'),'paint-ma25',separate,'13'),{[row('paint','paint-ma25')]:{unitPrice:'77',provenance}});
 expect(result.rows.find(item=>item.row_id===row('paint','paint-ma25'))).toMatchObject({quantity:'13',unit_id:'kg',unit_price:'77',amount:'1001'});
 expect(result.rows.find(item=>item.row_id.endsWith(':ready-ma25-paint-consumption'))).toMatchObject({unit_price:null,amount:null,included_in_estimate:false});
 expect(result.rows.filter(item=>item.row_id.startsWith(row('paint','paint-ma25','')))).toHaveLength(1);
});
test('soil transport uses explicit trips and actual reception mass without a bank-volume conversion',async()=>{
 const next=remainingThreeProjectResourceCompositionR5(parent('trench'),'trench');
 let input=selected('trench',facts('trench'),'spoil-transport',separate,'3');input=selected('trench',input,'spoil-reception',separate,'7.25');
 const result=await compile('trench',next,input,{[row('trench','spoil-transport')]:{unitPrice:'77',provenance}});
 expect(result.rows.find(item=>item.row_id===row('trench','spoil-transport'))).toMatchObject({quantity:'3',unit_id:'trip',amount:'231'});
 expect(result.rows.find(item=>item.row_id===row('trench','spoil-reception'))).toMatchObject({quantity:'7.25',unit_id:'t'});
 for(const id of ['spoil-transport','spoil-reception']){
  const resource=next.resources.find(item=>item.row_id===row('trench',id))!;
  expect(next.formulas.find(formula=>formula.formula_id===resource.formula_id)?.expression_source).toBe(prefix('trench_r5',id)+'_quantity');
 }
});
test('the hose included in the project pump has one owner and cannot outlive that owner silently',async()=>{
 const next=remainingThreeProjectResourceCompositionR5(parent('trench'),'trench');
 let input=selected('trench',facts('trench'),'water-pump',separate,'2');input=selected('trench',input,'water-hose',includedIn('Насос для защиты сухой траншеи от воды'),'20');
 const result=await compile('trench',next,input,{[row('trench','water-pump')]:{unitPrice:'77',provenance}});
 expect(result.rows.find(item=>item.row_id===row('trench','water-pump'))).toMatchObject({quantity:'2',amount:'154'});
 expect(result.rows.find(item=>item.row_id===row('trench','water-hose','included-in-water-pump-separate'))).toMatchObject({quantity:'20',unit_price:null,included_in_estimate:false});
  const ownerId=row('trench','water-pump'),hoseId=row('trench','water-hose','included-in-water-pump-separate'),before=canonicalEstimateStableJson({next,input}),
   checks=next.resources.filter(resource=>{const scope=resource.resource_graph.scopeRequirementV1 as {coveringRowIds?:string[];originalRowIds?:string[]}|undefined;
    return scope?.coveringRowIds?.includes(ownerId)&&scope.originalRowIds?.includes(hoseId);});
  expect(checks).toHaveLength(1);const check=checks[0]!;
  expect(check.resource_graph.scopeRequirementV1).toMatchObject({kind:'INCLUDED',costExclusionBreaksScopeV1:true,coveringRowIds:[ownerId]});
  const record=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
   const decision=(value:Record<string,unknown>)=>{
    const trace=value.calculation_trace;
    if(!record(trace)||!record(trace.resourceGraph))throw Error('TEST_SCOPE_RESOURCE_TRACE_REQUIRED');
    const result=trace.resourceGraph.scopeRequirementDecisionV1;
    if(!record(result)||typeof result.status!=='string'||typeof result.rowId!=='string')throw Error('TEST_SCOPE_DECISION_REQUIRED');
    return result;
   };
  expect(decision(result.rows.find(value=>value.row_id===check.row_id)!)).toMatchObject({status:'INCLUDED',rowId:check.row_id});
  const excluded=await compile('trench',next,input,{[ownerId]:{includedInEstimate:false,provenance}}),held=excluded.preliminaryNeeds.find(value=>value.row_id===check.row_id)!;
  expect(held).toBeDefined();expect(decision(held)).toMatchObject({status:'REQUIRED_RESOURCE_EXCLUDED',rowId:check.row_id});
  expect(held).toMatchObject({need_state:'CONDITION_REQUIRED',selected:false,procurement_eligible:false,unit_price:null});
  expect(excluded.rows.some(value=>value.row_id===check.row_id)).toBe(false);
  const restored=await compile('trench',next,input,{[ownerId]:{includedInEstimate:true,unitPrice:'77',provenance}});
  expect(decision(restored.rows.find(value=>value.row_id===check.row_id)!)).toMatchObject({status:'INCLUDED',rowId:check.row_id});
  expect(restored.preliminaryNeeds.some(value=>value.row_id===check.row_id)).toBe(false);
  for(const state of [result,excluded,restored]){expect(state.rows.filter(value=>value.row_id===hoseId)).toHaveLength(1);
   expect(state.rows.find(value=>value.row_id===hoseId)).toMatchObject({quantity:'20',unit_price:null,amount:null,included_in_estimate:false,included_in_procurement:false});
   expect(state.rows.filter(value=>value.row_id===ownerId)).toHaveLength(1);}
  expect(excluded.totals.amount).toBe('0');expect(restored.totals.amount).toBe('154');
  expect(canonicalEstimateStableJson({next,input})).toBe(before);
});
test.each(keys)('%s history uses exact public bindings and preserves manual names and priced informational rows',key=>{
 const p=parent(key),before=JSON.stringify(p);
 for(const [id,binding]of Object.entries(matrix.publicNames[key])){
  const saved=p.resources.find(row=>row.row_id===id)!;const input={rowId:id,titleRu:saved.title_ru,descriptor:saved.resource_graph.publicResourcePresentationV1,
   costTreatment:saved.resource_graph.costTreatment,category:saved.category,graph:saved.resource_graph};
  if(input.descriptor!=null&&!parseCanonicalPublicResourcePresentationV1(input.descriptor)){
   // A malformed legacy descriptor is never repaired through a display alias.
   expect(canonicalPublicResourceDisplayPresentationV1(input)).toBeNull();
  }else expect(canonicalPublicResourceDisplayPresentationV1(input)?.nameRu).toBe(binding.nameRu);
  if(saved.resource_graph.costTreatment==='OWN_COST')expect(canonicalPublicResourceRowKindV1(input)).toBe('RESOURCE');
  if('rowKind'in binding&&binding.rowKind==='CALCULATION_DETAIL'){
   expect(canonicalPublicResourceRowKindV1(input)).toBe('CALCULATION_DETAIL');
   expect(canonicalPublicResourceRowKindV1({...input,unitPrice:'0'})).toBe('RESOURCE');
  }
  expect(canonicalPublicResourceDisplayPresentationV1({...input,manualTitleOverride:true})).toBeNull();
 }
 expect(JSON.stringify(p)).toBe(before);
});
test.each(keys)('%s rejects an unverified source column',key=>{
 const p=parent(key),owner=p.resources.find(row=>row.category==='labor'&&row.resource_graph.costTreatment==='OWN_COST')!;
 owner.source_metadata={...owner.source_metadata,normativeTrace:[]};
 expect(()=>remainingThreeProjectResourceCompositionR5(p,key)).toThrow('THREE_RESOURCE_EXACT_RETAINED_PARENT_REQUIRED');
});
