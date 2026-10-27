import source from '../../../../data/estimate-benchmarks/source-packs/facade-glass-vacuum-whole-device-r5.json';
import glassFamilySource from '../../../../data/estimate-benchmarks/source-packs/facade-glass-whole-existing-owner-r4.json';
import {
  buildAutomaticConstructionOwnerR1, unresolvedApplicationNormTruthR1,
  type AutomaticOwnerDefinition, type AutomaticParameterSpec, type AutomaticRowSpec, type AutomaticInclusionCondition,
} from './automaticConstructionOwnerR1';
import {compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import type {PurchaseGroupRepresentative} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';

export const facadeGlassVacuumPrefixR5='facade:glass-vacuum-whole:r5';
export const facadeGlassVacuumPrimaryR5='glass_facade_area_m2';
export const facadeGlassVacuumDevicesR5='glass_vacuum_assigned_whole_devices';
export const facadeGlassVacuumControlMethodR5='glass_vacuum_approved_control_method';
export const facadeGlassVacuumDirectControlR5='Штатная рукоятка доступна в течение всего принятого перемещения';
export const facadeGlassVacuumAuxControlR5='Проектное дополнительное ручное управление элементом при недоступной рукоятке';
export const facadeGlassVacuumNormParameterR5=(key:string)=>'glass_vacuum_unknown_'+key.replaceAll('-','_');
const id=(key:string)=>facadeGlassVacuumPrefixR5+':'+key;
const positive={kind:'greater_than' as const,parameterId:facadeGlassVacuumPrimaryR5,value:0};
const aux:AutomaticInclusionCondition={kind:'and',operands:[positive,{kind:'equals',parameterId:facadeGlassVacuumControlMethodR5,value:facadeGlassVacuumAuxControlR5}]};
const facts=[
  'glass_vacuum_exact_source_fit','glass_vacuum_serial_number','glass_vacuum_software_version',
  'glass_vacuum_approved_load_fit','glass_vacuum_approved_ppr','glass_vacuum_charger_network_fit',
  facadeGlassVacuumControlMethodR5,
];
const operations=[
  ['load-fit','Проверка совместимости элемента, подушек и принятой схемы подъёма'],
  ['receive-assemble','Доставка и сборка комплектного устройства с первичным присоединением'],
  ['preinspect','Проверка устройства и контактной поверхности перед подъёмом'],
  ['pad-clean','Очистка и высушивание подушек и контактной поверхности'],
  ['lifting','Захват, перемещение, поворот, наклон и освобождение элемента'],
  ['test-service','Проверки, обслуживание и заряд устройства в принятой границе'],
  ['store-transport','Защита подушек, безопасное хранение и перевозка устройства'],
] as const;
const stockOps:Record<string,readonly string[]>={
  lifter:operations.map(o=>o[0]), pads:['load-fit','preinspect','pad-clean','lifting','test-service','store-transport'],
  'pad-covers':['receive-assemble','store-transport'], 'pad-screens':['preinspect','lifting','test-service'],
  'air-filters':['preinspect','lifting','test-service'], 'battery-12v':['preinspect','lifting','test-service','store-transport'],
  'buzzer-battery-9v':['preinspect','lifting','test-service'],charger:['test-service','store-transport'],
};
const needOps:Record<string,readonly string[]>={
  'device-period-owner':operations.map(o=>o[0]),'primary-rigging':['receive-assemble','lifting'],
  'crane-operation':['receive-assemble','lifting','store-transport'],'whole-labour':operations.map(o=>o[0]),
  'access-PPE':['receive-assemble','preinspect','pad-clean','lifting','test-service','store-transport'],
  power:['test-service','store-transport'],'mild-pad-cleaner':['preinspect','pad-clean'],
  'pad-cleaning-water':['preinspect','pad-clean'],'lint-free-cloth':['preinspect','pad-clean'],
  'wear-and-spares':['test-service'],'quality-services':['load-fit','preinspect','test-service'],
  'delivery-store-feed':['receive-assemble','store-transport'],'exact-version-service':['test-service'],'aux-control':['lifting'],
};
const op=(key:string)=>{const value=operations.find(o=>o[0]===key);if(!value)throw Error('GLASS_VACUUM_EXACT_OPERATION_REQUIRED');return value;};

/** A reusable whole-device SOURCE COMPONENT of the existing glass facade.
 * Assigned stock is an actual approved PPR fact. Source component counts are
 * installed inventory, never wear, consumption, paid rental or new purchase.
 * Whole period/crew/rigging/crane/cleaning/power/QA/logistics remain protected.
 * Optional family attachment reuses this whole definition; no parent need is automatically closed. */
export function facadeGlassVacuumWholeDefinitionR5():AutomaticOwnerDefinition {
  if(source.existingFamilyOwnerAnchor!=='canonical-work:expanded:curtain_wall_system'
    ||source.components.length!==8||source.needs.length!==14||source.newFULL!==0)
    throw Error('GLASS_VACUUM_EXACT_WHOLE_SOURCE_REQUIRED');
  const conditional:AutomaticParameterSpec[]=[
    {id:facadeGlassVacuumDevicesR5,title:'Фактическое число назначенных комплектных устройств по принятому ППР',unitId:'piece',valueType:'integer',kind:'conditional',min:1,requiredWhen:positive},
    {id:facts[0],title:'Принятое соответствие точного штатного устройства исходному руководству',unitId:null,valueType:'text',kind:'conditional',requiredWhen:positive},
    {id:facts[1],title:'Фактический серийный номер принятого устройства',unitId:null,valueType:'integer',kind:'conditional',min:20230854,requiredWhen:positive},
    {id:facts[2],title:'Принятая версия ПО исходного устройства',unitId:null,valueType:'enum',kind:'conditional',values:['10.0'],requiredWhen:positive},
    {id:facts[3],title:'Принятые паспорта элемента и квалифицированная оценка подушек, массы, центра тяжести и схемы',unitId:null,valueType:'text',kind:'conditional',requiredWhen:positive},
    {id:facts[4],title:'Принятый ППР механизма, первичного присоединения, доступа и звена с массой устройства',unitId:null,valueType:'text',kind:'conditional',requiredWhen:positive},
    {id:facts[5],title:'Фактическая совместимость одного зарядного устройства с принятой сетью и защитой',unitId:null,valueType:'text',kind:'conditional',requiredWhen:positive},
    {id:facadeGlassVacuumControlMethodR5,title:'Принятый способ управления перемещением элемента',unitId:null,valueType:'enum',kind:'conditional',values:[facadeGlassVacuumDirectControlR5,facadeGlassVacuumAuxControlR5],requiredWhen:positive},
    ...source.needs.map(n=>({id:facadeGlassVacuumNormParameterR5(n.key),title:n.titleRu,unitId:null,valueType:'decimal' as const,kind:'internal' as const,min:0})),
  ];
  const row=(key:string,title:string,category:string,unitId:string,expression:string,condition:AutomaticInclusionCondition=positive):AutomaticRowSpec=>({
    rowId:id(key),formulaId:id('formula:'+key),section:source.scope.publicResultRu,title,category,unitId,expression,
    inclusion:condition,inputParameterIds:[...facts],costTreatment:'INFORMATIONAL_SCOPE',procurement:false,
  });
  const rows:AutomaticRowSpec[]=[
    ...source.components.map(c=>row('stock:'+c.key,c.titleRu,'equipment','piece',facadeGlassVacuumDevicesR5+(c.perDeviceCount===1?'':'*'+c.perDeviceCount))),
    ...source.needs.map(n=>row('need:'+n.key,n.titleRu,n.category,n.unitId??'',facadeGlassVacuumNormParameterR5(n.key),n.key==='aux-control'?aux:positive)),
  ];
  const main=source.sources[0]!;
  const built=buildAutomaticConstructionOwnerR1({
    contract:source.contract,semanticOwner:facadeGlassVacuumPrefixR5,sourceId:'gox_facade_glass_vacuum_whole_r5',
    normId:'EXACT_COMPLETE_DEVICE_INVENTORY_NOT_OPERATING_OR_WEAR_NORM',
    sourceMetadata:{source_title:source.scope.publicResultRu,source_document_version:source.scope.internalExactDevice,
      definition_hash:main.sha256,artifact_sha256:main.sha256,exact_locator:'OperatingPDF5/8/18/21/29/35/37/38/44; Bulletin2019PDF1; protectedwholeperiod'},
    applicabilityRu:source.scope.publicResultRu+'; точное серийное устройство и ПО, принятые проект и ППР. Количество stock не закрывает период, нормы эксплуатации и полную готовность.',
    ordinary:[{id:facadeGlassVacuumPrimaryR5,title:'Фактическая площадь в границах выбранного стеклянного фасада',unitId:'m2',valueType:'decimal',kind:'ordinary',min:0}],
    profile:[],conditional,rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:source.exclusions,
  });
  return {...built,
    parameters:built.parameters.map(q=>{
      const need=source.needs.find(n=>q.parameter_id===facadeGlassVacuumNormParameterR5(n.key));
      if(need)return {...q,truth_metadata:unresolvedApplicationNormTruthR1(q.truth_metadata,need.missing)};
      const geometry=q.parameter_id===facadeGlassVacuumPrimaryR5;
      return {...q,required:geometry,truth_metadata:{...q.truth_metadata,source_confirmation_required:false,
        visibility_role:geometry?'USER_INPUT':'INTERNAL_ONLY',
        value_source_role:geometry?'USER_INPUT':q.parameter_id===facadeGlassVacuumDevicesR5||q.parameter_id==='glass_vacuum_approved_ppr'?'PROJECT_DOCUMENTATION':'SELECTED_EQUIPMENT_PASSPORT',
        preliminary_compilation_allowed:!geometry,
        provenance:{consumer_input_role_v1:geometry?'OBJECT_FACT':'APPLICATION_TECHNICAL',
          ...(geometry?{}:{source_readback_only_v1:true,consumer_question_allowed:false})}}};
    }),
    resources:built.resources.map(r=>{
      const key=r.row_id.slice(facadeGlassVacuumPrefixR5.length+1),stock=key.startsWith('stock:');
      const component=source.components.find(c=>key==='stock:'+c.key),need=source.needs.find(n=>key==='need:'+n.key);
      const keys=stock?stockOps[component!.key]!:needOps[need!.key]!,ops=keys.map(op);
      const {row_sha256:_old,...body}=r;
      const next={...body,resource_graph:{...r.resource_graph,
        ...(stock?{includedInResourceOwnerRowId:id('need:device-period-owner'),
          derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:'piece',parameterIds:[facadeGlassVacuumDevicesR5],reasonRu:'Измените фактически назначенное по ППР число комплектных устройств. Штатный состав не является расходом или отдельной покупкой.'}}:{}),
        operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:facadeGlassVacuumPrefixR5,
          groupTitleRu:source.scope.publicResultRu,operationId:id('operation:'+ops[0]![0]),operationTitleRu:ops[0]![1],processOrdinal:1,
          additionalOperations:ops.slice(1).map((o,i)=>({operationId:id('operation:'+o[0]),operationTitleRu:o[1],processOrdinal:i+2,processRole:'PROCESS',completionCriterionRu:'Выполнена операция «'+o[1]+'» по точному руководству и принятому ППР; незакрытое обеспечение сохранено.'})),
          completionCriterionRu:need?.missing??'Штатный целый комплект фактического устройства; полная готовность эксплуатации отдельно не принята.'}},
        source_metadata:{...r.source_metadata,source_artifact_sha256:main.sha256,
          sourceRole:stock?'EXACT_INSTALLED_WHOLE_DEVICE_INVENTORY_NOT_CONSUMPTION':'UNRESOLVED_APPLICATION_NORM',
          normativeTrace:stock?[{sourceId:'gox_facade_glass_vacuum_whole_r5',source_artifact_sha256:main.sha256,exact_locator:'OperatingPDF'+component!.pdfPages.join(',')}]:[],
          sourceScope:source.scope,automaticGenericPriceInheritanceAllowed:false,
          sourceStockNotConsumption:stock,inventoryProcurementNotAdmitted:true,
          completeDevicePeriodOwnerRowId:id('need:device-period-owner'),
          ...(need?{normative_source_ids:[],quantityNormAccepted:false,missingFact:need.missing,
            parentWholeNeedKeyToReviewForReuse:need.parentWholeNeedKeyToReviewForReuse,
            parentReuseNotAdmitted:true}:{}),
          full_technical_acceptance:false,newFull:0}};
      return {...next,row_sha256:hash(next)};
    }),
  };
}

