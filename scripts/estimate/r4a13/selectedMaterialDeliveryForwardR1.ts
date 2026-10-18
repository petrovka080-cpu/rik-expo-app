import {strict as assert} from 'node:assert';
import {createHash} from 'node:crypto';
import {compileFormulaGraph} from '../../../src/lib/estimate/backendPlatform/formulaGraph';
import {canonicalEstimateStableJson} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {createCanonicalDefinitionClonePlan} from './canonicalDefinitionPublisherR1';
import type {prepareSelectedDeliveryNormativeRegistryR1} from './selectedMaterialDeliveryNormativeRegistryR1';
import {buildMasterParameterCalculationConsumers as consumers} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1';
import {FORD_TRANSIT_V363_DELIVERY_SOURCE_METADATA as source,FORD_TRANSIT_V363_DELIVERY_PRODUCT_PROFILE_ID as profile,
  FORD_TRANSIT_V363_DELIVERY_REQUIRED_EXPLICIT_PARAMETER_IDS as required} from '../../../src/lib/estimate/v4/domainFactory/deliveryFordTransitPhysicalNormV1';

type Json=Record<string,any>;
export const SELECTED_DELIVERY_ROW_R1='delivery:selected-material:ford-transit-v363';
export const SELECTED_DELIVERY_PREFIX_R1='selected_delivery_';
export const SELECTED_DELIVERY_QUANTITY_R1=SELECTED_DELIVERY_PREFIX_R1+'admitted_trip_count';
const contract='rik-expo-app.selected-material-delivery-forward.r1';
const hash=(v:unknown)=>createHash('sha256').update(canonicalEstimateStableJson(v)).digest('hex');
const uuid=(v:unknown)=>{const a=hash(v).slice(0,32).split('');a[12]='5';a[16]='8';const s=a.join('');return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;};
const descriptions:Record<string,[string,string|null,string]>={
 product_profile_id:['Подтверждённый профиль выбранного автомобиля',null,'enum'],
 cargo_weight_kg:['Масса партии, кг','kg','decimal'],cargo_volume_m3:['Объём партии, м³','m3','decimal'],
 selected_vehicle_model_and_derivative:['Модель и модификация выбранного автомобиля',null,'enum'],
 selected_verified_usable_payload_kg:['Грузоподъёмность машины, кг','kg','decimal'],
 selected_verified_usable_loadspace_m3:['Полезный объём кузова, м³','m3','decimal'],
 selected_verified_kerb_mass_kg:['Проверенная снаряжённая масса выбранной машины','kg','decimal'],
 driver_crew_options_and_accessories_weight_kg:['Масса экипажа и дополнительного оборудования','kg','decimal'],
 payload_margin_for_error_kg:['Подтверждённый запас по массе выбранной машины','kg','decimal'],
 axle_load_limits_confirmed:['Ограничения нагрузки на оси проверены',null,'boolean'],
 load_securing_and_compatibility_confirmed:['Крепление и совместимость груза проверены',null,'boolean'],
 route_and_access_confirmed:['Маршрут и подъезд подтверждены',null,'boolean'],
 supplier_billing_scope:['Граница оплаты по предложению перевозчика',null,'text'],
 document_reference:['Документ подтверждённой партии',null,'text'],consignment_id:['Идентификатор подтверждённой партии',null,'text'],
};

/** Adds one optional definition-owned delivery. Existing logistics, unloading,
 * machine hours, rows, formulas, material orders and prices remain intact.
 * No user value can replace the server-owned admitted quantity at intake.
 */
