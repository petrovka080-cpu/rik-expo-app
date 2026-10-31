import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import source from '../../../data/estimate-benchmarks/source-packs/masonry-silicate65-m75-existing-dpc-config-r4.json';
import {masonrySilicate65M75CurrentCardConfigR4} from './prepareMasonrySilicate65M75CurrentCardR4';
import {masonryCeramic250RetainedRepresentativeCheckR4} from './prepareMasonryCeramic250CurrentCardR4';
import {masonryM50CycleCapturedRepresentativeR2 as captured} from '../../../src/lib/estimate/v4/masonryReadyM50WholeSupplyCycleR2';
import {buildMasonrySilicate65M75DpcReuseR4 as build,MASONRY_SILICATE65_DPC_SCOPE_R4 as scopeId,MASONRY_SILICATE65_DPC_LAYOUT_R4 as layoutId,MASONRY_SILICATE65_DPC_EXACT_SCOPE_R4 as exactScope} from '../../../src/lib/estimate/v4/masonrySilicate65M75DpcReuseR4';
import {compileMasonrySilicate65M75CurrentCardR4 as compile,MASONRY_SILICATE65_M75_PROFILE_R4 as profile,MASONRY_SILICATE65_M75_R4 as wall} from '../../../src/lib/estimate/v4/masonrySilicate65M75CurrentCardR4';
import {validateIndependentCompletenessMapReferences,type MasterSingleDefinitionSuccessorConfig as Config} from './prepareMasterSingleDefinitionSuccessorR1';
import type {MasterExplicitParameterSourcesR1 as Sources} from './masterSingleDefinitionRetainParentBindingsR1';

const packPath='data/estimate-benchmarks/source-packs/masonry-silicate65-m75-existing-dpc-config-r4.json';
const prefix='masonry:bearing-dpc:loose-polyolefin:r4',guard='masonry:silicate65:m75:dpc-reuse:r4';
const sha=(file:string)=>createHash('sha256').update(readFileSync(file)).digest('hex');
const record=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);

/** Same pending M75 source and exact brickv9 parent, plus the already tested
 * whole bounded DPC component. The one existing normal publisher/retained
 * representative remains the only publication route. A later current parent
 * needs a fresh capture and explicit adapter; this factory never rebinds it. */
