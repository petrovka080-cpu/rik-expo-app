import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fusionBenchConfigS2758 } from './prepareS2758FusionBench';
import { runMasterSingleDefinitionSuccessorR1, type MasterSingleDefinitionSuccessorConfig } from './prepareMasterSingleDefinitionSuccessorR1';

/** First replacement of the published Fusion definition. Its S27.58 source
 * meaning/master attribution stays intact; the active development queue is
 * S27.59. Only the three derived-quantity policies change the SQL meaning. */
export function fusionQuantityPolicyConfigS2759(parent: { releaseId: string; searchReleaseId: string }): MasterSingleDefinitionSuccessorConfig {
  const base = fusionBenchConfigS2758(parent);
  const { catalogAppend: _append, ...replacement } = base;
  return { ...replacement, expectedParentShape: [25, 13, 13],
    stopCode: 'S2759_FUSION_QUANTITY_POLICY', applicationName: 's2759-fusion-quantity-policy',
    outputRoot: resolve('.release-runtime/r568/s27-59/fusion-quantity-policy/publication'),
    owner: 'S2759_FUSION_QUANTITY_POLICY_SINGLE_WRITER', receiptFileStem: 'fusion_quantity_policy',
    sourcePaths: [...new Set([...base.sourcePaths,
      'scripts/estimate/r4a13/prepareS2759FusionQuantityPolicy.ts',
      'scripts/estimate/backendMigration/canonicalFusionPublishedSourceReaderS2758.ts',
      'scripts/estimate/backendMigration/canonicalFusionDerivedQuantityClearServerS2758.ts',
      'scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts',
      'src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1.ts',
      'src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1.ts',
      'src/lib/estimate/backendPlatform/canonicalMasterSingleDefinitionSourceOriginR1.ts',
      'src/lib/estimate/backendPlatform/canonicalDerivedQuantityClearEvidenceV1.ts',
      'src/lib/estimate/backendPlatform/canonicalDerivedQuantityClearParentPricesV1.ts',
      'src/lib/estimate/backendPlatform/canonicalFusionUnroutedClearPriceEvidenceS2758.ts',
      'src/lib/estimate/backendPlatform/canonicalFusionResourceSourceIntegrityS2758.ts',
      'src/lib/estimate/backendPlatform/canonicalFusionPublishedSourcePacketS2758.ts',
      'src/lib/estimate/backendPlatform/canonicalFusionPublishedSourceOriginS2758.ts',
      'src/lib/estimate/backendPlatform/canonicalFusionPublishedManifestChainS2758.ts',
      'src/lib/estimate/backendPlatform/sourceOrigins/fusionPublishedLegacyOriginEnvelopeS2758.ts',
      'src/lib/estimate/backendPlatform/canonicalFusionDerivedQuantityClearAdmissionS2758.ts',
      'src/lib/estimate/backendPlatform/contracts.ts', 'src/lib/estimate/backendPlatform/canonicalEstimateClient.ts',
      'src/lib/estimate/backendPlatform/canonicalEstimateCommandIdentity.ts', 'src/lib/estimate/backendPlatform/canonicalUserCommandIntentV1.ts',
      'src/features/consumerRepair/consumerCanonicalReleaseMigration.ts', 'src/features/consumerRepair/consumerCanonicalParameterEditor.ts',
      'src/features/consumerRepair/ConsumerCanonicalReleaseMigrationConfirmation.tsx',
      'src/features/consumerRepair/ConsumerRepairRequestScreen.tsx', 'src/features/consumerRepair/ConsumerRepairProgressiveEstimatePanel.tsx',
      'tests/requestEstimate/fusionPublishedSourceOrigin.contract.test.ts', 'tests/requestEstimate/fusionPublishedManifestChain.contract.test.ts',
      'tests/requestEstimate/fusionPublishedSourceReader.contract.test.ts', 'tests/requestEstimate/fusionDerivedQuantityClearAdmission.contract.test.ts',
      'tests/requestEstimate/fusionQuantityClearServerPreview.contract.test.ts', 'tests/requestEstimate/consumerFusionQuantityClear.contract.test.ts',
      'tests/requestEstimate/consumerReleaseMigrationConfirmation.contract.test.tsx', 'tests/requestEstimate/conditionalParameterTyping.contract.test.tsx',
    ])],
  };
}
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/prepareS2759FusionQuantityPolicy.ts')) {
  const current = JSON.parse(readFileSync(resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'), 'utf8'));
  void runMasterSingleDefinitionSuccessorR1(fusionQuantityPolicyConfigS2759({ releaseId: current.definitionReleaseId, searchReleaseId: current.searchReleaseId }))
    .catch(error => { process.stderr.write(String(error.stack ?? error) + '\n'); process.exitCode = 1; });
}
