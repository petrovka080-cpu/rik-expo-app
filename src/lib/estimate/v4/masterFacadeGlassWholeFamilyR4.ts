import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import source from '../../../../data/estimate-benchmarks/source-packs/facade-glass-whole-existing-owner-r4.json';
import {facadeGlassWholePackR4 as pack,facadeGlassWholeDefinitionR4 as build,facadeGlassWholeCompletenessR4 as completeness,facadeGlassWholeControlR4 as control,facadeGlassWholePrimaryR4 as primary,facadeGlassWholeOwnerR4 as catalogId,type FacadeGlassWholeMethodKeyR4 as Key} from './facadeGlassWholeMethodsR4';
import {compileFormulaGraph} from '../backendPlatform/formulaGraph';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {resolvePrimaryMeasureSelectionV1,assertCanonicalPrimaryMeasureSelectionV1} from '../backendPlatform/canonicalPrimaryMeasureSelectionV1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
import {applyFacadeGlassVacuumWholeR5} from './facadeGlassVacuumWholeDeviceR5';
import type {PurchaseGroupRepresentative as Rep} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
type J=Record<string,any>;
const loader=createRequire(__filename),fixture=loader('../../../../data/estimate-benchmarks/fixtures/facade-glass-original-parents-r3.json')as J;
const approvedCurrentFile='../../../../data/estimate-benchmarks/fixtures/master-retained-approved-template-source-evidence-r5.json',approvedCurrent=loader(approvedCurrentFile)as J;
const approvedCurrentSha256='ae6a6aab91481909274edce5c8b1af18e4afe62c40e3ffd443fdbae3cd4b3c8f';
const keys:readonly Key[]=['stick','structural','semi-structural','unitized','point-fixed'];
export const facadeGlassFamilySourceIdR4='gox_facade_glass_retained_family_r4';
export const facadeGlassSelectorR4='facade_glass_source_method';
export const facadeGlassLegacyChoiceR4='Сохранённый предварительный расчёт стеклянного фасада';
export const facadeGlassFamilyChoiceR4=(key:Key)=>String(pack(key).titleRu);
export const facadeGlassFamilyParameterIdR4=(key:Key,id:string)=>id===primary?id:'glassr4_'+key.replaceAll('-','_')+'_'+id;
const selected=(value:string)=>({kind:'selected',parameterId:facadeGlassSelectorR4,value}),legacy=selected(facadeGlassLegacyChoiceR4),anyNew={kind:'or',operands:keys.map(k=>selected(facadeGlassFamilyChoiceR4(k)))},and=(...operands:J[])=>({kind:'and',operands});
const strip=(v:J)=>Object.fromEntries(Object.entries(v).filter(([k])=>!['id','definition_version_id','created_at','updated_at','row_sha256'].includes(k)));
const rehash=(v:J):any=>{const{row_sha256:_old,...body}=v;return{...body,row_sha256:hash(body)};};
function namespace<T>(value:T,key:Key,ids:readonly string[]):T{const pairs=[...ids].filter(id=>id!==primary).sort((a,b)=>b.length-a.length).map(id=>[id,facadeGlassFamilyParameterIdR4(key,id)]as const);const walk=(v:any):any=>typeof v==='string'?pairs.reduce((s,[a,b])=>s.replaceAll(a,b),v):Array.isArray(v)?v.map(walk):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,walk(x)])):v;return walk(value);}
/** Exact original ROOT capture. The other2existingowners remain independent
 * immutable replay sources, never aliases/migrated/newcatalogs in this draft. */
