import {createHash} from 'node:crypto';
import {selectedMaterialDeliveryTestContextR1} from './selectedMaterialDeliveryTestContextR1';
import {buildSelectedMaterialDeliveryForwardR1 as build,prepareSelectedMaterialDeliveryClonePlanR1 as plan,
 SELECTED_DELIVERY_ROW_R1 as rowId,SELECTED_DELIVERY_PREFIX_R1 as prefix,SELECTED_DELIVERY_QUANTITY_R1 as quantity} from '../../scripts/estimate/r4a13/selectedMaterialDeliveryForwardR1';
import {compileCanonicalEstimateCore as compile} from '../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {canonicalPublisherPriceBindingIsCompatible as priceCompatible} from '../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';
import {FORD_TRANSIT_V363_DELIVERY_PRODUCT_PROFILE_ID as profile} from '../../src/lib/estimate/v4/domainFactory/deliveryFordTransitPhysicalNormV1';
import {canonicalEstimateParameterChoiceLabelRu as choiceLabel} from '../../src/lib/estimate/backendPlatform/canonicalEstimateParameterSemantics';
import {buildCanonicalProfessionalPdfProjection} from '../../src/lib/estimate/backendPlatform/canonicalProfessionalPdf';
import {canonicalArtifactPreliminaryNeeds} from '../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract';
const fixture=selectedMaterialDeliveryTestContextR1();
const parents=fixture.parents;const config={guideSnapshotSha256:fixture.normPackSha256};
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
test('delivery choices have distinct human labels and hide the profile registry identifier',()=>{
 expect(choiceLabel(prefix+'selection','NOT_SELECTED')).toBe('Не добавлять отдельную доставку');
 expect(choiceLabel(prefix+'selection','SEPARATE_CONFIRMED')).toBe('Отдельная доставка по документу партии');
 expect(choiceLabel(prefix+'product_profile_id',profile)).toContain('Ford Transit V363 500 L4 H3');
 expect(choiceLabel(prefix+'product_profile_id',profile)).not.toContain('manufacturer-profile:');
 expect(choiceLabel(prefix+'selected_vehicle_model_and_derivative','FORD_TRANSIT_V363_500_L4_H3')).toBe('Ford Transit V363 500 L4 H3');
});
const compileModel=(parent:any,model:any,extra:Record<string,unknown>={},overrides:Record<string,any>={})=>compile({
 operation:Object.keys(overrides).length?'recalculate':'compile',compilerVersion:'delivery16-staged-real-compiler-test',catalogId:parent.entry.catalog_id,
 primaryMeasureParameterId:parent.definition.applicability.primaryMeasureParameterId??'q',
 parameterDefinitions:model.parameters,formulaDefinitions:model.formulas,resourceDefinitions:model.resources,
 submittedParameters:{...parent.baseline.input_values,...extra},confirmedParameters:{},currencyCode:'KGS',
 maximumResourceRows:1000,rowOverrides:overrides,hashJson:hash,
});
const facts=()=>Object.fromEntries(Object.entries({selection:'SEPARATE_CONFIRMED',product_profile_id:profile,cargo_weight_kg:5000,cargo_volume_m3:18,
 selected_vehicle_model_and_derivative:'FORD_TRANSIT_V363_500_L4_H3',selected_verified_usable_payload_kg:2357,selected_verified_usable_loadspace_m3:15.1,
 selected_verified_kerb_mass_kg:2500,driver_crew_options_and_accessories_weight_kg:100,payload_margin_for_error_kg:125,
 axle_load_limits_confirmed:true,load_securing_and_compatibility_confirmed:true,route_and_access_confirmed:true,
 supplier_billing_scope:'SUPPLIER_SCOPE:synthetic separate quotation',document_reference:'synthetic:confirmed document',consignment_id:'synthetic:one consignment',admitted_trip_count:3,
}).map(([k,v])=>[prefix+k,v]));

