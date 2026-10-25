import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import route from '../../../data/estimate-benchmarks/source-packs/concrete-whole-hole-normal-route-r61.json';
import fullmap from '../../../data/estimate-benchmarks/source-packs/concrete-whole-hole-independent-map-r61.json';
import {buildConcreteWholeHoleFillingR61 as build,holeFillingSourceR61 as source,
 holeParameterR61 as p,holePhysicalInputR61,holeRowPrefixR61,HOLE_CATALOG_R61,HOLE_SOURCE_R61}
 from '../../../src/lib/estimate/v4/concreteWholeHoleFillingKrer46R61';
import {compileCanonicalEstimateCore} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {canonicalEstimateSha256HexText} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateSha256';
import {canonicalEstimateStableJson} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {resolveMasterAppendExplicitParameterSourcesR1,validateIndependentCompletenessMapReferences,
 resolveMasterSingleDefinitionBindingRowIds,resolveMasterSingleDefinitionBindingApplicabilityByRowId,
 type MasterSingleDefinitionSuccessorConfig as Config} from './prepareMasterSingleDefinitionSuccessorR1';
import type {MasterExplicitParameterSourcesR1} from './masterSingleDefinitionRetainParentBindingsR1';
const packPath='data/estimate-benchmarks/source-packs/concrete-krer46-whole-hole-fill-r61.json';
const mapPath='data/estimate-benchmarks/source-packs/concrete-whole-hole-independent-map-r61.json';
const routePath='data/estimate-benchmarks/source-packs/concrete-whole-hole-normal-route-r61.json';
const modelPath='src/lib/estimate/v4/concreteWholeHoleFillingKrer46R61.ts';
const configPath='scripts/estimate/r4a13/prepareConcreteWholeHoleFillingR61.ts';
const sha=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');
const pin=(root:string,path:string,hash:string)=>{const b=readFileSync(resolve(root,path));assert.equal(sha(b),hash,'R61_INPUT_SHA:'+path);return b;};
let actualCalls=0;
export const concreteHoleActualCoreCallsR61=()=>actualCalls;
type Context=Readonly<{sourceRoot:string;releaseId:string;searchReleaseId:string;outputRoot:string}>;
const object=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const snapshot=(name:string,value:unknown)=>{
 const out=process.env.HOLE_R61_SNAPSHOT_OUTPUT;assert(out,'R61_ACTUAL_SNAPSHOT_OUTPUT_REQUIRED');
 mkdirSync(out,{recursive:true});writeFileSync(resolve(out,name+'.json'),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
};
/** Data for the existing append publisher only. A new scoped source key owns
 * this exact table, while the existing generic KG46 source stays untouched.
 * All historical prices and project defaults remain outside this candidate. */
/** Scoped current read evidence is a collision gate, never global absence or
 * source approval. A plausible owner must be reviewed before a new card. */
export function assertConcreteWholeHoleScopedIdentityReviewR241(scope:unknown,expected:{
 definitionReleaseId:string;searchReleaseId:string;
}):asserts scope is Record<string,unknown>{
 assert(object(scope),'R241_SCOPE_OBJECT_REQUIRED');
 assert.equal(scope.contract,'current-whole-hole-scope/r237','R241_SCOPE_CONTRACT');
 assert.equal(scope.status,'PASS_READONLY_BOUNDED_SCOPE','R241_SCOPE_NOT_ACCEPTED');
 assert.equal(scope.globalAbsenceClaim,false,'R241_NO_GLOBAL_ABSENCE_CLAIM');
 assert.equal(scope.databaseWrites,0,'R241_SCOPE_NOT_READ_ONLY');
 assert.equal(scope.transactionRolledBack,true,'R241_SCOPE_ROLLBACK_NOT_PROVED');
 assert.equal(scope.definitionReleaseId,expected.definitionReleaseId,'R241_SCOPE_DEFINITION_RELEASE_DRIFT');
 assert.equal(scope.searchReleaseId,expected.searchReleaseId,'R241_SCOPE_SEARCH_RELEASE_DRIFT');
 assert(Array.isArray(scope.headers),'R241_SCOPE_ARRAY_REQUIRED:headers');
 assert(Array.isArray(scope.sources),'R241_SCOPE_ARRAY_REQUIRED:sources');
 assert(Array.isArray(scope.locators),'R241_SCOPE_ARRAY_REQUIRED:locators');
 assert(Array.isArray(scope.identities),'R241_SCOPE_ARRAY_REQUIRED:identities');
 assert.equal(scope.headers.length,0,'R241_PLAUSIBLE_OWNER_REVIEW_REQUIRED');
 assert.equal(scope.locators.length,0,'R241_REGISTERED_017_REUSE_REVIEW_REQUIRED');
 assert.equal(scope.identities.length,0,'R241_EXISTING_IDENTITY_REUSE_REVIEW_REQUIRED');
 assert(scope.sources.every(row=>object(row)&&row.source_key!==HOLE_SOURCE_R61),
  'R241_EXISTING_EXACT_SOURCE_REUSE_REVIEW_REQUIRED');
}
export function prepareConcreteWholeHoleFillingR61(context:Context):Config{
 pin(context.sourceRoot,packPath,route.sourcePack.sha256);
 pin(context.sourceRoot,source.source.path,source.source.sha256);
 assert.equal(sha(readFileSync(route.activeMaster.path)),route.activeMaster.sha256);
 const scope:unknown=JSON.parse(pin(context.sourceRoot,route.currentScope.path,route.currentScope.sha256).toString('utf8'));
 assertConcreteWholeHoleScopedIdentityReviewR241(scope,route.currentScope);
 assert.equal(context.releaseId,route.currentScope.definitionReleaseId);assert.equal(context.searchReleaseId,route.currentScope.searchReleaseId);
 assert.equal(route.catalogId,HOLE_CATALOG_R61);assert.equal(route.sourceId,HOLE_SOURCE_R61);
 const d=build(),ordinary=holePhysicalInputR61('rc-wall','2.5','0.1');
 const sources:MasterExplicitParameterSourcesR1=Object.fromEntries(d.parameters.map(parameter=>[parameter.parameter_id,
  parameter.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM'
   ?{kind:'UNRESOLVED',sourceIds:[]}:{kind:'KNOWN',sourceIds:[HOLE_SOURCE_R61]}]));
 const needRows=d.resources.filter(r=>r.source_metadata?.sourceRole==='UNRESOLVED_APPLICATION_NORM').map(r=>r.row_id);
 const columns=source.columns.filter(c=>c.admittedToConcreteCandidate);
 const config:Config={contract:route.contract,stopCode:'CONCRETE_WHOLE_HOLE_R61',applicationName:'concrete-whole-hole-r61',
  expectedBranch:'codex/r4-a5-clean-08b18902',masterPath:route.activeMaster.path,masterSha256:route.activeMaster.sha256,
  parentReleaseId:context.releaseId,parentSearchReleaseId:context.searchReleaseId,
  currentReleasePath:'data/estimate-benchmarks/r568-local-developer-canonical-release.json',outputRoot:context.outputRoot,
  sourcePaths:[packPath,mapPath,routePath,route.currentScope.path,source.source.path,modelPath,configPath,
   'scripts/estimate/r4a13/concreteWholeHoleFillingNormalR61.test.ts',
   'scripts/estimate/r4a13/concreteWholeHoleScopeGuardR241.test.ts',
   'src/lib/estimate/v4/automaticConstructionOwnerR1.ts',
   'src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1.ts',
   'src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts','src/lib/estimate/estimateDeterministicHash.ts',
   'src/lib/estimate/backendPlatform/canonicalMachineHourPriceCoverageV1.ts',
   'scripts/estimate/r4a13/concreteWholeHoleKnownCostR220.test.ts',
   'data/estimate-benchmarks/fixtures/concrete-whole-hole-known-cost-r220.json',
   'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts',
   'scripts/estimate/r4a13/masterSingleDefinitionAppendGuardsR1.ts','scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts'],
  catalogId:HOLE_CATALOG_R61,sourceId:HOLE_SOURCE_R61,normId:columns.map(c=>c.normId).join('|'),
  sourceMetadata:{source_title:'Заделка отверстий в бетоне по целым столбцам КРЕР46',
   source_authority:'Госстрой Кыргызской Республики',official_url:source.source.officialUrl,
   artifact_sha256:source.source.sha256,source_kind:'EXACT_KG_WHOLE_COLUMN_PARTIAL_PHYSICAL_PROVISION',
   exact_locator:'КРЕР46-2015, таблица46-03-017, колонки01–06, PDF49–50; измеритель1м³ заделки; техническая часть1.0,1.14,1.25,2.1; не цена2015 и не правовой допуск2026',
   use_restriction:route.scopeNote},
  parameterDefinitions:d.parameters,formulaDefinitions:d.formulas,resourceDefinitions:d.resources,
  shortInput:ordinary,acceptanceInput:ordinary,runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},
  expectedParentShape:[0,0,0],benchmarkOrdinal:0,validationScenario:'ONE_PHYSICAL_REPAIR_CARD_SIX_WHOLE_COLUMNS_NO_GB_SUBSTITUTION',
  passport:{canonicalRuName:route.titleRu,workKey:route.workKey,physicalResultRu:'Заделаны фактические отверстия по отдельному проекту ремонта.',
   includedScopeRu:['Расчистка, опалубка, бетон и заделка; арматура только в собственных железобетонных колонках.',
    'Целые исходные столбцы труда, машин и материалов без выдуманного распределения по операциям.'],
   excludedScopeRu:route.remaining,independentCompletenessMap:fullmap,unresolvedApplicableResourceRowIds:needRows},
  applicability:{primaryMeasureParameterId:p('net_fill_volume_m3'),territory:'KG',wholeColumns:columns.map(c=>c.normId),
   quantityScope:'PARTIAL',fullTechnicalAcceptance:false,noExistingGbRepairReplacement:true,noFoundationFloorEquivalence:true},
  binding:{rowId:d.nativeSourceRowIds[0]!,additionalRowIds:d.nativeSourceRowIds.slice(1),
   applicability:{wholeSourceColumns:columns.map(c=>c.normId),fullTechnicalAcceptance:false},
   applicabilityByRowId:Object.fromEntries(columns.flatMap(c=>c.nativeRows.map(r=>[r.nativeRowId,
    {exact_column:c.normId,source_artifact_sha256:source.source.sha256,sourceRole:'EXACT_WHOLE_KG_NATIVE_COLUMN',
     noNeighborProductOrMethodTransfer:true,fullTechnicalAcceptance:false}])) )},
  locator:{key:'kg46-03-017-whole-concrete-hole-filling-r61',payload:{contract:route.contract,
   sourcePackSha256:route.sourcePack.sha256,wholeColumns:columns.map(c=>c.normId),independentCompletenessMap:fullmap,
   historicalPricesImported:false,fullTechnicalAcceptance:false}},
  search:{primaryUom:'m3',canonicalNameRu:route.titleRu,aliases:['Заделка отверстий в бетонных конструкциях'],
   shortScopeRu:'Отдельный фактический ремонт отверстий в перекрытиях, стенах и перегородках.',
   keyDistinguishingParameters:d.ordinaryParameterIds,clarificationFields:d.ordinaryParameterIds,
   includedBoundaries:['Сечение одного отверстия не более0,2м²; самостоятельный чистый объём заделки.'],
   excludedBoundaries:route.remaining,extraSearchTermsRu:'бетон заделка отверстия гнезда борозды ремонт перекрытие стена',
   sourceProvenance:{contract:route.contract,exactColumns:columns.map(c=>c.normId),sourceOnlyCandidate:true,fullTechnicalAcceptance:false}},
  catalogAppend:{explicitParameterSources:sources,requireUniqueWorkKey:true,
   capturedSourcePreimage:{sourceKey:HOLE_SOURCE_R61,expected:null},
   identity:{namespace:'global',domain:'concrete',sourceIdentity:route.sourceIdentity,workKey:route.workKey,titleRu:route.titleRu,denominatorEligible:true},
   searchPlacement:{groupMode:'create',groupId:route.groupId,groupNameRu:route.titleRu,domainId:'concrete',systemId:'concrete',
    subsystemId:'repair',assemblyId:route.workKey,workFamilyId:'concrete_hole_filling',breadcrumb:['Бетонные работы','Ремонт',route.titleRu],
    membershipOrdinal:0,elementType:'WORK',operationKind:'REPAIR',technologyVariant:'WHOLE_KRER46_03_017_CONCRETE',constructionState:'EXISTING',
    normativeClassifiers:columns.map(c=>c.normId),applicabilityTags:['EXACT_KG2015_WHOLE_SOURCE','SEPARATE_NET_FILL_VOLUME','SINGLE_OPENING_FACE_AREA','PARTIAL_PROVISION'],
    publicationState:'ADMITTED_BACKEND',catalogOrigin:'GLOBAL',adjudicationClass:'EFFECTIVE_WORK',selectable:true,
    groupOracleDisposition:{contract:route.contract,candidateOnly:true,liveNormalAndLockedAbsenceRequired:true,globalAbsenceClaim:false},
    independentDisposition:{contract:route.contract,classification:'CANONICAL_VISIBLE',physicalResult:'Самостоятельная заделка отверстий в бетоне',oneCardSixInternalProfiles:true}}},
  forbiddenAdjacentMatchers:[],owner:'ROOT_SINGLE_INTEGRATOR_CONCRETE',receiptFileStem:'concrete_whole_hole_r61',
  verifyTargetPrecondition:async(client,phase)=>{
   const rows=await client.query("select id from public.estimate_normative_locator where locator_key ilike '%46%03%017%' or locator::text ilike '%46-03-017%' limit 1");
   assert.equal(rows.rows.length,0,'R61_EXACT_017_ALREADY_REGISTERED_REUSE_REQUIRED:'+phase);
  },
  verifyCore:async()=>{
   concreteWholeHolePurePreflightR61(config);assert.equal(actualCalls,0,'R61_NO_CORE_BEFORE_PURE');
   let completed=0,rejected=0;
   const call=async(label:string,input:Record<string,unknown>,confirmed:Record<string,unknown>={})=>{
    actualCalls++;process.stdout.write('CONCRETE_R61_ACTUAL_CORE_BEGIN='+actualCalls+';case='+label+'\n');
    try{const result=await compileCanonicalEstimateCore({operation:'compile',compilerVersion:route.contract,catalogId:HOLE_CATALOG_R61,
     primaryMeasureParameterId:p('net_fill_volume_m3'),parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],
     submittedParameters:input,confirmedParameters:confirmed,currencyCode:'KGS',priceItems:[],maximumResourceRows:d.resources.length,
     hashJson:value=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(value))});snapshot(String(actualCalls).padStart(2,'0')+'-'+label,result);return result;
    }catch(error:unknown){snapshot(String(actualCalls).padStart(2,'0')+'-'+label+'-reject',{message:error instanceof Error?error.message:String(error),code:object(error)?error.code:null});throw error;}
   };
   const project={
    [p('approved_method_ref')]:'TEST_ONLY independent compatible reconstruction design and whole PPR; not an actual object approval',
    [p('approved_scope')]:'RECONSTRUCTION_OR_APPROVED_ANALOGOUS_SCOPE',[p('concrete_class')]:'B15',[p('aggregate_mm')]:'20'};
   for(const column of columns){
    const area=column.maximumSingleOpeningAreaM2!;
    const result=await call('whole-'+column.normId,holePhysicalInputR61(column.system,'2.5',area),project);completed++;
    const expected=route.oracleAt2_5m3[column.normId as keyof typeof route.oracleAt2_5m3];assert(expected);
    assert.deepEqual(result.rows.map(row=>[row.row_id,row.quantity,row.unit_id]),expected,'R61_ALL_NATIVE_ROWS_EXACT:'+column.normId);
    assert.equal(result.preliminaryNeeds.length,column.system==='concrete-wall'?26:29);
    assert(result.rows.every(row=>row.unit_price===null&&!row.included_in_procurement));
    assert(result.preliminaryNeeds.every(need=>need.row_id.startsWith(holeRowPrefixR61(column.normId)+'need:')&&need.quantity===null&&!need.procurement_eligible));
    assert.equal(result.totals.amount,'0');
   }
   const missing=await call('ordinary-geometry-project-missing',ordinary);completed++;
   assert.equal(missing.rows.length,0);assert.equal(missing.preliminaryNeeds.length,41);
   const zero=await call('zero-scope',{...ordinary,[p('net_fill_volume_m3')]:'0'});completed++;
   assert.deepEqual(zero.rows,[]);assert.deepEqual(zero.preliminaryNeeds,[]);
   const need=d.sourceNeedParameterIds[0]!;
   for(const channel of ['submitted','confirmed'] as const){
    await assert.rejects(()=>call('unknown-norm-'+channel,{...ordinary,...(channel==='submitted'?{[need]:'1'}:{})},
     channel==='confirmed'?{...project,[need]:'1'}:project),
     {code:'PARAMETER_VALIDATION_FAILED',message:new RegExp('unresolved application norm cannot be supplied '+need)});rejected++;
   }
   await assert.rejects(()=>call('forced-neighbor-source',{...ordinary,hole61_forced_source_norm_id:'46-03-017-07'},project),
    {code:'PARAMETER_VALIDATION_FAILED',message:/unknown estimate parameters: hole61_forced_source_norm_id/});rejected++;
   await assert.rejects(()=>call('outside-single-face-scope',{...ordinary,[p('single_opening_face_m2')]:'0.200001'},project),
    {code:'PARAMETER_VALIDATION_FAILED',message:new RegExp('parameter above maximum '+p('single_opening_face_m2'))});rejected++;
   await assert.rejects(()=>call('different-concrete-product',ordinary,{...project,[p('concrete_class')]:'B25'}),
    {code:'PARAMETER_VALIDATION_FAILED'});rejected++;
   await assert.rejects(()=>call('negative-fill-volume',{...ordinary,[p('net_fill_volume_m3')]:'-1'},project),
    {code:'PARAMETER_VALIDATION_FAILED',message:new RegExp('parameter below minimum '+p('net_fill_volume_m3'))});rejected++;
   assert.equal(actualCalls,14);assert.equal(completed,8);assert.equal(rejected,6);
   return{status:'PASS_NORMAL_CONFIG_SIX_WHOLE_COLUMNS_PARTIAL_PROVISION',actualCoreEntries:actualCalls,completed,rejected,
    wholeNativeRows:65,newFullTechnologies:0,existingNeedClosures:0,canonicalWrites:0,databaseWrites:0,
    actualNormalLockedDbPreflight:'UNRUN',savedApiNativePdfProcurementAcceptance:'UNRUN'};
  }};
 return config;
}
export function concreteWholeHolePurePreflightR61(config:Config){
 const d=build();assert.equal(actualCalls,0,'R61_PURE_MUST_PRECEDE_CORE');
 assert.deepEqual(config.expectedParentShape,[0,0,0]);assert.equal(config.catalogAppend?.requireUniqueWorkKey,true);
 assert.deepEqual(config.catalogAppend?.capturedSourcePreimage,{sourceKey:HOLE_SOURCE_R61,expected:null});
 assert.equal(config.binding.retainParentBindings,undefined);assert.equal(config.binding.reuseExistingNormativeRegistry,undefined);
 assert.deepEqual(config.runtimeProfileInput,{});assert.deepEqual(config.runtimeProfileClassification,{});assert.deepEqual(config.runtimeProfileSourceIds,{});
 assert(config.parameterDefinitions.every(parameter=>parameter.default_value===null));
 assert.deepEqual(config.parameterDefinitions.filter(parameter=>parameter.truth_metadata.visibility_role==='USER_INPUT').map(parameter=>parameter.parameter_id),d.ordinaryParameterIds);
 const resolved=resolveMasterAppendExplicitParameterSourcesR1(config,{parameters:config.parameterDefinitions,formulas:config.formulaDefinitions,resources:config.resourceDefinitions});assert(resolved);
 assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:config.passport.independentCompletenessMap,
  formulaDefinitions:config.formulaDefinitions,resourceDefinitions:config.resourceDefinitions}),[]);
 const bound=resolveMasterSingleDefinitionBindingRowIds(config,config.resourceDefinitions,['EXISTING_PUBLISHER_DERIVES_UUID']);
 resolveMasterSingleDefinitionBindingApplicabilityByRowId(config,config.resourceDefinitions,['EXISTING_PUBLISHER_DERIVES_UUID']);
 assert.deepEqual([...bound].sort(),[...d.nativeSourceRowIds].sort());assert.equal(bound.length,65);
 assert.equal(config.resourceDefinitions.length,233);assert.equal(config.passport.unresolvedApplicableResourceRowIds?.length,168);
 assert.equal(fullmap.entries.length,233);assert.equal(fullmap.evidenceSha256,route.sourcePack.sha256);
 for(const mutation of ['missing-row','wrong-unit','wrong-operation'] as const){
  const map=structuredClone(fullmap);
  if(mutation==='missing-row')map.entries[0]!.resolution.rowId='NOT_A_SOURCE_RESOURCE';
  if(mutation==='wrong-unit')map.entries[0]!.unitId='m3';
  if(mutation==='wrong-operation')map.entries[0]!.requiredOperationIds=['UNRELATED_OPERATION'];
  assert(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:config.formulaDefinitions,
   resourceDefinitions:config.resourceDefinitions}).length>0,'R61_FULL_MAP_NEGATIVE:'+mutation);
 }
 return{status:'PASS_PURE_NORMAL_CONFIG_INDEPENDENT_FULL_MAP_AND_SOURCE_ARRAYS',nativeRows:65,unresolvedPhysicalRows:168,
  simpleInputs:3,wholeColumns:6,sourceUuid:null,locatorUuid:null,actualDbNormalLockedPreflight:'UNRUN',fullTechnicalAcceptance:false};
}
