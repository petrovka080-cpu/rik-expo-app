// Prospective source-only cases. Synthetic shipments; no actual current capture or runtime acceptance.
import {brickPartitionHalfDefinitionR1,brickPartitionHalfPackR1 as parentPack,brickPartitionCraneModesR1} from '../../src/lib/estimate/v4/brickPartitionHalfKrer08Column05R1';
import series from '../../data/estimate-benchmarks/source-packs/selected-material-delivery-reuse-r1.json';
import {brickPartitionSelectedDeliveryPackR1 as pack,buildBrickPartitionSelectedDeliveryModelR1 as build,
 hashBrickPartitionDeliveryCapturedParentR1 as hashParent,prepareBrickPartitionExternalDeliveryR1 as prepare,
 assertBrickPartitionDeliveryOrderScopeR1 as assertScope} from '../../scripts/estimate/r4a13/brickPartitionSelectedMaterialDeliveryR1';
import {selectedDeliveryOrderBasisR1,type SelectedMaterialDeliveryInputR1} from '../../src/lib/estimate/v4/selectedMaterialDeliveryReuseR1';
import {FORD_TRANSIT_V363_DELIVERY_PRODUCT_PROFILE_ID as profile} from '../../src/lib/estimate/v4/domainFactory/deliveryFordTransitPhysicalNormV1';
import type {ProfessionalParameterValueV4} from '../../src/lib/estimate/v4/professionalProjectAssemblyV4';
import {compileCanonicalEstimateCore} from '../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {canonicalSelectedDeliveryDerivedParametersR1,admitCanonicalSelectedMaterialDeliveryR1 as ordinaryAdmitBrick,finalizeCanonicalSelectedDeliveryReceiptR1 as ordinaryFinishBrick} from '../../scripts/estimate/backendMigration/canonicalSelectedMaterialDeliveryAdmissionR1';
import {estimateDeterministicHash} from '../../src/lib/estimate/estimateDeterministicHash';
import {SELECTED_DELIVERY_ROW_R1 as delivery,SELECTED_DELIVERY_PREFIX_R1 as dp,SELECTED_DELIVERY_QUANTITY_R1 as dq} from '../../scripts/estimate/r4a13/selectedMaterialDeliveryForwardR1';

