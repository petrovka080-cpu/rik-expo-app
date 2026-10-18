import {createHash} from 'node:crypto';
import {selectedMaterialDeliveryTestContextR1} from './selectedMaterialDeliveryTestContextR1';
import {admitCanonicalSelectedMaterialDeliveryR1 as admit,canonicalSelectedDeliveryDerivedParametersR1 as provenance,finalizeCanonicalSelectedDeliveryReceiptR1 as finish,selectedMaterialDeliveryRowOverridesR1 as retainOverrides} from '../../scripts/estimate/backendMigration/canonicalSelectedMaterialDeliveryAdmissionR1';
import {canonicalInheritedConfirmedParameters} from '../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter';
import {buildSelectedMaterialDeliveryForwardR1 as build,SELECTED_DELIVERY_ROW_R1 as rowId,SELECTED_DELIVERY_PREFIX_R1 as prefix} from '../../scripts/estimate/r4a13/selectedMaterialDeliveryForwardR1';
import {compileCanonicalEstimateCore as compile} from '../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {FORD_TRANSIT_V363_DELIVERY_PRODUCT_PROFILE_ID as profile} from '../../src/lib/estimate/v4/domainFactory/deliveryFordTransitPhysicalNormV1';

// Portable controlled order by default; a pinned recorded order is available
// to the explicit local controller. Neither path persists a child revision.
const fixture=selectedMaterialDeliveryTestContextR1();
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
function setup(){
 const parent=fixture.parents.find((p:any)=>p.entry.catalog_id.endsWith('facade_paint_install_standard'));
 const saved=structuredClone(parent.saved.find((s:any)=>s.revision.definition_version_id===parent.definition.id&&s.rows.some((r:any)=>r.calculation_trace.purchaseBalance?.procurementReady&&r.included_in_procurement)));
 const model:any=build(parent,parent.pin,{guideSnapshotSha256:fixture.normPackSha256});
 const source={definition:parent.definition,resources:parent.resources,parameters:parent.parameters,formulas:parent.formulas,priceBindings:parent.priceBindings};
 const target={definition:{...parent.definition,id:'synthetic-target-definition'},resources:model.resources,parameters:model.parameters,formulas:model.formulas,priceBindings:[] as Array<Record<string,unknown>>};
 const orders=saved.rows.filter((r:any)=>r.included_in_procurement&&r.calculation_trace.purchaseBalance?.procurementReady&&Number(r.quantity)>0);
 const command={contractVersion:'canonical-selected-material-delivery-command/v1',documentReference:'synthetic:one shipment document',documentCapturedAt:'2026-10-17T00:00:00Z',consignmentId:'synthetic:one consignment',separatePaymentConfirmed:true,
  skuBindings:orders.map((r:any)=>({rowId:r.row_id,skuKey:'synthetic:supplier-sku:'+r.row_id}))};
 const parameters={...saved.revision.input_parameters,...Object.fromEntries(Object.entries({selection:'SEPARATE_CONFIRMED',document_reference:command.documentReference,consignment_id:command.consignmentId,
  product_profile_id:profile,cargo_weight_kg:5000,cargo_volume_m3:18,selected_vehicle_model_and_derivative:'FORD_TRANSIT_V363_500_L4_H3',
  selected_verified_usable_payload_kg:2357,selected_verified_usable_loadspace_m3:15.1,selected_verified_kerb_mass_kg:2500,
  driver_crew_options_and_accessories_weight_kg:100,payload_margin_for_error_kg:125,axle_load_limits_confirmed:true,
  load_securing_and_compatibility_confirmed:true,route_and_access_confirmed:true,supplier_billing_scope:'SUPPLIER_SCOPE:synthetic separate transport quotation',
 }).map(([key,value])=>[prefix+key,value]))};
 const readSet:any={phase:'INTAKE',fence:{contractVersion:'canonical-selected-delivery-read-fence/v1',parentRevisionId:saved.revision.id,parentChecksumSha256:saved.revision.checksum_sha256,readSetSha256:'a'.repeat(64)},
  snapshot:{parent:saved.revision,rows:saved.rows,prices:saved.prices,definitions:[source,target],targetManifest:{definition_version_id:target.definition.id},originLineage:[]},existingDeliveryReceipt:null};
 return {parent,saved,model,source,target,command,parameters,readSet};
}
async function createChild(extraOverride:Record<string,unknown>={},customRows:Record<string,unknown>[]=[]){
 const current=setup(),admission=admit(current),overrides={...current.saved.revision.amendment_contract.rowOverrides,...(Object.keys(extraOverride).length?{[rowId]:extraOverride}:{})};
 const compiled=await compile({operation:'recalculate',compilerVersion:'delivery16-recorded-source-integration',catalogId:current.parent.entry.catalog_id,primaryMeasureParameterId:'q',
  parameterDefinitions:current.model.parameters,formulaDefinitions:current.model.formulas,resourceDefinitions:current.model.resources,
  submittedParameters:{...current.parameters,...admission.confirmedParameters},confirmedParameters:{},currencyCode:'KGS',rowOverrides:overrides,customRows,maximumResourceRows:1000,hashJson:hash});
 const receipt=finish(admission,compiled.rows),childId='synthetic-child-of-actual-saved-revision';
 const revision={...current.saved.revision,id:childId,parent_revision_id:current.saved.revision.id,definition_version_id:current.target.definition.id,
  input_parameters:compiled.parameters,checksum_sha256:hash({...compiled.revisionProjection,selectedMaterialDeliveryV1:receipt}),row_count:compiled.rows.length,
  amendment_contract:{...current.saved.revision.amendment_contract,rowOverrides:overrides,parameterSources:{...current.saved.revision.amendment_contract.parameterSources,selectedMaterialDeliveryV1:receipt}}};
 const delivery=compiled.rows.find(r=>r.row_id===rowId)!;
 const prices=delivery.unit_price===null?[]:[{row_id:rowId,unit_price:delivery.unit_price,currency_code:'KGS',price_snapshot_id:null,route_id:null,resolution_trace:{kind:'manual_override',provenance:{kind:'manual'}}}];
 const readSet={...current.readSet,phase:'WORKER',existingDeliveryReceipt:receipt,
  snapshot:{...current.readSet.snapshot,parent:revision,rows:compiled.rows,prices,definitions:[current.target],
   originLineage:[{id:childId,checksum_sha256:revision.checksum_sha256},{id:current.saved.revision.id,checksum_sha256:current.saved.revision.checksum_sha256}]}};
 return {...current,readSet,parameters:compiled.parameters,admission,receipt,compiled};
}
test('the saved order supplies quantities and units; a request supplies no trusted owner or quantity',()=>{
 const current=setup(),before=JSON.stringify(current),result=admit(current);
 expect(result.planned).toMatchObject({status:'PLANNING_PROPOSAL',proposal:{quantityText:'3',unitPrice:null}});
 expect(result.confirmedParameters[prefix+'admitted_trip_count']).toBe('3');expect(JSON.stringify(current)).toBe(before);
});

