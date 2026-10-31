import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {ct29ExistingMineralGeometryPackR1 as ct29ExistingMineralPackS2754,ct29ExistingMineralPrefixS2754} from '../../../src/lib/estimate/v4/ct29ExistingMineralSeriesS2754';
import {buildCt29IndoorGeometryDefinitionR1,buildCt29PlasterCompletenessMapS2754,
 ct29IndoorGeometrySourcePackR1 as pack,ct29IndoorGeometrySourceSha256R1 as packSha} from '../../../src/lib/estimate/v4/ct29IndoorPlasterS2754';
import {compileAutomaticConstructionOwnerR1} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {validateIndependentCompletenessMapReferences,type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';

const sourceId='ct29_existing_cement_lime_indoor_geometry_r1';
const sourcePackPath='data/estimate-benchmarks/source-packs/ct29-indoor-geometry-r1.json';
const sourceRoot='.release-runtime/r568/ct29-indoor-geometry-r1/sources/';
const sha=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');

/** Data configuration for the existing sole publisher; existing revisions keep their definitions. */
export function prepareCt29IndoorGeometrySuccessorR1(parent:Readonly<{
 releaseId:string;searchReleaseId:string;currentReleasePath:string;outputRoot:string;
}>):MasterSingleDefinitionSuccessorConfig {
 assert.equal(sha(sourcePackPath),packSha);
 for(const source of pack.sources)assert.equal(sha(sourceRoot+source.file),source.sha256,source.id);
 const source={...ct29ExistingMineralPackS2754(1),sourceId},prefix=ct29ExistingMineralPrefixS2754(1),
  definition=buildCt29IndoorGeometryDefinitionR1(source,prefix),
  map={...buildCt29PlasterCompletenessMapS2754(source,prefix),sourceKind:'NORMATIVE_OPERATION_MAP'},
  row=(key:string)=>prefix+':'+key,input={plaster_area_m2:160,layer_thickness_mm:10.5};
 const included=[pack.scopeRu,pack.planningPolicyRu,pack.costScopeRu];
 const bound=['net-mixture','25kg-order','25kg-mix-water-consumed','labor','mixer','loader','hoist'];
 return {contract:pack.contract,stopCode:'CT29_INDOOR_GEOMETRY_R1',applicationName:'ct29-indoor-geometry-r1',
  expectedBranch:'codex/r4-a5-clean-08b18902',
  masterPath:'C:/Users/User/Downloads/GOX_BUILD_TZ_Single_Platform_Core_Sol61_2026-10-19 (8).txt',
  masterSha256:'a3e197db867ac7f479850b64d6b42efa17dcb989ffc524e734a27c8d0a97a073',
  parentReleaseId:parent.releaseId,parentSearchReleaseId:parent.searchReleaseId,
  currentReleasePath:parent.currentReleasePath,outputRoot:parent.outputRoot,
  sourcePaths:['scripts/estimate/r4a13/prepareCt29IndoorGeometrySuccessorR1.ts',sourcePackPath,
   'src/lib/estimate/v4/ct29ExistingMineralSeriesS2754.ts','src/lib/estimate/v4/ct29IndoorPlasterS2754.ts',
   'src/lib/estimate/v4/automaticConstructionOwnerR1.ts','src/lib/estimate/v4/effectivePurchaseBalanceR1.ts',
   'tests/estimateNorms/ct29IndoorPlasterGeometryR1.contract.test.ts',
   'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts',
   ...pack.sources.map(source=>sourceRoot+source.file)],
  catalogId:pack.catalogId,sourceId,normId:'CT29_EN_GL_AND_KRER_15_02_019_03_GEOMETRY_R1',
  sourceMetadata:{source_title:pack.titleRu,source_authority:'Ceresit/Henkel; первичные документы КРЕР и методики КР',
   source_kind:'COMPOSITE_PRIMARY_SOURCE_GEOMETRY',official_url:null,artifact_sha256:packSha,
   exact_locator:'CT29 en_GL стр.1–2; КРЕР15 PDF10 §1.5, PDF137–138 колонка15-02-019-03; общиеКРЕР PDF9 §4.2; Методика PDF15 §4.23; накладные PDF22 приложение6',
   use_restriction:pack.scopeRu+' '+pack.readiness.openAuthorObligationsRu.join(' ')},
  parameterDefinitions:definition.parameters,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources,
  shortInput:input,acceptanceInput:input,runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},
  expectedParentShape:[33,31,31],benchmarkOrdinal:0,validationScenario:'CT29_AREA_THICKNESS_ONLY_160_M2_10_5_MM',
  passport:{canonicalRuName:source.titleRu,workKey:source.workKey,physicalResultRu:pack.scopeRu,includedScopeRu:included,
   excludedScopeRu:pack.forbiddenRu,independentCompletenessMap:map,
   unresolvedApplicableResourceRowIds:[row('curing-water'),row('logistics-cleanup')]},
  applicability:{primaryMeasureParameterId:'plaster_area_m2',ordinaryGeometryProfileR1:true,requiredNonGeometryQuestions:0,
   acceptedPhysicalProfileId:source.acceptedPhysicalProfileId,fullTechnicalAcceptance:false,
   sourceAuthorObligations:pack.readiness.openAuthorObligationsRu,oldDefinitionsAndSavedRevisionsUnchanged:true},
  binding:{rowId:row(bound[0]!),additionalRowIds:bound.slice(1).map(row),
   applicability:{exactProfile:pack.profileKey,primaryEvidencePackSha256:packSha,fullTechnicalAcceptance:false}},
  locator:{key:'ct29-cement-lime-indoor-geometry-r1',payload:{sourcePack:pack,sourcePackSha256:packSha,
   noPrimaryRegistryUuidClaimed:true,fullTechnicalAcceptance:false}},
  search:{primaryUom:'m2',canonicalNameRu:source.titleRu,aliases:[source.titleRu,'CT29 по площади и толщине'],
   shortScopeRu:pack.scopeRu,keyDistinguishingParameters:['plaster_area_m2','layer_thickness_mm'],
   clarificationFields:['plaster_area_m2','layer_thickness_mm'],includedBoundaries:included,excludedBoundaries:pack.forbiddenRu,
   extraSearchTermsRu:'Ceresit CT29 цементно-известковая штукатурка внутри площадь толщина смесь мешки вода труд механизмы',
   sourceProvenance:{sourcePackPath,sourcePackSha256:packSha,requiredNonGeometryQuestions:0,fullTechnicalAcceptance:false}},
  forbiddenAdjacentMatchers:[/CT17|CT16|gypsum|ETICS/iu],owner:'ROOT_SINGLE_INTEGRATOR',receiptFileStem:'ct29_indoor_geometry_r1',
  verifyCore:async()=>{
   assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources}),[]);
   const compile=(values:Record<string,unknown>)=>compileAutomaticConstructionOwnerR1({catalogId:pack.catalogId,
    compilerVersion:pack.contract,primaryMeasureParameterId:'plaster_area_m2',definition,submittedParameters:values});
   const result=await compile(input),stock=await compile({...input,ct29_25kg_stock_bags:3});
   const quantity=(rows:typeof result.rows,key:string)=>rows.find(resource=>resource.row_id===row(key))?.quantity;
   for(const [key,value]of [['net-mixture','3024'],['25kg-ordered-bags','121'],['25kg-mix-water-consumed','750.2'],['labor','87.1752'],['mixer','2.8056']])
    assert.equal(quantity(result.rows,key!),value,key);
   assert.equal(quantity(stock.rows,'25kg-ordered-bags'),'118');
   assert.deepEqual(definition.parameters.filter(parameter=>parameter.required&&parameter.truth_metadata.visibility_role==='USER_INPUT')
    .map(parameter=>parameter.parameter_id),['plaster_area_m2','layer_thickness_mm']);
   assert.deepEqual(result.preliminaryNeeds.filter(need=>need.need_state==='QUANTITY_REQUIRED').map(need=>need.row_id).sort(),[row('curing-water'),row('logistics-cleanup')].sort());
   return {status:'PASS_CT29_ORDINARY_GEOMETRY_SOURCE_CONFIG',shape:[definition.parameters.length,definition.formulas.length,definition.resources.length],
    requiredNonGeometryQuestions:0,unknownApplicationQuantities:2,oldHistoryWritten:false,fullTechnicalAcceptance:false};
  }};
}