export function masterFacadeGlassCapturedParentR4():J{
 if(fixture.status!=='PASS_FULL_IMMUTABLE_READONLY_CAPTURE_NOT_TECHNICAL_ADMISSION'||fixture.databaseWrites!==0||fixture.readOnlyTransaction!==true||fixture.transactionRolledBack!==true||fixture.captures.length!==3)throw Error('GLASS_R4_EXACT_ROOT_CAPTURE_REQUIRED');
 const c=(fixture.captures as J[]).find(c=>c.definition.catalog_id===catalogId);
 if(!c||c.definition.id!=='8320a929-c3b1-5252-8236-be2573568399'||c.definition.definition_version!==5||c.definition.definition_sha256!=='8a93d851e5d2207d5135e7a39ebf3d0aef7960a21ee14510b7fee734011f7b78'||c.baseline.id!=='7492137e-6ade-51f4-a586-925d58846c3e'||[c.parameters.length,c.formulas.length,c.resources.length].join('/')!=='5/45/45'||c.bindings.length!==0||c.normativeSources.length!==0||c.normativeLocators.length!==0)throw Error('GLASS_R4_EXACT_ORIGINAL_OWNER_REQUIRED');
 if(createHash('sha256').update(readFileSync(loader.resolve(approvedCurrentFile))).digest('hex')!==approvedCurrentSha256||approvedCurrent.readOnly!==true||approvedCurrent.rolledBack!==true||approvedCurrent.databaseWrites!==0||approvedCurrent.utcEquivalence?.sessionTimeZone!=='UTC'||approvedCurrent.utcEquivalence.nonTimestampColumnsExactlyEqual!==true||approvedCurrent.utcEquivalence.allTimestampInstantsPgEqual!==true)throw Error('GLASS_R5_EXACT_CURRENT_UTC_PREIMAGE_REQUIRED');
 const current=approvedCurrent.currentCapture;
 if(current?.definition?.id!==c.definition.id||current?.baseline?.id!==c.baseline.id||current.definition.definition_sha256!==c.definition.definition_sha256||[current.parameters.length,current.formulas.length,current.resources.length].join('/')!=='5/45/45')throw Error('GLASS_R5_CURRENT_CAPTURE_OWNER_DRIFT');
 return structuredClone(current);
}
export function masterFacadeGlassRepresentativeR4():Rep{const c=masterFacadeGlassCapturedParentR4();return{definition:c.definition,parameters:c.parameters,formulas:c.formulas,resources:c.resources,baseline:c.baseline,passport:c.contentPassport,bindings:[]};}
export const facadeGlassFamilyPrimarySelectionR4=()=>({contract:'canonical-primary-measure-selection/v1'as const,selectorParameterId:facadeGlassSelectorR4,selections:[{selectorValue:facadeGlassLegacyChoiceR4,primaryMeasureParameterId:'glazing_area_m2',unitId:'m2'},...keys.map(k=>({selectorValue:facadeGlassFamilyChoiceR4(k),primaryMeasureParameterId:primary,unitId:'m2'}))]});

/** Pure retained-owner overlay for a single existing card. No DB/API/publisher.
 * Every old row remains under an explicit legacy selection. New methods use
 * fresh parameter namespaces/resource IDs and one distinct new primary; legacy
 *5000/15 defaults, quantity multipliers and manual prices never drive them. */
