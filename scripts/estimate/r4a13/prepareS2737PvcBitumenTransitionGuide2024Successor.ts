import {resolve} from 'node:path';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {strict as assert} from 'node:assert';
import {c411WorkProcessS2737PublishConfig} from './prepareS2737C411WorkProcessSuccessor';
import {pvcRoofRussianPresentationS2737PublishConfig as russian} from './prepareS2737PvcRoofRussianPresentationSuccessor';
import {resolveS2737SealedSuccessorParent} from './prepareS2737PvcRoofVolumeCleanerSuccessor';
import {runMasterSingleDefinitionSuccessorR1,type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {PVC_TRANSITION_GUIDE2024_CONTROL_INPUT as fixture} from './pvcBitumenTransitionGuide2024ControlInput';
import {compilePvcBitumenTransitionReinforcedGuide2024S2737 as compile,
  PVC_BITUMEN_TRANSITION_DEFINITION_S2737 as definition, PVC_BITUMEN_TRANSITION_CATALOG_S2737 as catalogId,
  PVC_BITUMEN_TRANSITION_WORK_KEY_S2737 as workKey, PVC_BITUMEN_TRANSITION_SOURCE_ID_S2737 as sourceId,
  PVC_BITUMEN_TRANSITION_NORM_ID_S2737 as normId, PVC_BITUMEN_TRANSITION_SOURCE_METADATA_S2737 as sourceMetadata,
  PVC_BITUMEN_TRANSITION_DISPLAY_NAME_RU as title,
} from '../../../src/lib/estimate/v4/pvcBitumenTransitionReinforcedGuide2024S2737';
import {canonicalEstimateWorkProcess} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';
type Parent={releaseId:string;searchReleaseId:string};
const packPath='data/estimate-benchmarks/source-packs/pvc-bitumen-transition-reinforced-guide2024-s27-37.json';
const groupId='wg:master:pvc_bitumen_transition_reinforced_guide2024_single_strip';
const groupNameRu='Переход ПВХ-мембраны к битумной кровле: непрерывная армированная лента';
export function pvcBitumenTransitionGuide2024S2737PublishConfig(parent:Parent):MasterSingleDefinitionSuccessorConfig{
  return {
    contract:'rik-expo-app.s27-37.pvc-bitumen-transition-guide2024.v1',stopCode:'S2737_PVC_BITUMEN_TRANSITION_GUIDE2024',
    applicationName:'s2737-pvc-bitumen-transition-guide2024',expectedBranch:russian.expectedBranch,
    masterPath:russian.masterPath,masterSha256:russian.masterSha256,parentReleaseId:parent.releaseId,parentSearchReleaseId:parent.searchReleaseId,
    currentReleasePath:russian.currentReleasePath,outputRoot:resolve('.release-runtime/r568/s27-37/pvc-bitumen-transition-guide2024'),
    sourcePaths:[packPath,'src/lib/estimate/v4/pvcBitumenTransitionReinforcedGuide2024S2737.ts',
      'src/lib/estimate/v4/automaticConstructionOwnerR1.ts','src/lib/estimate/v4/effectivePurchaseBalanceR1.ts',
      'src/lib/estimate/v4/pvcRoofMembraneInstallationR1.ts','src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition.ts',
      'scripts/estimate/r4a13/pvcBitumenTransitionGuide2024ControlInput.ts',
      'scripts/estimate/r4a13/prepareS2737PvcBitumenTransitionGuide2024Successor.ts',
      'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts',
      'scripts/estimate/r4a13/prepareS2737C411WorkProcessSuccessor.ts','scripts/estimate/r4a13/prepareS2737C111WorkProcessSuccessor.ts',
      'scripts/estimate/r4a13/prepareS2737WaterValtecWorkProcessSuccessor.ts','scripts/estimate/r4a13/prepareS2737PvcRoofVolumeCleanerSuccessor.ts',
      'scripts/estimate/r4a13/prepareS2737PvcRoofRussianPresentationSuccessor.ts',
      'tests/estimateNorms/pvcBitumenTransitionReinforcedGuide2024S2737.contract.test.ts'],
    catalogId,sourceId,normId,sourceMetadata,
    parameterDefinitions:definition.parameters,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources,
    shortInput:{transition_length_m:10},acceptanceInput:{...definition.runtimeInput,...fixture},
    runtimeProfileInput:definition.runtimeInput,runtimeProfileClassification:definition.runtimeClassification,runtimeProfileSourceIds:definition.runtimeSourceIds,
    verifyCore:async()=>{
      assert.equal(createHash('sha256').update(readFileSync(packPath)).digest('hex'),sourceMetadata.definition_hash);
      const short=await compile({transition_length_m:10});
      assert.deepEqual(short.rows.map(x=>x.row_id),['transition:scope:length']);
      assert(short.preliminaryNeeds.find(x=>x.row_id==='transition:material:tape')?.missing_parameter_ids.includes('reinforced_guide2024_profile_confirmed'));
      const complete=await compile(fixture);assert.equal(complete.preliminaryNeeds.length,0);
      assert.equal(complete.rows.find(x=>x.row_id==='transition:material:adhesive22')?.quantity,'5');
      assert.equal(complete.rows.find(x=>x.row_id==='transition:allocation:adhesive22:lower')?.quantity,'2.4');
      assert.equal(complete.rows.find(x=>x.row_id==='transition:allocation:adhesive22:upper')?.quantity,'1.7');
      assert.equal(complete.rows.filter(x=>x.category==='labor'&&x.included_in_estimate).length,1);
      assert.equal(complete.rows.filter(x=>x.included_in_procurement).length,6);
      const process=canonicalEstimateWorkProcess(complete.rows.map(x=>({rowId:x.row_id,titleRu:typeof x.title_ru==='string'?x.title_ru:undefined,
        operation:(x.calculation_trace as {resourceGraph?:{operationCompositionV1?:unknown}})?.resourceGraph?.operationCompositionV1})));
      assert.equal(process[0]?.operations.length,10);
      assert(process[0]?.operations.some(x=>x.sharedResources?.some(r=>r.rowId==='transition:material:adhesive22')));
      assert(!Object.keys(definition.runtimeInput).some(id=>id.endsWith('_confirmed')||id==='transition_worker_man_h'||id==='tape_roll_length_m'));
      return {status:'GREEN_S2737_PVC_TRANSITION_GUIDE2024_EXPLICIT_PROJECT_FIXTURE',rows:complete.rows.length,
        procurementPositions:6,sourceVersion:'02.2024',singleContinuousUndamagedStripOnly:true,
        twoAdhesiveZonesOneOwner:true,hotDeliveryPlanAndCostOwnerRequired:true,unreinforcedKz082026NotImported:true,
        fixtureFactsNeverRuntimeDefaults:true,engineeringAccepted:false,ordinaryUiAccepted:false};
    },
    expectedParentShape:[0,0,0],benchmarkOrdinal:164,validationScenario:'S2737_PVC_BITUMEN_REINFORCED_GUIDE2024_SINGLE_CONTINUOUS_STRIP',
    passport:{canonicalRuName:title,workKey,
      physicalResultRu:'Прямой непрерывный переход существующего битумного покрытия к ПВХ-мембране через поставленную армированную ленту по инструкции 02.2024',
      includedScopeRu:['Проверка и очистка готового основания, разметка, нижняя мастика, приклейка/прикатка ленты и отдельная верхняя мастика',
        'Тарельчатый либо телескопический держатель и саморез отдельно, фактическая ветровая схема и размеры по проекту',
        'Термообработанный геотекстиль не менее 300 г/м² с отдельным обмером и подтверждённой поставкой',
        'Сварка горячим воздухом, контроль пробником, выбранный жидкий ПВХ, полное высыхание и выбранная защита от УФ',
        'Одна закупка каждой выбранной мастики с раскрытым расходом обеих зон; наличие, резерв, кратность и остаток раздельны',
        'Горячие варианты требуют плана и подтверждённого температурного обеспечения, оборудования/энергии в цене материала',
        'Единый труд по фактическому плану; аппарат и ручная оснастка имеют видимых владельцев стоимости'],
      excludedScopeRu:['Стыки двух лент, углы, заплатки и повреждённый геотекстиль','Неармированное исполнение KZ 08.2026 без подтверждения совместимости',
        'Нагрев на объекте за отдельную плату без отдельного состава оборудования/энергии','Заимствование труда/машин поля кровли КРЕР',
        'Ремонт основания, соседние кровельные слои, внешняя доставка/вывоз и выдуманные SKU/цены']},
    applicability:{country:'KG',primaryMeasureParameterId:'transition_length_m',knownScopeParameters:['transition_length_m'],ordinaryUserInputCount:1,
      scope:'REINFORCED_GUIDE2024_SINGLE_CONTINUOUS_UNDAMAGED_STRIP',manufacturerGuideRequiresDeliveredProfileConfirmation:true,
      projectThermalPlanRequiredForHotAlternatives:true,hiddenDemoFixtureInputs:false,engineeringAccepted:false,ordinaryUiAccepted:false},
    binding:{rowId:'transition:material:tape',applicability:{source_id:sourceId,norm_id:normId,exact_locator:sourceMetadata.exact_locator,
      sourceGuideVersion:'02.2024',reinforcement:'REINFORCED',quantity_basis:'SEPARATELY_MEASURED_ADHESIVE_AREAS_AND_CONFIRMED_PROJECT_GEOMETRY_SUPPLY'}},
    locator:{key:'pvc-bitumen-transition-reinforced-guide2024-s27-37',payload:{sourcePackSha256:sourceMetadata.definition_hash,
      primaryDocument:sourceMetadata.primaryDocument,fixtureFactsNeverRuntimeDefaults:true,geometryAndSupplyRequired:true}},
    search:{primaryUom:'m',canonicalNameRu:title,aliases:['переход ПВХ к битумной кровле','переходная армированная лента LOGICROOF Tape PVC-B'],
      shortScopeRu:'Один непрерывный прямой участок по инструкции февраля 2024 для армированной ленты. Две клеевые площади, крепёж, разделение, сварка, контроль и УФ-защита; поставка и проектные факты обязательны.',
      keyDistinguishingParameters:['transition_length_m','adhesive_profile','tape_roll_length_m'],
      clarificationFields:['reinforced_guide2024_profile_confirmed','single_straight_undamaged_strip_confirmed','adhesive_profile','lower_adhesive_area_m2','upper_adhesive_area_m2'],
      includedBoundaries:['Непрерывная армированная переходная лента без стыков','Отдельные обмеры, совместимые материалы и владельцы стоимости'],
      excludedBoundaries:['Угловые/прямые стыки лент и повреждения геотекстиля','Неармированная лента без совместимой инструкции','Нагрев на объекте отдельной услугой'],
      extraSearchTermsRu:'ПВХ битум кровля переходная лента армированная мастика геотекстиль горячий битум LOGICROOF Tape PVC-B',
      sourceProvenance:{pinnedManufacturerGuide:true,hiddenDemoFixtureInputs:false,engineeringApprovalClaimed:false}},
    catalogAppend:{identity:{namespace:'global',domain:'roofing',sourceIdentity:'master-work:'+workKey,workKey,titleRu:title,denominatorEligible:true},
      searchPlacement:{groupMode:'create',groupId,groupNameRu,domainId:'roofing',systemId:'flat_roof',subsystemId:groupId,assemblyId:groupId,
        workFamilyId:'pvc_bitumen_transition_reinforced_guide2024_single_strip',breadcrumb:[groupNameRu],
        groupOracleDisposition:{contract:'rik-expo-app.s27-3.catalog-append.v1',disposition:'EXACT_PHYSICAL_WORK_GROUP',exactRateFamily:'MANUFACTURER_TAPE_PVC_B_REINFORCED_GUIDE2024'},
        membershipOrdinal:0,independentDisposition:{contract:'rik-expo-app.s27-3.catalog-append.v1',classification:'CANONICAL_VISIBLE',exactPhysicalIdentity:true,appendedWithoutReplacingExistingIdentity:true},
        elementType:'WORK',operationKind:'NEW_INSTALLATION',technologyVariant:'Один непрерывный прямой участок, армированная Tape PVC-B по инструкции 02.2024',
        constructionState:'NEW',normativeClassifiers:['ТЕХНОНИКОЛЬ: инструкция LOGICROOF Tape PVC-B, февраль 2024'],
        applicabilityTags:['PVC_BITUMEN_TRANSITION','REINFORCED','SINGLE_STRIP','GUIDE_2024','PROJECT_FACTS_REQUIRED'],
        publicationState:'ADMITTED_BACKEND',catalogOrigin:'GLOBAL',adjudicationClass:'EFFECTIVE_WORK',selectable:true}},
    forbiddenAdjacentMatchers:[/pvc-roof:machine:|pvc-roof:labor:|KRER12-01-028/iu,/unreinforced.*quantity|corner.*patch.*quantity/iu],
    owner:'S2737_PVC_BITUMEN_TRANSITION_GUIDE2024',receiptFileStem:'pvc_bitumen_transition_guide2024',
  };
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/prepareS2737PvcBitumenTransitionGuide2024Successor.ts')){
  const prerequisite=c411WorkProcessS2737PublishConfig({releaseId:russian.parentReleaseId,searchReleaseId:russian.parentSearchReleaseId});
  void runMasterSingleDefinitionSuccessorR1(pvcBitumenTransitionGuide2024S2737PublishConfig(resolveS2737SealedSuccessorParent(prerequisite,process.argv.includes('--apply'))))
    .catch(error=>{process.stderr.write(String(error.stack??error)+'\n');process.exitCode=1;});
}
