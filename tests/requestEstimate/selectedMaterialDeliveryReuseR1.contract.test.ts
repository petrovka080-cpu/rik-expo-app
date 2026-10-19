// WORK next wave; synthetic shipment facts, not product mass/volume defaults.
import pack from '../../data/estimate-benchmarks/source-packs/selected-material-delivery-reuse-r1.json';
import {prepareSelectedMaterialDeliveryR1,selectedDeliveryOrderBasisR1,
  type SelectedMaterialDeliveryInputR1} from '../../src/lib/estimate/v4/selectedMaterialDeliveryReuseR1';
import {FORD_TRANSIT_V363_DELIVERY_PRODUCT_PROFILE_ID} from '../../src/lib/estimate/v4/domainFactory/deliveryFordTransitPhysicalNormV1';
import type {ProfessionalParameterValueV4} from '../../src/lib/estimate/v4/professionalProjectAssemblyV4';

const fact=(value:string|number|boolean,unit_id:string|null=null):ProfessionalParameterValueV4=>({value,unit_id,
  source_type:'PROJECT_DOCUMENT',source_id:'synthetic:shipment-test',captured_at:'2026-10-16T00:00:00Z',
  confidence:'high',applicability:'Synthetic selected vehicle and consignment; no product norm'});
function input():SelectedMaterialDeliveryInputR1 {
  const context={catalogId:pack.catalogIds[0]!,revisionId:'synthetic-current-revision',
    orderedRows:[{rowId:'material-order',skuKey:'synthetic:sku',quantityText:'92',unitId:'pcs',procurementReady:true}],existingOwners:[]};
  return {...context,shipment:{revisionId:context.revisionId,consignmentId:'synthetic:consignment',orderBasisSha256:selectedDeliveryOrderBasisR1(context),
    documentReference:'synthetic:confirmed-shipment',values:{
      product_profile_id:fact(FORD_TRANSIT_V363_DELIVERY_PRODUCT_PROFILE_ID),cargo_weight_kg:fact(5000,'kg'),
      cargo_volume_m3:fact(18,'m3'),selected_vehicle_model_and_derivative:fact('FORD_TRANSIT_V363_500_L4_H3'),
      selected_verified_usable_payload_kg:fact(2357,'kg'),selected_verified_usable_loadspace_m3:fact(15.1,'m3'),
      selected_verified_kerb_mass_kg:fact(2500,'kg'),driver_crew_options_and_accessories_weight_kg:fact(100,'kg'),
      payload_margin_for_error_kg:fact(125,'kg'),axle_load_limits_confirmed:fact(true),
      load_securing_and_compatibility_confirmed:fact(true),route_and_access_confirmed:fact(true),
      supplier_billing_scope:fact('SUPPLIER_SCOPE:synthetic per-trip quotation')}}};
}
test('the finite mapping preserves seven/eight/one consumers and adds exactly the declared masonry consumer',()=>{
  expect(pack.catalogIds).toHaveLength(17);expect(new Set(pack.catalogIds).size).toBe(17);
  expect(pack.groups.map(group=>group.catalogIds.length)).toEqual([7,8,1,1]);
  expect(pack.catalogIds).toEqual(pack.groups.flatMap(group=>group.catalogIds));
});
test('one existing applicability owner supplies whole trips, never copied material prices or unloading',()=>{
  const source=input(),before=JSON.stringify(source),result=prepareSelectedMaterialDeliveryR1(source);
  expect(result).toMatchObject({status:'PLANNING_PROPOSAL',planningOnly:true,publicationReady:false,
    proposal:{quantityText:'3',unitId:'trip',unitPrice:null,currencyCode:null,unloadingLaborIncluded:false,
      procurementReady:false,materialPriceOrConsumptionChanged:false}});
  expect(result.resolution?.norm_id).toBe('delivery_ford_transit_v363_max_payload_trip_per_kg_v1');
  expect(JSON.stringify(source)).toBe(before);
});
test('missing shipment and a stale revision or order basis do not create a priceable row',()=>{
  const source=input();
  expect(prepareSelectedMaterialDeliveryR1({...source,shipment:null}).status).toBe('SHIPMENT_FACTS_REQUIRED');
  expect(prepareSelectedMaterialDeliveryR1({...source,shipment:{...source.shipment!,revisionId:'old'}}).proposal).toBeNull();
  expect(prepareSelectedMaterialDeliveryR1({...source,orderedRows:[{...source.orderedRows[0]!,quantityText:'93'}]}).proposal).toBeNull();
});
test('blocked supply and zero order never become ready freight',()=>{
  const source=input();
  expect(prepareSelectedMaterialDeliveryR1({...source,orderedRows:[{...source.orderedRows[0]!,procurementReady:false}]}).status).toBe('ORDER_NOT_READY');
  expect(prepareSelectedMaterialDeliveryR1({...source,orderedRows:[{...source.orderedRows[0]!,quantityText:'0'}]}).status).toBe('NO_ORDERED_CARGO');
});
test('an existing owner is retained and ambiguity is blocked instead of adding duplicate transport',()=>{
  const source=input(),owner={...prepareSelectedMaterialDeliveryR1(source).proposal!,ownerKey:'retained-owner',revisionId:source.revisionId,consignmentId:source.shipment!.consignmentId,orderBasisSha256:source.shipment!.orderBasisSha256};
  expect(prepareSelectedMaterialDeliveryR1({...source,existingOwners:[owner]})).toMatchObject({status:'EXISTING_OWNER',proposal:null,existingOwnerKey:'retained-owner'});
  expect(prepareSelectedMaterialDeliveryR1({...source,existingOwners:[owner,{...owner,ownerKey:'second'}]}).status).toBe('OWNER_AMBIGUOUS');
});
test('one consignment keeps one owner across catalogues and a changed cargo basis requires reconciliation',()=>{
  const source=input(),owner={...prepareSelectedMaterialDeliveryR1(source).proposal!,ownerKey:'one-shared-transport',revisionId:source.revisionId,
    consignmentId:source.shipment!.consignmentId,orderBasisSha256:source.shipment!.orderBasisSha256};
  expect(prepareSelectedMaterialDeliveryR1({...source,catalogId:pack.catalogIds[7]!,existingOwners:[owner]}).existingOwnerKey).toBe(owner.ownerKey);
  expect(prepareSelectedMaterialDeliveryR1({...source,existingOwners:[{...owner,orderBasisSha256:'old-cargo'}]}).status).toBe('OWNER_CONTEXT_CONFLICT');
});
test('mass cannot silently be treated as volume and old manufacturer applicability restrictions stay active',()=>{
  const source=input(),shipment=source.shipment!;
  expect(prepareSelectedMaterialDeliveryR1({...source,shipment:{...shipment,values:{...shipment.values,cargo_weight_kg:fact(5000,'m3')}}}).status).toBe('SHIPMENT_UNIT_CONFLICT');
  expect(prepareSelectedMaterialDeliveryR1({...source,shipment:{...shipment,values:{...shipment.values,route_and_access_confirmed:fact(false)}}}).status).toBe('APPLICABILITY_NOT_CONFIRMED');
});
test('an undeclared technology and an unselected vehicle get no generic delivery norm',()=>{
  const source=input();
  expect(prepareSelectedMaterialDeliveryR1({...source,catalogId:'mechanized:unmapped'}).status).toBe('NOT_APPLICABLE_CATALOG');
  expect(prepareSelectedMaterialDeliveryR1({...source,shipment:{...source.shipment!,values:{}}}).status).toBe('APPLICABILITY_NOT_CONFIRMED');
});

