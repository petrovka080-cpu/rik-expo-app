import { resolve } from 'node:path';
import { strict as assert } from 'node:assert';
import { pvcRoofConcreteS2736PublishConfig as base } from './prepareS2736PvcRoofConcreteKrer12Successor';
import { runMasterSingleDefinitionSuccessorR1, type MasterSingleDefinitionSuccessorConfig } from './prepareMasterSingleDefinitionSuccessorR1';
import { aiEstimateRuLabelForParameter } from '../../../src/lib/estimate/aiEstimateRuParameterDictionary';

export const pvcRoofVisibleLabelsS2736PublishConfig: MasterSingleDefinitionSuccessorConfig = {
  ...base, contract: 'rik-expo-app.s27-36.pvc-roof-visible-labels.v1', stopCode: 'S2736_PVC_ROOF_VISIBLE_LABELS',
  applicationName: 's2736-pvc-roof-visible-labels',
  parentReleaseId: '5f3361da-3ede-5901-857b-4e2eb65ba9fa', parentSearchReleaseId: '2048fffd-c560-562a-bc30-262a28b648d3',
  outputRoot: resolve('.release-runtime/r568/s27-35/pvc-roof-visible-labels'),
  sourcePaths: [...base.sourcePaths, 'scripts/estimate/r4a13/prepareS2736PvcRoofVisibleLabelsSuccessor.ts',
    'src/lib/estimate/aiEstimateRuParameterDictionary.ts'],
  // Includes seven internal derived purchase-balance parameters in addition
  // to the 31 public/conditional fields; verified from the immutable parent.
  expectedParentShape: [38, 27, 27], catalogAppend: undefined, benchmarkOrdinal: 158,
  verifyCore: async () => {
    const proof = await base.verifyCore();
    const labels: Record<string, string> = Object.fromEntries(base.parameterDefinitions.map((p): [string, string] =>
      [String(p.parameter_id), aiEstimateRuLabelForParameter(String(p.parameter_id), String(p.title_ru))]));
    assert(Object.values(labels).every(label => label.trim().length > 0));
    assert(labels.field_roll_m2.includes('Площадь рулона'));
    assert(labels.detail_pack_m2.includes('Площадь упаковки'));
    assert(labels.roof_anchor_stock.includes('пригодного наличия'));
    assert(labels.roof_anchor_reserve.includes('сохраняемого резерва'));
    return { ...proof, visibleLabelFilterVerified: true, existingArithmeticPreserved: true };
  },
  owner: 'S2736_PVC_ROOF_VISIBLE_LABELS', receiptFileStem: 'pvc_roof_visible_labels',
};
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/prepareS2736PvcRoofVisibleLabelsSuccessor.ts')) {
  void runMasterSingleDefinitionSuccessorR1(pvcRoofVisibleLabelsS2736PublishConfig).catch(error => {
    process.stderr.write(String(error.stack ?? error) + '\n'); process.exitCode = 1;
  });
}
