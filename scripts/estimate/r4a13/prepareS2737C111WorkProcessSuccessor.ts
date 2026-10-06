import {resolve} from 'node:path';
import {strict as assert} from 'node:assert';
import {drywallPartitionC111S2736PublishConfig as base} from './prepareS2736DrywallPartitionC111Successor';
import {pvcRoofRussianPresentationS2737PublishConfig as russian} from './prepareS2737PvcRoofRussianPresentationSuccessor';
import {waterValtecWorkProcessS2737PublishConfig} from './prepareS2737WaterValtecWorkProcessSuccessor';
import {resolveS2737SealedSuccessorParent} from './prepareS2737PvcRoofVolumeCleanerSuccessor';
import {runMasterSingleDefinitionSuccessorR1, type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {compileDrywallPartitionC111S2736, C111_DISPLAY_NAME_RU} from '../../../src/lib/estimate/v4/drywallPartitionC111ConstructorS2736';
import {canonicalEstimateWorkProcess} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';

type Parent = {releaseId: string; searchReleaseId: string};
export function c111WorkProcessS2737PublishConfig(parent: Parent): MasterSingleDefinitionSuccessorConfig {
  return {
    ...base, contract: 'rik-expo-app.s27-37.c111-work-process.v1', stopCode: 'S2737_C111_WORK_PROCESS',
    applicationName: 's2737-c111-work-process', masterPath: russian.masterPath, masterSha256: russian.masterSha256,
    parentReleaseId: parent.releaseId, parentSearchReleaseId: parent.searchReleaseId,
    outputRoot: resolve('.release-runtime/r568/s27-37/c111-work-process'),
    sourcePaths: [...base.sourcePaths, 'scripts/estimate/r4a13/prepareS2737C111WorkProcessSuccessor.ts',
      'scripts/estimate/r4a13/prepareS2737WaterValtecWorkProcessSuccessor.ts',
      'scripts/estimate/r4a13/prepareS2737PvcRoofVolumeCleanerSuccessor.ts',
      'scripts/estimate/r4a13/prepareS2737PvcRoofRussianPresentationSuccessor.ts',
      'src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition.ts',
      'src/lib/estimate/backendPlatform/canonicalProfessionalPdf.ts',
      'src/features/consumerRepair/requestEstimateViewModel.ts', 'src/features/consumerRepair/RequestEstimateSummaryCard.tsx'],
    expectedParentShape: [base.parameterDefinitions.length, base.formulaDefinitions.length, base.resourceDefinitions.length],
    passport: {...base.passport, canonicalRuName: C111_DISPLAY_NAME_RU,
      includedScopeRu: ['Монтаж каркаса, обшивка обеих сторон, выбранная изоляция и заделка швов; общий труд КРЕР 10-05-001-01 оплачивается один раз',
        ...base.passport.includedScopeRu.slice(1)]},
    search: {...base.search, canonicalNameRu: C111_DISPLAY_NAME_RU},
    benchmarkOrdinal: 162,
    locator: {key: 'c111-work-process-s27-37', payload: {...base.locator.payload,
      disclosureOnly: true, paidComplexLaborOwner: 'work:c111:worker', conditionalInsulationPreserved: true}},
    verifyCore: async () => {
      const existing = await base.verifyCore();
      for (const mode of ['AKUSTIKNAUF_50', 'NONE']) {
        const result = await compileDrywallPartitionC111S2736({area_m2: 30, c111_insulation_mode: mode});
        const process = canonicalEstimateWorkProcess(result.rows.map(row => ({rowId: row.row_id,
          operation: (row.calculation_trace as {resourceGraph?: {operationCompositionV1?: unknown}})?.resourceGraph?.operationCompositionV1})));
        assert.deepEqual(process[0]?.operations.map(step => step.operationId),
          mode === 'NONE' ? ['frame', 'clad', 'finish_joint'] : ['frame', 'clad', 'insulate', 'finish_joint']);
        assert.equal(result.rows.find(row => row.row_id === 'work:c111:worker')?.quantity, '29.4');
      }
      return {...existing, laborIsCostSummaryNotProcess: true, quantityAndCostOwnersPreserved: true};
    },
    owner: 'S2737_C111_WORK_PROCESS', receiptFileStem: 'c111_work_process',
  };
}
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/prepareS2737C111WorkProcessSuccessor.ts')) {
  const prerequisite = waterValtecWorkProcessS2737PublishConfig({releaseId: russian.parentReleaseId, searchReleaseId: russian.parentSearchReleaseId});
  void runMasterSingleDefinitionSuccessorR1(c111WorkProcessS2737PublishConfig(
    resolveS2737SealedSuccessorParent(prerequisite, process.argv.includes('--apply')),
  )).catch(error => {process.stderr.write(String(error.stack ?? error) + '\n'); process.exitCode = 1;});
}
