import {createHash} from 'node:crypto';
import {canonicalEstimateStableJson} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {canonicalManualPriceMigrationBindings} from '../../../src/lib/estimate/backendPlatform/canonicalManualPriceReleaseMigration';
import {compareFormulaGraphDecimals} from '../../../src/lib/estimate/backendPlatform/formulaGraph';
import {prepareSelectedMaterialDeliveryR1,selectedDeliveryOrderBasisR1,type SelectedMaterialDeliveryInputR1} from '../../../src/lib/estimate/v4/selectedMaterialDeliveryReuseR1';
import type {ProfessionalParameterValueV4} from '../../../src/lib/estimate/v4/professionalProjectAssemblyV4';
import {FORD_TRANSIT_V363_DELIVERY_SOURCE_METADATA as norm,FORD_TRANSIT_V363_DELIVERY_REQUIRED_EXPLICIT_PARAMETER_IDS as required} from '../../../src/lib/estimate/v4/domainFactory/deliveryFordTransitPhysicalNormV1';
import type {readCanonicalSelectedDeliveryReadSetR1} from './canonicalSelectedMaterialDeliveryReadSetR1';

type Json=Record<string,any>;
type ReadSet=Awaited<ReturnType<typeof readCanonicalSelectedDeliveryReadSetR1>>;
const rowId='delivery:selected-material:ford-transit-v363',prefix='selected_delivery_',quantityId=prefix+'admitted_trip_count';
const hash=(value:unknown)=>createHash('sha256').update(canonicalEstimateStableJson(value)).digest('hex');
const fail=(reason:string)=>Object.assign(new Error('Доставка требует сверки сохранённой партии, строки или оплаты. Исходная смета сохранена.'),
 {code:'SELECTED_DELIVERY_RECONCILIATION_REQUIRED',httpStatus:409,reason});
const object=(value:unknown):Json=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Json:{};
const decimal=(value:unknown):string=>{
 if(typeof value!=='string'||!/^(?:0|[1-9]\d*)(?:\.\d+)?$/u.test(value))throw fail('saved-order-quantity-invalid');
 return value.includes('.')?value.replace(/0+$/u,'').replace(/\.$/u,''):value;
};
const sameDecimal=(a:unknown,b:unknown)=>typeof a==='string'&&typeof b==='string'&&/^(?:0|[1-9]\d*)(?:\.\d+)?$/u.test(a)
 &&/^(?:0|[1-9]\d*)(?:\.\d+)?$/u.test(b)&&compareFormulaGraphDecimals(a,b)===0;
const otherTransportPayment=(row:Json)=>row.row_id!==rowId&&['delivery','transport'].includes(row.category)
 &&row.included_in_estimate===true&&typeof row.quantity==='string'&&compareFormulaGraphDecimals(row.quantity,'0')>0;
export type SelectedMaterialDeliveryCommandR1=Readonly<{
 contractVersion:'canonical-selected-material-delivery-command/v1';
 consignmentId:string;documentReference:string;documentCapturedAt:string;separatePaymentConfirmed:true;
 skuBindings:readonly Readonly<{rowId:string;skuKey:string}>[];
}>;
export function parseSelectedMaterialDeliveryCommandR1(raw:unknown):SelectedMaterialDeliveryCommandR1{
 const command=object(raw);
 if(Object.keys(command).some(k=>!['contractVersion','consignmentId','documentReference','documentCapturedAt','separatePaymentConfirmed','skuBindings'].includes(k))
  ||command.contractVersion!=='canonical-selected-material-delivery-command/v1'||command.separatePaymentConfirmed!==true
  ||!['consignmentId','documentReference'].every(k=>typeof command[k]==='string'&&command[k].trim()===command[k]&&command[k].length>0&&command[k].length<=500)
  ||typeof command.documentCapturedAt!=='string'||!/^\d{4}-\d{2}-\d{2}T/u.test(command.documentCapturedAt)||!Number.isFinite(Date.parse(command.documentCapturedAt))
  ||!Array.isArray(command.skuBindings)||command.skuBindings.length===0||command.skuBindings.length>200
  ||command.skuBindings.some((rawBinding:unknown)=>{const binding=object(rawBinding);return Object.keys(binding).length!==2
   ||!['rowId','skuKey'].every(k=>typeof binding[k]==='string'&&binding[k].trim()===binding[k]&&binding[k].length>0&&binding[k].length<=500);})
  ||new Set(command.skuBindings.map((binding:Json)=>binding.rowId)).size!==command.skuBindings.length)throw fail('document-command-invalid');
 return command as SelectedMaterialDeliveryCommandR1;
}

