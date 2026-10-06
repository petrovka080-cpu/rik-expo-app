import { createHash } from 'node:crypto';
import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput } from './canonicalEstimateCompileCore';
import { compileFormulaGraph } from './formulaGraph';
import type { CanonicalCommercialCostCoverageV1 } from './canonicalCommercialCostCoverageV1';
import { canonicalEstimateStableJson } from './canonicalEstimateDeterminism';
import { projectCanonicalEstimatePreliminaryNeedTransport } from './canonicalEstimatePreliminaryNeedTransport';
import { canonicalEstimateRevisionRowFromStorage } from './canonicalEstimateRevisionReadMapper';
import { adaptCanonicalRevisionToStructuredEstimate } from './canonicalEstimateForemanAdapter';
import { buildStructuredEstimateRequestDraft } from '../../estimateStructuredPipeline/structuredEstimateRequestBinding';
import { ESTIMATE_PLATFORM_API_VERSION, type CanonicalEstimateRevisionView, type CanonicalEstimateCatalogItem } from './contracts';
import { consumerRepairRowCostCoverageLabel, consumerRepairRowCommercialScopeLabel } from '../../../features/consumerRepair/consumerRepairRowMetadata';
import { buildCanonicalProfessionalPdfProjection } from './canonicalProfessionalPdf';
import type { CanonicalArtifactRow } from './canonicalEstimateArtifactContract';

// MASTER §20.43.6 arithmetic fixture only. These are not catalogue norms or prices.
function fixture(mode = 'OPERATIONS'): CanonicalEstimateCompileCoreInput {
  const formula = compileFormulaGraph('area_m2');
  const definitions = [
    ['prepare', 'Подготовка основания', 'work'], ['lay', 'Укладка плитки', 'work'],
    ['grout', 'Затирка швов', 'work'], ['cut', 'Подрезка плитки', 'work'],
    ['cleanup', 'Финальная уборка', 'work'], ['tile', 'Плитка', 'material'],
  ].map(([id, title, category], ordinal) => ({ id: id!, row_id: id!, title_ru: title!, category: category!, ordinal,
    section: category === 'material' ? 'materials' : 'labor', unit_id: 'm2', formula_id: 'area',
    inclusion_ast: { kind: 'literal', value: true }, resource_graph: { costTreatment: 'OWN_COST' },
    procurement_eligible: category === 'material', cost_owner_id: 'price:'+id,
    source_metadata: null, row_sha256: 'fixture:'+id }));
  const input: CanonicalEstimateCompileCoreInput = {
    operation: 'recalculate', compilerVersion: 'coverage-fixture.r1', catalogId: 'coverage_fixture', primaryMeasureParameterId: 'area_m2',
    parameterDefinitions: [
      { parameter_id: 'area_m2', unit_id: 'm2', value_type: 'decimal', required: true, default_value: null, constraints_json: { min: 0 } },
      { parameter_id: 'mode', value_type: 'enum', required: true, default_value: null,
        constraints_json: { values: ['OPERATIONS', 'COMPLEX'] } },
    ],
    formulaDefinitions: [{ formula_id: 'area', ast: formula.ast, input_parameter_ids: ['area_m2'], ast_sha256: 'fixture-area' }],
    resourceDefinitions: definitions, submittedParameters: { area_m2: '20', mode }, confirmedParameters: {}, currencyCode: 'KGS',
    maximumResourceRows: 200, hashJson: value => createHash('sha256').update(canonicalEstimateStableJson(value)).digest('hex'),
    rowOverrides: {
      prepare: { unitPrice: '100', provenance: { kind: 'manual' } },
      lay: { unitPrice: '600', provenance: { kind: 'manual' } },
      grout: { unitPrice: '150', provenance: { kind: 'manual' } },
    },
  };
  const coverage: CanonicalCommercialCostCoverageV1 = {
    contractVersion: 'canonical-commercial-cost-coverage/v1', scopeId: 'quote:tile-labor',
    scopeRu: 'Только труд укладки с подрезкой и финальной уборкой; подготовка и затирка отдельно',
    sourceReference: 'MASTER S27.41 §20.43.6, validation fixture only', priceScope: 'LABOR_ONLY',
    when: { kind: 'literal', value: true }, rateBasis: { kind: 'PER_MEASURE', parameterId: 'area_m2', unitId: 'm2' },
    members: [{ rowId: 'cut', unitId: 'm2' }, { rowId: 'cleanup', unitId: 'm2' }],
  };
  input.resourceDefinitions.find(r => r.row_id === 'lay')!.resource_graph.commercialCostCoverageV1 = coverage;
  if (mode === 'COMPLEX') {
    coverage.scopeRu = 'Труд подготовки, укладки, затирки, подрезки и финальной уборки';
    coverage.members.push({ rowId: 'prepare', unitId: 'm2' }, { rowId: 'grout', unitId: 'm2' });
    delete input.rowOverrides!.prepare; delete input.rowOverrides!.grout;
    input.rowOverrides!.lay!.unitPrice = '850';
  }
  return input;
}
const row = (result: Awaited<ReturnType<typeof compileCanonicalEstimateCore>>, id: string) => result.rows.find(r => r.row_id === id)!;
const coverage = (input: CanonicalEstimateCompileCoreInput) => input.resourceDefinitions.find(r => r.row_id === 'lay')!
  .resource_graph.commercialCostCoverageV1 as CanonicalCommercialCostCoverageV1;