// Regression cases use exact order-bound synthetic shipments. No production mass defaults.
function quantityInput(quantityText:string) {
  const source=input();const changed={...source,orderedRows:[{...source.orderedRows[0]!,quantityText}]};
  return {...changed,shipment:{...source.shipment!,orderBasisSha256:selectedDeliveryOrderBasisR1(changed)}};
}
test.each(['-1','-0','abc','NaN','Infinity','1e3','0x10','1,5',' 1','1 ','+1','.5','1.','01','1\n'])
  ('rejects malformed ready order quantity %p without a transport proposal',(quantity)=>{
    expect(prepareSelectedMaterialDeliveryR1(quantityInput(quantity))).toMatchObject({status:'ORDER_NOT_READY',proposal:null});
  });
test.each(['0','0.000000000'])('zero order %s creates no paid transport',(quantity)=>{
  expect(prepareSelectedMaterialDeliveryR1(quantityInput(quantity))).toMatchObject({status:'NO_ORDERED_CARGO',proposal:null});
});
test.each(['0.000000001','92.000000000'])('exact positive decimal %s stays usable',(quantity)=>{
  expect(prepareSelectedMaterialDeliveryR1(quantityInput(quantity))).toMatchObject({status:'PLANNING_PROPOSAL',proposal:{quantityText:'3'}});
});
test.each(pack.catalogIds)('finite mapped catalogue %s reuses the existing physical owner',(catalogId)=>{
  expect(prepareSelectedMaterialDeliveryR1({...input(),catalogId})).toMatchObject({status:'PLANNING_PROPOSAL',proposal:{quantityText:'3',unitPrice:null,procurementReady:false}});
});
test('invalid cargo basis cannot bypass validation by claiming an existing transport owner',()=>{
  const source=quantityInput('-1');
  expect(prepareSelectedMaterialDeliveryR1({...source,existingOwners:[{ownerKey:'old-owner',revisionId:source.revisionId,
    consignmentId:source.shipment!.consignmentId,orderBasisSha256:source.shipment!.orderBasisSha256}]})).toMatchObject({status:'ORDER_NOT_READY',proposal:null});
});
test('order row permutation preserves the complete consignment basis and one transport owner',()=>{
  const source=input(),rows=[...source.orderedRows,{rowId:'second',skuKey:'synthetic:second-sku',quantityText:'1.000000000',unitId:'pcs',procurementReady:true}];
  const context={...source,orderedRows:rows},basis=selectedDeliveryOrderBasisR1(context);
  const shipment={...source.shipment!,orderBasisSha256:basis};
  const first=prepareSelectedMaterialDeliveryR1({...context,shipment});
  const second=prepareSelectedMaterialDeliveryR1({...context,orderedRows:[...rows].reverse(),shipment});
  expect(first.status).toBe('PLANNING_PROPOSAL');expect(second.proposal).toEqual(first.proposal);
});
test('changes to SKU or order unit require a newly bound shipment',()=>{
  const source=input();
  for(const change of [{skuKey:'different-sku'},{unitId:'kg'}]){
    expect(prepareSelectedMaterialDeliveryR1({...source,orderedRows:[{...source.orderedRows[0]!,...change}]})).toMatchObject({status:'SHIPMENT_FACTS_REQUIRED',proposal:null});
  }
});