test('the actual compiler admission input is saved separately and stripped before fresh admission',async()=>{
 const child=await createChild(),key=prefix+'admitted_trip_count';
 expect(Object.hasOwn(child.compiled.derivedParameters,key)).toBe(false);
 const parameters={...child.parameters};delete parameters[key];
 const derived=provenance({admission:child.admission,parameterDefinitions:child.model.parameters,parameters:child.compiled.parameters,
  derivedParameters:child.compiled.derivedParameters,submittedParameters:parameters,userParameters:parameters,baselineParameters:{}});
 expect(derived[key]).toBe(child.compiled.parameters[key]);
 expect({...parameters,...derived}).toEqual(child.compiled.parameters);
 expect(canonicalInheritedConfirmedParameters(child.compiled.parameters,derived)).not.toHaveProperty(key);
 expect(child.compiled.derivedParameters).not.toHaveProperty(key);
});

test.each(['submittedParameters','userParameters','baselineParameters','parameters','derivedParameters','parameterDefinitions'])(
 'a server trip derivation rejects a conflicting %s',async field=>{
 const child=await createChild(),key=prefix+'admitted_trip_count',parameters={...child.parameters};delete parameters[key];
 const input:any={admission:child.admission,parameterDefinitions:structuredClone(child.model.parameters),parameters:child.compiled.parameters,
  derivedParameters:child.compiled.derivedParameters,submittedParameters:parameters,userParameters:parameters,baselineParameters:{}};
 if(field==='parameterDefinitions')input.parameterDefinitions.find((p:any)=>p.parameter_id===key).truth_metadata.value_source_role='USER_INPUT';
 else input[field]={...input[field],[key]:field==='parameters'||field==='derivedParameters'?'4':'3'};
 expect(()=>provenance(input)).toThrow(expect.objectContaining({reason:'compiled-delivery-provenance-invalid'}));
});
test('parent to child and reopen preserve the original shipment identity and one owner',async()=>{
 const child=await createChild(),reopened=admit(child);
 expect(reopened.planned).toMatchObject({status:'EXISTING_OWNER',proposal:null,existingOwnerKey:child.admission.ownerKey});
 expect(reopened.originRevisionId).toBe(child.saved.revision.id);expect(reopened.originRevisionId).not.toBe(child.readSet.snapshot.parent.id);
 expect(reopened.shipmentWitness).toEqual(child.receipt.shipmentWitness);
});
test('saved database decimal scale does not manufacture a new shipment owner',async()=>{
 const child=await createChild();child.readSet.snapshot.rows.find((r:any)=>r.row_id===rowId).quantity='3.000000000';
 expect(admit(child).planned.status).toBe('EXISTING_OWNER');
});
test('manual price and saved title survive reopening without a new paid proposal',async()=>{
 const child=await createChild({unitPrice:'77.125',titleRu:'Доставка по сохранённому документу',provenance:{kind:'manual'}}),before=JSON.stringify(child.readSet);
 expect(admit(child).planned.status).toBe('EXISTING_OWNER');expect(JSON.stringify(child.readSet)).toBe(before);
 expect(child.compiled.rows.find(r=>r.row_id===rowId)).toMatchObject({unit_price:'77.125',title_ru:'Доставка по сохранённому документу'});
});
test('a saved exclusion is retained as the same owner instead of a replacement charge',async()=>{
 const child=await createChild({includedInEstimate:false,includedInProcurement:false,provenance:{kind:'manual'}});
 const result=admit(child);expect(result.planned.status).toBe('EXISTING_OWNER');expect(result.planned.proposal).toBeNull();
 expect(result.preservedDeliveryOverride).toMatchObject({includedInEstimate:false,includedInProcurement:false});
});

