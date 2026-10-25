import pack from '../../../../data/estimate-benchmarks/source-packs/concrete-krer46-whole-hole-fill-r61.json';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,
 type AutomaticOwnerDefinition,type AutomaticParameterSpec,type AutomaticRowSpec,
 type AutomaticInclusionCondition} from './automaticConstructionOwnerR1';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';

export const holeFillingSourceR61=pack;
export const HOLE_CATALOG_R61='canonical-work:master:concrete_hole_filling_krer46_017';
export const HOLE_SOURCE_R61='kg_krer46_03_017_whole_hole_filling_r61';
export const holeParameterR61=(key:string)=>'hole61_'+key;
export const holeFormulaR61=(rowId:string)=>rowId+':formula';
const p=holeParameterR61;
const systems=[
 {key:'rc-floor',value:'Железобетонное перекрытие'},
 {key:'rc-wall',value:'Железобетонная стена или перегородка'},
 {key:'concrete-wall',value:'Бетонная стена или перегородка'},
] as const;
const columns=pack.columns.filter(c=>c.admittedToConcreteCandidate);
const check=(value:unknown,code:string):void=>{if(!value)throw Error('WHOLE_HOLE_R61_'+code);};
const object=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
export const holeRowPrefixR61=(normId:string)=>'krer46-hole-r61:'+normId.slice(-2)+':';
export const holeNeedParameterR61=(normId:string,key:string)=>p(normId.slice(-2)+'_need_'+key.replaceAll('-','_'));
export const holeOperationR61=(normId:string)=>holeRowPrefixR61(normId)+'operation:whole-fill';
export function holeConditionR61(normId:string):AutomaticInclusionCondition{
 const column=columns.find(c=>c.normId===normId);check(column,'EXACT_CONCRETE_COLUMN');
 if(!column)throw Error('WHOLE_HOLE_R61_COLUMN');
 const system=systems.find(s=>s.key===column.system);check(system,'EXACT_PHYSICAL_SYSTEM');
 if(!system)throw Error('WHOLE_HOLE_R61_SYSTEM');
 const larger=column.maximumSingleOpeningAreaM2==='0.2';
 return{kind:'and',operands:[
  {kind:'equals',parameterId:p('construction_kind'),value:system.value},
  {kind:'greater_than',parameterId:p('net_fill_volume_m3'),value:0},
  {kind:'greater_than',parameterId:p('single_opening_face_m2'),value:larger?0.1:0},
  {kind:'less_than_or_equal',parameterId:p('single_opening_face_m2'),value:larger?0.2:0.1},
 ]};
}
export function holePhysicalInputR61(system:string,volume:string,area:string):Record<string,unknown>{
 const s=systems.find(s=>s.key===system);check(s,'PHYSICAL_INPUT_SYSTEM');
 return{[p('construction_kind')]:s!.value,[p('net_fill_volume_m3')]:volume,[p('single_opening_face_m2')]:area};
}
/** A whole different reconstruction method. It never replaces the GB repair
 * owner, changes an existing card or treats a foundation as a floor. The
 * printed paid cycle remains whole; no productivity is invented per action. */
