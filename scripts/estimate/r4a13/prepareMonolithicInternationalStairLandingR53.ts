import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { internationalStairLandingPackR53 as pack, landingParameterR53 as p,
  landingRowR53 as r, LANDING_PREFIX_R53 } from '../../../src/lib/estimate/v4/monolithicInternationalStairLandingR53';
import { appendMonolithicInternationalStairLandingR53, LANDING_SELECTOR_R53, LANDING_CHOICE_R53 } from '../../../src/lib/estimate/v4/monolithicInternationalStairLandingCompositionR53';
import type { AutomaticOwnerDefinition } from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import { compileCanonicalEstimateCore } from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import { estimateDeterministicHash as hash } from '../../../src/lib/estimate/estimateDeterministicHash';
import { canonicalDefinitionPublicationStableValueR1 as stable } from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';
import type { PrimaryMeasureSelectionV1 } from '../../../src/lib/estimate/backendPlatform/canonicalPrimaryMeasureSelectionV1';
import { masterRetainedParentCaptureSha256R1, type MasterRetainedParentCaptureR1, type MasterExplicitParameterSourcesR1 } from './masterSingleDefinitionRetainParentBindingsR1';
import { validateIndependentCompletenessMapReferences, type MasterSingleDefinitionSuccessorConfig as Config } from './prepareMasterSingleDefinitionSuccessorR1';
import type { PurchaseGroupRepresentative as Rep } from './s2732PurchaseGroupOverlay';

export const landingCapturePathR53 = 'data/estimate-benchmarks/fixtures/monolithic-international-stair-landing-current-parent-r53.json';
const captureSha = '5f60c6d99a7df5e64f108d7d5e2ecb614a8a4d46e5a0005b32a9e4d2da41fd5e';
const packPath = 'data/estimate-benchmarks/source-packs/monolithic-international-stair-landing-gesn2020-r53.json';
const sourceRoot = resolve(__dirname, '../../..');
const fileSha = (path: string) => createHash('sha256').update(readFileSync(resolve(sourceRoot, path))).digest('hex');
const stableSha = (value: unknown) => createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const masterPath = 'C:/Users/User/Downloads/GOX_BUILD_MASTER_TZ_2_14_2026-10-23.txt';
const masterSha = 'e24f52197dab5a1bb4bbca8d139b5b6a5c722efce6c758b3efffd6266f1d78ed';
type CurrentCapture = Readonly<{ capture: MasterRetainedParentCaptureR1; contentPassport: Rep['passport'] }>;
type Context = Readonly<{ releaseId: string; searchReleaseId: string; outputRoot: string }>;

export function currentLandingParentR53(): Readonly<{ record: CurrentCapture; parent: AutomaticOwnerDefinition; primarySelection: PrimaryMeasureSelectionV1 }> {
  assert.equal(fileSha(landingCapturePathR53), captureSha);
  const record: CurrentCapture = JSON.parse(readFileSync(resolve(sourceRoot, landingCapturePathR53), 'utf8'));
  const c = record.capture;
  assert.equal(c.definition.id, '2c232923-725c-5487-a773-133dbb1e71f6');
  assert.equal(c.definition.definition_sha256, '7c86f01cbda46ae6e446723f006a7c6630dd7ab122f8be17e1f362dc400383bb');
  assert.equal(c.definition.definition_version, 15); assert.equal(c.definition.catalog_id, pack.catalogId);
  const parent: AutomaticOwnerDefinition = {
    parameters: c.parameters.map(d => ({ ...d, parameter_id: d.parameter_id, ordinal: d.ordinal, unit_id: d.unit_id,
      title_ru: d.title_ru, value_type: d.value_type, required: d.required, default_value: d.default_value,
      constraints_json: d.constraints_json, truth_metadata: d.truth_metadata })),
    formulas: c.formulas.map(d => ({ ...d, formula_id: d.formula_id, expression_source: d.expression_source,
      output_unit_id: d.output_unit_id, ast: d.ast, input_parameter_ids: d.input_parameter_ids, ast_sha256: d.ast_sha256 })),
    resources: c.resources.map(d => ({ ...d, id: d.id, row_id: d.row_id, ordinal: d.ordinal, section: d.section,
      category: d.category, title_ru: d.title_ru, unit_id: d.unit_id, formula_id: d.formula_id, inclusion_ast: d.inclusion_ast,
      resource_graph: d.resource_graph, procurement_eligible: d.procurement_eligible, cost_owner_id: d.cost_owner_id,
      source_metadata: d.source_metadata, row_sha256: d.row_sha256 })),
    runtimeInput: {}, runtimeClassification: {}, runtimeSourceIds: {}, ordinaryParameterIds: [LANDING_SELECTOR_R53],
  };
  return { record, parent, primarySelection: c.definition.applicability.primaryMeasureSelectionV1 };
}

