import {buildMasterParameterCalculationConsumers} from './canonicalDefinitionParameterConsumersR1';
import assert from 'node:assert/strict';
import pack from '../../../../data/estimate-benchmarks/source-packs/master32-panel-tool-provision-r1.json';
import post from '../../../../data/estimate-benchmarks/source-packs/panel-ready-grid-whole-post-project-r287.json';
import {canonicalEstimateOperationReferences} from './canonicalEstimateOperationComposition';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticOwnerDefinition,type AutomaticParameterSpec,type AutomaticRowSpec}
  from '../v4/automaticConstructionOwnerR1';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';

export const lightingOwnedWholePostR1={
  contract:'electrical.existing-lighting-owned-whole-tool-post/source-only-r1',
  methodId:'panel_owned_whole_post_method',
  method:'Собственное целое пригодное ручное и измерительное оснащение по подтверждённой ведомости',
  unresolved:'Собственное целое оснащение пока не подтверждено',
  countId:'panel_owned_whole_post_usable_sets',
  scheduleId:'panel_owned_whole_post_inventory_reference',
  fitId:'panel_owned_whole_post_inventory_fit',
  fit:'Ведомость подтверждает все 21 тип и 31 предмет каждого целого пригодного комплекта, совместимость, начальное питание и действующие документы проверки; комплекты выделены на этот пост',
  prefix:pack.prefix+':owned',
  // Initial inventory is not a renewal rate, verification service or a test program.
  // No quantity/unit/interval is authored from the initial six batteries or tool BOM.
  openNeeds:[
    {key:'battery-renewal',parameterId:'panel_owned_whole_post_open_battery_renewal',
      titleRu:'Замена элементов питания измерительного оснащения',category:'material',
      reasonRu:'Начальные шесть элементов AA в каждом питаемом приборе не задают срок службы или расход замены; фактическое состояние, период и количество замены не подтверждены.'},
    {key:'periodic-verification',parameterId:'panel_owned_whole_post_open_periodic_verification',
      titleRu:'Периодическая проверка измерительного оснащения',category:'service',
      reasonRu:'Пригодность и действующие документы начального комплекта не задают периодичность, объём, исполнителя или отдельную стоимость последующей проверки; нужны действующие документы конкретных приборов и план работ.'},
    {key:'additional-measurements',parameterId:'panel_owned_whole_post_open_additional_measurements',
      titleRu:'Дополнительные измерения и приёмка электроустановки',category:'service',
      reasonRu:'Оснащение для проверки отсутствия напряжения и непрерывности PE не подтверждает остальную программу испытаний; методы, необходимые принадлежности, объём и стоимость зависят от проекта и программы приёмки.'},
  ],
  catalogId:'canonical-work:base:electrical_interior_lighting_install_technical_room',
} as const;
const p=lightingOwnedWholePostR1;
function record(value:unknown):value is Record<string,unknown>{return value!==null&&typeof value==='object'&&!Array.isArray(value);}
export const lightingOwnedWholePostRowR1=(key:string)=>p.prefix+':'+key;
const selected=(parameterId:string,value:string)=>({kind:'selected',parameterId,value});
const chosen=selected(p.methodId,p.method);
const required={kind:'equals' as const,parameterId:p.methodId,value:p.method};
const toolKeys=['stripper-cutter','measuring-rule','slotted-screwdriver','voltage-indicator','proving-unit','proving-batteries',
  'proving-magnetic-hanger','voltage-kit-case','installation-tester','continuity-red-lead','continuity-green-lead',
  'continuity-red-probe','continuity-green-probe','continuity-red-gs38-cap','continuity-green-gs38-cap',
  'continuity-red-clip','continuity-green-clip','continuity-zero-adapter','continuity-batteries','continuity-padded-strap','continuity-hard-case'];

/** Exact retained lighting capability/inventory only. All arithmetic is compiled
 * by the ordinary FormulaGraph and the existing canonical estimate core.
 * The declaration is source-only input, not authenticated inventory or a norm. */
