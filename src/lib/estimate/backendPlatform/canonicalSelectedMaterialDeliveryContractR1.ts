export type CanonicalSelectedDeliveryReadFenceR1=Readonly<{
 contractVersion:'canonical-selected-delivery-read-fence/v1';parentRevisionId:string;parentChecksumSha256:string;readSetSha256:string;
}>;
export type CanonicalSelectedMaterialDeliveryCommandR1=Readonly<{
 contractVersion:'canonical-selected-material-delivery-command/v1';consignmentId:string;documentReference:string;
 documentCapturedAt:string;separatePaymentConfirmed:true;skuBindings:readonly Readonly<{rowId:string;skuKey:string}>[];
}>;
export type CanonicalSelectedMaterialDeliveryRequestR1=Readonly<{
 contractVersion:'canonical-selected-material-delivery-request/v1';
 command:CanonicalSelectedMaterialDeliveryCommandR1;readFence:CanonicalSelectedDeliveryReadFenceR1;
}>;
export type CanonicalSelectedMaterialDeliveryContextR1=Readonly<{
 contractVersion:'canonical-selected-material-delivery-context/v1';readFence:CanonicalSelectedDeliveryReadFenceR1;
 command:CanonicalSelectedMaterialDeliveryCommandR1|null;globalConsignmentPaymentUniquenessProven:false;
}>;
const record=(value:unknown):Record<string,any>=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,any>:{};
const invalid=()=>Object.assign(new Error('Параметры подтверждения доставки не соответствуют сохранённой партии.'),{code:'INVALID_ARGUMENT',httpStatus:400});
export function parseCanonicalSelectedMaterialDeliveryRequestR1(raw:unknown):CanonicalSelectedMaterialDeliveryRequestR1{
 const request=record(raw),command=record(request.command),fence=record(request.readFence);
 if(Object.keys(request).length!==3||request.contractVersion!=='canonical-selected-material-delivery-request/v1'
  ||Object.keys(request).some(key=>!['contractVersion','command','readFence'].includes(key))
  ||Object.keys(command).some(key=>!['contractVersion','consignmentId','documentReference','documentCapturedAt','separatePaymentConfirmed','skuBindings'].includes(key))
  ||command.contractVersion!=='canonical-selected-material-delivery-command/v1'||command.separatePaymentConfirmed!==true
  ||!['consignmentId','documentReference'].every(key=>typeof command[key]==='string'&&command[key].trim()===command[key]&&command[key].length>0&&command[key].length<=500)
  ||typeof command.documentCapturedAt!=='string'||!/^\d{4}-\d{2}-\d{2}T/u.test(command.documentCapturedAt)||!Number.isFinite(Date.parse(command.documentCapturedAt))
  ||!Array.isArray(command.skuBindings)||command.skuBindings.length===0||command.skuBindings.length>200
  ||command.skuBindings.some((rawBinding:unknown)=>{const binding=record(rawBinding);return Object.keys(binding).length!==2||!['rowId','skuKey'].every(key=>typeof binding[key]==='string'&&binding[key].trim()===binding[key]&&binding[key].length>0&&binding[key].length<=500);})
  ||new Set(command.skuBindings.map((binding:Record<string,any>)=>binding.rowId)).size!==command.skuBindings.length
  ||Object.keys(fence).length!==4||Object.keys(fence).some(key=>!['contractVersion','parentRevisionId','parentChecksumSha256','readSetSha256'].includes(key))
  ||fence.contractVersion!=='canonical-selected-delivery-read-fence/v1'
  ||typeof fence.parentRevisionId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/u.test(fence.parentRevisionId)
  ||!['parentChecksumSha256','readSetSha256'].every(key=>typeof fence[key]==='string'&&/^[a-f0-9]{64}$/u.test(fence[key])))throw invalid();
 return request as CanonicalSelectedMaterialDeliveryRequestR1;
}
