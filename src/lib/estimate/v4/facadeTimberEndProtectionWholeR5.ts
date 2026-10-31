import source from '../../../../data/estimate-benchmarks/source-packs/facade-timber-end-protection-r5.json';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticOwnerDefinition,type AutomaticParameterSpec,type AutomaticRowSpec,type AutomaticInclusionCondition} from './automaticConstructionOwnerR1';
import {facadeBoardSourceFixingDefinitionR3,facadeApprovedBoardFixingCountsR3,facadeBoardFixingPrimaryR3,type FacadeApprovedBoardScheduleR3} from './facadeBoardSourceFixingR3';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
import {compareFormulaGraphDecimals, evaluateFormulaGraph, isFormulaGraphDecimalMultiple, isFormulaGraphExactDecimal, type FormulaAst} from '../backendPlatform/formulaGraph';

export const facadeTimberEndProtectionPrefixR5='facade:timber-end-protection:r5';
export const facadeTimberEndAreaR5='timber_end_protection_net_end_area_m2';
export const facadeTimberEndNormR5=(key:string)=>'timber_end_protection_unknown_'+key.replaceAll('-','_');
const id=(key:string)=>facadeTimberEndProtectionPrefixR5+':'+key;
const primary=facadeBoardFixingPrimaryR3;
const positive={kind:'greater_than' as const,parameterId:primary,value:0};
const active:AutomaticInclusionCondition={kind:'and',operands:[positive,{kind:'greater_than',parameterId:facadeTimberEndAreaR5,value:0}]};
const context=['timber_end_protection_exact_method','timber_end_protection_approved_source','timber_end_protection_layout_sha256'];
const fail: (message:string)=>never=(message:string):never=>{throw Object.assign(new Error(message),{code:'PARAMETER_VALIDATION_FAILED'});};

/** Extend the EXISTING exact thermo-board source cycle through the ordinary
 * automatic-owner factory. The old board method, screws and 8 needs remain;
 * minimum applied sealer mass does not close its gross-supply/whole-method need.
 * No new catalog, publisher, UI arithmetic, material substitution or litre rate. */
