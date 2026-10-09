import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { strict as assert } from 'node:assert';
import { runMasterSingleDefinitionSuccessorR1, buildMasterCapabilityMatrix, buildMasterScopeReadiness, type MasterSingleDefinitionSuccessorConfig } from './prepareMasterSingleDefinitionSuccessorR1';
import { canonicalPublisherQuantityScopeIsConsistent } from './canonicalDefinitionPublisherR1';
import { compileCandidate, parameterDefinitions, formulaDefinitions, resourceDefinitions, sourcePack } from '../../../src/lib/estimate/v4/roofLanternCfp100100LimitedS2748';

const title = 'Кровельные фонари VELUX CFP 100100 — предварительный состав';
const included = ['Отдельные основание CFP Q 73FQV 100100 и купол ISD 100100 0010; по одному на фонарь',
  'Стеклопакет и встроенный крепёж купола включены в изделия, повторная закупка исключена',
  'Наличие и сохраняемый запас по каждому изделию; неизвестный заказ не скрывает известную потребность',
  'Монтаж, примыкания, подъём, доставка, плёнка, уборка и отходы видимы как незакрытые потребности'];
const excluded = ['Полная техническая или закупочная готовность сметы',
  'Автоматические нормы крепежа, примыканий, труда, подъёма, доставки, уборки и вывоза без применимого источника',
  'Другие модели и размеры, открывающиеся/дымоудаляющие фонари, замена расчёта проёма световой площадью',
  'Ремонт или изготовление несущего проёма и кровли без отдельного совместимого проектного решения'];

/** One bounded preliminary successor. Manufacturer facts are not installation
 * norms, and control values never become runtime/customer defaults. */
