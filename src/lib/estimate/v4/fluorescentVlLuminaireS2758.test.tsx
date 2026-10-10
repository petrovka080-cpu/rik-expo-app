import React from 'react';import TestRenderer,{act} from 'react-test-renderer';
import {fluorescentVlPackS2758 as pack,fluorescentVlPrefixS2758 as prefix,fluorescentVlDefinitionS2758,compileFluorescentVlS2758,ownLuminaireLiftS2758,hiredLuminaireLiftS2758} from './fluorescentVlLuminaireS2758';
import {fluorescentVlControlS2758,verifyFluorescentVlS2758} from '../../../../scripts/estimate/r4a13/preflightS2758FluorescentVl';
import {buildMasterParameterCalculationConsumers} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import type {CanonicalEstimateCatalogItem} from '../backendPlatform/contracts';
import {buildConsumerCanonicalPrecompileParameterSession,consumerCanonicalPrecompileParameterOverrides} from '../../../features/consumerRepair/consumerCanonicalParameterEditor';
import {buildCanonicalBaselinePlan} from '../../../features/consumerRepair/consumerCanonicalBaselineCompile';
import {buildCanonicalParameterCards} from '../../estimatePresentation/buildCanonicalParameterCards';
import {ParameterDisclosurePanel} from '../../../features/consumerRepair/ConsumerRepairProgressiveEstimatePanel';
import {compileCanonicalEstimateCore} from '../backendPlatform/canonicalEstimateCompileCore';import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {ownLuminaireTruckS2758,hiredLuminaireTruckS2758} from './incandescentVlLuminaireS2758';

jest.mock('@expo/vector-icons',()=>({Ionicons:()=>null}));
function catalog():CanonicalEstimateCatalogItem{
  const d=fluorescentVlDefinitionS2758(),c=buildMasterParameterCalculationConsumers(d);
  return {catalogId:pack.catalogId,titleRu:pack.titleRu,releaseId:'00000000-0000-5000-8000-000000000001',namespace:'global',domain:'electrical',workKey:pack.workKey,definitionVersion:1,applicability:{primaryMeasureParameterId:'luminaire_count'},professionalMetadata:{},
    parameterSchema:d.parameters.map(p=>{const t=p.truth_metadata,g=t.guide as Record<string,unknown>;return {parameterId:p.parameter_id,ordinal:p.ordinal,titleRu:p.title_ru,valueType:p.value_type,unitId:p.unit_id,required:p.required,defaultValue:p.default_value,constraints:p.constraints_json,visibilityRole:t.visibility_role,valueSourceRole:t.value_source_role,preliminaryCompilationAllowed:t.preliminary_compilation_allowed,semanticParameterKey:t.semantic_parameter_key,provenance:t.provenance,requiredWhen:t.required_when,
      formulaConsumers:c.formulaConsumers[p.parameter_id],resourceBranchConsumers:c.resourceConsumers[p.parameter_id],guide:{guideKind:g.guide_kind,guideShortRu:g.guide_short_ru,guideValidationPolicy:g.guide_validation_policy,sourceRole:g.source_role,sourceDocument:g.source_document,sourceLocator:g.source_locator,sourceSnapshotHash:g.source_snapshot_hash,guideVersion:g.guide_version,applicability:g.applicability,verifiedAt:g.verified_at}} as CanonicalEstimateCatalogItem['parameterSchema'][number];})};
}
function session(parameters:Record<string,unknown>){return buildConsumerCanonicalPrecompileParameterSession({catalog:catalog(),draftId:'lighting-prepublication',parameters:parameters as Record<string,string|number>,userExplicitParameterIds:Object.keys(parameters),missingParameterIds:[]});}
async function amended(input:Record<string,unknown>,rowId:string,quantity:number|null){const d=fluorescentVlDefinitionS2758();return compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:pack.contract,catalogId:pack.catalogId,primaryMeasureParameterId:'luminaire_count',parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:input,confirmedParameters:{},currencyCode:'KGS',priceItems:[],maximumResourceRows:33,hashJson:async v=>estimateDeterministicHash(v),rowOverrides:{[prefix+':'+rowId]:{quantity,provenance:{kind:'manual',reason:'CONTROL_ONLY bypass negative'}}}});}

