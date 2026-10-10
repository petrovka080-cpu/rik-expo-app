import type column01Pack from '../../../../data/estimate-benchmarks/source-packs/incandescent-vl-luminaire-krer33-04-014-01-s27-58.json';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticOwnerDefinition,type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1,effectiveResourceQuantityParameterId} from './effectivePurchaseBalanceR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

export type VlLuminairePackR1=Omit<typeof column01Pack,'sourceAdmission'|'fixedRates'> & {sourceAdmission:Record<string,string>;fixedRates:Record<string,string>};
export type VlLuminaireMachineR1={id:string;parameterId:string;parameterTitle:string;rate:string;sourceTitle:string;ownTitle:string;hiredTitle:string;ownValue:string;hiredValue:string;operationTitle:string;details:string;guide:string;operatorCostOwnership:string;ownershipSourceKey:string};
export type VlLuminaireOwnerOptionsR1={pack:VlLuminairePackR1;prefix:string;column:string;verifiedAt:string;orderConversionError:string;labour:{title:string;rate:string;includedOperationDetails:string};machines:readonly VlLuminaireMachineR1[];
  extraFacts?:readonly {parameter:AutomaticParameterSpec;guide:string}[];operatorAggregate?:{id:string;title:string;rate:string;details:string};readySupportGuide:string;accessGuide:string;supplyGuide:string};

