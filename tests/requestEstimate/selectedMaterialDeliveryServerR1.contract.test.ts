import {prepareCanonicalSelectedMaterialDeliveryServerR1 as prepare,assertCanonicalSelectedDeliveryNotDroppedR1 as retain,canonicalSelectedDeliveryPreviewR1 as preview} from '../../scripts/estimate/backendMigration/canonicalSelectedMaterialDeliveryServerR1';
import * as readModule from '../../scripts/estimate/backendMigration/canonicalSelectedMaterialDeliveryReadSetR1';
import * as admissionModule from '../../scripts/estimate/backendMigration/canonicalSelectedMaterialDeliveryAdmissionR1';
const reader=jest.spyOn(readModule,'readCanonicalSelectedDeliveryReadSetR1'),adapter=jest.spyOn(admissionModule,'admitCanonicalSelectedMaterialDeliveryR1');
const parent='11111111-1111-4111-8111-111111111111';
const catalogId='canonical-work:base:facade_interior_facade_paint_install_standard';
const request=()=>({contractVersion:'canonical-selected-material-delivery-request/v1',
 readFence:{contractVersion:'canonical-selected-delivery-read-fence/v1',parentRevisionId:parent,parentChecksumSha256:'1'.repeat(64),readSetSha256:'2'.repeat(64)},
 command:{contractVersion:'canonical-selected-material-delivery-command/v1',consignmentId:'synthetic:shipment',documentReference:'synthetic:document',documentCapturedAt:'2026-10-17T00:00:00Z',separatePaymentConfirmed:true,skuBindings:[{rowId:'order',skuKey:'sku'}]}});
function input(){return {phase:'INTAKE' as const,operation:'recalculate',payload:{selectedMaterialDeliveryV1:request(),parameters:{q:15}},parentRevisionId:parent,catalogId,ownerUserId:'authenticated-owner',organizationId:null,targetReleaseId:'target',priceSnapshotIds:['selected-price-snapshot']};}
function previewInput(){return {...input(),parentScope:{ownerUserId:'authenticated-owner',organizationId:null}};}
beforeEach(()=>{jest.clearAllMocks();reader.mockResolvedValue({phase:'INTAKE',snapshot:{parent:{input_parameters:{q:10,preserved:'saved'}}},transactionIdentity:{transaction_id:'tx',backend_id:1}} as any);adapter.mockReturnValue({confirmedParameters:{selected_delivery_admitted_trip_count:'3'}} as any);});

test('intake passes only authenticated principal, selected prices and acknowledged fence to the server reader',async()=>{
 const query=jest.fn(),value=input(),result=await prepare({query},value);
 expect(reader).toHaveBeenCalledWith({query},expect.objectContaining({ownerUserId:'authenticated-owner',organizationId:null,parentRevisionId:parent,priceSnapshotIds:['selected-price-snapshot'],expected:value.payload.selectedMaterialDeliveryV1.readFence}));
 expect(adapter).toHaveBeenCalledWith(expect.objectContaining({command:value.payload.selectedMaterialDeliveryV1.command,parameters:{q:15,preserved:'saved'}}));
 expect(result.transactionIdentity).toEqual({transaction_id:'tx',backend_id:1});
});
test.each(['compile','foreign-catalog','different-parent','derived-quantity'])('rejects %s before reading saved private rows',async mode=>{
 const value:any=input();if(mode==='compile')value.operation='compile';if(mode==='foreign-catalog')value.catalogId='other';
 if(mode==='different-parent')value.parentRevisionId='22222222-2222-4222-8222-222222222222';
 if(mode==='derived-quantity')value.payload.parameters.selected_delivery_admitted_trip_count='999';
 await expect(prepare({query:jest.fn()},value)).rejects.toMatchObject({code:'SELECTED_DELIVERY_RECONCILIATION_REQUIRED'});expect(reader).not.toHaveBeenCalled();
});
test('worker rechecks the same fence and propagates changed saved-context rejection',async()=>{
 reader.mockRejectedValue(Object.assign(new Error('changed'),{code:'SELECTED_DELIVERY_SAVED_CONTEXT_REVIEW_REQUIRED'}));
 await expect(prepare({query:jest.fn()},{...input(),phase:'WORKER'})).rejects.toMatchObject({code:'SELECTED_DELIVERY_SAVED_CONTEXT_REVIEW_REQUIRED'});expect(adapter).not.toHaveBeenCalled();
});
test.each([true,false])('a normal recalculation cannot silently drop an existing delivery receipt: %s',async saved=>{
 const query=jest.fn().mockResolvedValue({rows:[{amendment_contract:saved?{parameterSources:{selectedMaterialDeliveryV1:{ownerKey:'saved'}}}:{}}]});
 const task=retain({query},{...input(),payload:{parameters:saved?{}:{selected_delivery_selection:'SEPARATE_CONFIRMED'}}});
 await expect(task).rejects.toMatchObject({code:'SELECTED_DELIVERY_RECONCILIATION_REQUIRED'});
 expect(query.mock.calls[0]![1]).toEqual([parent,catalogId,'authenticated-owner',null]);
});
test('ordinary unselected recalculations retain their existing behavior',async()=>{
 await expect(retain({query:jest.fn().mockResolvedValue({rows:[{amendment_contract:{}}]})},{...input(),payload:{parameters:{q:20}}})).resolves.toBeUndefined();
});
test('a saved confirmed branch also requires acknowledgement when its receipt is missing',async()=>{
 await expect(retain({query:jest.fn().mockResolvedValue({rows:[{amendment_contract:{},input_parameters:{selected_delivery_selection:'SEPARATE_CONFIRMED'}}]})},{...input(),payload:{parameters:{q:20}}}))
  .rejects.toMatchObject({code:'SELECTED_DELIVERY_RECONCILIATION_REQUIRED'});
});
test('GET preview returns no delivery capability for the unchanged published target',async()=>{
 reader.mockResolvedValue({snapshot:{targetManifest:{definition_version_id:'old'},definitions:[{definition:{id:'old'},resources:[]}]}} as any);
 await expect(preview({query:jest.fn()},previewInput())).resolves.toBeNull();expect(adapter).not.toHaveBeenCalled();
});
test('GET preview exposes a compact fence and saved command without private rows or prices',async()=>{
 const command=request().command,fence=request().readFence;
 reader.mockResolvedValue({fence,existingDeliveryReceipt:{command},snapshot:{privateRows:'private',targetManifest:{definition_version_id:'new'},definitions:[{definition:{id:'new'},resources:[{resource_graph:{selectedMaterialDeliveryR1:{serverAdmissionRequired:true}}}]}]}} as any);
 expect(await preview({query:jest.fn()},previewInput())).toEqual({contractVersion:'canonical-selected-material-delivery-context/v1',readFence:fence,command,globalConsignmentPaymentUniquenessProven:false});
 expect(reader).toHaveBeenCalledWith(expect.anything(),expect.objectContaining({phase:'PREVIEW'}));expect(adapter).not.toHaveBeenCalled();
});

