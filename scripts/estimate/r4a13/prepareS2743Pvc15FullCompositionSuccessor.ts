import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { strict as assert } from 'node:assert';
import { runMasterSingleDefinitionSuccessorR1, type MasterSingleDefinitionSuccessorConfig } from './prepareMasterSingleDefinitionSuccessorR1';
import { compileAutomaticConstructionOwnerR1 } from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import { PVC_ROOF_MEMBRANE_INSTALLATION_CATALOG_ID as catalogId } from '../../../src/lib/estimate/v4/pvcRoofMembraneInstallationR1';
import { PVC15_FULL_DEFINITION_S2743 as definition, PVC15_SOURCE_ID as sourceId, PVC15_SOURCE_LOCATOR, PVC15_SERIES_MANIFEST_S2743 } from '../../../src/lib/estimate/v4/pvcRoofMembraneFullCompositionS2743';
import { pvc15ControlInputS2743 } from '../../../tests/fixtures/pvc15FullCompositionS2743';

const packPath = 'data/estimate-benchmarks/source-packs/pvc15-full-composition-s27-43.json';
const title = 'Монтаж кровельной ПВХ-мембраны 1,5 мм с механическим креплением';
const normId = 'project_pvc15_full_composition_verified_applicability_s2743';
const packHash = createHash('sha256').update(readFileSync(packPath)).digest('hex');
const includedScopeRu = [
  'Проверка готового основания, очистка, разметка и применимая защита',
  'Совместимое разделение по EPS/XPS, минеральной вате или битуму; другое основание требует согласованного решения',
  'Проектная раскладка, механическое крепление, сварка и подтверждённые детали выбранного участка',
  'Время использования аппарата отдельно от собственного обеспечения, аренды, включённого аппарата и приобретения',
  'Труд операций, предоставленная оснастка, энергия, применимая доставка и обслуживание с отдельными границами оплаты',
  'Контроль швов, применимое устранение дефектов, финальная уборка, фактические отходы и сдача выбранного участка',
  'Исходный проектный заказ мембраны сохраняется; расход, выделенное наличие, резерв и реальный шаг поставки отдельны',
];
const excludedScopeRu = [
  'Нормы ПВХ1,2 мм, расход, крепёж, периферийные узлы, энергия, производительность и цены по площади',
  'Утепление, пароизоляция, уклон, ремонт кровельного пирога и неподтверждённые соседние узлы',
  'Покупка аппарата в машино-часах, перевод девяти часов в сутки или число аппаратов',
  'Неподтверждённая поставка42 м², масса отходов из пригодного остатка и повторное включённое начисление',
  'Пять generic-вариантов кровли без подтверждённой совместимости; новый тип или production acceptance',
];

