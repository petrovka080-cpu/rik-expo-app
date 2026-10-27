import pack from '../../../../data/estimate-benchmarks/source-packs/prepared-cartridge-finishes-s27-54.json';
import {buildAutomaticConstructionOwnerR1,compileAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,
  type AutomaticOwnerDefinition,type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {unopenedCartridgeSupplyRowsR1} from './unopenedCartridgeSupplyR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

export const preparedCartridgePackS2754=pack;
export const preparedCartridgePrefixS2754=(index:number)=>`cartridge:${pack.types[index]?.key??'INVALID'}`;
export function preparedCartridgeDefinitionS2754(index:number):AutomaticOwnerDefinition {
  const type=pack.types[index];if(!type)throw Error('EXACT_PREPARED_CARTRIDGE_TYPE_REQUIRED');
  const prefix=preparedCartridgePrefixS2754(index),facts=['product_confirmed','ready_scope_confirmed','conditions_confirmed','method_confirmed',
    'supplied_product_reference','ready_node_reference','application_plan_reference'];
  const conditional:AutomaticParameterSpec[]=[
    ...[type.productValue,type.readyValue,type.conditionsValue,type.methodValue].map((value,i)=>({id:facts[i],
      title:['Поставленный продукт и только невскрытое пригодное наличие','Точная готовая основа выбранной работы','Условия нанесения выбранного продукта','Принятый способ нанесения и защиты'][i],
      valueType:'enum' as const,unitId:null,kind:'conditional' as const,values:[value]})),
    {id:facts[4],title:'Ссылка на поставленную версию, партию, упаковку и подтверждённое пригодное наличие',valueType:'text',unitId:null,kind:'conditional'},
    {id:facts[5],title:'Ссылка на уже принятый готовый узел; работы подготовки и его материалы учтены отдельно',valueType:'text',unitId:null,kind:'conditional'},
    {id:facts[6],title:'Ссылка на общий план расходования, вскрытия и нанесения; ориентир расхода не гарантирует достаточность',valueType:'text',unitId:null,kind:'conditional'},
    {id:'planned_use_ml',title:'Принятый общий план расходования материала, включая действия выбранного метода, мл',valueType:'decimal',unitId:'ml',kind:'conditional',min:0.001},
    {id:'planned_open_cartridges',title:'Принятое количество картриджей, вскрываемых для этой работы',valueType:'integer',unitId:'pcs',kind:'conditional',min:1},
    {id:'unopened_stock_cartridges',title:'Пригодное наличие целых невскрытых картриджей выбранного продукта',valueType:'integer',unitId:'pcs',kind:'conditional',min:0},
    {id:'unopened_reserve_cartridges',title:'Сохраняемый резерв целых невскрытых картриджей',valueType:'integer',unitId:'pcs',kind:'conditional',min:0},
    {id:'supplier_cartridge_multiple',title:'Фактическая кратность поставщика в картриджах выбранного объёма',valueType:'integer',unitId:'pcs',kind:'conditional',min:1},
  ];
  if(type.selectedReferenceRate)conditional.push({id:'reference_rate_ml_per_m',title:'Принятый ориентир Forbo 232 в диапазоне 20–40 мл/м, без значения по умолчанию',
    valueType:'decimal',unitId:'ml',kind:'conditional',min:20,max:40});
  const rows:AutomaticRowSpec[]=[...unopenedCartridgeSupplyRowsR1({prefix,productNameRu:type.productNameRu,capacityMl:type.capacityMl,inputParameterIds:facts})];
  const add=(id:string,title:string,operation:string,category:string,unitId:string,expression:string,extra:Partial<AutomaticRowSpec>={})=>rows.push({
    rowId:`${prefix}:${id}`,formulaId:`${prefix}:formula:${id}`,section:operation,category,title,unitId,expression,procurement:false,inputParameterIds:facts,...extra});
  const info={costTreatment:'INFORMATIONAL_SCOPE' as const};
  add('reference-use','Ориентировочный расход по выбранному источнику — не гарантированная потребность','application','material','ml',
    `work_length_m*${type.selectedReferenceRate?'reference_rate_ml_per_m':type.referenceRateMlM}`,info);
  add('planned-use','Принятый общий расход материала по методу объекта — без второй цены','application','material','ml','planned_use_ml',info);
  for(const gap of type.sourceNeeds){const id=`open_qty_${gap.id.replaceAll('-','_')}`;
    conditional.push({id,title:gap.nameRu,valueType:'decimal',unitId:gap.unitId,kind:'conditional',min:0});add(gap.id,gap.nameRu,gap.operation,gap.category,gap.unitId,id);}
  const built=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:prefix,sourceId:type.sourceId,normId:type.normId,
    sourceMetadata:{source_title:type.productNameRu,source_document_version:type.source.edition,definition_hash:type.source.sha256,
      artifact_sha256:type.source.sha256,exact_locator:type.source.locatorRu},applicabilityRu:type.scopeRu,
    ordinary:[{id:'work_length_m',title:'Принятая длина выбранного готового участка работы',valueType:'decimal',unitId:'linear_m',kind:'ordinary',min:0.001}],
    profile:[],conditional,rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:type.excludedRu});
  const required=new Set(facts),operations:Record<string,[string,number]>={masking:['Маскирование смежных поверхностей',5],opening:['Поставка и план вскрытия картриджей',10],
    application:['Нанесение выбранного материала',20],finishing:['Заглаживание силиконового шва',30],cleaning:['Очистка инструмента и свежих излишков',40],
    protection:['Защита и условия твердения',50],completion:['Доставка, тара и остатки',60]};
  return {...built,parameters:built.parameters.map(p=>({...p,required:p.required||required.has(p.parameter_id),
    truth_metadata:p.parameter_id.startsWith('open_qty_')?unresolvedApplicationNormTruthR1(p.truth_metadata,'Количество, часы, точная оснастка или владелец цены требуют источника/задания; не подменять пользовательским числом.'):
      {...p.truth_metadata,source_confirmation_required:false}})),resources:built.resources.map(resource=>{
      const id=resource.row_id.slice(prefix.length+1),gap=type.sourceNeeds.find(g=>g.id===id),operation=gap?.operation??(/reference|planned-use/.test(id)?'application':'opening');
      // The source assigns these actions to the same unresolved owner.
      // Reuse its ID; do not create another labour/tool quantity or price.
      const related=id==='labor'?(index===0?['masking','finishing','cleaning']:['cleaning']):id==='tools'&&index===0?['finishing']:[];
      const details=gap?[gap.reasonRu]:[
        'Применение: только выбранная работа по уже принятому готовому узлу. Его подготовка и ранее поставленные материалы повторно не оплачиваются.',
        'План расходования и число вскрываемых картриджей заданы явно. Остаток целых невскрытых картриджей отделён от неиспользованного вскрытого объёма; пригодность последнего не назначена автоматически.',
        'Ориентир изготовителя не является гарантированным расходом. Фактическая кратность заказа задаётся поставщиком; одна товарная строка имеет одного владельца цены.'
      ];
      const {row_sha256:_old,...content}=resource,result={...content,resource_graph:{...resource.resource_graph,
        operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix,groupTitleRu:type.titleRu,operationId:`${prefix}:${operation}`,
          operationTitleRu:operations[operation][0],processOrdinal:operations[operation][1],completionCriterionRu:'Приняты готовый узел, поставленная версия, план нанесения и условия; ранее выполненные действия не оплачиваются повторно.',
          ...(related.length?{additionalOperations:related.map(stage=>({operationId:`${prefix}:${stage}`,operationTitleRu:operations[stage][0],
            processOrdinal:operations[stage][1],completionCriterionRu:'Тот же ресурс обеспечивает указанный этап; количество и цена остаются у одного владельца.'}))}:{})},
        publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:resource.title_ru,nameRu:resource.title_ru,
          brandAndModelRu:gap?null:type.brandRu,specificationRu:gap?null:type.specificationRu,detailsRu:details}},
        source_metadata:{...resource.source_metadata,normativeTrace:[],official_url:type.source.officialUrl,source_artifact_sha256:type.source.sha256,exact_locator:type.source.locatorRu,
          sourceRole:gap?'UNRESOLVED_INSTALLATION_QUANTITY':'EXACT_PRODUCT_PACKAGING_AND_CONFIRMED_PROJECT_OPENING_PLAN',approximateReferenceNotGuarantee:true,
          stockLedgerContainsUnopenedOnly:true,openedRemainderNotReturnedToStock:true,openedRemainderNotAutomaticallyWaste:true,readyNodeAlreadyAccepted:true,
          supplierShippingBoxNotAssumedAsOrderQuantum:true,full_technical_acceptance:false}};
      return {...result,row_sha256:estimateDeterministicHash(result)};
    })};
}
export function compilePreparedCartridgeS2754(index:number,input:Record<string,unknown>){return compileAutomaticConstructionOwnerR1({catalogId:pack.types[index].catalogId,
  compilerVersion:pack.contract,primaryMeasureParameterId:'work_length_m',definition:preparedCartridgeDefinitionS2754(index),submittedParameters:input});}
