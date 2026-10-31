import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import type {MasterSingleDefinitionSuccessorConfig as Config} from './prepareMasterSingleDefinitionSuccessorR1';
import {validateIndependentCompletenessMapReferences} from './prepareMasterSingleDefinitionSuccessorR1';
import {masterRetainedParentCaptureSha256R1,type MasterRetainedParentCaptureR1 as Capture,type MasterExplicitParameterSourcesR1 as Sources} from './masterSingleDefinitionRetainParentBindingsR1';
import {canonicalDefinitionPublicationStableValueR1 as stable} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';
import {normalizeCanonicalProfessionalBoqUnit} from '../../../src/lib/estimate/canonicalUnits';
import {getEngineeringUnitV4} from '../../../src/lib/estimate/v4/engineeringUnitRegistryV4';
import {masonryWallKrer08PackR1 as kg} from '../../../src/lib/estimate/v4/masonryWallKrer08SystemsR1';
import {READY_M50_SUPPLY_POST_R1 as pack,readyM50PostCaptureR1 as captureOf,readyM50PostCapturedRepresentativeR1 as captured,buildReadyM50PostRetainedSuccessorR1 as build,readyM50PostCompletenessR1 as mapOf,readyM50PostIdR1 as id,readyM50PostRowIdR1 as row,compileReadyM50PostR1 as compile} from '../../../src/lib/estimate/v4/masonryReadyM50SupplyPostR1';

type Json=Record<string,any>;
const packPath='data/estimate-benchmarks/source-packs/masonry-ready-m50-supply-post-kt3111176-r1.json';
const fixturePath='data/estimate-benchmarks/fixtures/masonry-ready-m50-post-current-parent-r1.json';
const sha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const valueSha=(v:unknown)=>createHash('sha256').update(JSON.stringify(stable(JSON.parse(JSON.stringify(v))))).digest('hex');
export function assertReadyM50PostPersonUnitR1(){
 assert.equal(normalizeCanonicalProfessionalBoqUnit('person'),'person','CANONICAL_BOQ_PERSON_HEADCOUNT_INFO_UNIT_REQUIRED');
 const unit=getEngineeringUnitV4('person');assert(unit&&unit.dimension==='headcount','CANONICAL_BOQ_PERSON_HEADCOUNT_INFO_UNIT_REQUIRED');
 assert(unit.allowed_boq_categories.includes('subcontract_service'),'CANONICAL_PERSON_SERVICE_COUNT_CATEGORY_REQUIRED');
}
/** Synthetic controls only; no project approval, actual inventory or supplier quote. */
export function readyM50PostControlR1(size:'small'|'normal'|'zero'='normal'){
 return{[pack.parentSelector]:pack.parentSelectedValue,[pack.selectorId]:pack.selectorValue,m33_masonry_wall_length_m:size==='zero'?'0.0':size==='small'?'1':'10',m33_masonry_wall_height_m:size==='small'?'1':'3',m33_masonry_openings_area_m2:size==='normal'?'5.5':'0',m33_masonry_nonmasonry_insert_volume_m3:size==='normal'?'0.125':'0',m33_masonry_storey_height_m:'4',m33_masonry_kg_project_basis:kg.projectBasisValue,m33_masonry_source_system_conformance:kg.sourceFactValue,m33_masonry_approved_masonry_design_reference:'TEST_ONLY exact brick and readyM50 design; not real project evidence',m33_masonry_machine_fulfillment_tower_crane:kg.machineFulfillmentChoices.own,...Object.fromEntries([...pack.projectFacts,{key:'stock-record'}].map(p=>[id(p.key+'_reference'),'TEST_ONLY actual record placeholder for isolated controls'])),...Object.fromEntries(pack.stockFacts.map(p=>[id('available_'+p.key),'0']))};
}
/** Existing same-card publisher config. Historical baseline/selector are retained;
 * the explicit optional subprofile adds only INFO counts and honest gates. */