function rowPriceBinding(definition:Json):string{
 const resource=definition.resources.find((row:Json)=>row.row_id===rowId);
 const binding=canonicalManualPriceMigrationBindings({resources:definition.resources,formulas:definition.formulas,parameters:definition.parameters})[rowId];
 if(!resource||!binding)throw fail('definition-owned-delivery-missing');
 return hash({binding,routes:definition.priceBindings.filter((route:Json)=>route.resource_spec_id===resource.id)});
}

/** A server adapter for one immutable revision. It never trusts a client
 * owner list, quantity, saved row, price or receipt; those come from readSet.
 * SKU/document/vehicle facts remain explicit user-declared project evidence.
 */
export function admitCanonicalSelectedMaterialDeliveryR1(input:Readonly<{
 readSet:ReadSet;command:unknown;parameters:Readonly<Record<string,unknown>>;
}>){
 if(input.readSet.phase==='PREVIEW')throw fail('preview-is-not-admission');
 const command=parseSelectedMaterialDeliveryCommandR1(input.command),snapshot=input.readSet.snapshot,parent=snapshot.parent;
 const target=snapshot.definitions.find((entry:Json)=>entry.definition.id===snapshot.targetManifest.definition_version_id);
 const source=snapshot.definitions.find((entry:Json)=>entry.definition.id===parent.definition_version_id);
 if(!target||!source)throw fail('source-target-definition-missing');
 const targetResource=target.resources.find((row:Json)=>row.row_id===rowId);
 if(!targetResource||targetResource.resource_graph?.selectedMaterialDeliveryR1?.serverAdmissionRequired!==true
  ||targetResource.unit_id!=='trip'||targetResource.cost_owner_id!==rowId
  ||targetResource.source_metadata?.automaticGenericPriceInheritanceAllowed!==false)throw fail('delivery-not-available-in-target-definition');
 if(target.priceBindings.some((binding:Json)=>binding.resource_spec_id===targetResource.id))throw fail('automatic-delivery-price-not-admitted');
 if(input.parameters[prefix+'selection']!=='SEPARATE_CONFIRMED'
  ||input.parameters[prefix+'document_reference']!==command.documentReference
  ||input.parameters[prefix+'consignment_id']!==command.consignmentId)throw fail('document-parameter-context-changed');
 if(snapshot.rows.some(otherTransportPayment))throw fail('existing-transport-payment-scope-review-required');
 const orderedRows=command.skuBindings.map(binding=>{
  const saved=snapshot.rows.find((row:Json)=>row.row_id===binding.rowId);
  const purchase=object(saved?.calculation_trace?.purchaseBalance);
  if(!saved||saved.included_in_procurement!==true||purchase.procurementReady!==true||purchase.ownerRowId!==saved.row_id
   ||purchase.unitId!==saved.unit_id||!sameDecimal(saved.quantity,purchase.effectiveOrder))throw fail('saved-sku-order-not-ready');
  return {rowId:saved.row_id,skuKey:binding.skuKey,quantityText:decimal(saved.quantity),unitId:saved.unit_id,procurementReady:true};
 });
 const receipt=object(input.readSet.existingDeliveryReceipt),hasReceipt=input.readSet.existingDeliveryReceipt!==null;
 const originRevisionId=hasReceipt?receipt.originRevisionId:parent.id,originChecksumSha256=hasReceipt?receipt.originChecksumSha256:parent.checksum_sha256;
 if(hasReceipt&&(!snapshot.originLineage.some((entry:Json)=>entry.id===originRevisionId&&entry.checksum_sha256===originChecksumSha256)
  ||receipt.transportRowId!==rowId||receipt.savedDefinitionId!==source.definition.id))throw fail('saved-delivery-origin-invalid');
 const units:Record<string,string>={cargo_weight_kg:'kg',cargo_volume_m3:'m3',selected_verified_usable_payload_kg:'kg',
  selected_verified_usable_loadspace_m3:'m3',selected_verified_kerb_mass_kg:'kg',driver_crew_options_and_accessories_weight_kg:'kg',payload_margin_for_error_kg:'kg'};
 const values:Record<string,ProfessionalParameterValueV4>={};
 for(const key of ['product_profile_id',...required]){
  const value=input.parameters[prefix+key];
  if(typeof value!=='string'&&typeof value!=='number'&&typeof value!=='boolean')throw fail('document-vehicle-fact-missing');
  values[key]={value,unit_id:units[key]??null,source_type:'PROJECT_DOCUMENT',source_id:'selected-delivery-document:'+command.documentReference,
   captured_at:command.documentCapturedAt,confidence:'high',applicability:'User-declared selected consignment, vehicle and separate supplier payment; not an independently authenticated supplier document.'};
 }
 const basisInput={catalogId:parent.catalog_id,revisionId:originRevisionId,orderedRows};
 const basis=selectedDeliveryOrderBasisR1(basisInput),existingOwners:SelectedMaterialDeliveryInputR1['existingOwners'][number][]=[];
 const savedDeliveryRows=snapshot.rows.filter((row:Json)=>row.row_id===rowId);
 if(savedDeliveryRows.length!==Number(hasReceipt))throw fail('saved-delivery-row-receipt-conflict');
 if(hasReceipt){
  const row=savedDeliveryRows[0],resource=source.resources.find((r:Json)=>r.row_id===rowId);
  if(!row||!resource||row.row_sha256!==receipt.savedRowSha256||row.resource_spec_id!==resource.id
   ||!(row.included_in_estimate===true&&row.ownership_status==='OWNED'
     ||row.included_in_estimate===false&&row.included_in_procurement===false&&row.ownership_status==='OWNED_EXCLUDED'))throw fail('saved-delivery-row-or-exclusion-changed');
  if(rowPriceBinding(source)!==receipt.savedPriceBindingSha256||rowPriceBinding(target)!==receipt.savedPriceBindingSha256)throw fail('saved-delivery-price-binding-changed');
  const price=snapshot.prices.find((p:Json)=>p.row_id===rowId);
  if(row.unit_price===null){if(price?.unit_price!=null)throw fail('unpriced-delivery-price-record-conflict');}
  else if(!price||price.price_snapshot_id!==null||price.route_id!==null||price.resolution_trace?.kind!=='manual_override'
   ||!sameDecimal(row.unit_price,price.unit_price)||row.currency_code!==price.currency_code
   ||!sameDecimal(String(parent.amendment_contract?.rowOverrides?.[rowId]?.unitPrice??''),row.unit_price))throw fail('saved-delivery-manual-price-conflict');
  const trace=row.normative_trace?.find((entry:Json)=>entry.source_id===norm.source_id&&entry.norm_id===norm.norm_id);
  if(!trace||trace.source_definition_hash!==norm.definition_hash)throw fail('saved-delivery-norm-changed');
  const quantity=decimal(row.quantity);if(!/^[1-9]\d*$/u.test(quantity)||!Number.isSafeInteger(Number(quantity)))throw fail('saved-trip-count-invalid');
  existingOwners.push({ownerKey:receipt.ownerKey,revisionId:originRevisionId,consignmentId:receipt.consignmentId,
   orderBasisSha256:receipt.orderBasisSha256,shipmentWitness:receipt.shipmentWitness,quantityText:quantity,
   unitId:row.unit_id,costTreatment:resource.resource_graph?.costTreatment,sourceId:trace.source_id,normId:trace.norm_id,
   sourceDefinitionHash:trace.source_definition_hash,documentReference:parent.input_parameters[prefix+'document_reference']});
 }
 const planned=prepareSelectedMaterialDeliveryR1({...basisInput,shipment:{revisionId:originRevisionId,consignmentId:command.consignmentId,
  orderBasisSha256:basis,documentReference:command.documentReference,values},existingOwners});
 if(!['PLANNING_PROPOSAL','EXISTING_OWNER'].includes(planned.status))throw fail('shipment-'+planned.status);
 const count=planned.resolution?.status==='APPLIED'?planned.resolution.calculated_ford_transit_required_trip_count:undefined;
 if(count===undefined||!Number.isSafeInteger(count)||count<=0)throw fail('trip-output-invalid');
 return {planned,command,originRevisionId,originChecksumSha256,confirmedOrderedRows:orderedRows,
  confirmedParameters:{[quantityId]:String(count)},readFence:input.readSet.fence,
  ownerKey:planned.existingOwnerKey??planned.proposal!.ownerKey,orderBasisSha256:basis,
  shipmentWitness:planned.proposal?.shipmentWitness??receipt.shipmentWitness,
  targetDefinitionId:target.definition.id,targetPriceBindingSha256:rowPriceBinding(target),
  storedReceipt:hasReceipt?receipt:null,
  preservedDeliveryOverride:hasReceipt?parent.amendment_contract?.rowOverrides?.[rowId]??null:null,
  globalConsignmentPaymentUniquenessProven:false as const};
}

