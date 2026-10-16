import { canonicalPublicResourcePresentationV1 as display, bindCanonicalPublicResourceSavedTitleV1, parseCanonicalPublicResourcePresentationV1,
  canonicalPublicResourcePresentationMatchesV1 } from './canonicalPublicResourcePresentationV1';
import { G6_PVC_COMMERCIAL_LABOR_SERIES_S2741 as series } from '../v4/g6PvcCommercialLaborProfilesS2741';
import { withG6PvcResourcePresentationS2741 } from '../v4/g6PvcResourcePresentationS2741';
import { canonicalEstimateRevisionRowFromStorage } from './canonicalEstimateRevisionReadMapper';
import { projectCanonicalEstimatePreliminaryNeedTransport } from './canonicalEstimatePreliminaryNeedTransport';
import { adaptCanonicalRevisionToStructuredEstimate } from './canonicalEstimateForemanAdapter';
import { ESTIMATE_PLATFORM_API_VERSION, type CanonicalEstimateCatalogItem, type CanonicalEstimateRevisionView } from './contracts';
import { buildStructuredEstimateRequestDraft } from '../../estimateStructuredPipeline/structuredEstimateRequestBinding';
import { consumerRepairRowPublicResourcePresentation, consumerRepairRowMatchesSearch } from '../../../features/consumerRepair/consumerRepairRowMetadata';
import { canonicalArtifactPreliminaryNeeds, canonicalArtifactSpecificationParts, canonicalArtifactVisibleRowTitle, buildCanonicalProcurementProjection } from './canonicalEstimateArtifactContract';
import { buildCanonicalProfessionalPdfProjection } from './canonicalProfessionalPdf';
import type { CanonicalArtifactRow } from './canonicalEstimateArtifactContract';
import { createHash } from 'node:crypto';
import { compileCanonicalEstimateCore } from './canonicalEstimateCompileCore';
import { canonicalEstimateStableJson } from './canonicalEstimateDeterminism';
import { compileMasonryBrickWallBiaTn10R1, MASONRY_BRICK_WALL_BIA_TN10_EXACT_INPUT } from '../v4/masonryBrickWallBiaTn10R1';
import { appendCanonicalBackendRevisionProjection } from '../../consumerRequests/consumerCanonicalBackendRevisionProjection';
import { buildRequestEstimateViewModel } from '../../../features/consumerRepair/requestEstimateViewModel';
import type { ConsumerRepairDraftBundle, ConsumerRepairRequestItem } from '../../consumerRequests/consumerRequestTypes';

const source = { contractVersion: 'canonical-public-resource-presentation/v1' as const,
  sourceTitleRu: 'Мембрана кровельная ПВХ, армированная, 1,2 мм — LOGICROOF V-RP, исходная спецификация',
  nameRu: 'Мембрана кровельная ПВХ, армированная, 1,2 мм', brandAndModelRu: 'LOGICROOF V-RP', specificationRu: null,
  detailsRu: ['Площадь требует проверки раскладки.'] };

test('a source-bound Russian label keeps brand and all details without changing the original title', () => {
  expect(display({ titleRu: source.sourceTitleRu, descriptor: source })).toEqual(source);
  expect(display({ titleRu: 'Моя мембрана, 2 мм', descriptor: source })).toBeNull();
  expect(display({ titleRu: source.sourceTitleRu, descriptor: source, manualTitleOverride: true })).toBeNull();
  expect(parseCanonicalPublicResourcePresentationV1({ ...source, nameRu: 'roof_membrane_internal_key' })).toBeNull();
  expect(parseCanonicalPublicResourcePresentationV1({ ...source, unexpected: true })).toBeNull();
  expect(canonicalPublicResourcePresentationMatchesV1(source, { ...source, brandAndModelRu: 'Другая марка' })).toBe(false);
});

test('a declared selected specification binds to the saved title and stays visible independently of the concise name', () => {
  const graph = { publicResourcePresentationV1: source };
  const title = source.sourceTitleRu+' — Совместимая поставка по ведомости №7';
  const bound = bindCanonicalPublicResourceSavedTitleV1({ graph, sourceTitleRu: source.sourceTitleRu, savedTitleRu: title,
    appendedSpecificationRu: 'Совместимая поставка по ведомости №7', manualTitleOverride: false });
  const projected = display({ titleRu: title, descriptor: bound.publicResourcePresentationV1 });
  expect(projected?.nameRu).toBe(source.nameRu);
  expect(projected?.specificationRu).toBe('Совместимая поставка по ведомости №7');
  expect(graph.publicResourcePresentationV1).toBe(source);
  expect(bindCanonicalPublicResourceSavedTitleV1({ graph, sourceTitleRu: source.sourceTitleRu, savedTitleRu: 'Мой материал',
    appendedSpecificationRu: null, manualTitleOverride: true })).toBe(graph);
});