test.each(parents)('actual parent $entry.catalog_id keeps every previous row/formula and compiler result when delivery is unselected',async(parent:any)=>{
 const before=JSON.stringify(parent),model=build(parent,parent.pin,config);
 expect(model.resources.slice(0,-1)).toEqual(parent.resources);expect(model.formulas.slice(0,-1)).toEqual(parent.formulas);
 expect(model.parameters.slice(0,parent.parameters.length)).toEqual(parent.parameters);
 const old=await compileModel(parent,parent),next=await compileModel(parent,model);
 expect(next.rows).toEqual(old.rows);expect(next.preliminaryNeeds).toEqual(old.preliminaryNeeds);expect(next.totals).toEqual(old.totals);
 expect(JSON.stringify(parent)).toBe(before);
});
test.each(parents)('publisher clone for $entry.catalog_id retains original bindings and blocks automatic price inheritance for the new trip',async(parent:any)=>{
 const model=plan(parent,parent.pin,{...config,releaseId:'11111111-1111-5111-8111-111111111111',sourceHead:'c31d4b7c3945477810df78ed0b59b67129896df7',
  sourceTree:'a35edb44f83d3881bc6037ece8d36b3d7296891b',masterSha256:'91e9d80b99c35122a1ebada37654871ccafae47d33df264542c8215b11a4dc36',evidenceSha256:'1'.repeat(64)});
 expect(model.plan.definition.definition_version).toBe(parent.definition.definition_version+1);
 expect(model.plan.bindings).toHaveLength(parent.normBindings.length);expect(model.publicationReady).toBe(false);
 const delivery=model.plan.resources.find((r:any)=>r.row_id===rowId)!;
 expect(delivery).toMatchObject({unit_id:'trip',cost_owner_id:rowId,source_metadata:{automaticGenericPriceInheritanceAllowed:false}});
 for(const legacy of parent.resources)expect(priceCompatible({sourceResource:legacy,targetResource:delivery,sourceBindingPriceKey:legacy.cost_owner_id})).toBe(false);
 expect(model.plan.parameters.every((p:any)=>p.default_value===null)).toBe(true);
});
test('real compiler applies the existing Ford norm once and retains unknown price',async()=>{
 const parent=parents[0],model=build(parent,parent.pin,config),result=await compileModel(parent,model,facts());
 const delivery=result.rows.find(r=>r.row_id===rowId);
 expect(delivery).toMatchObject({quantity:'3',unit_id:'trip',unit_price:null,amount:null,included_in_estimate:true,included_in_procurement:false});
 expect((delivery?.calculation_trace as any).physicalNormQuantityParity).toMatchObject({formulaQuantity:'3',normQuantity:'3'});
});
test('a forged admitted quantity cannot bypass existing physical norm parity',async()=>{
 const parent=parents[0],model=build(parent,parent.pin,config);
 await expect(compileModel(parent,model,{...facts(),[quantity]:999})).rejects.toMatchObject({code:'PHYSICAL_NORM_QUANTITY_MISMATCH'});
});
test('manual trip quantity cannot override the server-derived owner',async()=>{
 const parent=parents[0],model=build(parent,parent.pin,config);
 await expect(compileModel(parent,model,facts(),{[rowId]:{quantity:'99',provenance:{kind:'manual'}}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
});
test('a different selected vehicle is rejected by the typed choice before physical calculation',async()=>{
 const parent=parents[0],model=build(parent,parent.pin,config);
 await expect(compileModel(parent,model,{...facts(),[prefix+'selected_vehicle_model_and_derivative']:'OTHER'})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
});
test('missing saved document creates a need rather than a paid trip row',async()=>{
 const parent=parents[0],model=build(parent,parent.pin,config),values=facts();delete values[prefix+'document_reference'];
 const result=await compileModel(parent,model,values);
 expect(result.rows.some(r=>r.row_id===rowId)).toBe(false);expect(result.preliminaryNeeds.some(r=>r.row_id===rowId)).toBe(true);
});
test('selection is explicit and does not default to another payment owner',async()=>{
 const parent=parents[0],model=build(parent,parent.pin,config),result=await compileModel(parent,model,{...facts(),[prefix+'selection']:'NOT_SELECTED'});
 expect(result.rows.some(r=>r.row_id===rowId)).toBe(false);
});
test('an excluded delivery remains excluded without a replacement payable row',async()=>{
 const parent=parents[0],model=build(parent,parent.pin,config),result=await compileModel(parent,model,facts(),{[rowId]:{includedInEstimate:false,includedInProcurement:false,provenance:{kind:'manual'}}});
 expect(result.rows.filter(r=>r.row_id===rowId)).toHaveLength(1);expect(result.rows.find(r=>r.row_id===rowId)?.included_in_estimate).toBe(false);
});
test('manual title and exact manual price survive the real compiler',async()=>{
 const parent=parents[0],model=build(parent,parent.pin,config),result=await compileModel(parent,model,facts(),{[rowId]:{unitPrice:'77.125',titleRu:'Согласованная доставка партии',provenance:{kind:'manual'}}});
 expect(result.rows.find(r=>r.row_id===rowId)).toMatchObject({title_ru:'Согласованная доставка партии',unit_price:'77.125',amount:'231.38'});
});

test('delivery PDF shows user shipment facts instead of the internal admitted-count field',async()=>{
 const parent=parents[0],model=build(parent,parent.pin,config),result=await compileModel(parent,model,facts());
 const revision={id:'prepared-not-persisted',release_id:'prepared-not-published',catalog_id:parent.entry.catalog_id,
  checksum_sha256:hash(result.revisionProjection),row_count:result.rows.length,currency_code:'KGS',input_parameters:result.parameters,
  amendment_contract:{parameterSources:{preliminaryNeeds:result.preliminaryNeeds,purchaseSupplyIndexV1:result.purchaseSupplyIndexV1}}};
 const projection=buildCanonicalProfessionalPdfProjection({revision,rows:result.rows,
  preliminaryNeeds:canonicalArtifactPreliminaryNeeds(revision),parameterTitlesRu:Object.fromEntries(model.parameters.map((p:any)=>[p.parameter_id,p.title_ru])),workTitleRu:'Окраска фасада',definitionVersionId:parent.definition.id});
 expect(projection.html).not.toContain('Принятое сервером число рейсов');
 expect(projection.html).toContain('Масса партии, кг');
 expect(projection.html).toContain('Объём партии, м³');
});