it('matches primary column02 rates, project units and finite partial composition',async()=>{expect(await verifyFluorescentVlS2758()).toMatchObject({shape:[76,33,33],own:[25,6,7],bothHired:[25,6,9],acceptedCompleteTypes:0});});
it.each([[1,'2.29','0.11','0.00006','0.01'],[3,'6.87','0.33','0.00018','0.03'],[11,'25.19','1.21','0.00066','0.11']] as const)('uses frozen column02 source cells at N%s, independent of project material masses',async(n,labor,truck,gas,grease)=>{
  const r=await compileFluorescentVlS2758(fluorescentVlControlS2758(n)),byId=new Map(r.rows.map(x=>[x.row_id,x]));
  for(const [id,q] of [['whole-labor',labor],['truck-consumed',truck],['solvent_gasoline-consumed',gas],['zes_grease-consumed',grease],['construction_bolts-consumed','0.0073'],['brackets-consumed','27'],['steel_clamps-consumed','8.5'],['rubber_insulated_wire-consumed','0.0024']])expect(byId.get(prefix+':'+id)?.quantity).toBe(q);
  expect(byId.get(prefix+':fluorescent_luminaires-consumed')?.quantity).toBe(String(n));
  for(const m of pack.materials.filter(x=>x.projectDefined)){const row=byId.get(prefix+':'+m.id+'-consumed')!;expect(row.normative_trace).toEqual([]);expect(row.calculation_trace).toMatchObject({resourceGraph:{projectQuantityProvenanceV1:{quantityOrigin:'DOCUMENTED_PROJECT_TOTAL_NOT_OFFICIAL_NUMERIC_NORM',printedQuantityCell:'П'}}});}
  expect(pack.materials.find(m=>m.id==='rubber_insulated_wire')?.sourceUnitId).toBe('t');
  expect(r.rows.filter(x=>x.included_in_estimate&&x.category==='labor')).toHaveLength(1);
});
it('rounds seven independent actual balances with stock and reserve, keeping source consumption',async()=>{
  const input=fluorescentVlControlS2758(),oracles=[['solvent_gasoline',0.3,0.1,0.25,'0.5'],['zes_grease',0.1,0.05,0.1,'0.1'],['construction_bolts',0.003,0.001,0.002,'0.006'],['brackets',20,2,5,'10'],['steel_clamps',5,1,2,'6'],['fluorescent_luminaires',4,1,4,'8'],['rubber_insulated_wire',0.001,0.0001,0.001,'0.002']] as const;
  for(const [id,s,r,q] of oracles)Object.assign(input,{[id+'_stock']:s,[id+'_reserve']:r,[id+'_quantum']:q,[id+'_stock_compatibility_reference']:'CONTROL_ONLY: exact suitable compatible material'});
  const result=await compileFluorescentVlS2758(input);for(const [id,,,,q] of oracles)expect(result.rows.find(r=>r.row_id===prefix+':'+id)?.quantity).toBe(q);
  expect(result.rows.find(r=>r.row_id===prefix+':solvent_gasoline-consumed')?.quantity).toBe('0.00066');expect(result.preliminaryNeeds).toHaveLength(6);
});
it('retains physical totals when all orders are fully covered by actual stock',async()=>{
  const input=fluorescentVlControlS2758(),stock:Record<string,number>={solvent_gasoline:0.66,zes_grease:0.11,construction_bolts:0.0073,brackets:27,steel_clamps:8.5,fluorescent_luminaires:11,rubber_insulated_wire:0.0024};
  for(const [id,n] of Object.entries(stock))Object.assign(input,{[id+'_stock']:n,[id+'_stock_compatibility_reference']:'CONTROL_ONLY: exact suitable material'});
  const r=await compileFluorescentVlS2758(input);expect(r.rows.filter(x=>x.included_in_procurement&&Number(x.quantity)>0)).toHaveLength(0);expect(r.rows.find(x=>x.row_id===prefix+':brackets-consumed')?.quantity).toBe('27');expect(r.preliminaryNeeds).toHaveLength(6);
});
it.each([ownLuminaireTruckS2758,hiredLuminaireTruckS2758,undefined])('preserves the single physical truck and exclusive optional mode %s',async mode=>{
  const r=await compileFluorescentVlS2758({...fluorescentVlControlS2758(),truck_fulfillment:mode});expect(r.rows.find(x=>x.row_id===prefix+':truck-consumed')?.quantity).toBe('1.21');
  expect(r.rows.filter(x=>['truck-own','truck-hired'].some(id=>x.row_id===prefix+':'+id))).toHaveLength(mode?1:0);
  expect(r.rows.filter(x=>x.included_in_procurement)).toHaveLength(mode===hiredLuminaireTruckS2758?8:7);expect(r.rows.some(x=>/driver-pay|aerial/.test(x.row_id))).toBe(false);
  expect(buildCanonicalParameterCards({session:session({...fluorescentVlControlS2758(),truck_fulfillment:mode}),revision:null}).find(c=>c.key==='truck_fulfillment')?.value).toBe(mode??null);
});
it.each(['solvent_gasoline_supply_specification','construction_bolts_supply_specification','project_material_supply_scope'])('holds only purchase scope when %s is absent',async missing=>{
  const input={...fluorescentVlControlS2758(),[missing]:undefined},r=await compileFluorescentVlS2758(input);
  expect(r.rows.find(x=>x.row_id===prefix+':construction_bolts-consumed')?.quantity).toBe('0.0073');expect(r.rows.find(x=>x.row_id===prefix+':solvent_gasoline-consumed')?.quantity).toBe('0.00066');
  if(missing==='project_material_supply_scope')expect(r.rows.filter(x=>x.included_in_procurement)).toHaveLength(2);
  else expect(r.rows.some(x=>x.row_id===prefix+':'+missing.replace('_supply_specification',''))).toBe(false);
});
it.each([[ownLuminaireTruckS2758,'own'],[hiredLuminaireTruckS2758,'hired']] as const)('uses accepted physical truck quantity for the selected %s cost and restores the norm on clear',async(mode,id)=>{
  const input={...fluorescentVlControlS2758(),truck_fulfillment:mode};
  for(const [quantity,expected] of [[2,'2'],[null,'1.21']] as const){
    const r=await amended(input,'truck-consumed',quantity),physical=r.rows.find(x=>x.row_id===prefix+':truck-consumed')!,selected=r.rows.find(x=>x.row_id===prefix+':truck-'+id)!;
    expect(physical.quantity).toBe(expected);expect(selected.quantity).toBe(expected);expect(selected.included_in_estimate).toBe(true);expect(selected.included_in_procurement).toBe(id==='hired');
    expect(physical.included_in_estimate).toBe(false);expect(physical.included_in_procurement).toBe(false);expect(r.rows.filter(x=>/truck-(own|hired)$/.test(x.row_id))).toHaveLength(1);expect(r.preliminaryNeeds).toHaveLength(6);
    expect(selected.calculation_trace).toMatchObject({resourceGraph:{operatorCostOwnership:'DRIVER_INCLUDED_IN_MACHINE_PRICE_NO_SECOND_OWNER'}});
    expect(r.rows.find(x=>x.row_id===prefix+':whole-labor')?.quantity).toBe('25.19');
  }
  for(const missing of ['construction_scope_conditions','ready_support_connection_reference','pole_attachment_height_m','access_method_reference']){
    const held=await amended({...input,[missing]:undefined},'truck-consumed',2);expect(held.rows.some(x=>/truck-(consumed|own|hired)$/.test(x.row_id))).toBe(false);
  }
});
it.each(['construction_bolts','brackets','steel_clamps','fluorescent_luminaires','rubber_insulated_wire'])('cannot bypass missing documented project total/specification for %s with manual quantity',async id=>{
  for(const suffix of ['project_total','project_specification']){const input={...fluorescentVlControlS2758(),[id+'_'+suffix]:undefined};const r=await amended(input,id+'-consumed',1);expect(r.rows.some(x=>x.row_id===prefix+':'+id+'-consumed')).toBe(false);expect(r.preliminaryNeeds.some(x=>x.row_id===prefix+':'+id+'-consumed')).toBe(true);}
});
it.each([0,1])('rejects manual quantity%s on source-owned access need',async quantity=>{await expect(amended(fluorescentVlControlS2758(),'additional-access',quantity)).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});});
it.each([['brackets',40,'40'],['solvent_gasoline',0.002,'2'],['construction_bolts',0.01,'0.01']] as const)('propagates explicit physical %s amendment through the one effective consumption owner',async(id,quantity,order)=>{
  const r=await amended(fluorescentVlControlS2758(),id+'-consumed',quantity),physical=r.rows.find(x=>x.row_id===prefix+':'+id+'-consumed')!,buy=r.rows.find(x=>x.row_id===prefix+':'+id)!;
  expect(physical.quantity).toBe(String(quantity));expect(buy.quantity).toBe(order);expect(buy.calculation_trace).toMatchObject({purchaseBalance:{consumed:order}});
  expect(r.preliminaryNeeds).toHaveLength(6);expect(r.rows.find(x=>x.row_id===prefix+':whole-labor')?.quantity).toBe('25.19');
});
it.each(['11 шт','11шт.','11 штук'])('binds normal short input %s to the scope only',tail=>{const p=buildCanonicalBaselinePlan({catalog:catalog(),prompt:pack.titleRu+' '+tail});expect(p.parameters.luminaire_count).toBe('11');expect(Object.keys(p.parameters)).toEqual(['luminaire_count']);});
it('exposes all 47 zero-stock and 54 positive-stock ordinary controls before publication',()=>{
  const input=fluorescentVlControlS2758(),s=session(input),cards=buildCanonicalParameterCards({session:s,revision:null}),ids=cards.filter(c=>c.editable).map(c=>c.key);expect(ids).toHaveLength(47);expect(ids).toContain('pole_attachment_height_m');expect(ids).toContain('project_material_supply_scope');
  for(const m of pack.materials)input[m.id+'_stock']=1;
  const positive=session(input),active=buildCanonicalParameterCards({session:positive,revision:null});expect(active.filter(c=>c.editable)).toHaveLength(54);
  for(const m of pack.materials)expect(active.find(c=>c.key===m.id+'_stock_compatibility_reference')?.editable).toBe(true);
  expect(active.some(c=>/open_scope_qty_|effective_resource_quantity_/.test(c.key))).toBe(false);
  let renderer!:TestRenderer.ReactTestRenderer;act(()=>{renderer=TestRenderer.create(<ParameterDisclosurePanel revision={null} viewModel={null} canonicalParameterSession={positive} latestDiff={null} paramEditorEnabled/>);});
  for(const id of ['request-estimate-show-more-parameters','request-estimate-filled-parameters-toggle','request-estimate-advanced-parameters-toggle']){const node=renderer.root.findAll(n=>typeof n.props.onPress==='function'&&n.props.testID===id)[0];if(node?.props.onPress)act(()=>node.props.onPress());}
  for(const m of pack.materials)expect(renderer.root.findAllByProps({testID:'editable-param-inline-editor-'+m.id+'_stock_compatibility_reference'}).length).toBeGreaterThan(0);
  for(const c of active.filter(c=>c.editable))expect(renderer.root.findAllByProps({testID:'editable-param-inline-editor-'+c.key}).length).toBeGreaterThan(0);
  const changed=consumerCanonicalPrecompileParameterOverrides({session:positive,patches:pack.materials.map(m=>({operation:'add_param' as const,paramKey:m.id+'_stock_compatibility_reference',rawValue:'CONTROL_ONLY: exact suitable material'}))});
  expect(session(changed).parameters.filter(p=>p.parameterId.endsWith('_stock_compatibility_reference')&&p.value!=null)).toHaveLength(7);act(()=>renderer.unmount());
});