test.each([
 ['selected separate delivery',{parameters:{selected_delivery_selection:'SEPARATE_CONFIRMED'}}],
 ['document acknowledgement',{parameters:{},selectedMaterialDeliveryV1:request()}],
])('initial compile rejects %s before any saved-revision read',async(_name,payload)=>{
 const query=jest.fn().mockRejectedValue(new Error('UNEXPECTED_PRIVATE_READ_IN_INITIAL_COMPILE'));
 await expect(retain({query},{...input(),operation:'compile',parentRevisionId:'',payload})).rejects.toMatchObject({code:'SELECTED_DELIVERY_RECONCILIATION_REQUIRED',reason:'saved-delivery-revision-required'});
 expect(query).not.toHaveBeenCalled();
});

test.each([{}, {selected_delivery_selection:'NOT_SELECTED'}])('an initial unselected compile %p keeps the ordinary path without reading a nonexistent parent',async parameters=>{
 const query=jest.fn().mockRejectedValue(new Error('UNEXPECTED_PRIVATE_READ_IN_INITIAL_COMPILE'));
 await expect(retain({query},{...input(),operation:'compile',parentRevisionId:'',payload:{parameters}})).resolves.toBeUndefined();expect(query).not.toHaveBeenCalled();
});

test.each(['compile','recalculate'])('%s cannot submit the internal trip count even without a delivery command',async operation=>{
 const query=jest.fn();await expect(retain({query},{...input(),operation,payload:{parameters:{selected_delivery_admitted_trip_count:'3'}}})).rejects.toMatchObject({code:'SELECTED_DELIVERY_RECONCILIATION_REQUIRED',reason:'client-cannot-set-derived-trip-count'});expect(query).not.toHaveBeenCalled();
});

test.each([
 {ownerUserId:'other-owner',organizationId:null},
 {ownerUserId:'authenticated-owner',organizationId:'other-tenant'},
])('a visible shared revision in scope %p exposes no private delivery capability',async parentScope=>{
 await expect(preview({query:jest.fn()},{...previewInput(),parentScope})).resolves.toBeNull();
 expect(reader).not.toHaveBeenCalled();expect(adapter).not.toHaveBeenCalled();
});

test('a missing or inaccessible saved parent cannot silently pass the no-drop guard',async()=>{
 await expect(retain({query:jest.fn().mockResolvedValue({rows:[]})},{...input(),payload:{parameters:{q:20}}}))
  .rejects.toMatchObject({code:'SELECTED_DELIVERY_RECONCILIATION_REQUIRED',reason:'saved-delivery-parent-unavailable'});
});
