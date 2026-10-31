import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import source from '../../../data/estimate-benchmarks/source-packs/masonry-silicate65-m75-own-cycle-r4.json';
import {masonryCeramic250CurrentCardConfigR4,masonryCeramic250RetainedRepresentativeCheckR4} from './prepareMasonryCeramic250CurrentCardR4';
import {masonryM50CycleCapturedRepresentativeR2 as captured} from '../../../src/lib/estimate/v4/masonryReadyM50WholeSupplyCycleR2';
import {buildMasonrySilicate65M75CurrentCardR4 as build,compileMasonrySilicate65M75CurrentCardR4 as compile,MASONRY_SILICATE65_M75_PROFILE_R4 as profile} from '../../../src/lib/estimate/v4/masonrySilicate65M75CurrentCardR4';
import {validateIndependentCompletenessMapReferences,type MasterSingleDefinitionSuccessorConfig as Config} from './prepareMasterSingleDefinitionSuccessorR1';
import type {MasterExplicitParameterSourcesR1 as Sources} from './masterSingleDefinitionRetainParentBindingsR1';

const packPath='data/estimate-benchmarks/source-packs/masonry-silicate65-m75-own-cycle-r4.json';
const sha=(file:string)=>createHash('sha256').update(readFileSync(file)).digest('hex');
const record=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const id=(key:string)=>source.prefix+':'+key;

/** One source profile of the existing brick card and the existing publisher
 * Config. Source/capture rehearsal is not a new writer, DB preflight or actual
 * object approval. The source guard and real retained guard fail by throwing. */
