import {canonicalEstimateStableJson} from './canonicalEstimateDeterminism';
import {parseCanonicalSelectedMaterialDeliveryRequestR1,type CanonicalSelectedMaterialDeliveryCommandR1,type CanonicalSelectedMaterialDeliveryContextR1,type CanonicalSelectedMaterialDeliveryRequestR1} from './canonicalSelectedMaterialDeliveryContractR1';
const failure=()=>Object.assign(new Error('Подтвердите документ партии и отдельную оплату доставки. Сохранённая доставка этой сметы требует сверки при изменении партии.'),{code:'SELECTED_DELIVERY_CLIENT_CONFIRMATION_REQUIRED',httpStatus:409});
/** Round-trip server-issued saved-context evidence. No calculation, owner,
 * price, quantity, document or SKU is synthesized by the client.
 */
export function canonicalSelectedDeliveryClientRequestR1(input:Readonly<{
 revisionId:string;context?:CanonicalSelectedMaterialDeliveryContextR1|null;
 savedParameters:Readonly<Record<string,unknown>>;parameters:Readonly<Record<string,unknown>>;
 request?:CanonicalSelectedMaterialDeliveryRequestR1|null;
}>):CanonicalSelectedMaterialDeliveryRequestR1|undefined{
 const values={...input.savedParameters,...input.parameters},context=input.context;
 if(Object.hasOwn(input.parameters,'selected_delivery_admitted_trip_count'))throw failure();
 const hasExplicitCommand=Object.hasOwn(input,'request');
 const explicit=hasExplicitCommand&&input.request?parseCanonicalSelectedMaterialDeliveryRequestR1(input.request):null;
 const command=hasExplicitCommand?explicit?.command:context?.command;
 const selected=values.selected_delivery_selection==='SEPARATE_CONFIRMED';
 if(!selected&&!command&&!hasExplicitCommand)return undefined;
 if(!selected||!command||!context||context.contractVersion!=='canonical-selected-material-delivery-context/v1'
  ||context.readFence.parentRevisionId!==input.revisionId
  ||explicit&&canonicalEstimateStableJson(explicit.readFence)!==canonicalEstimateStableJson(context.readFence)
  ||values.selected_delivery_consignment_id!==command.consignmentId
  ||values.selected_delivery_document_reference!==command.documentReference)throw failure();
 return parseCanonicalSelectedMaterialDeliveryRequestR1({contractVersion:'canonical-selected-material-delivery-request/v1',command,readFence:explicit?.readFence??context.readFence});
}
export function assertCanonicalSelectedDeliveryClientResultR1(request:CanonicalSelectedMaterialDeliveryRequestR1|undefined,revision:Readonly<{
 revisionId:string;checksumSha256:string;selectedMaterialDeliveryContext?:CanonicalSelectedMaterialDeliveryContextR1|null;
}>){
 if(!request)return;
 const context=revision.selectedMaterialDeliveryContext;
 if(!context?.command||context.readFence.parentRevisionId!==revision.revisionId||context.readFence.parentChecksumSha256!==revision.checksumSha256
  ||canonicalEstimateStableJson(context.command)!==canonicalEstimateStableJson(request.command))throw failure();
}
