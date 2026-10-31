import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { internationalStairFlightsPackR54 as pack, flightParameterR54 as p, flightRowR54 as r,
  flightPrefixR54, FLIGHT_COLUMNS_R54 } from '../../../src/lib/estimate/v4/monolithicInternationalStairFlightsR54';
import { appendMonolithicInternationalStairFlightsR54, FLIGHT_SELECTOR_R54 } from '../../../src/lib/estimate/v4/monolithicInternationalStairFlightsCompositionR54';
import type { AutomaticOwnerDefinition } from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import { compileCanonicalEstimateCore } from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import { estimateDeterministicHash as hash } from '../../../src/lib/estimate/estimateDeterministicHash';
import { canonicalDefinitionPublicationStableValueR1 as stable } from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';
import type { PrimaryMeasureSelectionV1 } from '../../../src/lib/estimate/backendPlatform/canonicalPrimaryMeasureSelectionV1';
import { masterRetainedParentCaptureSha256R1, type MasterRetainedParentCaptureR1, type MasterExplicitParameterSourcesR1 } from './masterSingleDefinitionRetainParentBindingsR1';
import { validateIndependentCompletenessMapReferences, type MasterSingleDefinitionSuccessorConfig as Config } from './prepareMasterSingleDefinitionSuccessorR1';
import type { PurchaseGroupRepresentative as Rep } from './s2732PurchaseGroupOverlay';

export const flightCapturePathR54 = 'data/estimate-benchmarks/fixtures/monolithic-international-stair-flights-current-parent-r54.json';
const captureSha = '464ec6f12d1be9758c86f9c089ca15ac3fd259c5cad671bfb65f47bfa713bc2e';
const packPath = 'data/estimate-benchmarks/source-packs/monolithic-international-stair-flights-gesn2020-r54.json';
const sourceRoot = resolve(__dirname, '../../..');
const fileSha = (path: string) => createHash('sha256').update(readFileSync(resolve(sourceRoot, path))).digest('hex');
const stableSha = (value: unknown) => createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const masterPath = 'C:/Users/User/Downloads/GOX_BUILD_MASTER_TZ_2_14_2026-10-23.txt';
const masterSha = 'e24f52197dab5a1bb4bbca8d139b5b6a5c722efce6c758b3efffd6266f1d78ed';
type CurrentCapture = Readonly<{ capture: MasterRetainedParentCaptureR1; contentPassport: Rep['passport'] }>;
type Context = Readonly<{ releaseId: string; searchReleaseId: string; outputRoot: string }>;

export function currentFlightParentR54(): Readonly<{ record: CurrentCapture; parent: AutomaticOwnerDefinition; primarySelection: PrimaryMeasureSelectionV1 }> {
  assert.equal(fileSha(flightCapturePathR54), captureSha);
  const record: CurrentCapture = JSON.parse(readFileSync(resolve(sourceRoot, flightCapturePathR54), 'utf8'));
  const c = record.capture;
  assert.equal(c.definition.id, '2c200102-ab1c-5947-914f-ffc920cc707b');
  assert.equal(c.definition.definition_sha256, '6104f97fe68f4f6c6742983d4415dbb542b637e8f80f9dddb7189671edebaec1');
  assert.equal(c.definition.definition_version, 16); assert.equal(c.definition.catalog_id, pack.catalogId);
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
    runtimeInput: {}, runtimeClassification: {}, runtimeSourceIds: {}, ordinaryParameterIds: [FLIGHT_SELECTOR_R54],
  };
  return { record, parent, primarySelection: c.definition.applicability.primaryMeasureSelectionV1 };
}

/** Data configuration for the existing retained publisher; importing it never
 * writes DB or registers a new public work. Previous inputs/sources stay exact. */