export function readyM50PostConfigR1(parent:{releaseId:string;searchReleaseId:string;sourceRoot?:string;outputRoot?:string}):Config{
 const capture=captureOf() as Capture,old=captured(),model=build(old),map=mapOf();
 const own=(p:string)=>parent.sourceRoot&&existsSync(join(parent.sourceRoot,p))?join(parent.sourceRoot,p):p;
 assert.equal(sha(own(pack.source.path)),pack.source.sha256);
 const newResources=model.resources.filter(r=>!old.resources.some(p=>p.row_id===r.row_id)),bound=newResources.map(r=>r.row_id),newParameters=model.parameters.filter(p=>!old.parameters.some(q=>q.parameter_id===p.parameter_id));
 const sources:Sources=Object.fromEntries(newParameters.map(p=>[p.parameter_id,p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM'?{kind:'UNRESOLVED',sourceIds:[]}:{kind:'KNOWN',sourceIds:[pack.sourceId]}]));
 const runtime=structuredClone(capture.baseline.input_values),runtimeIds=Object.keys(runtime);
 const shortInput={[pack.parentSelector]:pack.parentSelectedValue,[pack.selectorId]:pack.selectorValue,m33_masonry_wall_length_m:10,m33_masonry_wall_height_m:3,m33_masonry_openings_area_m2:0,m33_masonry_nonmasonry_insert_volume_m3:0,m33_masonry_storey_height_m:4};
 const unresolved=model.resources.filter(r=>r.source_metadata?.sourceRole==='UNRESOLVED_APPLICATION_NORM'||r.row_id.includes(':need:')).map(r=>r.row_id);
 const continuation=capture.definition.source_metadata.retainedParentBindingSuccessorV1?{successorProvenanceContinuation:{contract:'master-retained-binding-continuation/r1' as const,capturedSourceMetadata:structuredClone(capture.definition.source_metadata),capturedSourceMetadataSha256:valueSha(capture.definition.source_metadata),capturedPreviousSuccessorSha256:valueSha(capture.definition.source_metadata.retainedParentBindingSuccessorV1)}}:{};
 return{contract:pack.contract,stopCode:'READY_M50_SERIAL_POST_R1',applicationName:'masonry-ready-m50-serial-post',expectedBranch:'codex/r4-a5-clean-08b18902',masterPath:'C:/Users/User/Downloads/GOX_BUILD_MASTER_TZ_2_12_2026-10-22.txt',masterSha256:'10ff85f13544fb0bb29194baa91da506f7de342f3e8d2b370f61017a14e81245',parentReleaseId:parent.releaseId,parentSearchReleaseId:parent.searchReleaseId,currentReleasePath:'data/estimate-benchmarks/r568-local-developer-canonical-release.json',outputRoot:parent.outputRoot??'.release-runtime/r568/masonry-ready-m50-post',
  sourcePaths:[packPath,fixturePath,'data/estimate-benchmarks/fixtures/masonry-ready-m50-post-literal-oracle-r1.json',pack.source.path,'src/lib/estimate/v4/masonryReadyM50SupplyPostR1.ts','src/lib/estimate/v4/masonryReadyM50SupplyPostR1.test.ts','scripts/estimate/r4a13/prepareMasonryReadyM50SupplyPostR1.ts','scripts/estimate/r4a13/prepareMasonryReadyM50SupplyPostR1.test.ts','src/lib/estimate/v4/automaticConstructionOwnerR1.ts','src/lib/estimate/v4/master33MasonryWallSystemsR1.ts','src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts','src/lib/estimate/professionalUnitRegistry.ts','src/lib/estimate/v4/engineeringUnitRegistryV4.ts','scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts','scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts'],
  catalogId:pack.catalogId,sourceId:pack.sourceId,normId:pack.normId,sourceMetadata:{source_title:pack.titleRu,source_authority:pack.source.author,source_kind:'HISTORICAL_AUTHOR_METHOD_KNOWN_ROSTER_NOT_CURRENT_KG_NORM',official_url:pack.source.url,artifact_sha256:pack.source.sha256,exact_locator:pack.source.locator,use_restriction:pack.source.jurisdiction+'; INFO roster only; actual product, method, site and supply gates remain; no additional labour or machine hours.'},
  parameterDefinitions:model.parameters,formulaDefinitions:model.formulas,resourceDefinitions:model.resources,shortInput,acceptanceInput:structuredClone(runtime),runtimeProfileInput:runtime,runtimeProfileClassification:Object.fromEntries(runtimeIds.map(p=>[p,capture.baseline.input_classification[p]])) as Config['runtimeProfileClassification'],runtimeProfileSourceIds:Object.fromEntries(runtimeIds.map(p=>[p,capture.baseline.normative_source_ids[p]])),expectedParentShape:[capture.parameters.length,capture.formulas.length,capture.resources.length],benchmarkOrdinal:1,validationScenario:'TEST_ONLY_READY_M50_SERIAL_POST_KNOWN_ROSTER_PARTIAL',
  passport:{canonicalRuName:'Кладка кирпичной стены',workKey:pack.catalogId.replace('canonical-work:base:',''),physicalResultRu:model.passport.physical_result_ru,includedScopeRu:model.passport.included_scope_ru,excludedScopeRu:model.passport.excluded_scope_ru,independentCompletenessMap:map,unresolvedApplicableResourceRowIds:unresolved},
  applicability:{...model.definition.applicability,fullTechnicalAcceptance:false,newFullTechnologies:0,newlyQuantifiedRosterCategories:4,closedPhysicalNeeds:0,initialSupplyAdmitted:false},
  binding:{rowId:bound[0]!,additionalRowIds:bound.slice(1),applicability:{contract:pack.contract,currentKgRegulatoryAdmission:false,sourceKnownRosterNotPhysicalClosure:true},applicabilityByRowId:Object.fromEntries(bound.map(rowId=>[rowId,{contract:pack.contract,rowId,source_artifact_sha256:pack.source.sha256,quantityScope:rowId.includes(':need:')?'UNRESOLVED_INTERNAL_SOURCE':rowId.includes(':stock-shortfall:')?'ACTUAL_STOCK_SHORTFALL_INFO_NOT_ORDER':pack.roster.some(r=>rowId===row(r.key))?'KNOWN_SOURCE_COUNT_ONE_SERIAL_ORGANIZATION':'ACTUAL_PROJECT_OR_SUPPLY_GATE',fullTechnicalAcceptance:false}])),retainParentBindings:{capturedParent:capture,capturedParentSha256:masterRetainedParentCaptureSha256R1(capture),newParameterSources:sources,capturedSourcePreimage:{sourceKey:pack.sourceId,expected:null},...continuation}},
  locator:{key:pack.locatorKey,payload:{contract:pack.contract,source:pack.source,wholeOrganization:pack.wholeOrganization,knownRoster:pack.roster,sourceProductAndMethodGaps:pack.internalGaps,actualProjectFacts:pack.projectFacts,initialSupplyBalanceHeld:true,fullTechnicalAcceptance:false}},
  search:{primaryUom:'m2',canonicalNameRu:'Кладка кирпичной стены',aliases:['Кладка кирпичной стены'],shortScopeRu:'Кирпичная стена с сохранёнными профилями; отдельный последовательный пост подачи готового М50 показывает известный roster и незакрытый допуск.',keyDistinguishingParameters:[pack.parentSelector,pack.selectorId],clarificationFields:[pack.parentSelector,pack.parentPrimary],includedBoundaries:model.passport.included_scope_ru,excludedBoundaries:model.passport.excluded_scope_ru,extraSearchTermsRu:'кирпичная стена готовый раствор подача бадья ящик последовательный пост',sourceProvenance:{contract:pack.contract,sourceArtifactSha256:pack.source.sha256,currentKgRegulatoryAdmission:false,fullTechnicalAcceptance:false}},
  forbiddenAdjacentMatchers:[],owner:'ROOT_SINGLE_WRITER_MASONRY_FAMILY',receiptFileStem:'masonry_ready_m50_serial_post',
  verifyCore:async()=>{
   assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:model.formulas,resourceDefinitions:model.resources}),[]);
   const short=await compile(model,shortInput);for(const r of pack.roster)assert.equal(short.rows.find(x=>x.row_id===row(r.key))?.quantity,r.quantity);
   const zero=await compile(model,{...shortInput,m33_masonry_wall_length_m:'0.0'});assert(![...zero.rows,...zero.preliminaryNeeds].some(r=>r.row_id.startsWith(pack.prefix+':')));
   const before=await compile(old,runtime),after=await compile(model,runtime),semantic=(r:typeof after)=>({rows:r.rows.map(x=>[x.row_id,x.unit_id,x.quantity,x.unit_price,x.amount,x.included_in_estimate,x.included_in_procurement]),needs:r.preliminaryNeeds.map(x=>[x.row_id,x.quantity,x.need_state,x.missing_parameter_ids]),totals:r.totals});assert.deepEqual(semantic(after),semantic(before));
   assert(newResources.every(r=>r.resource_graph.costTreatment==='INFORMATIONAL_SCOPE'&&!r.procurement_eligible));
   assertReadyM50PostPersonUnitR1();
   return{status:'PASS_BOUNDED_PARTIAL_KNOWN_ROSTER_ALL_GATES_RETAINED',knownRosterCategories:4,counts:[3,4,2,2],newPaidOwners:0,newProcurementOwners:0,closedPhysicalNeeds:0,newFullTechnologies:0};
  }
 };
}
export const readyM50PostRecipeRegistryR1=[{catalogId:pack.catalogId,configFactory:readyM50PostConfigR1}];
