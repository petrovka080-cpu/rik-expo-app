import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { strict as assert } from 'node:assert';
import { runMasterSingleDefinitionSuccessorR1, type MasterSingleDefinitionSuccessorConfig } from './prepareMasterSingleDefinitionSuccessorR1';
import { g6CommercialLaborSeriesConfigS2741 } from './prepareS2741G6PvcCommercialLaborSeries';
import { G6_PVC_COMMERCIAL_LABOR_SERIES_S2741 as series } from '../../../src/lib/estimate/v4/g6PvcCommercialLaborProfilesS2741';
import { withG6NextServiceComponents } from '../../../src/lib/estimate/v4/g6PvcCompletionServiceComponentsS2741';
import { compileAutomaticConstructionOwnerR1 } from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
const currentPath = resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json');

/** Sequential local successor of the accepted commercial/RU family only.
 * Core control fixtures are not runtime defaults. Apply remains governed by
 * the existing publisher's source/transaction/manifest/admission contract.
 */
export function g6CompletionSeriesConfigS2741(index: number, parent: { releaseId: string; searchReleaseId: string }): MasterSingleDefinitionSuccessorConfig {
  const profile = series[index]; assert(profile, 'G6_COMPLETION_TARGET_OUTSIDE_MANIFEST');
  const previous = g6CommercialLaborSeriesConfigS2741(index, parent);
  const operation = profile.definition.resources[0]!.resource_graph.operationCompositionV1 as { groupId: string; groupTitleRu: string };
  const definition = withG6NextServiceComponents(profile.definition, { catalogId: profile.catalogId,
    measureId: profile.measureId, unitId: profile.unitId, ...operation });
  const { physicalResourcesUnchanged: _previousWholeSetClaim, ...previousLocatorPayload } = previous.locator.payload;
  return { ...previous, contract: 'rik-expo-app.s27-41.g6-project-completion-' + index + '.v1',
    stopCode: 'S2741_G6_COMPLETION_' + index, applicationName: 's2741-g6-project-completion-' + index,
    owner: 'S2741_G6_01_SINGLE_WRITER', receiptFileStem: 'g6_project_completion_' + index,
    masterPath: 'C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (82).md',
    masterSha256: 'bbd44b9c730e3875e06ed0fdf7c8e95fbc076eeedf60108a565dd6ba76720579',
    outputRoot: resolve('.release-runtime/r568/s27-41/g6-completion-series', String(index)),
    expectedParentShape: [profile.definition.parameters.length, profile.definition.formulas.length, profile.definition.resources.length],
    sourcePaths: [...new Set([...previous.sourcePaths,
      'scripts/estimate/r4a13/prepareS2741G6PvcCompletionSeries.ts',
      'src/lib/estimate/v4/g6PvcProjectCompletionS2741.ts',
      'tests/estimateNorms/g6PvcProjectCompletionS2741.contract.test.ts',
      'src/lib/estimate/v4/g6PvcCompletionServiceComponentsS2741.ts',
      'supabase/functions/canonical-estimate-worker/index.ts',
      'scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts',
      'supabase/migrations/20261007010000_estimate_commercial_cost_scope_price_v2.sql',
      'src/lib/estimate/backendPlatform/canonicalEstimateDefaultPricing.test.ts',
    ])],
    parameterDefinitions: definition.parameters, formulaDefinitions: definition.formulas, resourceDefinitions: definition.resources,
    // Unknown programme/facts are intentionally retained in the short and
    // baseline control compositions. Only the original approved defaults stay.
    acceptanceInput: previous.acceptanceInput, runtimeProfileInput: definition.runtimeInput,
    runtimeProfileClassification: previous.runtimeProfileClassification, runtimeProfileSourceIds: definition.runtimeSourceIds,
    passport: { ...previous.passport, includedScopeRu: [...previous.passport.includedScopeRu,
      'По подтверждённой программе: отдельная финальная уборка, мешки и полная услуга вывоза фактической партии',
      'Полная услуга раскрывает транспорт, труд, применимую погрузочную машину, раздельное жидкое топливо и приём; обеспечивает исполнитель'],
      excludedScopeRu: [...previous.passport.excludedScopeRu,
        'Автоматические часы уборки, масса отходов из рулонного остатка, расход топлива или цена по умолчанию',
        'Другие энергоресурсы и пооперационная услуга без совместимого полного профиля'] },
    sourceMetadata: { ...previous.sourceMetadata,
      exact_locator: String(previous.sourceMetadata.exact_locator) + '; MASTER S27.41 §20.43: явная проектная программа завершения, не норма расхода.',
      use_restriction: String(previous.sourceMetadata.use_restriction) + ' Программа завершения и цена требуют фактических данных и подтверждённого состава.' },
    search: { ...previous.search, clarificationFields: [...previous.search.clarificationFields,
      ...definition.parameters.filter(parameter => parameter.parameter_id.startsWith('g6_')).map(parameter => parameter.parameter_id)],
      sourceProvenance: { ...previous.search.sourceProvenance, projectCompletionHasNoRuntimeDefaults: true } },
    applicability: { ...previous.applicability, completionIsProjectDefined: true, sourceLaborUnchanged: true,
      liquidFuelTransportAndApplicableLoaderOnly: true, engineeringAccepted: false, ordinaryUiAccepted: false },
    locator: { ...previous.locator, key: previous.locator.key + '-completion', payload: { ...previousLocatorPayload,
      existingPhysicalResourcesUnchanged: true, completionResourceRowsAdded: definition.resources.length - profile.definition.resources.length,
      completionFactsDefaulted: false, originalLaborUnchanged: true, actualWasteNeverRollRemainder: true } },
    verifyCore: async () => {
      const compile = (selectedDefinition: typeof definition) => compileAutomaticConstructionOwnerR1({ catalogId: profile.catalogId,
        compilerVersion: 'S2741-G6-completion-publisher-core-control', primaryMeasureParameterId: profile.measureId,
        definition: selectedDefinition, submittedParameters: { ...previous.acceptanceInput } });
      const old = await compile(profile.definition), next = await compile(definition);
      assert.deepEqual(next.rows.filter(row => !row.row_id.startsWith('g6:completion:')), old.rows);
      assert.deepEqual(next.preliminaryNeeds.filter(row => !row.row_id.startsWith('g6:completion:')), old.preliminaryNeeds);
      const needs = next.preliminaryNeeds.filter(row => row.row_id.startsWith('g6:completion:'));
      assert.equal(needs.length, 11);
      assert.equal(next.rows.filter(row => row.row_id.startsWith('g6:completion:')).length, 0);
      assert.deepEqual(definition.runtimeInput, profile.definition.runtimeInput);
      assert(definition.parameters.filter(parameter => parameter.parameter_id.startsWith('g6_')).every(parameter => parameter.default_value === null));
      return { status: 'GREEN_G6_COMPLETION_PRELIMINARY_CONTROL', binding: index, existingRowsPreserved: true,
        completionNeeds: needs.length, noDefaultFacts: true, noInstallationNormSplit: true,
        ordinaryUiAccepted: false, engineeringAccepted: false, seriesAccepted: false };
    } };
}

async function run() {
  const target = process.argv.find(value => value.startsWith('--target='))?.slice('--target='.length);
  assert(target == null || ['0','1','2'].includes(target), 'G6_COMPLETION_TARGET_OUTSIDE_MANIFEST');
  for (let index = 0; index < series.length; index++) {
    if (target != null && target !== String(index)) continue;
    const current = JSON.parse(readFileSync(currentPath, 'utf8'));
    await runMasterSingleDefinitionSuccessorR1(g6CompletionSeriesConfigS2741(index,
      { releaseId: current.definitionReleaseId, searchReleaseId: current.searchReleaseId }));
  }
}
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/prepareS2741G6PvcCompletionSeries.ts')) {
  void run().catch(error => { process.stderr.write(String(error.stack ?? error) + '\n'); process.exitCode = 1; });
}
