// WORK source-bound R1. No catalog identity, registry/price admission, writer or on-import I/O.
import pack from '../../../../data/estimate-benchmarks/source-packs/foundation-side-hot-bitumen-two-coats-krer08-003-07-r1.json';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,
 type AutomaticParameterSpec,type AutomaticRowSpec,type AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
export const foundationSideHotBitumenPackR1=pack;
const p=pack.prefix,area=pack.measurement.parameterId;
const positive={kind:'greater_than' as const,parameterId:area,value:0};
export function foundationSideHotBitumenDefinitionR1():AutomaticOwnerDefinition{
 if(pack.normId!=='08-01-003-07'||pack.measurement.sourceBasis!=='100'||!pack.measurement.twoCoatsAlreadyIncluded||pack.catalogId!==null)
  throw Error('FOUNDATION_WATERPROOFING_EXACT_SOURCE_AND_PENDING_IDENTITY_REQUIRED');
 const context=pack.scopeFacts.map(f=>f.id);
 const conditional:AutomaticParameterSpec[]=pack.scopeFacts.map((f):AutomaticParameterSpec=>({id:f.id,title:f.titleRu,kind:'conditional',
  valueType:Array.isArray(f.values)?'enum':'text',unitId:null,...(Array.isArray(f.values)?{values:f.values}:{}),requiredWhen:positive}));
 const rows:AutomaticRowSpec[]=[];
 const add=(id:string,title:string,category:string,unitId:string,rate:string,extra:Partial<AutomaticRowSpec>={})=>rows.push({
  rowId:p+':'+id,formulaId:p+':formula:'+id,title,section:pack.titleRu,category,unitId,expression:area+'*'+rate+'/100',
  inputParameterIds:context,procurement:false,formulaOutputBounds:{schemaVersion:'canonical_formula_output_bounds_v1',unitId,exclusiveMinimum:0,reasonRu:'Положительная площадь применимого двухслойного покрытия требует положительного исходного ресурса.'},...extra});
 add(pack.worker.id,pack.worker.titleRu,'labor','man_hour',pack.worker.ratePer100M2);
 for(const machine of pack.machines)add(machine.id,machine.titleRu+' — норма количества, состав оплачиваемой эксплуатации не допущен','equipment',machine.unitId,machine.ratePer100M2,{costTreatment:'INFORMATIONAL_SCOPE'});
 for(const material of pack.materials)add(material.id,material.titleRu+' — исходный расход, не коммерческий заказ','material',material.unitId,material.ratePer100M2,{costTreatment:'INFORMATIONAL_SCOPE'});
 for(const operation of pack.includedOperations)rows.push({rowId:p+':'+operation.id,formulaId:p+':formula:'+operation.id,
  title:operation.titleRu,section:pack.titleRu,category:'work',unitId:'m2',expression:area,inputParameterIds:context,procurement:false,costTreatment:'INCLUDED_IN_RESOURCE_ROWS'});
 for(const gap of pack.sourceNeeds){const id='unresolved_waterproofing_'+gap.id.replaceAll('-','_');
  conditional.push({id,title:gap.titleRu,kind:'conditional',valueType:'decimal',unitId:null,min:0});
  rows.push({rowId:p+':open:'+gap.id,formulaId:p+':formula:open:'+gap.id,title:gap.titleRu,section:'Открытая потребность: '+pack.titleRu,
   category:'service',unitId:'',expression:id,inputParameterIds:context,procurement:false});}
 const built=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:p,sourceId:pack.sourceId,normId:pack.normId,
  sourceMetadata:{source_title:pack.titleRu,source_document_version:pack.source.edition,artifact_sha256:pack.source.sha256,definition_hash:pack.source.sha256,exact_locator:pack.source.exactLocatorRu},
  applicabilityRu:'Только боковая обмазочная битумная гидроизоляция в два слоя по готовой выровненной бутовой/кирпичной/бетонной поверхности; грунтовка и разогрев в цельном труде. Площадь отдельным обмером. Машины и материалы справочные до отдельного допуска оплаты и поставки.',
  ordinary:[{id:area,title:'Отдельно измеренная изолируемая боковая поверхность стены/фундамента, м²; два слоя уже учтены',kind:'ordinary',valueType:'decimal',unitId:'m2',min:0}],profile:[],conditional,rows,
  deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:[
   'Не применять горизонтальную01/02/03, оклеечную05/06, выравнивание08, FLEXIGUM09–12 или мокрую зону по сходству названия.',
   'Два слоя и грунтовка включены в колонку007; труд и расход не умножаются ещё на2, дополнительный слой не масштабируется.',
   'Не выводить площадь из объёма, площади пола, длины стены или площади основания без отдельной ведомости.',
   'Не назначать толщину, плотность, литры, тару, топливо, время выдержки, оператора, отходы или отдельную подготовку по умолчанию.',
   'Отсутствие отдельной нормы машиниста в007 не доказывает состав машинной ставки. Справочная строка не превращается в оплачиваемую машину или заказ от цены77.',
   'Нет второго оплачиваемого грунтования/разогрева/нанесения: исходный труд21.20ч/100м² остаётся целым.']});
 return{...built,parameters:built.parameters.map(q=>{
  const gap=q.parameter_id.startsWith('unresolved_waterproofing_');
  if(gap)return{...q,required:false,truth_metadata:unresolvedApplicationNormTruthR1(q.truth_metadata,'Нужны подтверждённые применимость, источник единицы/объёма и отдельный владелец оплаты. Ручные0/1/77 или числовая цена не закрывают эту потребность.')};
  const guide=q.truth_metadata.guide;
  if(guide===null||typeof guide!=='object'||Array.isArray(guide))throw Error('WATERPROOFING_SOURCE_GUIDE_REQUIRED');
  return{...q,required:q.parameter_id===area,...(q.parameter_id===area?{constraints_json:{...q.constraints_json,min:0,exclusiveMin:0}}:{}),
   truth_metadata:{...q.truth_metadata,value_source_role:q.parameter_id===area?'USER_INPUT':'PROJECT_SPECIFIC_INPUT',source_confirmation_required:false,
    provenance:{consumer_input_role_v1:q.parameter_id===area?'OBJECT_GEOMETRY':'OBJECT_FACT'},guide:{...guide,
     guide_short_ru:q.parameter_id===area?'Площадь отдельно измеренной боковой изоляции. Норма100м² уже включает2слоя, грунтовку и разогрев; без дополнительного множителя.':'Подтвердите фактические условия объекта и проектную границу. Иной материал, метод, число слоёв или неподготовленное основание требуют другой нормы; введённое подтверждение не заменяет проектирование.'}}};
 }),resources:built.resources.map(r=>{
  const key=r.row_id.slice(p.length+1),gap=pack.sourceNeeds.find(g=>key==='open:'+g.id),included=pack.includedOperations.some(o=>o.id===key);
  const sourceMetadata=r.source_metadata;
  if(sourceMetadata===null)throw Error('WATERPROOFING_SOURCE_METADATA_REQUIRED');
  const machine=pack.machines.find(m=>m.id===key),material=pack.materials.find(m=>m.id===key);
  const worker=key===pack.worker.id,formula=built.formulas.find(f=>f.formula_id===r.formula_id)!;
  const{row_sha256:_old,...body}=r;
  const updated={...body,cost_owner_id:included?p+':'+pack.worker.id:r.cost_owner_id,
   resource_graph:{...r.resource_graph,
    ...(!gap?{derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:r.unit_id,parameterIds:[...formula.input_parameter_ids],reasonRu:'Точные исходные количества меняются только отдельным фактом площади; цена/ручная строка не меняет колонку007.'}}:{}),
    ...(included?{parentCostOwnerId:p+':'+pack.worker.id,includedInResourceOwnerRowId:p+':'+pack.worker.id}:{}),
    publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,brandAndModelRu:null,specificationRu:material?.titleRu??machine?.titleRu??null,
     detailsRu:gap?[gap.nextTaskRu,'Ответственный: '+gap.ownerTitleRu]:[pack.source.exactLocatorRu,'Грунтовка и два слоя с разогревом относятся к одному целому труду21.20ч/100м².',
      ...(material?['Буквальный расход '+material.ratePer100M2+' '+(material.unitId==='t'?'т':'кг')+' на100м²; не плотность, рецепт смешения, готовая грунтовка или коммерческая тара.']:[]),
      ...(machine?['Состав ставки и роль обслуживающего персонала не подтверждены. Показаны только нормативные машино-часы; отдельные часы или оплата машиниста не назначены.']:[])]}},
   source_metadata:{...sourceMetadata,normativeTrace:gap?[]:sourceMetadata.normativeTrace,
    sourceRole:gap?'UNRESOLVED_APPLICATION_NORM':worker?'OFFICIAL_WHOLE_LABOUR_NORM':included?'INCLUDED_WHOLE_LABOUR_STEP':machine?'SOURCE_MACHINE_QUANTITY_PRICE_SCOPE_PENDING':'SOURCE_MATERIAL_QUANTITY_COMMERCIAL_SCOPE_PENDING',
    sourceCode:worker?pack.worker.code:machine?.code??material?.code??null,official_url:pack.source.officialUrl,source_artifact_sha256:pack.source.sha256,
    exact_column:pack.normId,exact_locator:pack.source.exactLocatorRu,...(!worker?{automaticGenericPriceInheritanceAllowed:false}:{}),
    ...(machine?{machinePriceScopePending:true,operatorRoleNotAdmitted:true,noAdditionalOperatorInferred:false,priceScopeNeedRowId:p+':open:machine-price-scope'}:{}),
    ...(material?{commercialProcurementAdmitted:false,commercialAdmissionNeedRowId:p+':open:commercial-supply-stock'}:{}),
    quantityUnitUnconfirmed:!!gap,full_technical_acceptance:false,identityClassificationPending:true}};
  return{...updated,row_sha256:estimateDeterministicHash(updated)};
 })};
}
/** Synthetic QA facts only. No runtime defaults, actualsite evidence or proposedID. */
export function foundationSideHotBitumenSyntheticFactsR1(areaValue='100'):Record<string,unknown>{
 return{[area]:areaValue,...Object.fromEntries(pack.scopeFacts.map(f=>[f.id,Array.isArray(f.values)?f.values[0]:'QA_ONLY explicit accepted source-compatible project/measurement boundary reference']))};
}
export function foundationSideHotBitumenCompletenessMapR1(){
 const source=[pack.worker,...pack.machines,...pack.materials];
 return{contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'NORMATIVE_OPERATION_MAP',generatedFromCurrentRows:false,evidenceSha256:pack.source.sha256,
  evidenceReferences:[pack.source.officialUrl,pack.source.exactLocatorRu],entries:[
   ...source.map(s=>({expectedResourceId:pack.normId+':'+s.code,operationId:'side-hot-two-coats',sourceId:pack.sourceId,condition:'EXACT_SOURCE007_PREPARED_SIDE_SURFACE_TWO_COATS_HOT_METHOD',category:s.id===pack.worker.id?'labor':pack.machines.some(m=>m.id===s.id)?'equipment':'material',unitId:s.unitId,
    quantityRule:'PRINTED_RATE_PER100_M2_TWO_COATS_ALREADY_INCLUDED',specification:s.titleRu,formulaId:p+':formula:'+s.id,resolution:{kind:'ROW',rowId:p+':'+s.id}})),
   ...pack.includedOperations.map(o=>({expectedResourceId:pack.normId+':'+o.id,operationId:'side-hot-two-coats',sourceId:pack.sourceId,condition:'WHOLE_LABOUR_ONCE',category:'work',unitId:'m2',quantityRule:'INCLUDED_STEP_NO_SECOND_PAID_OWNER',formulaId:p+':formula:'+o.id,resolution:{kind:'INCLUDED_COMPONENT_ROW',rowId:p+':'+o.id,parentRowId:p+':'+pack.worker.id}})),
   ...pack.sourceNeeds.map(g=>({expectedResourceId:pack.normId+':open:'+g.id,operationId:g.id,sourceId:pack.sourceId,condition:'PROJECT_APPLICABILITY_AND_SOURCE_OWNER_REQUIRED',category:'service',unitId:null,quantityRule:'UNRESOLVED_SOURCE_NOT0_1',specification:g.nextTaskRu,formulaId:p+':formula:open:'+g.id,resolution:{kind:'ROW',rowId:p+':open:'+g.id}}))]};
}
