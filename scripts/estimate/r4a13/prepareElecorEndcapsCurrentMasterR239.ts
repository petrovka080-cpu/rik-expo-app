import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {isAbsolute,relative,resolve} from 'node:path';
import fixingPack from '../../../data/estimate-benchmarks/source-packs/elecor-project-mechanical-fixings-completion-r1.json';
import routePack from '../../../data/estimate-benchmarks/source-packs/elecor-60x40-single-route-materials-r1.json';
import independent from '../../../data/estimate-benchmarks/fixtures/elecor-endcaps-whole-independent-r239.json';
import {elecorEndcapPackR239 as pack,elecorEndcapOwnerR239 as owner,elecorEndcapRowIdR239 as rid,
  elecorProjectEndcapsDefinitionR239 as definition,elecorProjectEndcapsControlInputR239 as control}
  from '../../../src/lib/estimate/v4/elecorProjectEndcapsCompletionR239';
import {elecorMechanicalProjectFixingsDefinitionR1} from '../../../src/lib/estimate/v4/elecorMechanicalProjectFixingsCompletionR1';
import type {AutomaticOwnerDefinition} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {canonicalDefinitionPublicationStableValueR1 as stable} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';
import {hashMasterSingleDefinitionSuccessorReceiptR1 as valueSha,buildMasterPublicationResourceRowsR1,
  resolveMasterSingleDefinitionLocatorExcerptSha256R1,type MasterSingleDefinitionSuccessorConfig as Config}
  from './prepareMasterSingleDefinitionSuccessorR1';
import {masterRetainedParentCaptureSha256R1,prepareMasterRetainedBindingRepresentativeR1,
  type MasterRetainedParentCaptureR1,type MasterRetainParentBindingsR1} from './masterSingleDefinitionRetainParentBindingsR1';
import {verifyElecorEndcapsWholeR239,type ElecorEndcapVerificationContextR239} from './verifyElecorEndcapsWholeR239';

