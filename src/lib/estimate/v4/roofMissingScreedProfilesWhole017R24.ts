import assert from 'node:assert/strict';
import asphalt from '../../../../data/estimate-benchmarks/source-packs/roof-screed-native01703-r24.json';
import correction from '../../../../data/estimate-benchmarks/source-packs/roof-screed-native01704-r24.json';
import sheets from '../../../../data/estimate-benchmarks/source-packs/roof-screed-native01705-r24.json';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticOwnerDefinition,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {sourcePinnedRoofNormOwnerR1,type SourcePinnedRoofNormPackR1,type SourcePinnedRoofNormRateR1} from './sourcePinnedRoofNormOwnerR1';
import {canonicalEstimateStableJson} from '../backendPlatform/canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from '../backendPlatform/canonicalEstimateSha256';
import {resolveInclusionGraph} from '../backendPlatform/inclusionGraph';
import {canonicalConditionParameterIds} from '../backendPlatform/canonicalEffectiveResourceQuantityV1';
import type {CanonicalEstimateOperationReference} from '../backendPlatform/canonicalEstimateOperationComposition';

type Json=Record<string,unknown>;
const object=(v:unknown):v is Json=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const hash=(v:unknown)=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(v));
const c=asphalt.controls;
const selected={kind:'equals' as const,parameterId:c.method,value:asphalt.methodChoice};
export const roofMissing017NativeR24={asphalt,correction,sheets};
function checkRefs(d:AutomaticOwnerDefinition){const declared=new Set(d.parameters.map(p=>p.parameter_id));for(const r of d.resources){resolveInclusionGraph(r.inclusion_ast,{});for(const id of canonicalConditionParameterIds(r.inclusion_ast))assert(declared.has(id));}}

/** Combine source03 + signed source04 in six final resources. Native04 is
 * never a separately paid negative stock/material row. Existing compiler
 * formula-output bounds reject negative final quantities, not a new evaluator. */