// Source-specific definitions share the admitted owner and balance helpers;
// canonical parsing, calculation, ownership and persistence stay in the core.
export function buildVlLuminaireDefinitionR1(options:VlLuminaireOwnerOptionsR1):AutomaticOwnerDefinition{
  const {pack,prefix}=options;
  const facts=['construction_scope_conditions','ready_support_connection_reference','pole_attachment_height_m','access_method_reference',...(options.extraFacts??[]).map(x=>x.parameter.id)];
  const conditional:AutomaticParameterSpec[]=[
    {id:facts[0],title:'Фактические условия строительства',valueType:'enum',unitId:null,kind:'conditional',values:[pack.scopeValueRu]},
    {id:facts[1],title:'Проект готовой опоры, крепления и подключения светильника',valueType:'text',unitId:null,kind:'conditional'},
    {id:facts[2],title:'Фактическая высота места крепления над рабочей площадкой',valueType:'decimal',unitId:'m',kind:'conditional',min:0.000000001},
    {id:facts[3],title:'Фактический способ безопасного доступа к месту крепления',valueType:'text',unitId:null,kind:'conditional'},
    ...(options.extraFacts??[]).map(x=>x.parameter),
    ...options.machines.map(m=>({id:m.parameterId,title:m.parameterTitle,valueType:'enum' as const,unitId:null,kind:'conditional' as const,values:[m.ownValue,m.hiredValue]})),
    {id:'project_material_supply_scope',title:'Фактический состав и раздельная оплата пяти проектных позиций',valueType:'enum',unitId:null,kind:'conditional',values:[pack.projectSupplyScopeRu]},
  ];
  const rows:AutomaticRowSpec[]=[];
  const add=(id:string,title:string,category:string,unitId:string,expression:string,extra:Partial<AutomaticRowSpec>={})=>rows.push({
    rowId:prefix+':'+id,formulaId:prefix+':formula:'+id,section:pack.titleRu,category,title,unitId,expression,procurement:false,inputParameterIds:facts,...extra});
  const positive=(unitId:string)=>({schemaVersion:'canonical_formula_output_bounds_v1' as const,unitId,exclusiveMinimum:0,reasonRu:'Применимый ресурс требует положительного подтверждённого количества.'});
  add('whole-labor',options.labour.title,'labor','man_hour','luminaire_count*'+options.labour.rate,{formulaOutputBounds:positive('man_hour')});
  if(options.operatorAggregate)add(options.operatorAggregate.id,options.operatorAggregate.title,'labor','man_hour','luminaire_count*'+options.operatorAggregate.rate,{costTreatment:'INFORMATIONAL_SCOPE',formulaOutputBounds:positive('man_hour')});
  for(const machine of options.machines){
    const effective=effectiveResourceQuantityParameterId(prefix+':'+machine.id+'-consumed');
    add(machine.id+'-consumed',machine.sourceTitle,'equipment','machine_hour','luminaire_count*'+machine.rate,{costTreatment:'INFORMATIONAL_SCOPE',formulaOutputBounds:positive('machine_hour'),effectiveQuantityOutput:{parameterId:effective,unitId:'machine_hour'}});
    for(const [mode,value,title] of [['own',machine.ownValue,machine.ownTitle],['hired',machine.hiredValue,machine.hiredTitle]] as const)
      add(machine.id+'-'+mode,title,'equipment','machine_hour',effective,{procurement:mode==='hired',inclusion:{kind:'equals',parameterId:machine.parameterId,value},formulaOutputBounds:positive('machine_hour')});
  }
  for(const m of pack.materials){
    const quantityId=m.id+'_project_total',projectSpecId=m.id+'_project_specification';
    if(m.projectDefined)conditional.push(
      {id:quantityId,title:'Итог по проектной ведомости: '+m.nameRu,valueType:m.sourceUnitId==='pcs'?'integer':'decimal',unitId:m.sourceUnitId,kind:'conditional',min:m.sourceUnitId==='pcs'?1:0.000000001,
        ...(m.sourceUnitId==='pcs'?{numericPeerConstraints:{equalToParameter:'luminaire_count'}}:{})},
      {id:projectSpecId,title:'Проектная спецификация и документ: '+m.nameRu,valueType:'text',unitId:null,kind:'conditional'});
    conditional.push({id:m.id+'_supply_specification',title:'Фактическая поставочная спецификация: '+m.nameRu,valueType:'text',unitId:null,kind:'conditional'},
      {id:m.id+'_stock_compatibility_reference',title:'Пригодность имеющегося материала: '+m.nameRu,valueType:'text',unitId:null,kind:'conditional',requiredWhen:{kind:'greater_than',parameterId:m.id+'_stock',value:0}});
    for(const [suffix,title,min] of [['stock','Пригодное наличие',0],['reserve','Сохраняемый резерв',0],['quantum','Кратность фактической поставки',0.000000001]] as const)
      conditional.push({id:m.id+'_'+suffix,title:title+': '+m.nameRu,valueType:m.orderUnitId==='pcs'?'integer':'decimal',unitId:m.orderUnitId,kind:'conditional',min:m.orderUnitId==='pcs'&&suffix==='quantum'?1:min});
    const physicalInputs=[...facts,...(m.projectDefined?[quantityId,projectSpecId]:[])];
    const effectivePhysical=effectiveResourceQuantityParameterId(prefix+':'+m.id+'-consumed');
    const orderConsumed=m.sourceUnitId==='t'&&m.orderUnitId==='kg'?effectivePhysical+'*1000':effectivePhysical;
    if(m.sourceUnitId!==m.orderUnitId&&!(m.sourceUnitId==='t'&&m.orderUnitId==='kg'))throw Error(options.orderConversionError);
    add(m.id+'-consumed',(m.projectDefined?'Проектный итог: ':'Нормативный расход: ')+m.nameRu,'material',m.sourceUnitId,m.expression,
      {inputParameterIds:physicalInputs,costTreatment:'INFORMATIONAL_SCOPE',purchaseBalanceOwnerRowId:prefix+':'+m.id,formulaOutputBounds:positive(m.sourceUnitId),effectiveQuantityOutput:{parameterId:effectivePhysical,unitId:m.sourceUnitId}});
    const balance=effectivePurchaseBalanceExpressionsR1({ownerRowId:prefix+':'+m.id,orderUnitId:m.orderUnitId,consumed:orderConsumed,stock:m.id+'_stock',reserve:m.id+'_reserve',quantum:m.id+'_quantum'});
    add(m.id,m.nameRu,'material',m.orderUnitId,`ceil(max(0,(${orderConsumed})+${m.id}_reserve-${m.id}_stock)/${m.id}_quantum)*${m.id}_quantum`,
      {...balance.owner,procurement:true,inputParameterIds:[...physicalInputs,...(m.projectDefined?['project_material_supply_scope']:[]),m.id+'_supply_specification',m.id+'_stock_compatibility_reference'],titleParameterIds:[m.id+'_supply_specification']});
  }
  for(const operation of pack.operations)add(operation.id,operation.nameRu,'work','pcs','luminaire_count',{costTreatment:'INCLUDED_IN_RESOURCE_ROWS'});
  for(const gap of pack.gaps){const id='open_scope_qty_'+gap.id.replaceAll('-','_');conditional.push({id,title:gap.nameRu,valueType:'decimal',unitId:null,kind:'conditional',min:0});add(gap.id,gap.nameRu,gap.category,'',id);}
  const original=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:prefix,sourceId:pack.sourceId,normId:pack.normId,
    sourceMetadata:{source_title:pack.titleRu,source_document_version:pack.source.edition,definition_hash:pack.source.sha256,artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu},
    applicabilityRu:pack.scopeRu,ordinary:[{id:'luminaire_count',title:'Количество устанавливаемых светильников',valueType:'integer',unitId:'pcs',kind:'ordinary',min:1}],profile:[],conditional,rows,
    deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.excludedRu});
  return {...original,parameters:original.parameters.map(p=>{
    const id=p.parameter_id,guide=p.truth_metadata.guide as Record<string,unknown>,m=pack.materials.find(x=>id.startsWith(x.id+'_'));
    if(id.startsWith('open_scope_qty_'))return {...p,truth_metadata:unresolvedApplicationNormTruthR1(p.truth_metadata,'Источник не устанавливает применимость, количество и владельца отдельной цены. Это потребность приложения, а не поле для ручного ввода нормы.')};
    if(p.truth_metadata.visibility_role==='INTERNAL_ONLY')return p;
    const project=m?.projectDefined&&(id===m.id+'_project_total'||id===m.id+'_project_specification');
    const required=id==='luminaire_count'||facts.includes(id)||id==='project_material_supply_scope'||project===true||id.endsWith('_supply_specification');
    const text=options.extraFacts?.find(x=>x.parameter.id===id)?.guide??(id===facts[1]?options.readySupportGuide:
      id===facts[2]?'Укажите фактическую высоту точки крепления. Норма не задаёт универсальной высоты безопасного доступа; дополнительное оснащение остаётся открытой потребностью.':
      id===facts[3]?options.accessGuide:
      options.machines.some(x=>x.parameterId===id)?options.machines.find(x=>x.parameterId===id)!.guide:
      id==='project_material_supply_scope'?options.supplyGuide:
      project?m!.identityGuideRu:
      id.endsWith('_stock_compatibility_reference')?'При положительном наличии укажите документ/проверку соответствия точной выбранной позиции, полноты комплекта и пригодности. Чужой или непригодный остаток не вычитается.':
      id.endsWith('_supply_specification')?m!.identityGuideRu+' Укажите фактически отдельно поставляемую позицию, состав и единицу заказа '+m!.orderUnitId+'. Включённые в другую поставку компоненты нельзя заказывать повторно.':
      m?'Введите фактическое значение в указанной единице '+m.orderUnitId+' по точной поставочной позиции; нормы расхода приложение рассчитывает самостоятельно.':guide.guide_short_ru);
    return {...p,required,truth_metadata:{...p.truth_metadata,value_source_role:id==='luminaire_count'?'USER_INPUT':id.endsWith('_stock_compatibility_reference')?'CONDITIONAL_PROJECT_FACT':'PROJECT_SPECIFIC_INPUT',source_confirmation_required:false,
      ...(p.constraints_json?.requiredWhen?{required_when:p.constraints_json.requiredWhen}:{}),provenance:{consumer_input_role_v1:id==='luminaire_count'?'OBJECT_GEOMETRY':'OBJECT_FACT'},
      guide:{...guide,guide_short_ru:text,verified_at:options.verifiedAt,...(project?{source_role:'PROJECT_DOCUMENTATION',source_document:'Фактическая проектная ведомость выбранного объёма',source_locator:'Номер/лист/позиция документа указывается в проектной спецификации',quantity_origin:'DOCUMENTED_PROJECT_TOTAL_NOT_PER_LUMINAIRE_NORM'}:{})}}};
  }),resources:original.resources.map(r=>{
    const key=r.row_id.slice(prefix.length+1),m=pack.materials.find(x=>key===x.id||key===x.id+'-consumed'),gap=pack.gaps.find(g=>g.id===key),operation=pack.operations.find(o=>o.id===key);
    const project=m?.projectDefined===true,order=!!m&&key===m.id,included=!!operation,machine=options.machines.find(x=>key.startsWith(x.id+'-')),aggregate=options.operatorAggregate?.id===key?options.operatorAggregate:null,{row_sha256:_hash,...body}=r;
    const normTrace=gap||project?[]:((r.source_metadata?.normativeTrace??[]) as Record<string,unknown>[]).map(t=>({...t,sourceRole:'OFFICIAL_NORM'}));
    const updated={...body,cost_owner_id:included?prefix+':whole-labor':r.cost_owner_id,resource_graph:{...r.resource_graph,
      ...(included?{parentCostOwnerId:prefix+':whole-labor',includedInResourceOwnerRowId:prefix+':whole-labor'}:{}),
      ...(machine?{physicalNormOwnerRowId:prefix+':'+machine.id+'-consumed',operatorCostOwnership:machine.operatorCostOwnership}:{}),
      ...(project?{projectQuantityProvenanceV1:{contractVersion:'canonical-project-quantity-provenance/v1',quantityOrigin:'DOCUMENTED_PROJECT_TOTAL_NOT_OFFICIAL_NUMERIC_NORM',printedQuantityCell:'П',projectQuantityParameterId:m!.id+'_project_total',projectSpecificationParameterId:m!.id+'_project_specification',normProvidesResourceIdentityAndUnitOnly:true}}:{}),
      operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix,groupTitleRu:pack.titleRu,operationId:prefix+':operation:'+(gap?gap.id:machine?machine.id:aggregate?aggregate.id:'installation'),
        operationTitleRu:gap?.nameRu??machine?.operationTitle??aggregate?.title??'Установка и присоединение светильника',processOrdinal:gap?40:10,completionCriterionRu:gap?'Определены применимость, количество и включение в стоимость.':'Выполнена точная операция колонки'+options.column+'.'},
      publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,brandAndModelRu:null,specificationRu:m?.nameRu??null,
        detailsRu:gap?['Потребность не завершена: применимость, единица, количество и владелец цены требуют источника.']:[pack.scopeRu,
          ...(project?['Конкретное количество — документированный итог проектной ведомости; в КРЕР указан ресурс/единица и ненумерическая ячейка П, числовой нормы на светильник нет.']:[]),
          ...(m?.id==='solvent_gasoline'?['Норма0,00006т на светильник; перевод заказа в кг строго×1000, без литров и плотности.']:[]),
          ...(machine?[machine.details]:[]),
          ...(aggregate?[aggregate.details]:[]),
          ...(included?[options.labour.includedOperationDetails]:[])]}},
      source_metadata:{...r.source_metadata,normativeTrace:normTrace,sourceRole:gap?'UNRESOLVED_INSTALLATION_SOURCE':order?'DERIVED_PURCHASE_BALANCE':project?'DOCUMENTED_PROJECT_QUANTITY':'OFFICIAL_NORM',
        ...(project?{quantityOrigin:'DOCUMENTED_PROJECT_TOTAL_NOT_OFFICIAL_NUMERIC_NORM',printedQuantityCell:'П',projectQuantityParameterId:m!.id+'_project_total',projectSpecificationParameterId:m!.id+'_project_specification',
          compositionSourceTrace:[{sourceId:pack.sourceId,normId:pack.normId,sourceRole:'OFFICIAL_RESOURCE_IDENTITY_AND_UNIT_ONLY',exactLocator:pack.source.locatorRu,artifactSha256:pack.source.sha256}]}:{}),
        official_url:pack.source.officialUrl,source_artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu,exact_column:options.column,sourceMeasure:'ONE_INSTALLED_LUMINAIRE',
        ...(machine?{[machine.ownershipSourceKey]:pack.guidance}:{}),
        ...(aggregate?{operatorPriceOwnershipSource:pack.guidance,aggregateOperatorQuantityNotAllocatedToSingleParent:true}:{}),
        quantityUnitUnconfirmed:!!gap,full_technical_acceptance:false,sourceAdmission:pack.sourceAdmission}};
    return {...updated,row_sha256:estimateDeterministicHash(updated)};
  })};
}
