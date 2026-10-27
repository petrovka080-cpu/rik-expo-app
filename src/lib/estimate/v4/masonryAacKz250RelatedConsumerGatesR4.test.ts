import assert from 'node:assert/strict';
import {test} from 'node:test';
import {resolve} from 'node:path';
import {mkdirSync,writeFileSync} from 'node:fs';
import {buildMasonryAacKz250CurrentCardSuccessorR4 as build,masonryAacExactV5ParentR4 as captured,compileMasonryAacKz250CurrentCardR4 as compile} from './masonryAacKz250CurrentCardR4';
import {MASONRY_AAC_KZ250_WHOLE_R4 as own} from './masonryAacKz250WholeCycleR4';
import {MASONRY_AAC_FIRST_ROW_FEED_REUSE_R4 as feed} from './masonryAacKz250WholeFirstRowFeedReuseR4';
import {MASONRY_M50_WHOLE_CYCLE_R2 as flow,masonryM50CycleRowR2 as flowRow} from './masonryReadyM50WholeSupplyCycleR2';
import {canonicalEstimateResourceOperationSections} from '../backendPlatform/canonicalEstimateOperationComposition';
import {masonryAacKz250CurrentCardConfigR4 as configOf} from '../../../../scripts/estimate/r4a13/prepareMasonryAacKz250CurrentCardR4';

const parent=captured(),model=build(parent),row=(key:string)=>own.prefix+':'+key;
const geometry={m33_masonry_wall_length_m:'4',m33_masonry_wall_height_m:'3',m33_masonry_openings_area_m2:'0',m33_masonry_storey_height_m:'3'};
const profile={[own.selectorId]:own.selectorValue,[feed.selectorId]:feed.selectorValue};
const boxes=flowRow('boxes'),boxTitle='Растворный ящик из сохранённой правки';
const rowOverrides={[boxes]:{unitPrice:'123',titleRu:boxTitle,provenance:{kind:'manual',reason:'TEST_ONLY saved common owner name and reference price; no actual procurement or site document'}}};
const selection=(ids:string[])=>({contractVersion:'canonical-estimate-composition-selection/v1' as const,excludedOperationKeys:[],excludedRowIds:ids});
type Result=Awaited<ReturnType<typeof compile>>;
type Trace={physicalScopeExcludedV1?:unknown;resourceGraph:{scopeRequirementDecisionV1?:{status:string};operationCompositionV1?:unknown}};
const all=(result:Result)=>[...result.rows,...result.preliminaryNeeds];
const projected=(result:Result)=>canonicalEstimateResourceOperationSections(all(result).filter(resource=>!(resource.calculation_trace as Trace).physicalScopeExcludedV1).map(resource=>({rowId:resource.row_id,titleRu:String(resource.title_ru),operation:(resource.calculation_trace as Trace).resourceGraph.operationCompositionV1})));
const coverage=(result:Result)=>(all(result).find(resource=>resource.row_id===feed.coverageRow)!.calculation_trace as Trace).resourceGraph.scopeRequirementDecisionV1!.status;
function observe(key:string,result:Result){
 const directory=resolve(__dirname,'../../../..','gate-observations');mkdirSync(directory,{recursive:true});
 const ids=new Set([...feed.physicalRowIds,feed.mortarOwner,feed.scopeRow,feed.coverageRow]);
 writeFileSync(resolve(directory,key+'.json'),JSON.stringify({scope:'ACTUAL_FAMILY_GATE_FRAGMENT_NOT_HTTP_UI_OR_WHOLE_ACCEPTANCE',resources:all(result).filter(resource=>ids.has(resource.row_id)),sections:projected(result),full:false},null,2)+'\n');
}
function assertOwnersUnchanged(result:Result){
 const sections=projected(result);
 for(const item of flow.roster){
  const id=flowRow(item.key),resource=all(result).find(resource=>resource.row_id===id)!;
  assert(resource,id);assert.equal(resource.quantity,item.quantity,id);assert.equal(resource.unit_id,item.unitId,id);
  assert.equal(resource.included_in_estimate,false,id);assert.equal(resource.included_in_procurement,false,id);
  assert.equal(all(result).filter(resource=>resource.row_id===id).length,1,id);
  const primaryOwners=sections.filter(section=>section.resourceIds.includes(id));assert.equal(primaryOwners.length,1,id);
  assert.equal(primaryOwners[0].operation!.operationId,flowRow('operation:'+item.operations[0]),id);
 }
 const saved=all(result).find(resource=>resource.row_id===boxes)!;assert.equal(saved.title_ru,boxTitle);assert.equal(saved.unit_price,'123');
 const mortar=all(result).filter(resource=>resource.row_id===feed.mortarOwner);assert.equal(mortar.length,1);assert.equal(mortar[0].quantity,'0.051');
 for(const id of feed.operationIds){const value=all(result).find(resource=>resource.row_id===id)!;if(!(value.calculation_trace as Trace).physicalScopeExcludedV1)assert.equal(value.quantity,'0.051',id);}
 for(const key of ['whole_access','whole_material_handling','whole_cutting_ppe_control','whole_residue_external_supply'])assert(result.preliminaryNeeds.some(resource=>resource.row_id===row(key)&&resource.quantity===null));
 assert.equal((all(result).find(resource=>resource.row_id===feed.scopeRow)!.calculation_trace as Trace).resourceGraph.scopeRequirementDecisionV1!.status,'OBJECT_FACT_REQUIRED');
 assert.equal(model.passport.decision.completeTechnicalEstimateAccepted,false);
}