export function preparedCartridgeCompletenessMapS2754(index:number){const type=pack.types[index],prefix=preparedCartridgePrefixS2754(index);return {
  contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'PRODUCT_SYSTEM_TDS',generatedFromCurrentRows:false,operationResourceBindingRequired:true,evidenceSha256:type.source.sha256,
  evidenceReferences:[type.source.officialUrl,type.source.locatorRu],entries:[
    {expectedResourceId:'cartridge',operationId:'opening',requiredOperationIds:[`${prefix}:opening`],category:'material',specification:type.productNameRu,condition:'CONFIRMED_READY_NODE_AND_PROJECT_OPENING_PLAN',
      sourceId:type.sourceId,unitId:'pcs',quantityRule:'PROJECT_OPENED_CARTRIDGES_PLUS_UNOPENED_RESERVE_MINUS_UNOPENED_STOCK',formulaId:`${prefix}:formula:cartridge-order`,resolution:{kind:'ROW',rowId:`${prefix}:cartridge-order`}},
    ...type.sourceNeeds.map(gap=>({expectedResourceId:gap.id,operationId:gap.operation,
      requiredOperationIds:[gap.operation,...(gap.id==='labor'?(index===0?['masking','finishing','cleaning']:['cleaning']):gap.id==='tools'&&index===0?['finishing']:[])].map(stage=>`${prefix}:${stage}`),
      category:gap.category,specification:gap.nameRu,condition:'OPEN_APPLICABLE_SOURCE_OR_TASK_SCOPE',
      sourceId:type.sourceId,unitId:gap.unitId,quantityRule:'OPEN_NO_ASSUMED_QUANTITY',formulaId:`${prefix}:formula:${gap.id}`,resolution:{kind:'ROW',rowId:`${prefix}:${gap.id}`}}))
  ]};}
