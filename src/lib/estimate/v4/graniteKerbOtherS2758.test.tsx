import React from 'react';import TestRenderer,{act} from 'react-test-renderer';
import {graniteKerbPackS2758 as pack,graniteKerbPrefixS2758 as prefix,graniteKerbOtherDefinitionS2758,compileGraniteKerbOtherS2758} from './graniteKerbOtherS2758';
import {graniteKerbControlS2758,verifyGraniteKerbOtherS2758} from '../../../../scripts/estimate/r4a13/preflightS2758GraniteKerbOther';
import {buildMasterParameterCalculationConsumers} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import type {CanonicalEstimateCatalogItem} from '../backendPlatform/contracts';
import {buildConsumerCanonicalPrecompileParameterSession} from '../../../features/consumerRepair/consumerCanonicalParameterEditor';
import {buildCanonicalBaselinePlan} from '../../../features/consumerRepair/consumerCanonicalBaselineCompile';
import {buildCanonicalParameterCards} from '../../estimatePresentation/buildCanonicalParameterCards';
import {ParameterDisclosurePanel} from '../../../features/consumerRepair/ConsumerRepairProgressiveEstimatePanel';
import {compileCanonicalEstimateCore} from '../backendPlatform/canonicalEstimateCompileCore';import {estimateDeterministicHash} from '../estimateDeterministicHash';
jest.mock('@expo/vector-icons',()=>({Ionicons:()=>null}));
function catalog():CanonicalEstimateCatalogItem{
  const d=graniteKerbOtherDefinitionS2758(),c=buildMasterParameterCalculationConsumers(d);
  return {catalogId:pack.catalogId,titleRu:pack.titleRu,releaseId:'00000000-0000-5000-8000-000000000001',namespace:'global',domain:'transport',workKey:pack.workKey,definitionVersion:1,applicability:{primaryMeasureParameterId:'kerb_length_m'},professionalMetadata:{},parameterSchema:d.parameters.map(p=>{const t=p.truth_metadata,g=t.guide as Record<string,unknown>;return {parameterId:p.parameter_id,ordinal:p.ordinal,titleRu:p.title_ru,valueType:p.value_type,unitId:p.unit_id,required:p.required,defaultValue:p.default_value,constraints:p.constraints_json,visibilityRole:t.visibility_role,valueSourceRole:t.value_source_role,preliminaryCompilationAllowed:t.preliminary_compilation_allowed,semanticParameterKey:t.semantic_parameter_key,provenance:t.provenance,requiredWhen:t.required_when,formulaConsumers:c.formulaConsumers[p.parameter_id],resourceBranchConsumers:c.resourceConsumers[p.parameter_id],guide:{guideKind:g.guide_kind,guideShortRu:g.guide_short_ru,guideValidationPolicy:g.guide_validation_policy,sourceRole:g.source_role,sourceDocument:g.source_document,sourceLocator:g.source_locator,sourceSnapshotHash:g.source_snapshot_hash,guideVersion:g.guide_version,applicability:g.applicability,verifiedAt:g.verified_at}} as CanonicalEstimateCatalogItem['parameterSchema'][number];})};
}
function session(parameters:Record<string,unknown>){return buildConsumerCanonicalPrecompileParameterSession({catalog:catalog(),draftId:'granite-prepublication',parameters:parameters as Record<string,string|number>,userExplicitParameterIds:Object.keys(parameters),missingParameterIds:[]});}
async function amended(input:Record<string,unknown>,id:string,quantity:number|null){const d=graniteKerbOtherDefinitionS2758();return compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:pack.contract,catalogId:pack.catalogId,primaryMeasureParameterId:'kerb_length_m',parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:input,confirmedParameters:{},currencyCode:'KGS',priceItems:[],maximumResourceRows:27,hashJson:async v=>estimateDeterministicHash(v),rowOverrides:{[prefix+':'+id]:{quantity,provenance:{kind:'manual',reason:'CONTROL_ONLY prepublication acceptance'}}}});}
const by=(r:Awaited<ReturnType<typeof compileGraniteKerbOtherS2758>>,id:string)=>r.rows.find(x=>x.row_id===prefix+':'+id);
it('reads the exact granite04 column and finite composition through the current core',async()=>{expect(await verifyGraniteKerbOtherS2758()).toMatchObject({shape:[50,27,27],own:[19,6,5],physicalResources:9,includedOperations:3,acceptedCompleteTypes:0});});
it('keeps cement-lime mortar and included granite cleaning distinct from old concrete kerbs',async()=>{
  const d=graniteKerbOtherDefinitionS2758(),r=await compileGraniteKerbOtherS2758(graniteKerbControlS2758());expect(by(r,'mortar-consumed')?.quantity).toBe('0.0213');expect(by(r,'mortar-consumed')?.title_ru).toContain('цементно-известковый');
  expect(pack.materials.find(m=>m.id==='mortar')?.sourceCode).toBeNull();expect(by(r,'granite-cleaning-operation')?.included_in_estimate).toBe(false);expect(r.rows.filter(x=>x.included_in_estimate&&x.category==='labor')).toHaveLength(1);
  const aggregate=d.resources.find(x=>x.row_id===prefix+':machine-operators-included')!;expect(aggregate.resource_graph).not.toHaveProperty('parentCostOwnerId');expect(aggregate.source_metadata).toMatchObject({aggregateOperatorQuantityNotAllocatedToSingleParent:true});
});
it('computes five independent balances with documented suitable stock and reserve',async()=>{
  const input=graniteKerbControlS2758();const oracle=[['nails',0.1,0.1,0.25,'0.5'],['timber',0.02,0.005,0.01,'0.05'],['concrete',1,0.1,0.2,'1.2'],['mortar',0.01,0.002,0.005,'0.015'],['stone',20,2,5,'20']] as const;
  for(const [id,s,r,q] of oracle)Object.assign(input,{[id+'_stock']:s,[id+'_reserve']:r,[id+'_quantum']:q,[id+'_stock_compatibility_reference']:'CONTROL_ONLY: документ соответствия точной позиции'});
  const r=await compileGraniteKerbOtherS2758(input);for(const [id,,,,q] of oracle)expect(by(r,id)?.quantity).toBe(q);expect(by(r,'nails-consumed')?.quantity).toBe('0.000355');expect(r.preliminaryNeeds).toHaveLength(6);
});
it('retains all source consumption with zero positive orders when stock covers the work',async()=>{
  const input=graniteKerbControlS2758();for(const [id,q] of [['nails',0.355],['timber',0.06035],['concrete',2.0945],['mortar',0.0213],['stone',35.5]] as const)Object.assign(input,{[id+'_stock']:q,[id+'_stock_compatibility_reference']:'CONTROL_ONLY: exact suitable material'});
  const r=await compileGraniteKerbOtherS2758(input);expect(r.rows.filter(x=>x.included_in_procurement&&Number(x.quantity)>0)).toHaveLength(0);expect(by(r,'stone-consumed')?.quantity).toBe('35.5');expect(by(r,'concrete-consumed')?.quantity).toBe('2.0945');
});
it.each([['nails',0.002,'2','0.000355','1'],['timber',0.1,'0.1','0.06035','0.07'],['concrete',3,'3','2.0945','2.1'],['mortar',0.03,'0.03','0.0213','0.022'],['stone',40,'40','35.5','36']] as const)('propagates and clears physical %s through its single balance owner',async(id,q,order,source,restoredOrder)=>{
  for(const [quantity,physical,purchase] of [[q,String(q),order],[null,source,restoredOrder]] as const){const r=await amended(graniteKerbControlS2758(),id+'-consumed',quantity);expect(by(r,id+'-consumed')?.quantity).toBe(physical);expect(by(r,id)?.quantity).toBe(purchase);expect(by(r,id)?.calculation_trace).toMatchObject({purchaseBalance:{consumed:id==='nails'?String(Number(physical)*1000):physical}});expect(by(r,'whole-labor')?.quantity).toBe('38.695');}
});
it.each(pack.materials.map(m=>m.id))('holds only %s purchase when its supply or positive-stock reference is absent',async id=>{
  const m=pack.materials.find(x=>x.id===id)!;for(const missing of [m.specificationId,id+'_stock_compatibility_reference']){const input={...graniteKerbControlS2758(),[missing]:undefined,...(missing.endsWith('_reference')?{[id+'_stock']:1}:{})};const r=await compileGraniteKerbOtherS2758(input);expect(by(r,id+'-consumed')).toBeDefined();expect(by(r,id)).toBeUndefined();}
});
it.each(pack.scopeFacts.map(f=>f.id))('cannot bypass missing scope fact %s through seven physical amendments',async missing=>{
  for(const id of ['crane','truck',...pack.materials.map(m=>m.id)]){const r=await amended({...graniteKerbControlS2758(),[missing]:undefined},id+'-consumed',1);expect(by(r,id+'-consumed')).toBeUndefined();expect(by(r,id)).toBeUndefined();}
});
it.each([[false,false,5],[true,false,6],[false,true,6],[true,true,7]] as const)('keeps independent crane/truck fulfillment %s/%s',async(craneHire,truckHire,buyer)=>{
  const input=graniteKerbControlS2758();input.crane_fulfillment=craneHire?pack.machines[0].hiredValue:pack.machines[0].ownValue;input.truck_fulfillment=truckHire?pack.machines[1].hiredValue:pack.machines[1].ownValue;
  const r=await compileGraniteKerbOtherS2758(input);expect(r.rows.filter(x=>x.included_in_procurement)).toHaveLength(buyer);for(const id of ['crane','truck'])expect(r.rows.filter(x=>new RegExp(':'+id+'-(own|hired)$').test(x.row_id))).toHaveLength(1);expect(by(r,'machine-operators-included')?.quantity).toBe('0.2414');expect(by(r,'machine-operators-included')?.included_in_estimate).toBe(false);
});
it.each([['crane',false],['crane',true],['truck',false],['truck',true]] as const)('amends and clears physical %s through selected fulfillment%s only',async(id,hire)=>{
  const m=pack.machines.find(x=>x.id===id)!,input={...graniteKerbControlS2758(),[m.parameterId]:hire?m.hiredValue:m.ownValue};
  for(const [q,expected] of [[2,'2'],[null,id==='crane'?'0.2414':'0.0142']] as const){const r=await amended(input,id+'-consumed',q);expect(by(r,id+'-consumed')?.quantity).toBe(expected);expect(by(r,id+'-'+(hire?'hired':'own'))?.quantity).toBe(expected);expect(by(r,'machine-operators-included')?.quantity).toBe('0.2414');}
});
it('keeps both unselected modes optional while the physical machine quantities remain known',async()=>{
  const r=await compileGraniteKerbOtherS2758({...graniteKerbControlS2758(),crane_fulfillment:undefined,truck_fulfillment:undefined});expect(r.rows).toHaveLength(17);expect(r.preliminaryNeeds).toHaveLength(10);expect(by(r,'crane-consumed')?.quantity).toBe('0.2414');for(const m of pack.machines){const p=graniteKerbOtherDefinitionS2758().parameters.find(x=>x.parameter_id===m.parameterId)!;expect(p.default_value).toBeNull();expect(p.required).toBe(false);}
});
it.each(pack.gaps.flatMap(g=>[0,1].map(q=>[g.id,q] as const)))('rejects source gap %s manual quantity%s',async(id,q)=>{await expect(amended(graniteKerbControlS2758(),id,q)).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});});
it.each(['35,5 м','35.5м','35,5 метров'])('binds normal short length %s without supplying norm or supplier facts',tail=>{const p=buildCanonicalBaselinePlan({catalog:catalog(),prompt:pack.titleRu+' '+tail});expect(p.parameters.kerb_length_m).toBe('35.5');expect(Object.keys(p.parameters)).toEqual(['kerb_length_m']);});
it('exposes every applicable final card and actual InlineEditor for zero/positive stock',()=>{
  for(const positive of [false,true]){const input=graniteKerbControlS2758();if(positive)for(const m of pack.materials)input[m.id+'_stock']=1;const s=session(input),cards=buildCanonicalParameterCards({session:s,revision:null}),editable=cards.filter(c=>c.editable);expect(editable).toHaveLength(positive?32:27);expect(cards.some(c=>/open_scope_qty_|effective_resource_quantity_/.test(c.key))).toBe(false);
    let renderer!:TestRenderer.ReactTestRenderer;act(()=>{renderer=TestRenderer.create(<ParameterDisclosurePanel revision={null} viewModel={null} canonicalParameterSession={s} latestDiff={null} paramEditorEnabled onApplyParamBatch={async()=>true}/>);});
    for(const toggle of ['request-estimate-show-more-parameters','request-estimate-filled-parameters-toggle','request-estimate-advanced-parameters-toggle']){const n=renderer.root.findAll(n=>n.props.testID===toggle&&typeof n.props.onPress==='function')[0];if(n)act(()=>n.props.onPress());}
    for(const card of editable)expect(renderer.root.findAll(n=>n.props.testID==='editable-param-inline-editor-'+card.key).length).toBeGreaterThan(0);act(()=>renderer.unmount());}
});
it.each([...pack.scopeFacts.map(f=>[f.id,f.value]),...pack.machines.flatMap(m=>[[m.parameterId,m.ownValue],[m.parameterId,m.hiredValue]])])('applies real saved inline choice %s=%s exactly once',async(id,value)=>{
  const apply=jest.fn((_patches:unknown[])=>true);let renderer!:TestRenderer.ReactTestRenderer;act(()=>{renderer=TestRenderer.create(<ParameterDisclosurePanel revision={null} viewModel={null} canonicalParameterSession={session({...graniteKerbControlS2758(),[id]:undefined})} latestDiff={null} paramEditorEnabled onApplyParamBatch={apply}/>);});
  for(const toggle of ['request-estimate-show-more-parameters','request-estimate-filled-parameters-toggle','request-estimate-advanced-parameters-toggle']){const n=renderer.root.findAll(n=>n.props.testID===toggle&&typeof n.props.onPress==='function')[0];if(n)act(()=>n.props.onPress());}
  const n=renderer.root.findAll(n=>n.props.testID==='editable-param-option-'+id+'-'+value&&typeof n.props.onPress==='function')[0];expect(n).toBeDefined();act(()=>n.props.onPress());await act(async()=>{const b=renderer.root.findAll(n=>n.props.testID==='editable-param-batch-apply'&&typeof n.props.onPress==='function')[0];expect(b.props.disabled).not.toBe(true);await b.props.onPress();});expect(apply).toHaveBeenCalledTimes(1);expect(apply.mock.calls[0]?.[0]).toEqual([{operation:'add_param',paramKey:id,rawValue:value}]);act(()=>renderer.unmount());
});
