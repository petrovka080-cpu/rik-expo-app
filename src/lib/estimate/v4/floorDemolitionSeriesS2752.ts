import pack from '../../../../data/estimate-benchmarks/source-packs/floor-demolition-series-s27-52.json';
import { buildAutomaticConstructionOwnerR1, type AutomaticRowSpec, type AutomaticParameterSpec,
  compileAutomaticConstructionOwnerR1 } from './automaticConstructionOwnerR1';
import { estimateDeterministicHash } from '../estimateDeterministicHash';

export const FLOOR_DEMOLITION_SERIES_S2752 = pack;
export const FLOOR_DEMOLITION_SOURCE_METADATA_S2752 = {
  source_title:'КРЕР46-2015, Разборка покрытий полов, таблица46-04-010',
  source_authority:'Министерство строительства Кыргызской Республики',
  source_document_version:pack.source.edition, definition_hash:pack.source.sha256,
  artifact_sha256:pack.source.sha256, official_url:pack.source.officialUrl,
  exact_locator:'Техническая часть1.1, печатная/PDFстр.5; таблица46-04-010, стр.57–58; колонки02/03/04/06/07',
  use_restriction:pack.sourceScopeRu,
};

/** Independent operation expectations from KRER table/technical part, before
 * constructing rows. Conditional extra services require a project scope. */
export function floorDemolitionCompletenessMapS2752(index:number) {
  const type=pack.types[index];if(!type)throw new Error('EXACT_SOURCE_COLUMN_REQUIRED');
  const prefix=`floor-demolition:${type.key}`;
  const entry=(key:string,condition:string,specification:string,unitId:string,parent?:string)=>({
    expectedResourceId:`required:${key}`,operationId:key,category:key.startsWith('machine')?'equipment':key.includes('service')?'service':key==='cleanup'||key==='salvage'?'construction_work':'labor',
    specification,condition,sourceId:pack.sourceId,unitId,
    quantityRule:key.includes('service')?'CONFIRMED_PROJECT_MASS_AND_SERVICE_SPECIFICATION':'EXACT_KRER_COLUMN_PER_100_M2_OR_INCLUDED_SCOPE',
    priceRelation:parent?'INCLUDED_IN_PARENT':'SEPARATE_IF_APPLICABLE',
    formulaId:`${prefix}:formula:${key}`,
    resolution:parent?{kind:'INCLUDED_COMPONENT_ROW',rowId:`${prefix}:${key}`,parentRowId:`${prefix}:${parent}`}
      :{kind:'ROW',rowId:`${prefix}:${key}`},
  });
  return {contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'NORMATIVE_OPERATION_MAP',
    generatedFromCurrentRows:false,evidenceSha256:pack.source.sha256,evidenceReferences:[pack.source.officialUrl,'КРЕР 46-2015, стр.5,57–58; '+type.column],
    entries:[entry('labor','EXACT_COVERING_NORMAL_RECONSTRUCTION',`${type.workers.hoursPer100m2} чел.-ч/100 м²; ${type.workers.resourceCode}`,'man_hour'),
      ...(type.machine?[entry('machine','OWN_MACHINE_SELECTED',type.machine.nameRu,'machine_hour'),
        entry('machine-hired','HIRED_MACHINE_SELECTED',type.machine.nameRu+'; ставка аренды с машинистом','machine_hour'),
        entry('operator','OWN_MACHINE_SELECTED','Труд машиниста входит в механизм','man_hour','machine'),
        entry('operator-hired','HIRED_MACHINE_SELECTED','Труд машиниста входит в ставку аренды','man_hour','machine-hired')]:[]),
      entry('salvage','EXACT_COVERING_RECONSTRUCTION','Сортировка и штабелирование; площадь разборки, не пригодный выход','m2','labor'),
      entry('cleanup','KRER_INCLUDED_MOVEMENT_BOUNDARIES','Уборка, до130м суммарно и до50м от объекта; спуск в лотках через окно','m2','labor'),
      entry('waste-onsite-service','EXTRA_ONSITE_HANDLING_SELECTED_CONFIRMED_SPECIFICATION','Дополнительное обращение на объекте без внешнего вывоза','t'),
      entry('waste-service','EXTERNAL_HAUL_SELECTED_CONFIRMED_SPECIFICATION','Согласованная полная услуга: тара, дополнительный спуск/погрузка вне КРЕР, маршрут, транспорт, приём','t')],
    boundaryRu:'КРЕР исключает дополнительные затаривание, отдельный спуск и внешний вывоз: это условные проектные строки, а не неприменимые операции.',
  };
}

