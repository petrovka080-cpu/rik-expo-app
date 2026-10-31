import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { internationalBeamPackR5 as pack,
  internationalBeamGeometryR5 as g, internationalBeamRowR5 as r, INTERNATIONAL_BEAM_PREFIX_R5 } from '../../../src/lib/estimate/v4/monolithicInternationalBeamR5';
import { appendMonolithicInternationalBeamR5 } from '../../../src/lib/estimate/v4/monolithicInternationalBeamCompositionR5';
import type { AutomaticOwnerDefinition } from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import { compileCanonicalEstimateCore } from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import { estimateDeterministicHash as hash } from '../../../src/lib/estimate/estimateDeterministicHash';
import { canonicalDefinitionPublicationStableValueR1 as stable } from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';
import type { CanonicalSourceProfileSelectionV1 } from '../../../src/lib/estimate/backendPlatform/canonicalSourceProfileSelectionV1';
import type { PrimaryMeasureSelectionV1 } from '../../../src/lib/estimate/backendPlatform/canonicalPrimaryMeasureSelectionV1';
import { masterRetainedParentCaptureSha256R1, type MasterRetainedParentCaptureR1,
  type MasterExplicitParameterSourcesR1 } from './masterSingleDefinitionRetainParentBindingsR1';
import { validateIndependentCompletenessMapReferences, type MasterSingleDefinitionSuccessorConfig as Config } from './prepareMasterSingleDefinitionSuccessorR1';
import type { PurchaseGroupRepresentative as Rep } from './s2732PurchaseGroupOverlay';

const capturePath = 'data/estimate-benchmarks/fixtures/monolithic-international-beam-current-parent-r5.json';
const captureSha = '89162b4f15c90d4818f9163ab4d6166f36df88b2350b90f8c2957f046a9ee06c';
const packPath = 'data/estimate-benchmarks/source-packs/monolithic-international-beam-gesn2020-r5.json';
const fileSha = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const stableSha = (value: unknown) => createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const masterPath = 'C:/Users/User/Downloads/GOX_BUILD_MASTER_TZ_2_14_2026-10-23.txt';
const masterSha = 'e24f52197dab5a1bb4bbca8d139b5b6a5c722efce6c758b3efffd6266f1d78ed';
type CurrentCapture = Readonly<{ capture: MasterRetainedParentCaptureR1; contentPassport: Rep['passport'] }>;
type Context = Readonly<{ releaseId: string; searchReleaseId: string; outputRoot: string }>;

/** Content only. The exact UTC/raw-twice current capture is pinned before
 * entering the existing retained publisher. Importing this file writes nothing. */
