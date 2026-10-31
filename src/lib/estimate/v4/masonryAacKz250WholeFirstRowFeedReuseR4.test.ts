import assert from 'node:assert/strict';
import {test} from 'node:test';
import {resolve} from 'node:path';
import {mkdirSync,writeFileSync} from 'node:fs';
import {buildMasonryAacKz250CurrentCardSuccessorR4 as build,masonryAacExactV5ParentR4 as captured,compileMasonryAacKz250CurrentCardR4 as compile} from './masonryAacKz250CurrentCardR4';
import {MASONRY_AAC_KZ250_WHOLE_R4 as own} from './masonryAacKz250WholeCycleR4';
import {MASONRY_AAC_FIRST_ROW_FEED_REUSE_R4 as feed,masonryAacWholeFirstRowFeedCompletenessEntriesR4} from './masonryAacKz250WholeFirstRowFeedReuseR4';
import {MASONRY_M50_WHOLE_CYCLE_R2 as flow,masonryM50CycleIdR2 as oldId,masonryM50CycleRowR2 as flowRow} from './masonryReadyM50WholeSupplyCycleR2';
import {m50LiftRowR4,m50LiftIdR4} from './masonryM50EffectiveLiftCorrectionR4';
import {MASONRY_AAC_KZ250_NORM_OBJECT_BOUNDARY_R4 as objectScope} from './masonryAacKz250NormObjectBoundaryR4';
import {canonicalEstimateResourceOperationSections} from '../backendPlatform/canonicalEstimateOperationComposition';
import {resolveInclusionGraph} from '../backendPlatform/inclusionGraph';
import {masonryAacKz250CurrentCardConfigR4 as configOf} from '../../../../scripts/estimate/r4a13/prepareMasonryAacKz250CurrentCardR4';

const parent=captured(),model=build(parent),row=(key:string)=>own.prefix+':'+key;
const geometry=(L='4',A='0')=>({m33_masonry_wall_length_m:L,m33_masonry_wall_height_m:'3',m33_masonry_openings_area_m2:A,m33_masonry_storey_height_m:'3'});
const profile={[own.selectorId]:own.selectorValue,[feed.selectorId]:feed.selectorValue};
// This is explicitly a test fixture, never an object-document import or a
// runtime default. Actual missing facts are tested separately below.
const documented=(handler='2000',crane='2000')=>({...profile,aackz4_mortar_density_kg_m3:'2000',aackz4_handler_mass_kg:'30',aackz4_handler_limit_kg:handler,aackz4_crane_limit_kg:crane,
 ...Object.fromEntries(flow.records.map(record=>[oldId(record.key+'_reference'),'TEST_ONLY document fixture; not actual-site confirmation'])),
 ...Object.fromEntries(objectScope.facts.map(fact=>[fact.id,'TEST_ONLY actual-wall document fixture; no real project supplied'])),
 ...Object.fromEntries(['box1_eye_mm','box2_eye_mm','box3_eye_mm'].map(key=>[oldId(key),'17']))});
const manual=(quantity:string)=>({quantity,provenance:{kind:'manual',reason:'TEST_ONLY explicit saved resource amendment'}});
const all=(result:Awaited<ReturnType<typeof compile>>)=>[...result.rows,...result.preliminaryNeeds];
type Trace={physicalScopeExcludedV1?:unknown;resourceGraph:{scopeRequirementDecisionV1?:{status:string};operationCompositionV1?:unknown}};
const scope=(result:Awaited<ReturnType<typeof compile>>,id:string)=>{const resource=all(result).find(resource=>resource.row_id===id);return resource?(resource.calculation_trace as Trace).resourceGraph.scopeRequirementDecisionV1:undefined;};
// Informational inventory is physically visible even though it is unpaid.
// Only an actual physical exclusion removes a marker or its shared display.
const sections=(result:Awaited<ReturnType<typeof compile>>)=>canonicalEstimateResourceOperationSections(all(result).filter(resource=>!(resource.calculation_trace as Trace).physicalScopeExcludedV1).map(resource=>({rowId:resource.row_id,titleRu:String(resource.title_ru),operation:(resource.calculation_trace as Trace).resourceGraph.operationCompositionV1})));
function observe(key:string,result:Awaited<ReturnType<typeof compile>>){
 const directory=resolve(__dirname,'../../../..','family-observations');mkdirSync(directory,{recursive:true});
 const wanted=new Set([...feed.physicalRowIds,feed.mortarOwner,feed.scopeRow,feed.coverageRow,objectScope.rowId]);
 const project=(resource:(typeof result.rows)[number]|(typeof result.preliminaryNeeds)[number])=>({rowId:resource.row_id,quantity:resource.quantity,unitId:resource.unit_id,needState:resource.need_state,missingParameterIds:resource.missing_parameter_ids,physicalExclusion:(resource.calculation_trace as Trace).physicalScopeExcludedV1??null,graph:(resource.calculation_trace as Trace).resourceGraph});
 writeFileSync(resolve(directory,key+'.json'),JSON.stringify({scope:'ACTUAL_FAMILY_FRAGMENT_NOT_API_OR_WHOLE_ACCEPTANCE',rows:result.rows.filter(resource=>wanted.has(resource.row_id)).map(project),preliminaryNeeds:result.preliminaryNeeds.filter(resource=>wanted.has(resource.row_id)).map(project),full:false},null,2)+'\n');
}

