import type {PoolClient} from 'pg';
import {parseCanonicalSelectedMaterialDeliveryRequestR1} from '../../../src/lib/estimate/backendPlatform/canonicalSelectedMaterialDeliveryContractR1';
import {readCanonicalSelectedDeliveryReadSetR1} from './canonicalSelectedMaterialDeliveryReadSetR1';
import {admitCanonicalSelectedMaterialDeliveryR1} from './canonicalSelectedMaterialDeliveryAdmissionR1';
import catalogs from '../../../data/estimate-benchmarks/source-packs/selected-material-delivery-reuse-r1.json';
type Json=Record<string,any>;
const failure=(reason:string)=>Object.assign(new Error(reason==='saved-delivery-revision-required'
 ?'Сначала сохраните расчёт без отдельной доставки, затем подтвердите документ партии в сохранённой смете.'
 :'Доставка требует сверки с сохранённой сметой. Подтвердите состав партии и границу оплаты.'),
 {code:'SELECTED_DELIVERY_RECONCILIATION_REQUIRED',httpStatus:409,reason});
export const isSelectedMaterialDeliveryCatalogR1=(catalogId:string)=>catalogs.catalogIds.includes(catalogId);

export async function prepareCanonicalSelectedMaterialDeliveryServerR1(client:Pick<PoolClient,'query'>,input:Readonly<{
 phase:'INTAKE'|'WORKER';operation:string;payload:Json;parentRevisionId:string;catalogId:string;
 ownerUserId:string;organizationId:string|null;targetReleaseId:string;priceSnapshotIds:readonly string[];
}>){
 if(input.operation!=='recalculate'||!catalogs.catalogIds.includes(input.catalogId))throw failure('operation-or-catalogue-not-admitted');
 const request=parseCanonicalSelectedMaterialDeliveryRequestR1(input.payload.selectedMaterialDeliveryV1);
 if(request.readFence.parentRevisionId!==input.parentRevisionId)throw failure('request-parent-changed');
 if(Object.hasOwn(input.payload.parameters??{},'selected_delivery_admitted_trip_count'))throw failure('client-cannot-set-derived-trip-count');
 const readSet=await readCanonicalSelectedDeliveryReadSetR1(client,{...input,expected:request.readFence});
 const parameters={...readSet.snapshot.parent.input_parameters,...input.payload.parameters};
 const admission=admitCanonicalSelectedMaterialDeliveryR1({readSet,command:request.command,parameters});
 return {admission,request,transactionIdentity:readSet.transactionIdentity};
}

/** Initial compiles cannot manufacture a shipment without a saved parent.
 * Keep normal recalculations from silently dropping an existing paid owner.
 * Caller UI must round-trip its stored document and a fresh existing-GET fence.
 */
export async function assertCanonicalSelectedDeliveryNotDroppedR1(client:Pick<PoolClient,'query'>,input:Readonly<{
 operation:string;parentRevisionId:string;catalogId:string;ownerUserId:string;organizationId:string|null;payload:Json;
}>){
 if(!catalogs.catalogIds.includes(input.catalogId))return;
 if(Object.hasOwn(input.payload.parameters??{},'selected_delivery_admitted_trip_count'))throw failure('client-cannot-set-derived-trip-count');
 if(input.operation==='compile'){
  if(Object.hasOwn(input.payload,'selectedMaterialDeliveryV1')||input.payload.parameters?.selected_delivery_selection==='SEPARATE_CONFIRMED')throw failure('saved-delivery-revision-required');
  return;
 }
 if(input.operation!=='recalculate')throw failure('operation-or-catalogue-not-admitted');
 if(Object.hasOwn(input.payload,'selectedMaterialDeliveryV1'))return;
 // Use the existing shared-revision visibility only to detect a payment owner
 // that must not be dropped. Admission still requires the reader's exact owner
 // AND tenant scope; this diagnostic does not transfer a receipt or a price.
 const parent=(await client.query(`select amendment_contract,input_parameters from public.estimate_revision where id=$1 and catalog_id=$2
  and (owner_user_id=$3 or organization_id=$4::uuid)`,[input.parentRevisionId,input.catalogId,input.ownerUserId,input.organizationId])).rows[0];
 if(!parent)throw failure('saved-delivery-parent-unavailable');
 if(parent?.amendment_contract?.parameterSources?.selectedMaterialDeliveryV1
  ||parent?.input_parameters?.selected_delivery_selection==='SEPARATE_CONFIRMED'
  ||input.payload.parameters?.selected_delivery_selection==='SEPARATE_CONFIRMED')throw failure('saved-delivery-document-acknowledgement-required');
}

/** Called within the existing GET revision transaction. Only the compact
 * acknowledgement and saved document are exposed, never the private read set.
 */
export async function canonicalSelectedDeliveryPreviewR1(client:Pick<PoolClient,'query'>,input:Readonly<{
 parentRevisionId:string;catalogId:string;ownerUserId:string;organizationId:string|null;targetReleaseId:string;
 parentScope:Readonly<{ownerUserId:string;organizationId:string|null}>;
}>){
 if(!catalogs.catalogIds.includes(input.catalogId))return null;
 // Scope comes from the already authorized server-loaded revision, never from
 // a request. A colleague can view the estimate without receiving its owner's
 // private payment acknowledgement or a capability to rebind it.
 if(input.parentScope.ownerUserId!==input.ownerUserId||input.parentScope.organizationId!==input.organizationId)return null;
 const readSet=await readCanonicalSelectedDeliveryReadSetR1(client,{...input,phase:'PREVIEW'});
 const target=readSet.snapshot.definitions.find((definition:Json)=>definition.definition.id===readSet.snapshot.targetManifest.definition_version_id);
 if(!target?.resources.some((resource:Json)=>resource.resource_graph?.selectedMaterialDeliveryR1?.serverAdmissionRequired===true))return null;
 return {contractVersion:'canonical-selected-material-delivery-context/v1' as const,readFence:readSet.fence,
  command:readSet.existingDeliveryReceipt?.command??null,globalConsignmentPaymentUniquenessProven:false as const};
}
