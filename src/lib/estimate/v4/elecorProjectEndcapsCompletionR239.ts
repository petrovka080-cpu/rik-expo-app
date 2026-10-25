// SOURCE_ONLY. Same published ELECOR owner; no new work/catalog or installation norm.
import pack from '../../../../data/estimate-benchmarks/source-packs/elecor-project-endcaps-completion-r239.json';
import fixing from '../../../../data/estimate-benchmarks/source-packs/elecor-project-mechanical-fixings-completion-r1.json';
import {elecorMechanicalProjectFixingsDefinitionR1,elecorMechanicalProjectFixingsControlInputR1} from './elecorMechanicalProjectFixingsCompletionR1';
import {elecorSingleRouteActiveR1} from './elecorSingleRouteMaterialR1';
import {buildAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition,type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1} from './effectivePurchaseBalanceR1';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
import {canonicalEstimateOperationReference} from '../backendPlatform/canonicalEstimateOperationComposition';

export const elecorEndcapPackR239=pack;
export const elecorEndcapOwnerR239=pack.ownerRowId;
export const elecorEndcapRowIdR239=(suffix:string)=>pack.prefix+':'+suffix;
const positive={kind:'greater_than' as const,parameterId:'elecor_route_m',value:0};
const mechanical={kind:'equals' as const,parameterId:'elecor_fixing_method',value:fixing.method};
const selected={kind:'equals' as const,parameterId:pack.methodParameterId,value:pack.method};
const applicable={kind:'and' as const,operands:[positive,elecorSingleRouteActiveR1,mechanical]};
const active={kind:'and' as const,operands:[applicable,selected]};
const stock='elecor_endcap_stock_complete_sets',reserve='elecor_endcap_reserve_complete_sets';
const quantum='elecor_endcap_supplier_set_multiple',stockRef='elecor_endcap_stock_reference';
const reference='elecor_endcap_end_schedule_reference',acceptance='elecor_endcap_node_acceptance';
const opened=`ceil(${pack.countId}/4)`;
const existingEnvironment='elecor_fixing_installation_environment_acceptance';

