import type {CanonicalEstimateRevisionRowView,CanonicalEstimateRevisionView} from './contracts';
import {parseCanonicalSelectedMaterialDeliveryRequestR1,type CanonicalSelectedMaterialDeliveryRequestR1} from './canonicalSelectedMaterialDeliveryContractR1';
export type SelectedDeliveryDocumentSourceR1=Readonly<{revision:CanonicalEstimateRevisionView;rows:readonly CanonicalEstimateRevisionRowView[]}>;
export function selectedDeliveryDocumentOrderRowsR1(source:SelectedDeliveryDocumentSourceR1,revisionId:string){
 const revision=source.revision,context=revision.selectedMaterialDeliveryContext;
 if(revision.revisionId!==revisionId||!context||context.readFence.parentRevisionId!==revisionId||context.readFence.parentChecksumSha256!==revision.checksumSha256)throw new Error('Не удалось сверить сохранённую партию этой версии сметы.');
 return source.rows.filter(row=>{
  const purchase=row.calculationTrace.purchaseBalance as Record<string,unknown>|undefined;
  return row.includedInProcurement&&row.procurementEligible&&purchase?.procurementReady===true&&purchase.ownerRowId===row.rowId
   &&purchase.unitId===row.unitId&&typeof row.quantity==='string'&&Number(row.quantity)>0;
 });
}
export function selectedDeliveryDocumentRequestR1(input:Readonly<{
 source:SelectedDeliveryDocumentSourceR1;revisionId:string;documentReference:string;consignmentId:string;
 selectedRowIds:readonly string[];skuByRowId:Readonly<Record<string,string>>;capturedAt:string;
}>):CanonicalSelectedMaterialDeliveryRequestR1{
 const eligible=selectedDeliveryDocumentOrderRowsR1(input.source,input.revisionId);
 if(input.selectedRowIds.length===0||new Set(input.selectedRowIds).size!==input.selectedRowIds.length
  ||input.selectedRowIds.some(id=>!eligible.some(row=>row.rowId===id)))throw new Error('Выберите материалы этой партии из сохранённого заказа.');
 return parseCanonicalSelectedMaterialDeliveryRequestR1({contractVersion:'canonical-selected-material-delivery-request/v1',
  readFence:input.source.revision.selectedMaterialDeliveryContext!.readFence,
  command:{contractVersion:'canonical-selected-material-delivery-command/v1',consignmentId:input.consignmentId.trim(),documentReference:input.documentReference.trim(),documentCapturedAt:input.capturedAt,
   separatePaymentConfirmed:true,skuBindings:input.selectedRowIds.map(rowId=>({rowId,skuKey:(input.skuByRowId[rowId]??'').trim()}))}});
}
