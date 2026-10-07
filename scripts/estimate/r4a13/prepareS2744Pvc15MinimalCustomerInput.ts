import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { strict as assert } from 'node:assert';
import pack from '../../../data/estimate-benchmarks/source-packs/pvc15-minimal-customer-input-s27-44.json';
import { pvc15FieldTransitionPublishConfigS2743 } from './prepareS2743Pvc15FieldTransitionSuccessor';
import { runMasterSingleDefinitionSuccessorR1, type MasterSingleDefinitionSuccessorConfig } from './prepareMasterSingleDefinitionSuccessorR1';
import { PVC15_MINIMAL_INPUT_DEFINITION_S2744 as definition, PVC15_CUSTOMER_FACT_IDS_S2744, PVC15_MINIMAL_SOURCE_S2744 } from '../../../src/lib/estimate/v4/pvcRoofMinimalCustomerInputS2744';
import { compileAutomaticConstructionOwnerR1 } from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import { pvc15AreaVariantControlInputS2743 } from '../../../tests/fixtures/pvc15AreaVariantBindingsS2743';

const packPath = 'data/estimate-benchmarks/source-packs/pvc15-minimal-customer-input-s27-44.json';
export function pvc15MinimalCustomerInputPublishConfigS2744(parent: { definition: string; search: string }, variant: string): MasterSingleDefinitionSuccessorConfig {
  const member = pack.members.find(value => value.variant === variant);
  assert(member, 'EXISTING_PVC15_MEMBER_REQUIRED');
  const prior = pvc15FieldTransitionPublishConfigS2743(parent);
  const knownIds = new Set(definition.parameters.map(parameter => parameter.parameter_id));
  const acceptanceInput = Object.fromEntries(Object.entries(pvc15AreaVariantControlInputS2743(variant === 'large_area' ? 'large_area' : 'small_area')).filter(([id]) => knownIds.has(id)));
  const sourcePackHash = createHash('sha256').update(readFileSync(packPath)).digest('hex');
  const contract = `${pack.contract}:${variant}`;
  return { ...prior, contract, stopCode: 'S2744_PVC15_MINIMAL', applicationName: `s2744-pvc15-minimal-${variant}`,
    owner: 'S2744_PVC15_MINIMAL_SINGLE_WRITER', outputRoot: resolve(`.release-runtime/r568/s27-44/pvc15-minimal-${variant}`), receiptFileStem: 'pvc15_minimal',
    masterPath: 'C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (84).md',
    masterSha256: '8f6c334bbb79df8227cbfd94b4a8433a39bc8b5ac1e2b7a9ff3a9aefb75473a4',
    catalogId: member.catalogId, sourceId: PVC15_MINIMAL_SOURCE_S2744.sourceId, normId: 'MANUFACTURER_PRELIMINARY_DEMAND_NOT_FINAL_PROJECT_NORM',
    expectedParentShape: [297, 113, 113], parameterDefinitions: definition.parameters, formulaDefinitions: definition.formulas, resourceDefinitions: definition.resources,
    shortInput: { area_m2: acceptanceInput.area_m2 }, acceptanceInput,
    runtimeProfileInput: definition.runtimeInput, runtimeProfileClassification: definition.runtimeClassification, runtimeProfileSourceIds: definition.runtimeSourceIds,
    sourcePaths: [...prior.sourcePaths, packPath, 'src/lib/estimate/v4/pvcRoofMinimalCustomerInputS2744.ts',
      'src/lib/estimate/backendPlatform/canonicalPreliminaryParameterFormulaV1.ts', 'src/lib/estimate/backendPlatform/canonicalPreliminaryParameterFormulaV1.test.ts',
      'scripts/estimate/r4a13/prepareS2744Pvc15MinimalCustomerInput.ts', 'tests/estimateNorms/pvc15MinimalCustomerInputS2744.contract.test.ts',
      'src/features/consumerRepair/consumerCanonicalParameterEditor.ts', 'src/features/consumerRepair/consumerCanonicalReleaseMigration.ts'],
    sourceMetadata: { ...prior.sourceMetadata, source_title: 'ПВХ1,5: минимальный ввод объекта и расчёт предварительной потребности по изготовителю',
      official_url: pack.primarySource.url, artifact_sha256: pack.primarySource.sha256, exact_locator: PVC15_MINIMAL_SOURCE_S2744.locator,
      use_restriction: pack.rulesRu.join(' ') },
    passport: { ...prior.passport, workKey: member.workKey, canonicalRuName: member.titleRu,
      includedScopeRu: [...prior.passport.includedScopeRu, ...pack.rulesRu.slice(0, 4)],
      excludedScopeRu: ['Предварительные коэффициенты как утверждённая раскладка или ветровой расчёт', 'Автоматическое предположение фактического склада, упаковки, энергопотребления, человеко-часов или цены', 'Изменение старых сохранённых смет'] },
    applicability: { ...prior.applicability, minimalCustomerInput: true, customerFactIds: PVC15_CUSTOMER_FACT_IDS_S2744,
      sourceGapIsNotCustomerQuestion: true, preliminarySourceQuantities: true, engineeringAccepted: false, ordinaryUiAccepted: false },
    locator: { key: `pvc15-minimal-${variant}-s27-44`, payload: { kind: 'PRIMARY_SOURCE_PRELIMINARY_AUTOMATIC_INPUT', sourcePackSha256: sourcePackHash,
      primaryDocumentSha256: pack.primarySource.sha256, pdfPage: 102, printedPage: 100, acceptedNewTypeDelta: 0, oldRevisionsNotRewritten: true } },
    search: { ...prior.search, canonicalNameRu: member.titleRu, aliases: [member.titleRu, 'ПВХ мембрана1,5 ' + variant.replace('_', ' ')],
      shortScopeRu: 'Площадь и факты объекта; характеристики и предварительная потребность рассчитываются приложением. Точная поставка и специальные узлы подтверждаются отдельно.',
      keyDistinguishingParameters: ['pvc15_base', 'edge_rail_length_m', 'detail_membrane_mode', 'pvc15_joint_transition_scope'],
      clarificationFields: PVC15_CUSTOMER_FACT_IDS_S2744.filter(id => id !== 'area_m2'),
      sourceProvenance: { ...prior.search.sourceProvenance, sourcePackSha256: sourcePackHash, preliminaryOnly: true, acceptedNewTypeDelta: 0 } },
    verifyCore: async () => {
      assert.equal(pack.primarySource.sha256, PVC15_MINIMAL_SOURCE_S2744.sha256);
      const compile = (submittedParameters: Record<string, unknown>) => compileAutomaticConstructionOwnerR1({ definition,
        catalogId: member.catalogId, primaryMeasureParameterId: 'area_m2', compilerVersion: contract, submittedParameters });
      const short = await compile({ area_m2: acceptanceInput.area_m2 }), complete = await compile(acceptanceInput);
      assert.equal(Number(short.parameters.pvc15_membrane_consumption_m2), Number(acceptanceInput.area_m2) * 1.15);
      assert.equal(Number(short.parameters.telescopic_fastener_quantity_piece), Math.ceil(Number(acceptanceInput.area_m2) * 4));
      assert(short.preliminaryNeeds.length > 0); assert(!short.rows.some(row => row.included_in_procurement));
      assert.equal(complete.preliminaryNeeds.length, 0); assert.equal(complete.rows.length, 26);
      assert.equal(complete.parameters.pvc15_membrane_consumption_m2, acceptanceInput.pvc15_membrane_consumption_m2);
      return { status: 'GREEN_PRIMARY_SOURCE_AUTOMATIC_PRELIMINARY_INPUT_CORE', variant, shortRows: short.rows.length,
        completeRows: 26, customerFactIds: PVC15_CUSTOMER_FACT_IDS_S2744, acceptedNewTypeDelta: 0, ordinaryUiAccepted: false,
        engineeringAccepted: false, sourceGapsRetained: true, fixturesAreNotDefaults: true };
    },
  };
}
async function run() {
  const variant = process.argv.find(arg => arg.startsWith('--variant='))?.slice('--variant='.length);
  if (!variant) throw Error('EXISTING_PVC15_MEMBER_REQUIRED');
  const current = JSON.parse(readFileSync('data/estimate-benchmarks/r568-local-developer-canonical-release.json', 'utf8'));
  await runMasterSingleDefinitionSuccessorR1(pvc15MinimalCustomerInputPublishConfigS2744({ definition: current.definitionReleaseId, search: current.searchReleaseId }, variant));
}
if (require.main === module) run().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
