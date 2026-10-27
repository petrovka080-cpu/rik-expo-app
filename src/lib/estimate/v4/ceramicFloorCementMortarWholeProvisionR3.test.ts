import {ceramicFloorM150WholeProvisionDefinitionR3 as definition,ceramicFloorM150WholeProvisionCompletenessR3 as completeness,compileCeramicFloorM150WholeProvisionR3 as compile,ceramicFloorM150WholeProvisionPackR3 as pack} from './ceramicFloorCementMortarWholeProvisionR3';
import {ceramicFloorM150ResourceGroupDefinitionR2 as r2,ceramicFloorM150ResourceGroupPackR2 as oldPack} from './ceramicFloorCementMortarResourceGroupR2';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
import {compileFormulaGraph,evaluateFormulaGraph} from '../backendPlatform/formulaGraph';
import {canonicalEstimateOperationReferences} from '../backendPlatform/canonicalEstimateOperationComposition';
import {validateMasterFormulaGraphConsistency,validateIndependentCompletenessMapReferences,buildMasterParameterCalculationConsumers} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import {canonicalPublisherRequiredBindingSourceKeysR1} from '../../../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';
const input=(A=100,L=50)=>({[pack.parent.primaryParameterId]:A,[pack.parent.skirtingLengthParameterId]:L});
const prefix=pack.namespace.replace(/:r3$/,''),find=(r:Awaited<ReturnType<typeof compile>>,id:string)=>r.rows.find(r=>r.row_id===id);
it('reuses the complete immutable published R2 and its separate expected map',()=>{
 const before=hash(r2()),d=definition(),map=completeness();expect(hash(r2())).toBe(before);expect(oldPack.tools.length+oldPack.ppe.length).toBe(44);expect(oldPack.quality).toHaveLength(6);
 expect(d.resources).toHaveLength(84);expect(map.generatedFromCurrentRows).toBe(false);expect(map.operationResourceBindingRequired).toBe(true);
 expect(validateMasterFormulaGraphConsistency(d.formulas)).toEqual([]);expect(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:d.formulas,resourceDefinitions:d.resources})).toEqual([]);
 const consumers=buildMasterParameterCalculationConsumers(d);for(const p of d.parameters)expect(consumers.resourceConsumers[p.parameter_id]!.length).toBeGreaterThan(0);
 expect(d.parameters.filter(p=>p.required).map(p=>p.parameter_id)).toEqual([pack.parent.primaryParameterId,pack.parent.skirtingLengthParameterId]);
 expect(d.parameters.some(p=>p.parameter_id===pack.skin.removedUnknownParameterId)).toBe(false);
});
it.each([[100,50,'60','0.04','0.3'],[100,52.5,'60','0.04','0.3'],[1,0,'24','0.016','0.3'],[0.01,0,'24','0.016','0.3'],[100,0,'48','0.032','0.3'],[10000,5000,'3324','2.216','2.7']])('plans one whole protection supply at%s/%s without arbitrary wash cycles',async(A,L,applications,nominalUse,order)=>{
 const facts=input(Number(A),Number(L)),r=await compile(facts),value=evaluateFormulaGraph(compileFormulaGraph(pack.skin.formulas.plannedApplications),facts);
 expect(value).toBe(applications);expect(find(r,pack.skin.nominalUseRowId)?.quantity).toBe(nominalUse);expect(find(r,pack.skin.orderOwnerRowId)?.quantity).toBe(order);
 expect(r.preliminaryNeeds.map(n=>n.row_id).sort()).toEqual(pack.actualRemaining.map(n=>n.rowId).sort());expect(r.rows.filter(r=>r.row_id===pack.skin.orderOwnerRowId)).toHaveLength(1);
 expect(r.rows.filter(r=>r.row_id===prefix+':ready-mortar-m150-order')).toHaveLength(1);expect(r.rows.filter(r=>r.row_id.endsWith(':truck5t-own')||r.row_id.endsWith(':truck5t-hired'))).toHaveLength(1);
 for(const item of [...oldPack.tools,...oldPack.ppe])expect(find(r,prefix+':r2:'+item.id)?.quantity).toBe(String(item.count));
 if(Number(L)===0)expect(r.rows.some(r=>r.row_id.endsWith(':r2:skirting-tile-order'))).toBe(false);
 expect(find(r,pack.skin.orderOwnerRowId)?.included_in_procurement).toBe(true);
});
it('keeps both exact KRER columns and the source water/curing plan',async()=>{
 const r=await compile(input(100,52.5));for(const[id,q]of [['whole-labor','119.78'],['r2:skirting-labor','12.39'],['ready-mortar-m150-consumed','1.384'],['water-consumed','3.85'],['sawdust-consumed','3.06'],['truck5t-consumed','0.3115']])expect(find(r,prefix+':'+id)?.quantity).toBe(q);
 expect(pack.skin.notStokoderm1MlDose).toBe(true);expect(pack.skin.capacityApproximate).toBe(true);expect(pack.skin.organisation.noAddedLabourHours).toBe(true);
});
it('retains every inherited tool/control binding, real external need and clean public presentation',()=>{
 const d=definition(),map=completeness();for(const e of map.entries){const row=d.resources.find(r=>r.row_id===String(e.resolution.rowId))!;expect(row).toBeDefined();for(const op of e.requiredOperationIds)expect(canonicalEstimateOperationReferences(row.resource_graph.operationCompositionV1).map(o=>o.operationId)).toContain(op);}
 expect(pack.actualRemaining.map(n=>n.rowId)).toEqual([prefix+':deformation-junctions',prefix+':additional-logistics-waste',...pack.handHygiene.resources.map(h=>h.rowId)]);expect(map.openAuthorObligations).toHaveLength(5);expect(pack.fullTechnicalAcceptance).toBe(false);
 for(const r of d.resources){const p=r.resource_graph.publicResourcePresentationV1 as {detailsRu?:unknown[]}|undefined;expect(p?.detailsRu??[]).toEqual([]);}
 expect(pack.scope.noJointLengthFromAreaOrSkirting).toBe(true);expect(pack.scope.userTechnicalNorms).toBe(false);
});
it('rejects geometry and technological boundary violations without changing R2 history',async()=>{
 await expect(compile(input(0,0))).rejects.toBeDefined();await expect(compile(input(1,-1))).rejects.toBeDefined();
 await expect(compile({...input(),cement_mortar_system:'DRY_TILE_ADHESIVE_CM11'})).rejects.toBeDefined();
});
it('attributes runtime profiles to the registered R3 composite while retaining exact normative parent provenance',async()=>{
 const parent=r2(),before=hash(parent),d=definition(),sources=Object.fromEntries(d.parameters.map(p=>[p.parameter_id,d.runtimeSourceIds[p.parameter_id]??[]]));
 const noDatabase={query:jest.fn(()=>{throw Error('DATABASE_FORBIDDEN_IN_SOURCE_CLOSURE_TEST');})};
 const closure=await canonicalPublisherRequiredBindingSourceKeysR1(noDatabase as never,{definition:{catalog_id:pack.catalogId},baseline:{normative_source_ids:sources}} as never);
 expect(closure).toEqual([pack.publicationSourceId]);expect(noDatabase.query).not.toHaveBeenCalled();
 expect(d.runtimeInput).toEqual(parent.runtimeInput);expect(d.runtimeClassification).toEqual(parent.runtimeClassification);
 for(const key of Object.keys(parent.runtimeInput)){const p=d.parameters.find(p=>p.parameter_id===key)!,old=parent.parameters.find(p=>p.parameter_id===key)!;
  expect(d.runtimeSourceIds[key]).toEqual([pack.publicationSourceId]);expect(p.truth_metadata.guide).toEqual(old.truth_metadata.guide);
  expect(p.truth_metadata.compositeSourceAttributionR3).toMatchObject({sourceId:pack.publicationSourceId,parentSourceIds:parent.runtimeSourceIds[key],parentFactory:pack.parent.factory,sourceNorms:pack.parent.sourceNorms});
 }
 for(const old of parent.resources.filter(r=>r.row_id!==pack.skin.orderOwnerRowId)){
  const current=d.resources.find(r=>r.row_id===old.row_id);
  if(old.source_metadata==null||current?.source_metadata==null)throw Error('RETAINED_RESOURCE_SOURCE_METADATA_REQUIRED');
  expect(current.source_metadata.normativeTrace).toEqual(old.source_metadata.normativeTrace);
 }
 expect(hash(r2())).toBe(before);
});
