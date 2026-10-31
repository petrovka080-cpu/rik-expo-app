import pack from '../../../../data/estimate-benchmarks/source-packs/socket-complete-two-gang-existing-owner-source-r1.json';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,
  type AutomaticOwnerDefinition,type AutomaticParameterSpec,type AutomaticRowSpec} from '../v4/automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1} from '../v4/effectivePurchaseBalanceR1';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';

export const socketCompleteTwoGangSourcePackR1=pack;
export const socketCompleteTwoGangSourceRowR1=(key:string)=>pack.prefix+':'+key;
const row=socketCompleteTwoGangSourceRowR1;
const id=(key:string)=>pack.parameterPrefix+key.replaceAll('-','_');
const selected={kind:'selected',parameterId:pack.methodParameterId,value:pack.method};
const required={kind:'equals' as const,parameterId:pack.methodParameterId,value:pack.method};
const common=[id('node_count'),id('project_reference'),id('object_fit'),id('source_readback')];
const text=(key:string,title:string):AutomaticParameterSpec=>({id:id(key),title,valueType:'text',unitId:null,kind:'conditional',requiredWhen:required});

/** An internal complete-product source candidate of the same socket owner.
 * It declares composition through the existing backend factory and balance;
 * it contains no evaluator, price, installation rate or source admission. */