// The owner comes from the exact earlier proposal, not a forged authenticated read set.
function proposedShipmentOwner(source:SelectedMaterialDeliveryInputR1){
  const prior=prepareSelectedMaterialDeliveryR1(source);expect(prior.status).toBe('PLANNING_PROPOSAL');
  return {...prior.proposal!,ownerKey:prior.proposal!.ownerKey};
}
test.each([
  ['cargo_weight_kg',fact(10000,'kg')],
  ['cargo_volume_m3',fact(50,'m3')],
  ['selected_verified_usable_payload_kg',fact(2412,'kg')],
  ['selected_verified_usable_loadspace_m3',fact(8,'m3')],
  ['driver_crew_options_and_accessories_weight_kg',fact(200,'kg')],
  ['route_and_access_confirmed',fact(false)],
  ['selected_vehicle_model_and_derivative',fact('OTHER_VEHICLE')],
  ['product_profile_id',fact('OTHER_PROFILE')],
  ['supplier_billing_scope',fact('SUPPLIER_SCOPE:changed quotation')],
] as const)('shipment binding rejects a retained owner after %s changes',(parameterId,value)=>{
  const source=input(),owner=proposedShipmentOwner(source);
  const result=prepareSelectedMaterialDeliveryR1({...source,existingOwners:[owner],shipment:{...source.shipment!,values:{...source.shipment!.values,[parameterId]:value}}});
  expect(result.status).not.toBe('EXISTING_OWNER');expect(result.proposal).toBeNull();
});
test('shipment binding requires reconciliation when its document reference changes',()=>{
  const source=input(),owner=proposedShipmentOwner(source);
  const result=prepareSelectedMaterialDeliveryR1({...source,existingOwners:[owner],shipment:{...source.shipment!,documentReference:'synthetic:revised-shipment-document'}});
  expect(result.status).not.toBe('EXISTING_OWNER');expect(result.proposal).toBeNull();
});
test('shipment binding does not silently bless a legacy owner with no shipment witness',()=>{
  const source=input(),legacy={ownerKey:'legacy-owner',revisionId:source.revisionId,consignmentId:source.shipment!.consignmentId,orderBasisSha256:source.shipment!.orderBasisSha256};
  const result=prepareSelectedMaterialDeliveryR1({...source,existingOwners:[legacy]});
  expect(result.status).not.toBe('EXISTING_OWNER');expect(result.proposal).toBeNull();
});
test('shipment binding preserves the exact numeric fact across a three-to-four trip boundary',()=>{
  const original=input(),source={...original,shipment:{...original.shipment!,values:{...original.shipment!.values,cargo_weight_kg:fact(6396,'kg')}}};
  const owner=proposedShipmentOwner(source);expect(owner.quantityText).toBe('3');
  const changed={...source,shipment:{...source.shipment,values:{...source.shipment.values,cargo_weight_kg:fact(6396.0000001,'kg')}}};
  expect(prepareSelectedMaterialDeliveryR1(changed).proposal?.quantityText).toBe('4');
  const result=prepareSelectedMaterialDeliveryR1({...changed,existingOwners:[owner]});
  expect(result.status).not.toBe('EXISTING_OWNER');expect(result.proposal).toBeNull();
});
test('shipment binding keeps one unchanged owner across catalogues and object key order',()=>{
  const source=input(),owner=proposedShipmentOwner(source);
  const values=Object.fromEntries(Object.entries(source.shipment!.values).reverse());
  expect(prepareSelectedMaterialDeliveryR1({...source,catalogId:pack.catalogIds[7]!,shipment:{...source.shipment!,values},existingOwners:[owner]})).toMatchObject({status:'EXISTING_OWNER',proposal:null,existingOwnerKey:owner.ownerKey});
});
test('shipment binding cannot hide a conflicting supplied trip output behind an existing owner',()=>{
  const source=input(),owner=proposedShipmentOwner(source);
  const result=prepareSelectedMaterialDeliveryR1({...source,shipment:{...source.shipment!,values:{...source.shipment!.values,ford_transit_required_trip_count:fact(999,'trip')}},existingOwners:[owner]});
  expect(result.status).not.toBe('EXISTING_OWNER');expect(result.proposal).toBeNull();
});