export function buildMasterFacadeGlassWholeSuccessorR4(parent:Rep):Rep{
 const expected=masterFacadeGlassRepresentativeR4();
 if(hash(parent)!==hash(expected))throw Error('GLASS_R4_EXACT_CAPTURED_PARENT_PREIMAGE_REQUIRED');
 const next=structuredClone(parent),oldIds=new Set(parent.parameters.map(q=>q.parameter_id)),addedIds=new Set<string>(),maps=keys.map(k=>completeness(k));
 for(const r of next.resources)r.inclusion_ast=and(r.inclusion_ast,legacy);
 for(const q of next.parameters){const oldRequired=q.required,oldDefault=q.default_value,geometry=['glazing_area_m2','floors'].includes(q.parameter_id);q.required=false;if(!geometry)q.default_value=null;q.constraints_json={...q.constraints_json,requiredWhen:and(legacy,q.constraints_json?.requiredWhen??{kind:'literal',value:oldRequired})};q.truth_metadata={...q.truth_metadata,visible_when:and(legacy,q.truth_metadata?.visible_when??{kind:'literal',value:true}),...(geometry?{}:{visibility_role:'INTERNAL_ONLY',value_source_role:'SOURCE_BACKED_PRELIMINARY_PROFILE',provenance:{...q.truth_metadata?.provenance,consumer_input_role_v1:'APPLICATION_TECHNICAL',source_readback_only_v1:true,consumer_question_allowed:false,retained_legacy_assumption_only_v1:true,retained_value_source_role_v1:q.truth_metadata?.value_source_role,retained_legacy_default_value_v1:oldDefault}})};}
 for(const key of keys){
  const raw=build(key),d=namespace(raw,key,raw.parameters.map(q=>q.parameter_id)),branch=selected(facadeGlassFamilyChoiceR4(key));
  for(const q of d.parameters){
   if(q.parameter_id===primary&&addedIds.has(primary))continue;
   if(oldIds.has(q.parameter_id)||addedIds.has(q.parameter_id))throw Error('GLASS_R4_PARAMETER_NAMESPACE_COLLISION');
   addedIds.add(q.parameter_id);const internal=['UNRESOLVED_APPLICATION_NORM','COMPILER_DERIVED_RESOURCE_QUANTITY'].includes(String(q.truth_metadata.value_source_role)),condition=q.parameter_id===primary?anyNew:branch;
   next.parameters.push({...strip(q),ordinal:next.parameters.length,default_value:null,required:false,...(internal?{}:{constraints_json:{...q.constraints_json,requiredWhen:and(condition,q.constraints_json?.requiredWhen??{kind:'literal',value:true})},truth_metadata:{...q.truth_metadata,visible_when:condition}})}as any);
  }
  for(const f of d.formulas){const graph=compileFormulaGraph(f.expression_source!);next.formulas.push({...f,ast:graph.ast,input_parameter_ids:graph.inputParameterIds,ast_sha256:hash(graph.ast)});}
  for(const r of d.resources)next.resources.push(rehash({...strip(r),ordinal:next.resources.length,row_type:r.category==='work'?'labor':r.category,semantic_owner:catalogId+':'+r.row_id,inclusion_ast:and(branch,r.inclusion_ast)}));
 }
 next.parameters.push({parameter_id:facadeGlassSelectorR4,ordinal:next.parameters.length,title_ru:'Исходный метод стеклянного фасада',value_type:'enum',unit_id:null,required:true,default_value:null,constraints_json:{values:[facadeGlassLegacyChoiceR4,...keys.map(facadeGlassFamilyChoiceR4)]},truth_metadata:{contract:source.contract,semantic_parameter_key:catalogId+':'+facadeGlassSelectorR4,visibility_role:'USER_INPUT',value_source_role:'PROJECT_SPECIFIC_INPUT',source_confirmation_required:false,provenance:{consumer_input_role_v1:'OBJECT_FACT'},guide:{guide_kind:'PROJECT_DEFINED',guide_short_ru:'Выберите сохранённый расчёт либо точный согласованный метод стеклянного фасада.',source_role:'DECLARED_WORK_SCOPE',source_document:facadeGlassFamilySourceIdR4,source_locator:'Exact6sourcechoices;currentmanufacturerwholemethods;originalparentretained',source_snapshot_hash:hash(source),guide_version:source.contract,applicability:'Исходные изготовители, материалы, крепления, проект и территориальная область проверяются отдельно; названия не разрешают замену.',verified_at:'2026-10-23',guide_validation_policy:'MANDATORY_BLOCK'}}});
 const consumers=buildMasterParameterCalculationConsumers(next);
 for(const q of next.parameters){const id=q.parameter_id;q.truth_metadata={...q.truth_metadata,formula_consumers:consumers.formulaConsumers[id],resource_branch_consumers:consumers.resourceConsumers[id]};next.baseline.formula_consumer_ids[id]=consumers.formulaConsumers[id];next.baseline.resource_consumer_row_ids[id]=consumers.resourceConsumers[id];next.baseline.uom_by_parameter[id]=q.unit_id;next.baseline.guide_provenance_ru[id]=q.truth_metadata.guide?.guide_short_ru??q.title_ru;if(!oldIds.has(id))next.baseline.normative_source_ids[id]=['UNRESOLVED_APPLICATION_NORM','COMPILER_DERIVED_RESOURCE_QUANTITY'].includes(String(q.truth_metadata.value_source_role))?[]:[facadeGlassFamilySourceIdR4];}
 const priorMap=parent.passport.decision?.independentCompletenessMap,oldNeeds=[...(parent.passport.decision?.unresolvedResourceRowIds??[])],perMethod=Object.fromEntries(keys.map(k=>[facadeGlassFamilyChoiceR4(k),pack(k).needs.map((n:J)=>pack(k).prefix+':need:'+n.key)])),allNeeds=[...new Set([...oldNeeds,...Object.values(perMethod).flat()])],map={...maps[0],entries:[...(priorMap?.entries??[]),...maps.flatMap(m=>m.entries)],componentMaps:[...(priorMap?[priorMap]:[]),...maps],fullTechnicalAcceptance:false};
 next.definition.applicability={...parent.definition.applicability,legacyApplicability:structuredClone(parent.definition.applicability),primaryMeasureSelectionV1:facadeGlassFamilyPrimarySelectionR4(),sourceProfilesByExplicitChoice:{[facadeGlassLegacyChoiceR4]:structuredClone(parent.definition.applicability),...Object.fromEntries(keys.map(k=>[facadeGlassFamilyChoiceR4(k),{sourceId:facadeGlassFamilySourceIdR4,profileScope:pack(k).scope,territorialAdmission:'ACTUAL_PROJECT_AND_LOCAL_REQUIREMENTS_REQUIRED_NOT_FOREIGN_AUTOMATIC_ADMISSION',legacyQuantityOrPriceTransfer:false,fullTechnicalAcceptance:false}]))},wholeGlassR4:{contract:source.contract,newCatalogIds:0,additionalTwoExistingOwnersUntouched:true,original45ResourcesPreserved:true,newFULL:0}};
 next.passport.included_scope_ru=[...(parent.passport.included_scope_ru??[]).map((s:string)=>'Только сохранённый выбор: '+s),'Пять согласованных стеклянных методов с самостоятельными проектными ведомостями и видимыми потребностями полного обеспечения.'];
 next.passport.excluded_scope_ru=[...(parent.passport.excluded_scope_ru??[]),'Новые методы не закрывают внутренние нормы труда, инструмента, подъёма, доступа, расходников, контроля, логистики и отходов количеством из старого расчёта.'];
 next.passport.decision={...parent.passport.decision,quantityScope:'PARTIAL',technicalScopeStatus:'NEEDS_SOURCE',preliminaryCompositionOnly:true,completeTechnicalEstimateAccepted:false,newFullTechnologies:0,unresolvedResourceRowIds:allNeeds,conditionalGlassNeeds:{legacyNeedRowIds:oldNeeds,methodNeedRowIds:perMethod,needsFromOtherInactiveProfilesNotClaimedClosed:true},independentCompletenessMap:map};
 next.passport.capability_matrix=[...(parent.passport.capability_matrix??[]).filter((x:J)=>x.capability!=='FULL_APPLICABLE_SCOPE'),{capability:'FULL_APPLICABLE_SCOPE',status:'NEEDS_SOURCE',preliminaryCompositionOnly:true,unresolvedResourceRowIds:allNeeds}];
 if(next.formulas.slice(parent.formulas.length).some(f=>f.input_parameter_ids.some((id:string)=>oldIds.has(id))))throw Error('GLASS_R4_NO_ORIGINAL_QUANTITY_INPUT_IN_NEW_FORMULAS');
 return applyFacadeGlassVacuumWholeR5(next,{methodSelectorParameterId:facadeGlassSelectorR4,compatibleMethodValues:keys.filter(key=>key!=='unitized').map(facadeGlassFamilyChoiceR4),registeredFamilySourceId:facadeGlassFamilySourceIdR4});
}
export const masterFacadeGlassWholeControlR4=(key:Key,more:Record<string,unknown>={})=>({...Object.fromEntries(Object.entries(control(key)).map(([id,value])=>[facadeGlassFamilyParameterIdR4(key,id),value])),[facadeGlassSelectorR4]:facadeGlassFamilyChoiceR4(key),...more});
export const masterFacadeGlassLegacyInputR4=(more:Record<string,unknown>={})=>({...structuredClone(masterFacadeGlassCapturedParentR4().baseline.input_values),[facadeGlassSelectorR4]:facadeGlassLegacyChoiceR4,...more});
const schema=(model:Rep)=>model.parameters.map(q=>({parameterId:q.parameter_id,valueType:q.value_type,unitId:q.unit_id,visibilityRole:q.truth_metadata.visibility_role,valueSourceRole:q.truth_metadata.value_source_role,provenance:q.truth_metadata.provenance,constraints:q.constraints_json,formulaConsumers:q.truth_metadata.formula_consumers}));
export function resolveMasterFacadeGlassPrimaryR4(model:Rep,input:Record<string,unknown>,parentPrimaryMeasure?:unknown){return resolvePrimaryMeasureSelectionV1({selectionMetadata:model.definition.applicability.primaryMeasureSelectionV1,submittedParameters:input,parentPrimaryMeasure,parameterSchema:schema(model)});}
export function compileMasterFacadeGlassWholeR4(model:Rep,input:Record<string,unknown>,options:{rowOverrides?:CanonicalEstimateCompileCoreInput['rowOverrides'];parentPrimaryMeasure?:unknown;confirmedParameters?:CanonicalEstimateCompileCoreInput['confirmedParameters']}={}){
 const allowed=new Set([facadeGlassSelectorR4,primary,'glazing_area_m2','floors']);
 if(Object.keys(input).some(id=>!allowed.has(id)))throw Object.assign(new Error('GLASS_FAMILY_TECHNICAL_VALUES_REQUIRE_SOURCE_READBACK'),{code:'PARAMETER_VALIDATION_FAILED'});
 const selected=assertCanonicalPrimaryMeasureSelectionV1({selectionMetadata:model.definition.applicability.primaryMeasureSelectionV1,submittedParameters:input,confirmedParameters:options.confirmedParameters,parentPrimaryMeasure:options.parentPrimaryMeasure,parameterSchema:schema(model)});
 if(selected.kind!=='RESOLVED')throw Error('GLASS_R4_EXPLICIT_PRIMARY_SELECTION_REQUIRED');
 return compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:source.contract,catalogId:model.definition.catalog_id,primaryMeasureParameterId:selected.primaryMeasure.parameterId,parameterDefinitions:model.parameters as any,formulaDefinitions:model.formulas as any,resourceDefinitions:model.resources as any,submittedParameters:input,confirmedParameters:options.confirmedParameters??{},rowOverrides:options.rowOverrides??{},priceItems:[],currencyCode:'KGS',maximumResourceRows:model.resources.length,hashJson:hash});
}
