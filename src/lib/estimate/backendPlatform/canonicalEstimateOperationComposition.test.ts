import { canonicalEstimateWorkProcess } from './canonicalEstimateOperationComposition';

const operation = (groupId: string, operationId: string, title: string, ordinal?: number) => ({
  contractVersion: 'canonical-operation-resource/v1', groupId,
  groupTitleRu: groupId === 'partition' ? 'Монтаж перегородки' : 'Устройство трубопровода',
  operationId, operationTitleRu: title, completionCriterionRu: 'Проверить выполненный этап',
  ...(ordinal == null ? {} : { processOrdinal: ordinal, processRole: 'PROCESS' }),
});

test('one process projection orders subworks and retains resource ownership for unrelated construction groups', () => {
  const resources = [
    { rowId: 'sheet', operation: operation('partition', 'lining', 'Обшивка каркаса', 1) },
    { rowId: 'pipe', operation: operation('pipeline', 'mount', 'Прокладка трубы', 0) },
    { rowId: 'profile', operation: operation('partition', 'frame', 'Монтаж каркаса', 0) },
    { rowId: 'screw', operation: operation('partition', 'lining', 'Обшивка каркаса', 1) },
    { rowId: 'test-pump', operation: operation('pipeline', 'test', 'Испытание трубопровода', 1) },
  ];
  const snapshot = JSON.stringify(resources);
  const groups = canonicalEstimateWorkProcess(resources);
  expect(groups.map(group => group.groupTitleRu)).toEqual(['Монтаж перегородки', 'Устройство трубопровода']);
  expect(groups[0]?.operations.map(step => step.operationTitleRu)).toEqual(['Монтаж каркаса', 'Обшивка каркаса']);
  expect(groups[0]?.operations[1]?.resourceIds).toEqual(['sheet', 'screw']);
  expect(groups[1]?.operations.map(step => step.operationTitleRu)).toEqual(['Прокладка трубы', 'Испытание трубопровода']);
  expect(JSON.stringify(resources)).toBe(snapshot);
});

test('reference rows and a single paid complex are retained outside the process, and an absent process is not invented', () => {
  expect(canonicalEstimateWorkProcess([
    { rowId: 'scope', operation: { ...operation('partition', 'scope', 'Объём'), processRole: 'REFERENCE_ONLY' } },
    { rowId: 'crew', operation: { ...operation('partition', 'labor', 'Труд всего комплекса'), processRole: 'COST_SUMMARY' } },
    { rowId: 'legacy', operation: null },
  ])).toEqual([]);
});

test('legacy resource buckets expose actual saved work titles and do not pretend their order is a process sequence', () => {
  const groups = canonicalEstimateWorkProcess([
    { rowId: 'paint', titleRu: 'Нанесение двух слоёв краски', category: 'labor',
      operation: operation('partition', 'legacy', 'Готовые операции, граница и контроль') },
    { rowId: 'primer', titleRu: 'Грунтование основания', category: 'labor', operation: null },
    { rowId: 'bucket', titleRu: 'Краска', category: 'material', operation: null },
    { rowId: 'operator', titleRu: 'Машинист: входит в стоимость машины', category: 'labor',
      costTreatment: 'INCLUDED_IN_RESOURCE_ROWS', operation: null },
  ], 'Окраска стен');
  expect(groups).toHaveLength(1);
  expect(groups[0]?.sequenceUnspecified).toBe(true);
  expect(groups[0]?.operations.map(step => step.operationTitleRu)).toEqual(['Нанесение двух слоёв краски', 'Грунтование основания']);
});

test('an older operation reference without an explicit process order is not presented as a numbered sequence', () => {
  expect(canonicalEstimateWorkProcess([{ rowId: 'work', operation: operation('partition', 'mount', 'Монтаж') }])[0]?.sequenceUnspecified)
    .toBe(true);
});
