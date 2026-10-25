import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {masonryGlassBlockNormalRouteR103 as route,masonryGlassBlockNormalSourceR103 as source,
 masonryGlassBlockCardR103,masonryGlassBlockNormalDefinitionR103 as build,masonryGlassBlockNormalCompletenessMapR103 as complete,
 masonryGlassBlockPhysicalInputR103 as input,type MasonryGlassBlockCardKeyR103} from '../../../src/lib/estimate/v4/masonryGlassBlockNormalCardsR103';
import {compileCanonicalEstimateCore} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {canonicalEstimateStableJson} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateSha256';
import {resolveMasterAppendExplicitParameterSourcesR1,validateIndependentCompletenessMapReferences,
 resolveMasterSingleDefinitionBindingRowIds,resolveMasterSingleDefinitionBindingApplicabilityByRowId,
 type MasterSingleDefinitionSuccessorConfig as Config} from './prepareMasterSingleDefinitionSuccessorR1';
import type {MasterExplicitParameterSourcesR1} from './masterSingleDefinitionRetainParentBindingsR1';

type Context={releaseId:string;searchReleaseId:string;outputRoot:string;sourceRoot:string};
const routePath='data/estimate-benchmarks/source-packs/masonry-glass-block-normal-route-r103.json';
const mapPath='data/estimate-benchmarks/source-packs/masonry-glass-block-independent-full-map-r103.json';
const configPath='scripts/estimate/r4a13/prepareMasonryGlassBlockNormalAppendR103.ts';
const modelPath='src/lib/estimate/v4/masonryGlassBlockNormalCardsR103.ts';
const testPath='scripts/estimate/r4a13/masonryGlassBlockNormalAppendR103.test.ts';
const record=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
function pin(root:string,path:string,hash:string){const bytes=readFileSync(resolve(root,path));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),hash,'R103_INPUT_BYTES:'+path);return bytes;}
function snapshot(name:string,value:unknown){const root=process.env.MASONRY_R103_ACTUAL_OUTPUT;if(!root)return;
 mkdirSync(root,{recursive:true});writeFileSync(resolve(root,name+'.json'),JSON.stringify(value,null,2)+'\n',{flag:'wx'});}
// Literal independent oracle at 12.5m2, not generated from definitions, observed
// output, or source rates at test execution. Source unit conversions occur once.
export const masonryGlassBlockNativeOracleR103:Readonly<Record<string,readonly (readonly [string,string,string])[]>>={
 '08-04-002-01':[['whole-labour','16.9625','man_hour'],['operator-information','0.245','man_hour'],['tower-crane8t','0.245','machine_hour'],['flatbed-truck5t','0.12375','machine_hour'],['glass-block','325','piece'],['reinforcement','14','kg'],['ready-cement-lime-m25','0.0925','m3']],
 '08-04-002-02':[['whole-labour','16.675','man_hour'],['operator-information','0.245','man_hour'],['tower-crane8t','0.245','machine_hour'],['flatbed-truck5t','0.12375','machine_hour'],['glass-block','325','piece'],['reinforcement','14','kg'],['ready-cement-lime-m25','0.0925','m3']],
 '08-04-002-03':[['whole-labour','19.55','man_hour'],['operator-information','0.245','man_hour'],['tower-crane8t','0.245','machine_hour'],['flatbed-truck5t','0.12375','machine_hour'],['glass-block','325','piece'],['reinforcement','14','kg'],['ready-cement-lime-m25','0.0925','m3']],
 '08-04-002-04':[['whole-labour','19.11875','man_hour'],['operator-information','0.245','man_hour'],['tower-crane8t','0.245','machine_hour'],['flatbed-truck5t','0.12375','machine_hour'],['glass-block','325','piece'],['reinforcement','14','kg'],['ready-cement-lime-m25','0.0925','m3']],
};
let actualCalls=0;
export function masonryGlassBlockActualCoreCallsR103(){return actualCalls;}

/** Uses only the existing normal catalogAppend and sole deterministic publisher.
 * The captured glass-name search is neither exact-code nor live absence proof. */
