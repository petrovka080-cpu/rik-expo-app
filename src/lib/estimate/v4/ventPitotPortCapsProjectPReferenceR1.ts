// WORK-only reference completion. No paid/procurement owner or old-need transition is admitted.
import pack from '../../../../data/estimate-benchmarks/source-packs/vent-pitot-port-caps-project-p-reference-r1.json';
import {roundDuct00101QuantityDefinitionR1,roundDuct00101ScenarioFactsR1,roundDuct00101FactIdsR1,roundDuct00101IndependentCompletenessMapR1} from './galvanizedRoundDuct200Normal00101QuantityR1';
import {buildAutomaticConstructionOwnerR1,type AutomaticParameterSpec,type AutomaticRowSpec,type AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1} from './effectivePurchaseBalanceR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
export const ventPitotCapProjectPackR1=pack;
const selector=pack.selectionParameter,primary=pack.primaryParameter,quantity=pack.countParameter,p=pack.prefix;
const active={kind:'equals' as const,parameterId:selector,value:pack.states.active};
const positive={kind:'greater_than' as const,parameterId:primary,value:0};
const projectIds=pack.projectFacts.map(f=>f.id),balanceIds=pack.balanceFacts.map(f=>f.id);
const sourceFacts=[primary,...roundDuct00101FactIdsR1,...projectIds];
type ProjectFactSpecInput=Readonly<{id:string;titleRu:string;values?:readonly string[];valueType?:string;unitId?:string;min?:number}>;
function projectSpec(f:ProjectFactSpecInput):AutomaticParameterSpec{
 return{id:f.id,title:f.titleRu,kind:'conditional',valueType:Array.isArray(f.values)?'enum':f.valueType==='integer'?'integer':'text',unitId:f.unitId??null,
  ...(Array.isArray(f.values)?{values:f.values}:{}),...(f.min==null?{}:{min:f.min}),requiredWhen:active};
}
export function ventPitotCapProjectReferenceDefinitionR1():AutomaticOwnerDefinition{
 const parent=roundDuct00101QuantityDefinitionR1();
 if(JSON.stringify([parent.parameters.length,parent.formulas.length,parent.resources.length])!==JSON.stringify(pack.parentShape)
  ||pack.printedQuantityToken!=='П'||pack.resourceCode!=='23-1103-0001*'||pack.catalogId!==null||pack.finance.newPaidOwners!==0
  ||!parent.resources.some(r=>r.row_id===pack.targetNeedRowId&&r.source_metadata?.sourceRole==='UNRESOLVED_APPLICATION_NORM'))throw Error('VENT_PITOT_CAP_EXACT_SOURCE_PARENT_REQUIRED');
 const parentIds=new Set(parent.parameters.map(q=>q.parameter_id));
 const localOldFacts:AutomaticParameterSpec[]=roundDuct00101FactIdsR1.map(id=>{
  const q=parent.parameters.find(v=>v.parameter_id===id)!;
  if(!q||!['decimal','integer','text','enum'].includes(q.value_type))throw Error('VENT_PITOT_CAP_PARENT_FACT_REQUIRED:'+id);
  const values=q.constraints_json?.values;
  return{id,title:q.title_ru,kind:'conditional',valueType:q.value_type as AutomaticParameterSpec['valueType'],unitId:q.unit_id??null,
   ...(Array.isArray(values)?{values:values as string[]}:{}),requiredWhen:positive};
 });
 const balance=effectivePurchaseBalanceExpressionsR1({ownerRowId:pack.rowIds.order,orderUnitId:'pcs',consumed:quantity,stock:'vent_pitot_cap_stock_pcs',reserve:'vent_pitot_cap_reserve_pcs',quantum:'vent_pitot_cap_quantum_pcs'});
 const rows:AutomaticRowSpec[]=[
  {rowId:pack.rowIds.consumed,formulaId:p+':formula:project-count',title:'Заглушки питотметражных лючков — отдельное проектное число, справочно',expression:quantity,inputParameterIds:sourceFacts},
  {rowId:pack.rowIds.order,formulaId:p+':formula:order-reference',title:'Справочная потребность в дополнительной поставке заглушек — не заказ',
   expression:'ceil(max(0,'+quantity+'+vent_pitot_cap_reserve_pcs-vent_pitot_cap_stock_pcs)/vent_pitot_cap_quantum_pcs)*vent_pitot_cap_quantum_pcs',inputParameterIds:[...sourceFacts,...balanceIds],...balance.owner},
  {rowId:pack.rowIds.remaining,formulaId:p+':formula:remaining-reference',title:'Справочный остаток той же позиции после установки',expression:balance.remaining,inputParameterIds:[...sourceFacts,...balanceIds],purchaseBalanceOwnerRowId:pack.rowIds.order},
  {rowId:pack.rowIds.free,formulaId:p+':formula:free-reference',title:'Справочное свободное количество сверх сохраняемого резерва',expression:balance.free,inputParameterIds:[...sourceFacts,...balanceIds],purchaseBalanceOwnerRowId:pack.rowIds.order},
 ].map((r):AutomaticRowSpec=>({...r,section:pack.titleRu,category:'material',unitId:'pcs',procurement:false,costTreatment:'INFORMATIONAL_SCOPE',inclusion:{kind:'and',operands:[active,positive]},titleParameterIds:['vent_pitot_cap_designation','vent_pitot_cap_type_designation','vent_pitot_cap_size_designation']}));
 const built=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:p,sourceId:pack.sourceId,normId:pack.normId,
  sourceMetadata:{source_title:pack.titleRu,source_document_version:pack.source.edition,artifact_sha256:pack.source.sha256,definition_hash:pack.source.sha256,exact_locator:pack.source.exactLocatorRu},
  applicabilityRu:'Только явно заданная однородная проектная позиция заглушек питотметражных лючков для той же трассы. П — проектные количество, тип и размер, не норма на площадь. Монтаж уже учтён цельным трудом 00101. Все новые строки справочные без финансового или закупочного допуска.',
  ordinary:[{id:primary,title:'Прежняя отдельно измеренная поверхность трассы',kind:'ordinary',valueType:'decimal',unitId:'m2',min:0}],profile:[],
  conditional:[...localOldFacts,{id:selector,title:'Подтверждена ли проектная позиция заглушек для справочного количества',kind:'conditional',valueType:'enum',unitId:null,values:Object.values(pack.states)},...pack.projectFacts.map(projectSpec),...pack.balanceFacts.map(projectSpec)],
  rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.noAssumptions});
 const addedParameters=built.parameters.filter(q=>!parentIds.has(q.parameter_id)).map((q,index)=>{
  if(q.truth_metadata.visibility_role==='INTERNAL_ONLY')return{...q,ordinal:parent.parameters.length+index};
  const guide=q.truth_metadata.guide;
  if(guide===null||typeof guide!=='object'||Array.isArray(guide))throw Error('VENT_PITOT_CAP_SOURCE_GUIDE_REQUIRED');
  return{...q,ordinal:parent.parameters.length+index,required:false,constraints_json:{...q.constraints_json,...(q.parameter_id===selector?{forbiddenWhen:{kind:'and',operands:[active,{kind:'less_than_or_equal',parameterId:primary,value:0}]}}:{})},
   truth_metadata:{...q.truth_metadata,value_source_role:'PROJECT_SPECIFIC_INPUT',source_confirmation_required:false,provenance:{consumer_input_role_v1:'OBJECT_FACT'},guide:{...guide,
    guide_short_ru:q.title_ru+'; это отдельный проектный факт, не нормативное число, подтверждение выполнения или допуск цены/закупки.'}}};
 });
 const resources=built.resources.map((r,index)=>{
  const formula=built.formulas.find(f=>f.formula_id===r.formula_id)!;const{row_sha256:_old,...body}=r;
  const changed={...body,ordinal:parent.resources.length+index,
   inclusion_ast:{kind:'and',operands:[{kind:'selected',parameterId:selector,value:pack.states.active},positive]},
   resource_graph:{...r.resource_graph,derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:'pcs',parameterIds:[...formula.input_parameter_ids],reasonRu:'Справочный проектный расход и баланс меняются только их явными исходными фактами; ручная строка не допускает коммерческий заказ.'},
    publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,brandAndModelRu:null,specificationRu:'Одна проектная позиция заглушек питотметражных лючков, целые штуки.',
     detailsRu:[pack.source.exactLocatorRu,'Закрывает измерительное отверстие воздуховода для замеров; это не торцевая заглушка и не измерительный прибор.','Монтаж включён в прежний цельный труд 167,86 чел.-ч на 100 м². Дополнительного труда нет.','Показаны проектное количество и справочный баланс. Цена, закупка и поставочная комплектация ещё не допущены; старые потребности сохраняются.']}},
   source_metadata:{...r.source_metadata,automaticGenericPriceInheritanceAllowed:false,sourceRole:'PROJECT_P_QUANTITY_REFERENCE_NO_COMMERCIAL_ADMISSION',
    normativeTrace:[{sourceId:pack.sourceId,normId:pack.normId,resourceCode:pack.resourceCode,printedToken:'П',quantitySource:'EXPLICIT_PROJECT_SCHEDULE_NOT_NORM_RATE',exact_locator:pack.source.exactLocatorRu,source_artifact_sha256:pack.source.sha256}],
    sourceQuantityAccepted:false,projectQuantityNotNorm:true,materialPaymentAdmitted:false,purchase_order_admission:false,newPaidOwner:false,newLabourOwner:false,referenceBalanceOnly:true,balancePhysicalFeasibilityIsNotProcurementAdmission:true,
    originalOpenNeedRetainedExact:pack.targetNeedRowId,commercialAdmissionNeedRowId:pack.parentPrefix+':open:commercial-bom-and-literal-resource-compatibility',full_technical_acceptance:false,publicationAllowed:false}};
  return{...changed,row_sha256:estimateDeterministicHash(changed)};
 });
 // All old parameters/formulas/rows, including the unbound need, remain exact. No transition to a paid owner exists.
 return{...parent,parameters:[...parent.parameters,...addedParameters],formulas:[...parent.formulas,...built.formulas],resources:[...parent.resources,...resources]};
}
/** QA only. Every supplied value/reference is synthetic and provides no actual admission. */
export function ventPitotCapProjectScenarioFactsR1(parentArea:string,count:string,stock:string,reserve:string,quantum:string):Record<string,unknown>{
 const all:readonly ProjectFactSpecInput[]=[...pack.projectFacts,...pack.balanceFacts];
 return{...roundDuct00101ScenarioFactsR1(parentArea),[selector]:pack.states.active,...Object.fromEntries(all.map(f=>[f.id,Array.isArray(f.values)?f.values[0]:f.valueType==='integer'?'0':'QA_ONLY explicit project/reference, not actual site/BOM acceptance'])),
  [quantity]:count,vent_pitot_cap_stock_pcs:stock,vent_pitot_cap_reserve_pcs:reserve,vent_pitot_cap_quantum_pcs:quantum};
}
export function ventPitotCapProjectCompletenessMapR1(){
 const parent=roundDuct00101IndependentCompletenessMapR1();return{...parent,evidenceReferences:[...parent.evidenceReferences,pack.source.exactLocatorRu],entries:[...parent.entries,
  ...Object.entries(pack.rowIds).map(([key,row])=>({expectedResourceId:pack.resourceCode+':'+key,operationId:'project-p-pitot-caps-reference',sourceId:pack.sourceId,condition:'EXPLICIT_HOMOGENEOUS_PROJECT_CAP_REFERENCE_ONLY_NOT_COMMERCIAL_ADMISSION',category:'material',unitId:'pcs',quantityRule:key==='consumed'?'PROJECT_SCHEDULE_INTEGER_NOT_RATE_PER_AREA':'EXISTING_EFFECTIVE_PURCHASE_BALANCE_REFERENCE_ONLY',specification:pack.titleRu,formulaId:p+':formula:'+({consumed:'project-count',order:'order-reference',remaining:'remaining-reference',free:'free-reference'}[key as keyof typeof pack.rowIds]),resolution:{kind:'ROW',rowId:row}}))]};
}
