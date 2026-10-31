import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {prepareInteriorWallFinishingExistingPaintR502} from './prepareInteriorWallFinishingExistingPaintR502';
import {interiorWallFinishingGeometryPackR3 as pack,interiorWallFinishingGeometryGroupDefinitionR3,
  interiorWallFinishingIndependentCompletenessMapR3,interiorWallFinishingGeometryParameterR3 as p,
  interiorWallFinishingGeometryRowR3 as row} from '../../../src/lib/estimate/v4/interiorWallFinishingGeometryGroupR3';
import {compileAutomaticConstructionOwnerR1} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {parseCanonicalPublicResourcePresentationV1} from '../../../src/lib/estimate/backendPlatform/canonicalPublicResourcePresentationV1';
import {validateIndependentCompletenessMapReferences,type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';

/** One complete group descriptor for the existing publisher. R502 definitions,
 * historical inputs and source bindings remain in their immutable versions. */
export function prepareInteriorWallFinishingGeometryGroupR3(parent:{releaseId:string;searchReleaseId:string;outputRoot:string}):MasterSingleDefinitionSuccessorConfig {
  const prior=prepareInteriorWallFinishingExistingPaintR502({parentReleaseId:parent.releaseId,parentSearchReleaseId:parent.searchReleaseId,
    outputRoot:parent.outputRoot}),definition=interiorWallFinishingGeometryGroupDefinitionR3(),map=interiorWallFinishingIndependentCompletenessMapR3(),
    path='data/estimate-benchmarks/source-packs/interior-wall-finishing-geometry-group-r3.json',
    sha=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex'),packSha=sha(path),
    input={[p(pack.areaId)]:'20.1'},open=pack.openSourceNeeds.map(n=>row('open-'+n.id)),
    bound=['whole-work',...pack.materials.filter(m=>m.package).map(m=>m.id+'-order')];
  for(const source of pack.sources)assert.equal(sha(source.path),source.sha256,source.id);
  return {...prior,contract:pack.contract,stopCode:'INTERIOR_WALL_FINISHING_GEOMETRY_GROUP_R3',applicationName:'interior-wall-finishing-geometry-group-r3',
    masterPath:'C:/Users/User/.codex/codex-remote-attachments/01a15c27-0cfb-74f1-b019-71f882b2cafe/4B91BF8B-8EF4-40FD-95FB-6170A0F7DB39/1-GOX_BUILD_TZ_Single_Platform_Core_Sol61_2026-10-19.txt',
    masterSha256:'28089a66fa72e574dc730ed67beaec81e320380ee3dc8206561437c5cdcb9239',
    sourceId:'interior_wall_vgt_geometry_group_r3',normId:'VGT_READY_WALL_GROUP_KRER150400701_150400603_R3',
    sourcePaths:[...prior.sourcePaths,path,'src/lib/estimate/v4/interiorWallFinishingGeometryGroupR3.ts',
      'src/lib/estimate/v4/interiorWallFinishingGeometryGroupR3.test.ts','scripts/estimate/r4a13/prepareInteriorWallFinishingGeometryGroupR3.ts',
      ...pack.sources.map(s=>s.path)],
    sourceMetadata:{source_title:pack.titleRu,source_authority:'КРЕР15/общие указания; VGT; STAYER; ЗУБР; Wooster. Составная карта, не новая официальная норма.',
      source_kind:'COMPOSITE_PRIMARY_SOURCE_GEOMETRY',official_url:null,artifact_sha256:packSha,
      exact_locator:pack.sources.map(s=>s.id+': '+s.locatorRu).join('; '),use_restriction:pack.physicalScopeRu},
    parameterDefinitions:definition.parameters,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources,
    shortInput:input,acceptanceInput:input,runtimeProfileInput:definition.runtimeInput,
    runtimeProfileClassification:definition.runtimeClassification,runtimeProfileSourceIds:definition.runtimeSourceIds,
    expectedParentShape:[185,151,151],validationScenario:'VGT_READY_WALL_EIGHT_OPERATIONS_AGGREGATED_PRODUCTS_SHARED_PROVISION',
    passport:{canonicalRuName:pack.titleRu,workKey:prior.passport.workKey,physicalResultRu:pack.physicalScopeRu,
      includedScopeRu:[pack.physicalScopeRu],excludedScopeRu:pack.excludedRu,
      independentCompletenessMap:map,unresolvedApplicableResourceRowIds:open},
    applicability:{country:'KG',variant:'standard',primaryMeasureParameterId:p(pack.areaId),ordinaryObjectFactBudget:1,
      selectedTechnology:pack.contract,requiredNonGeometryTechnicalQuestions:0,selectedScopeQuantitiesComplete:false,
      physicalResourceCoverageComplete:false,fullTechnicalAcceptance:false,engineeringAcceptance:false,
      inheritedR502HistoricalDefinitionPreserved:true,currentManufacturerProductsNotLegacyGenericConsumption:true},
    binding:{rowId:row(bound[0]),additionalRowIds:bound.slice(1).map(row),
      applicability:{exactProfile:pack.contract,primaryEvidencePackSha256:packSha,fullTechnicalAcceptance:false}},
    locator:{key:'interior-wall-vgt-geometry-group-r3',payload:{sourcePack:pack,sourcePackSha256:packSha,
      noPrimaryRegistryUuidClaimed:true,fullTechnicalAcceptance:false}},
    search:{primaryUom:'m2',canonicalNameRu:pack.titleRu,aliases:['отделка VGT готовой штукатурки','шпаклевка и окраска стен VGT'],
      shortScopeRu:pack.physicalScopeRu,keyDistinguishingParameters:[p(pack.areaId)],clarificationFields:[p(pack.areaId)],
      includedBoundaries:[pack.physicalScopeRu],excludedBoundaries:pack.excludedRu,
      extraSearchTermsRu:'готовая шпаклевка VGT глубокий грунт укрывающая грунтовка акриловая краска два слоя шлифование',
      sourceProvenance:{sourcePackPath:path,sourcePackSha256:packSha,requiredNonGeometryTechnicalQuestions:0,
        fullTechnicalAcceptance:false,physicalResourceCoverageComplete:false}},
    receiptFileStem:'interior_wall_vgt_geometry_group_r3',verifyCore:async()=>{
      assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources}),[]);
      for(const r of definition.resources)assert(parseCanonicalPublicResourcePresentationV1(r.resource_graph.publicResourcePresentationV1),r.row_id);
      const compile=(submittedParameters:Record<string,unknown>)=>compileAutomaticConstructionOwnerR1({catalogId:pack.selectedExistingCatalogId,
        compilerVersion:pack.contract,primaryMeasureParameterId:p(pack.areaId),definition,submittedParameters}),result=await compile(input);
      const quantity=(key:string)=>result.rows.find(r=>r.row_id===row(key))?.quantity;
      for(const [key,value] of [['preputty-primer-order','3'],['ready-putty-order','29'],['primer-order','6'],['paint-order','7.5']])
        assert.equal(quantity(key!),value,key);
      assert.deepEqual(result.preliminaryNeeds.filter(n=>n.need_state==='QUANTITY_REQUIRED').map(n=>n.row_id).sort(),open.slice().sort());
      const zero=await compile({[p(pack.areaId)]:0});assert.equal(zero.rows.length,0);assert.equal(zero.preliminaryNeeds.length,0);
      return {status:'PASS_GROUP_QUANTITIES_WITH_EXPLICIT_PHYSICAL_GAPS',operations:pack.operations.length,
        shape:[definition.parameters.length,definition.formulas.length,definition.resources.length],openPhysicalNeeds:open.length,
        requiredNonGeometryTechnicalQuestions:0,fullTechnicalAcceptance:false};
    }};
}
