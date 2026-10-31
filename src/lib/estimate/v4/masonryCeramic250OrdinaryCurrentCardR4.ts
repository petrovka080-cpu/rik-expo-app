import {applyMasonryCeramic250RelatedConsumerGatesR4} from './masonryCeramic250RelatedConsumerGatesR4';
import kg from '../../../../data/estimate-benchmarks/source-packs/masonry-wall-krer08-systems-r1.json';
import whole from '../../../../data/estimate-benchmarks/source-packs/masonry-ceramic250-whole-family-composition-r2.json';
import lift from '../../../../data/estimate-benchmarks/source-packs/masonry-m50-effective-lift-correction-r4.json';
import {MASONRY_M50_WHOLE_CYCLE_R2 as flow,masonryM50CycleCapturedRepresentativeR2 as capturedParent} from './masonryReadyM50WholeSupplyCycleR2';
import {buildMasonryCeramic250SharedWholeReuseR4} from './masonryCeramic250SharedWholeReuseR4';
import {applyMasonryCeramic250NormObjectBoundaryR4} from './masonryCeramic250NormObjectBoundaryR4';
import {applyMasonryCeramic250WholeSourceKitCountsR4} from './masonryCeramic250WholeSourceKitCountsR4';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput,type CanonicalEstimateParameterDefinition,type CanonicalEstimateFormulaDefinition,type CanonicalEstimateResourceDefinition} from '../backendPlatform/canonicalEstimateCompileCore';
import {compileFormulaGraph} from '../backendPlatform/formulaGraph';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
import {canonicalEstimateStableJson} from '../backendPlatform/canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from '../backendPlatform/canonicalEstimateSha256';
import {canonicalDefinitionPublicationStableValueR1 as publicationStable} from '../backendPlatform/canonicalDefinitionPublicationStableValueR1';
import type {PurchaseGroupRepresentative as Rep} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';

export const MASONRY_CERAMIC250_PRIMARY_VOLUME_R4='masonry_brick_r4_net_volume_m3';
export const MASONRY_CERAMIC250_ORDINARY_CONTRACT_R4='gox-build.masonry-ceramic250-current-card-whole-reuse/r4';
export const MASONRY_CERAMIC250_SIMPLE_GEOMETRY_R4=['m33_masonry_wall_length_m','m33_masonry_wall_height_m','m33_masonry_openings_area_m2','m33_masonry_nonmasonry_insert_volume_m3','m33_masonry_storey_height_m'] as const;
const [L,H,A,I,S]=MASONRY_CERAMIC250_SIMPLE_GEOMETRY_R4;
const selected={kind:'selected',parameterId:flow.parentSelector,value:flow.parentSelectedValue};
const volume='('+L+'*'+H+'-'+A+')*0.25-'+I;
export const MASONRY_CERAMIC250_SOURCE_PROFILE_R4={[flow.parentSelector]:flow.parentSelectedValue,[flow.selectorId]:flow.selectorValue,[whole.selectorId]:whole.selectorValue};
const record=(value:unknown):Record<string,unknown>=>value!=null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};

/** The existing whole factory, quantities and sole commercial owners are
 * retained. This ordinary profile owns only the source choice; actual project
 * documents/passports are separate trusted imports, never synthetic defaults. */