const prefix=parentPack.rowPrefix,catalogId=pack.existingTargetCatalogId,d=brickPartitionHalfDefinitionR1();
const ref='CONTROL_ONLY: explicit project and supplier document, not actual object evidence';
const provenance={kind:'manual',reason:'CONTROL_ONLY: independent delivery/order QA, not a quotation'};
function parentInput(){
 const v:Record<string,unknown>={net_partition_area_m2:100,storey_height_m:4,crane_fulfillment:brickPartitionCraneModesR1.own};
 for(const f of parentPack.scopeFacts)v[f.id]=f.value;
 for(const id of parentPack.requiredProjectReferences)v[id]=ref;
 for(const m of parentPack.materials){v[m.specificationParameterId]=ref;v[m.id+'_stock']=0;v[m.id+'_reserve']=0;v[m.id+'_quantum']=m.unitId==='item'?1:0.001;}
 return v;
}
// Deliberately synthetic preservation fixture. The actual ROOT capture remains NULL.
function controlledParent(){
 const ids=['whole-labor','operator-information','crane-consumed',...parentPack.materials.map(m=>m.id+'-consumed'),'whole-masonry-operation','crane-own','crane-hired'];
 return {definition:{id:'CONTROL_ONLY_NOT_PERSISTED_PARENT',catalog_id:catalogId,definition_version:1,definition_sha256:'1'.repeat(64),source_metadata:{contract:parentPack.contract,synthetic:true}},
  parameters:structuredClone([...d.parameters]),formulas:structuredClone([...d.formulas]),resources:structuredClone([...d.resources]),
  baseline:{id:'CONTROL_ONLY_NOT_PERSISTED_BASELINE',normative_source_ids:Object.fromEntries(d.parameters.map(p=>[p.parameter_id,[]]))},
  normBindings:ids.map(id=>({resource_spec_id:'CONTROL_ONLY:'+id,locator_id:'CONTROL_ONLY:parent-locator',applicability:{sourceId:parentPack.sourceId,rowId:prefix+':'+id}}))};
}
function modelFixture(){
 const parent=controlledParent(),pin={catalogId,definitionId:parent.definition.id,definitionVersion:1,definitionSha256:parent.definition.definition_sha256,rows:parent.resources.map(r=>[r.row_id,r.row_sha256])};
 const capture={contract:'brick-partition-selected-delivery-captured-parent/r1' as const,catalogId,capturedParentSha256:hashParent(parent)};
 return {parent,pin,capture,model:build(parent,pin,capture,pack.existingDeliverySource.sha256)};
}
const fact=(value:string|number|boolean,unit_id:string|null=null):ProfessionalParameterValueV4=>({value,unit_id,source_type:'PROJECT_DOCUMENT',source_id:'CONTROL_ONLY:shipment',captured_at:'2026-10-19T00:00:00Z',confidence:'high',applicability:'Synthetic independently documented consignment; no material density or vehicle defaults'});
function shipmentInput():SelectedMaterialDeliveryInputR1{
 const rows=pack.materialOrderRows.map((r,i)=>({rowId:r.rowId,skuKey:'CONTROL_ONLY:SKU:'+r.rowId,unitId:r.unitId,quantityText:['0.3','5040','0.016','2.3','2.3'][i]!,procurementReady:true}));
 const base={catalogId,revisionId:'CONTROL_ONLY_SAVED_REVISION',orderedRows:rows,existingOwners:[]};
 return {...base,shipment:{revisionId:base.revisionId,consignmentId:'CONTROL_ONLY:separate-party',orderBasisSha256:selectedDeliveryOrderBasisR1(base),documentReference:ref,values:{
  product_profile_id:fact(profile),cargo_weight_kg:fact(5000,'kg'),cargo_volume_m3:fact(18,'m3'),
  selected_vehicle_model_and_derivative:fact('FORD_TRANSIT_V363_500_L4_H3'),selected_verified_usable_payload_kg:fact(2357,'kg'),
  selected_verified_usable_loadspace_m3:fact(15.1,'m3'),selected_verified_kerb_mass_kg:fact(2500,'kg'),
  driver_crew_options_and_accessories_weight_kg:fact(100,'kg'),payload_margin_for_error_kg:fact(125,'kg'),
  axle_load_limits_confirmed:fact(true),load_securing_and_compatibility_confirmed:fact(true),route_and_access_confirmed:fact(true),
  supplier_billing_scope:fact('SUPPLIER_SCOPE:CONTROL_ONLY supplier-to-site carriage only; brick carrying up to5m, tower crane and unloading excluded'),
 }}};
}
const physicalFacts=()=>Object.fromEntries(Object.entries(shipmentInput().shipment!.values).map(([id,v])=>[dp+id,v.value]));
const deliveryFacts=()=>({...physicalFacts(),[dp+'selection']:'SEPARATE_CONFIRMED',[dp+'document_reference']:ref,[dp+'consignment_id']:'CONTROL_ONLY:separate-party',[dq]:3});
const compile=(model:any,values:Record<string,unknown>,rowOverrides:Record<string,any>={},serverConfirmedParameters:Record<string,unknown>={})=>compileCanonicalEstimateCore({
 operation:Object.keys(rowOverrides).length?'recalculate':'compile',compilerVersion:pack.contract,catalogId,primaryMeasureParameterId:'net_partition_area_m2',
 parameterDefinitions:[...model.parameters],formulaDefinitions:[...model.formulas],resourceDefinitions:[...model.resources],
 submittedParameters:values,confirmedParameters:{...d.runtimeInput,...serverConfirmedParameters},rowOverrides,currencyCode:'KGS',priceItems:[],maximumResourceRows:100,
 hashJson:async v=>estimateDeterministicHash(v)});
const by=(r:Awaited<ReturnType<typeof compile>>,id:string)=>r.rows.find(row=>row.row_id===id);