it.each([[ownLuminaireLiftS2758,ownLuminaireTruckS2758,7],[hiredLuminaireLiftS2758,ownLuminaireTruckS2758,8],[ownLuminaireLiftS2758,hiredLuminaireTruckS2758,8],[hiredLuminaireLiftS2758,hiredLuminaireTruckS2758,9]] as const)('keeps two exclusive machine owners for lift%s and truck%s',async(lift,truck,buy)=>{
  const input={...fluorescentVlControlS2758(),hydraulic_lift_fulfillment:lift,truck_fulfillment:truck},r=await compileFluorescentVlS2758(input);
  expect(r.rows.filter(x=>x.included_in_procurement)).toHaveLength(buy);
  expect(r.rows.filter(x=>/hydraulic-lift-(own|hired)$/.test(x.row_id))).toHaveLength(1);expect(r.rows.filter(x=>/truck-(own|hired)$/.test(x.row_id))).toHaveLength(1);
  const aggregate=r.rows.find(x=>x.row_id===prefix+':machine-operators-included')!;expect(aggregate.quantity).toBe('8.8');expect(aggregate.included_in_estimate).toBe(false);expect(aggregate.included_in_procurement).toBe(false);
  const source=fluorescentVlDefinitionS2758().resources.find(x=>x.row_id===aggregate.row_id)!;expect(source.resource_graph).not.toHaveProperty('parentCostOwnerId');expect(source.source_metadata).toMatchObject({aggregateOperatorQuantityNotAllocatedToSingleParent:true});
  for(const id of ['hydraulic_lift_fulfillment','truck_fulfillment'])expect(buildCanonicalParameterCards({session:session(input),revision:null}).find(c=>c.key===id)?.value).toBe(input[id as keyof typeof input]);
});
it.each([[ownLuminaireLiftS2758,'own'],[hiredLuminaireLiftS2758,'hired']] as const)('propagates physical lift amendment through selected %s without amending aggregate operators',async(mode,id)=>{
  for(const [q,expected] of [[12,'12'],[null,'8.8']] as const){const r=await amended({...fluorescentVlControlS2758(),hydraulic_lift_fulfillment:mode},'hydraulic-lift-consumed',q);expect(r.rows.find(x=>x.row_id===prefix+':hydraulic-lift-consumed')?.quantity).toBe(expected);expect(r.rows.find(x=>x.row_id===prefix+':hydraulic-lift-'+id)?.quantity).toBe(expected);expect(r.rows.find(x=>x.row_id===prefix+':machine-operators-included')?.quantity).toBe('8.8');}
});
it.each(['construction_scope_conditions','ready_support_connection_reference','pole_attachment_height_m','access_method_reference','lift_access_compatibility_reference'])('cannot bypass missing actual scope/access fact %s by either physical machine amendment',async missing=>{
  for(const id of ['hydraulic-lift','truck']){const r=await amended({...fluorescentVlControlS2758(),[missing]:undefined},id+'-consumed',2);expect(r.rows.some(x=>/:(hydraulic-lift|truck)-(consumed|own|hired)$/.test(x.row_id))).toBe(false);}
});
it('keeps both machine modes unselected by default and retains physical work',async()=>{
  const input={...fluorescentVlControlS2758(),hydraulic_lift_fulfillment:undefined,truck_fulfillment:undefined},r=await compileFluorescentVlS2758(input);
  expect(r.rows.find(x=>x.row_id===prefix+':hydraulic-lift-consumed')?.quantity).toBe('8.8');expect(r.rows.find(x=>x.row_id===prefix+':truck-consumed')?.quantity).toBe('1.21');expect(r.rows.some(x=>/:(hydraulic-lift|truck)-(own|hired)$/.test(x.row_id))).toBe(false);
  expect(r.preliminaryNeeds).toHaveLength(10);for(const id of ['hydraulic_lift_fulfillment','truck_fulfillment']){const p=fluorescentVlDefinitionS2758().parameters.find(p=>p.parameter_id===id)!;expect(p.default_value).toBeNull();expect(p.required).toBe(false);expect(buildCanonicalParameterCards({session:session(input),revision:null}).find(c=>c.key===id)?.value).toBeNull();}
});
it.each([['zes_grease',0.5,'0.5'],['steel_clamps',12,'12'],['fluorescent_luminaires',12,'12'],['rubber_insulated_wire',0.005,'0.005']] as const)('uses one effective physical owner for remaining material %s',async(id,q,order)=>{const r=await amended(fluorescentVlControlS2758(),id+'-consumed',q);expect(r.rows.find(x=>x.row_id===prefix+':'+id)?.quantity).toBe(order);expect(r.rows.find(x=>x.row_id===prefix+':'+id)?.calculation_trace).toMatchObject({purchaseBalance:{consumed:order}});});
it.each([['construction_scope_conditions',pack.scopeValueRu],['project_material_supply_scope',pack.projectSupplyScopeRu],['hydraulic_lift_fulfillment',ownLuminaireLiftS2758],['hydraulic_lift_fulfillment',hiredLuminaireLiftS2758],['truck_fulfillment',ownLuminaireTruckS2758],['truck_fulfillment',hiredLuminaireTruckS2758]] as const)('applies the actual inline choice %s = %s as one explicit patch',async(id,value)=>{
  const input={...fluorescentVlControlS2758(),[id]:undefined},apply=jest.fn((_patches:unknown[])=>true);let renderer!:TestRenderer.ReactTestRenderer;
  act(()=>{renderer=TestRenderer.create(<ParameterDisclosurePanel revision={null} viewModel={null} canonicalParameterSession={session(input)} latestDiff={null} paramEditorEnabled onApplyParamBatch={apply}/>);});
  const press=(testID:string)=>{const node=renderer.root.findAll(n=>n.props.testID===testID&&typeof n.props.onPress==='function')[0];expect(node).toBeDefined();act(()=>node.props.onPress());};
  for(const toggle of ['request-estimate-show-more-parameters','request-estimate-filled-parameters-toggle','request-estimate-advanced-parameters-toggle']){const node=renderer.root.findAll(n=>n.props.testID===toggle&&typeof n.props.onPress==='function')[0];if(node)act(()=>node.props.onPress());}
  press('editable-param-option-'+id+'-'+value);await act(async()=>{const button=renderer.root.findAll(n=>n.props.testID==='editable-param-batch-apply'&&typeof n.props.onPress==='function')[0];expect(button.props.disabled).not.toBe(true);await button.props.onPress();});
  expect(apply).toHaveBeenCalledTimes(1);expect(apply.mock.calls[0]?.[0]).toEqual([{operation:'add_param',paramKey:id,rawValue:value}]);act(()=>renderer.unmount());
});
