// WORK-only source adapter. No publisher, saved read-set authentication or new trip calculation.
import {strict as assert} from 'node:assert';
import {createHash} from 'node:crypto';
import pack from '../../../data/estimate-benchmarks/source-packs/brick-partition-selected-external-delivery-r1.json';
import {canonicalEstimateStableJson} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {prepareSelectedMaterialDeliveryR1,type SelectedMaterialDeliveryInputR1} from '../../../src/lib/estimate/v4/selectedMaterialDeliveryReuseR1';
import {buildSelectedMaterialDeliveryForwardR1,SELECTED_DELIVERY_ROW_R1} from './selectedMaterialDeliveryForwardR1';

type Parent = Parameters<typeof buildSelectedMaterialDeliveryForwardR1>[0];
type ParentPin = Parameters<typeof buildSelectedMaterialDeliveryForwardR1>[1];
export const brickPartitionSelectedDeliveryPackR1=pack;
export const hashBrickPartitionDeliveryCapturedParentR1=(value:unknown)=>createHash('sha256').update(canonicalEstimateStableJson(value)).digest('hex');
export type BrickPartitionDeliveryCaptureR1=Readonly<{
 contract:'brick-partition-selected-delivery-captured-parent/r1';
 catalogId:string;capturedParentSha256:string;
}>;

/** Row-scope consistency only. ROOT still authenticates the actual saved revision,
 * current included procurement-ready SKU rows and full selected-delivery read fence.
 * Selected rows may be a documented subset of the five material orders; never a
 * source-consumption row, crane hire, application need, inferred brick mass or area.
 */
export function assertBrickPartitionDeliveryOrderScopeR1(input:SelectedMaterialDeliveryInputR1){
 assert.equal(input.catalogId,pack.existingTargetCatalogId,'EXACT_EXISTING_MASONRY_CATALOG_REQUIRED');
 const allowed=new Map(pack.materialOrderRows.map(row=>[row.rowId,row.unitId] as const));
 for(const row of input.orderedRows){
  assert(allowed.has(row.rowId),'EXACT_MASONRY_MATERIAL_ORDER_ROW_REQUIRED');
  assert.equal(row.unitId,allowed.get(row.rowId),'SAVED_MATERIAL_ORDER_UNIT_REQUIRED');
 }
}
export function prepareBrickPartitionExternalDeliveryR1(input:SelectedMaterialDeliveryInputR1){
 assertBrickPartitionDeliveryOrderScopeR1(input);
 // Do not substitute another allowed catalogue or supply an alternate resolver.
 return {...prepareSelectedMaterialDeliveryR1(input),
  externalLogisticsNeedRowId:pack.existingExternalLogisticsNeedRowId,
  compositeExternalLogisticsNeedRemainsUnresolved:true,unloadingLaborIncluded:false};
}

/** Exact-input model adapter, not an actual-current capture or publication plan.
 * The supplied full parent/capture must first be admitted by ROOT. Missing capture
 * never becomes a synthetic empty parent or an assumed current definition.
 */
export function buildBrickPartitionSelectedDeliveryModelR1(parent:Parent,pin:ParentPin,capture:BrickPartitionDeliveryCaptureR1,guideSnapshotSha256:string){
 assert(parent&&pin&&capture,'EXPLICIT_FULL_CURRENT_PARENT_CAPTURE_REQUIRED');
 assert.equal(capture.contract,'brick-partition-selected-delivery-captured-parent/r1');
 assert.equal(capture.catalogId,pack.existingTargetCatalogId);
 assert(/^[a-f0-9]{64}$/u.test(capture.capturedParentSha256),'EXACT_CAPTURE_SHA256_REQUIRED');
 assert.equal(hashBrickPartitionDeliveryCapturedParentR1(parent),capture.capturedParentSha256,'CAPTURED_PARENT_PAYLOAD_DRIFT');
 assert.equal(parent.definition.catalog_id,pack.existingTargetCatalogId);
 assert.deepEqual([parent.parameters.length,parent.formulas.length,parent.resources.length],[52,24,24],'FRESH_PARENT_SCOPE_REVIEW_REQUIRED');
 assert(Array.isArray(parent.normBindings)&&parent.normBindings.length===11,'EXACT_ELEVEN_PARENT_BINDINGS_REQUIRED');
 assert(parent.baseline&&parent.baseline.normative_source_ids,'FULL_PARENT_BASELINE_SOURCE_ARRAYS_REQUIRED');
 assert.equal(guideSnapshotSha256,pack.existingDeliverySource.sha256,'EXISTING_DELIVERY_SOURCE_SNAPSHOT_REQUIRED');
 const need=parent.resources.find((row:Record<string,any>)=>row.row_id===pack.existingExternalLogisticsNeedRowId);
 assert(need&&need.unit_id===''&&need.source_metadata?.sourceRole==='UNRESOLVED_INSTALLATION_SOURCE','EXACT_OPEN_COMPOSITE_LOGISTICS_NEED_REQUIRED');
 const model=buildSelectedMaterialDeliveryForwardR1(parent,pin,{guideSnapshotSha256});
 assert.deepEqual(model.parameters.slice(0,parent.parameters.length),parent.parameters);
 assert.deepEqual(model.formulas.slice(0,parent.formulas.length),parent.formulas);
 assert.deepEqual(model.resources.slice(0,parent.resources.length),parent.resources);
 assert.deepEqual([model.parameters.length,model.formulas.length,model.resources.length],[69,25,25]);
 assert.equal(model.addedResource.row_id,SELECTED_DELIVERY_ROW_R1);
 assert.equal(model.addedResource.source_metadata.automaticGenericPriceInheritanceAllowed,false);
 return {...model,retainedParent:{
  definitionId:parent.definition.id,definitionSha256:parent.definition.definition_sha256,
  baselineId:parent.baseline.id,normBindings:structuredClone(parent.normBindings),
  normativeSourceIds:structuredClone(parent.baseline.normative_source_ids),
  definitionSourceMetadata:structuredClone(parent.definition.source_metadata),
 },integrationBoundary:{
  contract:pack.contract,planningOnly:true,transactionAuthenticated:false,
  currentParentAdmittedByThisAdapter:false,newPhysicalNorms:0,newPriceBindings:0,
  normativeRegistryReuseAndNewBindingPending:true,oldOpenNeedsRemain:8,
  sourceNeedsClosed:0,publicationReady:false,fullTechnicalAcceptance:false,
 }};
}