export function roofLanternLimitedS2748Config(parent: { releaseId: string; searchReleaseId: string }): MasterSingleDefinitionSuccessorConfig {
  const acceptanceInput = { lantern_count: 10, lantern_model: sourcePack.model,
    base_stock_units: 0, base_reserve_units: 0, dome_stock_units: 0, dome_reserve_units: 0 };
  return {
    contract: sourcePack.contract, stopCode: 'S2748_ROOF_LANTERN_LIMITED', applicationName: 's2748-roof-lantern-limited',
    expectedBranch: 'codex/r4-a5-clean-08b18902',
    masterPath: 'C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (88).md',
    masterSha256: 'aa25a065b9a2ccdbdbbd21b3e820f42e40e3b53323f54dda00306a7ad04f15c0',
    parentReleaseId: parent.releaseId, parentSearchReleaseId: parent.searchReleaseId,
    currentReleasePath: resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),
    outputRoot: resolve('.release-runtime/r568/s27-48/lantern-limited/publication'),
    catalogId: sourcePack.catalogId, sourceId: sourcePack.sourceId,
    normId: 'EXACT_PRODUCT_COMPOSITION_NOT_INSTALLATION_NORM',
    sourcePaths: ['scripts/estimate/r4a13/prepareS2748RoofLanternLimited.ts',
      'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts',
      'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.test.ts',
      'scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts',
      'src/lib/estimate/v4/roofLanternCfp100100LimitedS2748.ts',
      'src/lib/estimate/v4/automaticConstructionOwnerR1.ts',
      'src/lib/estimate/v4/effectivePurchaseBalanceR1.ts',
      'src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts',
      'src/lib/estimate/backendPlatform/parameterConstraints.ts',
      'src/lib/estimate/backendPlatform/parameterConstraints.test.ts',
      'tests/estimateNorms/roofLanternCfp100100LimitedS2748.contract.test.ts',
      'data/estimate-benchmarks/source-packs/roof-lantern-cfp100100-limited-s27-48.json',
      ...sourcePack.sources.map(source => source.localArtifact)],
    sourceMetadata: { source_title: sourcePack.model, source_authority: 'VELUX',
      source_kind: 'PRIMARY_MANUFACTURER_PRODUCT_COMPOSITION_ONLY',
      official_url: sourcePack.sources[0].officialUrl, artifact_sha256: sourcePack.sources[0].artifactSha256,
      exact_locator: sourcePack.sources.map(source => source.exactLocator).join(' | '),
      use_restriction: 'Предварительный состав ровно одной модели; монтажные и завершительные нормы не подтверждены. MASTER §20.50.8: ограниченный режим, не полный технический допуск.' },
    parameterDefinitions, formulaDefinitions, resourceDefinitions,
    shortInput: { lantern_count: 10 }, acceptanceInput,
    runtimeProfileInput: {}, runtimeProfileClassification: {}, runtimeProfileSourceIds: {},
    expectedParentShape: [5, 45, 45], benchmarkOrdinal: 0,
    validationScenario: 'S2748_CFP100100_LIMITED_COMPOSITION_NO_INSTALLATION_DEFAULTS',
    passport: { canonicalRuName: title, workKey: 'roof_lanterns',
      physicalResultRu: 'Предварительная потребность в заданном числе одинаковых фонарей CFP 100100 с куполами ISD 0010; монтажная смета остаётся неполной.',
      includedScopeRu: included, excludedScopeRu: excluded,
      unresolvedApplicableResourceRowIds: resourceDefinitions.filter(row => row.source_metadata.sourceRole === 'UNRESOLVED_INSTALLATION_SOURCE').map(row => row.row_id) },
    applicability: { exactModel: sourcePack.model, preliminaryProductCompositionOnly: true,
      roofPitchRangeDeg: [0, 15], actualOpeningEachSideMm: [1000, 1010],
      projectApplicabilityNotConfirmedByProductSelection: true, fullTechnicalAcceptance: false, acceptedNewTypes: 0 },
    binding: { rowId: 'roof-cfp100100:base', applicability: { preliminaryProductCompositionOnly: true, exactModel: sourcePack.model } },
    locator: { key: 'velux-cfp100100-limited-s2748', payload: { sources: sourcePack.sources,
      productFacts: sourcePack.productFacts, unresolvedRequirements: sourcePack.unresolvedApplicationParameters,
      previousWithdrawnDefinitionId: 'a85126d7-1ee1-5371-a37a-299438512029', priorWithdrawalsPreserved: true } },
    search: { primaryUom: 'item', canonicalNameRu: title,
      aliases: ['кровельные фонари CFP 100100', 'VELUX CFP Q 73FQV 100100 ISD 0010', 'зенитные фонари'],
      shortScopeRu: 'Основание и купол отдельно. Известный состав изделий и баланс наличия/запаса. Монтаж, примыкания, доставка и завершение требуют источников; полная смета ещё не готова.',
      keyDistinguishingParameters: ['lantern_model'],
      clarificationFields: ['lantern_count', 'lantern_model', 'base_stock_units', 'base_reserve_units', 'dome_stock_units', 'dome_reserve_units'],
      includedBoundaries: included, excludedBoundaries: excluded,
      extraSearchTermsRu: 'кровельный зенитный фонарь купол основание Велюкс CFP ISD 100100',
      sourceProvenance: { sourcePack: 'roof-lantern-cfp100100-limited-s27-48.json', primaryMeasureParameterId: 'lantern_count',
        limitedProductComposition: true, fullTechnicalAcceptance: false, withdrawnDefinitionsUnchanged: true } },
    forbiddenAdjacentMatchers: [/highRiseGlazing/u, /glazing_area_m2/u, /floors/u],
    owner: 'S2748_ROOF_LANTERN_SINGLE_WRITER', receiptFileStem: 'roof_lantern_limited',
    verifyCore: async () => {
      for (const source of sourcePack.sources) assert.equal(createHash('sha256').update(readFileSync(source.localArtifact)).digest('hex'), source.artifactSha256);
      const minimal = await compileCandidate({ lantern_count: 10 });
      assert.equal(minimal.rows.length, 0);
      const selected = await compileCandidate({ lantern_count: 10, lantern_model: sourcePack.model });
      for (const suffix of ['base', 'dome']) {
        const need = selected.preliminaryNeeds.find(row => row.row_id === `roof-cfp100100:${suffix}`)!;
        assert.equal(need.quantity, null);
        assert.equal((need.calculation_trace as { purchaseRequirementV1: { consumed: string } }).purchaseRequirementV1.consumed, '10');
      }
      const result = await compileCandidate(acceptanceInput);
      assert.equal(result.rows.length, 8); assert.equal(result.preliminaryNeeds.length, 13);
      for (const suffix of ['base', 'dome']) assert.equal(result.rows.find(row => row.row_id === `roof-cfp100100:${suffix}`)?.quantity, '10');
      assert(parameterDefinitions.every(parameter => parameter.default_value === null));
      await assert.rejects(() => compileCandidate({ ...acceptanceInput, installation_hours_per_unit: 0 }), /unresolved application norm cannot be supplied/);
      await assert.rejects(() => compileCandidate({ ...acceptanceInput, installation_hours_per_unit: 1 }), /unresolved application norm cannot be supplied/);
      const unresolvedRows = resourceDefinitions.filter(row => row.source_metadata.sourceRole === 'UNRESOLVED_INSTALLATION_SOURCE').map(row => row.row_id);
      assert.deepEqual(result.preliminaryNeeds.map(row => row.row_id).sort(), unresolvedRows.slice().sort());
      assert(canonicalPublisherQuantityScopeIsConsistent({ passport: {
        decision: buildMasterScopeReadiness(unresolvedRows, resourceDefinitions),
        capability_matrix: buildMasterCapabilityMatrix(unresolvedRows, resourceDefinitions),
      }, parameters: parameterDefinitions, formulas: formulaDefinitions, resources: resourceDefinitions, baseline: { input_values: acceptanceInput } }));
      return { status: 'GREEN_LIMITED_PRODUCT_COMPOSITION_ONLY', knownRows: 8, unresolvedRequirements: 13,
        knownProductNeedWithoutInventory: 10, stockReserveDefaults: false, sourceArtifactsVerified: 4,
        fullTechnicalAcceptance: false, ordinaryUiAccepted: false, acceptedNewTypes: 0 };
    },
  };
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/prepareS2748RoofLanternLimited.ts')) {
  const current = JSON.parse(readFileSync(resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'), 'utf8'));
  void runMasterSingleDefinitionSuccessorR1(roofLanternLimitedS2748Config({ releaseId: current.definitionReleaseId,
    searchReleaseId: current.searchReleaseId })).catch(error => { process.stderr.write(String(error.stack ?? error) + '\n'); process.exitCode = 1; });
}