test('whole accepted physical roster and process identities are reused without foreign paid quantities',()=>{
 assert.equal(feed.physicalRowIds.length,19);assert.equal(feed.operationIds.length,8);
 for(const id of feed.physicalRowIds){const source=model.resources.find(resource=>resource.row_id===id);assert(source,id);assert.equal(source.resource_graph.costTreatment,'INFORMATIONAL_SCOPE');assert.equal(source.procurement_eligible,false);assert.equal(source.source_metadata.foreignFinancialNormTransferred,false);}
 assert.deepEqual(model.formulas.slice(0,parent.formulas.length),parent.formulas);assert.deepEqual(model.bindings,parent.bindings);
 assert.equal(model.resources.filter(resource=>resource.row_id===feed.mortarOwner).length,1);
 assert(!model.resources.some(resource=>resource.row_id==='masonry:wall:krer08-02-001-07:mortar'));
 for(const op of feed.operationIds){const formula=model.formulas.find(item=>item.formula_id===model.resources.find(resource=>resource.row_id===op)!.formula_id)!;assert.equal(formula.expression_source,feed.effectiveMortar);assert(!formula.expression_source.includes('0.234'));}
 const batch=model.parameters.find(parameter=>parameter.parameter_id===oldId('batch_reference'))!;assert(batch.title_ru.includes('цементно-песчаного'));assert(!batch.title_ru.includes('М50'));
 assert.equal(new Set(model.resources.map(resource=>resource.row_id)).size,model.resources.length);
 assert.equal(masonryAacWholeFirstRowFeedCompletenessEntriesR4().length,22);
 assert.equal(model.passport.decision.completeTechnicalEstimateAccepted,false);
});

test('first-row effective quantity changes the whole physical flow while source inventory is not multiplied by geometry',async()=>{
 for(const [L,A,quantity] of [['4','0','0.051'],['8','0','0.102'],['4','1','0.04675']]){
  const result=await compile(model,geometry(L,A),{confirmedParameters:profile});
  observe('source-only-'+L+'-'+A,result);
  assert.equal(result.rows.find(resource=>resource.row_id===feed.mortarOwner)?.quantity,quantity);
  for(const id of feed.operationIds){const resource=all(result).find(resource=>resource.row_id===id);assert.equal(resource?.quantity,quantity,id);assert.equal(result.preliminaryNeeds.find(resource=>resource.row_id===id)?.need_state,'CONDITION_REQUIRED','Actual documents remain mandatory even when the normative process quantity is known');}
  for(const item of flow.roster){const resource=result.rows.find(resource=>resource.row_id===flowRow(item.key));assert.equal(resource?.quantity,item.quantity,item.key);assert.equal(resource?.included_in_procurement,false);}
  assert.equal(scope(result,feed.scopeRow)?.status,'OBJECT_FACT_REQUIRED');
  assert.equal(scope(result,objectScope.rowId)?.status,'OBJECT_FACT_REQUIRED');
 }
 const zero=await compile(model,geometry('4','12'),{confirmedParameters:profile});
 assert(!all(zero).some(resource=>feed.physicalRowIds.includes(resource.row_id)));assert.equal(zero.derivedParameters.aackz4_net_wall_area_m2,'0');
});

