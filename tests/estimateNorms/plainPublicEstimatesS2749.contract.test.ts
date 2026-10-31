import { compileWaterValtecUnknownWasteBalanceS2748 as compile } from '../../src/lib/estimate/v4/waterValtecPpr20UnknownWasteBalanceS2748';
import { validateCanonicalPurchaseOrderQuantityV1 } from '../../src/lib/estimate/backendPlatform/canonicalPurchaseBalanceV1';
import { canonicalPublicEstimateChoiceLabelRu, canonicalPublicEstimateRowNameRu, canonicalPublicEstimateWorkTitleRu } from '../../src/lib/estimate/backendPlatform/canonicalPublicEstimateLanguageRu';
import { canonicalLanternIntent, selectCanonicalLanternKindText } from '../../src/lib/estimate/backendPlatform/canonicalLanternIntent';
import { canonicalWorkSearchQueryFromPrompt } from '../../src/lib/estimate/backendPlatform/canonicalEstimateSearchInput';
import { canonicalArtifactVisibleRowTitle } from '../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract';

const input = { route_length_m: 100, substrate_profile: 'Сухой бетон, крепление напрямую без отделки',
  route_geometry_mode: 'Один прямой участок — подбор по отрезкам 4 м', route_end_connections: 'Два резьбовых подключения — каждое отдельно',
  route_start_thread_interface: 'Внутренняя резьба G 1/2″', route_finish_thread_interface: 'Наружная резьба G 3/4″' };

test('manual order quantities are saved without replacing unknown source consumption', async () => {
  for (const rowId of ['water-ppr20:08:consumable:waste-bags', 'water-ppr20:02:consumable:cutter-wheels']) {
    await expect(compile(input, { rowOverrides: { [rowId]: { quantity: '0.5', unitPrice: '10', provenance: { kind: 'manual', reason: 'VALIDATION_FIXTURE' } } } }))
      .rejects.toMatchObject({ code: 'ROW_AMENDMENT_INVALID' });
    for (const quantity of ['0', '5']) {
      const result=await compile(input, { rowOverrides: { [rowId]: { quantity, unitPrice: '10', provenance: { kind: 'manual', reason: 'VALIDATION_FIXTURE' } } } });
      const need=result.preliminaryNeeds.find(row=>row.row_id===rowId)!;
      expect(need).toMatchObject({quantity,unit_price:'10',calculation_trace:{preliminaryNeed:true,manualQuantityOverride:true,calculatedQuantityBeforeOverride:null}});
      expect(need.missing_parameter_ids.length).toBeGreaterThan(0);
      expect(result.rows.some(row=>row.row_id===rowId)).toBe(false);
    }
  }
});

test('an unknown project count still permits whole orders and rejects half a piece', () => {
  const policy = { quantityMode: 'supply_quantum', orderQuantumExpression: '1',
    unitId: 'pcs', consumedExpression: 'missing_project_count', stockExpression: '0', reserveExpression: '0' };
  const declared = new Set(['missing_project_count']);
  for (const quantity of ['0', '5']) {
    expect(() => validateCanonicalPurchaseOrderQuantityV1(policy, 'PROJECT_ORDER', 'pcs', quantity, {}, declared)).not.toThrow();
  }
  expect(() => validateCanonicalPurchaseOrderQuantityV1(policy, 'PROJECT_ORDER', 'pcs', '0.5', {}, declared))
    .toThrow('purchase quantity violates declared whole supply quantum');
});

test('legal mass and volume fractions do not acquire a whole-piece restriction', () => {
  for (const unitId of ['kg', 'm3']) {
    expect(() => validateCanonicalPurchaseOrderQuantityV1({ quantityMode: 'canonical_decimal', balanceScope: 'new_order_vs_required_consumption',
      unitId, consumedExpression: 'missing_norm', stockExpression: '0', reserveExpression: '0' }, 'TEST', unitId, '0.5', {}, new Set(['missing_norm']))).not.toThrow();
  }
});

test('the ambiguous word offers two meanings without selecting a model or inventing a measurement', () => {
  expect(canonicalLanternIntent('фонари 14 шт.')).toEqual({ kind: null, ambiguous: true });
  const lights = selectCanonicalLanternKindText('фонари 14 шт.', 'LIGHTING');
  const windows = selectCanonicalLanternKindText('фонари 14 шт.', 'ROOF_WINDOW');
  expect(lights.startsWith('фонари 14 шт.\n')).toBe(true); expect(windows.startsWith('фонари 14 шт.\n')).toBe(true);
  expect(canonicalWorkSearchQueryFromPrompt(lights)).toBe('светильники');
  expect(canonicalWorkSearchQueryFromPrompt(windows)).toBe('кровельные световые фонари');
  expect(canonicalWorkSearchQueryFromPrompt('кровельные фонари 14 шт.')).toBe('кровельные фонари');
  expect(canonicalWorkSearchQueryFromPrompt('окна в крыше 14 шт.')).toBe('кровельные световые фонари');
});

test('roof-window UI and document names are plain, brand-free and retain distinct physical parts', () => {
  const base = { rowId: 'roof-cfp100100:base', titleRu: 'Основание VELUX CFP Q 73FQV 100100 со стеклопакетом' };
  const dome = { rowId: 'roof-cfp100100:dome', titleRu: 'Прозрачный купол VELUX ISD 100100 0010' };
  expect(canonicalPublicEstimateRowNameRu(base)).toBe('Основание окна со стеклопакетом — проём 100 × 100 см');
  expect(canonicalPublicEstimateRowNameRu(dome)).toBe('Прозрачный купол для окна с проёмом 100 × 100 см');
  expect(canonicalArtifactVisibleRowTitle({ row_id: base.rowId, title_ru: base.titleRu })).toBe(canonicalPublicEstimateRowNameRu(base));
  expect(canonicalPublicEstimateWorkTitleRu('Кровельные фонари VELUX CFP 100100 — предварительный состав — 14 шт.')).toBe('Окна в крыше — 14 шт.');
  expect(canonicalPublicEstimateChoiceLabelRu('VELUX CFP Q 73FQV 100100 + ISD 100100 0010')).toBe('Неоткрывающееся окно с прозрачным куполом, проём 100 × 100 см');
  expect(canonicalPublicEstimateChoiceLabelRu('VALTEC PP-R 20 мм × 3/4″, внутренняя резьба')).toBe('PP-R 20 мм × 3/4″, внутренняя резьба');
  expect(base.titleRu).toContain('VELUX'); // Source identity remains private and unchanged.
  expect(canonicalPublicEstimateRowNameRu({...base,titleRu:'Другое окно — проём 120 × 120 см'})).toBe('Другое окно — проём 120 × 120 см');
  expect(canonicalPublicEstimateRowNameRu({...base,manualTitleOverride:true})).toBe(base.titleRu);
  expect(canonicalPublicEstimateWorkTitleRu('Кровельные фонари — проём 120 × 120 см')).toBe('Кровельные фонари — проём 120 × 120 см');
});