export function elecorProjectEndcapsDefinitionR239(
  parent:AutomaticOwnerDefinition=elecorMechanicalProjectFixingsDefinitionR1(),
):AutomaticOwnerDefinition{
  if(pack.catalogId!=='canonical-work:master:electrical_elecor_60x40_white_single_straight_route_materials'
    ||pack.exactProduct.article!=='CKMP10D-Z-060-040-K01'
    ||pack.exactProduct.nominalWidthMm!==60||pack.exactProduct.nominalHeightMm!==40
    ||pack.exactProduct.pieceCountPerFactorySet!==4||pack.exactProduct.factoryOrderUnit!=='set'
    ||pack.exactProduct.individualPackageCount!==1||pack.exactProduct.individualPackageUnitRu!=='компл')
    throw Error('EXACT_ELECOR_KMZ_COMPLETE4_SOURCE_REQUIRED');
  if(parent.parameters.some(p=>p.parameter_id.startsWith('elecor_endcap_')||p.parameter_id===pack.methodParameterId)
    ||parent.formulas.some(f=>f.formula_id.startsWith(pack.prefix+':'))
    ||parent.resources.some(r=>r.row_id.startsWith(pack.prefix+':')))
    throw Error('EXISTING_ELECOR_END_NODE_IDENTITY_COLLISION_REVIEW_REQUIRED');
  const old=parent.resources.find(r=>r.row_id===pack.existingNeedRowId);
  const oldFormula=parent.formulas.find(f=>f.formula_id===old?.formula_id);
  const oldQuantity=parent.parameters.find(p=>p.parameter_id===pack.legacyQuantityParameterId);
  if(!old||old.unit_id!=='pcs'||old.category!=='material'
    ||old.resource_graph.costTreatment!=='OWN_COST'
    ||oldFormula?.expression_source!==pack.legacyQuantityParameterId
    ||oldQuantity?.truth_metadata.value_source_role!=='UNRESOLVED_APPLICATION_NORM')
    throw Error('EXACT_UNRESOLVED_ELECOR_END_NODE_PREIMAGE_REQUIRED');
  const oldOperation=canonicalEstimateOperationReference(old.resource_graph.operationCompositionV1);
  if(!oldOperation)throw Error('EXACT_EXISTING_ELECOR_OPERATION_OWNER_REQUIRED');
  const operation={operationId:'accepted-end-cap-material',operationTitleRu:'Обеспечение торцевыми заглушками',
    processOrdinal:35,completionCriterionRu:'Только комплектный материал по полной принятой ведомости концов; труд и остальные обязательства отдельно.'};
  const sharedNeedIds=['installation-labour','tools','access-protection','acceptance','delivery-handling','cleanup-disposal']
    .map(suffix=>'electrical:elecor-60x40-single-route:open-'+suffix);
  for(const id of sharedNeedIds)if(parent.resources.filter(r=>r.row_id===id).length!==1)
    throw Error('EXACT_EXISTING_ELECOR_SHARED_NEED_REQUIRED:'+id);
  const conditional:AutomaticParameterSpec[]=[
    {id:pack.methodParameterId,title:'Принятые концевые узлы этого прямого участка',kind:'conditional',
      valueType:'enum',unitId:null,values:[pack.unresolvedMethod,pack.method],requiredWhen:applicable},
    {id:acceptance,title:'Ведомость подтверждает все концы: только заглушки 60×40, без иных узлов',kind:'conditional',
      valueType:'enum',unitId:null,values:[pack.nodeAcceptance],requiredWhen:active},
    {id:reference,title:'Ведомость концов: документ, редакция, лист, строки и участок',kind:'conditional',
      valueType:'text',unitId:null,requiredWhen:active},
    {id:pack.countId,title:'Количество отдельных заглушек из принятой ведомости концов',kind:'conditional',
      valueType:'integer',unitId:'pcs',min:0,requiredWhen:active},
    {id:stock,title:'Пригодные полные заводские комплекты по 4 заглушки в наличии',kind:'conditional',
      valueType:'integer',unitId:'set',min:0,requiredWhen:active},
    {id:reserve,title:'Сохранить полных нераспечатанных комплектов по 4 заглушки',kind:'conditional',
      valueType:'integer',unitId:'set',min:0,requiredWhen:active},
    {id:quantum,title:'Фактическая кратность поставщика в полных комплектах по 4 заглушки',kind:'conditional',
      valueType:'integer',unitId:'set',min:1,requiredWhen:active},
    {id:stockRef,title:'Подтверждение пригодности полных совместимых комплектов в наличии',kind:'conditional',
      valueType:'text',unitId:null,requiredWhen:{kind:'and',operands:[active,{kind:'greater_than',parameterId:stock,value:0}]}},
  ];
  const facts=['elecor_route_m','elecor_route_scope','elecor_route_layout','elecor_route_document_reference',
    'elecor_fixing_method',existingEnvironment,pack.methodParameterId,acceptance,reference,stockRef];
  const balance=effectivePurchaseBalanceExpressionsR1({ownerRowId:pack.ownerRowId,orderUnitId:'set',
    consumed:opened,stock,reserve,quantum,manualQuantumViolationPolicy:'retain-raw-and-block-quantum'});
  const rows:AutomaticRowSpec[]=[];
  const add=(suffix:string,title:string,unitId:string,expression:string,extra:Partial<AutomaticRowSpec>={})=>{
    rows.push({rowId:elecorEndcapRowIdR239(suffix),section:'Торцевые заглушки по принятой ведомости',
      category:'material',title,unitId,formulaId:pack.prefix+':formula:'+suffix,expression,
      procurement:false,costTreatment:'INFORMATIONAL_SCOPE',inclusion:active,inputParameterIds:facts,...extra});
  };
  add('consumed-pieces','Торцевые заглушки 60×40 мм по принятой ведомости','pcs',pack.countId,
    {purchaseBalanceOwnerRowId:pack.ownerRowId});
  add('opened-sets','Полные комплекты по 4 заглушки, открываемые для принятой ведомости','set',opened,
    {purchaseBalanceOwnerRowId:pack.ownerRowId});
  add('order','Комплект торцевых заглушек 60×40 мм, 4 шт.','set',
    `ceil(max(0,(${opened})+${reserve}-${stock})/${quantum})*${quantum}`,
    {...balance.owner,procurement:true,costTreatment:'OWN_COST'});
  add('remaining-sets','Оставшиеся целые нераспечатанные комплекты заглушек','set',balance.remaining,
    {purchaseBalanceOwnerRowId:pack.ownerRowId});
  add('free-sets','Свободные целые комплекты после сохранения резерва','set',balance.free,
    {purchaseBalanceOwnerRowId:pack.ownerRowId});
  add('remaining-pieces-in-opened','Оставшиеся отдельные заглушки в открытых комплектах; не отходы','pcs',
    `(${opened})*4-${pack.countId}`,{purchaseBalanceOwnerRowId:pack.ownerRowId});
  add('consumption-shortage','Недостающие полные комплекты для принятой ведомости концов','set',balance.consumptionShortage,
    {purchaseBalanceOwnerRowId:pack.ownerRowId});
  add('reserve-deficit','Недостающие полные комплекты для сохранения резерва','set',balance.reserveDeficit,
    {purchaseBalanceOwnerRowId:pack.ownerRowId});
  // Temporary declarations validate the extension's references; the exact captured parent definitions are retained below.
  const parentIds=new Set(parent.parameters.map(p=>p.parameter_id));
  const parentFacts:AutomaticParameterSpec[]=['elecor_route_scope','elecor_route_layout','elecor_route_document_reference',
    'elecor_fixing_method',existingEnvironment].map(id=>{
    const p=parent.parameters.find(value=>value.parameter_id===id);
    if(!p||p.unit_id!==null||(p.value_type!=='enum'&&p.value_type!=='text'))
      throw Error('EXACT_ELECOR_END_NODE_PARENT_FACT_REQUIRED:'+id);
    if(p.value_type==='text')return{id,title:p.title_ru,valueType:'text',unitId:null,kind:'conditional',requiredWhen:positive};
    const values=p.constraints_json?.values;
    if(!Array.isArray(values)||!values.every((v:unknown):v is string=>typeof v==='string'))
      throw Error('EXACT_ELECOR_END_NODE_PARENT_ENUM_REQUIRED:'+id);
    return{id,title:p.title_ru,valueType:'enum',unitId:null,kind:'conditional',requiredWhen:positive,values};
  });
  const extension=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:pack.catalogId,
    sourceId:pack.sourceId,normId:pack.normId,sourceMetadata:{source_title:'Официальный комплект 4 торцевых заглушек 60×40 мм и принятая ведомость концов',
      source_document_version:'IEK KMZ exact product snapshot R239; held catalogue PDF12/printed10',
      definition_hash:pack.source.sha256,exact_locator:pack.source.locator,artifact_sha256:pack.source.sha256},
    applicabilityRu:pack.scopeRu,
    ordinary:[{id:'elecor_route_m',title:'Длина принятого прямого участка, м',kind:'ordinary',valueType:'decimal',unitId:'m',min:0.001}],
    profile:[],conditional:[...parentFacts,...conditional],rows,deferMissingProjectFactsToRows:true,
    excludedUnownedAssumptions:['Труд, инструмент, доступ, испытания, логистика и уборка не нормированы этим комплектом.',
      'Число заглушек не определяется длиной, числом секций, числом стыков или значением по умолчанию.']});
  const parameters=[...parent.parameters,...extension.parameters.filter(p=>!parentIds.has(p.parameter_id)).map((p,i)=>({...p,ordinal:parent.parameters.length+i,
    truth_metadata:{...p.truth_metadata,...(p.truth_metadata.visibility_role==='INTERNAL_ONLY'?{}:
      {value_source_role:'PROJECT_SPECIFIC_INPUT',source_confirmation_required:false}),
      fullTechnicalAcceptance:false,projectScheduleNotAuthenticatedBySource:true,
      provenance:{...p.truth_metadata.provenance,consumer_input_role_v1:p.truth_metadata.visibility_role==='INTERNAL_ONLY'
        ?'APPLICATION_TECHNICAL':[stock,reserve,quantum].includes(p.parameter_id)
          ?'ADVANCED_OPTION':'OBJECT_FACT'}}}))];
  const resources=extension.resources.map((r,i)=>{
    const {row_sha256:_hash,...body}=r;
    const value={...body,ordinal:parent.resources.length+i,
      resource_graph:{...r.resource_graph,fullTechnicalAcceptance:false,
        operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:oldOperation.groupId,
          groupTitleRu:'Кабель-канал 60×40: принятый прямой участок',...operation},
        publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,
          nameRu:r.title_ru,brandAndModelRu:'IEK ELECOR КМЗ CKMP10D-Z-060-040-K01',specificationRu:'Полный заводской комплект содержит 4 отдельные белые заглушки для кабель-канала 60×40 мм.',
          detailsRu:[pack.scopeRu,pack.priceScope]}},
      source_metadata:{...r.source_metadata,sourceRole:'EXACT_MANUFACTURER_COMPLETE_SET_WITH_PROJECT_END_SCHEDULE_NOT_NORM',
        sourceEvidence:[pack.source,pack.heldCatalogue],exactManufacturerArticle:pack.exactProduct.article,
        manufacturerConsumptionRateNotClaimed:true,installationLabourNormAccepted:false,
        allOtherNodeKindsRequireSeparateProjectAndSource:true,projectQuantityOnly:true,
        automaticLegacyPriceOrQuantityTransferAllowed:false,priceScope:pack.priceScope,
        preservedOpenObligations:['installation-labour','tools','access-protection','acceptance','delivery-handling','cleanup-disposal']}};
    return {...value,row_sha256:hash(value)};
  });
  const {row_sha256:_oldHash,...oldBody}=old;
  const oldNeed={...oldBody,inclusion_ast:{kind:'and',operands:[old.inclusion_ast,
    {kind:'not',operand:active}]},
    resource_graph:{...old.resource_graph,derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',
      unitId:'pcs',parameterIds:[pack.legacyQuantityParameterId],
      reasonRu:'Старое неизвестное количество концевых элементов не является ведомостью заглушек или новым заказом.'}},
    source_metadata:{...old.source_metadata,completionNeedTransitionV1:{featureContract:pack.contract,
      selectedMethodParameterId:pack.methodParameterId,resolvedOnlyForMethod:pack.method,
      resolvedThroughPaidOwnerRowId:pack.ownerRowId,conditionalOnAllProjectNodeFacts:true,
      automaticLegacyPriceOrQuantityTransferAllowed:false}}};
  const retained=parent.resources.map(r=>{
    if(r.row_id===old.row_id)return{...oldNeed,row_sha256:hash(oldNeed)};
    if(!sharedNeedIds.includes(r.row_id))return r;
    const raw=r.resource_graph.operationCompositionV1;
    const ref=canonicalEstimateOperationReference(raw);
    if(!ref||raw===null||typeof raw!=='object'||Array.isArray(raw)
      ||ref.groupId!==oldOperation.groupId||ref.additionalOperations?.some(item=>item.operationId===operation.operationId))
      throw Error('ELECOR_END_NODE_OPERATION_LINK_COLLISION:'+r.row_id);
    const {row_sha256:_sha,...body}=r;
    const value={...body,resource_graph:{...r.resource_graph,operationCompositionV1:{...raw,
      additionalOperations:[...(ref.additionalOperations??[]),{...operation,
        whenResourcePresent:[elecorEndcapRowIdR239('consumed-pieces')]}]}}};
    return{...value,row_sha256:hash(value)};
  });
  return {...parent,parameters,formulas:[...parent.formulas,...extension.formulas],resources:[...retained,...resources]};
}

export function elecorProjectEndcapsControlInputR239(){return{...elecorMechanicalProjectFixingsControlInputR1(),
  [pack.methodParameterId]:pack.method,[acceptance]:pack.nodeAcceptance,
  [reference]:'TEST_ONLY_NOT_REAL_END_SCHEDULE: five documented cap positions on one straight route',
  [pack.countId]:5,[stock]:0,[reserve]:0,[quantum]:1};}
