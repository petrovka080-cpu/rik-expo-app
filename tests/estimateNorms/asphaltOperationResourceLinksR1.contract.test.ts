import { ASPHALT_INSTALL_KRER27_RESOURCES, ASPHALT_INSTALL_KRER27_SHORT_INPUT,
  compileAsphaltInstallKrer27ProfileR1 } from '../../src/lib/estimate/v4/asphaltInstallKrer27ProfileR1';
import { BRIDGE_ASPHALT_COMPLETE_RESOURCES, BRIDGE_ASPHALT_COMPLETE_CATALOG_ID,
  BRIDGE_ASPHALT_COMPLETE_PARAMETERS, BRIDGE_ASPHALT_COMPLETE_FORMULAS,
  BRIDGE_ASPHALT_COMPLETE_SHORT_INPUT, BRIDGE_ASPHALT_COMPLETE_RUNTIME_INPUT,
} from '../../src/lib/estimate/v4/bridgeAsphaltCompletePreliminaryProfileR1';
import { compileCanonicalEstimateCore } from '../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import { canonicalEstimateOperationReference, canonicalEstimateResourceOperationSections }
  from '../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';
import { buildCanonicalProfessionalPdfProjection, assertCanonicalProfessionalPdfMoneyCells } from '../../src/lib/estimate/backendPlatform/canonicalProfessionalPdf';
import { canonicalProfessionalPdfReviewAcknowledgmentV1, canonicalProfessionalPdfReportOriginalAuditV1 } from '../../src/lib/estimate/backendPlatform/canonicalEstimateSavedOperationAcceptanceV1';
import { canonicalEstimateStableJson } from '../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import { canonicalEstimateSha256HexText } from '../../src/lib/estimate/backendPlatform/canonicalEstimateSha256';
import { selectCanonicalArtifactRows, buildCanonicalProcurementProjection, canonicalArtifactPreliminaryNeeds, canonicalArtifactVisibleRowTitle, canonicalArtifactMoney, canonicalArtifactUnit, escapeCanonicalArtifactHtml }
  from '../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract';
import { estimateDeterministicHash } from '../../src/lib/estimate/estimateDeterministicHash';

const savedSnapshotHash = (value: unknown) => canonicalEstimateSha256HexText(canonicalEstimateStableJson(value));
const compileBridge = (hashJson = estimateDeterministicHash) => compileCanonicalEstimateCore({ operation: 'recalculate', compilerVersion: 'bridge-operation-links-contract',
  catalogId: BRIDGE_ASPHALT_COMPLETE_CATALOG_ID, primaryMeasureParameterId: 'area_m2',
  parameterDefinitions: [...BRIDGE_ASPHALT_COMPLETE_PARAMETERS], formulaDefinitions: [...BRIDGE_ASPHALT_COMPLETE_FORMULAS],
  resourceDefinitions: [...BRIDGE_ASPHALT_COMPLETE_RESOURCES], submittedParameters: BRIDGE_ASPHALT_COMPLETE_SHORT_INPUT,
  confirmedParameters: BRIDGE_ASPHALT_COMPLETE_RUNTIME_INPUT, currencyCode: 'KGS',
  rowOverrides: { 'bridge:waterproofing:membrane-rolls': { unitPrice: '2',
    provenance: { kind: 'manual', reason: 'TEST_ONLY reference price for double-payment regression' } } },
  maximumResourceRows: BRIDGE_ASPHALT_COMPLETE_RESOURCES.length, hashJson });
const operationOf = (row: Record<string, unknown>) =>
  (row.calculation_trace as { resourceGraph?: { operationCompositionV1?: unknown } } | undefined)?.resourceGraph?.operationCompositionV1;