export function buildConcreteWholeHoleFillingR61():AutomaticOwnerDefinition&Readonly<{
 nativeSourceRowIds:readonly string[];sourceNeedParameterIds:readonly string[];
 identityAdmitted:false;publicationAllowed:false;fullTechnicalAcceptance:false;
}>{
 check(columns.length===6,'SIX_WHOLE_COLUMNS');
 const ordinary:AutomaticParameterSpec[]=[
  {id:p('construction_kind'),title:'Вид существующей конструкции',valueType:'enum',unitId:null,kind:'ordinary',values:systems.map(s=>s.value)},
  {id:p('net_fill_volume_m3'),title:'Чистый объём фактической заделки',valueType:'decimal',unitId:'m3',kind:'ordinary',min:0},
  {id:p('single_opening_face_m2'),title:'Площадь сечения одного отверстия группы',valueType:'decimal',unitId:'m2',kind:'ordinary',min:0.000000001,max:0.2},
 ];
 const active={kind:'greater_than' as const,parameterId:p('net_fill_volume_m3'),value:0};
 const facts:AutomaticParameterSpec[]=[
  {id:p('approved_method_ref'),title:'Проект и ППР полного способа заделки',valueType:'text',unitId:null,kind:'conditional',requiredWhen:active},
  {id:p('approved_scope'),title:'Область реконструкции по проекту',valueType:'enum',unitId:null,kind:'conditional',
   values:['RECONSTRUCTION_OR_APPROVED_ANALOGOUS_SCOPE'],requiredWhen:active},
  {id:p('concrete_class'),title:'Класс бетона выбранной заделки по спецификации',valueType:'enum',unitId:null,kind:'conditional',values:['B15'],requiredWhen:active},
  {id:p('aggregate_mm'),title:'Крупность заполнителя выбранной заделки, мм',valueType:'decimal',unitId:'mm',kind:'conditional',min:20,max:20,requiredWhen:active},
 ];
 const rows:AutomaticRowSpec[]=[],needs:{parameterId:string;rowId:string;normId:string;spec:typeof pack.independentPhysicalNeeds[number]}[]=[];
 const native=new Map<string,{normId:string;spec:typeof columns[number]['nativeRows'][number]}>();
 for(const column of columns){
  const prefix=holeRowPrefixR61(column.normId),condition=holeConditionR61(column.normId);
  for(const row of column.nativeRows){
   native.set(row.nativeRowId,{normId:column.normId,spec:row});
   rows.push({rowId:row.nativeRowId,formulaId:holeFormulaR61(row.nativeRowId),section:'Заделка отверстий в бетоне',
    title:row.titleRu,unitId:row.unitId,category:row.category,
    expression:p('net_fill_volume_m3')+'*'+row.literalRate+'*'+row.exactConversionFactor,
    inclusion:condition,costTreatment:'OWN_COST',procurement:false,
    inputParameterIds:facts.map(f=>f.id)});
  }
  for(const spec of pack.independentPhysicalNeeds){
   if(spec.appliesTo==='REINFORCED_COLUMNS_ONLY'&&column.system==='concrete-wall')continue;
   const parameterId=holeNeedParameterR61(column.normId,spec.key),rowId=prefix+'need:'+spec.key;
   facts.push({id:parameterId,title:spec.titleRu,valueType:'decimal',unitId:spec.unitId,kind:'internal',min:0});
   needs.push({parameterId,rowId,normId:column.normId,spec});
   rows.push({rowId,formulaId:holeFormulaR61(rowId),section:'Полное обеспечение заделки отверстий',title:spec.titleRu,
    unitId:spec.unitId,category:spec.category,expression:parameterId,inclusion:condition,
    costTreatment:'INFORMATIONAL_SCOPE',procurement:false});
  }
 }
 // Only the four actual design/method facts are dependencies of native rows.
 // Source-gap parameters from other profiles must never enter that input list.
 for(let i=0;i<rows.length;i++)if(native.has(rows[i]!.rowId))rows[i]={...rows[i]!,inputParameterIds:[
  p('approved_method_ref'),p('approved_scope'),p('concrete_class'),p('aggregate_mm')]};
 check(native.size===65&&needs.length===168,'INDEPENDENT_WHOLE_NATIVE_AND_PHYSICAL_ROSTER');
 const d=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:'concrete:whole-hole-fill:r61',
  sourceId:HOLE_SOURCE_R61,normId:columns.map(c=>c.normId).join('|'),
  sourceMetadata:{source_title:'Заделка отверстий в бетоне',source_document_version:pack.source.edition,
   definition_hash:pack.source.sha256,artifact_sha256:pack.source.sha256,exact_locator:'КРЕР46-2015, 46-03-017-01–06, PDF49–50; измеритель1м³ заделки; техническая часть1.0,1.14,1.25,2.1'},
  applicabilityRu:'Фактические отверстия до0,2м² в железобетонных перекрытиях и стенах либо бетонных стенах при реконструкции по отдельному проекту. Не ремонтный состав и не фундамент по признаку горизонтальности.',
  ordinary,profile:[],conditional:facts,rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.notTransferred});
 const needByParameter=new Map(needs.map(n=>[n.parameterId,n])),needByRow=new Map(needs.map(n=>[n.rowId,n]));
 const parameters=d.parameters.map(parameter=>{
  const need=needByParameter.get(parameter.parameter_id);
  if(need)return{...parameter,truth_metadata:unresolvedApplicationNormTruthR1(parameter.truth_metadata,
   need.spec.completionAuthority+'; нет автоматически назначенного количества или нового владельца оплаты.')};
  if(ordinary.some(o=>o.id===parameter.parameter_id))return parameter;
  return{...parameter,truth_metadata:{...parameter.truth_metadata,visibility_role:'INTERNAL_ONLY',
   value_source_role:'PROJECT_DOCUMENTATION',provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'}}};
 });
 const resources=d.resources.map(row=>{
  const source=native.get(row.row_id),need=needByRow.get(row.row_id),normId=source?.normId??need?.normId;
  check(normId,'RESOURCE_SOURCE_SCOPE');const column=columns.find(c=>c.normId===normId)!;
  const body={...row,row_sha256:'',resource_graph:{...row.resource_graph,operationCompositionV1:{
   contractVersion:'canonical-operation-resource/v1',groupId:'concrete:whole-hole-fill:r61',groupTitleRu:'Заделка отверстий в бетоне',
   operationId:holeOperationR61(normId!),operationTitleRu:'Полный способ заделки отверстий в бетоне',
   completionCriterionRu:'Выполнен полный исходный состав работ, подтверждены проектная применимость и физическое обеспечение; неизвестные потребности остаются открытыми.'}},
   source_metadata:{...row.source_metadata,sourceRole:source?'EXACT_WHOLE_KG_NATIVE_COLUMN':'UNRESOLVED_APPLICATION_NORM',
    exact_column:normId,source_artifact_sha256:pack.source.sha256,
    includedSourceOperations:column.operations.map(k=>pack.operationTitles[k as keyof typeof pack.operationTitles]),
    noInventedAllocationOfWholeLabour:true,historicalPricesImported:false,fullTechnicalAcceptance:false,
    ...(source?{...(source.spec.category==='equipment'?{normativeResourceCode:source.spec.sourceCode,
      machinePriceCoverageRequired:'FULL_MACHINE_SOURCE_COST',machinePriceOperationScope:'FULL_SOURCE_OPERATION'}:{}),
      nativeSourceCode:source.spec.sourceCode,printedUnit:source.spec.printedUnit,literalRate:source.spec.literalRate,
      exactConversionFactor:source.spec.exactConversionFactor,basis:'1m3 OF ACTUAL NET FILL',
      normativeConsumptionIsNotCompleteSupplyOrFirstStock:true,procurementHeldUntilWholeCompatibleSupplyAndStock: true,
      noIndependentOperatorRowAdmitted:source.spec.category==='equipment'}:{missingAuthority:need!.spec.completionAuthority,
      noNewPaidOrProcurementOwner:true}),
    normativeTrace:object(row.source_metadata)&&Array.isArray(row.source_metadata.normativeTrace)
     ?row.source_metadata.normativeTrace.map((trace:unknown)=>({...object(trace)?trace:{},sourceId:HOLE_SOURCE_R61,
       source_id:HOLE_SOURCE_R61,normId,norm_id:normId})):[]}};
  return{...body,row_sha256:hash(body)};
 });
 const consumers=buildMasterParameterCalculationConsumers({parameters,formulas:d.formulas,resources});
 return{...d,parameters:parameters.map(parameter=>({...parameter,truth_metadata:{...parameter.truth_metadata,
  formula_consumers:consumers.formulaConsumers[parameter.parameter_id],resource_branch_consumers:consumers.resourceConsumers[parameter.parameter_id]}})),
  resources,nativeSourceRowIds:[...native.keys()],sourceNeedParameterIds:needs.map(n=>n.parameterId),
  identityAdmitted:false,publicationAllowed:false,fullTechnicalAcceptance:false};
}