describe('canonical server commercial coverage', () => {
  test('main and required subworks sum their own prices once; included steps and unknown materials remain visible', async () => {
    const result = await compileCanonicalEstimateCore(fixture());
    expect(result.totals).toMatchObject({ amount: '17000', pricedRowCount: 3, unpricedRowCount: 1 });
    expect(result.rows).toHaveLength(6);
    expect(row(result, 'cut')).toMatchObject({ quantity: '20', unit_price: null, included_in_estimate: false });
    expect(row(result, 'tile')).toMatchObject({ quantity: '20', unit_price: null, included_in_procurement: true });
    expect(row(result, 'cut').calculation_trace).toMatchObject({ resourceGraph: {
      costTreatment: 'INCLUDED_IN_RESOURCE_ROWS', includedInResourceOwnerRowId: 'lay',
      commercialCostCoverageDecisionV1: { ownerTitleRu: 'Укладка плитки', quantityCoverage: 'ENTIRE_RESOURCE_ROW' },
    } });
  });
  test('a complex labour price replaces the separate charges, without changing physical quantities', async () => {
    const result = await compileCanonicalEstimateCore(fixture('COMPLEX'));
    expect(result.totals).toMatchObject({ amount: '17000', pricedRowCount: 1, unpricedRowCount: 1 });
    expect(row(result, 'prepare')).toMatchObject({ quantity: '20', unit_price: null, amount: null, included_in_estimate: false });
    expect(row(result, 'tile').included_in_procurement).toBe(true);
  });
  test('an unknown package price counts once and explicit zero remains a known price', async () => {
    const input = fixture('COMPLEX'); input.rowOverrides = {};
    const missing = await compileCanonicalEstimateCore(input);
    expect(missing.totals).toMatchObject({ amount: '0', pricedRowCount: 0, unpricedRowCount: 2 });
    expect(row(missing, 'lay').unit_price).toBeNull();
    input.rowOverrides.lay = { unitPrice: '0', provenance: { kind: 'manual' } };
    expect((await compileCanonicalEstimateCore(input)).totals).toMatchObject({ pricedRowCount: 1, unpricedRowCount: 1 });
  });
  test('unpriced provider-supplied material keeps its physical need and explicit provider, without a second buyer charge', async () => {
    const input = fixture('COMPLEX'); coverage(input).priceScope = 'LABOR_AND_LISTED_RESOURCES';
    coverage(input).members.push({ rowId: 'tile', unitId: 'm2', supplyParty: 'RATE_PROVIDER' });
    const result = await compileCanonicalEstimateCore(input);
    expect(result.totals).toMatchObject({ amount: '17000', unpricedRowCount: 0 });
    expect(row(result, 'tile')).toMatchObject({ quantity: '20', included_in_estimate: false, included_in_procurement: false });
    expect(row(result, 'tile').calculation_trace).toMatchObject({ resourceGraph: {
      commercialCostCoverageDecisionV1: { supplyParty: 'RATE_PROVIDER' },
    } });
  });
  test('covered unknown quantities remain selected technical requirements', async () => {
    const input = fixture('COMPLEX'); coverage(input).priceScope = 'LABOR_AND_LISTED_RESOURCES';
    coverage(input).members.push({ rowId: 'tile', unitId: 'm2', supplyParty: 'RATE_PROVIDER' });
    input.parameterDefinitions.push({ parameter_id: 'material_measure', value_type: 'decimal', required: false, default_value: null, constraints_json: null });
    input.formulaDefinitions.push({ formula_id: 'material', ast: { kind: 'parameter', id: 'material_measure' }, input_parameter_ids: ['material_measure'], ast_sha256: 'material' });
    input.resourceDefinitions.find(r => r.row_id === 'tile')!.formula_id = 'material';
    const result = await compileCanonicalEstimateCore(input);
    expect(result.preliminaryNeeds).toEqual([expect.objectContaining({ row_id: 'tile', selected: true, quantity: null, unit_price: null,
      calculation_trace: expect.objectContaining({ resourceGraph: expect.objectContaining({ costTreatment: 'INCLUDED_IN_RESOURCE_ROWS' }) }) })]);
  });
  test.each([
    ['separate price', { unitPrice: '150', provenance: { kind: 'manual' } }],
    ['explicit separate selection', { includedInEstimate: true, provenance: { kind: 'manual' } }],
    ['unsupported quantity change', { quantity: '21', provenance: { kind: 'manual' } }],
  ])('direct compiler rejects %s on a covered child and does not mutate the submitted values', async (_name, override) => {
    const input = fixture('COMPLEX'); input.rowOverrides!.prepare = override;
    const before = JSON.stringify(input);
    await expect(compileCanonicalEstimateCore(input)).rejects.toMatchObject({ code: 'COMMERCIAL_COST_COVERAGE_CONFLICT' });
    expect(JSON.stringify(input)).toBe(before);
  });
  test.each(['missing', 'unit', 'duplicate', 'overlap', 'cycle', 'source', 'basis', 'provider', 'labor_material', 'owner_excluded'])('rejects invalid %s coverage before a false total is produced', async kind => {
    const input = fixture('COMPLEX'); const descriptor = coverage(input);
    if (kind === 'missing') descriptor.members[0]!.rowId = 'absent';
    if (kind === 'unit') descriptor.members[0]!.unitId = 'kg';
    if (kind === 'duplicate') descriptor.members.push({ ...descriptor.members[0]! });
    if (kind === 'source') descriptor.sourceReference = '';
    if (kind === 'basis') input.rowOverrides!.lay!.quantity = '21';
    if (kind === 'provider' || kind === 'labor_material') {
      if (kind === 'provider') descriptor.priceScope = 'LABOR_AND_LISTED_RESOURCES';
      descriptor.members.push({ rowId: 'tile', unitId: 'm2' });
    }
    if (kind === 'owner_excluded') input.rowOverrides!.lay!.includedInEstimate = false;
    if (kind === 'overlap' || kind === 'cycle') {
      const other = input.resourceDefinitions.find(r => r.row_id === 'prepare')!;
      descriptor.members = descriptor.members.filter(m => m.rowId !== 'prepare');
      if (kind === 'cycle') descriptor.members.push({ rowId: 'prepare', unitId: 'm2' });
      other.resource_graph.commercialCostCoverageV1 = { ...descriptor, scopeId: 'quote:other',
        members: [{ rowId: kind === 'cycle' ? 'lay' : 'cut', unitId: 'm2' }] };
    }
    await expect(compileCanonicalEstimateCore(input)).rejects.toHaveProperty('code');
  });
  test('automatic price requires the same commercial scope; manual prices use the explicit selected boundary', async () => {
    const input = fixture('COMPLEX'); input.rowOverrides = {};
    input.priceItems = [{ price_key: 'price:lay', unit_id: 'm2', currency_code: 'KGS', unit_price: '850', snapshot_id: 'fixture' }];
    await expect(compileCanonicalEstimateCore(input)).rejects.toMatchObject({ code: 'PRICE_SCOPE_MISMATCH' });
    input.priceItems[0]!.cost_scope_id = coverage(input).scopeId;
    expect((await compileCanonicalEstimateCore(input)).totals).toMatchObject({ amount: '17000', unpricedRowCount: 1 });
  });
  test('inactive commercial profile keeps the existing resource charges', async () => {
    const input = fixture(); coverage(input).when = { kind: 'equals', parameterId: 'mode', value: 'COMPLEX' };
    const result = await compileCanonicalEstimateCore(input);
    expect(row(result, 'cut').included_in_estimate).toBe(true);
    expect(result.totals.unpricedRowCount).toBe(3);
    expect((row(result, 'lay').calculation_trace as { resourceGraph: Record<string, unknown> }).resourceGraph)
      .not.toHaveProperty('commercialCostCoverageOwnerDecisionV1');
    const html = buildCanonicalProfessionalPdfProjection({ revision: { row_count: result.rows.length, totals: result.totals, currency_code: 'KGS' },
      rows: result.rows as CanonicalArtifactRow[], expectedProjectedRowCount: result.rows.length, workTitleRu: 'Контрольная смета' }).html;
    expect(html).not.toContain(coverage(input).scopeRu);
  });
  test('fixed whole-scope price is one service and retains the measured technical boundary', async () => {
    const input = fixture('COMPLEX'); const owner = input.resourceDefinitions.find(r => r.row_id === 'lay')!;
    coverage(input).rateBasis = { kind: 'WHOLE_SCOPE', scopeParameterId: 'area_m2', unitId: 'service' };
    owner.unit_id = 'service'; owner.formula_id = 'one'; owner.resource_graph.inputParameterIds = ['area_m2'];
    input.formulaDefinitions.push({ formula_id: 'one', ast: { kind: 'literal', value: '1' }, input_parameter_ids: [], ast_sha256: 'one' });
    input.rowOverrides!.lay!.unitPrice = '17000';
    const result = await compileCanonicalEstimateCore(input);
    expect(row(result, 'lay')).toMatchObject({ unit_id: 'service', quantity: '1', amount: '17000' });
    expect(row(result, 'prepare').quantity).toBe('20');
    input.parameterDefinitions[0]!.required = false;
    delete input.submittedParameters.area_m2;
    const unknownScope = await compileCanonicalEstimateCore(input);
    expect(unknownScope.preliminaryNeeds.find(n => n.row_id === 'lay')).toMatchObject({ selected: true,
      need_state: 'CONDITION_REQUIRED', missing_parameter_ids: ['area_m2'] });
    expect(unknownScope.rows.some(r => r.row_id === 'lay')).toBe(false);
  });
  test.each(['mismatched_measure', 'literal_measure', 'percentage'])('rejects %s instead of guessing a tariff conversion or partial allocation', async kind => {
    const input = fixture('COMPLEX');
    if (kind === 'mismatched_measure') input.parameterDefinitions[0]!.unit_id = 'kg';
    if (kind === 'literal_measure') input.formulaDefinitions[0]!.ast = { kind: 'literal', value: '20' };
    if (kind === 'percentage') (coverage(input).members[0] as unknown as Record<string, unknown>).percent = 50;
    await expect(compileCanonicalEstimateCore(input)).rejects.toHaveProperty('code');
  });
  test('persisted compact API need preserves its paid owner and provider through structured binding and PDF', async () => {
    const input = fixture('COMPLEX'); coverage(input).priceScope = 'LABOR_AND_LISTED_RESOURCES';
    input.rowOverrides!.lay!.titleRu = 'Труд по предложению №7';
    coverage(input).members.push({ rowId: 'tile', unitId: 'm2', supplyParty: 'RATE_PROVIDER' });
    input.parameterDefinitions.push({ parameter_id: 'tile_measure', value_type: 'decimal', required: false, default_value: null, constraints_json: null });
    input.formulaDefinitions.push({ formula_id: 'tile', ast: { kind: 'parameter', id: 'tile_measure' }, input_parameter_ids: ['tile_measure'], ast_sha256: 'tile' });
    input.resourceDefinitions.find(r => r.row_id === 'tile')!.formula_id = 'tile';
    const result = await compileCanonicalEstimateCore(input);
    const stored = { id: '11111111-1111-4111-8111-111111111111', release_id: '22222222-2222-4222-8222-222222222222',
      definition_version_id: '33333333-3333-4333-8333-333333333333', checksum_sha256: 'a'.repeat(64),
      row_count: result.rows.length, input_parameters: result.parameters, totals: result.totals,
      amendment_contract: { parameterSources: { preliminaryNeeds: result.preliminaryNeeds } } };
    const transport = projectCanonicalEstimatePreliminaryNeedTransport(stored);
    expect(transport.preliminaryNeeds[0]).not.toHaveProperty('calculationTrace');
    expect(transport.preliminaryNeeds[0]).toMatchObject({ selected: true, commercialCostCoverageDecision: {
      ownerRowId: 'lay', ownerTitleRu: 'Укладка плитки', supplyParty: 'RATE_PROVIDER' } });
    const catalog: CanonicalEstimateCatalogItem = { catalogId: input.catalogId, releaseId: stored.release_id, namespace: 'global',
      workKey: 'coverage-fixture', titleRu: 'Укладка плитки', domain: 'interior_finishes', definitionVersion: 1, applicability: {},
      professionalMetadata: {}, parameterSchema: [] };
    const revision: CanonicalEstimateRevisionView = { apiVersion: ESTIMATE_PLATFORM_API_VERSION, revisionId: stored.id, parentRevisionId: null,
      releaseId: stored.release_id, catalogId: input.catalogId, revisionNumber: 1, status: 'ready', currencyCode: 'KGS',
      parameters: result.parameters, totals: result.totals, rowCount: result.rows.length, checksumSha256: stored.checksum_sha256,
      compilerVersion: input.compilerVersion, createdAt: '2026-10-06T00:00:00Z',
      amendmentContract: transport.amendmentContract, preliminaryNeeds: transport.preliminaryNeeds };
    const payload = adaptCanonicalRevisionToStructuredEstimate({ catalog, revision,
      rows: result.rows.map(r => canonicalEstimateRevisionRowFromStorage(r, null)) });
    const draft = buildStructuredEstimateRequestDraft(payload);
    const tile = draft.items.find(item => item.sourceParameters?.rowCode === 'tile')!;
    expect(tile).toMatchObject({ quantity: null, sourceParameters: { includedInEstimate: true, includedInProcurement: false } });
    expect(consumerRepairRowCostCoverageLabel(tile)).toContain('Труд по предложению №7');
    expect(consumerRepairRowCostCoverageLabel(tile)).toContain('исполнитель');
    const html = buildCanonicalProfessionalPdfProjection({ revision: stored, rows: result.rows as CanonicalArtifactRow[],
      preliminaryNeeds: result.preliminaryNeeds as CanonicalArtifactRow[], expectedProjectedRowCount: result.rows.length, workTitleRu: catalog.titleRu }).html;
    expect(html).toContain('Включено в стоимость «Труд по предложению №7»');
    expect(html).toContain('Ресурс предоставляет исполнитель этой расценки.');
    expect(html).toContain('Количество нужно уточнить');
    const owner = draft.items.find(item => item.sourceParameters?.rowCode === 'lay')!;
    expect(consumerRepairRowCommercialScopeLabel(owner)).toContain('Состав расценки');
  });
  test('known included resources retain their explicit owner even when its quantity is a preliminary need', async () => {
    const result = await compileCanonicalEstimateCore(fixture('COMPLEX'));
    const owner = row(result, 'lay');
    const sourceRows = result.rows.filter(r => r.row_id !== 'lay') as CanonicalArtifactRow[];
    const need = { ...owner, title_ru: 'Комплекс исполнителя', quantity: null, selected: true, need_state: 'QUANTITY_REQUIRED',
      missing_parameter_ids: ['scope_measure'], need_sha256: 'b'.repeat(64) } as unknown as CanonicalArtifactRow;
    const stored = { id: '11111111-1111-4111-8111-111111111111', release_id: '22222222-2222-4222-8222-222222222222',
      definition_version_id: '33333333-3333-4333-8333-333333333333', checksum_sha256: 'a'.repeat(64),
      row_count: sourceRows.length, totals: { amount: '0' }, currency_code: 'KGS', input_parameters: result.parameters,
      amendment_contract: { parameterSources: { preliminaryNeeds: [need] } } };
    const transport = projectCanonicalEstimatePreliminaryNeedTransport(stored);
    const catalog: CanonicalEstimateCatalogItem = { catalogId: 'coverage-fixture', releaseId: stored.release_id, namespace: 'global',
      workKey: 'coverage-fixture', titleRu: 'Контрольная смета', domain: 'interior_finishes', definitionVersion: 1, applicability: {},
      professionalMetadata: {}, parameterSchema: [] };
    const revision: CanonicalEstimateRevisionView = { apiVersion: ESTIMATE_PLATFORM_API_VERSION, revisionId: stored.id, parentRevisionId: null,
      releaseId: stored.release_id, catalogId: catalog.catalogId, revisionNumber: 1, status: 'ready', currencyCode: 'KGS',
      parameters: result.parameters, totals: stored.totals, rowCount: sourceRows.length, checksumSha256: stored.checksum_sha256,
      compilerVersion: 'coverage-test', createdAt: '2026-10-06T00:00:00Z', amendmentContract: transport.amendmentContract,
      preliminaryNeeds: transport.preliminaryNeeds };
    const draft = buildStructuredEstimateRequestDraft(adaptCanonicalRevisionToStructuredEstimate({ catalog, revision,
      rows: sourceRows.map(r => canonicalEstimateRevisionRowFromStorage(r, null)) }));
    const included = draft.items.find(item => item.sourceParameters?.rowCode === 'prepare')!;
    expect(consumerRepairRowCostCoverageLabel(included)).toContain('Комплекс исполнителя');
    const projection = buildCanonicalProfessionalPdfProjection({ revision: stored,
      rows: sourceRows, preliminaryNeeds: [need], expectedProjectedRowCount: sourceRows.length, workTitleRu: 'Контрольная смета' });
    expect(projection.html).toContain('стоимость включена в позицию «Комплекс исполнителя»');
    expect(projection.html).toContain('Состав расценки: Труд подготовки');
    expect(projection.html).toContain('Количество нужно уточнить');
  });
  test('a strict labour-only quote cannot silently cover equipment already included through the original worker owner', async () => {
    const input = fixture('COMPLEX');
    input.resourceDefinitions.push({ ...input.resourceDefinitions[0]!, id: 'tool', row_id: 'tool', ordinal: 10,
      title_ru: 'Оснастка', category: 'equipment', resource_graph: { costTreatment: 'INCLUDED_IN_RESOURCE_ROWS', includedInResourceOwnerRowId: 'prepare' } });
    await expect(compileCanonicalEstimateCore(input)).rejects.toMatchObject({ code: 'COMMERCIAL_COST_COVERAGE_CONFLICT' });
    coverage(input).priceScope = 'LABOR_AND_LISTED_RESOURCES';
    const result = await compileCanonicalEstimateCore(input);
    expect(row(result, 'tool').included_in_estimate).toBe(false);
    expect(result.totals.amount).toBe('17000');
  });
});