test('shipment binding requires reconciliation for an unknown witness version',()=>{
  const source=input(),owner=proposedShipmentOwner(source);
  const result=prepareSelectedMaterialDeliveryR1({...source,existingOwners:[{...owner,shipmentWitness:{...owner.shipmentWitness,version:'unknown-future-version'}}]});
  expect(result).toMatchObject({status:'OWNER_SHIPMENT_RECONCILIATION_REQUIRED',proposal:null,existingOwnerKey:null});
});
test('shipment binding requires reconciliation for changed exact witness content',()=>{
  const source=input(),owner=proposedShipmentOwner(source);
  const result=prepareSelectedMaterialDeliveryR1({...source,existingOwners:[{...owner,shipmentWitness:{...owner.shipmentWitness,canonicalFacts:owner.shipmentWitness.canonicalFacts+' '}}]});
  expect(result).toMatchObject({status:'OWNER_SHIPMENT_RECONCILIATION_REQUIRED',proposal:null,existingOwnerKey:null});
});
test.each([
  {source_id:'synthetic:revised-source'},
  {source_type:'SURVEY_MEASUREMENT' as const},
  {captured_at:'2026-10-17T00:00:00Z'},
  {confidence:'medium' as const},
  {applicability:'Synthetic revised source scope'},
])('shipment binding preserves fact provenance %p',(change)=>{
  const source=input(),owner=proposedShipmentOwner(source);
  const result=prepareSelectedMaterialDeliveryR1({...source,existingOwners:[owner],shipment:{...source.shipment!,values:{...source.shipment!.values,cargo_weight_kg:{...source.shipment!.values.cargo_weight_kg!,...change}}}});
  expect(result).toMatchObject({status:'OWNER_SHIPMENT_RECONCILIATION_REQUIRED',proposal:null,existingOwnerKey:null});
});
test('shipment binding still requires missing physical facts with an existing owner',()=>{
  const source=input(),owner=proposedShipmentOwner(source);
  const {cargo_volume_m3:removed,...values}=source.shipment!.values;expect(removed).toBeDefined();
  expect(prepareSelectedMaterialDeliveryR1({...source,existingOwners:[owner],shipment:{...source.shipment!,values}})).toMatchObject({status:'APPLICABILITY_NOT_CONFIRMED',proposal:null});
});
test('shipment binding checks physical units before retaining an owner',()=>{
  const source=input(),owner=proposedShipmentOwner(source);
  expect(prepareSelectedMaterialDeliveryR1({...source,existingOwners:[owner],shipment:{...source.shipment!,values:{...source.shipment!.values,cargo_weight_kg:fact(5000,'m3')}}})).toMatchObject({status:'SHIPMENT_UNIT_CONFLICT',proposal:null});
});
test.each(['axle_load_limits_confirmed','load_securing_and_compatibility_confirmed'])('shipment binding retains applicability check %s',(parameterId)=>{
  const source=input(),owner=proposedShipmentOwner(source);
  expect(prepareSelectedMaterialDeliveryR1({...source,existingOwners:[owner],shipment:{...source.shipment!,values:{...source.shipment!.values,[parameterId]:fact(false)}}})).toMatchObject({status:'APPLICABILITY_NOT_CONFIRMED',proposal:null});
});
test('shipment binding checks a changed kerb mass and matching margin as new shipment facts',()=>{
  const source=input(),owner=proposedShipmentOwner(source);
  expect(prepareSelectedMaterialDeliveryR1({...source,existingOwners:[owner],shipment:{...source.shipment!,values:{...source.shipment!.values,selected_verified_kerb_mass_kg:fact(3000,'kg'),payload_margin_for_error_kg:fact(150,'kg')}}})).toMatchObject({status:'OWNER_SHIPMENT_RECONCILIATION_REQUIRED',proposal:null});
});
test.each([NaN,Infinity,-Infinity])('shipment binding rejects a non-finite numeric fact %p',(value)=>{
  const source=input(),owner=proposedShipmentOwner(source);
  expect(prepareSelectedMaterialDeliveryR1({...source,existingOwners:[owner],shipment:{...source.shipment!,values:{...source.shipment!.values,cargo_weight_kg:fact(value,'kg')}}})).toMatchObject({status:'SHIPMENT_FACTS_INVALID',proposal:null});
});
test('shipment binding never proposes an inexact unsafe-integer trip count',()=>{
  const source=input();
  expect(prepareSelectedMaterialDeliveryR1({...source,shipment:{...source.shipment!,values:{...source.shipment!.values,cargo_weight_kg:fact(Number.MAX_VALUE,'kg')}}})).toMatchObject({status:'EXISTING_OWNER_OUTPUT_INVALID',proposal:null});
});
test('shipment binding leaves the saved owner and its price untouched when reconciliation is required',()=>{
  const source=input(),owner={...proposedShipmentOwner(source),unitPrice:77};
  const changed={...source,existingOwners:[owner],shipment:{...source.shipment!,documentReference:'synthetic:changed-document'}};
  const before=JSON.stringify(changed);
  expect(prepareSelectedMaterialDeliveryR1(changed)).toMatchObject({status:'OWNER_SHIPMENT_RECONCILIATION_REQUIRED',proposal:null,existingOwnerKey:null});
  expect(JSON.stringify(changed)).toBe(before);expect(owner.unitPrice).toBe(77);
});


