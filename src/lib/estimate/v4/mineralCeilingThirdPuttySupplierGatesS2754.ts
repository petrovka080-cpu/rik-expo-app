import pack from '../../../../data/estimate-benchmarks/source-packs/mineral-ceiling-third-putty-supplier-gates-s27-54.json';
import {ceilingThirdPuttyDefinitionS2754 as original,ceilingThirdPuttySourcePackS2754 as source} from './mineralCeilingThirdPuttyCoatS2754';
import {compileAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

export const ceilingThirdPuttySupplierPackS2754=pack;
export const ceilingThirdPuttySupplierPrefixS2754='ceiling-third-putty:krer150402706';
const prefix=ceilingThirdPuttySupplierPrefixS2754;
export const ceilingThirdPuttyRequiredFactsS2754=['ceiling_substrate','third_coat_project_justification','third_coat_project_reference','room_height_m','room_conditions',pack.scopeParameterId] as const;
type Parameter=AutomaticOwnerDefinition['parameters'][number];
const guideFor=(parameter:Parameter,text:string)=>({...parameter.truth_metadata.guide as Record<string,unknown>,guide_short_ru:text});
const parameters:Parameter[]=original.parameters.map(p=>({...p,
 title_ru:pack.supplierFacts.find(s=>p.parameter_id===s.key+'_quantum')?.quantityTitleRu??p.title_ru,
 required:ceilingThirdPuttyRequiredFactsS2754.includes(p.parameter_id as typeof ceilingThirdPuttyRequiredFactsS2754[number])?true:p.required,
 truth_metadata:{...p.truth_metadata,...(pack.supplierFacts.some(s=>p.parameter_id===s.key+'_quantum')?{guide:guideFor(p,'Укажите документированный допустимый шаг заказа в кг с учётом фактической фасовки и кратности поставщика; это не расход на м².')}:{ }),...(ceilingThirdPuttyRequiredFactsS2754.includes(p.parameter_id as typeof ceilingThirdPuttyRequiredFactsS2754[number])?{value_source_role:'PROJECT_SPECIFIC_INPUT',provenance:{consumer_input_role_v1:'OBJECT_FACT'}}:{})}}));
const textTemplate=parameters.find(p=>p.parameter_id==='third_coat_project_reference')!;
const enumTemplate=parameters.find(p=>p.parameter_id==='ceiling_substrate')!;
parameters.push({...enumTemplate,parameter_id:pack.scopeParameterId,ordinal:parameters.length,title_ru:'Вид строительства, условия производства и высота местности',required:true,constraints_json:{values:[pack.scopeValue]},truth_metadata:{...enumTemplate.truth_metadata,guide:guideFor(enumTemplate,'Подтвердите фактический вид строительства, нормальные условия при положительной температуре и местность ниже1500м. Реконструкция, горные и усложнённые условия этим сценарием не покрываются.'),semantic_parameter_key:prefix+':'+pack.scopeParameterId,value_source_role:'PROJECT_SPECIFIC_INPUT',source_confirmation_required:false,provenance:{consumer_input_role_v1:'OBJECT_FACT'}}});
for(const supplier of pack.supplierFacts)for(const conditional of [false,true]){
 const id=supplier.key+(conditional?'_stock_compatibility_reference':'_supply_specification');
 const condition={kind:'greater_than',parameterId:supplier.key+'_stock',value:0};
 parameters.push({...textTemplate,parameter_id:id,ordinal:parameters.length,title_ru:conditional?supplier.stockTitleRu:supplier.supplyTitleRu,required:!conditional,
  constraints_json:{minLength:1,maxLength:1000,...(conditional?{requiredWhen:condition}:{})},
  truth_metadata:{...textTemplate.truth_metadata,guide:guideFor(textTemplate,conditional?'При положительном наличии укажите проверку его пригодности и соответствия выбранной позиции поставщика. Другой товар не вычитается.':pack.supplierIdentityRuleRu),semantic_parameter_key:prefix+':'+id,value_source_role:conditional?'CONDITIONAL_PROJECT_FACT':'PROJECT_SPECIFIC_INPUT',...(conditional?{required_when:condition}:{}),provenance:{consumer_input_role_v1:'OBJECT_FACT'}}});
}
parameters.push({...textTemplate,parameter_id:pack.abrasive.parameterId,ordinal:parameters.length,title_ru:'Источниковая проверка количества абразива для закупки',required:true,
 truth_metadata:unresolvedApplicationNormTruthR1({...textTemplate.truth_metadata,guide:guideFor(textTemplate,pack.abrasive.reasonRu),semantic_parameter_key:prefix+':'+pack.abrasive.parameterId},pack.abrasive.reasonRu)});
export const ceilingThirdPuttySupplierDefinitionS2754:AutomaticOwnerDefinition={...original,parameters,resources:original.resources.map(resource=>{
 const key=resource.row_id.slice(prefix.length+1),supplier=pack.supplierFacts.find(s=>s.key===key);
 const graph={...resource.resource_graph,inputParameterIds:[...resource.resource_graph.inputParameterIds as string[],pack.scopeParameterId],
  ...(supplier?{titleSpecificationParameterIds:[key+'_supply_specification'],titleSpecificationMode:'APPEND',titleSpecificationSeparator:' — '}:{})};
 if(supplier)graph.inputParameterIds.push(key+'_supply_specification',key+'_stock_compatibility_reference');
 if(key==='abrasive')graph.inputParameterIds.push(pack.abrasive.parameterId);
 const {row_sha256:_sha,...content}=resource,updated={...content,resource_graph:graph,
  ...(key==='abrasive'?{procurement_eligible:false}:{}),source_metadata:{...resource.source_metadata,constructionScope:pack.scopeValue,
   ...(supplier?{supplierIdentityAndCompatibleStockRequired:true,purchaseBalancePreviouslyImplemented:true}:{}),
   ...(key==='abrasive'?{sourceNormQuantityAccepted:false,sourceRole:'SOURCE_QUANTITY_REVIEW_REQUIRED_FOR_PROCUREMENT'}:{}),
   ...(key==='abrasive-consumed'?{sourceNormQuantityAccepted:false,sourceRole:pack.abrasive.sourceRole,normativeTrace:((resource.source_metadata?.normativeTrace??[]) as Record<string,unknown>[]).map(t=>({...t,sourceRole:pack.abrasive.sourceRole,sourceNormQuantityAccepted:false}))}:{})}};
 return {...updated,row_sha256:estimateDeterministicHash(updated)};
})};
export function ceilingThirdPuttySupplierCompletenessMapS2754(){return {
 contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'NORMATIVE_OPERATION_MAP',generatedFromCurrentRows:false,evidenceSha256:source.source.sha256,
 evidenceReferences:[source.source.pdfUrl,'КРЕР15: PDF191–192,15-04-027-06; PDF11 п.1.17',pack.guidance.officialUrl,pack.guidance.locatorRu],
 entries:[...source.resourceTable.map(resource=>({expectedResourceId:'norm:'+resource.resourceCode+':'+resource.id,operationId:resource.operation,category:resource.category,specification:resource.nameRu,condition:pack.scopeRu,sourceId:source.sourceId,unitId:resource.unitId,
  quantityRule:resource.id==='abrasive'?pack.abrasive.sourceRole:'EXACT_OFFICIAL_RATE_PER_100_M2',formulaId:prefix+':formula:'+resource.id+(resource.category==='material'?'-consumed':''),
  resolution:resource.id==='operator'?{kind:'INCLUDED_COMPONENT_ROW',rowId:prefix+':operator',parentRowId:prefix+':lift'}:{kind:'ROW',rowId:prefix+':'+resource.id+(resource.category==='material'?'-consumed':'')}})),
  ...source.resourceTable.filter(r=>r.category==='material').map(r=>({expectedResourceId:'purchase:'+r.id,operationId:r.operation,category:'material',specification:r.nameRu,condition:pack.scopeRu,sourceId:source.sourceId,unitId:r.unitId,quantityRule:r.id==='abrasive'?'SOURCE_QUANTITY_REVIEW_REQUIRED_FOR_PROCUREMENT':'EXISTING_BALANCE_FROM_EXPLICIT_SUPPLIER_AND_COMPATIBLE_STOCK_FACTS',formulaId:prefix+':formula:'+r.id,resolution:{kind:'ROW',rowId:prefix+':'+r.id}})),
  ...source.openAdditionalScope.map(g=>({expectedResourceId:'open:'+g.id,operationId:g.operation,category:g.category,specification:g.nameRu,condition:pack.scopeRu,sourceId:source.sourceId,unitId:g.unitId,quantityRule:'UNRESOLVED_ADDITIONAL_APPLICABILITY_QUANTITY_AND_COST_OWNER',formulaId:prefix+':formula:'+g.id,resolution:{kind:'ROW',rowId:prefix+':'+g.id}}))]
};}
export function compileCeilingThirdPuttySupplierS2754(input:Record<string,unknown>){return compileAutomaticConstructionOwnerR1({catalogId:pack.catalogId,compilerVersion:pack.contract,primaryMeasureParameterId:'ceiling_area_m2',definition:ceilingThirdPuttySupplierDefinitionS2754,submittedParameters:input});}