export function facadeBoardWithEndProtectionDefinitionR5():AutomaticOwnerDefinition {
  const parent=facadeBoardSourceFixingDefinitionR3('thermowood-horizontal-tg');
  if(source.parentProfile!=='thermowood-horizontal-tg'||source.selectedMethod.minimumKgPerM2NetEndGrain!=='0.6'
    ||!parent.resources.some(r=>r.row_id===source.parentNeedRowId))throw Error('TIMBER_END_EXACT_PARENT_AND_METHOD_REQUIRED');
  const conditional:AutomaticParameterSpec[]=[
    {id:facadeTimberEndAreaR5,title:'Фактическая чистая площадь обрабатываемых торцов по принятому раскрою',unitId:'m2',valueType:'decimal',kind:'conditional',min:0,requiredWhen:positive},
    {id:context[0]!,title:'Принятый метод защиты торцов',unitId:null,valueType:'enum',kind:'conditional',values:[source.selectedMethod.publicNameRu],requiredWhen:active},
    {id:context[1]!,title:'Принятая совместимость исходного состава, термодревесины и полного цикла нанесения',unitId:null,valueType:'text',kind:'conditional',requiredWhen:active},
    {id:context[2]!,title:'Идентичность принятой схемы раскроя и фактических торцов',unitId:null,valueType:'text',kind:'conditional',requiredWhen:active},
    ...source.needs.map(n=>({id:facadeTimberEndNormR5(n.key),title:n.titleRu,unitId:null,valueType:'decimal' as const,kind:'internal' as const,min:0})),
  ];
  const row=(key:string,title:string,category:string,unitId:string,expression:string):AutomaticRowSpec=>({
    rowId:id(key),formulaId:id('formula:'+key),section:source.publicTitleRu,title,category,unitId,expression,
    inclusion:active,inputParameterIds:context,costTreatment:'INFORMATIONAL_SCOPE',procurement:false,
  });
  const built=buildAutomaticConstructionOwnerR1({contract:source.contract,semanticOwner:facadeTimberEndProtectionPrefixR5,
    sourceId:'gox_facade_timber_end_protection_r5',normId:'EXACT_MINIMUM_SINGLE_COAT_600G_PER_M2_NET_END_GRAIN',
    sourceMetadata:{source_title:source.publicTitleRu,source_document_version:source.internalExactMaterial,
      definition_hash:source.sources[0]!.sha256,artifact_sha256:source.sources[0]!.sha256,exact_locator:'TDS2022-10-11PDF1substrate/preparation;PDF2one600gcoat/cleaning;SDS2025-11-21PDF11/20'},
    applicabilityRu:source.publicTitleRu+'; одна точная однослойная система и фактические торцы по раскрою. Минимум нанесения не является общей поставкой, потерями, фасовкой или полным обеспечением.',
    ordinary:[{id:primary,title:'Число досок по принятой поэлементной схеме',unitId:'piece',valueType:'integer',kind:'ordinary',min:0}],
    profile:[],conditional,rows:[row('sealer-minimum','Водный состав для защиты торцов термодревесины','material','kg',facadeTimberEndAreaR5+'*0.6'),
      ...source.needs.map(n=>row('need:'+n.key,n.titleRu,n.category,n.unitId??'',facadeTimberEndNormR5(n.key)))],
    deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:[
      'Чистая площадь торцов не выводится из площади фасада или номинального прямоугольника шпунтованного профиля.',
      'Двухслойный и смешанный с грунтом методы не переносятся в выбранный однослойный метод.',
      'Литры и закупочная фасовка не выводятся из диапазона плотности или общей SDS всех вариантов.',
      'ДПК и необработанная древесина не подставляются вместо принятого термомодифицированного материала.',
      'Выдержка 2/48 часов не превращается в трудозатраты.',
    ],
  });
  const added:AutomaticOwnerDefinition={...built,
    parameters:built.parameters.map(q=>{
      const n=source.needs.find(n=>q.parameter_id===facadeTimberEndNormR5(n.key));
      return {...q,required:false,truth_metadata:n?unresolvedApplicationNormTruthR1(q.truth_metadata,n.missing):{
        ...q.truth_metadata,source_confirmation_required:false,visibility_role:'INTERNAL_ONLY',
        value_source_role:q.parameter_id===context[0]?'MANUFACTURER_CONFIRMED':'PROJECT_DOCUMENTATION',
        preliminary_compilation_allowed:true,
        provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL',source_readback_only_v1:true,consumer_question_allowed:false}}};
    }),
    resources:built.resources.map(r=>{
      const need=source.needs.find(n=>r.row_id===id('need:'+n.key));
      const ops=need?source.operations:source.operations.filter(o=>['apply','dry-check'].includes(o.key));
      const {row_sha256:_old,...body}=r;
      const next={...body,resource_graph:{...r.resource_graph,
        ...(!need?{includedInResourceOwnerRowId:source.parentNeedRowId,
          derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:'kg',parameterIds:[facadeTimberEndAreaR5],reasonRu:'Используйте фактическую чистую площадь торцов по принятому профилю и раскрою. Исходный минимум нанесения не заменяется ручной нормой.'}}:{}),
        operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:facadeTimberEndProtectionPrefixR5,groupTitleRu:source.publicTitleRu,
          operationId:id('operation:'+ops[0]!.key),operationTitleRu:ops[0]!.titleRu,processOrdinal:1,
          additionalOperations:ops.slice(1).map((o,i)=>({operationId:id('operation:'+o.key),operationTitleRu:o.titleRu,processOrdinal:i+2,processRole:'PROCESS',completionCriterionRu:'Выполнена операция «'+o.titleRu+'» выбранного однослойного метода; незакрытое обеспечение сохранено.'})),
          completionCriterionRu:need?.missing??'Минимальный нанесённый состав по фактическим торцам; поставка и полный цикл отдельно не приняты.'}},
        source_metadata:{...r.source_metadata,source_artifact_sha256:source.sources[0]!.sha256,
          sourceRole:need?'UNRESOLVED_APPLICATION_NORM':'EXACT_MINIMUM_APPLIED_MASS_NOT_GROSS_SUPPLY',
          normativeTrace:need?[]:[{sourceId:'gox_facade_timber_end_protection_r5',source_artifact_sha256:source.sources[0]!.sha256,exact_locator:'TDS2022-10-11PDF2onecoatminimum600g/m2endgrain'}],
          exactSourceMaterial:source.internalExactMaterial,selectedMethod:source.selectedMethod,parentSupplyOwnerRowId:source.parentNeedRowId,
          parentSupplyOwnerStillUnresolved:true,automaticGenericPriceInheritanceAllowed:false,
          ...(need?{normative_source_ids:[],quantityNormAccepted:false,missingFact:need.missing}:{}),full_technical_acceptance:false,newFull:0}};
      return {...next,row_sha256:hash(next)};
    }),
  };
  const parentIds=new Set(parent.parameters.map(q=>q.parameter_id));
  if(added.parameters.some(q=>parentIds.has(q.parameter_id)&&q.parameter_id!==primary))throw Error('TIMBER_END_PARAMETER_COLLISION');
  const parameters=[...parent.parameters,...added.parameters.filter(q=>q.parameter_id!==primary)].map((q,i)=>({...q,ordinal:i}));
  const model={...parent,parameters,formulas:[...parent.formulas,...added.formulas],resources:[...parent.resources,...added.resources],
    runtimeInput:{...parent.runtimeInput,...added.runtimeInput},runtimeClassification:{...parent.runtimeClassification,...added.runtimeClassification},
    runtimeSourceIds:{...parent.runtimeSourceIds,...added.runtimeSourceIds},ordinaryParameterIds:[]};
  const consumers=buildMasterParameterCalculationConsumers(model);
  return {...model,parameters:model.parameters.map(q=>({...q,required:false,truth_metadata:{...q.truth_metadata,
    visibility_role:'INTERNAL_ONLY',
    ...(q.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM'?{}:{
      value_source_role:q.parameter_id===context[0]?'MANUFACTURER_CONFIRMED':'PROJECT_DOCUMENTATION',
      preliminary_compilation_allowed:true,source_confirmation_required:false,
      provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL',source_readback_only_v1:true,consumer_question_allowed:false}}),
    formula_consumers:consumers.formulaConsumers[q.parameter_id],resource_branch_consumers:consumers.resourceConsumers[q.parameter_id]}}))};
}

export type FacadeTimberEndFactsR5=Readonly<{
  netEndAreaM2:string;approvedEndLayoutSha256:string;approvedSourceFitReference:string;exactTdsSha256:string;
}>;
export function compileFacadeBoardWithEndProtectionR5(schedule:FacadeApprovedBoardScheduleR3,end:FacadeTimberEndFactsR5,
  options:{rowOverrides?:CanonicalEstimateCompileCoreInput['rowOverrides']}={}) {
  if(schedule.profile!=='thermowood-horizontal-tg'||end.exactTdsSha256!==source.sources[0]!.sha256
    ||!end.approvedSourceFitReference.trim()||!/^[0-9a-f]{64}$/iu.test(end.approvedEndLayoutSha256))
    fail('TIMBER_END_EXACT_SOURCE_FIT_AND_LAYOUT_REQUIRED');
  const quantities=facadeApprovedBoardFixingCountsR3(schedule),model=facadeBoardWithEndProtectionDefinitionR5();
  return compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:source.contract,catalogId:'INTERNAL_COMPONENT_NOT_PUBLIC_CATALOG',
    primaryMeasureParameterId:facadeTimberEndAreaR5,parameterDefinitions:[...model.parameters],formulaDefinitions:[...model.formulas],resourceDefinitions:[...model.resources],
    submittedParameters:{},confirmedParameters:{[primary]:quantities.boards,board_fixing_actual_narrow_intersections:quantities.narrow,
      board_fixing_actual_wide_intersections:quantities.wide,board_fixing_approved_project:schedule.approvedProjectReference,
      board_fixing_layout_sha256:schedule.approvedLayoutSha256,board_fixing_exact_source:schedule.sourceSha256,
      [facadeTimberEndAreaR5]:end.netEndAreaM2,[context[0]!]:source.selectedMethod.publicNameRu,
      [context[1]!]:end.approvedSourceFitReference,[context[2]!]:end.approvedEndLayoutSha256},
    rowOverrides:options.rowOverrides??{},priceItems:[],currencyCode:'KGS',maximumResourceRows:model.resources.length,hashJson:hash});
}