export function prepareMasonryGlassBlockNormalAppendR103(key:MasonryGlassBlockCardKeyR103,context:Context):Config{
 pin(context.sourceRoot,route.immutableR97ComponentPack.path,route.immutableR97ComponentPack.sha256);
 pin(context.sourceRoot,source.source.path,source.source.sha256);
 assert.equal(createHash('sha256').update(readFileSync(route.activeMaster.path)).digest('hex'),route.activeMaster.sha256);
 const lookup:unknown=JSON.parse(pin(context.sourceRoot,route.rootScopedLookup.path,route.rootScopedLookup.sha256).toString('utf8').replace(/^\uFEFF/u,''));
 assert(record(lookup)&&lookup.status==='PLAUSIBLE_CANDIDATES_NOT_ADMISSION'&&lookup.noMatchNotProofOfGlobalAbsence===true);
 assert.equal(route.rootScopedLookup.exactFourSourceCodesSearched,false);
 assert.equal(context.releaseId,lookup.definitionReleaseId,'R103_CAPTURE_DEFINITION_RELEASE');
 assert.equal(context.searchReleaseId,lookup.searchReleaseId,'R103_CAPTURE_SEARCH_RELEASE');
 const card=masonryGlassBlockCardR103(key),d=build(key),map=complete(key),area=card.primaryMeasureParameterId;
 const profiles=source.profiles.filter(p=>d.profileKeys.includes(p.key)),known=[...d.nativeSourceRowIds,...d.includedOperationRowIds];
 const unknownRows=d.resources.filter(r=>r.source_metadata?.sourceRole==='UNRESOLVED_APPLICATION_NORM').map(r=>r.row_id);
 const parameterSources:MasterExplicitParameterSourcesR1=Object.fromEntries(d.parameters.map(p=>[p.parameter_id,
  p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM'?{kind:'UNRESOLVED',sourceIds:[]}:{kind:'KNOWN',sourceIds:[card.sourceKey]}]));
 const acceptance=input(key,'12.5','4');
 const config:Config={contract:route.contract,stopCode:'MASONRY_GLASS_NORMAL_R103',applicationName:'masonry-glass-normal-r103-'+key,
  expectedBranch:'codex/r4-a5-clean-08b18902',masterPath:route.activeMaster.path,masterSha256:route.activeMaster.sha256,
  parentReleaseId:context.releaseId,parentSearchReleaseId:context.searchReleaseId,
  currentReleasePath:'data/estimate-benchmarks/r568-local-developer-canonical-release.json',outputRoot:context.outputRoot,
  catalogId:card.catalogId,sourceId:card.sourceKey,normId:card.normIds.join('|'),
  sourcePaths:[routePath,mapPath,route.immutableR97ComponentPack.path,route.rootScopedLookup.path,source.source.path,modelPath,configPath,testPath,
   'src/lib/estimate/v4/masonryGlassBlockKrer08R97.ts','src/lib/estimate/v4/automaticConstructionOwnerR1.ts',
   'src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts','src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1.ts',
   'src/lib/estimate/estimateDeterministicHash.ts','scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts',
   'scripts/estimate/r4a13/masterSingleDefinitionAppendGuardsR1.ts','scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts'],
  sourceMetadata:{source_title:card.titleRu,source_authority:'Госстрой Кыргызской Республики',official_url:source.source.officialUrl,
   artifact_sha256:source.source.sha256,source_kind:'EXACT_WHOLE_KG_GLASS_BLOCK_COLUMNS_WITH_OPEN_PHYSICAL_NEEDS',
   exact_locator:'КРЕР08,2015; '+card.normIds.join(', ')+'; 100 м²; PDF '+[...new Set(profiles.flatMap(p=>p.sourcePages))].join(', '),
   use_restriction:'Только собственный стеклоблок194×194×98мм, армирование и готовый цементно-известковыйМ25 указанной системы. Нет текущего правового/проектного допуска из источника2015, переноса расшивки из соседней нормы, цен или FULL.'},
  parameterDefinitions:d.parameters,formulaDefinitions:d.formulas,resourceDefinitions:d.resources,
  shortInput:acceptance,acceptanceInput:acceptance,runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},
  expectedParentShape:[0,0,0],benchmarkOrdinal:0,validationScenario:'TWO_DISTINCT_GLASS_PHYSICAL_RESULTS_FOUR_WHOLE_COLUMNS_PARTIAL_PROVISION',
  passport:{canonicalRuName:card.titleRu,workKey:card.workKey,physicalResultRu:card.physicalResultRu,
   includedScopeRu:[card.physicalResultRu,'Исходный нормативный труд и состав сохраняются целиком; физическая готовность и наличие не выведены из площади.'],
   excludedScopeRu:route.remaining,independentCompletenessMap:map,unresolvedApplicableResourceRowIds:unknownRows},
  applicability:{primaryMeasureParameterId:area,territory:'KG',exactColumns:card.normIds,quantityScope:'PARTIAL',
   fullTechnicalAcceptance:false,newFullTechnologies:0,candidateIdentityOnly:true,ordinaryNormalLockedAppendGuardsRequired:true,
   pointingIncluded:key==='partition',ownAreaSemanticIdPreserved:true,readyM50PostTransferredToM25:false},
  binding:{rowId:known[0]!,additionalRowIds:known.slice(1),applicability:{exactColumns:card.normIds,fullTechnicalAcceptance:false},
   applicabilityByRowId:Object.fromEntries(known.map(rowId=>{const row=d.resources.find(r=>r.row_id===rowId);assert(row);return[rowId,
    {exact_column:row.source_metadata?.exact_column,source_artifact_sha256:source.source.sha256,
     sourceRole:row.source_metadata?.sourceRole,wholeSourceNoCrossPhysicalResultTransfer:true,fullTechnicalAcceptance:false}];}))},
  locator:{key:'kg-krer08-04-002-glass-whole-r103-'+key,payload:{contract:route.contract,exactColumns:card.normIds,
   immutableComponentPack:source,normalRoute:route,independentCompletenessMap:map,sourcePricesImported:false,fullTechnicalAcceptance:false}},
  search:{primaryUom:'m2',canonicalNameRu:card.titleRu,aliases:[card.titleRu],shortScopeRu:card.physicalResultRu,
   keyDistinguishingParameters:[...d.ordinaryParameterIds],clarificationFields:[...d.ordinaryParameterIds],
   includedBoundaries:[card.physicalResultRu],excludedBoundaries:route.remaining,
   extraSearchTermsRu:key==='partition'?'кладка стеклоблок перегородка расшивка':'кладка стеклоблок заполнение проёма',
   sourceProvenance:{contract:route.contract,exactColumns:card.normIds,candidateOnly:true,sourceSearchOnlyNamePatterns:true,
    exactFourSourceCodesSearched:false,newFullTechnologies:0,globalAbsenceProved:false}},
  catalogAppend:{explicitParameterSources:parameterSources,requireUniqueWorkKey:true,capturedSourcePreimage:{sourceKey:card.sourceKey,expected:null},
   identity:{namespace:'global',domain:'masonry',sourceIdentity:card.sourceIdentity,workKey:card.workKey,titleRu:card.titleRu,denominatorEligible:true},
   searchPlacement:{groupMode:'create',groupId:card.groupId,groupNameRu:card.titleRu,domainId:'masonry',systemId:'masonry',
    subsystemId:'glass_block',assemblyId:card.workKey,workFamilyId:key==='partition'?'glass_block_partition':'glass_block_opening_fill',
    breadcrumb:['Каменные работы',card.titleRu],membershipOrdinal:0,elementType:'WORK',operationKind:'NEW_INSTALLATION',
    technologyVariant:'EXACT_WHOLE_KRER08_04_002',constructionState:'NEW',normativeClassifiers:card.normIds,
    applicabilityTags:['EXACT_KG2015_SYSTEM','PARTIAL_PHYSICAL_PROVISION','OWN_NET_M2','AUTO_HEIGHT_BAND'],
    publicationState:'ADMITTED_BACKEND',catalogOrigin:'GLOBAL',adjudicationClass:'EFFECTIVE_WORK',selectable:true,
    groupOracleDisposition:{contract:route.contract,candidateIdentityOnly:true,normalLockedAbsenceAndCollisionChecksRequired:true,
     globalAbsenceProved:false,exactCodesSearchProved:false,sourceUuidGuessed:false},
    independentDisposition:{contract:route.contract,classification:'CANONICAL_VISIBLE',physicalResult:card.physicalResultRu,
     sourceOnlyPartialNotComplete:true,oneCardPerPhysicalKind:true}}},
  forbiddenAdjacentMatchers:[],owner:'ROOT_SINGLE_INTEGRATOR_MASONRY',receiptFileStem:'masonry_glass_normal_r103_'+key,
  verifyCore:async()=>{
   masonryGlassBlockNormalPreflightR103(config,key);
   let localCalls=0,completed=0,rejected=0;
   const compile=async(label:string,parameters:Record<string,unknown>)=>{
    actualCalls++;localCalls++;process.stdout.write('MASONRY_R103_ACTUAL_CORE_BEGIN='+actualCalls+';card='+key+';local='+localCalls+';case='+label+'\n');
    try{const result=await compileCanonicalEstimateCore({operation:'compile',compilerVersion:route.contract,catalogId:card.catalogId,
     primaryMeasureParameterId:area,parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],
     submittedParameters:parameters,confirmedParameters:{},currencyCode:'KGS',priceItems:[],maximumResourceRows:d.resources.length,
     hashJson:v=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(v))});snapshot(String(actualCalls).padStart(2,'0')+'-'+label,result);return result;
    }catch(error:unknown){snapshot(String(actualCalls).padStart(2,'0')+'-'+label+'-reject',
     {message:error instanceof Error?error.message:String(error),code:record(error)?error.code:null});throw error;}
   };
   for(const p of profiles){
    const result=await compile('positive-'+p.normId,input(key,'12.5',p.storeyHeightBand==='LTE4'?'4':'4.000001'));completed++;
    const expected=masonryGlassBlockNativeOracleR103[p.normId];assert(expected);
    assert.deepEqual(result.rows.filter(r=>!r.row_id.startsWith(p.prefix+':operation:')).map(r=>[r.row_id,r.quantity,r.unit_id]),
     expected.map(([role,quantity,unit])=>[p.prefix+':'+role,quantity,unit]));
    assert.equal(result.rows.length,expected.length+p.operations.length);assert.equal(result.preliminaryNeeds.length,10);
    assert(result.rows.every(r=>r.row_id.startsWith(p.prefix+':')&&!r.included_in_procurement&&r.unit_price===null));
    assert.deepEqual(result.rows.filter(r=>r.included_in_estimate).map(r=>r.row_id),[p.prefix+':whole-labour']);
    for(const need of result.preliminaryNeeds){assert(need.row_id.startsWith(p.prefix+':need:'));assert.equal(need.quantity,null);assert.equal(need.procurement_eligible,false);}
    for(const o of p.operations){const row=result.rows.find(r=>r.row_id===p.prefix+':operation:'+o.key);assert(row);
     assert.equal(row.quantity,'12.5');assert.equal(row.unit_id,'m2');assert.equal(row.included_in_estimate,false);}
    assert.equal(result.rows.some(r=>r.row_id===p.prefix+':operation:pointing'),key==='partition');
    assert.equal(result.totals.amount,'0');
   }
   for(const p of profiles){const opposite=profiles.find(q=>q.storeyHeightBand!==p.storeyHeightBand);assert(opposite);
    await assert.rejects(()=>compile('raw-opposite-source-'+p.normId,{...input(key,'12.5',p.storeyHeightBand==='LTE4'?'4':'4.000001'),
     glass103_forced_source_norm_id:opposite.normId}),{code:'PARAMETER_VALIDATION_FAILED',message:/unknown estimate parameters: glass103_forced_source_norm_id/});rejected++;
   }
   if(key==='partition'){
    const need=d.sourceNeedParameterIds[0];assert(need);
    await assert.rejects(()=>compile('unresolved-norm-injection',{...acceptance,[need]:'1'}),
     {code:'PARAMETER_VALIDATION_FAILED',message:new RegExp('unresolved application norm cannot be supplied '+need)});rejected++;
    await assert.rejects(()=>compile('negative-own-area',{...acceptance,[area]:'-1'}),
     {code:'PARAMETER_VALIDATION_FAILED',message:new RegExp('parameter below minimum '+area)});rejected++;
    const zero=await compile('zero-own-scope',{...acceptance,[area]:'0'});completed++;
    assert.deepEqual(zero.rows,[]);assert.deepEqual(zero.preliminaryNeeds,[]);assert.equal(zero.totals.amount,'0');
   }
   const foreign=masonryGlassBlockCardR103(key==='partition'?'opening-fill':'partition').primaryMeasureParameterId;
   await assert.rejects(()=>compile('cross-result-area-key',{...acceptance,[foreign]:'99'}),
    {code:'PARAMETER_VALIDATION_FAILED',message:new RegExp('unknown estimate parameters: '+foreign)});rejected++;
   assert.equal(localCalls,key==='partition'?8:5);
   return{status:'PASS_NORMAL_GLASS_CONFIG_WHOLE_SOURCE_COLUMNS_PARTIAL_PROVISION',card:key,actualCoreCalls:localCalls,completed,rejected,
    actualDbNormalAndLockedPreflight:'UNRUN',publication:'UNRUN',fullTechnicalAcceptance:false,newFullTechnologies:0};
  }};
 return config;
}