test('a partial row edit retains the saved delivery price, title and exclusion without mutating the request',async()=>{
 const child=await createChild({unitPrice:'77.125',titleRu:'Сохранённая доставка',includedInEstimate:false,includedInProcurement:false,provenance:{kind:'manual'}});
 const admission=admit(child),requested={other:{titleRu:'Другая строка'},[rowId]:{titleRu:'Уточнённое название'}},before=JSON.stringify(requested);
 expect(retainOverrides(admission,requested)).toEqual({...requested,[rowId]:{...admission.preservedDeliveryOverride,titleRu:'Уточнённое название'}});
 expect(JSON.stringify(requested)).toBe(before);
});

test('an explicit inclusion edit overrides only the requested fields of the existing owner',async()=>{
 const child=await createChild({unitPrice:'77.125',includedInEstimate:false,includedInProcurement:false,provenance:{kind:'manual'}});
 const overrides=retainOverrides(admit(child),{[rowId]:{includedInEstimate:true}});
 expect(overrides[rowId]).toMatchObject({unitPrice:'77.125',includedInEstimate:true,includedInProcurement:false,provenance:{kind:'manual'}});
});

test.each(['quantity','unit','exclusion','purchase-order'])('a changed compiled material %s cannot retain the old shipment confirmation',async field=>{
 const child=await createChild(),rows=structuredClone(child.compiled.rows),order=child.admission.confirmedOrderedRows[0]!,row=rows.find(value=>value.row_id===order.rowId)!;
 if(field==='quantity')row.quantity=String(Number(order.quantityText)+1);
 if(field==='unit')row.unit_id='kg';
 if(field==='exclusion')row.included_in_procurement=false;
 if(field==='purchase-order')(row.calculation_trace as any).purchaseBalance.effectiveOrder=String(Number(order.quantityText)+1);
 expect(()=>finish(child.admission,rows)).toThrow(expect.objectContaining({reason:'compiled-order-changed-reconciliation-required'}));
});