it('adds exactly one actual published catalog after the unchanged16 mapping, with no norm or default vehicle expansion',()=>{
 expect(series.groups.slice(0,3).map(g=>[g.key,g.catalogIds.length])).toEqual([['knauf',7],['tesa',8],['euroflex',1]]);
 expect(series.catalogIds.slice(0,16)).toEqual(series.groups.slice(0,3).flatMap(g=>g.catalogIds));
 expect(series.groups[3]).toEqual({key:'brick-partition-krer08-002-05',catalogIds:[catalogId]});expect(series.catalogIds.slice(16)).toEqual([catalogId]);
 expect(series.newNorms).toBe(0);expect(series.unloadingLaborIncluded).toBe(false);
});
it('retains exact old52/24/24 objects,11 bindings, baseline arrays and metadata; new model is69/25/25 only after exact capture',()=>{
 const {parent,pin,capture,model}=modelFixture(),before=hashParent(parent);
 expect(model.parameters.slice(0,52)).toEqual(parent.parameters);expect(model.formulas.slice(0,24)).toEqual(parent.formulas);expect(model.resources.slice(0,24)).toEqual(parent.resources);
 expect([model.parameters.length,model.formulas.length,model.resources.length]).toEqual([69,25,25]);
 expect(model.retainedParent).toMatchObject({normBindings:parent.normBindings,normativeSourceIds:parent.baseline.normative_source_ids,definitionSourceMetadata:parent.definition.source_metadata});
 expect(model.newPriceRouteBindings).toEqual([]);expect(model.integrationBoundary).toMatchObject({sourceNeedsClosed:0,oldOpenNeedsRemain:8,publicationReady:false,transactionAuthenticated:false});
 expect(()=>build(parent,pin,{...capture,capturedParentSha256:'0'.repeat(64)},pack.existingDeliverySource.sha256)).toThrow('CAPTURED_PARENT_PAYLOAD_DRIFT');expect(hashParent(parent)).toBe(before);
});
it('unselected delivery leaves every original shared-core row, balance, total and eight preliminary needs unchanged',async()=>{
 const {model}=modelFixture(),old=await compile(d,parentInput()),next=await compile(model,parentInput());
 expect(next.rows).toEqual(old.rows);expect(next.totals).toEqual(old.totals);expect(next.preliminaryNeeds).toEqual(old.preliminaryNeeds);expect(next.preliminaryNeeds).toHaveLength(8);
});
it('reuses one existing norm for3 synthetic document-bound trips and preserves whole labour/crane/8needs',async()=>{
 const {model}=modelFixture(),planned=prepare(shipmentInput()),r=await compile(model,{...parentInput(),...deliveryFacts()});
 expect(planned).toMatchObject({status:'PLANNING_PROPOSAL',proposal:{quantityText:'3',unitId:'trip',unitPrice:null,procurementReady:false},sourceNeedsClosed:0,compositeExternalLogisticsNeedRemainsUnresolved:true});
 expect(by(r,delivery)).toMatchObject({quantity:'3',unit_id:'trip',unit_price:null,amount:null,included_in_procurement:false});
 expect(by(r,prefix+':whole-labor')?.quantity).toBe('143.99');expect(by(r,prefix+':crane-own')?.quantity).toBe('4.11');expect(r.preliminaryNeeds).toHaveLength(8);
 expect(r.rows.some(row=>/truck/.test(row.row_id))).toBe(false);
});
it('retains lawful delivery title/price77 and rounds only by existing core policy; does not assign a material price',async()=>{
 const {model}=modelFixture(),r=await compile(model,{...parentInput(),...deliveryFacts()},{[delivery]:{unitPrice:'77',titleRu:'Отдельная перевозка подтверждённой партии',provenance}});
 expect(by(r,delivery)).toMatchObject({quantity:'3',unit_price:'77',amount:'231',title_ru:'Отдельная перевозка подтверждённой партии'});
 for(const m of pack.materialOrderRows)expect(by(r,m.rowId)?.unit_price).toBeNull();
 expect(model.addedResource.source_metadata.automaticGenericPriceInheritanceAllowed).toBe(false);
});
it('keeps manual mortar quantity/title/price and physical consumption without turning it into a freight mass',async()=>{
 const {model}=modelFixture(),r=await compile(model,parentInput(),{[prefix+':mortar']:{quantity:'4',unitPrice:'77',titleRu:'Мой готовый раствор М50',provenance}});
 expect(by(r,prefix+':mortar')).toMatchObject({quantity:'4',unit_price:'77',amount:'308',title_ru:'Мой готовый раствор М50'});
 expect(by(r,prefix+':mortar-consumed')?.quantity).toBe('2.3');expect(by(r,delivery)).toBeUndefined();
});
it('keeps exclusions of the brick order and source consumption, and adds no replacement payable supply owner',async()=>{
 const {model}=modelFixture(),r=await compile(model,parentInput(),{[prefix+':brick']:{includedInEstimate:false,includedInProcurement:false,provenance}});
 expect(by(r,prefix+':brick')).toMatchObject({included_in_estimate:false,included_in_procurement:false});expect(by(r,prefix+':brick-consumed')?.quantity).toBe('5040');expect(r.preliminaryNeeds).toHaveLength(8);
});
it.each(['3','77'])('refuses manual trip quantity%s even if it equals the derived quantity',async quantity=>{
 await expect(compile(modelFixture().model,{...parentInput(),...deliveryFacts()},{[delivery]:{quantity,provenance}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
});
it('refuses a forged admitted output against the existing physical norm',async()=>{
 await expect(compile(modelFixture().model,{...parentInput(),...deliveryFacts(),[dq]:999})).rejects.toMatchObject({code:'PHYSICAL_NORM_QUANTITY_MISMATCH'});
});
it('does not create a paid trip without an actual document reference',async()=>{
 const input={...parentInput(),...deliveryFacts()};delete input[dp+'document_reference'];const r=await compile(modelFixture().model,input);
 expect(by(r,delivery)).toBeUndefined();expect(r.preliminaryNeeds.some(n=>n.row_id===delivery)).toBe(true);
});
it('preserves explicit exclusion of the only delivery owner without a substitute row',async()=>{
 const r=await compile(modelFixture().model,{...parentInput(),...deliveryFacts()},{[delivery]:{includedInEstimate:false,includedInProcurement:false,provenance}});
 expect(r.rows.filter(row=>row.row_id===delivery)).toHaveLength(1);expect(by(r,delivery)?.included_in_estimate).toBe(false);
});
it('keeps only the exact server-derived truth contract and rejects client/user/baseline forged quantities',async()=>{
 const {model}=modelFixture(),source=shipmentInput(),planned=prepare(source),proposal=planned.proposal!;
 expect(planned.status).toBe('PLANNING_PROPOSAL');expect(proposal).not.toBeNull();
 // Complete controlled admission shape for this pure checker only. This object is
 // not the result of authenticated saved-read admission, and grants no permission.
 const admission={planned,command:{contractVersion:'canonical-selected-material-delivery-command/v1',consignmentId:source.shipment!.consignmentId,
  documentReference:source.shipment!.documentReference,documentCapturedAt:'2026-10-19T00:00:00Z',separatePaymentConfirmed:true,
  skuBindings:source.orderedRows.map(row=>({rowId:row.rowId,skuKey:row.skuKey}))},
  originRevisionId:source.revisionId,originChecksumSha256:'1'.repeat(64),confirmedOrderedRows:source.orderedRows.map(row=>({...row,quantityText:row.quantityText!})),
  confirmedParameters:{[dq]:proposal.quantityText},
  readFence:{contractVersion:'canonical-selected-delivery-read-fence/v1',parentRevisionId:source.revisionId,parentChecksumSha256:'1'.repeat(64),readSetSha256:'2'.repeat(64)},
  ownerKey:proposal.ownerKey,orderBasisSha256:proposal.orderBasisSha256,shipmentWitness:proposal.shipmentWitness,
  targetDefinitionId:'CONTROL_ONLY_NOT_PERSISTED_TARGET',targetPriceBindingSha256:'3'.repeat(64),storedReceipt:null,preservedDeliveryOverride:null,
  globalConsignmentPaymentUniquenessProven:false,
 } satisfies Parameters<typeof canonicalSelectedDeliveryDerivedParametersR1>[0]['admission'];
 const request={...parentInput(),...deliveryFacts()};delete request[dq];
 // The admitted count is supplied through confirmedParameters, not any user or baseline map.
 const compiled=await compile(model,request,{},admission.confirmedParameters);
 const input={admission,parameterDefinitions:model.parameters,parameters:compiled.parameters,derivedParameters:compiled.derivedParameters,
  submittedParameters:request,userParameters:request,baselineParameters:{},
 } satisfies Parameters<typeof canonicalSelectedDeliveryDerivedParametersR1>[0];
 expect(admission.confirmedParameters[dq]).toBe('3');expect(request).not.toHaveProperty(dq);
 expect(canonicalSelectedDeliveryDerivedParametersR1(input)).toEqual({...compiled.derivedParameters,[dq]:compiled.parameters[dq]});
 for(const key of ['submittedParameters','userParameters','baselineParameters'] as const){
  expect(()=>canonicalSelectedDeliveryDerivedParametersR1({...input,[key]:{...input[key],[dq]:'3'}}))
   .toThrow(expect.objectContaining({reason:'compiled-delivery-provenance-invalid'}));
 }
 for(const key of ['parameters','derivedParameters'] as const){
  expect(()=>canonicalSelectedDeliveryDerivedParametersR1({...input,[key]:{...input[key],[dq]:'4'}}))
   .toThrow(expect.objectContaining({reason:'compiled-delivery-provenance-invalid'}));
 }
 const wrongDefinitions=model.parameters.map(parameter=>parameter.parameter_id===dq
  ?{...parameter,truth_metadata:{...parameter.truth_metadata,value_source_role:'USER_INPUT'}}:parameter);
 expect(()=>canonicalSelectedDeliveryDerivedParametersR1({...input,parameterDefinitions:wrongDefinitions}))
  .toThrow(expect.objectContaining({reason:'compiled-delivery-provenance-invalid'}));
});
it.each(pack.materialOrderRows)('changed actual order quantity for$rowId invalidates the prior party basis',row=>{
 const input=shipmentInput(),changed={...input,orderedRows:input.orderedRows.map(r=>r.rowId===row.rowId?{...r,quantityText:'77'}:r)};
 expect(prepare(changed)).toMatchObject({status:'SHIPMENT_FACTS_REQUIRED',proposal:null});
});
it.each(['brick','mortar'])('excluded%s order cannot silently leave the previous shipment intact',id=>{
 const input=shipmentInput(),orderedRows=input.orderedRows.filter(r=>r.rowId!==prefix+':'+id);
 expect(prepare({...input,orderedRows})).toMatchObject({status:'SHIPMENT_FACTS_REQUIRED',proposal:null});
});
it('a saved shortage/nonready order never becomes ready freight',()=>{
 const input=shipmentInput();expect(prepare({...input,orderedRows:input.orderedRows.map(r=>({...r,procurementReady:false}))})).toMatchObject({status:'ORDER_NOT_READY',proposal:null});
});
it('zero effective orders create no paid carriage',()=>{
 const input=shipmentInput(),changed={...input,orderedRows:input.orderedRows.map(r=>({...r,quantityText:'0'}))};
 expect(prepare(changed)).toMatchObject({status:'NO_ORDERED_CARGO',proposal:null});
});
it.each(['cargo_weight_kg','cargo_volume_m3'])('missing independent consignment%s is never replaced by masonry quantities',id=>{
 const input=shipmentInput(),values={...input.shipment!.values};delete values[id];
 expect(prepare({...input,shipment:{...input.shipment!,values}})).toMatchObject({status:'APPLICABILITY_NOT_CONFIRMED',proposal:null});
});
it.each(['axle_load_limits_confirmed','load_securing_and_compatibility_confirmed','route_and_access_confirmed'])('refuses unconfirmed%s',id=>{
 const input=shipmentInput();expect(prepare({...input,shipment:{...input.shipment!,values:{...input.shipment!.values,[id]:fact(false)}}})).toMatchObject({status:'APPLICABILITY_NOT_CONFIRMED',proposal:null});
});
it('does not treat cubic metres as kilograms',()=>{
 const input=shipmentInput();expect(prepare({...input,shipment:{...input.shipment!,values:{...input.shipment!.values,cargo_weight_kg:fact(5000,'m3')}}})).toMatchObject({status:'SHIPMENT_UNIT_CONFLICT',proposal:null});
});
it.each(['crane-own','crane-hired','brick-consumed','external-logistics'])('refuses a non-material-order scope%s',id=>{
 const input=shipmentInput();expect(()=>assertScope({...input,orderedRows:[{...input.orderedRows[0]!,rowId:prefix+':'+id}]})).toThrow('EXACT_MASONRY_MATERIAL_ORDER_ROW_REQUIRED');
});
it('a supplier unit change cannot silently reuse the saved shipment',()=>{
 const input=shipmentInput();expect(()=>prepare({...input,orderedRows:input.orderedRows.map(r=>({...r,unitId:'trip'}))})).toThrow('SAVED_MATERIAL_ORDER_UNIT_REQUIRED');
});
it('retains one unchanged saved owner but refuses ambiguity and changed mass or material basis',()=>{
 const input=shipmentInput(),p=prepare(input).proposal!;expect(p).not.toBeNull();const owner={...p,ownerKey:'CONTROL_ONLY:saved-owner',unitPrice:'77'};
 expect(prepare({...input,existingOwners:[owner]})).toMatchObject({status:'EXISTING_OWNER',proposal:null,existingOwnerKey:owner.ownerKey});
 expect(prepare({...input,existingOwners:[owner,{...owner,ownerKey:'second'}]})).toMatchObject({status:'OWNER_AMBIGUOUS',proposal:null});
 expect(prepare({...input,existingOwners:[owner],shipment:{...input.shipment!,values:{...input.shipment!.values,cargo_weight_kg:fact(7000,'kg')}}})).toMatchObject({status:'OWNER_SHIPMENT_RECONCILIATION_REQUIRED',proposal:null});
 const rows=input.orderedRows.map(r=>r.rowId===prefix+':brick'?{...r,quantityText:'6000'}:r),changed={...input,orderedRows:rows};
 expect(prepare({...changed,shipment:{...input.shipment!,orderBasisSha256:selectedDeliveryOrderBasisR1(changed)},existingOwners:[owner]})).toMatchObject({status:'OWNER_CONTEXT_CONFLICT',proposal:null});
 expect(owner.unitPrice).toBe('77');
});
it('does not borrow a finite admitted catalog identity for an unrelated consumer',()=>{
 expect(()=>prepare({...shipmentInput(),catalogId:series.catalogIds[0]!})).toThrow('EXACT_EXISTING_MASONRY_CATALOG_REQUIRED');
});
it('keeps every old unresolved need at unknown quantity and does not zero/one the composite logistics obligation',async()=>{
 const {model}=modelFixture(),r=await compile(model,{...parentInput(),...deliveryFacts()});
 for(const gap of parentPack.sourceNeeds)expect(r.preliminaryNeeds.some(n=>n.row_id===prefix+':'+gap.id&&n.quantity===null)).toBe(true);
 for(const quantity of ['0','1'])await expect(compile(model,{...parentInput(),...deliveryFacts()},{[pack.existingExternalLogisticsNeedRowId]:{quantity,provenance}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
});

it.each(['','UNSCOPED_PRICE77'])('refuses a missing or unscoped supplier payment boundary%p',value=>{
 const input=shipmentInput();expect(prepare({...input,shipment:{...input.shipment!,values:{...input.shipment!.values,supplier_billing_scope:fact(value)}}})).toMatchObject({status:'APPLICABILITY_NOT_CONFIRMED',proposal:null});
});
it.each(['cargo_weight_kg','cargo_volume_m3'])('a zero consignment%s is invalid rather than inferred from area',id=>{
 const input=shipmentInput(),unit=id==='cargo_weight_kg'?'kg':'m3';expect(prepare({...input,shipment:{...input.shipment!,values:{...input.shipment!.values,[id]:fact(0,unit)}}})).toMatchObject({status:'APPLICABILITY_NOT_CONFIRMED',proposal:null});
});
it('rejects another vehicle instead of treating the source as a generic truck norm',async()=>{
 await expect(compile(modelFixture().model,{...parentInput(),...deliveryFacts(),[dp+'selected_vehicle_model_and_derivative']:'OTHER_TRUCK'})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
});


// ROOT prospective ordinary admission coverage. All parents/read fences and
// documents below are synthetic; this is not a saved-current capture.
async function ordinaryBrickDeliveryFixtureR1(){
 const {parent,model}=modelFixture(),parameters={...parentInput(),...physicalFacts(),
  [dp+'selection']:'SEPARATE_CONFIRMED',[dp+'document_reference']:ref,[dp+'consignment_id']:'CONTROL_ONLY:separate-party'};
 const original=await compile(model,parentInput());
 const source={...parent,priceBindings:[]};
 const target={definition:{...parent.definition,id:'CONTROL_ONLY_DELIVERY_TARGET'},parameters:model.parameters,
  formulas:model.formulas,resources:model.resources,priceBindings:[]};
 const saved={id:'CONTROL_ONLY_SAVED_BRICK_REVISION',catalog_id:catalogId,definition_version_id:parent.definition.id,
  checksum_sha256:'a'.repeat(64),input_parameters:original.parameters,amendment_contract:{rowOverrides:{}}};
 const command={contractVersion:'canonical-selected-material-delivery-command/v1',documentReference:ref,
  documentCapturedAt:'2026-10-19T00:00:00Z',consignmentId:'CONTROL_ONLY:separate-party',separatePaymentConfirmed:true,
  skuBindings:pack.materialOrderRows.map(r=>({rowId:r.rowId,skuKey:'CONTROL_ONLY:SKU:'+r.rowId}))};
 const readSet:any={phase:'INTAKE',fence:{contractVersion:'canonical-selected-delivery-read-fence/v1',
  parentRevisionId:saved.id,parentChecksumSha256:saved.checksum_sha256,readSetSha256:'b'.repeat(64)},
  snapshot:{parent:saved,rows:structuredClone(original.rows),prices:[],definitions:[source,target],
   targetManifest:{definition_version_id:target.definition.id},originLineage:[]},existingDeliveryReceipt:null};
 return{model,parameters,command,readSet,original};
}
it('ordinary server intake binds allfive real shared-core material orders and finish retains8needs and one paid delivery',async()=>{
 const current=await ordinaryBrickDeliveryFixtureR1(),before=estimateDeterministicHash(current.readSet),admission=ordinaryAdmitBrick(current);
 expect(admission.confirmedOrderedRows.map(r=>[r.rowId,r.unitId])).toEqual(pack.materialOrderRows.map(r=>[r.rowId,r.unitId]));
 expect(admission.confirmedParameters[dq]).toBe('3');expect(admission.planned.status).toBe('PLANNING_PROPOSAL');
 const result=await compile(current.model,current.parameters,{[delivery]:{unitPrice:'77',titleRu:'Контрольная доставка подтверждённой партии',provenance}},admission.confirmedParameters);
 expect(canonicalSelectedDeliveryDerivedParametersR1({admission,parameterDefinitions:current.model.parameters,
  parameters:result.parameters,derivedParameters:result.derivedParameters,submittedParameters:current.parameters,
  userParameters:current.parameters,baselineParameters:{}})[dq]).toBe(result.parameters[dq]);
 const receipt=ordinaryFinishBrick(admission,result.rows);
 expect(receipt).toMatchObject({transportRowId:delivery,globalConsignmentPaymentUniquenessProven:false});
 expect(result.rows.filter(row=>row.row_id===delivery)).toHaveLength(1);expect(by(result,delivery)).toMatchObject({quantity:'3',unit_price:'77',amount:'231'});
 expect(result.preliminaryNeeds).toHaveLength(8);expect(estimateDeterministicHash(current.readSet)).toBe(before);
});
it.each(pack.materialOrderRows)('ordinary intake allows explicitly documented subset$rowId and keeps physical consignment facts independent',async order=>{
 const current=await ordinaryBrickDeliveryFixtureR1();current.command.skuBindings=current.command.skuBindings.filter(r=>r.rowId===order.rowId);
 const admission=ordinaryAdmitBrick(current);expect(admission.confirmedOrderedRows.map(r=>r.rowId)).toEqual([order.rowId]);
 expect(admission.confirmedParameters[dq]).toBe('3');
});
it.each(pack.materialOrderRows)('ordinary intake refuses changed saved unit$rowId even with self-consistent purchase-shaped metadata',async order=>{
 const current=await ordinaryBrickDeliveryFixtureR1(),saved=current.readSet.snapshot.rows.find((r:any)=>r.row_id===order.rowId);
 const unit=order.unitId==='kg'?'m3':'kg';saved.unit_id=unit;saved.calculation_trace.purchaseBalance.unitId=unit;
 expect(()=>ordinaryAdmitBrick(current)).toThrow(expect.objectContaining({reason:'shipment-ORDER_SCOPE_CONFLICT'}));
});
it.each(['brick-consumed','crane-hired','whole-labor','external-logistics','CUSTOM_NOT_A_MATERIAL_ORDER'])(
 'ordinary intake refuses nonorder%s even if it has procurement-ready effective-balance shape',async suffix=>{
 const current=await ordinaryBrickDeliveryFixtureR1(),source=current.readSet.snapshot.rows.find((r:any)=>r.row_id===pack.materialOrderRows[0]!.rowId),forged=structuredClone(source);
 forged.row_id=prefix+':'+suffix;forged.calculation_trace.purchaseBalance.ownerRowId=forged.row_id;
 current.readSet.snapshot.rows=current.readSet.snapshot.rows.filter((r:any)=>r.row_id!==forged.row_id).concat([forged]);
 current.command.skuBindings=[{rowId:forged.row_id,skuKey:'CONTROL_ONLY:FORGED_BALANCE_SHAPE'}];
 expect(()=>ordinaryAdmitBrick(current)).toThrow(expect.objectContaining({reason:'shipment-ORDER_SCOPE_CONFLICT'}));
});
it.each(pack.materialOrderRows)('ordinary intake refuses foreign balance owner on$rowId',async order=>{
 const current=await ordinaryBrickDeliveryFixtureR1(),saved=current.readSet.snapshot.rows.find((r:any)=>r.row_id===order.rowId);
 saved.calculation_trace.purchaseBalance.ownerRowId='CONTROL_ONLY:FOREIGN_ORDER_OWNER';
 expect(()=>ordinaryAdmitBrick(current)).toThrow(expect.objectContaining({reason:'saved-sku-order-not-ready'}));
});
it.each(['manual-mortar-order','excluded-brick-order'])(
 'ordinary finish refuses%s after actual shared-core recompilation instead of saving stale party basis',async change=>{
 const current=await ordinaryBrickDeliveryFixtureR1(),admission=ordinaryAdmitBrick(current);
 const override=change==='manual-mortar-order'?{[prefix+':mortar']:{quantity:'4',unitPrice:'77',titleRu:'Изменённый заказ раствора',provenance}}:
  {[prefix+':brick']:{includedInEstimate:false,includedInProcurement:false,provenance}};
 const result=await compile(current.model,current.parameters,override,admission.confirmedParameters);
 expect(()=>ordinaryFinishBrick(admission,result.rows)).toThrow(expect.objectContaining({reason:'compiled-order-changed-reconciliation-required'}));
});
