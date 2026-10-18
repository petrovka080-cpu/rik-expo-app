import series from '../../../../data/estimate-benchmarks/source-packs/selected-material-delivery-reuse-r1.json';
import {estimateDeterministicHash,stringifyCanonicalEstimateJson} from '../estimateDeterministicHash';
import type {ProfessionalParameterValueV4} from './professionalProjectAssemblyV4';
import {resolveFordTransitV363DeliveryPhysicalNormV1} from './domainFactory/deliveryFordTransitPhysicalNormV1';

export type SelectedDeliveryOrderRowR1 = Readonly<{
  rowId:string; skuKey:string; quantityText:string|null; unitId:string; procurementReady:boolean;
}>;
export type SelectedDeliveryShipmentWitnessR1 = Readonly<{
  version:'selected-material-delivery-shipment/r1'; canonicalFacts:string;
}>;
export type SelectedMaterialDeliveryInputR1 = Readonly<{
  catalogId:string; revisionId:string; orderedRows:readonly SelectedDeliveryOrderRowR1[];
  shipment:Readonly<{revisionId:string; consignmentId:string; orderBasisSha256:string; documentReference:string;
    values:Readonly<Record<string,ProfessionalParameterValueV4>>}>|null;
  existingOwners:readonly Readonly<{ownerKey:string; revisionId:string; consignmentId:string; orderBasisSha256:string;
    shipmentWitness?:Readonly<{version:string; canonicalFacts:string}>|null;
    /** Read from the saved transport row, never reconstructed from this request.
     * These fields establish consistency only; the caller still authenticates
     * the complete immutable read set and saved price binding transactionally. */
    quantityText?:string|null; unitId?:string; costTreatment?:string;
    sourceId?:string; normId?:string; sourceDefinitionHash?:string; documentReference?:string}>[];
}>;

/** A consistency key, not authentication of a revision, document or read set. */
export function selectedDeliveryOrderBasisR1(input:Pick<SelectedMaterialDeliveryInputR1,'catalogId'|'revisionId'|'orderedRows'>) {
  return estimateDeterministicHash({revisionId:input.revisionId,
    rows:[...input.orderedRows].sort((a,b)=>a.rowId<b.rowId?-1:a.rowId>b.rowId?1:0)});
}

/** WORK-only next wave. Reuse the existing manufacturer applicability owner.
 * This module does not derive cargo weight from unrelated material norms,
 * infer a vehicle, assign prices, publish rows, or accept server permissions.
 */