/** Internal imported cutting-layout facts for the SAME installed board pieces.
 * Each declared end is one outer cut end, not a facade face or a rectangular
 * width/thickness estimate of a profiled section. Empty ends means no exposed
 * cut ends on that piece. The importer authenticates the actual documents;
 * these identity/geometry checks do not authenticate a project or create PPR.
 */
export type FacadeTimberCutEndReadbackR5=Readonly<{
  boardLayoutSha256:string;
  approvedProjectReference:string;
  approvedEndLayoutSha256:string;
  approvedSourceFitReference:string;
  exactTdsSha256:string;
  boards:ReadonlyArray<Readonly<{
    boardId:string;
    widthMm:string;
    ends:ReadonlyArray<Readonly<{
      end:'START'|'FINISH';
      netAreaM2:string;
      actualProfileAndCutGeometrySha256:string;
    }>>;
  }>>;
}>;

const addCutEndAreas:FormulaAst={kind:'binary',operator:'+',
  left:{kind:'parameter',id:'total_area'},right:{kind:'parameter',id:'end_area'}};

/** Bind an existing board schedule to its imported net cut-end geometry, then
 * reuse the existing end-protection compiler and its single supply owner.
 * No support spacing, section shape, extra coat, supply loss or labour norm is
 * inferred. The old aggregate-facts entry remains backward compatible.
 */
