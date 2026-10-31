import {createHash} from 'node:crypto';
import fixtures from '../../../../data/estimate-benchmarks/fixtures/four-work-resource-parents-r4.json';
import matrix from '../../../../data/estimate-benchmarks/source-packs/four-work-project-resource-composition-r4.json';
import {fourWorkProjectResourceCompositionR4,type FourWorkResourceKeyR4} from './fourWorkProjectResourceCompositionR4';
import type {AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {projectResourceParameterPrefixR1 as prefix,projectResourceSeparateR1 as separate,projectResourceIncludedR1 as included,
 projectResourceNotRequiredR1 as notRequired,projectResourceRequiredR1 as required,projectResourceIncludedInPositionR1 as includedIn} from './projectSubworkResourceScheduleR1';
import {canonicalEstimateStableJson} from '../backendPlatform/canonicalEstimateDeterminism';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {canonicalEstimateOperationReferences} from '../backendPlatform/canonicalEstimateOperationComposition';
import {parseCanonicalPublicResourcePresentationV1,canonicalPublicResourceDisplayPresentationV1,canonicalPublicResourceRowKindV1} from '../backendPlatform/canonicalPublicResourcePresentationV1';
import {canonicalPublicEstimateRowNameRu} from '../backendPlatform/canonicalPublicEstimateLanguageRu';
const keys:FourWorkResourceKeyR4[]=['brick','ceramic','kerb','sand'];
const parent=(key:FourWorkResourceKeyR4)=>structuredClone(fixtures[key]) as unknown as AutomaticOwnerDefinition;
const measure={brick:'net_partition_area_m2',ceramic:'net_ceramic_floor_area_m2',kerb:'kerb_length_m',sand:'floor_sand_net_volume_m3'};
const provenance={kind:'manual' as const,reason:'VALIDATION_FIXTURE; не реальная цена или ведомость'};
const row=(key:FourWorkResourceKeyR4,id:string,branch='included')=>'subwork-resource:'+key+'_r4:'+id+':'+branch;
function facts(key:FourWorkResourceKeyR4){
 const result:Record<string,unknown>={...fixtures[key].validationInput};
 for(const item of matrix.positions[key]){const p=prefix(key+'_r4',item.key);
  if(item.optional){result[p+'_required']=notRequired;continue;}
  Object.assign(result,{[p+'_payment']:included,[p+'_quantity']:'1',[p+'_specification']:'Проверочный ресурс',
   [p+'_reference']:'VALIDATION_FIXTURE; проверочная ведомость обеспечения, не реальный договор'});
 }return result;
}
function selected(key:FourWorkResourceKeyR4,input:Record<string,unknown>,id:string,payment=separate,quantity='1'){
 const p=prefix(key+'_r4',id);return {...input,[p+'_required']:required,[p+'_payment']:payment,[p+'_quantity']:quantity,
  [p+'_specification']:'Проверочный ресурс',[p+'_reference']:'VALIDATION_FIXTURE; отдельная непересекающаяся граница цены'};
}
function compile(key:FourWorkResourceKeyR4,definition:AutomaticOwnerDefinition,input:Record<string,unknown>,rowOverrides:CanonicalEstimateCompileCoreInput['rowOverrides']={}){
 return compileCanonicalEstimateCore({operation:'recalculate',catalogId:matrix.sources[key].catalogId,compilerVersion:matrix.contract,
  primaryMeasureParameterId:measure[key],parameterDefinitions:[...definition.parameters],formulaDefinitions:[...definition.formulas],resourceDefinitions:[...definition.resources],
  submittedParameters:input,confirmedParameters:{},priceItems:[],currencyCode:'KGS',maximumResourceRows:definition.resources.length,rowOverrides,
  hashJson:value=>createHash('sha256').update(canonicalEstimateStableJson(value)).digest('hex')});
}
test.each(keys)('%s uses the captured current parent and keeps its original parameters, formulas, units and source owners',key=>{
 const p=parent(key),before=JSON.stringify(p),next=fourWorkProjectResourceCompositionR4(p,key);
 expect(JSON.stringify(p)).toBe(before);expect(next.parameters.slice(0,p.parameters.length)).toEqual(p.parameters);
 expect(next.formulas.slice(0,p.formulas.length)).toEqual(p.formulas);
 for(const old of p.resources){const retained=next.resources.find(row=>row.row_id===old.row_id)!;
  for(const field of ['unit_id','formula_id','cost_owner_id'])expect(retained[field as keyof typeof retained]).toEqual(old[field as keyof typeof old]);
  const replacement=retained.resource_graph.supersededAggregateNeedV1 as {resourceRowIds:string[]}|undefined;
  if(replacement){
   expect(retained.inclusion_ast).toEqual({kind:'literal',value:false});expect(replacement.resourceRowIds.length).toBeGreaterThan(0);
   expect(replacement.resourceRowIds.every(id=>next.resources.some(resource=>resource.row_id===id))).toBe(true);
   const formula=p.formulas.find(formula=>formula.formula_id===old.formula_id)!;
   expect(formula.input_parameter_ids.some(id=>p.parameters.find(parameter=>parameter.parameter_id===id)?.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM')).toBe(true);
  }else expect(retained.inclusion_ast).toEqual(old.inclusion_ast);
 }
 expect(next.parameters.length).toBeLessThanOrEqual(256);expect(next.resources.length).toBeLessThanOrEqual(128);
 expect(()=>fourWorkProjectResourceCompositionR4(next,key)).toThrow('FOUR_RESOURCE_ALREADY_APPLIED');
});
test.each(keys)('%s names each new resource, assigns its subwork and does not invent quantities or a new norm',key=>{
 const next=fourWorkProjectResourceCompositionR4(parent(key),key),oldIds=new Set(parent(key).parameters.map(p=>p.parameter_id));
 expect(matrix.positions[key].length).toBeGreaterThan(20);
 for(const resource of next.resources.filter(row=>row.row_id.startsWith('subwork-resource:')&&!row.row_id.includes(':ownership-check:'))){
  expect(canonicalEstimateOperationReferences(resource.resource_graph.operationCompositionV1).length).toBeGreaterThan(0);
  expect(resource.source_metadata).toMatchObject({projectTakeoffNotNorm:true,universal_consumption_claimed:false,automaticGenericPriceInheritanceAllowed:false});
  expect(resource.cost_owner_id).toBe(resource.row_id);expect(parseCanonicalPublicResourcePresentationV1(resource.resource_graph.publicResourcePresentationV1)).not.toBeNull();
 }
 for(const parameter of next.parameters.filter(p=>!oldIds.has(p.parameter_id)))expect(parameter.truth_metadata.value_source_role).toBe('PROJECT_SPECIFIC_INPUT');
 expect(Object.keys(next.runtimeInput)).toEqual(Object.keys(parent(key).runtimeInput));
});
test.each(keys)('%s keeps the old monetary rows and totals exact when provision is included, including a saved manual77 price',async key=>{
 const p=parent(key),next=fourWorkProjectResourceCompositionR4(p,key);
 const priced=p.resources.find(row=>row.category==='material'&&row.resource_graph.costTreatment==='OWN_COST')!;
 const overrides={[priced.row_id]:{unitPrice:'77',provenance}};
 const before=await compile(key,p,fixtures[key].validationInput,overrides),after=await compile(key,next,facts(key),overrides);
 for(const old of before.rows.filter(row=>row.unit_price!=null||row.included_in_estimate)){
  const retained=after.rows.find(row=>row.row_id===old.row_id)!;expect(retained).toBeDefined();
  for(const field of ['quantity','unit_id','unit_price','amount','included_in_estimate','included_in_procurement','title_ru'])
   expect(retained[field as keyof typeof retained]).toEqual(old[field as keyof typeof old]);
 }
 expect(after.totals.amount).toBe(before.totals.amount);
 const provision=after.rows.filter(row=>row.row_id.startsWith('subwork-resource:')&&!row.row_id.includes(':ownership-check:'));
 expect(provision.length).toBeGreaterThan(0);expect(provision.every(row=>row.unit_price==null&&!row.included_in_estimate&&!row.included_in_procurement)).toBe(true);
});
test.each(keys)('%s preserves unresolved resource needs and never treats missing provision as zero',async key=>{
 const result=await compile(key,fourWorkProjectResourceCompositionR4(parent(key),key),fixtures[key].validationInput);
 expect(result.preliminaryNeeds.some(row=>row.row_id.startsWith('subwork-resource:'))).toBe(true);
 expect(result.rows.some(row=>row.row_id.startsWith('subwork-resource:')&&row.included_in_estimate)).toBe(false);
});
test('brick keeps the existing selected delivery and does not add a second default material delivery',()=>{
 const old=parent('brick'),next=fourWorkProjectResourceCompositionR4(old,'brick');
 const delivery='delivery:selected-material:ford-transit-v363';
 const {row_sha256:_next,...nextBody}=next.resources.find(row=>row.row_id===delivery)!;
 const {row_sha256:_old,...oldBody}=old.resources.find(row=>row.row_id===delivery)!;
 expect(nextBody).toEqual(oldBody);
 expect(matrix.positions.brick.some(position=>position.category==='transport'&&position.key!=='waste-transport')).toBe(false);
});
test('kerb keeps existing timber, nails and curing compound instead of adding duplicate generic purchases',()=>{
 const next=fourWorkProjectResourceCompositionR4(parent('kerb'),'kerb');
 expect(matrix.positions.kerb.some(row=>['formwork','formwork-fixings','curing-compound','water'].includes(row.key))).toBe(false);
 expect(next.resources.filter(row=>row.row_id.endsWith(':antisol250w-us'))).toHaveLength(1);
});
test('a sand air hose can belong to the existing compressor offer and remains visible with that single price owner',async()=>{
 const p=parent('sand'),next=fourWorkProjectResourceCompositionR4(p,'sand');
 const input=selected('sand',facts('sand'),'air-hose',includedIn('Работа компрессора'),'20');
 const result=await compile('sand',next,input),hose=result.rows.find(item=>item.row_id===row('sand','air-hose','included-in-existing-0'))!;
 expect(hose).toBeDefined();expect(hose.quantity).toBe('20');expect(hose.included_in_estimate).toBe(false);expect(hose.unit_price).toBeNull();
 expect((hose.calculation_trace as {resourceGraph:{includedInResourceOwnerRowId:string}}).resourceGraph.includedInResourceOwnerRowId)
  .toBe('floor-underlayer:sand:krer11-01-002-01:equipment:compressor');
 const ownerId='floor-underlayer:sand:krer11-01-002-01:equipment:compressor',hoseId=row('sand','air-hose','included-in-existing-0');
 const before=JSON.stringify({p,next,input});
 const checks=next.resources.filter(resource=>{
  const scope=resource.resource_graph.scopeRequirementV1 as {coveringRowIds?:string[];originalRowIds?:string[]}|undefined;
  return scope?.coveringRowIds?.includes(ownerId)&&scope.originalRowIds?.includes(hoseId);
 });
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
 const includedCheck=result.rows.find(value=>value.row_id===check.row_id)!;expect(includedCheck).toBeDefined();
 expect(decision(includedCheck)).toMatchObject({rowId:check.row_id,status:'INCLUDED'});
 const excluded=await compile('sand',next,input,{[ownerId]:{includedInEstimate:false,provenance}});
 const held=excluded.preliminaryNeeds.find(value=>value.row_id===check.row_id)!;expect(held).toBeDefined();
 expect(decision(held)).toMatchObject({rowId:check.row_id,status:'REQUIRED_RESOURCE_EXCLUDED'});
 expect(held).toMatchObject({need_state:'CONDITION_REQUIRED',selected:false,procurement_eligible:false,unit_price:null});
 expect(excluded.rows.some(value=>value.row_id===check.row_id)).toBe(false);
 expect(excluded.rows.find(value=>value.row_id===ownerId)).toMatchObject({included_in_estimate:false});
 const restored=await compile('sand',next,input,{[ownerId]:{includedInEstimate:true,provenance}});
 const restoredCheck=restored.rows.find(value=>value.row_id===check.row_id)!;expect(restoredCheck).toBeDefined();
 expect(decision(restoredCheck)).toMatchObject({rowId:check.row_id,status:'INCLUDED'});
 expect(restored.preliminaryNeeds.some(value=>value.row_id===check.row_id)).toBe(false);
 for(const state of [result,excluded,restored]){
  expect(state.rows.filter(value=>value.row_id===hoseId)).toHaveLength(1);
  expect(state.rows.find(value=>value.row_id===hoseId)).toMatchObject({quantity:'20',included_in_estimate:false,included_in_procurement:false,unit_price:null});
  expect(state.rows.filter(value=>value.row_id===ownerId)).toHaveLength(1);
  expect(state.totals.amount).toBe('0');
 }
 expect(JSON.stringify({p,next,input})).toBe(before);
});
test('an individual separate tile cutter price is charged once and its included blade is not charged again',async()=>{
 const next=fourWorkProjectResourceCompositionR4(parent('ceramic'),'ceramic');
 let input=selected('ceramic',facts('ceramic'),'tile-cutter',separate,'2');input=selected('ceramic',input,'cutting-blade',includedIn('Плиткорез'),'1');
 const result=await compile('ceramic',next,input,{[row('ceramic','tile-cutter','separate')]:{unitPrice:'77',provenance}});
 expect(result.rows.find(item=>item.row_id===row('ceramic','tile-cutter','separate'))).toMatchObject({quantity:'2',unit_price:'77',amount:'154'});
 const blades=result.rows.filter(item=>item.row_id.startsWith(row('ceramic','cutting-blade','')));expect(blades).toHaveLength(1);
 expect(blades[0]).toMatchObject({unit_price:null,amount:null,included_in_estimate:false,included_in_procurement:false});
});
test('a different source column or a missing current parent never receives the resource overlay',()=>{
 const p=parent('ceramic');p.resources[0]!.source_metadata={...p.resources[0]!.source_metadata,normativeTrace:[]};
 expect(()=>fourWorkProjectResourceCompositionR4(p,'ceramic')).toThrow('FOUR_RESOURCE_EXACT_RETAINED_PARENT_REQUIRED');
});
test.each(keys)('%s old saved rows receive the same clear names and counter roles without changing stored values',key=>{
 const p=parent(key),snapshot=JSON.stringify(p),bindings=matrix.publicNames[key] as Record<string,{sourceTitleRu:string;nameRu:string;rowKind?:string}>;
 for(const [rowId,binding]of Object.entries(bindings)){
  const saved=p.resources.find(row=>row.row_id===rowId)!,input={rowId,titleRu:saved.title_ru,descriptor:saved.resource_graph.publicResourcePresentationV1,
   costTreatment:saved.resource_graph.costTreatment,category:saved.category,graph:saved.resource_graph};
  const display=canonicalPublicResourceDisplayPresentationV1(input);
  expect(display?.nameRu).toBe(canonicalPublicEstimateRowNameRu({rowId,sourceTitleRu:saved.title_ru,titleRu:binding.nameRu}));
  if(rowId==='material:concrete:membrane-curing-compound:antisol250w-us'){
   const source=parseCanonicalPublicResourcePresentationV1(saved.resource_graph.publicResourcePresentationV1);
   expect(display?.nameRu).toBe('Состав для ухода за бетоном, 19 л');expect(display?.specificationRu).toContain('19 л');
   expect(source).toMatchObject({sourceTitleRu:saved.title_ru,brandAndModelRu:'Sika Antisol-250 W, США',
    specificationRu:'Готовый состав для ухода; канистра 19 л; новая поверхность после обработки щёткой'});
   expect(saved.unit_id).toBe('l');expect(saved.source_metadata).toMatchObject({sourceRole:'APPROXIMATE_MANUFACTURER_NOMINAL',
    completionScope:'MATERIAL_QUANTITY_ONLY_ORIGINAL_NEED_REMAINS_OPEN',full_technical_acceptance:false});
  }
  if(binding.rowKind==='CALCULATION_DETAIL'){
   expect(canonicalPublicResourceRowKindV1(input)).toBe('CALCULATION_DETAIL');
   expect(canonicalPublicResourceRowKindV1({...input,unitPrice:'0'})).toBe('RESOURCE');
  }
  expect(canonicalPublicResourceDisplayPresentationV1({...input,manualTitleOverride:true})).toBeNull();
  expect(canonicalPublicResourceDisplayPresentationV1({...input,titleRu:'Другой ресурс',descriptor:null})).toBeNull();
 }
 expect(JSON.stringify(p)).toBe(snapshot);
});