// The witness describes shipment facts; it cannot stand in for the saved row.
test.each([
  ['quantityText','999'],
  ['unitId','kg'],
  ['costTreatment','INCLUDED_IN_OTHER'],
  ['sourceId','synthetic:other-manufacturer-source'],
  ['normId','synthetic:other-norm'],
  ['sourceDefinitionHash','synthetic:other-definition'],
  ['documentReference','synthetic:other-row-document'],
] as const)('saved transport row rejects changed %s despite an identical shipment witness',(key,value)=>{
  const source=input(),owner={...proposedShipmentOwner(source),[key]:value};
  const result=prepareSelectedMaterialDeliveryR1({...source,existingOwners:[owner]});
  expect(result).toMatchObject({status:'OWNER_ROW_RECONCILIATION_REQUIRED',proposal:null,existingOwnerKey:null});
});
test.each(['quantityText','unitId','costTreatment','sourceId','normId','sourceDefinitionHash','documentReference'] as const)
  ('saved transport row requires persisted %s instead of filling it from current facts',(key)=>{
    const source=input(),owner:Record<string,unknown>={...proposedShipmentOwner(source)};
    delete owner[key];
    const result=prepareSelectedMaterialDeliveryR1({...source,existingOwners:[owner as unknown as SelectedMaterialDeliveryInputR1['existingOwners'][number]]});
    expect(result).toMatchObject({status:'OWNER_ROW_RECONCILIATION_REQUIRED',proposal:null,existingOwnerKey:null});
  });