export function masonrySilicate65M75DpcReuseConfigR4(context:{releaseId:string;searchReleaseId:string;sourceRoot?:string;outputRoot?:string}):Config{
 const own=(path:string)=>context.sourceRoot&&existsSync(join(context.sourceRoot,path))?join(context.sourceRoot,path):path;
 for(const input of source.inputs)assert.equal(sha(own(input.path)),input.sha256,input.path);
 for(const input of source.dpcMethodArtifacts)assert.equal(sha(own(input.path)),input.sha256,input.path);
 const base=masonrySilicate65M75CurrentCardConfigR4(context),parent=captured(),model=build(parent),retained=base.binding.retainParentBindings;
 assert(retained);assert.equal(retained.capturedParent.definition.id,source.parentDefinitionId);assert.equal(base.sourceId,source.sourceId);
 const oldRows=new Set(parent.resources.map(row=>row.row_id)),baseParameters=new Set(base.parameterDefinitions.map(parameter=>parameter.parameter_id));
 const newRows=model.resources.filter(row=>!oldRows.has(row.row_id)).map(row=>row.row_id);
 const added=model.parameters.filter(parameter=>!baseParameters.has(parameter.parameter_id));assert.equal(added.length,6);
 const newSources:Sources={...retained.newParameterSources,...Object.fromEntries(added.map(parameter=>{
  const role=parameter.truth_metadata.value_source_role;
  assert(role==='UNRESOLVED_APPLICATION_NORM'||role==='ENGINEERING_DESIGN');assert.equal(parameter.default_value,null);
  return[parameter.parameter_id,role==='UNRESOLVED_APPLICATION_NORM'?{kind:'UNRESOLVED',sourceIds:[]}:{kind:'KNOWN',sourceIds:[base.sourceId]}];
 }))};
 const unresolved=base.passport.unresolvedApplicableResourceRowIds??[];
 assert(unresolved.every((rowId:unknown)=>typeof rowId==='string'));
 const included=[...base.passport.includedScopeRu,'Целый исходный способ прямой отсечки капиллярной влаги у основания внутренней стены: отдельная фактическая область, известный раскрой и четыре неизвестные нормы.'];
 const excluded=[...base.passport.excludedScopeRu,'Отсечка не подтверждает весь проект опирания и не разрешает силикатные фундаменты, наружные стены подвала или цоколя; неизвестные постель, труд, инструмент и отходы не принимаются как полный расчёт.'];
 const config:Config={...base,contract:source.contract,stopCode:'MASONRY_SILICATE65_M75_DPC_REUSE_R4',applicationName:'masonry-silicate65-m75-dpc-reuse-r4',outputRoot:context.outputRoot??'.release-runtime/r568/masonry-silicate65-m75-dpc-reuse-r4',
  sourcePaths:[...new Set([...base.sourcePaths,packPath,...source.inputs.map(input=>input.path),...source.dpcMethodArtifacts.map(input=>input.path)])],
  sourceMetadata:{...base.sourceMetadata,source_title:'Силикатная кирпичная кладка с прямой отсечкой капиллярной влаги',source_kind:'OWN_M75_EXISTING_WHOLE_DPC_LINKED_SOURCE_NOT_NEW_RATE_OR_FULL',artifact_sha256:sha(own(packPath)),exact_locator:base.sourceMetadata.exact_locator+'; own German makerTDS12.21/DoP2016/application, loose200mm straight365mm strip under permitted250mm interior wall',use_restriction:base.sourceMetadata.use_restriction+'; DPC actual engineering scope/layout are NOT baseline values. No extra mortar/labour payment, no fake application norms or regional conformity.'},
  parameterDefinitions:model.parameters,formulaDefinitions:model.formulas,resourceDefinitions:model.resources,
  shortInput:base.shortInput,acceptanceInput:base.acceptanceInput,runtimeProfileInput:base.runtimeProfileInput,runtimeProfileClassification:base.runtimeProfileClassification,runtimeProfileSourceIds:base.runtimeProfileSourceIds,
  passport:{...base.passport,includedScopeRu:included,excludedScopeRu:excluded,independentCompletenessMap:model.passport.decision.independentCompletenessMap,unresolvedApplicableResourceRowIds:[...new Set([...unresolved,prefix+':bed-mortar',prefix+':installation-labour',prefix+':measuring-cutting-tools',prefix+':disposed-waste'])]},
  applicability:{...model.definition.applicability,fullTechnicalAcceptance:false,newFullTechnologies:0},
  binding:{...base.binding,rowId:newRows[0]!,additionalRowIds:newRows.slice(1),applicability:{contract:source.contract,sameExistingM75SourceAndBrickCard:true,wholeDpcLinked:true,fullTechnicalAcceptance:false},applicabilityByRowId:Object.fromEntries(newRows.map(rowId=>[rowId,{contract:source.contract,rowId,fullTechnicalAcceptance:false}])),retainParentBindings:{...retained,newParameterSources:newSources}},
  locator:{key:source.locatorKey,payload:source},search:{...base.search,includedBoundaries:included,excludedBoundaries:excluded,sourceProvenance:{contract:source.contract,fullTechnicalAcceptance:false,sourceChoiceNotObjectApproval:true}},receiptFileStem:'masonry_silicate65_m75_dpc_reuse_r4',
  verifyCore:async()=>{
   // Real normal guard first; it throws on incompatibility. This is the same
   // existing representative/clone-plan path, not metadata-only authority mode.
   const retainedAdmission=masonryCeramic250RetainedRepresentativeCheckR4(config,context.sourceRoot);
   assert.equal(retainedAdmission.truthAuthorityOnlyV1,false);
   assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:config.passport.independentCompletenessMap,formulaDefinitions:model.formulas,resourceDefinitions:model.resources}),[]);
   assert.deepEqual(config.runtimeProfileInput,profile);assert.equal(Object.keys(config.shortInput).length,5);
   for(const parameter of added){assert(!Object.hasOwn(config.runtimeProfileInput??{},parameter.parameter_id));assert(!Object.hasOwn(config.acceptanceInput,parameter.parameter_id));}
   const ordinary=await compile(model,config.shortInput,{confirmedParameters:profile});assert(![...ordinary.rows,...ordinary.preliminaryNeeds].some(row=>row.row_id.startsWith(prefix+':')));
   // Fixture-only source-context branch. No actual layout/design is supplied,
   // accepted, stored in the baseline or made a consumer question.
   const fixture=await compile(model,config.shortInput,{confirmedParameters:{...profile,[scopeId]:exactScope}}),rows=[...fixture.rows,...fixture.preliminaryNeeds];
   assert.equal(fixture.parameters[layoutId]??null,null);assert.equal(rows.find(row=>row.row_id===prefix+':strip-installed')?.quantity,'1.46');
   for(const key of ['bed-mortar','installation-labour','measuring-cutting-tools','disposed-waste'])assert.equal(rows.find(row=>row.row_id===prefix+':'+key)?.quantity,null,key);
   const scope=rows.find(row=>row.row_id===guard+':actual-scope');assert(scope);assert(record(scope.calculation_trace));assert(record(scope.calculation_trace.resourceGraph));assert(record(scope.calculation_trace.resourceGraph.scopeRequirementDecisionV1));assert.equal(scope.calculation_trace.resourceGraph.scopeRequirementDecisionV1.status,'OBJECT_FACT_REQUIRED');
   assert.equal(rows.find(row=>row.row_id===wall.prefix+':need:project-and-ready-base')?.quantity,null);assert.equal(model.passport.decision.completeTechnicalEstimateAccepted,false);
   return{status:'PASS_LINKED_M75_DPC_NORMAL_REPRESENTATIVE_REHEARSAL_NOT_PUBLICATION_OR_FULL',retainedAdmission,ordinaryInputs:5,engineeringFactsInBaseline:0,unknownDpcNorms:4,newPaidOwners:0,newProcurementOwners:0,full:false};
  }};
 return config;
}
