import { resolve } from 'node:path';
import { strict as assert } from 'node:assert';
import { pvcRoofConcreteS2736PublishConfig as base } from './prepareS2736PvcRoofConcreteKrer12Successor';
import { runMasterSingleDefinitionSuccessorR1, type MasterSingleDefinitionSuccessorConfig } from './prepareMasterSingleDefinitionSuccessorR1';
import { PVC_ROOF_FIELD_DISPLAY_NAME_RU } from '../../../src/lib/estimate/backendPlatform/russianTechnologyTitleR542';
import { aiEstimateRuLabelForParameter } from '../../../src/lib/estimate/aiEstimateRuParameterDictionary';

export const pvcRoofRussianPresentationS2737PublishConfig: MasterSingleDefinitionSuccessorConfig = {
  ...base,
  contract: 'rik-expo-app.s27-37.pvc-roof-russian-presentation.v1',
  stopCode: 'S2737_PVC_ROOF_RUSSIAN_PRESENTATION', applicationName: 's2737-pvc-roof-russian-presentation',
  masterPath: 'C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (77).md',
  masterSha256: '1b20335afcbb445e900f2d01920235d8c3e2956b2989b6bc55dbfe92473a5013',
  parentReleaseId: 'd75f339e-b75f-52a3-86a9-f011af08e026',
  parentSearchReleaseId: '509e7550-285e-5b7c-bfc3-97af05d6de02',
  outputRoot: resolve('.release-runtime/r568/s27-37/pvc-roof-russian-presentation'),
  sourcePaths: [...base.sourcePaths,
    'scripts/estimate/r4a13/prepareS2737PvcRoofRussianPresentationSuccessor.ts',
    'src/lib/estimate/backendPlatform/russianTechnologyTitleR542.ts',
    'src/features/consumerRepair/requestEstimateViewModel.ts',
    'src/features/consumerRepair/ConsumerRepairRequestChrome.tsx',
    'src/features/consumerRepair/RequestEstimateSummaryCard.tsx',
    'src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition.ts',
    'src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition.test.ts',
    'src/lib/estimate/backendPlatform/canonicalProfessionalPdf.ts',
    'src/lib/estimate/backendPlatform/canonicalProfessionalPdf.test.ts',
    'tests/requestEstimate/requestEstimateMountedLaunchPrompt.contract.test.tsx',
    'tests/requestEstimate/canonicalPrimaryTitleAuthority.contract.test.ts',
    'tests/estimateNorms/roadCrossingSleevesSelectedJackingR1.contract.test.ts',
  ],
  expectedParentShape: [38, 27, 27], catalogAppend: undefined, benchmarkOrdinal: 159,
  passport: {
    ...base.passport, canonicalRuName: PVC_ROOF_FIELD_DISPLAY_NAME_RU,
    physicalResultRu: 'Однослойная ПВХ-мембрана 1,2 мм по готовому совместимому утеплителю на бетонном основании: разделительный слой, раскрой, крепление, сварка и усиление Т-стыков',
  },
  search: {
    ...base.search, canonicalNameRu: PVC_ROOF_FIELD_DISPLAY_NAME_RU,
    aliases: [...base.search.aliases, 'укладка и крепление ПВХ мембраны 1,2 мм', 'LOGICROOF V-RP 1.2 мм'],
    shortScopeRu: 'Укладка ПВХ-мембраны 1,2 мм по готовому утеплителю на бетонном основании. Нормативный бюджет требует проверки раскладки и ветрового крепления. Примыкания и соседние слои отдельно; очиститель по фактической зоне обработки.',
  },
  locator: {
    key: 'pvc-roof-russian-presentation-s27-37-v1',
    payload: { ...base.locator.payload, presentationOnly: true, originalSourcePackPreserved: true, orderedWorkProcessDisclosed: true },
  },
  verifyCore: async () => {
    const proof = await base.verifyCore();
    for (const parameter of base.parameterDefinitions) {
      assert(aiEstimateRuLabelForParameter(parameter.parameter_id, parameter.title_ru).trim().length > 0);
    }
    assert(base.resourceDefinitions.find(row => row.row_id === 'pvc-roof:material:field')?.title_ru.startsWith('Мембрана кровельная ПВХ'));
    return { ...proof, russianPresentationVerified: true, arithmeticAndProductIdentityPreserved: true };
  },
  owner: 'S2737_PVC_ROOF_RUSSIAN_PRESENTATION', receiptFileStem: 'pvc_roof_russian_presentation',
};

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/prepareS2737PvcRoofRussianPresentationSuccessor.ts')) {
  void runMasterSingleDefinitionSuccessorR1(pvcRoofRussianPresentationS2737PublishConfig).catch(error => {
    process.stderr.write(String(error.stack ?? error) + '\n'); process.exitCode = 1;
  });
}