export function prepareSelectedMaterialDeliveryR1(input:SelectedMaterialDeliveryInputR1) {
  const boundary = {planningOnly:true,publicationReady:false,transactionAuthenticated:false,
    ownerAbsenceAuthenticated:false,ordinaryUiAccepted:false,sourceNeedsClosed:0} as const;
  const blocked = (status:string,reasons:readonly string[]) => ({...boundary,status,reasons,
    proposal:null,existingOwnerKey:null,resolution:null});
  if(!series.catalogIds.includes(input.catalogId)) return blocked('NOT_APPLICABLE_CATALOG',['catalog-outside-this-finite-wave']);
  if(!input.revisionId.trim() || input.orderedRows.length===0
    || new Set(input.orderedRows.map(row=>row.rowId)).size!==input.orderedRows.length
    || input.orderedRows.some(row=>!row.rowId.trim() || !row.skuKey.trim() || !row.unitId.trim()
      || row.quantityText===null || row.quantityText.trim()!==row.quantityText
      || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/u.test(row.quantityText) || row.procurementReady!==true)) {
    return blocked('ORDER_NOT_READY',['confirmed-current-sku-order-required']);
  }
  if(input.orderedRows.every(row=>/^0(?:\.0+)?$/u.test(row.quantityText!))) {
    return blocked('NO_ORDERED_CARGO',['zero-order-does-not-create-paid-transport']);
  }
  const basis=selectedDeliveryOrderBasisR1(input), shipment=input.shipment;
  if(!shipment || shipment.revisionId!==input.revisionId || shipment.orderBasisSha256!==basis
    || !shipment.consignmentId.trim() || !shipment.documentReference.trim()) return blocked('SHIPMENT_FACTS_REQUIRED',['current-order-bound-shipment-document-required']);
  if(input.existingOwners.some(owner=>!owner.ownerKey.trim() || owner.revisionId!==input.revisionId)) {
    return blocked('OWNER_CONTEXT_CONFLICT',['existing-owner-set-must-belong-to-current-revision']);
  }
  const existing=input.existingOwners.filter(owner=>owner.consignmentId===shipment.consignmentId);
  if(existing.length>1) return blocked('OWNER_AMBIGUOUS',['more-than-one-existing-transport-owner']);
  if(existing.some(owner=>owner.orderBasisSha256!==basis)) return blocked('OWNER_CONTEXT_CONFLICT',['merge-the-complete-consignment-before-adding-transport']);
  if(Object.values(shipment.values).some(fact=>typeof fact.value==='number' && !Number.isFinite(fact.value))) {
    return blocked('SHIPMENT_FACTS_INVALID',['non-finite-shipment-numeric-fact']);
  }
  const units:Readonly<Record<string,string>>={cargo_weight_kg:'kg',cargo_volume_m3:'m3',
    selected_verified_usable_payload_kg:'kg',selected_verified_usable_loadspace_m3:'m3',
    selected_verified_kerb_mass_kg:'kg',driver_crew_options_and_accessories_weight_kg:'kg',payload_margin_for_error_kg:'kg'};
  const unitErrors=Object.entries(units).filter(([key,unit])=>shipment.values[key] && shipment.values[key]!.unit_id!==unit)
    .map(([key])=>'shipment-unit-mismatch:'+key);
  if(unitErrors.length) return blocked('SHIPMENT_UNIT_CONFLICT',unitErrors);
  const resolution=resolveFordTransitV363DeliveryPhysicalNormV1({technology_class:'MATERIAL_DELIVERY',
    operation_class:'TRANSPORT',material_system:'FORD_TRANSIT_V363_500_L4_H3',scope_mode:'FULL_APPLICABLE_SCOPE',
    parameter_values:shipment.values});
  if(resolution.status!=='APPLIED') return {...boundary,status:'APPLICABILITY_NOT_CONFIRMED',
    reasons:resolution.blockers.length?resolution.blockers:['exact-vehicle-profile-not-selected'],
    proposal:null,existingOwnerKey:null,resolution};
  const quantity=resolution.calculated_ford_transit_required_trip_count;
  if(quantity===undefined) return blocked('EXISTING_OWNER_OUTPUT_MISSING',['trip-output-missing']);
  if(!Number.isSafeInteger(quantity) || quantity<=0) return blocked('EXISTING_OWNER_OUTPUT_INVALID',['positive-safe-integer-trip-output-required']);
  // This exact consistency witness is not authentication. The caller must bind
  // authoritative immutable facts and the actual saved owner row/pricing read set.
  // Encode numbers before canonical stringify, which otherwise rounds to 6 decimals.
  const facts=Object.fromEntries(Object.keys(shipment.values).sort().map(key=>{
    const fact=shipment.values[key]!;
    return [key,{value:{type:typeof fact.value,text:String(fact.value)},unit_id:fact.unit_id,
      source_type:fact.source_type,source_id:fact.source_id,captured_at:fact.captured_at,
      confidence:fact.confidence,applicability:fact.applicability}];
  }));
  const shipmentWitness:SelectedDeliveryShipmentWitnessR1={version:'selected-material-delivery-shipment/r1',
    canonicalFacts:stringifyCanonicalEstimateJson({revisionId:input.revisionId,consignmentId:shipment.consignmentId,
      orderBasisSha256:basis,documentReference:shipment.documentReference,facts,
      resolution:{source_id:resolution.source_id,norm_id:resolution.norm_id,
        source_definition_hash:resolution.source_definition_hash,source_document_version:String(resolution.source_document_version),
        applicability_version:resolution.applicability_version,tripCount:String(quantity)}})};
  if(existing.length===1){
    const prior=existing[0]!.shipmentWitness;
    if(!prior || prior.version!==shipmentWitness.version || prior.canonicalFacts!==shipmentWitness.canonicalFacts) {
      return blocked('OWNER_SHIPMENT_RECONCILIATION_REQUIRED',['saved-owner-shipment-witness-missing-or-changed']);
    }
    // A current shipment witness does not prove that its persisted transport
    // row still has the same trip count, unit, norm or paid scope. Never repair
    // missing fields from the current request or return a replacement paid row.
    const owner=existing[0]!;
    const expected={quantityText:String(quantity),unitId:'trip',costTreatment:'OWN_COST',
      sourceId:resolution.source_id,normId:resolution.norm_id,
      sourceDefinitionHash:resolution.source_definition_hash,documentReference:shipment.documentReference};
    const rowConflicts=(Object.keys(expected) as (keyof typeof expected)[])
      .filter(key=>owner[key]!==expected[key]).map(key=>'saved-owner-row-mismatch:'+key);
    if(rowConflicts.length) return blocked('OWNER_ROW_RECONCILIATION_REQUIRED',rowConflicts);
    return {...boundary,status:'EXISTING_OWNER',reasons:[],proposal:null,existingOwnerKey:existing[0]!.ownerKey,resolution};
  }
  return {...boundary,status:'PLANNING_PROPOSAL',reasons:[],existingOwnerKey:null,resolution,
    proposal:{ownerKey:'selected-material-delivery:'+estimateDeterministicHash({revisionId:input.revisionId,consignmentId:shipment.consignmentId}),orderBasisSha256:basis,shipmentWitness,
      consignmentId:shipment.consignmentId,
      revisionId:input.revisionId,titleRu:'Доставка материалов: Ford Transit V363 500 L4 H3',
      quantityText:String(quantity),unitId:'trip',costTreatment:'OWN_COST',unitPrice:null,currencyCode:null,
      procurementReady:false,sourceId:resolution.source_id,normId:resolution.norm_id,
      sourceDefinitionHash:resolution.source_definition_hash,documentReference:shipment.documentReference,
      unloadingLaborIncluded:false,materialPriceOrConsumptionChanged:false}};
}