test('saved manual first-row volume drives all eight stages and the exact upper-handler and hook limits',async()=>{
 const rowOverrides={[feed.mortarOwner]:manual('0.75')};
 const result=await compile(model,geometry(),{confirmedParameters:documented('1635','1665'),rowOverrides});
 assert.equal(result.derivedParameters[feed.effectiveMortar],'0.75');
 for(const id of feed.operationIds)assert.equal(result.rows.find(resource=>resource.row_id===id)?.quantity,'0.75');
 for(const key of ['first-row-handler-control','first-row-crane-control'])assert.equal(result.rows.find(resource=>resource.row_id===row(key))?.quantity,'0');
 assert.equal(result.rows.filter(resource=>resource.row_id===feed.mortarOwner).length,1);
 await assert.rejects(()=>compile(model,geometry(),{confirmedParameters:documented('1635','1664.99'),rowOverrides}),{code:'FORMULA_OUTPUT_BOUNDS_FAILED'});
 // Nominal0.051 gives267kg at the hook. It must never replace the1665kg
 // actual amended0.75 lift when deciding the permissible load.
 await assert.rejects(()=>compile(model,geometry(),{confirmedParameters:documented('300','300'),rowOverrides:{...rowOverrides,[row('first-row-crane-control')]:manual('0')}}),{code:'FORMULA_OUTPUT_BOUNDS_FAILED'});
 const missing=await compile(model,geometry(),{confirmedParameters:profile,rowOverrides});assert(all(missing).some(resource=>resource.row_id===row('first-row-crane-control')&&resource.quantity===null));
 assert.equal(model.resources.filter(resource=>resource.row_id===m50LiftRowR4('upper-load')||resource.row_id===m50LiftRowR4('crane-load')).length,0);
});

test('actual return and waste stay unknown until supplied and their saved amendments use the accepted balance control',async()=>{
 const base={[feed.mortarOwner]:manual('0.75')};
 const unknown=await compile(model,geometry(),{confirmedParameters:documented(),rowOverrides:base});
 for(const key of ['returned-mortar','waste-mortar'])assert(all(unknown).some(resource=>resource.row_id===flowRow(key)&&resource.quantity===null));
 const values={...documented(),[oldId('returned_mortar_kg')]:'0',[oldId('waste_mortar_kg')]:'0'};
 const good=await compile(model,geometry(),{confirmedParameters:values,rowOverrides:{...base,[flowRow('returned-mortar')]:manual('200'),[flowRow('waste-mortar')]:manual('100')}});
 assert.equal(good.derivedParameters[m50LiftIdR4('effective_return_kg')],'200');assert.equal(good.derivedParameters[m50LiftIdR4('effective_waste_kg')],'100');
 assert.equal(good.rows.find(resource=>resource.row_id===m50LiftRowR4('return-balance'))?.quantity,'0');
 await assert.rejects(()=>compile(model,geometry(),{confirmedParameters:values,rowOverrides:{...base,[flowRow('returned-mortar')]:manual('1100'),[flowRow('waste-mortar')]:manual('500'),[m50LiftRowR4('return-balance')]:manual('0')}}),{code:'FORMULA_OUTPUT_BOUNDS_FAILED'});
});

test('real common projector displays the original mortar, whole source roster and unresolved provision at their actual consumers',async()=>{
 const result=await compile(model,geometry(),{confirmedParameters:profile}),projected=sections(result);
 for(const operationId of feed.operationIds){const section=projected.find(section=>section.operation?.operationId===operationId);assert(section,operationId);assert.equal(section.operation!.groupId,own.prefix);assert.equal(section.sharedResources.filter(resource=>resource.rowId===feed.mortarOwner).length,1);assert(!section.resourceIds.includes(feed.mortarOwner));}
 for(const item of flow.roster)for(const key of item.operations){const section=projected.find(section=>section.operation?.operationId===flowRow('operation:'+key));assert(section,item.key+':'+key);assert(section.resourceIds.includes(flowRow(item.key))||section.sharedResources.some(resource=>resource.rowId===flowRow(item.key)),item.key+':'+key);}
 for(const [need,operation] of [['whole_material_handling','feed'],['whole_access','feed'],['whole_cutting_ppe_control','clean'],['whole_residue_external_supply','receive']]){
  assert(result.preliminaryNeeds.some(resource=>resource.row_id===row(need)&&resource.quantity===null));
  assert(projected.find(section=>section.operation?.operationId===flowRow('operation:'+operation))?.sharedResources.some(resource=>resource.rowId===row(need)));
 }
 const excluded=await compile(model,geometry(),{confirmedParameters:profile,compositionSelectionV1:{contractVersion:'canonical-estimate-composition-selection/v1',excludedOperationKeys:[],excludedRowIds:[flowRow('operation:feed')]}});
 observe('projector-before-exclusion',result);observe('projector-after-feed-exclusion',excluded);
 assert.equal(scope(excluded,feed.coverageRow)?.status,'REQUIRED_RESOURCE_EXCLUDED');
 const removed=sections(excluded).find(section=>section.operation?.operationId===flowRow('operation:feed'));
 assert(!removed?.sharedResources.some(resource=>resource.rowId===feed.mortarOwner));
});