export function monolithicInternationalStairFlightsConfigR54(context: Context): Config {
  assert.equal(fileSha(pack.source.path), pack.source.sha256);
  const { record, parent, primarySelection } = currentFlightParentR54();
  const c = record.capture, passport = record.contentPassport;
  const next = appendMonolithicInternationalStairFlightsR54({ catalogId: pack.catalogId, parent, primarySelection,
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
  for (const column of FLIGHT_COLUMNS_R54) {
    const sourceColumn = pack.columns.find(c => c.normId === column)!;
    for (const source of sourceColumn.rows) {
      const key = source.category === 'labor' || ['PROJECT_MASS_REFERENCE_ONLY', 'PROJECT_AMORTIZATION'].includes(source.quantityRole)
        ? source.key : source.key + '-consumed';
      map.entries.push({ expectedResourceId: r(column, key), operationId: r(column, 'operation:whole-cycle'),
        requiredOperationIds: [r(column, 'operation:whole-cycle')], category: source.category, unitId: source.unitId,
        specification: source.titleRu, condition: sourceColumn.choiceRu + '; positive measured volume and work elevation0..15m',
        sourceId: pack.sourceId, quantityRule: source.quantityRole, formulaId: r(column, 'formula:' + key),
        resolution: { kind: 'ROW', rowId: r(column, key) } });
    }
    for (const need of pack.needs) map.entries.push({ expectedResourceId: r(column, 'need:' + need.key),
      operationId: r(column, 'operation:whole-cycle'), requiredOperationIds: [r(column, 'operation:whole-cycle')],
      category: 'service', unitId: '', specification: need.titleRu, condition: 'Whole provision requires actual compatible project facts',
      sourceId: pack.sourceId, quantityRule: need.missingRu, formulaId: r(column, 'formula:need:' + need.key),
      resolution: { kind: 'ROW', rowId: r(column, 'need:' + need.key) } });
  }
  map.evidenceReferences = [...new Set([...(map.evidenceReferences ?? []), flightCapturePathR54, packPath, pack.source.path])];
  map.fullTechnicalAcceptance = false;
  const newResources = next.definition.resources.filter(d => FLIGHT_COLUMNS_R54.some(column => d.row_id.startsWith(flightPrefixR54(column) + ':')));
  const boundRows = newResources.filter(d => d.source_metadata?.sourceRole !== 'UNRESOLVED_APPLICATION_NORM').map(d => d.row_id);
  const unresolved = [...new Set([...passport.decision.unresolvedResourceRowIds,
    ...newResources.filter(d => d.source_metadata?.sourceRole === 'UNRESOLVED_APPLICATION_NORM').map(d => d.row_id)])];
  const input = structuredClone(c.baseline.input_values);
  const firstColumn = FLIGHT_COLUMNS_R54[0];
  const shortInput = { [FLIGHT_SELECTOR_R54]: pack.columns[0]!.choiceRu,
    [p(firstColumn, 'volume_m3')]: '2', [p(firstColumn, 'work_elevation_m')]: '3' };
  // Exact captured text is an integration preimage, not a new scope assumption.
  assert.equal(passport.physical_result_ru,
    'Только прямоугольный монолитный лестничный марш в исходной индустриальной опалубке. Не площадка, не криволинейный марш, не иной метод уплотнения. Обычная отметка работ до15м, без дополнительных коэффициентов.');
  assert.equal(passport.included_scope_ru.length, 10); assert.equal(passport.excluded_scope_ru.length, 17);
  assert.deepEqual(passport.excluded_scope_ru.slice(12, 15), [
    'Новый источник не допущен: Прямолинейная горизонтальная балка высотой до500мм при опорах до6м',
    'Новый источник не допущен: reinforced-foundation-001-16', 'Новый источник не допущен: stair-landings',
  ]);
  const includedScope = passport.included_scope_ru.map((scope: string, index: number) =>
    (index < 7 ? 'Только прежний исходный прямой марш: ' : index === 7 ? 'Только прежний исходный криволинейный марш: '
      : index === 8 ? 'Только ранее принятые профили и их собственные подтверждённые комплекты: ' : 'Только профиль прямоугольной площадки: ') + scope);
  includedScope.push(...pack.columns.map(column => column.choiceRu + ': целый исходный цикл из пяти операций, собственные нормы труда и ресурсов.'));
  const excludedScope = passport.excluded_scope_ru.filter((_scope: string, index: number) => index < 12 || index > 14)
    .map((scope: string) => 'Неподтверждённая часть обеспечения в пределах выбранного профиля: ' + scope);
  excludedScope.push('Прямой марш, криволинейный марш и площадка имеют отдельные нормы и совместимые комплекты. Выбор названия не подтверждает проект, ППР, армирование, цены или закупку.');
  const physicalResult = 'Монолитная бетонная лестница: прямой или криволинейный марш либо прямоугольная площадка по явно выбранной технологии. Нормы и физическое обеспечение относятся только к выбранному профилю. Базовая отметка работ0–15м; дополнительные условия требуют отдельного расчёта.';
  const name = 'Монолитная бетонная лестница';
  return { contract: pack.contract, stopCode: 'MONOLITHIC_INTERNATIONAL_STAIR_FLIGHTS_R54', applicationName: 'monolithic-international-stair-flights-r54',
    expectedBranch: 'codex/r4-a5-clean-08b18902', masterPath, masterSha256: masterSha,
    parentReleaseId: context.releaseId, parentSearchReleaseId: context.searchReleaseId,
    currentReleasePath: 'data/estimate-benchmarks/r568-local-developer-canonical-release.json', outputRoot: context.outputRoot,
    sourcePaths: [flightCapturePathR54, packPath, pack.source.path,
      'scripts/estimate/r4a13/prepareMonolithicInternationalStairFlightsR54.ts',
      'src/lib/estimate/v4/monolithicInternationalStairFlightsR54.ts',
      'src/lib/estimate/v4/monolithicInternationalStairFlightsCompositionR54.ts',
      'src/lib/estimate/v4/automaticConstructionOwnerR1.ts', 'src/lib/estimate/v4/optionalAutomaticOwnerCompositionR1.ts',
      'src/lib/estimate/v4/effectivePurchaseBalanceR1.ts', 'src/lib/estimate/backendPlatform/canonicalMachineHourPriceCoverageV1.ts',
      'src/lib/estimate/backendPlatform/canonicalPrimaryMeasureSelectionV1.ts',
      'src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1.ts',
      'src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts', 'src/lib/estimate/backendPlatform/parameterConstraints.ts',
      'src/lib/estimate/backendPlatform/formulaGraph.ts', 'src/lib/estimate/backendPlatform/inclusionGraph.ts',
      'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts', 'scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts'],
    catalogId: pack.catalogId, sourceId: pack.sourceId, normId: '06-19-005-01/02',
    sourceMetadata: { source_title: 'Монолитные лестничные марши в инвентарной опалубке, подача бетона в бадьях',
      source_authority: 'Исходный государственный нормативный документ РФ, редакция 2020; сохранённая копия',
      source_kind: 'ORIGINAL_RU2020_WHOLE_COLUMN_MIRRORED_DOCUMENT', artifact_sha256: pack.source.sha256,
      exact_locator: 'PDF72/73 exact whole06-19-005-01/02; general1.6.1/2/4/6/17/39/40/41/42/43/44/45',
      use_restriction: 'Две отдельные целые нормы06-19-005-01/02. Проект, ППР, арматура и физические комплекты требуют независимого подтверждения; действующая юридическая применимость не заявлена.' },
    parameterDefinitions: next.definition.parameters, formulaDefinitions: next.definition.formulas, resourceDefinitions: next.definition.resources,
    shortInput, acceptanceInput: input, runtimeProfileInput: input,
    runtimeProfileClassification: Object.fromEntries(Object.keys(input).map(id => [id, c.baseline.input_classification[id]])),
    runtimeProfileSourceIds: Object.fromEntries(Object.keys(input).map(id => [id, structuredClone(c.baseline.normative_source_ids[id])])),
    expectedParentShape: [855, 519, 521], benchmarkOrdinal: 0, validationScenario: 'EXISTING_STAIRS_CARD_TWO_DISTINCT_WHOLE_FLIGHT_COLUMNS',
    passport: { canonicalRuName: name, workKey: pack.catalogId.split(':').at(-1)!, physicalResultRu: physicalResult,
      includedScopeRu: includedScope, excludedScopeRu: excludedScope,
      independentCompletenessMap: map, unresolvedApplicableResourceRowIds: unresolved },
    applicability: { ...structuredClone(c.definition.applicability), primaryMeasureSelectionV1: next.primarySelection,
      internationalFlightReferenceR54: { exactColumn: '06-19-005-01/02', sourceSha256: pack.source.sha256,
        twoMeasuredFieldsAndExplicitPhysicalChoice: true, allPreviousProfilesPreserved: true, fullTechnicalAcceptance: false } },
    binding: { rowId: boundRows[0]!, additionalRowIds: boundRows.slice(1),
      applicability: { contract: pack.contract, exactColumn: '06-19-005-01/02', wholeColumn: true,
        projectFactsRemainRequired: true, initialPhysicalSupplyAdmitted: false, historicalQuantityOrPriceCarryAllowed: false }, retainParentBindings: retained },
    locator: { key: 'whole-stair-flights-06190050102-ru2020-r54', payload: { sourceArtifact: pack.source,
      completeColumns: pack.columns, wholeOperations: pack.operations, independentNeeds: pack.needs, wholeIndependentCompletenessMap: map, newFull: 0 } },
    search: { primaryUom: 'm3', canonicalNameRu: name, aliases: [name],
      shortScopeRu: 'Монолитная лестница: прямой или криволинейный марш либо прямоугольная площадка по выбранной технологии.',
      keyDistinguishingParameters: [], clarificationFields: [], includedBoundaries: includedScope,
      excludedBoundaries: excludedScope, extraSearchTermsRu: 'бетон монолит лестница марш площадка',
      sourceProvenance: { currentParentId: c.definition.id, exactColumn: '06-19-005-01/02', wholeFamilyFull: false } },
    forbiddenAdjacentMatchers: [], owner: 'ROOT_SINGLE_INTEGRATOR_CONCRETE', receiptFileStem: 'monolithic_international_stair_flights_r54',
    verifyCore: async () => {
      assert.equal(fileSha(flightCapturePathR54), captureSha); assert.equal(fileSha(masterPath), masterSha);
      assert.equal(newResources.length, 108); assert.equal(boundRows.length, 88);
      assert.deepEqual(validateIndependentCompletenessMapReferences({ completenessMap: map,
        formulaDefinitions: next.definition.formulas, resourceDefinitions: next.definition.resources }), []);
      const receipts = [];
      for (const column of FLIGHT_COLUMNS_R54) {
        const result = await compileCanonicalEstimateCore({ operation: 'recalculate', compilerVersion: pack.contract,
          catalogId: pack.catalogId, primaryMeasureParameterId: p(column, 'volume_m3'),
          parameterDefinitions: [...next.definition.parameters], formulaDefinitions: [...next.definition.formulas],
          resourceDefinitions: [...next.definition.resources], submittedParameters: {
            [FLIGHT_SELECTOR_R54]: pack.columns.find(c => c.normId === column)!.choiceRu,
            [p(column, 'volume_m3')]: '2', [p(column, 'work_elevation_m')]: '3',
          }, confirmedParameters: {}, currencyCode: 'USD', priceItems: [],
          maximumResourceRows: next.definition.resources.length, hashJson: hash });
        const all = [...result.rows, ...result.preliminaryNeeds];
        assert.equal(all.find(d => d.row_id === r(column, 'net-volume'))?.quantity, '2');
        assert.equal(all.find(d => d.row_id === r(column, 'heavy-concrete-consumed'))?.quantity, '2.03');
        assert.equal(all.find(d => d.row_id === r(column, 'workers'))?.quantity, column === '06-19-005-01' ? '48.252' : '62.7276');
        assert.equal(all.find(d => d.row_id === r(column, 'bakelized-plywood-consumed'))?.quantity, column === '06-19-005-01' ? '0.584' : '1.752');
        assert(all.every(d => d.row_id.startsWith(flightPrefixR54(column) + ':')), 'NO_FOREIGN_RETAINED_OR_OTHER_FLIGHT_CYCLE');
        assert(pack.needs.every(n => result.preliminaryNeeds.some(d => d.row_id === r(column, 'need:' + n.key))));
        assert.equal(all.find(d => d.row_id === r(column, 'reinforcing-steel'))?.quantity, null);
        assert.equal(all.filter(d => d.included_in_procurement).length, 0);
        receipts.push({ column, knownRows: result.rows.length, preliminaryNeeds: result.preliminaryNeeds.length });
      }
      return { status: 'NORMAL_CONFIG_EXISTING_STAIRS_TWO_WHOLE_FLIGHTS_CORE_VERIFIED', addedSourceRows: 108,
        addedSourceBindings: 88, ordinaryFields: 3, coreCalls: 2, receipts,
        unresolvedWholeNeedsPerProfile: 9, passportScopeQualified: true, newPublicCards: 0, newFull: 0 };

    },
  };
}