describe('Asphalt source operations reach the existing core, documents and procurement', () => {
  test('every source row has an authored operation; normative crew remains one shared resource', async () => {
    for (const row of [...ASPHALT_INSTALL_KRER27_RESOURCES, ...BRIDGE_ASPHALT_COMPLETE_RESOURCES]) {
      expect(canonicalEstimateOperationReference(row.resource_graph.operationCompositionV1)).not.toBeNull();
    }
    const result = await compileAsphaltInstallKrer27ProfileR1(ASPHALT_INSTALL_KRER27_SHORT_INPUT);
    expect(result.preliminaryNeeds).toEqual([]);
    const sections = canonicalEstimateResourceOperationSections(result.rows.map(row => ({ rowId: row.row_id,
      titleRu: String(row.title_ru), operation: operationOf(row) })));
    const paving = sections.find(section => section.operation?.operationId === 'operation.asphalt_paving')!;
    expect(paving.resourceIds).toEqual(expect.arrayContaining(['asphalt:material:hot-dense-fine-mix', 'asphalt:equipment:asphalt-paver']));
    expect(paving.sharedResources.map(row => row.rowId)).toContain('asphalt:labor:road-workers');
    const rolling = sections.find(section => section.operation?.operationId === 'operation.rolling')!;
    expect(rolling.resourceIds).toContain('asphalt:equipment:smooth-roller-8t');
    expect(rolling.sharedResources.map(row => row.rowId)).toContain('asphalt:labor:road-workers');
    expect(result.rows.filter(row => row.row_id === 'asphalt:labor:road-workers')).toHaveLength(1);
    expect(result.rows.filter(row => row.row_id.startsWith('asphalt:operation:')).every(row => !row.included_in_estimate)).toBe(true);
  });

  test('bridge course identities and screed stages survive composition; common rolls and labor remain singular', async () => {
    const result = await compileBridge();
    expect(result.preliminaryNeeds).toEqual([]);
    const sections = canonicalEstimateResourceOperationSections(result.rows.map(row => ({ rowId: row.row_id,
      titleRu: String(row.title_ru), operation: operationOf(row) })));
    expect(sections.every(section => section.operation?.groupId === 'bridge:complete-pavement')).toBe(true);
    for (const course of ['binder', 'wearing']) {
      const paving = sections.find(section => section.operation?.operationId === `bridge:${course}:operation.asphalt_paving`)!;
      expect(paving.resourceIds).toContain(`bridge:${course}:asphalt:material:hot-dense-fine-mix`);
      expect(paving.sharedResources.map(row => row.rowId)).toContain(`bridge:${course}:asphalt:labor:road-workers`);
      expect(result.rows.find(row => row.row_id === `bridge:${course}:asphalt:material:hot-dense-fine-mix`)?.quantity).toBe('579.84');
    }
    expect(sections.find(section => section.operation?.operationId === 'bridge:screed:consolidate')?.resourceIds)
      .toContain('bridge:screed:equipment:vibrator');
    expect(sections.find(section => section.operation?.operationId === 'bridge:screed:consolidate')?.sharedResources.map(row => row.rowId))
      .toContain('bridge:screed:material:ready-mix');
    for (const operationId of ['bridge:membrane', 'bridge:membrane-details', 'bridge:drainage-details']) {
      expect(sections.find(section => section.operation?.operationId === operationId)?.sharedResources.map(row => row.rowId))
        .toContain('bridge:waterproofing:membrane-rolls');
    }
    expect(result.rows.find(row => row.row_id === 'bridge:waterproofing:membrane-rolls')?.quantity).toBe('703');
    expect(result.totals.amount).toBe('1406');
    expect(result.rows.find(row => row.row_id === 'bridge:wearing:asphalt:mobilization:paver')?.included_in_estimate).toBe(false);
  });

  test('held-source saved review preserves stage links and one purchase without claiming physical STANDARD acceptance', async () => {
    // Software snapshot only: no approved bridge project, source admission or FULL.
    // The same Core call creates64-character row hashes before the saved capture.
    const result = await compileBridge(savedSnapshotHash);
    expect(result.preliminaryNeeds).toEqual([]);
    const rows = result.rows.map(row => ({ ...row }));
    const revision = { id: '11111111-2222-3333-4444-555555555555', release_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      definition_version_id: 'TEST_ONLY_BRIDGE_OPERATION_LINKS_DEFINITION',
      catalog_id: BRIDGE_ASPHALT_COMPLETE_CATALOG_ID, checksum_sha256: savedSnapshotHash(result.revisionProjection), row_count: rows.length,
      currency_code: 'KGS', totals: result.totals, input_parameters: result.parameters, revision_number: 1,
      primary_measure_parameter_id: 'area_m2', primary_measure_value: '4800', primary_measure_unit_id: 'm2',
      amendment_contract: { parameterSources: { preliminaryNeeds: result.preliminaryNeeds } } };
    const before = JSON.stringify({ revision, rows }), coreBefore = JSON.stringify(result);
    const preliminaryNeeds = canonicalArtifactPreliminaryNeeds(revision, { issuancePurpose: 'PRELIMINARY_REVIEW' });
    const resources = [...rows, ...preliminaryNeeds], originalAudit = canonicalProfessionalPdfReportOriginalAuditV1({ revision, resources });
    expect(originalAudit).toMatchObject({ status: 'STRUCTURE_INVALID', pdfAllowed: false, definitionAdmissionAllowed: false, completeClaimAllowed: false });
    expect(originalAudit.issues).toEqual(expect.arrayContaining([
      { code: 'PUBLIC_RESOURCE_NAME_INVALID', rowId: 'bridge:binder:asphalt:material:hot-dense-fine-mix' },
      { code: 'PUBLIC_RESOURCE_NAME_INVALID', rowId: 'bridge:wearing:asphalt:material:hot-dense-fine-mix' },
      { code: 'INDEPENDENT_OPERATION_COMPOSITION_UNVERIFIED' },
    ]));
    const input = { revision, rows, preliminaryNeeds, workTitleRu: 'Полная система покрытия мостового полотна' };
    for (const candidate of [input, { ...input, issuancePurpose: 'STANDARD' as const }])
      expect(() => buildCanonicalProfessionalPdfProjection(candidate))
        .toThrow(expect.objectContaining({ code: 'ARTIFACT_OPERATION_RESOURCE_STRUCTURE_INVALID' }));
    const review = { ...input, issuancePurpose: 'PRELIMINARY_REVIEW' as const };
    expect(() => buildCanonicalProfessionalPdfProjection(review))
      .toThrow(expect.objectContaining({ code: 'ARTIFACT_REVIEW_ACKNOWLEDGMENT_INVALID' }));
    const ack = canonicalProfessionalPdfReviewAcknowledgmentV1({ revision, resources,
      request: { revisionId: revision.id, releaseId: revision.release_id, definitionVersionId: revision.definition_version_id,
        checksumSha256: revision.checksum_sha256, acknowledgedPreliminaryReview: true },
      actorUserId: 'TEST_ONLY_BRIDGE_SAVED_READER', acknowledgedAt: '2026-10-30T00:00:00Z' });
    expect(() => buildCanonicalProfessionalPdfProjection({ ...review, reviewAcknowledgmentV1: { ...ack, revisionId: 'wrong-saved-revision' } }))
      .toThrow(expect.objectContaining({ code: 'ARTIFACT_REVIEW_ACKNOWLEDGMENT_INVALID' }));
    const pdf = buildCanonicalProfessionalPdfProjection({ ...review, reviewAcknowledgmentV1: ack });
    expect(pdf.html).toContain('Предварительная для проверки');
    expect(pdf.html).toContain('Текущий статус источника не подтверждён');
    expect(pdf.html).toContain('Есть незавершённые проверки состава и связей подработ');
    expect(pdf.grandTotalStatus).toBe('PARTIAL_NEEDS_PRICE');
    expect(pdf.html).toContain('Нижний слой: Механизированная укладка покрытия');
    expect(pdf.html).toContain('Верхний слой: Механизированная укладка покрытия');
    expect(pdf.html).toContain('Виброуплотнение бетона стяжки');
    // The current common table renders complete reference rows with the same
    // number/quantity/saved price and an empty repeated amount, not a CSS label.
    const rollsRow = rows.find(row => row.row_id === 'bridge:waterproofing:membrane-rolls')!;
    const nameCell = '<td class="name"><strong>' + escapeCanonicalArtifactHtml(canonicalArtifactVisibleRowTitle(rollsRow, result.parameters)) + '</strong>';
    const table = pdf.html.split('<table class="client">')[1]!.split('</table>')[0]!;
    const uses = [...table.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gu)].map(match => match[0]).filter(row => row.includes(nameCell));
    expect(uses).toHaveLength(4); // One source-owned purchase plus its3 authored consumers.
    const cells = (html: string, name: string) => [...html.matchAll(/<td class="([^"]+)">([\s\S]*?)<\/td>/gu)].filter(match => match[1] === name).map(match => match[2]!);
    const ordinals = uses.map(row => cells(row, 'number')[0]!);
    expect(new Set(ordinals).size).toBe(1); expect(ordinals[0]).toMatch(/^[1-9]\d*$/u);
    for (const row of uses) {
      expect(cells(row, 'numeric')).toEqual(['703']);
      expect(cells(row, 'unit')).toEqual([escapeCanonicalArtifactHtml(canonicalArtifactUnit(rollsRow))]);
      expect(cells(row, 'money')[0]).toBe(escapeCanonicalArtifactHtml(canonicalArtifactMoney('2', 'KGS')));
    }
    const money = uses.map(row => cells(row, 'money'));
    expect(money.every(pair => pair.length === 2)).toBe(true);
    expect(money.filter(pair => pair[1] === escapeCanonicalArtifactHtml(canonicalArtifactMoney('1406', 'KGS')))).toHaveLength(1);
    expect(money.filter(pair => pair[1] === '')).toHaveLength(3);
    expect(() => assertCanonicalProfessionalPdfMoneyCells(pdf.html)).not.toThrow();
    // This is the unchanged normal mapper and its readiness guards, not a
    // purchase-write admission and not a bypass derived from PRELIM purpose.
    const procurement = buildCanonicalProcurementProjection({ revision, ...selectCanonicalArtifactRows(rows) });
    expect(new Set(procurement.rows.map(row => row.rowId)).size).toBe(procurement.rows.length);
    const rolls = procurement.rows.filter(row => row.rowId === 'bridge:waterproofing:membrane-rolls');
    expect(rolls).toHaveLength(1);
    expect(rolls[0]).toMatchObject({ quantity: '703', amount: '1406' });
    for (const id of ['bridge:membrane', 'bridge:membrane-details', 'bridge:drainage-details']) {
      const group = procurement.operationGroups.find(group => group.operation.operationId === id)!;
      expect(group.sharedResources).toEqual(expect.arrayContaining([expect.objectContaining({
        rowId: 'bridge:waterproofing:membrane-rolls', separatelyPayable: false })]));
      expect(group.rowIds).not.toContain('bridge:waterproofing:membrane-rolls');
    }
    expect(canonicalProfessionalPdfReportOriginalAuditV1({ revision, resources })).toEqual(originalAudit);
    expect(JSON.stringify(result)).toBe(coreBefore);
    expect(JSON.stringify({ revision, rows })).toBe(before);
  });
});