/** Existing compiler only; no standalone catalog/factory/publication. */
export function compileFacadeGlassVacuumWholeR5(parameters:Record<string,unknown>,options:{
  rowOverrides?:CanonicalEstimateCompileCoreInput['rowOverrides'];
  confirmedParameters?:CanonicalEstimateCompileCoreInput['confirmedParameters'];
}={}) {
  if(Object.keys(parameters).some(key=>key!==facadeGlassVacuumPrimaryR5))
    throw Object.assign(new Error('GLASS_VACUUM_TECHNICAL_INPUT_REQUIRES_SOURCE_READBACK'),{code:'PARAMETER_VALIDATION_FAILED'});
  const model=facadeGlassVacuumWholeDefinitionR5();
  return compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:source.contract,
    catalogId:source.existingFamilyOwnerAnchor,primaryMeasureParameterId:facadeGlassVacuumDevicesR5,
    parameterDefinitions:[...model.parameters],formulaDefinitions:[...model.formulas],resourceDefinitions:[...model.resources],
    submittedParameters:parameters,confirmedParameters:options.confirmedParameters??{},rowOverrides:options.rowOverrides??{},priceItems:[],currencyCode:'KGS',
    maximumResourceRows:model.resources.length,hashJson:hash});
}

/** Source-derived expectations, never enumerated from generated compiler rows. */
export function facadeGlassVacuumWholeCompletenessR5() {
  const entry=(kind:string,key:string,title:string,category:string,unitId:string|null,condition:string)=>{
    const keys=(kind==='stock'?stockOps:needOps)[key]!,ops=keys.map(op);
    return {expectedResourceId:id('expected:'+key),operationId:id('operation:'+ops[0]![0]),requiredOperationIds:ops.map(o=>id('operation:'+o[0])),
      category,unitId,specification:title,condition,sourceId:'gox_facade_glass_vacuum_whole_r5',
      quantityRule:kind==='stock'?'EXACT_INSTALLED_INVENTORY_PER_ACTUAL_PPR_DEVICE_NOT_CONSUMPTION':'PROTECTED_UNRESOLVED_APPLICATION_NORM_NOT_USER_QUANTITY',
      formulaId:id('formula:'+kind+':'+key),resolution:{kind:'ROW',rowId:id(kind+':'+key)}};
  };
  return {contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'TECHNOLOGY_MAP',exactSourceMethodKind:'EXACT_WHOLE_VACUUM_DEVICE_PRIMARY_MANUAL',
    generatedFromCurrentRows:false,operationResourceBindingRequired:true,evidenceSha256:source.sources[0]!.sha256,
    evidenceReferences:source.sources.map(s=>s.url),entries:[
      ...source.components.map(c=>entry('stock',c.key,c.titleRu,'equipment','piece','EXACT_WHOLE_DEVICE_ACTIVE')),
      ...source.needs.map(n=>entry('need',n.key,n.titleRu,n.category,n.unitId,n.applicability)),
    ],parentGlassNeedNotAutomaticallyClosed:true,fullTechnicalAcceptance:false,newFULL:0};
}

