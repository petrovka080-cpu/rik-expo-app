import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { strict as assert } from 'node:assert';
import { roofLanternLimitedS2748Config } from './prepareS2748RoofLanternLimited';
import { runMasterSingleDefinitionSuccessorR1, type MasterSingleDefinitionSuccessorConfig } from './prepareMasterSingleDefinitionSuccessorR1';
import { parameterDefinitions, formulaDefinitions, resourceDefinitions, sourcePack, compileCandidate } from '../../../src/lib/estimate/v4/roofWindowOperationResourcesS2750';
import { resourceDefinitions as oldResources, compileCandidate as compileParent } from '../../../src/lib/estimate/v4/roofLanternCfp100100LimitedS2748';
import { canonicalEstimateResourceOperationSections } from '../../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';

export function roofWindowOperationResourcesS2750Config(parent: { releaseId: string; searchReleaseId: string }): MasterSingleDefinitionSuccessorConfig {
  const inherited = roofLanternLimitedS2748Config(parent);
  const title = 'Установка окон в крыше';
  return { ...inherited, contract: sourcePack.contract, stopCode: 'S2750_ROOF_WINDOW_OPERATIONS',
    applicationName: 's2750-roof-window-operations',
    masterPath: 'C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (91).md',
    masterSha256: '99e5d7aa89ac7ba1d8c3fcec320f630447931c30291c31719e5a15dc50863769',
    outputRoot: resolve('.release-runtime/r568/s27-49/plain-public-estimates/publication'),
    parameterDefinitions, formulaDefinitions, resourceDefinitions, expectedParentShape: [26,21,21],
    sourcePaths: [...inherited.sourcePaths,
      'scripts/estimate/r4a13/prepareS2750RoofWindowOperationResources.ts',
      'src/lib/estimate/v4/roofWindowOperationResourcesS2750.ts',
      'src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition.ts',
      'src/lib/estimate/backendPlatform/canonicalPublicEstimateLanguageRu.ts',
      'data/estimate-benchmarks/source-packs/roof-window-operation-resources-s27-50.json',
      'data/estimate-benchmarks/source-packs/public-estimate-language-s27-50.json',
      'tests/estimateNorms/roofWindowOperationResourcesS2750.contract.test.ts'],
    sourceMetadata: { ...inherited.sourceMetadata,
      use_restriction: 'MASTER S27.50 §20.52: сохранённая структура работ и ресурсов ограниченного исполнения. 13 норм не подтверждены. Полная техническая приёмка не присвоена.' },
    passport: { ...inherited.passport, canonicalRuName: title,
      physicalResultRu: sourcePack.scopeRu },
    locator: { ...inherited.locator, key: 'roof-window-operation-resources-s2750',
      payload: { ...inherited.locator.payload, operationCompositionPack: sourcePack,
        historicalRevisionsNotEnriched: true, quantityAndCostOwnersUnchanged: true } },
    search: { ...inherited.search, canonicalNameRu: title,
      aliases: ['окна в крыше', 'кровельные световые фонари', 'зенитные фонари', 'неоткрывающееся окно с прозрачным куполом 100 × 100 см'],
      shortScopeRu: 'Окно с прозрачным куполом, проём 100 × 100 см. Показаны установка, защита стыков, утепление, доставка и завершение. Количества 13 потребностей пока не подтверждены.',
      extraSearchTermsRu: 'окно крыша дневной свет кровельный зенитный световой фонарь купол основание',
      sourceProvenance: { ...inherited.search.sourceProvenance, operationCompositionPack: 'roof-window-operation-resources-s27-50.json' } },
    owner: 'S2750_ROOF_WINDOW_SINGLE_WRITER', receiptFileStem: 'roof_window_operations',
    validationScenario: 'S2750_ROOF_WINDOW_SAVED_OPERATION_OWNERS_NO_NEW_NORMS',
    verifyCore: async () => {
      const inheritedReceipt = await inherited.verifyCore();
      assert.equal(createHash('sha256').update(readFileSync(resolve('data/estimate-benchmarks/source-packs/' + sourcePack.inheritedSourcePack))).digest('hex'), sourcePack.inheritedSourcePackSha256);
      const result = await compileCandidate(inherited.acceptanceInput);
      const previous = await compileParent(inherited.acceptanceInput);
      const values = (rows: typeof result.rows) => rows.map(row => [row.row_id, row.quantity, row.unit_id, row.included_in_estimate, row.included_in_procurement]);
      assert.deepEqual(values(result.rows), values(previous.rows));
      assert.deepEqual(result.preliminaryNeeds.map(row => [row.row_id, row.quantity, row.missing_parameter_ids]), previous.preliminaryNeeds.map(row => [row.row_id, row.quantity, row.missing_parameter_ids]));
      for (const resource of resourceDefinitions) {
        const before = oldResources.find(row => row.row_id === resource.row_id)!;
        for (const key of ['ordinal','formula_id','unit_id','procurement_eligible','cost_owner_id','title_ru'] as const) assert.deepEqual(resource[key], before[key]);
        const { operationCompositionV1, publicResourcePresentationV1, ...graph } = resource.resource_graph;
        assert.deepEqual(graph, before.resource_graph);
        assert(operationCompositionV1); assert(publicResourcePresentationV1);
      }
      const sections = canonicalEstimateResourceOperationSections(resourceDefinitions.map(row => ({ rowId: row.row_id,
        titleRu: row.title_ru, operation: row.resource_graph.operationCompositionV1 })));
      assert.equal(sections.length, 7);
      assert.equal(sections.flatMap(section => section.resourceIds).length, 21);
      assert.equal(sections.flatMap(section => section.sharedResources).length, 1);
      return { inheritedReceipt, status: 'GREEN_SAVED_OPERATION_RESOURCES_LIMITED', knownRows:8,
        unresolvedNeeds:13, operationSections:7, singleOwnedResources:21, sharedDisplayReferences:1,
        fullTechnicalAcceptance:false, ordinaryUiAccepted:false, acceptedNewTypes:0 };
    },
  };
}
if (process.argv[1]?.replaceAll('\\','/').endsWith('/prepareS2750RoofWindowOperationResources.ts')) {
  const current = JSON.parse(readFileSync(resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),'utf8'));
  void runMasterSingleDefinitionSuccessorR1(roofWindowOperationResourcesS2750Config({ releaseId: current.definitionReleaseId,
    searchReleaseId: current.searchReleaseId })).catch(error => { process.stderr.write(String(error.stack ?? error) + '\n'); process.exitCode=1; });
}
