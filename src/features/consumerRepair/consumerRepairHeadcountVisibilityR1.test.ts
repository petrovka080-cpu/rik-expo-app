import {
  consumerRepairRowCode,
  consumerRepairRowIsTechnicalDetail,
  consumerRepairRowPriceIsEditable,
} from './consumerRepairRowMetadata';

const physicalCrew = (unit = 'person') => ({
  id: 'same-saved-crew-row', titleRu: 'Звено рабочих', category: 'work', itemType: 'work',
  unit, quantity: 2, unitPrice: null, totalPrice: null,
  calculationTrace: JSON.stringify({resourceGraph: {costTreatment: 'INFORMATIONAL_SCOPE'}}),
  sourceParameters: {rowCode: 'source-crew', canonicalCostTreatment: 'INFORMATIONAL_SCOPE',
    includedInEstimate: false, includedInProcurement: false},
});

test.each(['person', 'чел.', 'человек'])('physical INFO headcount %s stays visible after cold category normalization', unit => {
  const item = JSON.parse(JSON.stringify(physicalCrew(unit))), before = JSON.stringify(item);
  expect(consumerRepairRowIsTechnicalDetail(item)).toBe(false);
  expect(consumerRepairRowCode(item)).toBe('source-crew');
  expect(consumerRepairRowPriceIsEditable(item)).toBe(true);
  expect(item.quantity).toBe(2);
  expect(item.sourceParameters.includedInEstimate).toBe(false);
  expect(item.sourceParameters.includedInProcurement).toBe(false);
  expect(JSON.stringify(item)).toBe(before);
});

test('headcount document control retains its ordinary technical role', () => {
  const item = physicalCrew(); item.sourceParameters.canonicalCostTreatment = 'CONTROL_OR_DOCUMENT';
  expect(consumerRepairRowIsTechnicalDetail(item)).toBe(true);
});

test.each(['man_hour', 'person_shift'])('INFO %s is not promoted from the old technical role', unit => {
  expect(consumerRepairRowIsTechnicalDetail(physicalCrew(unit))).toBe(true);
});

test('an explicit linked consumption counter keeps calculation-detail priority', () => {
  const item = physicalCrew();
  item.calculationTrace = JSON.stringify({resourceGraph: {costTreatment: 'INFORMATIONAL_SCOPE',
    purchaseBalanceOwnerRowId: 'different-real-owner'}});
  expect(consumerRepairRowIsTechnicalDetail(item)).toBe(true);
});

test('the existing payable guard still retains a visible resource', () => {
  const item = physicalCrew(); item.sourceParameters.includedInEstimate = true;
  expect(consumerRepairRowIsTechnicalDetail(item)).toBe(false);
});

test('a missing unit does not manufacture physical headcount admission', () => {
  expect(consumerRepairRowIsTechnicalDetail(physicalCrew(''))).toBe(true);
});