const contract='gox.electrical.elecor.current-endcap-master/r239';
const rootStop='ELECOR_ENDCAPS_EXISTING_OWNER_R239';
const currentV2={definitionId:'6d2a0632-e348-524b-bc04-b2f06875f9d7',baselineId:'43fef1fe-1332-5952-8edd-1141a5b134ba'};
const pointerPath='data/estimate-benchmarks/r568-local-developer-canonical-release.json';
export type ElecorCurrentEndcapCaptureR239=MasterRetainedParentCaptureR1&Readonly<{
  parameters:AutomaticOwnerDefinition['parameters'];formulas:AutomaticOwnerDefinition['formulas'];resources:AutomaticOwnerDefinition['resources'];
}>;
export type ElecorCurrentEndcapReadsetR239=Readonly<{
  readOnly:true;databaseWrites:0;sameRawFullRowsReadTwice:true;
  catalogId:string;definitionReleaseId:string;searchReleaseId:string;
  capture:ElecorCurrentEndcapCaptureR239;capturedParentSha256:string;
  sourcePreimage:Readonly<{sourceKey:string;expected:null}>;
}>;
export type ElecorEndcapCurrentMasterContextR239=Readonly<{
  sourceRoot:string;readset:ElecorCurrentEndcapReadsetR239;
  currentFullRead:Readonly<{path:string;sha256:string}>;currentPointerSha256:string;
  outputRoot?:string;onCoreCall?:ElecorEndcapVerificationContextR239['onCoreCall'];
  onOutcome?:ElecorEndcapVerificationContextR239['onOutcome'];
}>;
function record(value:unknown):value is Record<string,unknown>{return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function sorted<T>(values:readonly T[],key:(value:T)=>string){return[...values].sort((a,b)=>key(a).localeCompare(key(b)));}
// Source applicability is checked without rewriting persisted consumer/provenance metadata.
// The complete actual parent arrays are retained and checked again by the shared normal/locked contract.
function physicalSourceShape(model:AutomaticOwnerDefinition){return{
  parameters:sorted(model.parameters.map(p=>({id:p.parameter_id,type:p.value_type,unit:p.unit_id,
    required:p.required,default:p.default_value,constraints:p.constraints_json})),p=>p.id),
  formulas:sorted(model.formulas.map(f=>({id:f.formula_id,expression:f.expression_source,ast:f.ast,
    unit:f.output_unit_id,inputs:f.input_parameter_ids})),f=>f.id),
  resources:sorted(model.resources.map(r=>({id:r.row_id,formula:r.formula_id,unit:r.unit_id,category:r.category,
    procurement:r.procurement_eligible,costTreatment:r.resource_graph.costTreatment})),r=>r.id)};}

/** Ordinary same-owner configuration, requiring an actual bounded current v2
 * full read. Historical R3 digests or a v1 fixture cannot satisfy this input.
 * The existing publisher repeats full-parent/source preconditions under lock. */
export function prepareElecorEndcapsCurrentMasterR239(context:ElecorEndcapCurrentMasterContextR239):Config{
  assert(isAbsolute(context.sourceRoot));
  assert.equal(resolve(context.sourceRoot),resolve(__dirname,'../../..'),'ONE_ACTUAL_SOURCE_ROOT_REQUIRED');
  const own=(path:string)=>{const absolute=resolve(context.sourceRoot,path),rel=relative(context.sourceRoot,absolute);
    assert(!isAbsolute(path)&&rel!==''&&!isAbsolute(rel)&&!rel.startsWith('..'),'SOURCE_PATH_MUST_STAY_IN_ACTUAL_ROOT');return absolute;};
  const readPinned=(path:string,expected:string)=>{assert.match(expected,/^[0-9a-f]{64}$/u);const bytes=readFileSync(own(path));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),expected,'EXACT_SOURCE_BYTE_PIN:'+path);return bytes;};
  const fileValue:unknown=JSON.parse(readPinned(context.currentFullRead.path,context.currentFullRead.sha256).toString('utf8'));
  assert.deepEqual(stable(fileValue),stable(context.readset),'EXACT_FULL_READSET_NOT_HEADER_DIGEST_REQUIRED');
  const r=context.readset,c=r.capture;
  assert(r.readOnly&&r.databaseWrites===0&&r.sameRawFullRowsReadTwice);
  assert.equal(r.catalogId,pack.catalogId);assert.equal(c.definition.catalog_id,pack.catalogId);
  assert.equal(c.definition.id,currentV2.definitionId,'CHANGED_CURRENT_PARENT_REQUIRES_REVIEW_NO_V1_FALLBACK');
  assert.equal(c.baseline.id,currentV2.baselineId);assert.equal(c.baseline.definition_version_id,c.definition.id);
  assert.equal(c.baseline.catalog_id,pack.catalogId);assert(record(c.definition.passport));
  assert.equal(c.definition.passport.workKey,'electrical_elecor_60x40_white_single_straight_route_materials');
  assert.match(c.definition.definition_sha256,/^[0-9a-f]{64}$/u);
  assert.deepEqual([c.parameters.length,c.formulas.length,c.resources.length,c.bindings.length],[39,32,32,20]);
  assert.equal(masterRetainedParentCaptureSha256R1(c),r.capturedParentSha256);
  assert.deepEqual(r.sourcePreimage,{sourceKey:pack.sourceId,expected:null},'ACTUAL_SCOPED_SOURCE_ABSENCE_READ_REQUIRED');
  const pointer:unknown=JSON.parse(readPinned(pointerPath,context.currentPointerSha256).toString('utf8'));
  assert(record(pointer));assert.equal(pointer.definitionReleaseId,r.definitionReleaseId);assert.equal(pointer.searchReleaseId,r.searchReleaseId);
  const parent:AutomaticOwnerDefinition={parameters:c.parameters,formulas:c.formulas,resources:c.resources,
    runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:c.parameters.filter(p=>p.required).map(p=>p.parameter_id)};
  assert.deepEqual(stable(physicalSourceShape(parent)),stable(physicalSourceShape(elecorMechanicalProjectFixingsDefinitionR1())),
    'CURRENT_R3_SOURCE_SEMANTICS_DRIFT_REQUIRES_REVIEW');
  const model=definition(parent),metadata=c.definition.source_metadata;
  assert(record(metadata));const previous=metadata.retainedParentBindingSuccessorV1;
  assert(record(previous),'REAL_R3_RETAINED_SOURCE_HISTORY_REQUIRED');
  assert(!Object.hasOwn(metadata,'retainedParentBindingContinuationV1')&&!Object.hasOwn(metadata,'retainedParentBindingContinuationV2')&&!Object.hasOwn(metadata,'retainedParentBindingLineageV1'),
    'CHANGED_LINEAGE_REQUIRES_REVIEW_NO_GUESSED_SUCCESSOR');
  const newParameterSources:MasterRetainParentBindingsR1['newParameterSources']=Object.fromEntries(model.parameters.slice(39).map(p=>[
    p.parameter_id,p.truth_metadata.visibility_role==='INTERNAL_ONLY'?{kind:'DERIVED' as const,sourceIds:[]}:
      {kind:'KNOWN' as const,sourceIds:[pack.sourceId]}]));
  const retained:MasterRetainParentBindingsR1={capturedParent:c,capturedParentSha256:r.capturedParentSha256,newParameterSources,
    capturedSourcePreimage:r.sourcePreimage,
    successorProvenanceAppendV1:{contract:'master-retained-binding-append/v1',capturedSourceMetadata:structuredClone(metadata),
      capturedSourceMetadataSha256:valueSha(metadata),capturedPreviousSuccessorSha256:valueSha(previous)}};
  const sourcePaths=[
    'scripts/estimate/r4a13/prepareElecorEndcapsCurrentMasterR239.ts','scripts/estimate/r4a13/verifyElecorEndcapsWholeR239.ts',
    'src/lib/estimate/v4/elecorProjectEndcapsCompletionR239.ts','data/estimate-benchmarks/source-packs/elecor-project-endcaps-completion-r239.json',
    'data/estimate-benchmarks/fixtures/elecor-endcaps-whole-independent-r239.json',context.currentFullRead.path,pointerPath,
    'src/lib/estimate/v4/elecorMechanicalProjectFixingsCompletionR1.ts','src/lib/estimate/v4/elecorSingleRouteMaterialR1.ts',
    'data/estimate-benchmarks/source-packs/elecor-project-mechanical-fixings-completion-r1.json',
    'data/estimate-benchmarks/source-packs/elecor-60x40-single-route-materials-r1.json',
    'src/lib/estimate/v4/automaticConstructionOwnerR1.ts','src/lib/estimate/v4/effectivePurchaseBalanceR1.ts',
    'src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts',
    'src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition.ts',
    'src/lib/estimate/backendPlatform/canonicalProfessionalPdf.ts','src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract.ts',
    'scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts','scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts',
    pack.source.path,pack.heldCatalogue.path,
    fixingPack.officialPassport.path,fixingPack.fixedProduct.source.path,fixingPack.exactElecorProductPage.path,
    ...routePack.sourceEvidence.map(source=>source.path)];
  for(const source of[pack.source,pack.heldCatalogue,fixingPack.officialPassport,fixingPack.fixedProduct.source,fixingPack.exactElecorProductPage,
    ...routePack.sourceEvidence])readPinned(source.path,source.sha256);
  for(const path of sourcePaths)readFileSync(own(path));
  const consumedRow=rid('consumed-pieces'),bound=[consumedRow,owner];
  const rowApplicability=Object.fromEntries(bound.map(rowId=>[rowId,{contract,manufacturerArticle:pack.exactProduct.article,
    factorySetContainsPieces:4,unitId:rowId===owner?'set':'pcs',quantityBasis:rowId===owner?'PROJECT_COMPLETE_SET_ORDER_BALANCE':'ACTUAL_ACCEPTED_END_SCHEDULE_PIECES',
    installationLabourNormAccepted:false,projectScheduleAuthentication:'REQUIRED_OBJECT_INPUT_NOT_MANUFACTURER_FACT'}]));
  const cfg:Config={contract,stopCode:rootStop,applicationName:'elecor-existing-endcaps-r239',
    expectedBranch:'codex/r4-a5-clean-08b18902',masterPath:'C:/Users/User/Downloads/GOX_BUILD_MASTER_TZ_2_16_2026-10-24.txt',
    masterSha256:'541bc82df10231ca885288a7937283729b08484bd8301a22cd57a7b5c221eb40',
    parentReleaseId:r.definitionReleaseId,parentSearchReleaseId:r.searchReleaseId,currentReleasePath:pointerPath,
    outputRoot:context.outputRoot??'.release-runtime/r568/elecor-existing-endcaps-r239',sourcePaths:[...new Set(sourcePaths)],
    catalogId:pack.catalogId,sourceId:pack.sourceId,normId:pack.normId,
    sourceMetadata:{source_title:'Комплект торцевых заглушек 60×40 мм: 4 шт. и принятая ведомость концов',
      source_authority:'IEK GROUP: точное изделие; количество концов и применение — отдельные факты проекта',
      exact_locator:pack.source.locator+'; '+pack.heldCatalogue.locator,use_restriction:pack.scopeRu,
      source_kind:'EXACT_MANUFACTURER_FACTORY_UNIT_WITH_PROJECT_QUANTITY_NOT_LABOUR_NORM',
      official_url:pack.source.officialUrl,artifact_sha256:pack.source.sha256},
    parameterDefinitions:model.parameters,formulaDefinitions:model.formulas,resourceDefinitions:model.resources,
    shortInput:control(),acceptanceInput:control(),expectedParentShape:[39,32,32],benchmarkOrdinal:239,
    validationScenario:'TEST_ONLY exact complete4 supply, actual end-schedule quantities, one paid/procurement owner and six protected needs',
    passport:{canonicalRuName:'Материалы прямого участка кабель-канала 60×40 мм',
      workKey:'electrical_elecor_60x40_white_single_straight_route_materials',
      physicalResultRu:'Совместимый материал торцевого закрытия по принятой ведомости; монтаж и полный цикл не приняты',
      includedScopeRu:[pack.scopeRu,pack.priceScope],excludedScopeRu:[
        'Норма труда, инструмент и оснастка, доступ и защита, испытания и приёмка, логистика, уборка и удаление отходов остаются открытыми.',
        'Иные концевые узлы, вводы, сопряжения, проходки и противопожарные решения не подтверждены этим комплектом.'],
      independentCompletenessMap:independent.completenessMap,
      unresolvedApplicableResourceRowIds:['installation-labour','tools','access-protection','acceptance','delivery-handling','cleanup-disposal']
        .map(key=>'electrical:elecor-60x40-single-route:open-'+key)},
    applicability:{contract,materialOnly:true,fullTechnicalAcceptance:false,currentParentDefinitionId:c.definition.id,
      sourceAuthenticatedFactoryUnit:true,projectScheduleAuthenticated:false,legacyEndNeedSuppressedOnlyForCompleteSelectedScope:true},
    binding:{rowId:consumedRow,additionalRowIds:[owner],applicability:rowApplicability[consumedRow],
      applicabilityByRowId:rowApplicability,retainParentBindings:retained},
    locator:{key:'exact-60x40-kmz-complete4-and-project-end-schedule-r239',payload:{contract,
      manufacturerArticle:pack.exactProduct.article,source:pack.source,heldCatalogue:pack.heldCatalogue,
      factorySetContainsPieces:4,explicitBindingApplicabilityByRowId:rowApplicability,
      ignoredGenericSkuLogisticUnit:pack.exactProduct.genericLogisticsField,installationNormAccepted:false}},
    search:{primaryUom:'m',canonicalNameRu:'Материалы прямого участка кабель-канала 60×40 мм',
      aliases:['кабель-канал 60×40: материал прямого участка','торцевые заглушки 60×40 по принятой ведомости'],
      shortScopeRu:'Дополнен материал торцевого закрытия по фактической ведомости; полный монтаж не принят',
      keyDistinguishingParameters:['elecor_route_m','elecor_fixing_method',pack.methodParameterId,pack.countId],
      clarificationFields:model.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id),
      includedBoundaries:[pack.scopeRu],excludedBoundaries:['Нет автоматического числа заглушек из длины или числа стыков.','Шесть потребностей полного цикла остаются открытыми.'],
      extraSearchTermsRu:'кабель канал 60x40 торцевые заглушки принятая ведомость концы полный комплект 4',
      sourceProvenance:{contract,currentFullReadSha256:context.currentFullRead.sha256,capturedParentSha256:r.capturedParentSha256,
        manufacturerFactoryUnit:4,newCatalogIds:0,full:false}},
    forbiddenAdjacentMatchers:[/ventilated_facade|natural_stone|heating_hvac/iu],owner:'ROOT_SINGLE_INTEGRATOR_ELECTRICAL_EXISTING_OWNER',
    receiptFileStem:'elecor_existing_endcaps_r239',
    verifyCore:async()=>{
      // These UUIDs identify a TEST_ONLY registry projection, never a DB capture or future persisted ID.
      const sourceId='11111111-1111-5111-8111-111111111111',locatorId='22222222-2222-5222-8222-222222222222';
      // Same owned pure-projection pattern as verifyFacadeVentilatedSteelRetainedR5, not a publication fingerprint.
      const fingerprint=valueSha({purpose:'PURE_ELECOR_ENDCAP_CURRENT_CONFIG_STANDARD_RETAINED_REPRESENTATIVE_NOT_PUBLICATION',
        capturedParentSha256:r.capturedParentSha256,currentFullReadSha256:context.currentFullRead.sha256,
        sourceHashes:cfg.sourcePaths.map(path=>({path,sha256:createHash('sha256').update(readFileSync(own(path))).digest('hex')}))});
      const m=cfg.sourceMetadata,projection=prepareMasterRetainedBindingRepresentativeR1({config:cfg,newSource:{id:sourceId,
        source_key:cfg.sourceId,title_ru:m.source_title,authority:m.source_authority,official_url:m.official_url??null,
        artifact_sha256:m.artifact_sha256??null,effective_from:m.effective_from??null,effective_to:null,
        metadata:{contract,sourceKind:m.source_kind,useRestriction:m.use_restriction,universalProductivityClaimed:false,
          universalConsumptionClaimed:false,activationAllowed:false}},
        newLocators:[{id:locatorId,source_id:sourceId,locator_key:cfg.locator.key,locator:cfg.locator.payload,
          excerpt_sha256:resolveMasterSingleDefinitionLocatorExcerptSha256R1(cfg)}]},
        {parameters:model.parameters,formulas:model.formulas.map(f=>c.formulas.some(old=>old.formula_id===f.formula_id)?f:{...f,ast_sha256:valueSha(f.ast)}),
          resources:buildMasterPublicationResourceRowsR1(model.resources),
          newBindings:bound.map(row_id=>({row_id,locator_id:locatorId,applicability:rowApplicability[row_id]})),
          successorProvenance:{contract,sourceId:cfg.sourceId,normId:cfg.normId,
            parentDefinitionId:c.definition.id,parentBaselineId:c.baseline.id,capturedParentSha256:r.capturedParentSha256,
            sourceFingerprint:fingerprint,currentFullReadSha256:context.currentFullRead.sha256},
          lifecycleMetadata:{contract,masterSha256:cfg.masterSha256,sourceFingerprint:fingerprint}});
      assert.equal(projection.expectedNormativeBindingCount,22);
      for(const[id,sources]of Object.entries(c.baseline.normative_source_ids))assert.deepEqual(projection.normativeSourceIds[id],sources);
      context.onOutcome?.('ordinary-retained-source-and-composition-guard',{status:'PASS_TEST_ONLY_PROJECTION_NOT_DB_PREFLIGHT',bindings:22});
      return verifyElecorEndcapsWholeR239({model,parent,onCoreCall:context.onCoreCall,onOutcome:context.onOutcome});
    }};
  return cfg;
}