export function buildSelectedMaterialDeliveryForwardR1(parent:Json,pin:Json,config:Readonly<{guideSnapshotSha256:string}>){
 assert.equal(parent.definition.catalog_id,pin.catalogId);assert.equal(parent.definition.id,pin.definitionId);
 assert.equal(parent.definition.definition_version,pin.definitionVersion);assert.equal(parent.definition.definition_sha256,pin.definitionSha256);
 assert.deepEqual(parent.resources.map((r:Json)=>[r.row_id,r.row_sha256]),pin.rows);
 const parameters:Json[]=structuredClone(parent.parameters),formulas:Json[]=structuredClone(parent.formulas),resources:Json[]=structuredClone(parent.resources);
 const rowId=SELECTED_DELIVERY_ROW_R1,selection=SELECTED_DELIVERY_PREFIX_R1+'selection';
 let nextParameterOrdinal=Math.max(-1,...parameters.map(parameter=>Number(parameter.ordinal)))+1;
 const formulaId=rowId+':quantity';assert(!resources.some(r=>r.row_id===rowId));
 const parameter=(key:string,title:string,unit:string|null,type:string,internal=false):Json=>({
  parameter_id:SELECTED_DELIVERY_PREFIX_R1+key,ordinal:nextParameterOrdinal++,unit_id:unit,value_type:type,title_ru:title,
  required:false,default_value:null,constraints_json:type==='enum'?{values:key==='selection'?['NOT_SELECTED','SEPARATE_CONFIRMED']:key==='selected_vehicle_model_and_derivative'?['FORD_TRANSIT_V363_500_L4_H3']:[profile]}:
   type==='integer'?{min:1,max:Number.MAX_SAFE_INTEGER}:type==='decimal'?{min:0}:type==='text'?{minLength:1,maxLength:500}:{},
  truth_metadata:{contract,semantic_parameter_key:`${parent.definition.catalog_id}:${SELECTED_DELIVERY_PREFIX_R1+key}`,
   visibility_role:internal?'INTERNAL_ONLY':'USER_INPUT',value_source_role:internal?'BACKEND_DERIVED':'CONDITIONAL_PROJECT_FACT',
   provenance:{consumer_input_role_v1:internal?'APPLICATION_TECHNICAL':'OBJECT_FACT'},hidden_default_forbidden:true,
   preliminary_compilation_allowed:true,source_confirmation_required:!internal,input_origin_class:'APPROVED_PROJECT_OR_METHOD_STATEMENT',
   guide:{guide_kind:'PROJECT_DEFINED',guide_short_ru:internal?'Количество вычисляет проверенный сервер по сохранённой партии.':title+': подтвердите по документу партии и выбранной машины.',
    source_role:'PROJECT_DOCUMENTATION',source_document:'data/estimate-norms/professional/delivery.json',
    source_locator:'Существующий проверенный профиль Ford Transit V363 500 L4 H3; сведения о партии и оплате задаются отдельно.',
    guide_version:contract,source_snapshot_hash:config.guideSnapshotSha256,applicability:'Только отдельная подтверждённая перевозка; не включает разгрузку, подачу и обратную тару.',
    verified_at:'2026-10-17T00:00:00+06:00',guide_validation_policy:'MANDATORY_BLOCK'}}});
 parameters.push(parameter('selection','Отдельная подтверждённая доставка материалов',null,'enum'));
 for(const [key,[title,unit,type]] of Object.entries(descriptions))parameters.push(parameter(key,title,unit,type));
 parameters.push(parameter('admitted_trip_count','Принятое сервером число рейсов','trip','integer',true));
 for(const added of parameters.slice(parent.parameters.length))if(added.parameter_id!==selection){
  added.constraints_json={...added.constraints_json,requiredWhen:{kind:'equals',parameterId:selection,value:'SEPARATE_CONFIRMED'}};
  added.truth_metadata.visible_when={kind:'selected',parameterId:selection,value:'SEPARATE_CONFIRMED'};
 }
 assert.equal(new Set(parameters.map(p=>p.parameter_id)).size,parameters.length);
 const compiled=compileFormulaGraph(SELECTED_DELIVERY_QUANTITY_R1);
 formulas.push({formula_id:formulaId,output_unit_id:'trip',expression_source:compiled.source,ast:compiled.ast,input_parameter_ids:compiled.inputParameterIds,ast_sha256:hash(compiled.ast)});
 const aliases=Object.fromEntries(['product_profile_id',...required].map(id=>[id,SELECTED_DELIVERY_PREFIX_R1+id]));
 const physicalUnits=Object.fromEntries(Object.entries(descriptions).filter(([,v])=>v[1]!==null).map(([key,v])=>[key,v[1]]));
 const added:Json={id:uuid([parent.definition.id,rowId]),row_id:rowId,ordinal:Math.max(...resources.map(r=>r.ordinal))+1,
  section:'delivery',category:'delivery',row_type:'service',title_ru:'Отдельная доставка подтверждённой партии материалов: Ford Transit V363 500 L4 H3',
  unit_id:'trip',formula_id:formulaId,inclusion_ast:{kind:'selected',parameterId:selection,value:'SEPARATE_CONFIRMED'},
  resource_graph:{formulaId,normalizedUom:'trip',semanticOwnerId:rowId,costOwner:'resource',costTreatment:'OWN_COST',
   inputParameterIds:Object.keys(descriptions).map(id=>SELECTED_DELIVERY_PREFIX_R1+id),
   titleSpecificationParameterIds:[SELECTED_DELIVERY_PREFIX_R1+'document_reference',SELECTED_DELIVERY_PREFIX_R1+'consignment_id'],titleSpecificationMode:'APPEND',
   selectedMaterialDeliveryR1:{contractVersion:'canonical-selected-material-delivery-resource/v1',serverAdmissionRequired:true,quantityParameterId:SELECTED_DELIVERY_QUANTITY_R1},
   stageInputPresentationV1:{contractVersion:'canonical-stage-input-presentation/v1',
    parameterIds:['cargo_weight_kg','cargo_volume_m3','selected_verified_usable_payload_kg','selected_verified_usable_loadspace_m3'].map(id=>SELECTED_DELIVERY_PREFIX_R1+id)},
   derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:'trip',
    parameterIds:[SELECTED_DELIVERY_QUANTITY_R1],
    reasonRu:'Количество рейсов определяется по массе, объёму партии и вместимости выбранного автомобиля.'},
   professionalPhysicalNormBindingV1:{technology_class:'MATERIAL_DELIVERY',operation_class:'TRANSPORT',material_system:'FORD_TRANSIT_V363_500_L4_H3',scope_mode:'FULL_APPLICABLE_SCOPE',
    source_id:source.source_id,applicability_parameter_ids:['product_profile_id',...required].map(id=>SELECTED_DELIVERY_PREFIX_R1+id),
    activation:{parameter_id:selection,equals:'SEPARATE_CONFIRMED'},parameter_projection_v1:{aliases,units:physicalUnits},quantity_output_parameter_id:'ford_transit_required_trip_count'},
   operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:'selected-material-delivery',groupTitleRu:'Отдельная доставка материалов',operationId:'selected-material-delivery:transport',operationTitleRu:'Перевозка подтверждённой партии',processOrdinal:90,
    completionCriterionRu:'Партия, автомобиль, граница оплаты и число рейсов подтверждены; разгрузка и тара оцениваются отдельно.'}},
  procurement_eligible:false,cost_owner_id:rowId,
  source_metadata:{contract,automaticGenericPriceInheritanceAllowed:false,sourceRole:'SELECTED_EXISTING_PHYSICAL_NORM_REQUIRES_SERVER_SHIPMENT_ADMISSION',
   normativeTrace:[{...source,source_document_version:source.source_document_version,source_definition_hash:source.definition_hash}],
   projectValuesAreNotDefaults:true,unloadingLaborIncluded:false,oldLogisticsRemainUnresolved:true,publicationReady:false},row_sha256:''};
 added.row_sha256=hash(added);resources.push(added);
 return {catalogId:parent.definition.catalog_id,parameters,formulas,resources,addedResource:added,
  preservedParentRowIds:parent.resources.map((r:Json)=>r.row_id),newPriceRouteBindings:[],publicationReady:false};
}