export function facadeBoardCutEndFactsR5(schedule:FacadeApprovedBoardScheduleR3,readback:FacadeTimberCutEndReadbackR5):FacadeTimberEndFactsR5 {
  facadeApprovedBoardFixingCountsR3(schedule);
  if(schedule.profile!=='thermowood-horizontal-tg'
    ||schedule.sourceSha256!==source.parentBoardSourceSha256
    ||readback.boardLayoutSha256!==schedule.approvedLayoutSha256
    ||readback.approvedProjectReference!==schedule.approvedProjectReference
    ||readback.exactTdsSha256!==source.sources[0]!.sha256
    ||!readback.approvedSourceFitReference.trim()
    ||!/^[0-9a-f]{64}$/iu.test(readback.approvedEndLayoutSha256))
    fail('TIMBER_END_SAME_BOARD_SOURCE_PROJECT_AND_LAYOUT_REQUIRED');
  if(readback.boards.length!==schedule.boards.length)fail('TIMBER_END_EXACT_INSTALLED_BOARD_CLOSURE_REQUIRED');
  const byId=new Map(schedule.boards.map(board=>[board.boardId,board]));
  const seen=new Set<string>();
  let netEndAreaM2='0';
  for(const board of readback.boards){
    const original=byId.get(board.boardId);
    if(!original||seen.has(board.boardId))fail('TIMBER_END_EXACT_INSTALLED_BOARD_CLOSURE_REQUIRED');
    seen.add(board.boardId);
    if(typeof board.widthMm!=='string'||typeof original.widthMm!=='string'
      ||!isFormulaGraphExactDecimal(board.widthMm)||!isFormulaGraphExactDecimal(original.widthMm)
      ||compareFormulaGraphDecimals(board.widthMm,original.widthMm)!==0)
      fail('TIMBER_END_SAME_INSTALLED_BOARD_WIDTH_REQUIRED');
    const seenEnds=new Set<string>();
    for(const end of board.ends){
      if((end.end!=='START'&&end.end!=='FINISH')||seenEnds.has(end.end))
        fail('TIMBER_END_UNIQUE_OUTER_CUT_ENDS_REQUIRED');
      seenEnds.add(end.end);
      if(!/^[0-9a-f]{64}$/iu.test(end.actualProfileAndCutGeometrySha256)
        ||typeof end.netAreaM2!=='string'||!isFormulaGraphExactDecimal(end.netAreaM2)||compareFormulaGraphDecimals(end.netAreaM2,'0')<=0)
        fail('TIMBER_END_ACTUAL_POSITIVE_NET_CUT_GEOMETRY_REQUIRED');
      netEndAreaM2=evaluateFormulaGraph(addCutEndAreas,{total_area:netEndAreaM2,end_area:end.netAreaM2});
    }
  }
  // Existing scale9 arithmetic: multiplying by3/5 must remain representable.
  // This is a precision boundary, not a supply or normative area quantum.
  if(!isFormulaGraphDecimalMultiple(netEndAreaM2,'0.000000005'))
    fail('TIMBER_END_APPLIED_MASS_EXACT_SCALE9_REQUIRED');
  return {netEndAreaM2,approvedEndLayoutSha256:readback.approvedEndLayoutSha256,
    approvedSourceFitReference:readback.approvedSourceFitReference,exactTdsSha256:readback.exactTdsSha256};
}