export function buildMasonryCeramic250OrdinaryCurrentCardR4(parent:Rep):Rep{
 // The accepted whole component remains immutable. This new ordinary adapter
 // first checks the full captured source using publication serialization;
 // rounded calculation hashes do not certify source/baseline/passport evidence.
 const exact=(value:Rep)=>JSON.stringify(publicationStable({definition:value.definition,baseline:value.baseline,parameters:value.parameters,formulas:value.formulas,resources:value.resources,passport:value.passport,bindings:value.bindings}));
 if(exact(parent)!==exact(capturedParent()))throw Error('MASONRY_BRICK_R4_CURRENT_SOURCE_DRIFT');
 const result=applyMasonryCeramic250WholeSourceKitCountsR4(applyMasonryCeramic250NormObjectBoundaryR4(buildMasonryCeramic250SharedWholeReuseR4(parent))),simple=new Set<string>(MASONRY_CERAMIC250_SIMPLE_GEOMETRY_R4),selectors=new Set(Object.keys(MASONRY_CERAMIC250_SOURCE_PROFILE_R4));
 const primary=MASONRY_CERAMIC250_PRIMARY_VOLUME_R4;
 for(const parameter of result.parameters){
  const id=parameter.parameter_id,prior=structuredClone(parameter.truth_metadata),isGeometry=simple.has(id),isSelector=selectors.has(id);
  parameter.default_value=null;parameter.required=false;
  if(isGeometry){
   // This new definition has one exact source profile. Client geometry cannot
   // depend on an INTERNAL selector which its user-only validator never merges.
   parameter.required=true;
   parameter.constraints_json={...parameter.constraints_json,requiredWhen:{kind:'literal',value:true},...(id===S?{max:4}:{}),...(id===A?{forbiddenWhen:{kind:'formula_greater_than',expression:A+'-'+L+'*'+H,unitId:'m2',value:0}}:{}),...(id===I?{forbiddenWhen:{kind:'formula_greater_than',expression:I+'-('+L+'*'+H+'-'+A+')*0.25',unitId:'m3',value:0}}:{})};
   parameter.truth_metadata={...prior,visibility_role:'USER_INPUT',value_source_role:'USER_INPUT',visible_when:{kind:'literal',value:true},provenance:{...record(prior.provenance),consumer_input_role_v1:'OBJECT_FACT',capturedGeometryTruthV1:{definitionId:parent.definition.id,truth:prior}},guide:{...record(prior.guide),guide_kind:'MEASUREMENT_RULE',source_role:'USER_SUPPLIED_PRIMARY_FACT',guide_short_ru:parameter.title_ru+': фактическое измерение. Норма и состав ресурсов выбраны приложением; иной материал не вычитается повторно как проём.'}};
   continue;
  }
  const current=String(prior.value_source_role),derived=current==='COMPILER_DERIVED_RESOURCE_QUANTITY',unresolved=current==='UNRESOLVED_APPLICATION_NORM';
  const role=derived||unresolved?current:isSelector?'SOURCE_BACKED_PRELIMINARY_PROFILE':id==='m50c2_density_kg_m3'?'MANUFACTURER_CONFIRMED':/^m50c2_(returned|waste)_mortar_kg$/.test(id)?'SITE_SURVEY':/(?:allowable|available|payload|handler_mass|eye_mm|loaded_kg)/.test(id)?'SELECTED_EQUIPMENT_PASSPORT':id==='mcf2_panel_count'?'ENGINEERING_DESIGN':'PROJECT_DOCUMENTATION';
  parameter.truth_metadata={...prior,visibility_role:'INTERNAL_ONLY',value_source_role:role,visible_when:{kind:'literal',value:false},provenance:{...record(prior.provenance),consumer_input_role_v1:'APPLICATION_TECHNICAL',capturedTechnicalTruthV1:{definitionId:parent.definition.id,truth:prior}},guide:{...record(prior.guide),source_role:role,guide_short_ru:isSelector?'Приложение выбирает точный прежний целый способ. Выбор не подтверждает проект, наличие и исполнение.':unresolved?'Неизвестная норма приложения остаётся незаполненной и не становится пользовательским вопросом.':'Отдельный привязанный документ, паспорт или измерение; обычная форма не запрашивает технический состав.'}};
  if(id===flow.parentSelector)parameter.constraints_json={...parameter.constraints_json,values:[flow.parentSelectedValue]};
 }
 result.parameters.push({parameter_id:primary,ordinal:result.parameters.length,title_ru:'Объём кирпичной кладки за вычетом проёмов и иных вставок',value_type:'decimal',unit_id:'m3',required:false,default_value:null,constraints_json:{min:0},truth_metadata:{contract:MASONRY_CERAMIC250_ORDINARY_CONTRACT_R4,semantic_parameter_key:result.definition.catalog_id+':'+primary,synthetic:false,hidden_default_forbidden:true,visibility_role:'INTERNAL_ONLY',value_source_role:'VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE',runtime_profile_classification:'PRELIMINARY_SOURCE_FORMULA',runtime_profile_value:true,source_confirmation_required:false,preliminary_compilation_allowed:true,provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'},derived_from:[L,H,A,I],preliminary_value_formula_v1:{version:'canonical-preliminary-parameter-formula:v1',expression:volume,when:selected,explicitValuePolicy:'REQUIRE_MATCH'},guide:{guide_kind:'DERIVED_VALUE_RULE',guide_version:MASONRY_CERAMIC250_ORDINARY_CONTRACT_R4,guide_validation_policy:'MANDATORY_BLOCK',verified_at:'2026-10-23',applicability:'Exact ceramic250/M50/storey<=4m source geometry; no country conformity claim',source_role:'SOURCE_BACKED_PRELIMINARY_PROFILE',source_document:kg.source.path,source_snapshot_hash:kg.source.sha256,source_locator:'КРЕР08-2015 PDF8§2.3/2.5;08-02-001-07,250mm wall: netV=(L*H-openings)*0.25-other-material-inserts',guide_short_ru:'Объём считается из длины, высоты, площади проёмов и объёма отдельных конструкций другого материала. Проём и вставка не вычитаются дважды.'},normative_links:[{sourceId:kg.sourceId,documentTitleRu:'КРЕР08-2015, конструкции из кирпича и блоков',editionStatus:'KG2015; exact source method, no automatic project conformity claim',locator:'PDF8§2.3/2.5;08-02-001-07',applicabilityRu:'Керамический кирпич250×120×65, стена250мм, готовыйМ50, этаж до4м',verifiedSource:'EXACT_SAVED_PRIMARY'}]}});
 // Only source whole-front process markers receive the new primary identity.
 // Every paid parent formula and the tested effective mortar chain stay exact.
 const processIds=new Set(whole.operationKeys.map(key=>whole.prefix+':formula:operation:'+key)),primaryInputs=new Set<string>([L,H,A,I]);
 result.formulas=result.formulas.map(formula=>{if(!processIds.has(formula.formula_id))return formula;const compiled=compileFormulaGraph(primary);return{...formula,expression_source:primary,ast:compiled.ast,ast_sha256:hash(compiled.ast),input_parameter_ids:[...new Set([...formula.input_parameter_ids.filter((id:string)=>!primaryInputs.has(id)),primary])]};});
 const consumers=buildMasterParameterCalculationConsumers(result);
 for(const parameter of result.parameters){const id=parameter.parameter_id;parameter.truth_metadata={...parameter.truth_metadata,formula_consumers:consumers.formulaConsumers[id],resource_branch_consumers:consumers.resourceConsumers[id]};result.baseline.formula_consumer_ids[id]=consumers.formulaConsumers[id];result.baseline.resource_consumer_row_ids[id]=consumers.resourceConsumers[id];result.baseline.uom_by_parameter[id]=parameter.unit_id;result.baseline.guide_provenance_ru[id]=parameter.truth_metadata.guide?.guide_short_ru??parameter.title_ru;}
 result.definition.applicability={...result.definition.applicability,primaryMeasureParameterId:primary,primaryMeasureSelectionV1:{contract:'canonical-primary-measure-selection/v1',selectorParameterId:flow.parentSelector,selections:[{selectorValue:flow.parentSelectedValue,primaryMeasureParameterId:primary,unitId:'m3'}]},masonryCeramic250OrdinaryCurrentCardR4:{sourceCountry:'Kyrgyzstan',sourceEdition:'2015',simpleGeometryParameterIds:[...simple],sourceProfileKeys:[...selectors],oldDefinitionId:parent.definition.id,oldHistoryUnmodified:true,sourceSelectionIsNotProjectConformity:true,wholeFamilyReady:false}};
 // Preserve the independently authored expectations and their source identity.
 // Supply the omitted source applicability text for the exact known components;
 // never synthesize expectations from whatever rows happen to exist now.
 const flowCondition='Точный собственный профиль керамического кирпича250/М100 на готовомМ50, этаж до4м; выбран сохранённый последовательный трёхъящичный процесс; чистый объём кладки больше0. Фактические документы, грузовые пределы и выполнение отдельно не подтверждены.';
 const wholeCondition='Тот же точный кирпичный профиль и растворный процесс; выбран целый сохранённый комплект на восемь каменщиков; чистый объём кладки больше0. ППР, актуальные СИЗ, доступ, поставка и фактическое выполнение остаются отдельными требованиями.';
 result.passport.decision.independentCompletenessMap.entries=result.passport.decision.independentCompletenessMap.entries.map((entry:Record<string,unknown>)=>{
  if(typeof entry.condition==='string'&&entry.condition.trim())return entry;
  const expected=String(entry.expectedResourceId??'');
  if(expected.startsWith(flow.prefix+':expected:')||expected.startsWith(lift.prefix+':expected:'))return{...entry,condition:flowCondition};
  if(expected.startsWith(whole.prefix+':expected:'))return{...entry,condition:wholeCondition};
  throw Error('MASONRY_ORDINARY_R4_UNKNOWN_SOURCE_EXPECTATION_CONDITION:'+expected);
 });
 result.passport.decision={...result.passport.decision,completeTechnicalEstimateAccepted:false,quantityScope:'PARTIAL',technicalScopeStatus:'NEEDS_SOURCE',masonryCeramic250OrdinaryCurrentCardR4:{reusedActualBrick4Factory:true,newPaidOwners:0,newProcurementOwners:0,consumerTechnicalQuestions:0,full:0}};
 return applyMasonryCeramic250RelatedConsumerGatesR4(result);
}

export function compileMasonryCeramic250OrdinaryCurrentCardR4(model:Rep,parameters:Record<string,unknown>,options:Partial<Pick<CanonicalEstimateCompileCoreInput,'confirmedParameters'|'rowOverrides'|'compositionSelectionV1'>>={}){
 return compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:'masonry-ceramic250-ordinary-current-card/r4',catalogId:model.definition.catalog_id,primaryMeasureParameterId:MASONRY_CERAMIC250_PRIMARY_VOLUME_R4,parameterDefinitions:model.parameters as CanonicalEstimateParameterDefinition[],formulaDefinitions:model.formulas as CanonicalEstimateFormulaDefinition[],resourceDefinitions:model.resources as CanonicalEstimateResourceDefinition[],submittedParameters:parameters,confirmedParameters:options.confirmedParameters??{},rowOverrides:options.rowOverrides??{},compositionSelectionV1:options.compositionSelectionV1,priceItems:[],currencyCode:'KGS',maximumResourceRows:model.resources.length,hashJson:value=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(value))});
}
