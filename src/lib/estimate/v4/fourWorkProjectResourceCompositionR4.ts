import matrix from '../../../../data/estimate-benchmarks/source-packs/four-work-project-resource-composition-r4.json';
import {appendProjectSubworkResourceScheduleR1,type ProjectSubworkResourcePositionR1,type ProjectSubworkResourceScheduleR1} from './projectSubworkResourceScheduleR1';
import type {AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {applyBrickPartitionNeedsScopeR1} from './brickPartitionNeedsScopeR1';
import {canonicalEstimateOperationReferences,type CanonicalEstimateOperationReference} from '../backendPlatform/canonicalEstimateOperationComposition';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

export type FourWorkResourceKeyR4='brick'|'ceramic'|'kerb'|'sand';
type Configuration={prefix:string;measure:string;owner:string;main:string;
 operations:readonly [string,string][]; scope:Readonly<Record<string,{title:string;reason:string}>>;
 resourceOperations?:Readonly<Record<string,string>>; replacements?:Readonly<Record<string,readonly string[]>>};
const configuration:Record<FourWorkResourceKeyR4,Configuration>={
 brick:{prefix:'masonry:brick-partition:krer08-02-002-05',measure:'net_partition_area_m2',owner:'whole-labor',main:'masonry',
  operations:[['external-logistics','Доставить материалы'],['base-and-dpc','Подготовить опору'],['access-boundary','Обеспечить доступ к кладке'],
   ['tools-ppe','Подготовить инструмент и средства защиты'],['connections-lintels','Выполнить примыкания и перемычки'],['masonry','Выложить кирпичную перегородку'],
   ['curing-protection','Выдержать и защитить кладку'],['quality-control','Проверить перегородку'],['cleanup-waste','Убрать место работ']],scope:{},
 },
 ceramic:{prefix:'ceramic-floor:cement-mortar:krer11-01-027-03',measure:'net_ceramic_floor_area_m2',owner:'whole-labor',main:'installation',
  operations:[['base-preparation','Подготовить основание'],['forklift5t','Подать материалы погрузчиком'],['hoist500kg45m','Поднять материалы подъёмником'],
   ['truck5t','Перевезти материалы по объекту'],['lay-tiles','Уложить плитку на раствор М150'],['jointing','Заполнить швы'],['curing-cleaning','Выдержать и очистить покрытие']],
  scope:{'skirting':{title:'Плинтус по проекту',reason:'При необходимости добавьте совместимую работу по устройству плинтуса с её материалами. Основной пол эту стоимость не закрывает.'},
   'deformation-junctions':{title:'Примыкания и деформационные швы',reason:'Состав и длины определяются узлами проекта. Дополнительная работа и материалы учитываются отдельно от обычных швов плитки.'},
   'hand-tools-ppe':{title:'Инструмент и средства защиты',reason:'Проверьте конкретные позиции обеспечения и их включение в цену.'},
   'extra-protection-control':{title:'Защитить готовое покрытие',reason:'Дополнительные укрытия и ограждение учитываются при необходимости сверх обычного ухода.'},
   'acceptance-testing':{title:'Проверить готовый пол',reason:'Обычный контроль выполняется в процессе. Отдельные испытания оплачиваются только по согласованной программе.'},
   'additional-logistics-waste':{title:'Доставка и отходы',reason:'Учитывайте только подтверждённые дополнительные перевозки и вывоз сверх включённого перемещения и очистки.'}},
  resourceOperations:{'ceramic-tile-consumed':'lay-tiles','ceramic-tile-order':'lay-tiles','ready-mortar-m150-consumed':'lay-tiles','ready-mortar-m150-order':'lay-tiles',
   'sawdust-consumed':'curing-cleaning','sawdust-order':'curing-cleaning','included-base-preparation':'base-preparation','included-tiles-bedding-joints':'lay-tiles',
   'included-curing':'curing-cleaning','included-cleaning-washing':'curing-cleaning'},
  replacements:{'hand-tools-ppe':['trowel','straightedge','level','tape-measure','mallet','bucket','grout-float','sponge','brush','gloves','goggles','tile-cutter','cutting-blade','knee-pads','dust-removal','dust-mask','extension-cord'],
   'extra-protection-control':['cover','barrier'],'acceptance-testing':['quality-test'],'additional-logistics-waste':['material-delivery','unloading','waste-bags','waste-transport']},
 },
 kerb:{prefix:'granite-kerb:1gp-cement-pavement',measure:'kerb_length_m',owner:'whole-labor',main:'installation',
  operations:[['foundation','Подготовить бетонное основание и опалубку'],['crane','Поднять материалы автокраном 10 т'],
   ['truck','Перевезти материалы по объекту'],['cleaning','Очистить гранитные борта']],
  scope:{'concrete-curing':{title:'Выдержать и защитить бетонное основание',reason:'Способ ухода определяет проект. Выбранный состав для ухода уже имеет свою позицию; повторная покупка исключается.'},
   'work-area-protection':{title:'Оградить зону работ',reason:'Ограждения и дорожные знаки выбираются по плану организации работ.'},
   'quality-control':{title:'Проверить линию и отметки борта',reason:'Дополнительная геодезическая услуга требуется только при отдельном задании сверх включённой установки.'},
   'cleanup-waste':{title:'Убрать и вывезти отходы',reason:'Учитывайте отходы площадки и опалубки сверх включённой очистки гранитных бортов.'},
   'additional-delivery':{title:'Дополнительная доставка материалов',reason:'Сначала проверьте включённые перевозки и разгрузку. Повторная оплата исключается.'},
   'tools-ppe':{title:'Инструмент и средства защиты',reason:'Конкретные позиции обеспечения проверяются с учётом имеющегося инструмента и состава основной цены.'}},
  resourceOperations:{'foundation-formwork-operation':'foundation','granite-cleaning-operation':'cleaning','concrete':'foundation','concrete-consumed':'foundation',
   'timber':'foundation','timber-consumed':'foundation','nails':'foundation','nails-consumed':'foundation'},
  replacements:{'work-area-protection':['barrier','traffic-signs'],'quality-control':['survey'],'cleanup-waste':['waste-bags','waste-transport'],
   'additional-delivery':['material-delivery','unloading'],'tools-ppe':['shovel','trowel','level','tape-measure','line','mallet','brush','gloves','goggles','cutting-machine','cutting-blade','lifting-clamp','dust-mask','hearing-protection']},
 },
 sand:{prefix:'floor-underlayer:sand:krer11-01-002-01',measure:'floor_sand_net_volume_m3',owner:'worker',main:'floor-underlayer',
  operations:[['base-planning','Выровнять основание'],['place-level','Уложить и разровнять песок'],['compaction','Увлажнить и уплотнить слой'],
   ['quality-control','Проверить толщину и ровность слоя'],['extra-mobilization','Доставить механизмы'],['external-delivery-unloading','Доставить материалы'],['cleanup-waste','Убрать место работ']],
  scope:{'open:external-delivery-unloading':{title:'Дополнительная доставка и разгрузка',reason:'Проверьте поставку песка и воды и работу погрузчика; повторная разгрузка не оплачивается.'},
   'open:extra-mobilization':{title:'Доставка механизмов и дополнительные платы',reason:'Минимальная смена и мобилизация учитываются только по условиям выбранного предложения сверх рассчитанных машино-часов.'},
   'open:quality-control':{title:'Проверить песчаный слой',reason:'Проектные испытания согласуются отдельно. Расчётное число измерений не означает оплаченный или выполненный контроль.'},
   'open:protection-tools':{title:'Инструмент и ограждение',reason:'Учитывайте имеющееся обеспечение и состав цены механизмов.'},
   'open:cleanup-waste':{title:'Убрать и вывезти отходы',reason:'Дополнительная уборка и вывоз учитываются по фактическому составу вне включённых работ.'}},
  resourceOperations:{'included:base-planning':'base-planning','included:place-level-compact':'place-level','equipment:pneumaticRammer':'compaction',
   'equipment:compressor':'compaction','equipment:forklift5t':'place-level','material:sand':'place-level','material:water':'compaction'},
  replacements:{'open:external-delivery-unloading':['material-delivery','water-delivery','unloading'],'open:extra-mobilization':['machine-delivery','machine-minimum'],
   'open:quality-control':['density-test'],'open:protection-tools':['shovel','level','tape-measure','straightedge','trolley','water-hose','air-hose','air-couplings','gloves','goggles','dust-mask','hearing-protection','barrier'],
   'open:cleanup-waste':['waste-bags','waste-transport']},
 },
};
const rehash=<T extends {row_sha256:string}>(row:T):T=>{const{row_sha256:_old,...body}=row;return {...body,row_sha256:estimateDeterministicHash(body)} as T;};

/** Overlay the actual retained definition; never recreate an older factory or
 * overwrite its transport, stock, normative quantity, unit or price owners. */
export function fourWorkProjectResourceCompositionR4(parent:AutomaticOwnerDefinition,key:FourWorkResourceKeyR4):AutomaticOwnerDefinition {
 const config=configuration[key],source=matrix.sources[key];
 if(matrix.contract!=='four-work-project-resource-composition/r4'||matrix.fullTechnicalAcceptance||matrix.universalConsumptionClaimed)
  throw Error('FOUR_RESOURCE_MATRIX_NOT_A_NORM');
 if(parent.resources.some(row=>row.row_id.startsWith('subwork-resource:'+key+'_r4:')))throw Error('FOUR_RESOURCE_ALREADY_APPLIED');
 const ownerId=config.prefix+':'+config.owner,owner=parent.resources.find(row=>row.row_id===ownerId);
 const trace=owner?.source_metadata?.normativeTrace;
 if(!owner||!Array.isArray(trace)||!trace.some(value=>value&&typeof value==='object'&&value.sourceId===source.sourceId
  &&value.normId===source.normId&&value.source_definition_hash===source.sha256)||owner.resource_graph.costTreatment!=='OWN_COST')
  throw Error('FOUR_RESOURCE_EXACT_RETAINED_PARENT_REQUIRED');
 if(!parent.parameters.some(row=>row.parameter_id===config.measure))throw Error('FOUR_RESOURCE_MEASURE_REQUIRED:'+config.measure);
 const original=key==='brick'?applyBrickPartitionNeedsScopeR1(parent):structuredClone(parent);
 const originalMain=canonicalEstimateOperationReferences(owner.resource_graph.operationCompositionV1)[0];
 if(!originalMain)throw Error('FOUR_RESOURCE_PARENT_SUBWORK_REQUIRED');
 const titles={brick:'Кирпичная перегородка в полкирпича, до 4 м',ceramic:'Керамический пол на растворе М150',kerb:'Гранитный борт 1ГП',sand:'Песчаная подстилка под пол'};
 const main={...originalMain,groupTitleRu:titles[key]};
 const operations=new Map<string,CanonicalEstimateOperationReference>();
 for(const row of original.resources)for(const operation of canonicalEstimateOperationReferences(row.resource_graph.operationCompositionV1)){
  const operationKey=operation.operationId.split(':').at(-1)!;
  operations.set(operationKey,{...operation,...(operation.groupId===config.prefix?{groupTitleRu:titles[key]}:{}),
   ...(config.scope[operationKey]?{operationTitleRu:config.scope[operationKey]!.title}:{})});
 }
 config.operations.forEach(([id,title],index)=>operations.set(id,{...main,operationId:config.prefix+':operation:'+id,operationTitleRu:title,processOrdinal:10+index*10,
  completionCriterionRu:'Подработа выполнена по проекту; количество общего труда не распределяется повторно.'}));
 const resources=original.resources.map(row=>{
  const suffix=row.row_id.startsWith(config.prefix+':')?row.row_id.slice(config.prefix.length+1):null;
  if(suffix==null)return row;
  const classification=config.scope[suffix],operationKey=config.resourceOperations?.[suffix]??(classification?suffix.replace(/^open:/u,''):undefined);
  const previousOperation=canonicalEstimateOperationReferences(row.resource_graph.operationCompositionV1)[0];
  const operation=operations.get(operationKey??previousOperation?.operationId.split(':').at(-1)??'');
  const graph={...row.resource_graph,...(operation?{operationCompositionV1:operation}:{})};
  const naming=(matrix.publicNames[key] as Record<string,{sourceTitleRu:string;nameRu:string;specificationRu:string|null;detailsRu?:string[];rowKind?:string}>)[row.row_id];
  if(naming){
   if(naming.sourceTitleRu!==row.title_ru)throw Error('FOUR_RESOURCE_PUBLIC_TITLE_SOURCE_CHANGED:'+row.row_id);
   Object.assign(graph,{publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',...naming,
    brandAndModelRu:null,detailsRu:naming.detailsRu??[]}});
  }
  if(classification){
   if(row.unit_id!==''&&key!=='sand')throw Error('FOUR_RESOURCE_CANNOT_RECLASSIFY_MEASURED_RESOURCE:'+row.row_id);
   const formula=parent.formulas.find(formula=>formula.formula_id===row.formula_id);
   if(!formula||!formula.input_parameter_ids.some(id=>parent.parameters.find(p=>p.parameter_id===id)?.truth_metadata?.value_source_role==='UNRESOLVED_APPLICATION_NORM'))
    throw Error('FOUR_RESOURCE_ONLY_UNRESOLVED_AGGREGATE_MAY_BE_CLASSIFIED:'+row.row_id);
   Object.assign(graph,{costTreatment:'INFORMATIONAL_SCOPE',publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',
    sourceTitleRu:classification.title,nameRu:classification.title,brandAndModelRu:null,specificationRu:null,detailsRu:[],rowKind:'PROCESS_NOTE'}});
  }
  return rehash({...row,resource_graph:graph,...(classification?{procurement_eligible:false,title_ru:classification.title}:{}),source_metadata:{...row.source_metadata,
   ...(classification?{originalAggregateSourceTitleRu:row.title_ru}:{}),
   resourceCompositionContract:matrix.contract,noNewNumericalNorm:true,full_technical_acceptance:false}});
 });
 const current={...original,resources};
 const positions=(matrix.positions[key] as readonly ProjectSubworkResourcePositionR1[]).map(position=>{
  if(key==='kerb'&&position.key==='curing-sprayer'){
   const curing=resources.find(row=>row.row_id.endsWith(':antisol250w-us'));
   if(!curing)throw Error('FOUR_RESOURCE_CURRENT_CURING_MATERIAL_REQUIRED');
   return {...position,active:curing.inclusion_ast as ProjectSubworkResourceScheduleR1['active']};
  }
  if(key==='sand'&&['air-hose','air-couplings'].includes(position.key))return {...position,
   includedInExistingOwners:[{rowId:config.prefix+':equipment:compressor',titleRu:'Работа компрессора'}]};
  return position;
 });
 const existingOperations=new Set(resources.flatMap(row=>canonicalEstimateOperationReferences(row.resource_graph.operationCompositionV1)).map(op=>op.operationId));
 const additionalOperations=[...operations.values()].filter(op=>!existingOperations.has(op.operationId));
 const result=appendProjectSubworkResourceScheduleR1(current,{key:key+'_r4',sourceSha256:source.sha256,sourceUrl:source.url,
  sourceId:source.sourceId,sourceLocatorRu:source.locatorRu,primaryParameterId:config.measure,
  active:{kind:'greater_than',parameterId:config.measure,value:0},includedOwnerRowId:ownerId,positions,additionalOperations,
  replacements:Object.fromEntries(Object.entries(config.replacements??{}).map(([id,keys])=>[config.prefix+':'+id,keys]))});
 if(result.parameters.length>256||result.resources.length>128)throw Error('FOUR_RESOURCE_EXISTING_READER_LIMIT');
 return result;
}

/** Only repair the display group of previously published R3 scope checks.
 * Their inclusion, quantities and owner/exclusion decisions stay exact. */
export function retainResourceScopeCheckGroupsR4(parent:AutomaticOwnerDefinition):AutomaticOwnerDefinition {
 let count=0;
 const resources=parent.resources.map(row=>{
  if(row.source_metadata?.sourceRole!=='PROJECT_RESOURCE_OWNER_SCOPE_CHECK')return row;
  const operation=canonicalEstimateOperationReferences(row.resource_graph.operationCompositionV1)[0];
  const scope=row.resource_graph.scopeRequirementV1 as Record<string,unknown>|undefined;
  if(!operation||scope?.contractVersion!=='canonical-scope-requirement/v1')throw Error('RETAINED_SCOPE_CHECK_REQUIRED');
  count++;return rehash({...row,resource_graph:{...row.resource_graph,scopeRequirementV1:{...scope,groupId:operation.groupId,groupTitleRu:operation.groupTitleRu}}});
 });
 if(!count)throw Error('RETAINED_RESOURCE_SCOPE_CHECK_MISSING');
 return {...parent,resources};
}