/** TEST_ONLY fixtures; never defaults or real source-fit/qualification acts. */
export function facadeGlassVacuumWholeControlR5(more:Record<string,unknown>={}):Record<string,unknown> {
  return {[facadeGlassVacuumPrimaryR5]:'100',[facadeGlassVacuumDevicesR5]:'1',
    glass_vacuum_exact_source_fit:'TEST_ONLY exact standard original MRT411LDC3 source fit, not actual approval',
    glass_vacuum_serial_number:'20230854',glass_vacuum_software_version:'10.0',
    glass_vacuum_approved_load_fit:'TEST_ONLY exact qualified glass or load-manufacturer assessment, approved pads/frame/center/conditions; not capacity alone',
    glass_vacuum_approved_ppr:'TEST_ONLY complete hook/rigging/crane radius/access/crew PPR includes 57kg device and load; not actual act',
    glass_vacuum_charger_network_fit:'TEST_ONLY one charger voltage fits protected local network; not three simultaneous charger variants',
    [facadeGlassVacuumControlMethodR5]:facadeGlassVacuumDirectControlR5,...more};
}

/** Reuse the complete existing source component ONCE in the existing family.
 * The selected equipment passport is a trusted source fact. Missing selection
 * activates no particular device. An unresolved handling/period need remains
 * unresolved; installed inventory creates neither a new purchase nor a fee.
 */