export function masonrySilicate65M75CurrentCardConfigR4(context:{releaseId:string;searchReleaseId:string;sourceRoot?:string;outputRoot?:string}):Config{
 const own=(path:string)=>context.sourceRoot&&existsSync(join(context.sourceRoot,path))?join(context.sourceRoot,path):path;
 for(const input of source.inputs)assert.equal(sha(own(input.path)),input.sha256,input.path);
 for(const artifact of source.sources)assert.equal(sha(own(artifact.path)),artifact.sha256,artifact.path);
 const base=masonryCeramic250CurrentCardConfigR4(context),parent=captured(),model=build(parent),retained=base.binding.retainParentBindings;
 assert(retained);assert.equal(retained.capturedParent.definition.id,source.parentDefinitionId);
 const oldRows=new Set(parent.resources.map(row=>row.row_id)),oldParameters=new Set(parent.parameters.map(parameter=>parameter.parameter_id));
 const newRows=model.resources.filter(row=>!oldRows.has(row.row_id)).map(row=>row.row_id);
 const newParameterSources:Sources=Object.fromEntries(model.parameters.filter(parameter=>!oldParameters.has(parameter.parameter_id)).map(parameter=>{
  const role=String(parameter.truth_metadata.value_source_role);
  return[parameter.parameter_id,role==='UNRESOLVED_APPLICATION_NORM'?{kind:'UNRESOLVED',sourceIds:[]}:role.includes('DERIVED')?{kind:'DERIVED',sourceIds:[]}:{kind:'KNOWN',sourceIds:[source.sourceId]}];
 }));
 const unresolved=base.passport.unresolvedApplicableResourceRowIds??[];
 const included=[...base.passport.includedScopeRu,'Отдельный собственный профиль полнотелого силикатного кирпича250×120×65 на готовом цементно-известковомМ75 с собственными исходными расходами; старые финансовые ветви исключаются.'];
 const excluded=[...base.passport.excludedScopeRu,'Выбор исходного силикатного профиля не подтверждает фактическую партию, проект, сейсмические связи, качество, допустимые нагрузки, доступ, защиту, наличие или полное обеспечение.'];
 const config:Config={...base,contract:source.contract,stopCode:'MASONRY_SILICATE65_M75_CURRENT_CARD_R4',applicationName:'masonry-silicate65-m75-current-card-r4',outputRoot:context.outputRoot??'.release-runtime/r568/masonry-silicate65-m75-current-card-r4',
  sourcePaths:[...new Set([...base.sourcePaths,packPath,...source.inputs.map(input=>input.path),...source.sources.map(item=>item.path)])],
  sourceId:source.sourceId,normId:'KG08-02-001-07_SILICATE65_READY_CEMENT_LIME_M75_OWN_SCOPE',
  sourceMetadata:{source_title:source.publicTitleRu,source_authority:'Own explicit KG2015 silicate scope; own producer SGB5.1-2025 constraints and exact saved whole physical methods',source_kind:'EXISTING_CURRENT_BRICK_CARD_OWN_SILICATE65_M75_PROFILE_NOT_FULL',artifact_sha256:sha(own(packPath)),exact_locator:'KG08PDF5p1.2/6p1.6,column07; KG03PDF27,03-0405-0004; own SGB5.11, laying/bond/structural conditions; complete saved flow/front',use_restriction:'Only own source solid silicate65/internal nonbearing250mm/readycement-limeM75/storey<=4m. No M50 material/source substitution, legacy q, duplicate cost or automatic KG/project conformity. Actual whole object scope remains mandatory.'},
  parameterDefinitions:model.parameters,formulaDefinitions:model.formulas,resourceDefinitions:model.resources,
  shortInput:base.shortInput,acceptanceInput:{...profile,...base.shortInput},runtimeProfileInput:{...profile},runtimeProfileClassification:{[source.selectorId]:'NORMATIVE'},runtimeProfileSourceIds:{[source.selectorId]:[source.sourceId]},
  validationScenario:'EXISTING_BRICK_CARD_EXCLUSIVE_OWN_SILICATE65_M75_FIVE_GEOMETRY_NOT_FULL',
  passport:{...base.passport,physicalResultRu:'Внутренняя ненесущая кирпичная стена250мм в собственном силикатном профиле на готовомМ75; прежний керамический профиль сохраняется отдельно.',includedScopeRu:included,excludedScopeRu:excluded,independentCompletenessMap:model.passport.decision.independentCompletenessMap,unresolvedApplicableResourceRowIds:[...new Set([...unresolved,...source.wholeOpenNeeds.map(gap=>id('need:'+gap.key))])]},
  applicability:{...model.definition.applicability,fullTechnicalAcceptance:false,newFullTechnologies:0},
  binding:{...base.binding,rowId:newRows[0]!,additionalRowIds:newRows.slice(1),applicability:{contract:source.contract,sameExistingBrickCard:true,sourceProfileNotObjectApproval:true,fullTechnicalAcceptance:false},applicabilityByRowId:Object.fromEntries(newRows.map(rowId=>[rowId,{contract:source.contract,rowId,fullTechnicalAcceptance:false}])),retainParentBindings:{...retained,newParameterSources,capturedSourcePreimage:{sourceKey:source.sourceId,expected:null}}},
  locator:{key:source.locatorKey,payload:source},
  search:{...base.search,canonicalNameRu:'Кладка кирпичной стены',aliases:['Кладка кирпичной стены'],shortScopeRu:'Одна кирпичная карточка: точный керамическийМ50 либо собственный силикатныйМ75; пять простых измерений, полное фактическое обеспечение отдельно.',includedBoundaries:included,excludedBoundaries:excluded,sourceProvenance:{contract:source.contract,fullTechnicalAcceptance:false,sourceChoiceNotProjectConformity:true}},
  receiptFileStem:'masonry_silicate65_m75_current_card_r4',verifyCore:async()=>{
   // The existing checker uses the existing canonical Config file plus this
   // artifact SHA, whose pinned inputs include this new Config and adapters.
   // It remains an explicit rehearsal identity, never final publisher identity.
   const retainedAdmission=masonryCeramic250RetainedRepresentativeCheckR4(config,context.sourceRoot);
   assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:config.passport.independentCompletenessMap,formulaDefinitions:config.formulaDefinitions,resourceDefinitions:config.resourceDefinitions}),[]);
   const result=await compile(model,config.shortInput,{confirmedParameters:profile}),all=[...result.rows,...result.preliminaryNeeds];
   assert.equal(result.derivedParameters[source.primaryId],'3');
   for(const [key,quantity] of [['main-labour','15.63'],['solid-silicate-brick','1185'],['ready-m75-mortar','0.702'],['tower-crane','1.2']] as const)assert.equal(all.find(row=>row.row_id===id(key))?.quantity,quantity);
   assert(!all.some(row=>row.row_id==='masonry:wall:krer08-02-001-07:mortar'));
   assert.equal(Object.keys(config.shortInput).length,5);assert.deepEqual(config.runtimeProfileInput,profile);
   const scope=all.find(row=>row.row_id===id('actual-scope'));assert(scope);assert(record(scope.calculation_trace));assert(record(scope.calculation_trace.resourceGraph));assert(record(scope.calculation_trace.resourceGraph.scopeRequirementDecisionV1));assert.equal(scope.calculation_trace.resourceGraph.scopeRequirementDecisionV1.status,'OBJECT_FACT_REQUIRED');
   for(const gap of source.wholeOpenNeeds){const need=all.find(row=>row.row_id===id('need:'+gap.key));assert(need);assert.equal(need.quantity,null);}
   assert.equal(model.passport.decision.completeTechnicalEstimateAccepted,false);
   return{status:'PASS_OWN_SILICATE65_M75_RETAINED_CONFIG_FRAGMENT_NOT_PUBLICATION_OR_FULL',retainedAdmission,simpleGeometry:5,sourceChoices:1,actualObjectApproval:false,wholeAcceptance:false};
  }};
 return config;
}