/** Data configuration for the existing retained publisher; importing it never
 * writes DB or registers a new public work. Previous inputs/sources stay exact. */
export function monolithicInternationalStairLandingConfigR53(context: Context): Config {
  assert.equal(fileSha(pack.source.path), pack.source.sha256);
  const { record, parent, primarySelection } = currentLandingParentR53();
  const c = record.capture, passport = record.contentPassport;
  const next = appendMonolithicInternationalStairLandingR53({ catalogId: pack.catalogId, parent, primarySelection,
    expectedParentFingerprint: hash(parent) });
  const oldIds = new Set(c.parameters.map(d => d.parameter_id));
  const parameterSources: MasterExplicitParameterSourcesR1 = Object.fromEntries(next.definition.parameters
    .filter(d => !oldIds.has(d.parameter_id)).map(d => [d.parameter_id, d.truth_metadata.value_source_role === 'UNRESOLVED_APPLICATION_NORM'
      ? { kind: 'UNRESOLVED', sourceIds: [] } : { kind: d.truth_metadata.value_source_role === 'COMPILER_DERIVED_RESOURCE_QUANTITY' ? 'DERIVED' : 'KNOWN', sourceIds: [pack.sourceId] }]));
  const metadata = c.definition.source_metadata;
  const latest = metadata.retainedParentBindingLineageV1?.entries?.at(-1)?.successor
    ?? metadata.retainedParentBindingContinuationV2?.successor ?? metadata.retainedParentBindingContinuationV1?.successor
    ?? metadata.retainedParentBindingSuccessorV1;
  assert(latest, 'EXACT_CURRENT_SOURCE_LINEAGE_REQUIRED');
  const retained = { capturedParent: c, capturedParentSha256: masterRetainedParentCaptureSha256R1(c),
    newParameterSources: parameterSources, capturedSourcePreimage: { sourceKey: pack.sourceId, expected: null },
    successorProvenanceAppendV1: { contract: 'master-retained-binding-append/v1' as const,
      capturedSourceMetadata: structuredClone(metadata), capturedSourceMetadataSha256: stableSha(metadata),
      capturedPreviousSuccessorSha256: stableSha(latest) } };
  const map = structuredClone(passport.decision.independentCompletenessMap);
  for (const source of pack.rows) {
    const key = source.category === 'labor' || ['PROJECT_MASS_REFERENCE_ONLY', 'PROJECT_AMORTIZATION'].includes(source.quantityRole)
      ? source.key : source.key + '-consumed';
    map.entries.push({ expectedResourceId: r(key), operationId: r('operation:whole-cycle'),
      requiredOperationIds: [r('operation:whole-cycle')], category: source.category, unitId: source.unitId,
      specification: source.titleRu, condition: 'Explicit rectangular landing choice with positive compatible geometry',
      sourceId: pack.sourceId, quantityRule: source.quantityRole, formulaId: r('formula:' + key), resolution: { kind: 'ROW', rowId: r(key) } });
  }
  for (const need of pack.needs) map.entries.push({ expectedResourceId: r('need:' + need.key), operationId: r('operation:whole-cycle'),
    requiredOperationIds: [r('operation:whole-cycle')], category: 'service', unitId: '', specification: need.titleRu,
    condition: 'Independent actual whole provision remains unresolved', sourceId: pack.sourceId,
    quantityRule: need.missingRu, formulaId: r('formula:need:' + need.key), resolution: { kind: 'ROW', rowId: r('need:' + need.key) } });
  map.evidenceReferences = [...new Set([...(map.evidenceReferences ?? []), landingCapturePathR53, packPath, pack.source.path])];
  map.fullTechnicalAcceptance = false;
  const newResources = next.definition.resources.filter(d => d.row_id.startsWith(LANDING_PREFIX_R53 + ':'));
  const boundRows = newResources.filter(d => d.source_metadata?.sourceRole !== 'UNRESOLVED_APPLICATION_NORM').map(d => d.row_id);
  const unresolved = [...new Set([...passport.decision.unresolvedResourceRowIds,
    ...newResources.filter(d => d.source_metadata?.sourceRole === 'UNRESOLVED_APPLICATION_NORM').map(d => d.row_id)])];
  const input = structuredClone(c.baseline.input_values);
  const shortInput = { [LANDING_SELECTOR_R53]: LANDING_CHOICE_R53, [p('length_m')]: '2.5', [p('width_m')]: '1.2',
    [p('thickness_mm')]: '200', [p('identical_count')]: 2, [p('work_elevation_m')]: '3' };
  const name = 'Монолитная бетонная лестница';
  return { contract: pack.contract, stopCode: 'MONOLITHIC_INTERNATIONAL_STAIR_LANDING_R53', applicationName: 'monolithic-international-stair-landing-r53',
    expectedBranch: 'codex/r4-a5-clean-08b18902', masterPath, masterSha256: masterSha,
    parentReleaseId: context.releaseId, parentSearchReleaseId: context.searchReleaseId,
    currentReleasePath: 'data/estimate-benchmarks/r568-local-developer-canonical-release.json', outputRoot: context.outputRoot,
    sourcePaths: [landingCapturePathR53, packPath, pack.source.path,
      'scripts/estimate/r4a13/prepareMonolithicInternationalStairLandingR53.ts',
      'src/lib/estimate/v4/monolithicInternationalStairLandingR53.ts',
      'src/lib/estimate/v4/monolithicInternationalStairLandingCompositionR53.ts',
      'src/lib/estimate/v4/automaticConstructionOwnerR1.ts', 'src/lib/estimate/v4/optionalAutomaticOwnerCompositionR1.ts',
      'src/lib/estimate/v4/effectivePurchaseBalanceR1.ts', 'src/lib/estimate/backendPlatform/canonicalMachineHourPriceCoverageV1.ts',
      'src/lib/estimate/backendPlatform/canonicalPrimaryMeasureSelectionV1.ts',
      'src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1.ts',
      'src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts', 'src/lib/estimate/backendPlatform/parameterConstraints.ts',
      'src/lib/estimate/backendPlatform/formulaGraph.ts', 'src/lib/estimate/backendPlatform/inclusionGraph.ts',
      'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts', 'scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts'],
    catalogId: pack.catalogId, sourceId: pack.sourceId, normId: pack.normId,
    sourceMetadata: { source_title: 'Монолитные лестничные площадки в инвентарной мелкощитовой опалубке',
      source_authority: 'Исходный государственный нормативный документ РФ, редакция 2020; сохранённая копия',
      source_kind: 'ORIGINAL_RU2020_WHOLE_COLUMN_MIRRORED_DOCUMENT', artifact_sha256: pack.source.sha256,
      exact_locator: pack.source.exactLocator,
      use_restriction: 'Только целый самостоятельный профиль 06-20-001-01. Проект, ППР, реальное армирование, физический комплект и действующая юридическая применимость ещё не подтверждены.' },
    parameterDefinitions: next.definition.parameters, formulaDefinitions: next.definition.formulas, resourceDefinitions: next.definition.resources,
    shortInput, acceptanceInput: input, runtimeProfileInput: input,
    runtimeProfileClassification: Object.fromEntries(Object.keys(input).map(id => [id, c.baseline.input_classification[id]])),
    runtimeProfileSourceIds: Object.fromEntries(Object.keys(input).map(id => [id, structuredClone(c.baseline.normative_source_ids[id])])),
    expectedParentShape: [804, 470, 472], benchmarkOrdinal: 0, validationScenario: 'EXISTING_STAIRS_CARD_DISTINCT_WHOLE_LANDING_COLUMN',
    passport: { canonicalRuName: name, workKey: pack.catalogId.split(':').at(-1)!, physicalResultRu: passport.physical_result_ru,
      includedScopeRu: [...passport.included_scope_ru, 'Отдельный целый исходный профиль прямоугольной монолитной лестничной площадки.'],
      excludedScopeRu: [...passport.excluded_scope_ru, 'Площадка не подменяет прежние прямые и криволинейные марши; проектная применимость и физическое обеспечение требуют подтверждения.'],
      independentCompletenessMap: map, unresolvedApplicableResourceRowIds: unresolved },
    applicability: { ...structuredClone(c.definition.applicability), primaryMeasureSelectionV1: next.primarySelection,
      internationalLandingReferenceR53: { exactColumn: pack.normId, sourceSha256: pack.source.sha256,
        fiveMeasuredGeometryFields: true, allPreviousProfilesPreserved: true, fullTechnicalAcceptance: false } },
    binding: { rowId: boundRows[0]!, additionalRowIds: boundRows.slice(1),
      applicability: { contract: pack.contract, exactColumn: pack.normId, wholeColumn: true,
        projectFactsRemainRequired: true, initialPhysicalSupplyAdmitted: false, historicalQuantityOrPriceCarryAllowed: false }, retainParentBindings: retained },
    locator: { key: 'whole-stair-landing-062000101-ru2020-r53', payload: { sourceArtifact: pack.source,
      completeColumn: pack.rows, wholeOperations: pack.operations, independentNeeds: pack.needs, wholeIndependentCompletenessMap: map, newFull: 0 } },
    search: { primaryUom: 'm3', canonicalNameRu: name, aliases: [name],
      shortScopeRu: 'Монолитная лестница: прежние варианты маршей и отдельный расчёт прямоугольной площадки.',
      keyDistinguishingParameters: [], clarificationFields: [], includedBoundaries: passport.included_scope_ru,
      excludedBoundaries: passport.excluded_scope_ru, extraSearchTermsRu: 'бетон монолит лестница марш площадка',
      sourceProvenance: { currentParentId: c.definition.id, exactColumn: pack.normId, wholeFamilyFull: false } },
    forbiddenAdjacentMatchers: [], owner: 'ROOT_SINGLE_INTEGRATOR_CONCRETE', receiptFileStem: 'monolithic_international_stair_landing_r53',
    verifyCore: async () => {
      assert.equal(fileSha(landingCapturePathR53), captureSha); assert.equal(fileSha(masterPath), masterSha);
      assert.equal(newResources.length, 49); assert.equal(boundRows.length, 39);
      assert.deepEqual(validateIndependentCompletenessMapReferences({ completenessMap: map,
        formulaDefinitions: next.definition.formulas, resourceDefinitions: next.definition.resources }), []);
      const result = await compileCanonicalEstimateCore({ operation: 'recalculate', compilerVersion: pack.contract,
        catalogId: pack.catalogId, primaryMeasureParameterId: p('volume_m3'), parameterDefinitions: [...next.definition.parameters],
        formulaDefinitions: [...next.definition.formulas], resourceDefinitions: [...next.definition.resources], submittedParameters: shortInput,
        confirmedParameters: {}, currencyCode: 'USD', priceItems: [], maximumResourceRows: next.definition.resources.length, hashJson: hash });
      const all = [...result.rows, ...result.preliminaryNeeds];
      assert.equal(all.find(d => d.row_id === r('net-volume'))?.quantity, '1.2');
      assert.equal(all.find(d => d.row_id === r('heavy-concrete-consumed'))?.quantity, '1.218');
      assert(all.every(d => d.row_id.startsWith(LANDING_PREFIX_R53 + ':')), 'NO_FOREIGN_OLD_CYCLE');
      assert(pack.needs.every(n => result.preliminaryNeeds.some(d => d.row_id === r('need:' + n.key))));
      assert.equal(all.filter(d => d.included_in_procurement).length, 0);
      return { status: 'NORMAL_CONFIG_EXISTING_STAIRS_WHOLE_LANDING_CORE_VERIFIED', addedSourceRows: 49,
        addedSourceBindings: 39, ordinaryFields: 6, unresolvedWholeNeeds: 9, newPublicCards: 0, newFull: 0 };
    },
  };
}
