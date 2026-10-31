import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {
  DRYWALL_CEILING_HIGH_LOAD_GEOMETRY_R1_DEFINITION as definition,
  DRYWALL_CEILING_HIGH_LOAD_GEOMETRY_R1_SOURCE_PACK as pack,
  DRYWALL_CEILING_HIGH_LOAD_GEOMETRY_R1_SOURCE_SHA256 as packSha,
  DRYWALL_CEILING_HIGH_LOAD_GEOMETRY_R1_PREFIX as prefix,
  compileDrywallCeilingHighLoadGeometryR1 as compile,
} from '../../../src/lib/estimate/v4/drywallCeilingHighLoadGeometryR1';
import {validateIndependentCompletenessMapReferences,type MasterSingleDefinitionSuccessorConfig}
  from './prepareMasterSingleDefinitionSuccessorR1';
import {CATALOG_INDEPENDENT_COMPLETENESS_MAP_CONTRACT} from './catalogFirstEstimateMinimumInputAudit.shared';

const sourceId='knauf_p1121_high_load_geometry_krer10_emac_r1';
const packPath='data/estimate-benchmarks/source-packs/drywall-ceiling-high-load-geometry-r1.json';
const primaryRoot='.release-runtime/r568/ceiling-high-load-geometry-r1/sources/';
const row=(key:string)=>prefix+':'+key;
const sha=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
// Authored from the manufacturer installation sequence and the primary pack,
// independently of the currently generated resource list.
const expectedScope=[
  ['setout','work:whole'],
  ['suspend','material:anchors'],['suspend','material:hangers'],['suspend','material:ln'],
  ['suspend','reference:perforator'],['suspend','equipment:perforator-height-source-gap'],
  ['frame','material:pp-main'],['frame','material:pp-bearing'],['frame','material:extensions'],
  ['frame','material:connectors'],['frame','reference:base-labor'],['frame','reference:electric-snips'],
  ['frame','labor:height-source-gap'],['frame','equipment:snips-height-source-gap'],
  ['clad','material:board'],['clad','material:tn'],['clad','reference:screwdriver'],
  ['clad','equipment:screwdriver-height-source-gap'],
  ['joint','material:joint-tape'],['joint','material:separation-tape'],['joint','material:fugen'],['joint','material:water'],
  ['prime','material:primer'],['expansion','material:expansion-profile'],['expansion','material:expansion-clips'],
  ['expansion','labor:emac-joint-source-gap'],['accept','stage:accept'],['accept','scope:tools-access'],
] as const;
const unknownKeys=['labor:emac-joint-source-gap','labor:height-source-gap','equipment:snips-height-source-gap',
  'equipment:perforator-height-source-gap','equipment:screwdriver-height-source-gap'];
const completeness={contract:CATALOG_INDEPENDENT_COMPLETENESS_MAP_CONTRACT,sourceKind:'PRODUCT_SYSTEM_TDS',
  generatedFromCurrentRows:false,evidenceSha256:packSha,
  entries:expectedScope.map(([stage,key])=>({operationId:row('operation:'+stage),expectedResourceId:key,
    condition:key.includes('height-source-gap')?'ceiling_height_m+ceiling_drop_m>4':
      key.startsWith('reference:')?'ceiling_height_m+ceiling_drop_m<=4':stage==='expansion'?'p112_expansion_m>0':'declared rectangular P112.1 scope',
    sourceId,formulaId:row('formula:'+key),resolution:{kind:'ROW',rowId:row(key)}}))};