test('database decimal scale alone does not invalidate the compiled material order',async()=>{
 const child=await createChild(),rows=structuredClone(child.compiled.rows),order=child.admission.confirmedOrderedRows[0]!,row=rows.find(value=>value.row_id===order.rowId)!;
 row.quantity=order.quantityText.includes('.')?order.quantityText+'000000000':order.quantityText+'.000000000';(row.calculation_trace as any).purchaseBalance.effectiveOrder=row.quantity;
 expect(()=>finish(child.admission,rows)).not.toThrow();
});
test.each([
 {cargo_weight_kg:10000},{cargo_volume_m3:50},{selected_vehicle_model_and_derivative:'OTHER'},
])('changed physical shipment %p cannot reuse its previous payment',async(change)=>{
 const child=await createChild();Object.assign(child.parameters,Object.fromEntries(Object.entries(change).map(([k,v])=>[prefix+k,v])));
 expect(()=>admit(child)).toThrow(expect.objectContaining({code:'SELECTED_DELIVERY_RECONCILIATION_REQUIRED'}));
});
test('a different document needs reconciliation even when the saved paid row still exists',async()=>{
 const child=await createChild();child.command.documentReference='synthetic:changed document';child.parameters[prefix+'document_reference']=child.command.documentReference;
 expect(()=>admit(child)).toThrow(expect.objectContaining({code:'SELECTED_DELIVERY_RECONCILIATION_REQUIRED'}));
});
test('a changed SKU or saved order cannot be silently rebound to the existing shipment',async()=>{
 const child=await createChild();child.command.skuBindings[0]!.skuKey='synthetic:another-sku';
 expect(()=>admit(child)).toThrow(expect.objectContaining({code:'SELECTED_DELIVERY_RECONCILIATION_REQUIRED'}));
});
test('a legacy row without its saved receipt is not blessed from current request data',async()=>{
 const child=await createChild();child.readSet.existingDeliveryReceipt=null;
 expect(()=>admit(child)).toThrow(expect.objectContaining({reason:'saved-delivery-row-receipt-conflict'}));
});
test('changed actual row quantity or unit cannot hide behind its unchanged witness',async()=>{
 for(const change of [{quantity:'4'},{unit_id:'kg'}]){const child=await createChild();Object.assign(child.readSet.snapshot.rows.find((r:any)=>r.row_id===rowId),change);
  expect(()=>admit(child)).toThrow(expect.objectContaining({code:'SELECTED_DELIVERY_RECONCILIATION_REQUIRED'}));}
});
test('changed actual saved price record requires reconciliation',async()=>{
 const child=await createChild({unitPrice:'77.125',provenance:{kind:'manual'}});child.readSet.snapshot.prices[0].unit_price='88';
 expect(()=>admit(child)).toThrow(expect.objectContaining({reason:'saved-delivery-manual-price-conflict'}));
});
test('a new automatic route cannot transfer a price to the trip row',async()=>{
 const child=await createChild();child.target.priceBindings.push({resource_spec_id:child.model.addedResource.id,price_key:'legacy-kit-price'});
 expect(()=>admit(child)).toThrow(expect.objectContaining({reason:'automatic-delivery-price-not-admitted'}));
});
test('preview evidence cannot authorize a delivery write',()=>{
 const current=setup();current.readSet.phase='PREVIEW';expect(()=>admit(current)).toThrow(expect.objectContaining({reason:'preview-is-not-admission'}));
});
test('a caller-supplied owner list or quantity is rejected by the document command schema',()=>{
 const current=setup();Object.assign(current.command,{existingOwners:[],quantityText:'3'});
 expect(()=>admit(current)).toThrow(expect.objectContaining({reason:'document-command-invalid'}));
});
test('a separate payment requires an explicit document acknowledgement',()=>{
 const current=setup();current.command.separatePaymentConfirmed=false as true;
 expect(()=>admit(current)).toThrow(expect.objectContaining({reason:'document-command-invalid'}));
});
test('an incomplete saved order never becomes paid transport',()=>{
 const current=setup();current.readSet.snapshot.rows.find((r:any)=>r.row_id===current.command.skuBindings[0]!.rowId).calculation_trace.purchaseBalance.procurementReady=false;
 expect(()=>admit(current)).toThrow(expect.objectContaining({reason:'saved-sku-order-not-ready'}));
});

const parallelTransport=(extra:Record<string,unknown>={})=>({clientRowId:'parallel-delivery',section:'Доставка',category:'transport',titleRu:'Ручная перевозка партии',unitId:'trip',quantity:'1',unitPrice:'700',
 includedInEstimate:true,includedInProcurement:false,provenance:{kind:'manual'},...extra});

test.each([
 ['transport','700'],['transport',null],['delivery','700'],['delivery',null],
])('a newly compiled %s row at price %s requires payment-scope reconciliation before the receipt is saved',async(category,unitPrice)=>{
 await expect(createChild({},[parallelTransport({category,unitPrice})])).rejects.toMatchObject({code:'SELECTED_DELIVERY_RECONCILIATION_REQUIRED',reason:'compiled-transport-payment-scope-review-required'});
});

test.each([
 ['excluded',{includedInEstimate:false}],['zero',{quantity:'0'}],['unrelated equipment',{category:'equipment',unitId:'machine_hour',titleRu:'Нормативная подача материалов'}],
] as const)('a %s custom row does not create a parallel payable shipment',async(_name,extra)=>{
 const child=await createChild({},[parallelTransport(extra)]);
 expect(child.receipt.transportRowId).toBe(rowId);expect(child.receipt.ownerKey).toBe(child.admission.ownerKey);
 expect(child.compiled.rows.filter(row=>row.row_id===rowId)).toHaveLength(1);
});