test('object documents, source-owned technical fields and mandatory requirements cannot be supplied or cleared by a consumer shortcut',async()=>{
 const missing=await compile(model,geometry(),{confirmedParameters:profile});assert.equal(scope(missing,feed.scopeRow)?.status,'OBJECT_FACT_REQUIRED');
 const zero=await compile(model,geometry(),{confirmedParameters:profile,rowOverrides:{[feed.scopeRow]:manual('0')}});assert.equal(scope(zero,feed.scopeRow)?.status,'OBJECT_FACT_REQUIRED');
 assert.equal(scope(missing,objectScope.rowId)?.status,'OBJECT_FACT_REQUIRED');
 const wallZero=await compile(model,geometry(),{confirmedParameters:profile,rowOverrides:{[objectScope.rowId]:manual('0')}});assert.equal(scope(wallZero,objectScope.rowId)?.status,'OBJECT_FACT_REQUIRED');
 for(const id of [feed.scopeRow,m50LiftRowR4('return-balance'),objectScope.rowId])await assert.rejects(()=>compile(model,geometry(),{confirmedParameters:profile,compositionSelectionV1:{contractVersion:'canonical-estimate-composition-selection/v1',excludedOperationKeys:[],excludedRowIds:[id]}}),{code:'COMPOSITION_SELECTION_INVALID'});
 await assert.rejects(()=>compile(model,geometry(),{confirmedParameters:profile,compositionSelectionV1:{contractVersion:'canonical-estimate-composition-selection/v1',excludedOperationKeys:[JSON.stringify([own.prefix,objectScope.operationId])],excludedRowIds:[]}}),{code:'COMPOSITION_SELECTION_INVALID'});
 for(const value of ['TEST_ONLY',null,undefined])await assert.rejects(()=>compile(model,{...geometry(),[oldId('batch_reference')]:value},{confirmedParameters:profile}),{code:'PARAMETER_VALIDATION_FAILED'});
 for(const fact of objectScope.facts)for(const value of ['TEST_ONLY',null,undefined])await assert.rejects(()=>compile(model,{...geometry(),[fact.id]:value},{confirmedParameters:profile}),{code:'PARAMETER_VALIDATION_FAILED'});
 const complete=await compile(model,geometry(),{confirmedParameters:documented()});assert.equal(scope(complete,feed.scopeRow)?.status,'COMPLETED');assert.equal(scope(complete,objectScope.rowId)?.status,'COMPLETED');
 for(const key of ['whole_access','whole_material_handling','whole_cutting_ppe_control','whole_residue_external_supply'])assert(complete.preliminaryNeeds.some(resource=>resource.row_id===row(key)&&resource.quantity===null));
 assert.equal(model.passport.decision.completeTechnicalEstimateAccepted,false);
});

test('existing normal Config carries only four ordinary geometry facts and its two application-owned source choices',async()=>{
 const config=configOf({releaseId:parent.definition.release_id,searchReleaseId:'TEST_ONLY no publication',sourceRoot:resolve(__dirname,'../../../..')});
 assert.deepEqual(config.runtimeProfileInput,profile);assert.deepEqual(config.runtimeProfileClassification,{[own.selectorId]:'NORMATIVE',[feed.selectorId]:'NORMATIVE'});assert.deepEqual(Object.keys(config.shortInput).sort(),Object.keys(geometry()).sort());
 assert.deepEqual(config.acceptanceInput,{...profile,...geometry()});assert(!Object.hasOwn(config.acceptanceInput,'q'));
 const visible=model.parameters.filter(parameter=>parameter.truth_metadata.visibility_role==='USER_INPUT'&&resolveInclusionGraph(parameter.truth_metadata.visible_when??{kind:'literal',value:true},{...geometry(),...profile}).value===true).map(parameter=>parameter.parameter_id);assert.deepEqual(visible.sort(),Object.keys(geometry()).sort());
 assert.equal(config.binding.retainParentBindings?.successorProvenanceAppendV1?.contract,'master-retained-binding-append/v1');
 assert.equal((await config.verifyCore()).status,'PASS_CURRENT_CARD_OWN_KZ250_REUSE_FRAGMENT_NOT_WHOLE_ACCEPTANCE');
});
