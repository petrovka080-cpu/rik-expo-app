import {resolve} from 'node:path';
import {strict as assert} from 'node:assert';
import {gypsumPgpC411S2736PublishConfig as base} from './prepareS2736GypsumPgpC411Successor';
import {pvcRoofRussianPresentationS2737PublishConfig as russian} from './prepareS2737PvcRoofRussianPresentationSuccessor';
import {c111WorkProcessS2737PublishConfig} from './prepareS2737C111WorkProcessSuccessor';
import {resolveS2737SealedSuccessorParent} from './prepareS2737PvcRoofVolumeCleanerSuccessor';
import {runMasterSingleDefinitionSuccessorR1, type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {compileGypsumPgpC411S2736, PGP_C411_DISPLAY_NAME_RU} from '../../../src/lib/estimate/v4/gypsumPgpC411ConstructorS2736';
import {canonicalEstimateWorkProcess} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';

type Parent = {releaseId: string; searchReleaseId: string};
export function c411WorkProcessS2737PublishConfig(parent: Parent): MasterSingleDefinitionSuccessorConfig {
  return {
    ...base, contract: 'rik-expo-app.s27-37.c411-work-process.v1', stopCode: 'S2737_C411_WORK_PROCESS',
    applicationName: 's2737-c411-work-process', masterPath: russian.masterPath, masterSha256: russian.masterSha256,
    parentReleaseId: parent.releaseId, parentSearchReleaseId: parent.searchReleaseId,
    outputRoot: resolve('.release-runtime/r568/s27-37/c411-work-process'), catalogAppend: undefined,
    sourcePaths: [...base.sourcePaths, 'scripts/estimate/r4a13/prepareS2737C411WorkProcessSuccessor.ts',
      'scripts/estimate/r4a13/prepareS2737C111WorkProcessSuccessor.ts',
      'scripts/estimate/r4a13/prepareS2737PvcRoofVolumeCleanerSuccessor.ts',
      'scripts/estimate/r4a13/prepareS2737PvcRoofRussianPresentationSuccessor.ts',
      'src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition.ts',
      'src/lib/estimate/backendPlatform/canonicalProfessionalPdf.ts',
      'src/features/consumerRepair/requestEstimateViewModel.ts', 'src/features/consumerRepair/RequestEstimateSummaryCard.tsx'],
    expectedParentShape: [base.parameterDefinitions.length, base.formulaDefinitions.length, base.resourceDefinitions.length],
    passport: {...base.passport, canonicalRuName: PGP_C411_DISPLAY_NAME_RU},
    search: {...base.search, canonicalNameRu: PGP_C411_DISPLAY_NAME_RU},
    benchmarkOrdinal: 163,
    locator: {key: 'c411-work-process-s27-37', payload: {...base.locator.payload,
      disclosureOnly: true, paidComplexLaborOwner: 'work:pgp:worker', quantityAndCostOwnersPreserved: true}},
    verifyCore: async () => {
      const existing = await base.verifyCore();
      const result = await compileGypsumPgpC411S2736({area_m2: 30});
      const process = canonicalEstimateWorkProcess(result.rows.map(row => ({rowId: row.row_id,
        operation: (row.calculation_trace as {resourceGraph?: {operationCompositionV1?: unknown}})?.resourceGraph?.operationCompositionV1})));
      assert.deepEqual(process[0]?.operations.map(step => step.operationId), ['prepare', 'mount', 'junction']);
      assert.equal(result.rows.find(row => row.row_id === 'work:pgp:worker')?.quantity, '33.213');
      return {...existing, laborIsCostSummaryNotProcess: true, quantityAndCostOwnersPreserved: true};
    },
    owner: 'S2737_C411_WORK_PROCESS', receiptFileStem: 'c411_work_process',
  };
}
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/prepareS2737C411WorkProcessSuccessor.ts')) {
  const prerequisite = c111WorkProcessS2737PublishConfig({releaseId: russian.parentReleaseId, searchReleaseId: russian.parentSearchReleaseId});
  void runMasterSingleDefinitionSuccessorR1(c411WorkProcessS2737PublishConfig(
    resolveS2737SealedSuccessorParent(prerequisite, process.argv.includes('--apply')),
  )).catch(error => {process.stderr.write(String(error.stack ?? error) + '\n'); process.exitCode = 1;});
}