export function pvc15FullCompositionPublishConfigS2743(parent: { definition: string; search: string }): MasterSingleDefinitionSuccessorConfig {
  return {
    contract:'rik-expo-app.s27-43.pvc15-full-existing-composition.v1',stopCode:'S2743_PVC15_FULL',applicationName:'s2743-pvc15-full-composition',
    expectedBranch:'codex/r4-a5-clean-08b18902',
    masterPath:'C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (83).md',
    masterSha256:'fd66f75f6cf92709662216fb407c9659113fe7f93903ccaad898f0ebf036afbe',
    parentReleaseId:parent.definition,parentSearchReleaseId:parent.search,currentReleasePath:resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),
    outputRoot:resolve('.release-runtime/r568/s27-43/pvc15-full-existing-composition'),owner:'S2743_PVC15_SINGLE_WRITER',receiptFileStem:'pvc15_full_composition',
    sourcePaths:[packPath,'scripts/estimate/r4a13/prepareS2743Pvc15FullCompositionSuccessor.ts','scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts',
      'scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts','src/lib/estimate/v4/pvcRoofMembraneFullCompositionS2743.ts',
      'src/lib/estimate/v4/pvcRoofMembraneInstallationR1.ts','src/lib/estimate/v4/automaticConstructionOwnerR1.ts','src/lib/estimate/v4/effectivePurchaseBalanceR1.ts',
      'src/lib/estimate/v4/g6PvcCompletionServiceComponentsS2741.ts','src/lib/estimate/v4/g6PvcProjectCompletionS2741.ts',
      'src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts','src/lib/estimate/backendPlatform/parameterConstraints.ts',
      'src/lib/estimate/backendPlatform/canonicalPurchaseBalanceV1.ts','src/lib/estimate/backendPlatform/canonicalCommercialCostCoverageV1.ts',
      'tests/fixtures/pvc15FullCompositionS2743.ts','tests/estimateNorms/pvcRoofMembraneFullCompositionS2743.contract.test.ts'],
    catalogId,sourceId,normId,sourceMetadata:{source_title:'ПВХ1,5 мм: проверенные условия изготовителя, проектная раскладка и полный состав выбранного поля',
      source_authority:'ТЕХНОНИКОЛЬ / LOGICROOF для проверенных условий материалов; утверждающий инженер для фактов проекта; предложение исполнителя для оплаты',
      exact_locator:PVC15_SOURCE_LOCATOR,use_restriction:excludedScopeRu.join('; '),source_kind:'VERIFIED_MANUFACTURER_APPLICABILITY_AND_EXPLICIT_PROJECT_FACTS',
      official_url:'https://storage.yandexcloud.net/pim/1/5/7/7/1577408cd3ebc61e4b33f29335ef37bab7da4710________________________________________________________.pdf',artifact_sha256:packHash},
    parameterDefinitions:definition.parameters,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources,
    shortInput:{area_m2:500},acceptanceInput:pvc15ControlInputS2743(),runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},
    expectedParentShape:[19,9,9],benchmarkOrdinal:1,validationScenario:'S2743_PVC15_EXISTING_FAMILY_PROJECT_FACTS_NO_DEFAULTS',
    passport:{canonicalRuName:title,workKey:'roofing_interior_flat_roof_install_standard',physicalResultRu:'Смонтированное и проверенное выбранное поле ПВХ1,5 мм с применимыми деталями и завершением; соседние слои отдельно',includedScopeRu,excludedScopeRu},
    applicability:{country:'KG',primaryMeasureParameterId:'area_m2',knownScopeParameters:['area_m2'],ordinaryUserInputCount:1,scope:'EXISTING_MECHANICALLY_FIXED_PVC15_PROJECT_LAYOUT_FULL_FIELD',
      hiddenDemoFixtureInputs:false,ordinaryUiAccepted:false,engineeringAccepted:false,seriesAccepted:false,acceptedNewTypeDelta:0,sourceCompatibilityRequired:true},
    binding:{rowId:'rc09:pvc_membrane_hot_air_install',applicability:{technology_class:'MECHANICALLY_FIXED_REINFORCED_PVC_1_5MM_PROJECT_SYSTEM',operation_class:'BOUNDED_ROOF_FIELD',
      source_id:sourceId,norm_id:normId,quantity_basis:'EXPLICIT_PROJECT_LAYOUT_AND_CONFIRMED_SUPPLY',source_locator:PVC15_SOURCE_LOCATOR}},
    locator:{key:'pvc15-full-existing-composition-s27-43',payload:{kind:'EXISTING_PVC15_PRIMARY_APPLICABILITY_AND_PROJECT_FACTS',sourcePackSha256:packHash,
      seriesManifest:PVC15_SERIES_MANIFEST_S2743,fixturePath:'tests/fixtures/pvc15FullCompositionS2743.ts',fixtureNeverRuntimeDefault:true,
      originalMembraneOrderSemanticsPreserved:true,supplyQuantityNeverMembraneConsumption:true,oldRevisionsNotRewritten:true}},
    search:{primaryUom:'m2',canonicalNameRu:title,aliases:['кровельная ПВХ-мембрана1,5 мм','ПВХ1.5 механическое крепление','LOGICROOF V-RP1,5 проектный монтаж'],
      shortScopeRu:includedScopeRu.join('; '),keyDistinguishingParameters:['pvc15_base','pvc15_system_profile','pvc15_machine_provision','pvc15_system_reference'],
      clarificationFields:definition.parameters.filter(p=>p.truth_metadata.visibility_role!=='INTERNAL_ONLY'&&p.parameter_id!=='area_m2').map(p=>p.parameter_id),
      includedBoundaries:includedScopeRu,excludedBoundaries:excludedScopeRu,extraSearchTermsRu:'основание стеклохолст геотекстиль крепёж сварка швы аппарат аренда энергия очистка отходы сдача',
      sourceProvenance:{sourceId,normId,sourcePackSha256:packHash,acceptedNewTypeDelta:0,noFixtureOrNormDefaults:true}},
    verifyCore:async()=>{
      assert.equal(createHash('sha256').update(readFileSync(packPath)).digest('hex'),packHash);
      const compile=(submittedParameters:Record<string,unknown>)=>compileAutomaticConstructionOwnerR1({catalogId,compilerVersion:'S2743-PVC15-publisher-control',primaryMeasureParameterId:'area_m2',definition,submittedParameters});
      const short=await compile({area_m2:500}),complete=await compile(pvc15ControlInputS2743());
      assert.equal(short.rows.length,1);assert.equal(short.rows[0]!.quantity,'500');assert(short.preliminaryNeeds.length>0);
      assert.equal(complete.preliminaryNeeds.length,0);assert.deepEqual(definition.runtimeInput,{});
      assert.equal(complete.rows.find(r=>r.row_id==='rc09:reinforced_pvc_roof_membrane_1_5mm')!.quantity,'535');
      assert.equal(complete.rows.find(r=>r.row_id==='rc09:automatic_hot_air_roof_welder')!.quantity,'9');
      assert(!complete.rows.some(r=>r.included_in_procurement&&r.unit_id==='machine_hour'));
      return {status:'GREEN_PVC15_FULL_EXISTING_DEFINITION_CORE_CONTROL',preparedResources:definition.resources.length,preparedParameters:definition.parameters.length,
        currentTypeDelta:0,noDefaultFacts:true,scopeQuantity:500,originalOrder:535,usageHours:9,ordinaryUiAccepted:false,engineeringAccepted:false,seriesAccepted:false};
    },
  };
}
async function run() {
  const current=JSON.parse(readFileSync('data/estimate-benchmarks/r568-local-developer-canonical-release.json','utf8'));
  await runMasterSingleDefinitionSuccessorR1(pvc15FullCompositionPublishConfigS2743({definition:current.definitionReleaseId,search:current.searchReleaseId}));
}
if(require.main===module)run().catch(error=>{console.error(error instanceof Error?error.message:String(error));process.exitCode=1;});