test('saved transport row keeps an exact compatible owner and manual price without mutation',()=>{
  const source=input(),owner={...proposedShipmentOwner(source),unitPrice:'77.125',currencyCode:'KGS'};
  const current={...source,existingOwners:[owner]},before=JSON.stringify(current);
  expect(prepareSelectedMaterialDeliveryR1(current)).toMatchObject({status:'EXISTING_OWNER',proposal:null,existingOwnerKey:owner.ownerKey});
  expect(JSON.stringify(current)).toBe(before);
  expect(owner.unitPrice).toBe('77.125');
});
test('saved transport row conflict does not turn into a replacement proposal or reset its price',()=>{
  const source=input(),owner={...proposedShipmentOwner(source),quantityText:'4',unitPrice:'77.125',currencyCode:'KGS'};
  const current={...source,existingOwners:[owner]},before=JSON.stringify(current);
  expect(prepareSelectedMaterialDeliveryR1(current)).toMatchObject({status:'OWNER_ROW_RECONCILIATION_REQUIRED',proposal:null,existingOwnerKey:null});
  expect(JSON.stringify(current)).toBe(before);
});
test('saved transport row requires reconciliation for null persisted quantity',()=>{
  const source=input(),owner={...proposedShipmentOwner(source),quantityText:null};
  expect(prepareSelectedMaterialDeliveryR1({...source,existingOwners:[owner]})).toMatchObject({status:'OWNER_ROW_RECONCILIATION_REQUIRED',proposal:null,existingOwnerKey:null});
});
