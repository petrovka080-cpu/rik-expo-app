import { normalizeCanonicalEstimateRowCategory } from '../../src/lib/estimate/backendPlatform/canonicalEstimateRowCategory';
import { buildCanonicalProfessionalPdfProjection, canonicalProfessionalPdfCategory } from '../../src/lib/estimate/backendPlatform/canonicalProfessionalPdf';
import type { CanonicalArtifactRow } from '../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract';

describe('typed resource category across estimate and professional PDF', () => {
  test.each([
    ['tool', 'Работы', 'equipment', 'equipment'],
    [' tool ', 'Доставка инструмента', 'equipment', 'equipment'],
    ['labor', 'Монтаж электрооборудования', 'work', 'work'],
    ['work', 'Материалы и доставка', 'work', 'work'],
    ['service', 'Материалы', 'service', 'service'],
    ['equipment', 'Доставка оборудования', 'equipment', 'equipment'],
    ['machinery', 'Доставка машин', 'equipment', 'equipment'],
    ['material', 'Доставка материалов', 'material', 'material'],
    ['delivery', 'Работы', 'delivery', 'transport'],
  ])('%s takes priority over operation section %s', (category, section, expectedUi, expectedPdf) => {
    expect(normalizeCanonicalEstimateRowCategory(section, category)).toBe(expectedUi);
    expect(canonicalProfessionalPdfCategory({ section, category })).toBe(expectedPdf);
  });

  test('unknown categories retain existing legacy classifiers and source control remains a service', () => {
    expect(canonicalProfessionalPdfCategory({ category: 'quality_control', section: 'Приёмка' })).toBe('service');
    expect(canonicalProfessionalPdfCategory({ category: 'Исполнительная документация', section: '' })).toBe('service');
    expect(canonicalProfessionalPdfCategory({ category: null, section: 'Доставка' })).toBe('transport');
    expect(normalizeCanonicalEstimateRowCategory('Доставка', null)).toBe('delivery');
    expect(canonicalProfessionalPdfCategory({ category: 'material', section: 'Работы', calculation_trace: { resourceGraph: { costTreatment: 'CONTROL_OR_DOCUMENT' } } })).toBe('service');
  });

  test('an unresolved Jubilee spanner prints as equipment without introducing quantity, price or total', () => {
    const need: CanonicalArtifactRow = {
      row_id: 'jubilee-spanner', ordinal: 0, section: 'Работы', category: 'tool',
      title_ru: 'Ключ 17 мм и контроль момента до 27 Н·м', unit_id: null, quantity: null,
      unit_price: null, amount: null, currency_code: 'KGS',
      included_in_estimate: false, included_in_procurement: false, procurement_eligible: false,
      ownership_status: 'OWNED', calculation_trace: { missingParameterIds: ['spanner_quantity'] },
    };
    const revision = { id: 'r17', release_id: 'release', catalog_id: 'jubilee', checksum_sha256: 'a'.repeat(64), row_count: 0, currency_code: 'KGS', totals: { amount: '0' } };
    const before = JSON.stringify({ revision, need });
    const projection = buildCanonicalProfessionalPdfProjection({ revision, rows: [], preliminaryNeeds: [need], workTitleRu: 'Установка урны', parameterTitlesRu: { spanner_quantity: 'Количество инструмента' } });
    expect(projection.html).toMatch(/Ключ 17 мм[\s\S]*?<td>Механизмы<\/td>/u);
    expect(projection.html).toContain('Количество нужно уточнить');
    expect(projection.html).toContain('В сумму и закупку позиция не включена.');
    expect(projection).toMatchObject({ rowCount: 1, preliminaryNeedCount: 1, pricedRowCount: 0, categoryTotals: { material: 0, work: 0, equipment: 0, service: 0, transport: 0 } });
    expect(JSON.stringify({ revision, need })).toBe(before);
  });
});