export function socketCompleteTwoGangSourceCandidateR1():AutomaticOwnerDefinition{
  const supply=pack.factoryIncludedSupply,catalog=pack.secondaryPrimaryArtifacts.find(s=>s.key===supply.sourceArtifactKey);
  if(!catalog||catalog.sha256!==supply.sourceArtifactSha256||supply.salesReference!==pack.internalReference
    ||supply.entryEndpieces.factorySuppliedCountPerCompleteAssembly!==3||!supply.frame.included||supply.frame.suppliedState!=='NOT_CLIPPED'
    ||supply.separateComponentCostOrProcurementRowsAllowed||supply.newInstallationOrConsumptionNorm)
    throw Error('COMPLETE_TWO_GANG_EXACT_P684_FACTORY_SUPPLY_BOUNDARY_REQUIRED');
  const conditional:AutomaticParameterSpec[]=[
    {id:pack.methodParameterId,title:'Профиль установки розетки',kind:'conditional',valueType:'enum',unitId:null,
      values:[pack.legacyMethod,pack.completeSingleMethod,pack.method]},
    {id:id('node_count'),title:'Фактическое число комплектных двухместных узлов',kind:'conditional',valueType:'integer',unitId:'pcs',min:1,requiredWhen:required},
    text('project_reference','Ведомость узлов, готовые отверстия, основание, крепёж, ввод и проверки: документ и позиции'),
    text('object_fit','Фактическая партия, комплектность, клеммы, ввод, схема и условия работ: документы проверки'),
    {id:id('source_readback'),title:'Допуск источника комплектного двухместного узла',kind:'internal',valueType:'text',unitId:null,requiredWhen:required},
    text('price_scope','Раздельные границы цен поставки, полного труда и внешней логистики'),
    {id:id('fixing'),title:'Крепление к подготовленному основанию',kind:'conditional',valueType:'enum',unitId:null,values:pack.fixingModes,requiredWhen:required},
    text('own_equipment_schedule','Пригодное целое собственное оснащение, СИЗ и средства отключения: ведомость и состояние'),
    {id:id('whole_labour_h'),title:'Фактический полный труд монтажа, подключения, проверок, обращения и уборки',kind:'conditional',valueType:'decimal',unitId:'man_hour',min:0.000001,requiredWhen:required},
    {id:id('qa_count'),title:'Фактическое число проверок по принятой программе',kind:'conditional',valueType:'integer',unitId:'test',min:1,requiredWhen:required},
    ...(['delivery_trips','waste_trips'] as const).map(key=>({id:id(key),title:key==='delivery_trips'?'Фактические рейсы внешней доставки':'Фактические рейсы внешнего вывоза',kind:'conditional' as const,valueType:'integer' as const,unitId:'trip',min:0,requiredWhen:required})),
  ];
  const specs:AutomaticRowSpec[]=[];
  for(const material of pack.materials){
    const condition=material.mode==='required'?required:{kind:'and' as const,operands:[required,material.mode==='dowels'
      ?{kind:'equals' as const,parameterId:id('fixing'),value:pack.fixingModes[1]!}
      :{kind:'equals' as const,parameterId:id(material.key+'_applicability'),value:pack.neededValue}]};
    if(material.mode==='optional')conditional.push({id:id(material.key+'_applicability'),title:'Требуется ли по ППР: '+material.titleRu,kind:'conditional',valueType:'enum',unitId:null,values:[pack.neededValue,pack.notNeededValue],requiredWhen:required});
    const consumed=material.quantityOrigin==='one-per-node'?id('node_count'):id(material.key+'_count');
    if(material.quantityOrigin!=='one-per-node')conditional.push({id:consumed,title:material.titleRu+': фактический итог ведомости',kind:'conditional',valueType:'integer',unitId:'pcs',min:1,requiredWhen:condition});
    const stock=id(material.key+'_stock'),reserve=id(material.key+'_reserve'),quantum=id(material.key+'_quantum');
    const specification=id(material.key+'_specification'),stockFit=id(material.key+'_stock_fit');
    conditional.push({id:specification,title:'Принятая поставочная спецификация: '+material.titleRu,kind:'conditional',valueType:'text',unitId:null,requiredWhen:condition},
      {id:stockFit,title:'Пригодность и точная комплектность имеющегося остатка: '+material.titleRu,kind:'conditional',valueType:'text',unitId:null,
        requiredWhen:{kind:'and',operands:[condition,{kind:'greater_than',parameterId:stock,value:0}]}});
    for(const [parameterId,title,min]of[[stock,'Пригодное наличие',0],[reserve,'Сохраняемый резерв',0],[quantum,'Подтверждённая кратность поставки',1]]as const)
      conditional.push({id:parameterId,title:title+': '+material.titleRu,kind:'conditional',valueType:'integer',unitId:'pcs',min,requiredWhen:condition});
    const owner=row(material.key+':order');
    const balance=effectivePurchaseBalanceExpressionsR1({ownerRowId:owner,orderUnitId:'pcs',consumed,stock,reserve,quantum,manualQuantumViolationPolicy:'retain-raw-and-block-quantum'});
    const facts=[...common,id('fixing'),specification,stockFit];
    const add=(key:string,title:string,expression:string,extra:Partial<AutomaticRowSpec>={})=>specs.push({rowId:row(material.key+':'+key),formulaId:row('formula:'+material.key+':'+key),
      section:pack.titleRu,category:'material',title,unitId:'pcs',expression,costTreatment:'INFORMATIONAL_SCOPE',procurement:false,inputParameterIds:facts,inclusion:condition,...extra});
    add('consumed',material.titleRu,consumed,{costTreatment:'INCLUDED_IN_RESOURCE_ROWS',purchaseBalanceOwnerRowId:owner});
    add('order',material.titleRu+' к поставке',`ceil(max(0,${consumed}+${reserve}-${stock})/${quantum})*${quantum}`,{costTreatment:'OWN_COST',procurement:true,...balance.owner,inputParameterIds:[...facts,id('price_scope')]});
    add('remaining',material.titleRu+': остаток после установки',balance.remaining,{purchaseBalanceOwnerRowId:owner});
    add('free',material.titleRu+': свободный остаток',balance.free,{purchaseBalanceOwnerRowId:owner});
    add('shortage',material.titleRu+': недостаёт для монтажа',balance.consumptionShortage,{purchaseBalanceOwnerRowId:owner});
    add('reserve-deficit',material.titleRu+': непокрытый резерв',balance.reserveDeficit,{purchaseBalanceOwnerRowId:owner});
  }
  for(const tool of pack.ownEquipment){const quantity=id('own_'+tool.key+'_count');
    conditional.push({id:quantity,title:'Фактическое собственное оснащение: '+tool.titleRu,kind:'conditional',valueType:'integer',unitId:tool.unitId,min:1,requiredWhen:required});
    specs.push({rowId:row('own:'+tool.key),formulaId:row('formula:own:'+tool.key),section:'Собственное оснащение',category:'equipment',title:tool.titleRu,unitId:tool.unitId,expression:quantity,
      costTreatment:'INFORMATIONAL_SCOPE',procurement:false,inputParameterIds:[...common,id('own_equipment_schedule')],inclusion:required});}
  for(const [key,title,unitId,quantity,category,procurement]of[
    ['whole-labour','Труд монтажа, подключения, проверок, обращения и уборки','man_hour','whole_labour_h','construction_work',false],
    ['qa-included','Проверки розеточных узлов по принятой программе','test','qa_count','service',false],
    ['delivery','Внешняя доставка розеточных изделий и крепежа','trip','delivery_trips','service',true],
    ['waste-removal','Внешний вывоз упаковки и отходов','trip','waste_trips','service',true]]as const)
    specs.push({rowId:row(key),formulaId:row('formula:'+key),section:pack.titleRu,category,title,unitId,expression:id(quantity),costTreatment:key==='qa-included'?'INCLUDED_IN_RESOURCE_ROWS':'OWN_COST',procurement,
      inputParameterIds:[...common,id('own_equipment_schedule'),id('qa_count'),id('price_scope')],inclusion:required});
  const built=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:pack.catalogId,
    // This is the actual manufacturer's document ID, not a registry source ID.
    sourceId:pack.primaryDocumentId,normId:'UNRESOLVED_APPLICATION_NORM',
    sourceMetadata:{source_title:pack.titleRu,source_document_version:pack.primaryDocumentId,definition_hash:hash(pack),artifact_sha256:pack.primary.sha256,exact_locator:pack.primary.locator},
    applicabilityRu:pack.scopeRu,ordinary:[],profile:[],conditional,rows:specs,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.sourceBoundary});
  const parameters=built.parameters.map(p=>{
    // The generic factory's historical guide timestamp is not a verification
    // of this new source candidate or of any submitted project fact.
    const{guide:_unverifiedGuide,...baseTruth}=p.truth_metadata;
    const truth={...baseTruth,input_origin_class:'PROJECT_OR_SITE_INPUT',projectAuthenticated:false,sourceAuthorityPromoted:false};
    return p.parameter_id===id('source_readback')
      ?{...p,truth_metadata:unresolvedApplicationNormTruthR1(truth,pack.sourceHoldRu)}
      :p.truth_metadata.visibility_role==='INTERNAL_ONLY'?{...p,truth_metadata:truth}
        :{...p,truth_metadata:{...truth,value_source_role:'PROJECT_SPECIFIC_INPUT',source_confirmation_required:false,provenance:{consumer_input_role_v1:'OBJECT_FACT'}}};
  });
  const resources=built.resources.map(r=>{
    const suffix=r.row_id.slice(pack.prefix.length+1),material=pack.materials.find(m=>suffix.startsWith(m.key+':')),tool=pack.ownEquipment.find(t=>suffix==='own:'+t.key);
    const operations=material?.operations??tool?.operations??(suffix==='whole-labour'?pack.operations.map(o=>o.id):suffix==='qa-included'?['qa-close']:suffix==='delivery'?['delivery']:['cleanup']);
    const refs=operations.map(key=>{const operation=pack.operations.find(o=>o.id===key);if(!operation)throw Error('COMPLETE_TWO_GANG_EXACT_OPERATION_REQUIRED:'+key);
      return{operationId:pack.prefix+':'+key,operationTitleRu:operation.titleRu,processOrdinal:pack.operations.indexOf(operation),processRole:'PROCESS' as const,completionCriterionRu:'Объём выполнен по принятому ППР; наличие ресурса не доказывает источник, допуск или фактическую приёмку.'};});
    if(!refs[0])throw Error('COMPLETE_TWO_GANG_OPERATION_CONSUMER_REQUIRED');
    const includedOwner=suffix.endsWith(':consumed')&&material?row(material.key+':order'):suffix==='qa-included'?row('whole-labour'):null;
    const formula=built.formulas.find(f=>f.formula_id===r.formula_id);if(!formula)throw Error('COMPLETE_TWO_GANG_FORMULA_REQUIRED');
    const{row_sha256:_before,...body}=r;
    const next={...body,cost_owner_id:tool?null:includedOwner??r.cost_owner_id,inclusion_ast:{kind:'and',operands:[selected,r.inclusion_ast]},
      resource_graph:{...r.resource_graph,...(includedOwner?{parentCostOwnerId:includedOwner,includedInResourceOwnerRowId:includedOwner}:{}),
        operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:pack.prefix,groupTitleRu:pack.titleRu,...refs[0],additionalOperations:refs.slice(1)},
        ...(!suffix.endsWith(':order')?{derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:r.unit_id,parameterIds:formula.input_parameter_ids,reasonRu:'Количество меняется через исходную ведомость и штатный баланс.'}}:{}),
        ...(['delivery','waste-removal'].includes(suffix)?{excludeKnownZeroQuantityV1:true}:{}),
        ...(material?.key==='assembly'?{factoryIncludedSupplyV1:{basis:'PRIMARY_CATALOGUE_FACTORY_SUPPLY_WITHIN_COMPLETE_ARTICLE',
          salesReference:supply.salesReference,sourceArtifactSha256:supply.sourceArtifactSha256,completeAssemblyOwnerRowId:row('assembly:order'),
          frameIncluded:supply.frame.included,frameSuppliedState:supply.frame.suppliedState,factorySuppliedEntryEndpiecesPerAssembly:3,
          actualUsedCableEntries:null,createsSeparateQuantityCostOrProcurementRows:false}}:{}),
        publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',nameRu:r.title_ru,sourceTitleRu:r.title_ru,brandAndModelRu:null,specificationRu:null,detailsRu:[]}},
      source_metadata:{...r.source_metadata,normativeTrace:[],sourceRole:'UNADMITTED_SOURCE_COMPOSITION_CANDIDATE',primaryArtifactCandidates:[pack.primary,...pack.secondaryPrimaryArtifacts],sourceDocumentIdentifierNotRegistrySourceId:pack.primaryDocumentId,
        automaticGenericPriceInheritanceAllowed:false,sourceAuthorityPromoted:false,projectAuthenticated:false,publicationAllowed:false,full_technical_acceptance:false,installationRateAuthored:false}};
    return{...next,row_sha256:hash(next)};
  });
  return{...built,parameters,resources};
}