/** Data only: all writes remain in runMasterSingleDefinitionSuccessorR1. */
export function prepareDrywallCeilingHighLoadGeometrySuccessorR1(parent:Readonly<{
  releaseId:string;searchReleaseId:string;currentReleasePath:string;outputRoot:string;
}>):MasterSingleDefinitionSuccessorConfig {
  assert.equal(sha(packPath),packSha);
  for(const source of pack.sources)assert.equal(sha(primaryRoot+source.id+(source.url.includes('.pdf')?'.pdf':'.html')),source.sha256,source.id);
  const input={room_length_m:20,room_width_m:15,ceiling_height_m:3,ceiling_drop_m:.12};
  const knownRows=definition.resources.filter(resource=>!unknownKeys.some(key=>resource.row_id===row(key))).map(resource=>resource.row_id);
  const title='Потолок ГКЛ П112.1: усиленный каркас и один слой';
  return {contract:pack.contract,stopCode:'DRYWALL_CEILING_HIGH_LOAD_GEOMETRY_R1',applicationName:'ceiling-high-load-geometry-r1',
    expectedBranch:'codex/r4-a5-clean-08b18902',
    masterPath:'C:/Users/User/Downloads/GOX_BUILD_TZ_Single_Platform_Core_Sol61_2026-10-19 (8).txt',
    masterSha256:'a3e197db867ac7f479850b64d6b42efa17dcb989ffc524e734a27c8d0a97a073',
    parentReleaseId:parent.releaseId,parentSearchReleaseId:parent.searchReleaseId,currentReleasePath:parent.currentReleasePath,outputRoot:parent.outputRoot,
    sourcePaths:[packPath,'scripts/estimate/r4a13/prepareDrywallCeilingHighLoadGeometrySuccessorR1.ts',
      'src/lib/estimate/v4/drywallCeilingHighLoadGeometryR1.ts','src/lib/estimate/v4/automaticConstructionOwnerR1.ts',
      'tests/estimateNorms/drywallCeilingHighLoadGeometryR1.contract.test.ts',
      'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts',
      ...pack.sources.map(source=>primaryRoot+source.id+(source.url.includes('.pdf')?'.pdf':'.html'))],
    catalogId:pack.catalogId,sourceId,normId:'KNAUF_P112_1_KRER10_05_011_01_EMAC_NDP_GEOMETRY_R1',
    sourceMetadata:{source_title:pack.titleRu,source_authority:'КНАУФ; КРЕР; EMAC, первичные документы',
      source_kind:'COMPOSITE_PRIMARY_SOURCE_GEOMETRY',official_url:null,artifact_sha256:packSha,
      exact_locator:pack.sources.map(source=>source.id+': '+source.locatorRu).join('; '),
      use_restriction:pack.system.baseScopeRu+' '+pack.readiness.openAuthorObligationsRu.join(' ')},
    parameterDefinitions:definition.parameters,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources,
    shortInput:input,acceptanceInput:input,runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},
    expectedParentShape:[23,12,12],benchmarkOrdinal:0,validationScenario:'P1121_HIGH_LOAD_GEOMETRY_20X15M',
    passport:{canonicalRuName:title,workKey:'drywall_ceiling_interior_drywall_ceiling_install_high_load',
      physicalResultRu:pack.system.baseScopeRu,includedScopeRu:[pack.system.finishRu,pack.commercialScopeRu],
      excludedScopeRu:pack.readiness.openAuthorObligationsRu,independentCompletenessMap:completeness,
      unresolvedApplicableResourceRowIds:unknownKeys.map(row)},
    applicability:{primaryMeasureParameterId:'area_m2',geometryOnlyRequiredInput:true,fullTechnicalAcceptance:false,
      selectedMaterialGeometryQuantitiesComplete:true,baseNormMaximumInstallationHeightM:4,
      selectedScopeQuantitiesComplete:false,sourceAuthorObligations:pack.readiness.openAuthorObligationsRu},
    binding:{rowId:knownRows[0]!,additionalRowIds:knownRows.slice(1),
      applicability:{sourcePackSha256:packSha,fullTechnicalAcceptance:false,sourceSpecificGeometry:true}},
    locator:{key:'p1121-high-load-geometry-r1',payload:{sourcePack:pack,sourcePackSha256:packSha,noPrimaryRegistryUuidClaimed:true,fullTechnicalAcceptance:false}},
    search:{primaryUom:'m2',canonicalNameRu:title,aliases:[title,'Монтаж потолка ГКЛ усиленного каркаса'],shortScopeRu:pack.system.baseScopeRu,
      keyDistinguishingParameters:['room_length_m','room_width_m','ceiling_height_m','ceiling_drop_m'],
      clarificationFields:['room_length_m','room_width_m','ceiling_height_m','ceiling_drop_m'],
      includedBoundaries:[pack.system.finishRu,pack.commercialScopeRu],excludedBoundaries:pack.readiness.openAuthorObligationsRu,
      extraSearchTermsRu:'потолок ГКЛ КНАУФ П112.1 каркас профили подвесы листы крепёж стыки',
      sourceProvenance:{sourcePackPath:packPath,sourcePackSha256:packSha,requiredNonGeometryQuestions:0,fullTechnicalAcceptance:false}},
    forbiddenAdjacentMatchers:[/P113|П113|Q3|Q4/iu],owner:'ROOT_SINGLE_INTEGRATOR',receiptFileStem:'ceiling_high_load_geometry_r1',
    verifyCore:async()=>{
      assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:completeness,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources}),[]);
      const result=await compile(input),quantity=(key:string)=>result.rows.find(resource=>resource.row_id===row(key))?.quantity;
      for(const [key,value]of [['material:pp-main','248'],['material:pp-bearing','210'],['material:hangers','868'],
        ['material:connectors','2604'],['material:board','116'],['material:tn','5532'],['reference:base-labor','276']])assert.equal(quantity(key!),value,key);
      assert.deepEqual(definition.parameters.filter(parameter=>parameter.required&&parameter.truth_metadata.visibility_role==='USER_INPUT')
        .map(parameter=>parameter.parameter_id),['room_length_m','room_width_m','ceiling_height_m','ceiling_drop_m']);
      assert.equal(result.rows.filter(resource=>resource.category==='work'&&resource.included_in_estimate).length,1);
      assert.deepEqual(result.preliminaryNeeds.filter(need=>need.need_state==='QUANTITY_REQUIRED').map(need=>need.row_id),[row('labor:emac-joint-source-gap')]);
      return {status:'PASS_CEILING_P1121_GEOMETRY_SOURCE_CONFIG',shape:[definition.parameters.length,definition.formulas.length,definition.resources.length],
        requiredNonGeometryQuestions:0,unknownApplicationQuantities:1,fullTechnicalAcceptance:false};
    }};
}