/** Pure ordinary assembler/independent map guard only; not actual PG preflight. */
export function masonryGlassBlockNormalPreflightR103(config:Config,key:MasonryGlassBlockCardKeyR103){
 const card=masonryGlassBlockCardR103(key),d=build(key),map=config.passport.independentCompletenessMap;
 assert.equal(config.catalogId,card.catalogId);assert.equal(config.sourceId,card.sourceKey);assert.deepEqual(config.expectedParentShape,[0,0,0]);
 assert.equal(config.binding.retainParentBindings,undefined);assert.equal(config.binding.reuseExistingNormativeRegistry,undefined);
 assert.deepEqual(config.catalogAppend?.capturedSourcePreimage,{sourceKey:card.sourceKey,expected:null});
 assert.equal(config.catalogAppend?.requireUniqueWorkKey,true);assert.equal(config.catalogAppend?.identity.workKey,card.workKey);
 assert.equal(config.catalogAppend?.searchPlacement.groupMode,'create');assert.deepEqual(config.runtimeProfileInput,{});
 assert.deepEqual(config.runtimeProfileClassification,{});assert.deepEqual(config.runtimeProfileSourceIds,{});
 assert(config.parameterDefinitions.every(p=>p.default_value===null));
 assert.deepEqual(config.parameterDefinitions.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id),d.ordinaryParameterIds);
 const foreign=masonryGlassBlockCardR103(key==='partition'?'opening-fill':'partition').primaryMeasureParameterId;
 assert(!config.parameterDefinitions.some(p=>p.parameter_id===foreign));
 assert(resolveMasterAppendExplicitParameterSourcesR1(config,{parameters:config.parameterDefinitions,
  formulas:config.formulaDefinitions,resources:config.resourceDefinitions}));
 assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:config.formulaDefinitions,
  resourceDefinitions:config.resourceDefinitions}),[]);
 const known=resolveMasterSingleDefinitionBindingRowIds(config,config.resourceDefinitions,['PUBLISHER_DERIVES_LOCATOR_UUID']);
 resolveMasterSingleDefinitionBindingApplicabilityByRowId(config,config.resourceDefinitions,['PUBLISHER_DERIVES_LOCATOR_UUID']);
 assert.deepEqual([...known].sort(),[...d.nativeSourceRowIds,...d.includedOperationRowIds].sort());
 assert.equal(config.passport.unresolvedApplicableResourceRowIds?.length,20);
 for(const p of source.profiles.filter(p=>d.profileKeys.includes(p.key))){const expected=masonryGlassBlockNativeOracleR103[p.normId];assert(expected);
  assert.deepEqual(p.rows.map(r=>[r.key,r.unitId]),expected.map(([role,_q,unit])=>[role,unit]));
  assert.deepEqual(p.operations.map(o=>o.key),key==='partition'?['base-alignment','assemble','pointing']:['base-alignment','assemble']);
 }
 return{status:'PASS_PURE_NORMAL_CONFIG_FULL_MAP_SOURCE_ARRAYS',card:key,visibleSimpleInputs:2,wholeColumns:2,nativeBindings:14,
  includedOperationBindings:key==='partition'?6:4,unknownNeeds:20,actualDbNormalAndLockedPreflight:'UNRUN',publication:'UNRUN',
  globalAbsenceProved:false,exactFourCodesSearchProved:false,sourceUuid:null,locatorUuid:null,fullTechnicalAcceptance:false};
}
