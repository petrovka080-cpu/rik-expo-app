import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareInteriorWallFinishingExistingPaintR502 as prepare,prepareInteriorWallFinishingExistingPaintDraftR502 as draft,readInteriorWallFinishPinnedParentR502 as fixture,interiorWallFinishStagedBundleR502 as bundle} from './prepareInteriorWallFinishingExistingPaintR502';
import originalProof from '../../../data/estimate-benchmarks/fixtures/interior-wall-finishing-original35-proof-r240.json';
import {interiorWallFinishingGroupPackR502 as pack,interiorWallCementParameterR502 as p,interiorWallCementRowR502 as r} from '../../../src/lib/estimate/v4/interiorWallFinishingGroupR502';
import {assertCanonicalSubmittedSourceParameterAuthorityV1,validateCanonicalEstimateParameters} from '../../../src/lib/estimate/backendPlatform/parameterConstraints';
import {canonicalEstimateOperationReferences} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';

test('R240 existing paint: exact physical-source/authority guards before one ordinary4 callback',async()=>{
 const config=prepare(),d=draft(fixture().parent.capturedParent);
 assert.equal(config.catalogId,'canonical-work:base:plaster_paint_interior_paint_wall_paint_standard');
 assert(!config.catalogAppend);assert.equal(d.ordinaryParameterIds.length,4);
 assert.equal(originalProof.independentRowRules.length,35);
 assert.deepEqual(bundle.independentRowRules.slice(0,35),originalProof.independentRowRules);
 assert.deepEqual(bundle.paidOwnerKeys,originalProof.paidOwnerKeys);
 assert.deepEqual(pack.materials,originalProof.materials);assert.deepEqual(pack.labour,originalProof.labour);
 assert.deepEqual(originalProof.finitePriceExpected.expectedAmounts,{'ct225-order':3000,'primer-order':1000,'ct42-order':4500,'whole-work':5025});
 assert.equal(originalProof.finitePriceExpected.expectedTotalKgs,13525);
 assert.equal(pack.physicalKitR240.length,17);assert.equal(pack.selectedScopeQuantitiesComplete,false);
 const boundary=pack.physicalKitR240.filter(item=>['LOWER_BOUND','UPPER_BOUND'].includes(item.kind));
 const needs=pack.physicalKitR240.filter(item=>!['LOWER_BOUND','UPPER_BOUND'].includes(item.kind));
 assert.equal(boundary.length,2);assert.equal(needs.length,15);
 assert.equal(needs.filter(item=>item.kind==='SOURCE_GAP').length,2);
 assert.equal(needs.filter(item=>item.kind==='OBJECT_FACT').length,13);
 for(const item of needs){
  const parameter=d.parameters.find(value=>value.parameter_id===p('physical_'+item.inputId));assert(parameter);
  assert.equal(parameter.default_value,null);assert.equal(parameter.truth_metadata.visibility_role,'INTERNAL_ONLY');
  assert.equal(parameter.truth_metadata.provenance.approvedProjectReceiptPresent,false);
  assert(!Object.hasOwn(d.runtimeProfileInput,parameter.parameter_id));
  if(['item','pair'].includes(item.unitId)){
   assert.equal(parameter.value_type,'integer');assert.equal(parameter.constraints_json.min,1);
   assert.equal(parameter.default_value,null,'a minimum1 is not a default kit-count1');
   if(item.kind!=='SOURCE_GAP'){
    // Isolated numeric-contract check, never project authority or a core fact.
    for(const value of [0,.5,1.5])assert.throws(()=>validateCanonicalEstimateParameters([parameter],{}, {confirmedParameters:{[parameter.parameter_id]:value}}),/invalid integer|below minimum/);
    assert.equal(validateCanonicalEstimateParameters([parameter],{}, {confirmedParameters:{[parameter.parameter_id]:1}})[parameter.parameter_id],1);
   }
  }
  if(item.kind==='SOURCE_GAP'){
   assert.equal(parameter.truth_metadata.value_source_role,'UNRESOLVED_APPLICATION_NORM');
   assert.throws(()=>validateCanonicalEstimateParameters([parameter],{[parameter.parameter_id]:1}),/unresolved application norm cannot be supplied/);
   assert.throws(()=>validateCanonicalEstimateParameters([parameter],{}, {confirmedParameters:{[parameter.parameter_id]:1}}),/unresolved application norm cannot be supplied/);
  }else{
   assert.equal(parameter.truth_metadata.value_source_role,'PROJECT_DOCUMENTATION');
   assert.equal(parameter.truth_metadata.source_confirmation_required,true);
   assert.throws(()=>assertCanonicalSubmittedSourceParameterAuthorityV1(d.parameters,{[parameter.parameter_id]:1}),/source-managed parameter cannot be submitted/);
  }
  const row=d.newResources.find(value=>value.row_id===r(item.id));assert(row);
  assert.equal(row.procurement_eligible,false);assert.equal(row.resource_graph.costTreatment,'INCLUDED_IN_RESOURCE_ROWS');
  assert.equal(row.cost_owner_id,r('whole-work'));assert.equal(row.resource_graph.publicResourcePresentationV1.rowKind,undefined);
  const operations=canonicalEstimateOperationReferences(row.resource_graph.operationCompositionV1).map(ref=>ref.operationId).sort();
  assert.deepEqual(operations,item.requiredOperations.map(id=>r('operation:'+id)).sort());
 }
 const water=d.parameters.find(value=>value.parameter_id===p('physical_mixing_water_l_per_kg'));assert(water);
 assert.equal(water.constraints_json.min,.38);assert.equal(water.constraints_json.max,.42);
 assert.equal(water.unit_id,null,'input is documented l/kg factor, never mislabeled as litres');
 for(const value of [.379,.421])assert.throws(()=>validateCanonicalEstimateParameters([water],{}, {confirmedParameters:{[water.parameter_id]:value}}),/below minimum|above maximum/);
 for(const value of [.38,.42])assert.equal(validateCanonicalEstimateParameters([water],{}, {confirmedParameters:{[water.parameter_id]:value}})[water.parameter_id],value);
 for(const item of boundary){const row=d.newResources.find(value=>value.row_id===r(item.id));assert(row);
  assert.equal(row.resource_graph.costTreatment,'INFORMATIONAL_SCOPE');assert.equal(row.procurement_eligible,false);
  assert.equal(row.source_metadata.physicalKitR240.notAdditive,true);
 }
 assert.deepEqual(d.newResources.filter(row=>row.resource_graph.costTreatment==='OWN_COST').map(row=>row.row_id).sort(),['ct225-order','primer-order','ct42-order','whole-work'].map(r).sort());
 assert.deepEqual(d.formulas.slice(0,116),d.capture.formulas);
 const result=await config.verifyCore();
 assert.equal(result.actualCoreCalls,4);assert.equal(result.unknownPhysicalQuantities,15);
 assert.equal(result.fullMasterAcceptance,false);assert.equal(result.actualApprovedProjectPackages,0);
});