test('the G6 authoring matrix leaves changed or unknown source titles untouched', () => {
  const base = series[0]!.originalDefinition;
  const changed = { ...base, resources: base.resources.map(r => r.row_id === 'pvc-roof:material:field'
    ? { ...r, title_ru: 'Другая мембрана 2 мм — другая марка' } : r) };
  expect(withG6PvcResourcePresentationS2741(changed).resources.find(r => r.row_id === 'pvc-roof:material:field')?.resource_graph)
    .not.toHaveProperty('publicResourcePresentationV1');
});

test('saved G6 rows keep source identity and carry brand-free Russian display names and unchanged quantities to PDF and procurement', async () => {
  const profile = series[0]!;
  const compiled = await compileCanonicalEstimateCore({ catalogId: profile.catalogId, compilerVersion: 'G6-label-fixture', operation: 'compile',
    primaryMeasureParameterId: 'area_m2', submittedParameters: { area_m2: 100 }, confirmedParameters: { ...profile.definition.runtimeInput },
    parameterDefinitions: [...profile.definition.parameters], formulaDefinitions: [...profile.definition.formulas], resourceDefinitions: [...profile.definition.resources],
    currencyCode: 'KGS', maximumResourceRows: profile.definition.resources.length,
    hashJson: value => createHash('sha256').update(canonicalEstimateStableJson(value)).digest('hex') });
  const stored = { id: '11111111-1111-4111-8111-111111111111', release_id: '22222222-2222-4222-8222-222222222222',
    catalog_id: profile.catalogId, definition_version_id: '33333333-3333-4333-8333-333333333333', checksum_sha256: 'a'.repeat(64), row_count: compiled.rows.length,
    input_parameters: compiled.parameters, totals: compiled.totals, currency_code: 'KGS',
    amendment_contract: { parameterSources: { preliminaryNeeds: compiled.preliminaryNeeds } } };
  const transport = projectCanonicalEstimatePreliminaryNeedTransport(stored);
  const catalog: CanonicalEstimateCatalogItem = { catalogId: profile.catalogId, releaseId: stored.release_id, namespace: 'global',
    workKey: 'G6-label-fixture', titleRu: 'Укладка кровли', domain: 'roofing', definitionVersion: 1, applicability: {}, professionalMetadata: {}, parameterSchema: [] };
  const revision: CanonicalEstimateRevisionView = { apiVersion: ESTIMATE_PLATFORM_API_VERSION, revisionId: stored.id, parentRevisionId: null,
    releaseId: stored.release_id, catalogId: profile.catalogId, revisionNumber: 1, status: 'ready', currencyCode: 'KGS', parameters: compiled.parameters,
    totals: compiled.totals, rowCount: compiled.rows.length, checksumSha256: stored.checksum_sha256, compilerVersion: 'G6-label-fixture',
    createdAt: '2026-10-06T00:00:00Z',
    amendmentContract: { rowOverrides: {}, customRows: [], releaseMigration: null, ...transport.amendmentContract },
    preliminaryNeeds: transport.preliminaryNeeds };
  const payload = adaptCanonicalRevisionToStructuredEstimate({ catalog, revision,
    rows: compiled.rows.map(row => canonicalEstimateRevisionRowFromStorage(row, null)) });
  const draft = buildStructuredEstimateRequestDraft(payload);
  const field = draft.items.find(item => item.sourceParameters?.rowCode === 'pvc-roof:material:field')!;
  const cleaner = draft.items.find(item => item.sourceParameters?.rowCode === 'pvc-roof:material:cleaner')!;
  expect(field.sourceParameters?.canonicalPublicResourcePresentationV1).toMatchObject({ sourceTitleRu: field.titleRu });
  expect(consumerRepairRowPublicResourcePresentation(field)).toBeNull(); // Raw metadata is not a view admission.
  const items = draft.items.map((item, index) => ({ ...item, id: 'fixture-'+index, requestDraftId: 'fixture' })) as ConsumerRepairRequestItem[];
  const bundle = appendCanonicalBackendRevisionProjection({ previousBundle: null,
    nextBundle: { draft: { id: 'fixture' }, items, structuredEstimatePayload: draft.structuredEstimatePayload } as ConsumerRepairDraftBundle, payload });
  const visible = buildRequestEstimateViewModel(bundle)!.sections.flatMap(s => s.items);
  expect(consumerRepairRowPublicResourcePresentation(visible.find(i => i.sourceParameters?.rowCode === 'pvc-roof:material:field')!))
    .toMatchObject({ nameRu: source.nameRu, brandAndModelRu: null });
  expect(consumerRepairRowPublicResourcePresentation(visible.find(i => i.sourceParameters?.rowCode === 'pvc-roof:material:cleaner')!))
    .toMatchObject({ nameRu: 'Очиститель для ПВХ-мембран', brandAndModelRu: null });
  const repeated = buildRequestEstimateViewModel(bundle)!.sections.flatMap(s => s.items);
  expect(repeated.every((item, index) => item === visible[index])).toBe(true);
  const welder = visible.find(i => i.sourceParameters?.rowCode === 'pvc-roof:machine:variant4_6kw')!;
  expect(welder.titleRu).not.toContain('Leister');
  expect(consumerRepairRowMatchesSearch(welder, 'Leister Variant')).toBe(true);
  const driver = items.find(i => i.sourceParameters?.rowCode === 'pvc-roof:machine:screwdriver')!;
  const tampered = { ...driver, sourceParameters: { ...driver.sourceParameters,
    canonicalPublicResourcePresentationV1: { ...(driver.sourceParameters?.canonicalPublicResourcePresentationV1 as object), brandAndModelRu: 'HILTI' } } };
  const rejected = buildRequestEstimateViewModel({ ...bundle, items: items.map(i => i.id === driver.id ? tampered : i) })!;
  const rejectedDriver = rejected.sections.flatMap(s => s.items).find(i => i.id === driver.id)!;
  expect(consumerRepairRowPublicResourcePresentation(rejectedDriver)).toBeNull();
  expect(consumerRepairRowMatchesSearch(rejectedDriver, 'HILTI')).toBe(false);
  expect(bundle.items.find(i => i.id === driver.id)?.sourceParameters?.canonicalPublicResourcePresentationV1).toMatchObject({ brandAndModelRu: null });
  expect(cleaner.quantity).toBeNull();
  expect(transport.preliminaryNeeds[0]).not.toHaveProperty('calculationTrace');
  const sourceRows = compiled.rows as CanonicalArtifactRow[];
  const fieldRow = sourceRows.find(r => r.row_id === 'pvc-roof:material:field')!;
  expect(canonicalArtifactVisibleRowTitle(fieldRow)).toBe(source.nameRu);
  expect(canonicalArtifactSpecificationParts(fieldRow, compiled.parameters).flatMap(s => s.parts)).not.toContain('LOGICROOF V-RP');
  const pdf = buildCanonicalProfessionalPdfProjection({ revision: stored, rows: sourceRows,
    preliminaryNeeds: canonicalArtifactPreliminaryNeeds(stored), expectedProjectedRowCount: sourceRows.length, workTitleRu: catalog.titleRu });
  expect(pdf.html).toContain('<strong>'+source.nameRu+'</strong>');
  expect(pdf.html).not.toContain('LOGICROOF');
  expect(pdf.html).not.toContain('ТЕХНОНИКОЛЬ');
  expect(fieldRow.title_ru).toContain('LOGICROOF');
  expect(pdf.html).toContain('<strong>Очиститель для ПВХ-мембран</strong>');
  expect(pdf.html).toMatch(/<tr class="preliminary-need">[\s\S]*?<strong>Очиститель для ПВХ-мембран<\/strong>[\s\S]*?<td class="numeric">Не рассчитано<\/td>/u);
  const procurement = buildCanonicalProcurementProjection({ revision: stored,
    procurementRows: sourceRows.filter(r => r.included_in_procurement), sourceRows });
  expect(procurement.rows.find(r => r.rowId === 'pvc-roof:material:field')).toMatchObject({ titleRu: source.nameRu, quantity: '157.5' });
  expect(field.titleRu).toBe(fieldRow.title_ru); // Draft storage remains the full immutable source title.
});

test('existing dynamic material policy remains saved when a row has no public naming descriptor', async () => {
  const facts = { ...MASONRY_BRICK_WALL_BIA_TN10_EXACT_INPUT };
  const result = await compileMasonryBrickWallBiaTn10R1(facts);
  const brick = result.rows.find(row => ((row.calculation_trace as Record<string, unknown>).resourceGraph as Record<string, unknown>)
    .professionalMaterialQuantityPolicyV1 != null)!;
  expect(brick.calculation_trace).toMatchObject({ resourceGraph: { professionalMaterialQuantityPolicyV1: {
    wastePercent: 3, procurementPackageSize: 500,
    formulaInputs: expect.objectContaining({ brick_breakage_percent: result.parameters.brick_breakage_percent,
      brick_supplier_package_pieces: result.parameters.brick_supplier_package_pieces }) } } });
});