export function floorDemolitionDefinitionS2752(index:number) {
  const type=pack.types[index];
  if (!type) throw new Error('FLOOR_DEMOLITION_TYPE_OUTSIDE_VERIFIED_SERIES');
  const prefix=`floor-demolition:${type.key}`;
  const laborId=`${prefix}:labor`, machineId=`${prefix}:machine`;
  const ownMachine='Механизм предоставлен исполнителем; оплачивается эксплуатация по смете';
  const hiredMachine='Требуется аренда механизма с машинистом; единая ставка за машино-час';
  const physicalIds=['existing_covering_confirmed','object_conditions'];
  const rows:AutomaticRowSpec[]=[];
  const add=(key:string,section:string,category:string,title:string,unitId:string,expression:string,
    extra:Partial<AutomaticRowSpec>={}) => rows.push({rowId:`${prefix}:${key}`,formulaId:`${prefix}:formula:${key}`,
      section,category,title,unitId,expression,procurement:false,inputParameterIds:physicalIds,...extra});
  add('work','Снятие покрытия пола','work',type.titleRu,'m2','floor_covering_area_m2',{costTreatment:'INFORMATIONAL_SCOPE'});
  add('labor','Снятие покрытия пола','labor',`Рабочие-строители, средний разряд${type.workers.grade.replace('.',',')}`,
    'man_hour',`floor_covering_area_m2*${type.workers.hoursPer100m2}/100`);
  if(type.machine) {
    add('machine','Снятие покрытия пола','equipment',type.machine.nameRu,'machine_hour',
      `floor_covering_area_m2*${type.machine.hoursPer100m2}/100`,{
        inclusion:{kind:'equals',parameterId:'mechanism_fulfillment',value:ownMachine}});
    add('operator','Снятие покрытия пола','labor',`Машинист: ${type.machine.nameRu} — включён в стоимость механизма`,
      'man_hour',`floor_covering_area_m2*${type.machine.hoursPer100m2}/100`,{costTreatment:'INCLUDED_IN_RESOURCE_ROWS',
        inclusion:{kind:'equals',parameterId:'mechanism_fulfillment',value:ownMachine}});
    add('machine-hired','Снятие покрытия пола','equipment',`Аренда с машинистом: ${type.machine.nameRu}`,'machine_hour',
      `floor_covering_area_m2*${type.machine.hoursPer100m2}/100`,{procurement:true,
        inclusion:{kind:'equals',parameterId:'mechanism_fulfillment',value:hiredMachine}});
    add('operator-hired','Снятие покрытия пола','labor',`Машинист — входит в ставку аренды: ${type.machine.nameRu}`,
      'man_hour',`floor_covering_area_m2*${type.machine.hoursPer100m2}/100`,{costTreatment:'INCLUDED_IN_RESOURCE_ROWS',
        inclusion:{kind:'equals',parameterId:'mechanism_fulfillment',value:hiredMachine}});
  }
  add('salvage','Сортировка и штабелирование','work','Сортировка и штабелирование — включено; площадь разборки, не выход пригодных элементов',
    'm2','floor_covering_area_m2',{costTreatment:'INCLUDED_IN_RESOURCE_ROWS'});
  add('cleanup','Уборка и перемещение по норме','work',
    'Уборка и перемещение мусора: суммарно до130м, до50м от объекта; спуск через окно в лотках — включено',
    'm2','floor_covering_area_m2',{costTreatment:'INCLUDED_IN_RESOURCE_ROWS'});
  add('waste-service','Дополнительное обращение с отходами','service',
    `Затаривание, отдельный спуск и внешний вывоз снятого покрытия: ${type.confirmedMaterialRu}`,
    't','floor_waste_mass_t',{
      procurement:true,inclusion:{kind:'equals',parameterId:'waste_handling_mode',value:pack.contractorModeValue},
      inputParameterIds:[...physicalIds,'waste_service_coverage','haul_distance_km','transport_designation',
        'waste_packaging_description','waste_receiver_designation','waste_service_specification_ref','waste_lowering_loading_scope'],
      titleParameterIds:['waste_packaging_description','transport_designation','waste_receiver_designation'],
    });
  add('waste-onsite-service','Дополнительное обращение с отходами','service',
    `Дополнительные затаривание, спуск или обработка на объекте без внешнего вывоза: ${type.confirmedMaterialRu}`,
    't','floor_waste_mass_t',{procurement:true,
      inclusion:{kind:'equals',parameterId:'waste_handling_mode',value:pack.onSiteExtraModeValue},
      inputParameterIds:[...physicalIds,'waste_packaging_description','waste_service_specification_ref','waste_lowering_loading_scope'],
      titleParameterIds:['waste_packaging_description','waste_lowering_loading_scope','waste_service_specification_ref']});
  const extraWaste={kind:'or' as const,operands:[pack.contractorModeValue,pack.onSiteExtraModeValue]
    .map(value=>({kind:'equals' as const,parameterId:'waste_handling_mode',value}))};
  const conditional:AutomaticParameterSpec[]=[
    {id:'existing_covering_confirmed',title:`Подтверждено существующее покрытие: ${type.confirmedMaterialRu}`,
      valueType:'enum',unitId:null,kind:'conditional',values:[type.confirmedMaterialRu]},
    {id:'object_conditions',title:'Условия объекта и границы разборки',valueType:'enum',unitId:null,
      kind:'conditional',values:[pack.normalConditionValue]},
    {id:'waste_handling_mode',title:'Что сделать со снятыми материалами',valueType:'enum',unitId:null,
      kind:'conditional',values:[pack.retainModeValue,pack.onSiteExtraModeValue,pack.contractorModeValue]},
    ...(type.machine?[{id:'mechanism_fulfillment',title:'Как предоставляется механизм',valueType:'enum' as const,
      unitId:null,kind:'conditional' as const,values:[ownMachine,hiredMachine]}]:[]),
    {id:'floor_waste_mass_t',title:'Измеренная или подтверждённая масса отходов для дополнительного обращения',valueType:'decimal',
      unitId:'t',kind:'conditional',min:0.000001,requiredWhen:extraWaste},
    {id:'haul_distance_km',title:'Подтверждённое расстояние внешней перевозки',valueType:'decimal',
      unitId:'km',kind:'conditional',min:0.000001,requiredWhen:{parameterId:'waste_handling_mode',value:pack.contractorModeValue}},
    {id:'waste_service_coverage',title:'Подтверждённый состав дополнительной услуги',valueType:'enum',unitId:null,
      kind:'conditional',values:[pack.coverageValue],requiredWhen:{parameterId:'waste_handling_mode',value:pack.contractorModeValue}},
    ...['transport_designation','waste_packaging_description','waste_receiver_designation'].map((id):AutomaticParameterSpec=>({
      id,title:id==='transport_designation'?'Транспорт и его исполнение по согласованной услуге'
        :id==='waste_packaging_description'?'Тара и способ обращения с отходами по согласованной услуге'
          :'Место приёма отходов по согласованной услуге',valueType:'text',unitId:null,kind:'conditional',
      requiredWhen:id==='waste_packaging_description'?extraWaste:{parameterId:'waste_handling_mode',value:pack.contractorModeValue},
    })),
    {id:'waste_service_specification_ref',title:'Согласованная спецификация дополнительной услуги: номер/ссылка и описание состава',
      valueType:'text',unitId:null,kind:'conditional',requiredWhen:extraWaste},
    {id:'waste_lowering_loading_scope',title:'Дополнительный спуск и погрузка: способ, границы, включённые труд и тара; единый владелец цены',
      valueType:'text',unitId:null,kind:'conditional',requiredWhen:extraWaste},
  ];
  const definition=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:prefix,
    sourceId:pack.sourceId,normId:`norm:kg:krer:${type.column}:2015`,sourceMetadata:FLOOR_DEMOLITION_SOURCE_METADATA_S2752,
    applicabilityRu:`${type.confirmedMaterialRu}; ${type.column}; ${pack.sourceScopeRu}`,
    ordinary:[{id:'floor_covering_area_m2',title:'Площадь снимаемого покрытия пола',valueType:'decimal',unitId:'m2',
      kind:'ordinary',min:0.000001}],profile:[],conditional,rows,deferMissingProjectFactsToRows:true,
    excludedUnownedAssumptions:['Плотность, масса, число мешков и рейсов из площади не определяются.',
      'Основание пола, лаги, стяжка и новое покрытие не включены.',
      'Оплата уборки, включённых перемещений, сортировки и машиниста не повторяется.'],
  });
  const operations=['Снятие покрытия пола','Сортировка и штабелирование','Уборка и перемещение по норме',
    'Дополнительное обращение с отходами'];
  return {...definition,parameters:definition.parameters.map(parameter=>({...parameter,truth_metadata:{
    ...parameter.truth_metadata,source_confirmation_required:false,
    provenance:{consumer_input_role_v1:'OBJECT_FACT'},
  }})),resources:definition.resources.map(resource=>{
    const included=resource.resource_graph.costTreatment==='INCLUDED_IN_RESOURCE_ROWS';
    const owner=resource.row_id===`${prefix}:operator`?machineId
      :resource.row_id===`${prefix}:operator-hired`?`${prefix}:machine-hired`:laborId;
    const service=resource.category==='service';
    const {row_sha256:_oldHash,...content}=resource;
    const result={...content,cost_owner_id:included?owner:resource.cost_owner_id,
      resource_graph:{...resource.resource_graph,
        ...(included?{includedInResourceOwnerRowId:owner,parentCostOwnerId:owner}:{}),
        operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix,
          groupTitleRu:type.titleRu,operationId:`${prefix}:operation:${operations.indexOf(resource.section)}`,
          operationTitleRu:resource.section,completionCriterionRu:resource.section,
          processOrdinal:10*(operations.indexOf(resource.section)+1)},
        publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',
          sourceTitleRu:resource.title_ru,nameRu:resource.title_ru,brandAndModelRu:null,specificationRu:null,
          detailsRu:[service?'Применение: подтверждённая дополнительная услуга вне включённых перемещений КРЕР; цена за тонну по её составу.'
            :`Применение: ${type.confirmedMaterialRu}, ${type.column}; норма на100м².`,
            ...(resource.row_id===laborId?[`Норма труда: ${type.workers.hoursPer100m2}чел.-ч на100м²; ресурс${type.workers.resourceCode}.`]:[]),
            ...(resource.row_id===machineId&&type.machine?[`Норма механизма: ${type.machine.hoursPer100m2}маш.-ч на100м²; ресурс${type.machine.resourceCode}.`]:[])]},
      },source_metadata:{...resource.source_metadata,...(service?{normativeTrace:[],sourceRole:'PROJECT_DEFINED_SERVICE_SCOPE_REQUIRES_CONFIRMED_SPECIFICATION',
        no_published_productivity_or_quantity_norm:true}:{sourceRole:'OFFICIAL_NORM',
        normativeTrace:((resource.source_metadata?.normativeTrace??[]) as Record<string,unknown>[]).map(trace=>({...trace,
          sourceRole:'OFFICIAL_NORM',exact_locator:FLOOR_DEMOLITION_SOURCE_METADATA_S2752.exact_locator}))}),
        exact_column:type.column,source_artifact_sha256:pack.source.sha256},
    };
    return {...result,row_sha256:estimateDeterministicHash(result)};
  })};
}

export function floorDemolitionControlInputS2752(index:number,area=35.5) {
  const type=pack.types[index]; if(!type) throw new Error('FLOOR_DEMOLITION_TYPE_OUTSIDE_VERIFIED_SERIES');
  return {floor_covering_area_m2:area,existing_covering_confirmed:type.confirmedMaterialRu,
    object_conditions:pack.normalConditionValue,waste_handling_mode:pack.retainModeValue,
    ...(type.machine?{mechanism_fulfillment:'Механизм предоставлен исполнителем; оплачивается эксплуатация по смете'}:{})};
}

export async function compileFloorDemolitionS2752(index:number,input:Record<string,unknown>) {
  const type=pack.types[index]; if(!type) throw new Error('FLOOR_DEMOLITION_TYPE_OUTSIDE_VERIFIED_SERIES');
  return compileAutomaticConstructionOwnerR1({catalogId:type.catalogId,compilerVersion:pack.contract,
    primaryMeasureParameterId:'floor_covering_area_m2',definition:floorDemolitionDefinitionS2752(index),submittedParameters:input});
}