export function buildRoofAsphaltScreedWhole0170304R24(sourceKey:string):AutomaticOwnerDefinition{
 assert.equal(sourceKey,asphalt.sources[0]!.id,'SCREED017_NEW_SOURCE_IDENTITY_REVIEW_HOLD');
 assert.equal(correction.baseNormId,asphalt.normId);assert.equal(correction.sourceThicknessStepMm,'1');
 const rows:AutomaticRowSpec[]=asphalt.rates.map(rate=>{
  const delta=correction.rates.find(r=>r.resourceCode===rate.resourceCode);
  const multiplier=delta?'('+rate.per100m2+'+('+c.thickness+'-15)*'+delta.per100m2Per1mm+')':rate.per100m2;
  assert(rate.costTreatment==='OWN_COST'||rate.costTreatment==='INFORMATIONAL_SCOPE');
  return{rowId:asphalt.prefix+':'+rate.role,formulaId:asphalt.prefix+':formula:'+rate.role,title:rate.titleRu,unitId:rate.unitId,category:rate.category,
   section:asphalt.groupTitleRu,expression:c.area+'/100*'+multiplier,procurement:false,
   costTreatment:rate.costTreatment==='INFORMATIONAL_SCOPE'?'INFORMATIONAL_SCOPE':'OWN_COST',
   inclusion:{kind:'and',operands:[selected,{kind:'equals',parameterId:c.project,value:asphalt.projectChoice}]},
   formulaOutputBounds:{schemaVersion:'canonical_formula_output_bounds_v1',unitId:rate.unitId,minimum:0,
    reasonRu:'Исходная поправка толщины даёт отрицательный итог ресурса. Требуется проверить применимость01703/04;отрицательная закупка или скрытая замена нормы недопустимы.'}};
 });
 const base=buildAutomaticConstructionOwnerR1({contract:asphalt.contract,semanticOwner:asphalt.prefix,sourceId:sourceKey,normId:asphalt.normId+'+'+correction.normId,
  sourceMetadata:{source_title:asphalt.sources[0]!.titleRu,source_document_version:asphalt.sources[0]!.printedEdition,definition_hash:asphalt.sources[0]!.sha256,
   artifact_sha256:asphalt.sources[0]!.sha256,exact_locator:asphalt.sources[0]!.locators},applicabilityRu:asphalt.scopeRu,
  ordinary:[{id:c.area,title:'Площадь выполняемой асфальтобетонной стяжки,м²',valueType:'decimal',unitId:'m2',kind:'ordinary',min:0},
   {id:c.thickness,title:'Проектная толщина асфальтобетонной стяжки,мм',valueType:'decimal',unitId:'mm',kind:'ordinary',min:0},
   {id:c.method,title:'Собственный способ асфальтобетонной стяжки',valueType:'enum',unitId:null,kind:'ordinary',values:[asphalt.methodChoice,'Применимость ещёнепроверена']}],profile:[],
  conditional:[{id:c.project,title:'Точная асфальтобетонная смесь,основание иобмер стяжки',valueType:'enum',unitId:null,kind:'internal',values:[asphalt.projectChoice],requiredWhen:selected}],
  rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:asphalt.remainingScopeRu});
 const parameters:AutomaticOwnerDefinition['parameters']=base.parameters.map(p=>{
  const internal=p.parameter_id===c.project;
  const mustBePositive=p.parameter_id===c.area||p.parameter_id===c.thickness;
  return{...p,required:false,default_value:null,constraints_json:mustBePositive?{...p.constraints_json,requiredWhen:selected,
   forbiddenWhen:{kind:'and',operands:[selected,{kind:'less_than_or_equal',parameterId:p.parameter_id,value:0}]}}:p.constraints_json,
   truth_metadata:{...p.truth_metadata,visibility_role:internal?'INTERNAL_ONLY':'USER_INPUT',value_source_role:internal?'PROJECT_DOCUMENTATION':mustBePositive?'USER_MEASURED':'PROJECT_SPECIFIC_INPUT',
    source_confirmation_required:internal,provenance:{...(object(p.truth_metadata.provenance)?p.truth_metadata.provenance:{}),consumer_input_role_v1:internal?'APPLICATION_TECHNICAL':'OBJECT_FACT'}}};
 });
 const resources=base.resources.map(row=>{
  const rate=asphalt.rates.find(r=>row.row_id===asphalt.prefix+':'+r.role);assert(rate);const rateMetadata:unknown=rate;assert(object(rateMetadata));const delta=correction.rates.find(r=>r.resourceCode===rate.resourceCode);
  const refs=rate.requiredOperationKeys.map(key=>{const op=asphalt.printedOperationRoster.find(o=>o.key===key);assert(op);return{
   operationId:asphalt.prefix+':operation:'+key,operationTitleRu:op.titleRu,processOrdinal:op.printedOrdinal,
   completionCriterionRu:'Собственный состав01703/04 выполнен;готовое основание не создаёт несущую конструкцию,фактическаяприёмка отдельно.'};});assert(refs.length>0);
  const operation:CanonicalEstimateOperationReference={contractVersion:'canonical-operation-resource/v1',groupId:asphalt.prefix,groupTitleRu:asphalt.groupTitleRu,
   ...refs[0]!,...(refs.length>1?{additionalOperations:refs.slice(1)}:{})};
  const{row_sha256:_old,...body}=row;const result={...body,
   source_metadata:{...row.source_metadata,exactSourceBaseNormId:asphalt.normId,sourceBaseRatePer100m2:rate.per100m2,
    baseSourceLocator:'PDF28/table017/column03',...(delta?{exactDeltaNormId:correction.normId,sourceDeltaRatePer100m2Per1mm:delta.per100m2Per1mm,deltaSourceLocator:'PDF28/table017/column04'}:{}),
    sourceCorrectionAbsenceMeansNoExtraTerm:!delta,normativeResourceCode:rate.resourceCode,sourceNormUnit:rate.sourceUnit,
    machinePriceCoverageRequired:rateMetadata.machinePriceCoverageRequired??null,full_technical_acceptance:false},
   resource_graph:{...row.resource_graph,operationCompositionV1:operation,publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',nameRu:row.title_ru,sourceTitleRu:rate.sourceInternalTitleRu,
    detailsRu:[asphalt.scopeRu,'01704 — поправка того же ресурса на1мм;отдельной закупки/оплаты отрицательных строк нет.']}}};
  return{...result,row_sha256:hash(result)};
 });
 const result={...base,parameters,resources};assert.deepEqual([parameters.length,base.formulas.length,resources.length],[4,6,6]);checkRefs(result);return result;
}

/** Ten literal source05 rows stay behind UNRESOLVED_APPLICATION_NORM.
 * Source says steel1mm in operations versus0.7mm/0.0098t in material row;
 * project facts and user confirmations cannot resolve that contradiction. */