export function monolithicInternationalBeamConfigR5(context: Context): Config {
  assert.equal(fileSha(capturePath), captureSha); assert.equal(fileSha(pack.source.artifactPath), pack.source.sha256);
  const record: CurrentCapture = JSON.parse(readFileSync(capturePath, 'utf8'));
  const c = record.capture, passport = record.contentPassport;
  assert.equal(c.definition.id, '39eb68aa-3bea-5052-be05-797f60b93577');
  assert.equal(c.definition.definition_sha256, '928b3a66d7d3bf837eee5c86b6bc90630fd3d361545d67a3bf03cb6b8caca88b');
  assert.equal(c.definition.definition_version, 3); assert.equal(c.definition.catalog_id, pack.catalogId);
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
    runtimeInput: {}, runtimeClassification: {}, runtimeSourceIds: {},
    ordinaryParameterIds: c.definition.applicability.sourceProfileSelectionV1.geometryParameterIds,
  };
  // These are already validated immutable current publisher contracts; the
  // shared resolver and normal retained guard validate their successor too.
  const profiles: CanonicalSourceProfileSelectionV1 = c.definition.applicability.sourceProfileSelectionV1;
  const primary: PrimaryMeasureSelectionV1 = c.definition.applicability.primaryMeasureSelectionV1;
  const next = appendMonolithicInternationalBeamR5({ catalogId: pack.catalogId, parent,
    sourceProfiles: profiles, primarySelection: primary,
    approval: { contract: 'root-current-beam-whole-international-profile/r5', expectedParentFingerprint: hash(parent) } });
  const oldIds = new Set(c.parameters.map(d => d.parameter_id));
  const addedParameters = next.definition.parameters.filter(d => !oldIds.has(d.parameter_id));
  const parameterSources: MasterExplicitParameterSourcesR1 = Object.fromEntries(addedParameters.map(d => {
    const spec: MasterExplicitParameterSourcesR1[string] = d.truth_metadata.value_source_role === 'UNRESOLVED_APPLICATION_NORM'
      ? { kind: 'UNRESOLVED', sourceIds: [] }
      : { kind: d.truth_metadata.value_source_role === 'COMPILER_DERIVED_RESOURCE_QUANTITY' ? 'DERIVED' : 'KNOWN', sourceIds: [pack.sourceId] };
    return [d.parameter_id, spec];
  }));
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
  // Independent expectations come from the whole visually reviewed column,
  // including all19 roles and9 unresolved whole needs, never from built rows.
  for (const source of pack.rows) {
    const key = source.category === 'equipment' ? source.key + '-consumed' : source.key;
    map.entries.push({ expectedResourceId: r(key), operationId: r('operation:' + source.operation),
      requiredOperationIds: [r('operation:' + source.operation)], category: source.category, unitId: source.unitId,
      specification: source.titleRu, condition: 'Exact source programme06-19-003-01 and actual positive beam geometry',
      sourceId: pack.sourceId, quantityRule: source.quantityRole, formulaId: r('formula:' + key),
      resolution: { kind: 'ROW', rowId: r(key) } });
  }
  for (const need of pack.needs) map.entries.push({ expectedResourceId: r('need:' + need.key), operationId: r('operation:' + need.operation),
    requiredOperationIds: [r('operation:' + need.operation)], category: 'service', unitId: '', specification: need.titleRu,
    condition: 'Independent whole provision remains unresolved for the new source programme', sourceId: pack.sourceId,
    quantityRule: need.missingRu, formulaId: r('formula:need:' + need.key), resolution: { kind: 'ROW', rowId: r('need:' + need.key) } });
  map.evidenceReferences = [...new Set([...(map.evidenceReferences ?? []), capturePath, packPath, pack.source.artifactPath])];
  map.fullTechnicalAcceptance = false;
  const newResources = next.definition.resources.filter(d => d.row_id.startsWith(INTERNATIONAL_BEAM_PREFIX_R5 + ':'));
  const boundRows = newResources.filter(d => d.source_metadata?.sourceRole !== 'UNRESOLVED_APPLICATION_NORM').map(d => d.row_id);
  const unresolved = [...new Set([...passport.decision.unresolvedResourceRowIds,
    ...newResources.filter(d => d.source_metadata?.sourceRole === 'UNRESOLVED_APPLICATION_NORM').map(d => d.row_id)])];
  const input = structuredClone(c.baseline.input_values);
  const shortInput = { [g('volume_m3')]: 5, [g('depth_mm')]: 450, [g('support_height_m')]: 3, [g('work_elevation_m')]: 0 };
  const name = 'Монолитная железобетонная балка';
  return { contract: pack.contract, stopCode: 'MONOLITHIC_INTERNATIONAL_BEAM_R5', applicationName: 'monolithic-international-beam-r5',
    expectedBranch: 'codex/r4-a5-clean-08b18902', masterPath, masterSha256: masterSha,
    parentReleaseId: context.releaseId, parentSearchReleaseId: context.searchReleaseId,
    currentReleasePath: 'data/estimate-benchmarks/r568-local-developer-canonical-release.json', outputRoot: context.outputRoot,
    sourcePaths: [capturePath, packPath, pack.source.artifactPath, 'scripts/estimate/r4a13/prepareMonolithicInternationalBeamR5.ts',
      'src/lib/estimate/v4/monolithicInternationalBeamR5.ts', 'src/lib/estimate/v4/monolithicInternationalBeamCompositionR5.ts',
      'src/lib/estimate/v4/automaticConstructionOwnerR1.ts', 'src/lib/estimate/v4/optionalAutomaticOwnerCompositionR1.ts',
      'src/lib/estimate/v4/effectivePurchaseBalanceR1.ts',
      'src/lib/estimate/backendPlatform/canonicalMachineHourPriceCoverageV1.ts',
      'src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1.ts',
      'src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts',
      'src/lib/estimate/backendPlatform/canonicalSourceProfileSelectionV1.ts',
      'src/lib/estimate/backendPlatform/canonicalEstimateProfileInputResolverS2723.ts',
      'src/lib/estimate/backendPlatform/parameterConstraints.ts', 'src/lib/estimate/backendPlatform/formulaGraph.ts',
      'src/lib/estimate/backendPlatform/inclusionGraph.ts',
      'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts',
      'scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts'],
    catalogId: pack.catalogId, sourceId: pack.sourceId, normId: pack.normId,
    sourceMetadata: { source_title: 'Устройство железобетонных балок для перекрытий в инвентарной опалубке',
      source_authority: 'Исходный государственный нормативный документ РФ, редакция2020; копия из зеркального архива',
      source_kind: 'ORIGINAL_RU2020_WHOLE_COLUMN_MIRRORED_DOCUMENT', official_url: pack.source.url,
      artifact_sha256: pack.source.sha256, exact_locator: pack.source.exactLocator,
      use_restriction: 'Самостоятельный цельный расчётный профиль06-19-003-01. Не исправляет КРЕР06-01-109-01; юридическую применимость, проект, ППР, арматуру и полный комплект физического обеспечения не подтверждает.' },
    parameterDefinitions: next.definition.parameters, formulaDefinitions: next.definition.formulas, resourceDefinitions: next.definition.resources,
    shortInput, acceptanceInput: input, runtimeProfileInput: input,
    runtimeProfileClassification: Object.fromEntries(Object.keys(input).map(id => [id, c.baseline.input_classification[id]])),
    runtimeProfileSourceIds: Object.fromEntries(Object.keys(input).map(id => [id, structuredClone(c.baseline.normative_source_ids[id])])),
    expectedParentShape: [527, 385, 387], benchmarkOrdinal: 0, validationScenario: 'EXISTING_BEAM_CARD_DISTINCT_COMPLETE_RU2020_COLUMN',
    passport: { canonicalRuName: name, workKey: pack.catalogId.split(':').at(-1)!, physicalResultRu: passport.physical_result_ru,
      includedScopeRu: [...passport.included_scope_ru, 'Самостоятельный целый исходный профиль балки до500мм с подачей бетона в бадьях по ГЭСН06-2020.'],
      excludedScopeRu: [...passport.excluded_scope_ru, 'Выбор расчётного профиля не подтверждает проект, ППР, физическое оснащение или действующую юридическую применимость источника.'],
      independentCompletenessMap: map, unresolvedApplicableResourceRowIds: unresolved },
    applicability: { ...structuredClone(c.definition.applicability), sourceProfileSelectionV1: next.sourceProfiles,
      primaryMeasureSelectionV1: next.primarySelection, internationalBeamReferenceR5: { sourceJurisdiction: 'RU', edition: pack.source.edition,
        exactColumn: pack.normId, sourceSha256: pack.source.sha256, existingKgProfilesPreserved: true, fullTechnicalAcceptance: false, currentLegalComplianceClaim: false } },
    binding: { rowId: boundRows[0]!, additionalRowIds: boundRows.slice(1),
      applicability: { contract: pack.contract, exactColumn: pack.normId, wholeColumn: true, projectFactsRemainRequired: true,
        initialPhysicalSupplyAdmitted: false, historicalQuantityOrPriceCarryAllowed: false }, retainParentBindings: retained },
    locator: { key: 'whole-beam-061900301-ru2020-r5', payload: { sourceArtifact: pack.source,
      completeColumn: pack.rows, blankCells: pack.blankCells, wholeOperations: pack.operations, independentNeeds: pack.needs,
      wholeIndependentCompletenessMap: map, newFull: 0 } },
    search: { primaryUom: 'm3', canonicalNameRu: name, aliases: [name], shortScopeRu: 'Монолитная балка с сохранёнными исходными профилями и отдельной нормой для высоты до500мм.',
      keyDistinguishingParameters: [], clarificationFields: [], includedBoundaries: passport.included_scope_ru,
      excludedBoundaries: passport.excluded_scope_ru, extraSearchTermsRu: 'бетон монолит балка ригель',
      sourceProvenance: { currentParentId: c.definition.id, sourceEdition: pack.source.edition, exactColumn: pack.normId, wholeFamilyFull: false } },
    forbiddenAdjacentMatchers: [], owner: 'ROOT_SINGLE_INTEGRATOR_CONCRETE', receiptFileStem: 'monolithic_international_beam_r5',
    verifyCore: async () => {
      assert.equal(fileSha(capturePath), captureSha); assert.equal(fileSha(masterPath), masterSha); assert.equal(fileSha(pack.source.artifactPath), pack.source.sha256);
      assert.equal(newResources.length, 49); assert.equal(boundRows.length, 39);
      assert.deepEqual(validateIndependentCompletenessMapReferences({ completenessMap: map,
        formulaDefinitions: next.definition.formulas, resourceDefinitions: next.definition.resources }), []);
      const result = await compileCanonicalEstimateCore({ operation: 'recalculate', compilerVersion: pack.contract,
        catalogId: pack.catalogId, primaryMeasureParameterId: g('volume_m3'), parameterDefinitions: [...next.definition.parameters],
        formulaDefinitions: [...next.definition.formulas], resourceDefinitions: [...next.definition.resources], submittedParameters: shortInput,
        confirmedParameters: {}, sourceProfileSelectionV1: { metadata: next.sourceProfiles, effectiveUserParameters: shortInput },
        currencyCode: 'USD', priceItems: [], maximumResourceRows: next.definition.resources.length, hashJson: hash });
      const all = [...result.rows, ...result.preliminaryNeeds]; assert.equal(all.find(d => d.row_id === r('workers'))?.quantity, '81.35');
      assert.equal(all.find(d => d.row_id === r('rebar'))?.quantity, null);
      assert(pack.needs.every(n => result.preliminaryNeeds.some(d => d.row_id === r('need:' + n.key))));
      assert.equal(all.filter(d => d.included_in_procurement).length, 0);
      return { status: 'NORMAL_CONFIG_NEW_WHOLE_BEAM_REFERENCE_CORE_VERIFIED', currentParentId: c.definition.id,
        addedSourceRows: newResources.length, newSourceBindings: boundRows.length, ordinaryGeometryFields: 4, unresolvedWholeNeeds: 9, newFull: 0 };
    },
  };
}