export function compileFacadeBoardWithCutEndReadbackR5(schedule:FacadeApprovedBoardScheduleR3,readback:FacadeTimberCutEndReadbackR5,
  options:{rowOverrides?:CanonicalEstimateCompileCoreInput['rowOverrides']}={}) {
  return compileFacadeBoardWithEndProtectionR5(schedule,facadeBoardCutEndFactsR5(schedule,readback),options);
}

export function facadeTimberEndCompletenessR5() {
  const entry=(key:string,title:string,category:string,unitId:string|null)=>{
    const ops=key==='sealer-minimum'?source.operations.filter(o=>['apply','dry-check'].includes(o.key)):source.operations;
    return {expectedResourceId:id('expected:'+key),
    operationId:id('operation:'+ops[0]!.key),requiredOperationIds:ops.map(o=>id('operation:'+o.key)),
    category,unitId,specification:title,condition:'EXACT_THERMOWOOD_ONE_COAT_NET_END_AREA_POSITIVE',sourceId:'gox_facade_timber_end_protection_r5',
    quantityRule:key==='sealer-minimum'?'SOURCE_MINIMUM_APPLIED_MASS_0_6KG_PER_M2_NET_END':'UNRESOLVED_WHOLE_CYCLE_INTERNAL_NORM',
    formulaId:id('formula:'+key),resolution:{kind:'ROW',rowId:id(key)}};};
  return {contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'PRODUCT_SYSTEM_TDS',exactSourceMethodKind:'EXACT_PRODUCT_TDS_AND_SDS_WHOLE_END_PROTECTION_CYCLE',
    generatedFromCurrentRows:false,operationResourceBindingRequired:true,evidenceSha256:source.sources[0]!.sha256,evidenceReferences:source.sources.map(s=>s.url),
    entries:[entry('sealer-minimum','Водный состав для защиты торцов термодревесины','material','kg'),
      ...source.needs.map(n=>entry('need:'+n.key,n.titleRu,n.category,n.unitId))],parentGrossSupplyOwnerRowId:source.parentNeedRowId,
    fullTechnicalAcceptance:false,newFULL:0};
}