export function buildRoofPrefabSheetScreedWhole01705R24(sourceKey:string):AutomaticOwnerDefinition{
 assert.equal(sourceKey,sheets.sources[0]!.id,'SCREED01705_SOURCE_IDENTITY_REVIEW_HOLD');
 const input:SourcePinnedRoofNormPackR1={...sheets,measurementUnitId:'m2',rates:sheets.rates.map((r):SourcePinnedRoofNormRateR1=>{
  assert(r.costTreatment==='OWN_COST'||r.costTreatment==='INFORMATIONAL_SCOPE');return{...r,costTreatment:r.costTreatment==='INFORMATIONAL_SCOPE'?'INFORMATIONAL_SCOPE':'OWN_COST'};
 })};
 const base=sourcePinnedRoofNormOwnerR1(input),gate=sheets.sourceConflictGate;
 const extra=buildAutomaticConstructionOwnerR1({contract:'roof01705-unresolved-source-steel-thickness/r24',semanticOwner:sheets.prefix,sourceId:sourceKey,normId:'SOURCE_STEEL_THICKNESS_CONTRADICTION',
  sourceMetadata:{source_title:sheets.sources[0]!.titleRu,source_document_version:sheets.sources[0]!.printedEdition,definition_hash:sheets.sources[0]!.sha256,
   artifact_sha256:sheets.sources[0]!.sha256,exact_locator:sheets.sources[0]!.locators},applicabilityRu:sheets.sourceConflictReason,
  ordinary:[],profile:[],conditional:[{id:gate.parameterId,title:'Разрешённое первичным источником соответствие прокладок и стали01705',valueType:'enum',unitId:null,kind:'internal',values:[gate.value]}],rows:[],
  deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:[sheets.sourceConflictReason]});
 const choose={kind:'equals',parameterId:sheets.systemParameterId,value:sheets.systemYesRu};
 const parameters:AutomaticOwnerDefinition['parameters']=[...base.parameters,...extra.parameters.map(p=>({...p,required:false,default_value:null,
  constraints_json:{...p.constraints_json,requiredWhen:choose},truth_metadata:unresolvedApplicationNormTruthR1(p.truth_metadata,sheets.sourceConflictReason)}))].map((p,ordinal)=>({...p,ordinal}));
 const resources=base.resources.map(row=>{
  const rate=sheets.rates.find(r=>row.row_id===sheets.prefix+':'+r.role);assert(rate);
  const refs=rate.requiredOperationKeys.map(k=>{const op=sheets.printedOperationRoster.find(o=>o.key===k);assert(op);return{
   operationId:sheets.prefix+':operation:'+k,operationTitleRu:op.titleRu,processOrdinal:op.printedOrdinal,completionCriterionRu:'Собственная операция01705;SOURCEsteel conflict/точная система/приёмка не разрешены.'};});assert(refs.length>0);
  const operation:CanonicalEstimateOperationReference={contractVersion:'canonical-operation-resource/v1',groupId:sheets.prefix,groupTitleRu:sheets.groupTitleRu,...refs[0]!,...(refs.length>1?{additionalOperations:refs.slice(1)}:{})};
  const{row_sha256:_old,...body}=row;const result={...body,inclusion_ast:{kind:'and',operands:[row.inclusion_ast,{kind:'equals',parameterId:gate.parameterId,value:gate.value}]},
   source_metadata:{...row.source_metadata,exactSourceNormId:sheets.normId,sourceSteelThicknessConflict:sheets.sourceConflictReason,sourceResolutionIsNotProjectFact:true},
   resource_graph:{...row.resource_graph,operationCompositionV1:operation,
    publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',nameRu:row.title_ru,sourceTitleRu:rate.sourceInternalTitleRu,detailsRu:[sheets.scopeRu,sheets.sourceConflictReason]},
    ...(rate.role==='boiler400l'?{roofSharedBoilerBoundaryR24:{physicalStockOwnerRowId:'roof:flat003006:r24:stock:boiler-400l',physicalQuantity:null,nativeBudgetUnit:'machine_hour',physicalStockUnit:'pcs',noConversionFromHours:true,noSecondOperatingPayment:true}}:{})}};
  return{...result,row_sha256:hash(result)};
 });
 const result={...base,parameters,resources};assert.deepEqual([parameters.length,base.formulas.length,resources.length],[5,10,10]);checkRefs(result);return result;
}
