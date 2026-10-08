import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { strict as assert } from 'node:assert';
import { g6CompletionSeriesConfigS2741 } from './prepareS2741G6PvcCompletionSeries';
import { runMasterSingleDefinitionSuccessorR1, type MasterSingleDefinitionSuccessorConfig } from './prepareMasterSingleDefinitionSuccessorR1';
import { withPvcRoofVolumeMinimalCustomerInputS2747 } from '../../../src/lib/estimate/v4/pvcRoofVolumeMinimalCustomerInputS2747';
import { compileAutomaticConstructionOwnerR1 } from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import { G6_COMPLETION_NOT_REQUIRED_S2741 } from '../../../src/lib/estimate/v4/g6PvcProjectCompletionS2741';
import { G6_PVC_COMMERCIAL_LABOR_SERIES_S2741 } from '../../../src/lib/estimate/v4/g6PvcCommercialLaborProfilesS2741';
import { withG6NextServiceComponents } from '../../../src/lib/estimate/v4/g6PvcCompletionServiceComponentsS2741';

export function pvcRoofVolumeMinimalConfigS2747(parent: { releaseId: string; searchReleaseId: string }): MasterSingleDefinitionSuccessorConfig {
  const previous = g6CompletionSeriesConfigS2741(1, parent);
  const profile = G6_PVC_COMMERCIAL_LABOR_SERIES_S2741[1]!;
  const operation = profile.definition.resources[0]!.resource_graph.operationCompositionV1 as { groupId: string; groupTitleRu: string };
  const definition = withPvcRoofVolumeMinimalCustomerInputS2747(withG6NextServiceComponents(profile.definition,
    { catalogId: profile.catalogId, measureId: profile.measureId, unitId: profile.unitId, ...operation }));
  return { ...previous,
    contract: 'rik-expo-app.s27-47.pvc12-volume-minimal-input.v1', stopCode: 'S2747_PVC12_MINIMAL_INPUT',
    applicationName: 's2747-pvc12-minimal-input', owner: 'S2747_PVC12_SINGLE_WRITER', receiptFileStem: 'pvc12_minimal_input',
    masterPath: 'C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (87).md',
    masterSha256: 'bdb1fe052f60ba7d775139894309d178ac092957d00499ae090d5e5618762c87',
    outputRoot: resolve('.release-runtime/r568/s27-47/pvc12-minimal-input'),
    expectedParentShape: [previous.parameterDefinitions.length, previous.formulaDefinitions.length, previous.resourceDefinitions.length],
    sourcePaths: [...new Set([...previous.sourcePaths,
      'scripts/estimate/r4a13/prepareS2747PvcRoofVolumeMinimalInput.ts',
      'src/lib/estimate/v4/pvcRoofVolumeMinimalCustomerInputS2747.ts',
      'tests/estimateNorms/pvcRoofVolumeMinimalCustomerInputS2747.contract.test.ts',
    ])],
    parameterDefinitions: definition.parameters, formulaDefinitions: definition.formulas, resourceDefinitions: definition.resources,
    runtimeProfileInput: definition.runtimeInput, runtimeProfileClassification: definition.runtimeClassification,
    runtimeProfileSourceIds: definition.runtimeSourceIds,
    search: { ...previous.search, clarificationFields: ['area_m2', 'roof_height_m', 'cleaned_surface_m2', 'g6_cleanup_applicability', 'g6_waste_applicability'],
      sourceProvenance: { ...previous.search.sourceProvenance, consumerInputOwnership: 'S2747_VOLUME_PROFILE_ONLY', heightDefaultRemoved: true } },
    verifyCore: async () => {
      const result = await compileAutomaticConstructionOwnerR1({ definition, catalogId: previous.catalogId,
        compilerVersion: 's2747-pvc12-publisher-control', primaryMeasureParameterId: 'area_m2',
        submittedParameters: { area_m2: 458, roof_height_m: 6, cleaned_surface_m2: 20,
          g6_cleanup_applicability: G6_COMPLETION_NOT_REQUIRED_S2741, g6_waste_applicability: G6_COMPLETION_NOT_REQUIRED_S2741 } });
      assert.equal(result.preliminaryNeeds.length, 0);
      assert.equal(result.rows.find(row => row.row_id === 'pvc-roof:labor:workers')?.quantity, '24.4114');
      assert.equal(result.rows.find(row => row.row_id === 'pvc-roof:material:cleaner-volume-472219')?.quantity, '6');
      return { status: 'GREEN_PVC12_MINIMAL_INPUT_CORE', initialObjectFacts: 5, technicalInputsInjected: false,
        rows: result.rows.length, unknownPricesPreserved: true, ordinaryUiAccepted: false, fullWasteProgrammeAccepted: false };
    },
  };
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/prepareS2747PvcRoofVolumeMinimalInput.ts')) {
  const current = JSON.parse(readFileSync(resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'), 'utf8'));
  void runMasterSingleDefinitionSuccessorR1(pvcRoofVolumeMinimalConfigS2747({ releaseId: current.definitionReleaseId, searchReleaseId: current.searchReleaseId }))
    .catch(error => { process.stderr.write(String(error.stack ?? error) + '\n'); process.exitCode = 1; });
}