export function prepareSelectedMaterialDeliveryClonePlanR1(parent:Json,pin:Json,config:Readonly<{
 guideSnapshotSha256:string;releaseId:string;sourceHead:string;sourceTree:string;masterSha256:string;evidenceSha256:string;
 normativeRegistry?:ReturnType<typeof prepareSelectedDeliveryNormativeRegistryR1>;
}>){
 if(config.normativeRegistry){const registry=config.normativeRegistry;
  assert.equal(registry.source.source_key,source.source_id);assert.equal(registry.source.artifact_sha256,config.guideSnapshotSha256);
  assert.equal(registry.locator.source_id,registry.source.id);assert.equal(registry.locator.locator.sourceDefinitionHash,source.definition_hash);
  assert.equal(registry.locator.locator.normId,source.norm_id);
 }
 const model=buildSelectedMaterialDeliveryForwardR1(parent,pin,config),catalogId=model.catalogId;
 const {formulaConsumers,resourceConsumers}=consumers(model),definitionId=uuid([contract,config.releaseId,catalogId]),baselineId=uuid([definitionId,'baseline']);
 const primary=String(parent.definition.applicability.primaryMeasureParameterId??parent.search.primary_measure_parameter_id??'q');
 const baseline={...parent.baseline,parameter_schema_sha256:hash(model.parameters),input_values:{[primary]:1},
  input_classification:Object.fromEntries(model.parameters.map(p=>[p.parameter_id,'VALIDATION_FIXTURE'])),
  uom_by_parameter:Object.fromEntries(model.parameters.map(p=>[p.parameter_id,p.unit_id])),formula_consumer_ids:formulaConsumers,resource_consumer_row_ids:resourceConsumers,
  normative_source_ids:Object.fromEntries(model.parameters.map(p=>[p.parameter_id,parent.baseline.normative_source_ids?.[p.parameter_id]??(config.normativeRegistry?[config.normativeRegistry.source.source_key]:[])])),
  guide_provenance_ru:Object.fromEntries(model.parameters.map(p=>[p.parameter_id,'Сохранённый исходный факт или явный документ партии; тест не является нормой.']))};
 const decision={...parent.passport.decision,waveContract:contract,deliveryAdmission:'PENDING_SERVER_INTEGRATION',activationAllowed:false,productionEligible:false};
 const plan=createCanonicalDefinitionClonePlan({contract,
  definition:{id:definitionId,releaseId:config.releaseId,catalogId,definitionVersion:parent.definition.definition_version+1,
   passport:parent.definition.passport,applicability:parent.definition.applicability,definitionSha256:hash(model),
   sourceMetadata:{...parent.definition.source_metadata,contract,masterSha256:config.masterSha256,predecessorDefinitionId:parent.definition.id,deliveryIntegrationPending:true,activationAllowed:false,productionEligible:false}},
  representative:{...model,resources:model.resources.map(r=>({...r,row_type:r.row_type??(r.category==='delivery'?'service':r.category==='construction_work'?'labor':r.category)})),
   bindings:[...parent.normBindings.map((b:Json)=>({row_id:b.row_id,locator_id:b.locator_id,applicability:b.applicability})),
    ...(config.normativeRegistry?[{row_id:SELECTED_DELIVERY_ROW_R1,locator_id:config.normativeRegistry.locator.id,
     applicability:{contract,selectionParameterId:SELECTED_DELIVERY_PREFIX_R1+'selection',selectedValue:'SEPARATE_CONFIRMED',
      sourceKey:config.normativeRegistry.source.source_key,physicalNormId:source.norm_id,sourceDefinitionHash:source.definition_hash,
      serverShipmentAdmissionRequired:true,automaticReferenceRateAllowed:false}}]:[])],baseline,passport:parent.passport},
  parameterTruthMetadata:p=>({...p.truth_metadata,contract,semantic_parameter_key:`${catalogId}:${p.parameter_id}`,formula_consumers:formulaConsumers[p.parameter_id],resource_branch_consumers:resourceConsumers[p.parameter_id]}),
  resourceId:r=>uuid([definitionId,r.row_id]),resourceSemanticOwner:r=>String(r.semantic_owner??`${catalogId}:${r.row_id}`),resourceSha256:r=>hash(r),
  baseline:{id:baselineId,key:`${contract}:${definitionId}`,sourceDefinitionVersionId:parent.definition.id,supersedesBaselineId:parent.baseline.id,
   acceptedReleaseId:config.releaseId,acceptanceEvidenceSha256:config.evidenceSha256,validationScenarioRefs:[{scenario:'PRIMARY_ONLY_NO_DELIVERY_SELECTED',fixture:{[primary]:1},runtimeProfile:{},realProject:false}]},
  passport:{physicalResultRu:parent.passport.physical_result_ru,excludedScopeRu:parent.passport.excluded_scope_ru,decision,payloadSha256:hash({model,decision}),sourceHead:config.sourceHead,sourceTree:config.sourceTree},
  bindingApplicability:b=>b.applicability,expectedNormativeBindingCount:parent.normBindings.length+(config.normativeRegistry?1:0)});
 return {model,plan,primaryMeasureParameterId:primary,publicationReady:false,
  remainingPublicationGates:['New Ford normative locator binding must be resolved and verified in the canonical source registry.','Server receipt/order/price admission and P→C reopen still required.']};
}