export function appendLightingOwnedWholeToolPostR1(parent:AutomaticOwnerDefinition):AutomaticOwnerDefinition{
  assert.deepEqual(pack.tools.map(t=>t.key),toolKeys,'LIGHTING_OWNED_EXACT21_TOOL_KEYS');
  assert.equal(pack.tools.reduce((n,t)=>n+t.countPerPost,0),31,'LIGHTING_OWNED_EXACT31_PHYSICAL_PIECES');
  assert(pack.tools.every(t=>t.unitId==='piece'&&t.countPerPost===(t.key.endsWith('-batteries')?6:1)),'LIGHTING_OWNED_EXACT_DIMENSIONS');
  const original=new Map(parent.resources.map(r=>[r.row_id,r]));
  const owner=original.get(pack.ownerRowId);
  assert(owner&&owner.unit_id==='set'&&owner.resource_graph.costTreatment==='OWN_COST','LIGHTING_OWNED_EXISTING_SINGLE_PAID_POST_REQUIRED');
  const retainedIds=[pack.ownerRowId,...pack.tools.map(t=>pack.prefix+':'+t.key)];
  assert(retainedIds.every(id=>original.has(id)),'LIGHTING_OWNED_WHOLE_RETAINED21_NOT_SOCKET18_REQUIRED');
  assert([pack.countId,pack.factorySelectorId,pack.methodId,pack.fitId].every(id=>parent.parameters.some(q=>q.parameter_id===id)),
    'LIGHTING_OWNED_REAL_LIGHTING_CONFIG_REQUIRED');
  const facts=[p.countId,p.scheduleId,p.fitId,pack.factorySelectorId,pack.methodId,pack.fitId,post.fields.method,post.fields.qualification];
  // This new full-lighting branch has its own explicit consumer binding. It
  // does not move/rebind the frozen socket18 branch or attach cross-group refs.
  const actualOperations=parent.resources.flatMap(r=>canonicalEstimateOperationReferences(r.resource_graph.operationCompositionV1));
  const actualOperation=(key:string)=>{
    const op=actualOperations.find(o=>o.groupId===post.prefix+':whole'&&o.operationId===post.prefix+':'+key);
    assert(op,'LIGHTING_OWNED_ACTUAL_WHOLE_POST_OPERATION_REQUIRED:'+key);return op;
  };
  for(const key of ['readback','mount','connect','qa','complete'])actualOperation(key);
  const rolesFor=(key:string):string[]=>key==='whole-inventory'?['readback']:key==='stripper-cutter'?['connect']
    :key==='measuring-rule'?['readback','mount','connect']:key==='slotted-screwdriver'?['readback']
    :['voltage-indicator','proving-unit','proving-batteries','proving-magnetic-hanger','voltage-kit-case'].includes(key)
      ?['readback','connect','qa']:['readback','qa'];
  const conditional:AutomaticParameterSpec[]=[
    {id:p.methodId,title:'Источник обеспечения целого ручного и измерительного поста',kind:'conditional',valueType:'enum',unitId:null,values:[p.method,p.unresolved]},
    {id:p.countId,title:'Фактическое число выделенных целых пригодных собственных комплектов',kind:'conditional',valueType:'integer',unitId:'set',min:1,max:1000000,requiredWhen:required},
    {id:p.scheduleId,title:'Ведомость выделенного оснащения, принадлежностей, состояния и документов проверки',kind:'conditional',valueType:'text',unitId:null,requiredWhen:required},
    {id:p.fitId,title:'Подтверждена ли комплектность каждого выделенного пригодного поста?',kind:'conditional',valueType:'enum',unitId:null,values:[p.fit],requiredWhen:required},
    ...p.openNeeds.map(n=>({id:n.parameterId,title:n.titleRu,kind:'internal' as const,valueType:'decimal' as const,
      unitId:null,requiredWhen:required})),
  ];
  const row=lightingOwnedWholePostRowR1;
  const rows:AutomaticRowSpec[]=[
    {rowId:row('whole-inventory'),formulaId:row('formula:whole-inventory'),section:'Собственное целое оснащение поста',category:'equipment',
      title:'Целое пригодное оснащение монтажного поста',unitId:'set',expression:p.countId,costTreatment:'INFORMATIONAL_SCOPE',procurement:false,inputParameterIds:[p.countId,p.scheduleId,p.fitId]},
    ...pack.tools.map(t=>({rowId:row(t.key),formulaId:row('formula:'+t.key),section:'Собственное целое оснащение поста',category:'equipment',title:t.titleRu,
      unitId:t.unitId,expression:p.countId+'*'+t.countPerPost,costTreatment:'INFORMATIONAL_SCOPE' as const,procurement:false,inputParameterIds:[p.countId,p.scheduleId,p.fitId]})),
    ...p.openNeeds.map(n=>({rowId:row('need:'+n.key),formulaId:row('formula:need:'+n.key),
      section:'Неопределённое обслуживание и дополнительные измерения',category:n.category,title:n.titleRu,
      unitId:'',expression:n.parameterId,costTreatment:'INFORMATIONAL_SCOPE' as const,procurement:false,
      inputParameterIds:[n.parameterId,p.countId,p.scheduleId,p.fitId]})),
  ];
  const added=buildAutomaticConstructionOwnerR1({contract:p.contract,semanticOwner:p.catalogId,sourceId:pack.sourceId,
    normId:'DECLARED_USABLE_WHOLE_LIGHTING_INVENTORY_NOT_CONSUMPTION_PURCHASE_OR_TEST_RESULTS',
    sourceMetadata:{source_title:pack.titleRu,source_document_version:pack.source.edition,definition_hash:hash(pack),artifact_sha256:pack.source.sha256,
      exact_locator:'Frozen Master32 whole21/31 capability inventory; actual allocation/condition/document evidence remains separately required.'},
    applicabilityRu:pack.scopeRu,ordinary:[],profile:[],conditional,rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.notCoveredRu});
  const ids=new Set(parent.parameters.map(q=>q.parameter_id));
  assert(added.parameters.every(q=>!ids.has(q.parameter_id))&&added.resources.every(r=>!original.has(r.row_id))
    &&added.formulas.every(f=>!parent.formulas.some(old=>old.formula_id===f.formula_id)),'LIGHTING_OWNED_NO_ID_COLLISION');
  // Existing inclusion contains exact factory, retained method/fit and N>0.
  // No source fact is supplied. Missing count/reference remains unknown, never0.
  const coverage={kind:'and',operands:[owner.inclusion_ast,selected(post.fields.method,post.methodRu),selected(post.fields.qualification,post.qualificationRu),chosen,selected(p.fitId,p.fit),
    {kind:'greater_than',parameterId:p.countId,value:0},{kind:'present',parameterId:p.scheduleId}]};
  const parameters=added.parameters.map((q,i)=>{
    const need=p.openNeeds.find(n=>n.parameterId===q.parameter_id);
    if(need)return{...q,ordinal:parent.parameters.length+i,default_value:null,
      truth_metadata:{...unresolvedApplicationNormTruthR1(q.truth_metadata,need.reasonRu),
        guide:{guide_kind:'PROJECT_DEFINED',source_role:'UNRESOLVED_APPLICATION_NORM',
          source_document:pack.sourceId,source_locator:need.reasonRu,guide_validation_policy:'MANDATORY_BLOCK'},
        projectAuthenticated:false,sourceAuthorityPromoted:false}};
    const oldGuide=record(q.truth_metadata.guide)?q.truth_metadata.guide:{};
    const {verified_at:_unearned,...guide}=oldGuide;
    return{...q,ordinal:parent.parameters.length+i,default_value:null,truth_metadata:{...q.truth_metadata,visibility_role:'USER_INPUT',
      value_source_role:'PROJECT_SPECIFIC_INPUT',source_confirmation_required:false,provenance:{consumer_input_role_v1:'OBJECT_FACT'},
      guide:{...guide,guide_kind:'PROJECT_DEFINED',source_role:'DECLARED_INVENTORY_REQUIRES_SERVER_BINDING',source_document:pack.sourceId,
        source_locator:pack.scopeRu},projectAuthenticated:false,sourceAuthorityPromoted:false}};
  });
  const resources=parent.resources.map(r=>{
    if(!retainedIds.includes(r.row_id))return r;
    const {row_sha256:_old,...body}=r;
    const next={...body,inclusion_ast:{kind:'and',operands:[r.inclusion_ast,{kind:'not',operand:coverage}]}};
    return{...next,row_sha256:hash(next)};
  });
  const owned=added.resources.map((r,i)=>{
    const key=r.row_id.slice(p.prefix.length+1),tool=pack.tools.find(t=>t.key===key);
    const need=p.openNeeds.find(n=>'need:'+n.key===key);
    const retained=tool?original.get(pack.prefix+':'+tool.key):need?null:owner;
    assert(need||retained,'LIGHTING_OWNED_RETAINED_RESOURCE_REQUIRED');
    const uses=rolesFor(key).map(actualOperation);assert(uses[0],'LIGHTING_OWNED_WHOLE_POST_USING_OPERATION_REQUIRED');
    const {row_sha256:_old,...body}=r;
    const next={...body,ordinal:parent.resources.length+i,inclusion_ast:coverage,cost_owner_id:null,procurement_eligible:false,
      resource_graph:{...r.resource_graph,inputParameterIds:need?[...facts,need.parameterId]:facts,scopeContextParameterIds:[pack.countId],
        operationCompositionV1:{...uses[0],additionalOperations:uses.slice(1)},
        ...(need?{}:{derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:r.unit_id,
          parameterIds:[p.countId],reasonRu:'Число целых выделенных пригодных комплектов задаётся фактической ведомостью, не числом светильников.'}}),
        physicalProvisionV1:{basis:need?'UNRESOLVED_APPLICATION_SCOPE_NOT_INITIAL_INVENTORY':'DECLARED_ACTUAL_OWNED_USABLE_WHOLE_LIGHTING_POST',
          inventoryOwnerRowId:need?null:row('whole-inventory'),actualInventoryParameterId:need?null:p.countId,
          inventoryReferenceParameterId:p.scheduleId,inventoryMultiplier:need?null:tool?.countPerPost??1,
          manufacturerProfile:tool?.profile??null,actualInventoryAuthenticated:false,newPurchaseClaimed:false,rentalDurationClaimed:false,
          consumptionOrWearNormClaimed:false},
        publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',nameRu:r.title_ru,sourceTitleRu:r.title_ru,
          brandAndModelRu:null,specificationRu:null,detailsRu:[]}},
      source_metadata:{...r.source_metadata,normativeTrace:[],sourceRole:need?'UNRESOLVED_APPLICATION_NORM':'RETAINED_MASTER32_CAPABILITY_AND_DECLARED_WHOLE_OWNED_INVENTORY',
        primaryCapabilityArtifacts:need?[]:tool?pack.sourceArtifacts.filter(a=>(tool.sourceArtifactIds as readonly string[]).includes(a.id)):pack.sourceArtifacts,
        exact_locator:need?.reasonRu??tool?.locator??pack.scopeRu,actualElectricalTestsOrSafeIsolationProved:false,
        automaticGenericPriceInheritanceAllowed:false,projectAuthenticated:false,sourceAuthorityPromoted:false,publicationAllowed:false,
        full_technical_acceptance:false,metrologyRenewalBatteryConsumptionOrPprRatesAuthored:false,
        ...(need?{unresolvedApplicationScopeReasonRu:need.reasonRu,quantityUnitIntervalAndSeparatePriceUnresolved:true}:{}),}};
    return{...next,row_sha256:hash(next)};
  });
  const combined={...parent,parameters:[...parent.parameters,...parameters],formulas:[...parent.formulas,...added.formulas],resources:[...resources,...owned]};
  // Same publication consumer enricher, after all new formulas/conditions/graphs.
  // This is dependency metadata only; no value/source/price/row is inferred.
  const consumers=buildMasterParameterCalculationConsumers(combined);
  return{...combined,parameters:combined.parameters.map(q=>({...q,truth_metadata:{...q.truth_metadata,
    formula_consumers:consumers.formulaConsumers[q.parameter_id],resource_branch_consumers:consumers.resourceConsumers[q.parameter_id]}}))};
}
