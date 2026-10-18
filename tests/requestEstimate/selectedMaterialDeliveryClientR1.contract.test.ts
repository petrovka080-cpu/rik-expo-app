import {canonicalSelectedDeliveryClientRequestR1 as prepare,assertCanonicalSelectedDeliveryClientResultR1 as verify} from '../../src/lib/estimate/backendPlatform/canonicalSelectedMaterialDeliveryClientR1';
import type {CanonicalSelectedMaterialDeliveryContextR1 as Context} from '../../src/lib/estimate/backendPlatform/canonicalSelectedMaterialDeliveryContractR1';
const parent='11111111-1111-4111-8111-111111111111',child='22222222-2222-4222-8222-222222222222';
const command=()=>({contractVersion:'canonical-selected-material-delivery-command/v1' as const,consignmentId:'synthetic:shipment',documentReference:'synthetic:document',documentCapturedAt:'2026-10-17T00:00:00Z',separatePaymentConfirmed:true as const,skuBindings:[{rowId:'material-order',skuKey:'synthetic:sku'}]});
const context=():Context=>({contractVersion:'canonical-selected-material-delivery-context/v1',readFence:{contractVersion:'canonical-selected-delivery-read-fence/v1',parentRevisionId:parent,parentChecksumSha256:'1'.repeat(64),readSetSha256:'2'.repeat(64)},command:command(),globalConsignmentPaymentUniquenessProven:false});
const acknowledged=()=>({contractVersion:'canonical-selected-material-delivery-request/v1' as const,command:command(),readFence:context().readFence});
const input=()=>({revisionId:parent,context:context(),parameters:{q:15},savedParameters:{selected_delivery_selection:'SEPARATE_CONFIRMED',selected_delivery_consignment_id:'synthetic:shipment',selected_delivery_document_reference:'synthetic:document',selected_delivery_admitted_trip_count:'3'}});
test('legacy unselected commands keep their request shape',()=>{expect(prepare({revisionId:parent,savedParameters:{q:10},parameters:{q:15}})).toBeUndefined();});
test('an unselected future target with no document also keeps ordinary recalculation',()=>{expect(prepare({...input(),savedParameters:{},context:{...context(),command:null}})).toBeUndefined();});
test('reopening carries the existing document and fresh parent fence without a trusted trip quantity',()=>{
 const current=input(),before=JSON.stringify(current),request=prepare(current)!;
 expect(request.command).toEqual(command());expect(request.readFence).toEqual(current.context.readFence);expect(request).not.toHaveProperty('quantity');expect(JSON.stringify(current)).toBe(before);
});
test('the first delivery requires an explicit confirmed document rather than synthesizing one',()=>{expect(()=>prepare({...input(),context:{...context(),command:null}})).toThrow();});
test('explicit first confirmation carries only the user-declared command and server-issued fence',()=>{
 const current=input();expect(prepare({...current,context:{...context(),command:null},request:acknowledged()})?.command).toEqual(command());
});
test('a fresh GET cannot silently acknowledge a changed price or target read set after UI confirmation',()=>{
 const current=input(),confirmed=acknowledged(),contextChanged={...current.context,readFence:{...current.context.readFence,readSetSha256:'3'.repeat(64)}};
 expect(()=>prepare({...current,context:contextChanged,request:confirmed})).toThrow();
});
test.each(['selected_delivery_document_reference','selected_delivery_consignment_id'])('editing %s requires reconciliation with the document',key=>{
 expect(()=>prepare({...input(),parameters:{[key]:'synthetic:changed'}})).toThrow();
});
test('an old GET acknowledgement cannot be reused for another parent',()=>{expect(()=>prepare({...input(),revisionId:child})).toThrow();});
test('missing server context cannot be replaced by client-owned rows or a command',()=>{expect(()=>prepare({...input(),context:null,request:acknowledged()})).toThrow();});
test('clearing the saved document cannot silently remove its owner',()=>{expect(()=>prepare({...input(),request:null})).toThrow();});
test('deselecting an existing shipment requires explicit reconciliation rather than dropping its receipt',()=>{expect(()=>prepare({...input(),parameters:{selected_delivery_selection:'NOT_SELECTED'}})).toThrow();});
test('a client parameter cannot set the admitted trip count',()=>{expect(()=>prepare({...input(),parameters:{selected_delivery_admitted_trip_count:'999'}})).toThrow();});
test('a committed child must return the same command and an acknowledgement for its own checksum',()=>{
 const request=prepare(input())!,saved={revisionId:child,checksumSha256:'3'.repeat(64),selectedMaterialDeliveryContext:{...context(),readFence:{...context().readFence,parentRevisionId:child,parentChecksumSha256:'3'.repeat(64)}}};
 expect(()=>verify(request,saved)).not.toThrow();expect(()=>verify(request,{...saved,checksumSha256:'4'.repeat(64)})).toThrow();
});
test('a saved child with another document cannot be displayed as successful confirmation',()=>{
 const request=prepare(input())!,changed={...context(),command:{...command(),documentReference:'synthetic:other'}};
 expect(()=>verify(request,{revisionId:parent,checksumSha256:'1'.repeat(64),selectedMaterialDeliveryContext:changed})).toThrow();
});
test('legacy results need no new delivery annotation',()=>{expect(()=>verify(undefined,{revisionId:parent,checksumSha256:'1'.repeat(64)})).not.toThrow();});