export const facadeGlassVacuumSelectionR5='glass_vacuum_exact_device_profile';
export const facadeGlassVacuumChoiceR5=source.scope.internalExactDevice;
export const facadeGlassVacuumApprovedMethodR5='glass_vacuum_approved_glass_method';
export function applyFacadeGlassVacuumWholeR5(parent:PurchaseGroupRepresentative,options:Readonly<{
  methodSelectorParameterId:string;compatibleMethodValues:readonly string[];registeredFamilySourceId:string;
}>):PurchaseGroupRepresentative{
  if(parent.definition.catalog_id!==source.existingFamilyOwnerAnchor
    ||!parent.parameters.some(q=>q.parameter_id===facadeGlassVacuumPrimaryR5)
    ||!parent.parameters.some(q=>q.parameter_id===options.methodSelectorParameterId)
    ||options.compatibleMethodValues.length!==4||new Set(options.compatibleMethodValues).size!==4)
    throw Error('GLASS_VACUUM_EXISTING_FAMILY_AND_EXACT_COMPATIBLE_METHODS_REQUIRED');
  // Resolve compatibility from the exact existing source branches, rather than
  // accepting any four distinct labels supplied by a future caller. In
  // particular, nominal capacity does not admit an assembled unitized load.
  const sourceAttachment=glassFamilySource.reusedWholeSourceComponents.find(c=>c.key==='exact-vacuum-whole-device-r5');
  const requiredKeys=['stick','structural','semi-structural','point-fixed'];
  const exactProfiles=glassFamilySource.profiles.filter(profile=>requiredKeys.includes(profile.key));
  if(!sourceAttachment||sourceAttachment.sha256!=='07fa89b2e0e6e1b03624bef976b237d7c91d478671d28818218d09183262f38e'
    ||sourceAttachment.exactSelectedSourceProfile!==facadeGlassVacuumChoiceR5
    ||sourceAttachment.compatibleWholeMethodKeys.length!==requiredKeys.length
    ||!requiredKeys.every(key=>sourceAttachment.compatibleWholeMethodKeys.includes(key))
    ||exactProfiles.length!==requiredKeys.length
    ||!exactProfiles.every(profile=>options.compatibleMethodValues.includes(profile.titleRu)))
    throw Error('GLASS_VACUUM_EXACT_REGISTERED_METHOD_COMPATIBILITY_REQUIRED');
  const next=structuredClone(parent),component=facadeGlassVacuumWholeDefinitionR5();
  const compatible={kind:'or',operands:options.compatibleMethodValues.map(value=>({kind:'selected',parameterId:options.methodSelectorParameterId,value}))};
  const active={kind:'and',operands:[compatible,{kind:'selected',parameterId:facadeGlassVacuumSelectionR5,value:facadeGlassVacuumChoiceR5}]};
  const ownIds=new Set(next.parameters.map(q=>q.parameter_id)),formulaIds=new Set(next.formulas.map(q=>q.formula_id)),rowIds=new Set(next.resources.map(q=>q.row_id));
  const strip=(v:unknown):Record<string,unknown>=>{
    if(!v||typeof v!=='object'||Array.isArray(v))throw Error('GLASS_VACUUM_EXISTING_SOURCE_RECORD_REQUIRED');
    return Object.fromEntries(Object.entries(v).filter(([key])=>!['id','definition_version_id','created_at','updated_at','row_sha256'].includes(key)));
  };
  const needIds=source.needs.map(n=>id('need:'+n.key)),map=facadeGlassVacuumWholeCompletenessR5();
  if(ownIds.has(facadeGlassVacuumSelectionR5))throw Error('GLASS_VACUUM_WHOLE_COMPONENT_ALREADY_ATTACHED');
  next.parameters.push({parameter_id:facadeGlassVacuumSelectionR5,ordinal:next.parameters.length,
    title_ru:'Точный комплект вакуумного устройства по принятому паспорту и ППР',value_type:'enum',unit_id:null,required:false,default_value:null,
    constraints_json:{values:[facadeGlassVacuumChoiceR5],forbiddenWhen:{kind:'not',operand:compatible}},
    truth_metadata:{contract:source.contract,semantic_parameter_key:source.existingFamilyOwnerAnchor+':'+facadeGlassVacuumSelectionR5,
      visibility_role:'INTERNAL_ONLY',value_source_role:'SELECTED_EQUIPMENT_PASSPORT',source_confirmation_required:false,preliminary_compilation_allowed:true,
      provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL',source_readback_only_v1:true,consumer_question_allowed:false},
      guide:{guide_kind:'PROJECT_DEFINED',guide_short_ru:'Точный паспорт назначенного комплектного устройства; не вопрос потребителю.',
        source_role:'SELECTED_EQUIPMENT_PASSPORT',source_document:options.registeredFamilySourceId,
        source_locator:'Operating#35068Rev9.5/3-25;serial20230854+;software10.0;standardMRT411LDC3',
        source_snapshot_hash:source.sources[0]!.sha256,guide_version:source.contract,
        applicability:'Только подтверждённое исходное устройство, подходящее отдельное стекло и принятый ППР. Сборный модуль не допущен одним грузовым пределом.',
        verified_at:'2026-10-23',guide_validation_policy:'MANDATORY_BLOCK'}}});
  ownIds.add(facadeGlassVacuumSelectionR5);
  if(ownIds.has(facadeGlassVacuumApprovedMethodR5))throw Error('GLASS_VACUUM_APPROVED_METHOD_PARAMETER_COLLISION');
  const mismatchedApprovedMethod={kind:'or',operands:options.compatibleMethodValues.map(value=>({kind:'and',operands:[
    {kind:'selected',parameterId:options.methodSelectorParameterId,value},
    {kind:'not',operand:{kind:'selected',parameterId:facadeGlassVacuumApprovedMethodR5,value}},
  ]}))};
  next.parameters.push({parameter_id:facadeGlassVacuumApprovedMethodR5,ordinal:next.parameters.length,
    title_ru:'Исходный стеклянный метод, для которого принят паспорт элемента и ППР устройства',value_type:'enum',unit_id:null,required:false,default_value:null,
    constraints_json:{values:[...options.compatibleMethodValues],requiredWhen:{kind:'and',operands:[active,positive]},forbiddenWhen:{kind:'and',operands:[active,positive,mismatchedApprovedMethod]}},
    truth_metadata:{...next.parameters.find(parameter=>parameter.parameter_id===facadeGlassVacuumSelectionR5)!.truth_metadata,
      semantic_parameter_key:source.existingFamilyOwnerAnchor+':'+facadeGlassVacuumApprovedMethodR5,
      value_source_role:'ENGINEERING_DESIGN',
      provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL',source_readback_only_v1:true,consumer_question_allowed:false,
        approved_glass_method_binding_v1:true,not_automatically_copied_from_selected_card:true}}});
  ownIds.add(facadeGlassVacuumApprovedMethodR5);

  for(const q of component.parameters){
    if(q.parameter_id===facadeGlassVacuumPrimaryR5)continue;
    if(ownIds.has(q.parameter_id))throw Error('GLASS_VACUUM_EXISTING_PARAMETER_ID_COLLISION');
    ownIds.add(q.parameter_id);
    next.parameters.push({...strip(q),ordinal:next.parameters.length,required:false,default_value:null,
      constraints_json:{...q.constraints_json,requiredWhen:{kind:'and',operands:[active,q.constraints_json?.requiredWhen??{kind:'literal',value:false}]}},
      truth_metadata:{...q.truth_metadata,visible_when:active}});
  }
  for(const f of component.formulas){
    if(formulaIds.has(f.formula_id))throw Error('GLASS_VACUUM_EXISTING_FORMULA_ID_COLLISION');
    formulaIds.add(f.formula_id);next.formulas.push({...f});
  }
  for(const r of component.resources){
    if(rowIds.has(r.row_id))throw Error('GLASS_VACUUM_EXISTING_RESOURCE_ID_COLLISION');
    rowIds.add(r.row_id);
    const declaredConsumers=r.resource_graph.inputParameterIds;
    if(!Array.isArray(declaredConsumers)||declaredConsumers.some(id=>typeof id!=='string'))throw Error('GLASS_VACUUM_NATIVE_CONTEXT_REQUIRED');
    const body={...strip(r),ordinal:next.resources.length,row_type:r.category==='work'?'labor':r.category,
      semantic_owner:source.existingFamilyOwnerAnchor+':'+r.row_id,
      resource_graph:{...r.resource_graph,inputParameterIds:[...new Set([...declaredConsumers,facadeGlassVacuumApprovedMethodR5])]},
      inclusion_ast:{kind:'and',operands:[active,r.inclusion_ast]},
      source_metadata:{...r.source_metadata,reusedWholeSourceComponent:true,existingFamilyOwnerAnchor:source.existingFamilyOwnerAnchor,
        parentGlassHandlingNeedStillUnresolved:true,noAdditionalPaidOrPurchaseOwner:true}};
    next.resources.push({...body,row_sha256:hash(body)});
  }
  const consumers=buildMasterParameterCalculationConsumers(next);
  for(const q of next.parameters){
    const parameterId=String(q.parameter_id);
    q.truth_metadata={...q.truth_metadata,formula_consumers:consumers.formulaConsumers[parameterId],resource_branch_consumers:consumers.resourceConsumers[parameterId]};
    next.baseline.formula_consumer_ids[parameterId]=consumers.formulaConsumers[parameterId];
    next.baseline.resource_consumer_row_ids[parameterId]=consumers.resourceConsumers[parameterId];
    next.baseline.uom_by_parameter[parameterId]=q.unit_id;
    next.baseline.guide_provenance_ru[parameterId]=q.truth_metadata.guide?.guide_short_ru??q.title_ru;
    if(!parent.parameters.some(p=>p.parameter_id===parameterId))next.baseline.normative_source_ids[parameterId]=
      q.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM'?[]:[options.registeredFamilySourceId];
  }
  const previous=next.passport.decision.independentCompletenessMap;
  next.passport.decision={...next.passport.decision,
    unresolvedResourceRowIds:[...new Set([...next.passport.decision.unresolvedResourceRowIds,...needIds])],
    independentCompletenessMap:{...previous,entries:[...previous.entries,...map.entries],componentMaps:[...(previous.componentMaps??[]),map],fullTechnicalAcceptance:false},
    conditionalGlassVacuumNeeds:{selectionParameterId:facadeGlassVacuumSelectionR5,compatibleMethodValues:[...options.compatibleMethodValues],
      needRowIds:needIds,baseUnresolvedNeedCount:13,auxiliaryControlAdditionalNeedCount:1,parentHandlingNeedNotClosed:true},
    completeTechnicalEstimateAccepted:false,newFullTechnologies:0};
  next.passport.included_scope_ru=[...next.passport.included_scope_ru,'Целый штатный вакуумный комплект по точному принятому паспорту: восемь типов установленного оснащения, без повторной оплаты или закупки.'];
  next.passport.excluded_scope_ru=[...next.passport.excluded_scope_ru,'Назначенный запас вакуумного устройства не закрывает период эксплуатации, труд, расходники и подъём. Сборные фасадные модули требуют собственного подтверждения прочности.'];
  next.definition.applicability={...next.definition.applicability,
    reusedGlassVacuumWholeComponentR5:{contract:source.contract,exactSourceProfile:facadeGlassVacuumChoiceR5,
      selectionParameterId:facadeGlassVacuumSelectionR5,sourcePackSha256:'07fa89b2e0e6e1b03624bef976b237d7c91d478671d28818218d09183262f38e',
      compatibleMethodValues:[...options.compatibleMethodValues],unitizedAssemblyNotAdmitted:true,publicInputAdded:false,
      installedInventoryOnly:true,fullTechnicalAcceptance:false}};
  next.passport.capability_matrix=(next.passport.capability_matrix??[]).map((capability:Record<string,unknown>)=>
    capability.capability==='FULL_APPLICABLE_SCOPE'?{...capability,status:'NEEDS_SOURCE',unresolvedResourceRowIds:next.passport.decision.unresolvedResourceRowIds}:capability);
  return next;
}