export function finalizeCanonicalSelectedDeliveryReceiptR1(admission:ReturnType<typeof admitCanonicalSelectedMaterialDeliveryR1>,rows:readonly Json[]){
 // Intake sees the immutable parent. The same command may also add a custom
 // transport row, so apply its existing scope rule to the actual final rows
 // before the revision writer can save a receipt or another payable owner.
 if(rows.some(otherTransportPayment))throw fail('compiled-transport-payment-scope-review-required');
 for(const order of admission.confirmedOrderedRows){
  const matches=rows.filter(row=>row.row_id===order.rowId),saved=matches[0],purchase=object(saved?.calculation_trace?.purchaseBalance);
  if(matches.length!==1||saved.included_in_procurement!==true||saved.unit_id!==order.unitId
   ||!sameDecimal(saved.quantity,order.quantityText)||purchase.procurementReady!==true
   ||purchase.ownerRowId!==order.rowId||purchase.unitId!==order.unitId||!sameDecimal(purchase.effectiveOrder,order.quantityText))throw fail('compiled-order-changed-reconciliation-required');
 }
 const delivery=rows.filter(row=>row.row_id===rowId);
 if(delivery.length!==1||delivery[0]!.unit_id!=='trip'||!sameDecimal(delivery[0]!.quantity,admission.confirmedParameters[quantityId]!)
  ||!(delivery[0]!.included_in_estimate===true||delivery[0]!.included_in_estimate===false&&delivery[0]!.included_in_procurement===false))throw fail('compiled-delivery-row-invalid');
 return {contractVersion:'canonical-selected-material-delivery-receipt/v1' as const,
  originRevisionId:admission.originRevisionId,originChecksumSha256:admission.originChecksumSha256,
  transportRowId:rowId,ownerKey:admission.ownerKey,consignmentId:admission.command.consignmentId,
  documentReference:admission.command.documentReference,orderBasisSha256:admission.orderBasisSha256,shipmentWitness:admission.shipmentWitness,
  savedRowSha256:delivery[0]!.row_sha256,savedDefinitionId:admission.targetDefinitionId,
  savedPriceBindingSha256:admission.targetPriceBindingSha256,command:admission.command,
  savedExcluded:delivery[0]!.included_in_estimate===false,
  sourceReadFence:admission.readFence,globalConsignmentPaymentUniquenessProven:false as const};
}

export function selectedMaterialDeliveryRowOverridesR1(admission:ReturnType<typeof admitCanonicalSelectedMaterialDeliveryR1>,requested:Json){
 const previous=admission.preservedDeliveryOverride;
 if(previous===null)return requested;
 return {...requested,[rowId]:{...previous,...object(requested[rowId])}};
}
