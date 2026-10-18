import fs from 'node:fs';import {createHash} from 'node:crypto';
import path from 'node:path';import {selectedMaterialDeliveryTestContextR1} from './selectedMaterialDeliveryTestContextR1';
import {prepareSelectedDeliveryNormativeRegistryR1 as registry} from '../../scripts/estimate/r4a13/selectedMaterialDeliveryNormativeRegistryR1';
import {prepareSelectedMaterialDeliveryClonePlanR1 as plan,SELECTED_DELIVERY_ROW_R1 as rowId,SELECTED_DELIVERY_PREFIX_R1 as prefix} from '../../scripts/estimate/r4a13/selectedMaterialDeliveryForwardR1';
import {canonicalManualPriceMigrationBindings as priceBindings} from '../../src/lib/estimate/backendPlatform/canonicalManualPriceReleaseMigration';
const bytes=fs.readFileSync(path.resolve(process.cwd(),'data/estimate-norms/professional/delivery.json'));
const sha=createHash('sha256').update(bytes).digest('hex');
const fixture=selectedMaterialDeliveryTestContextR1();
const config=()=>({guideSnapshotSha256:sha,releaseId:'11111111-1111-4111-8111-111111111111',sourceHead:'a'.repeat(40),sourceTree:'b'.repeat(40),masterSha256:'c'.repeat(64),evidenceSha256:'d'.repeat(64),normativeRegistry:registry({reviewedNormPackBytes:bytes,expectedNormPackSha256:sha})});
test('the source payload identifies reviewed JSON bytes and never claims to hash the manufacturer PDF',()=>{
 const value=config().normativeRegistry;
 expect(value.source).toMatchObject({artifact_sha256:sha,metadata:{artifactKind:'REVIEWED_LOCAL_NORM_PACK_JSON',remotePdfBytesHashed:false,newPhysicalNorms:0,automaticReferenceRateAllowed:false}});
 expect(value.locator.locator).toMatchObject({unitId:'trip',automaticReferenceRateAllowed:false,selectedVehicleFactsRequired:true,supplierPaymentAndUnloadingIncluded:false});
 expect(value.registeredInDatabase).toBe(false);expect(value.publicationReady).toBe(false);
});
test('changed artifact bytes cannot use an old accepted checksum',()=>{
 expect(()=>registry({reviewedNormPackBytes:Buffer.concat([bytes,Buffer.from(' ')]),expectedNormPackSha256:sha})).toThrow('DELIVERY_REVIEWED_SOURCE_BYTES_CHANGED');
});
test('self-consistent bytes with changed technical content still cannot replace the reviewed source',()=>{
 const changed=JSON.parse(bytes.toString('utf8'));changed.norm_items[0].rate.value=1;
 const altered=Buffer.from(JSON.stringify(changed));
 expect(()=>registry({reviewedNormPackBytes:altered,expectedNormPackSha256:createHash('sha256').update(altered).digest('hex')})).toThrow('DELIVERY_REVIEWED_SOURCE_IDENTITY_CHANGED');
});
test.each(fixture.parents)('prepared $entry.catalog_id keeps old bindings and adds one explicit Ford locator without publication',(parent:any)=>{
 const prepared=config(),result=plan(parent,parent.pin,prepared),bindings=result.plan.bindings;
 expect(bindings).toHaveLength(parent.normBindings.length+1);expect(result.publicationReady).toBe(false);
 const resource=result.plan.resources.find((row:any)=>row.row_id===rowId)!;
 expect(bindings.filter((binding:any)=>binding.resource_spec_id===resource.id)).toEqual([expect.objectContaining({locator_id:prepared.normativeRegistry.locator.id,applicability:expect.objectContaining({serverShipmentAdmissionRequired:true,automaticReferenceRateAllowed:false})})]);
 for(const parameter of result.plan.parameters.filter((value:any)=>value.parameter_id.startsWith(prefix)))expect(result.plan.baseline.normative_source_ids[parameter.parameter_id]).toEqual([prepared.normativeRegistry.source.source_key]);
});
test('an unrelated locator or source cannot be attached to a delivery clone plan',()=>{
 const parent=fixture.parents[0],prepared=config();prepared.normativeRegistry.locator.source_id='wrong-source';
 expect(()=>plan(parent,parent.pin,prepared)).toThrow();
});
test.each(fixture.parents)('clone $entry.catalog_id preserves old manual-price meaning and satisfies publisher-owned parameter metadata',(parent:any)=>{
 const result=plan(parent,parent.pin,config()).plan,old=priceBindings(parent),next=priceBindings(result);
 expect(result.passport.decision.waveContract).toBe(result.contract);
 expect(result.passport.decision.quantityScope).toBe(parent.passport.decision.quantityScope);
 expect(result.passport.decision.preliminaryCompositionOnly).toBe(parent.passport.decision.preliminaryCompositionOnly);
 for(const [rowId,binding] of Object.entries(old))expect(next[rowId]).toBe(binding);
 for(const parameter of result.parameters){expect(parameter.truth_metadata.contract).toBe(result.contract);expect(parameter.truth_metadata.semantic_parameter_key).toBe(parent.entry.catalog_id+':'+parameter.parameter_id);}
 expect(new Set(result.parameters.map((parameter:any)=>parameter.ordinal)).size).toBe(result.parameters.length);
});
afterAll(()=>{
 const path=process.env.DELIVERY16_SQL_PREFLIGHT_PAYLOAD;if(!path)return;
 if(!path.startsWith('C:/Users/User/Documents/Codex/2026-10-17/14-29-1-38-22-36/work/'))throw new Error('PREFLIGHT_OUTPUT_OUTSIDE_TASK');
 const prepared=config(),payload=JSON.stringify({status:'STAGED_STRUCTURAL_PREFLIGHT_ONLY_SYNTHETIC_RELEASE_AND_SOURCE_IDS',
  normativeRegistry:prepared.normativeRegistry,plans:fixture.parents.map((parent:any)=>plan(parent,parent.pin,prepared).plan),registeredOrPublished:false},null,2)+'\n';
 if(fs.existsSync(path)){
  if(createHash('sha256').update(fs.readFileSync(path)).digest('hex')!==createHash('sha256').update(payload).digest('hex'))throw new Error('PRESERVED_STRUCTURAL_PREFLIGHT_BYTES_CHANGED');
 }else fs.writeFileSync(path,payload,{flag:'wx'});
});