test('physical stage deletion and restoration retain the original whole roster owners, saved price and single mortar payment',async()=>{
 const base=await compile(model,geometry,{confirmedParameters:profile,rowOverrides}),before=projected(base);assertOwnersUnchanged(base);observe('base',base);
 const feedOperation=flowRow('operation:feed'),five=['boxes','upper-handler','crane','riggers','crane-operator'];
 for(const key of five)assert(before.find(section=>section.operation?.operationId===feedOperation)?.sharedResources.some(resource=>resource.rowId===flowRow(key)),key);
 const single=await compile(model,geometry,{confirmedParameters:profile,rowOverrides,compositionSelectionV1:selection([feedOperation])});assertOwnersUnchanged(single);observe('feed-marker-removed',single);
 const removed=projected(single).find(section=>section.operation?.operationId===feedOperation);
 for(const id of [...five.map(flowRow),feed.mortarOwner])assert(!removed?.sharedResources.some(resource=>resource.rowId===id),id);
 assert.equal(coverage(single),'REQUIRED_RESOURCE_EXCLUDED');
 const stages=await compile(model,geometry,{confirmedParameters:profile,rowOverrides,compositionSelectionV1:selection([...feed.operationIds])});assertOwnersUnchanged(stages);observe('all-eight-markers-removed',stages);
 for(const item of flow.roster)for(const key of item.operations.slice(1))assert(!projected(stages).find(section=>section.operation?.operationId===flowRow('operation:'+key))?.sharedResources.some(resource=>resource.rowId===flowRow(item.key)),item.key+':'+key);
 assert.equal(coverage(stages),'REQUIRED_RESOURCE_EXCLUDED');
 const stock=await compile(model,geometry,{confirmedParameters:profile,rowOverrides,compositionSelectionV1:selection(flow.roster.map(item=>flowRow(item.key)))});observe('all-nine-stock-removed',stock);
 const removedStock=projected(stock);
 for(const item of flow.roster){const id=flowRow(item.key),resource=all(stock).find(resource=>resource.row_id===id)!;assert.equal(resource.quantity,'0');assert((resource.calculation_trace as Trace).physicalScopeExcludedV1);assert(!removedStock.some(section=>section.resourceIds.includes(id)||section.sharedResources.some(shared=>shared.rowId===id)));}
 assert.equal(all(stock).find(resource=>resource.row_id===boxes)!.unit_price,'123');assert.equal(coverage(stock),'REQUIRED_RESOURCE_EXCLUDED');
 const restored=await compile(model,geometry,{confirmedParameters:profile,rowOverrides,compositionSelectionV1:selection([])});assertOwnersUnchanged(restored);observe('restored',restored);
 // Absent and empty optional additionalOperations are the same operation contract.
 // Compare the persisted JSON contract: optional undefined keys have no JSON representation.
 // Preserve every nonempty value/relation, null/false/zero, IDs and arrays; do not erase provenance or gates.
 const normalized=(sections:ReturnType<typeof projected>)=>JSON.parse(JSON.stringify(sections.map(section=>({...section,operation:section.operation?{...section.operation,additionalOperations:section.operation.additionalOperations??[]}:null}))));
 assert.deepEqual(normalized(projected(restored)),normalized(before));
 for(const item of flow.roster)for(const key of item.operations){const section=projected(restored).find(section=>section.operation?.operationId===flowRow('operation:'+key));assert(section?.resourceIds.includes(flowRow(item.key))||section?.sharedResources.some(resource=>resource.rowId===flowRow(item.key)),item.key+':'+key);}
 for(const shared of projected(restored).flatMap(section=>section.sharedResources).filter(resource=>resource.rowId===boxes))assert.equal(shared.titleRu,boxTitle);
 assert.deepEqual(model.formulas.slice(0,parent.formulas.length),parent.formulas);assert.deepEqual(model.bindings,parent.bindings);
});

test('publication config retains exact historical assumption and two source selectors with four geometry fields',async()=>{
 const config=configOf({releaseId:parent.definition.release_id,searchReleaseId:'TEST_ONLY no publication',sourceRoot:resolve(__dirname,'../../../..')});assert.deepEqual(config.runtimeProfileInput,{q:parent.baseline.input_values.q,...profile});assert.equal(config.runtimeProfileClassification?.q,'ASSUMPTION');assert.deepEqual(config.runtimeProfileSourceIds?.q,parent.baseline.normative_source_ids.q);for(const key of Object.keys(profile)){assert.equal(config.runtimeProfileClassification?.[key],'NORMATIVE');assert.deepEqual(config.runtimeProfileSourceIds?.[key],[own.sourceId]);}assert.deepEqual(config.shortInput,geometry);assert.equal((await config.verifyCore()).status,'PASS_CURRENT_CARD_OWN_KZ250_REUSE_FRAGMENT_NOT_WHOLE_ACCEPTANCE');
});