export function appendSocketCompleteTwoGangExistingOwnerR1(parent:AutomaticOwnerDefinition):AutomaticOwnerDefinition{
  const selector=parent.parameters.find(p=>p.parameter_id===pack.methodParameterId);
  if(parent.parameters.length!==29||parent.formulas.length!==87||parent.resources.length!==87
    ||JSON.stringify(selector?.constraints_json?.values)!==JSON.stringify([pack.legacyMethod,pack.completeSingleMethod]))
    throw Error('COMPLETE_TWO_GANG_EXACT_R266_PARENT_REQUIRED');
  const added=socketCompleteTwoGangSourceCandidateR1(),ids=new Set(parent.parameters.map(p=>p.parameter_id));
  if(added.parameters.some(p=>ids.has(p.parameter_id)&&p.parameter_id!==pack.methodParameterId)
    ||added.formulas.some(f=>parent.formulas.some(old=>old.formula_id===f.formula_id))
    ||added.resources.some(r=>parent.resources.some(old=>old.row_id===r.row_id)))throw Error('COMPLETE_TWO_GANG_NO_ID_ALIAS');
  const parameters=parent.parameters.map(p=>p.parameter_id===pack.methodParameterId?{...p,constraints_json:{...p.constraints_json,values:[pack.legacyMethod,pack.completeSingleMethod,pack.method]}}:p);
  parameters.push(...added.parameters.filter(p=>!ids.has(p.parameter_id)).map((p,j)=>({...p,ordinal:parent.parameters.length+j})));
  const retained=parent.resources.map(r=>{const{row_sha256:_before,...body}=r;const next={...body,inclusion_ast:{kind:'and',operands:[r.inclusion_ast,{kind:'not',operand:selected}]}};return{...next,row_sha256:hash(next)};});
  return{...parent,parameters,formulas:[...parent.formulas,...added.formulas],resources:[...retained,...added.resources.map((r,j)=>{
    const{row_sha256:_before,...body}=r;const next={...body,ordinal:parent.resources.length+j};return{...next,row_sha256:hash(next)};})]};
}
