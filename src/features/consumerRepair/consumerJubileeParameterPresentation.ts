import type { AiEstimateParameterCard } from '../../lib/estimate/aiEstimateParameterCardContract';

// Presentation for this exact catalogue work. Calculation ownership, active
// conditions, saved values and source admission remain with the canonical schema.
const catalogId = 'canonical-work:master:glasdon_jubilee110_metal_liner_prepared_concrete_standard';
const basic = ['bin_count', 'project_bin_configuration_reference', 'anchor_supply_scope'];
const foundation = ['prepared_foundation_acceptance_reference', 'actual_concrete_strength_n_mm2',
  'safe_drilling_foundation_reference', 'minimum_safe_drilling_depth_mm', 'minimum_anchor_edge_distance_mm'];

const wording: Readonly<Record<string, { label: string; guide: string; source?: string }>> = {
  bin_count: { label: 'Сколько урн установить', guide: 'Число урн, которые нужно установить.', source: 'количество установки' },
  project_bin_configuration_reference: { label: 'Какая урна предусмотрена', guide: 'Укажите нужное исполнение урны: модель, стальной вкладыш 110 л, дверцу и цвет. Можно сослаться на проект или описание изделия.' },
  anchor_supply_scope: { label: 'Как поставляется крепёж', guide: 'Проверьте у продавца: четыре совместимых бетонных крепления входят в цену урны или покупаются отдельно.' },
  prepared_foundation_acceptance_reference: { label: 'Чем подтверждено состояние бетона', guide: 'Укажите чертёж, акт или результат проверки готового ровного бетонного основания. Если данных нет, оставьте поле пустым.' },
  actual_concrete_strength_n_mm2: { label: 'Прочность бетона по документу', guide: 'Берётся из документа на фактическое основание, в Н/мм². Не вводите номер класса бетона вместо прочности.', source: 'документ на бетон' },
  safe_drilling_foundation_reference: { label: 'Чем подтверждена возможность сверления', guide: 'Чертёж или проверка должны подтверждать безопасное сверление и отсутствие мешающих коммуникаций. Если данных нет, оставьте поле пустым.' },
  minimum_safe_drilling_depth_mm: { label: 'Доступная безопасная глубина сверления', guide: 'По замеру или чертежу: доступная глубина в самой ограниченной точке крепления, в мм.', source: 'замер глубины' },
  minimum_anchor_edge_distance_mm: { label: 'Расстояние от крепления до края бетона', guide: 'Замерьте от оси ближайшего крепления до края бетона, в мм.', source: 'замер до края бетона' },
  actual_bin_supply_specification: { label: 'Какие урны поставляет продавец', guide: 'Укажите предложение или спецификацию продавца: готовая урна, стальной вкладыш 110 л и выбранное исполнение. Это подтверждение фактической поставки.' },
  bin_stock: { label: 'Сколько пригодных урн уже есть', guide: 'Количество подходящих урн в наличии. Если не проверяли, оставьте поле пустым.', source: 'по наличию на складе' },
  bin_reserve: { label: 'Сколько урн оставить в запасе', guide: 'Сколько урн должно остаться после монтажа. Это выбранный вами запас, а не дополнительное число устанавливаемых урн.', source: 'запас после монтажа' },
  bin_quantum: { label: 'Кратность продажи урн', guide: 'По условию продавца: по одной урне или партиями, например по 5. Это условие продажи, а не количество устанавливаемых урн.', source: 'условие продажи' },
  bin_stock_compatibility_reference: { label: 'Какие имеющиеся урны подходят', guide: 'Подтвердите исполнение, состояние и комплектность урн в наличии. Учитывайте комплектный крепёж по фактическому составу.' },
  fixing_supply_specification: { label: 'Какие крепления поставляет продавец', guide: 'Укажите совместимый полный узел: болт M10×120 мм, гайка M10 и обе шайбы Ø20/Ø50 мм; исполнение — по поставщику.' },
  fixing_stock: { label: 'Сколько пригодных креплений уже есть', guide: 'Считайте полные совместимые узлы крепления в наличии, а не отдельные болты или шайбы.', source: 'по наличию на складе' },
  fixing_reserve: { label: 'Сколько креплений оставить в запасе', guide: 'Сколько полных узлов должно остаться после монтажа.', source: 'запас после монтажа' },
  fixing_quantum: { label: 'Кратность продажи креплений', guide: 'Сколько полных узлов продавец отпускает в одной партии. Это условие продажи, а не расход на урну.', source: 'условие продажи' },
  fixing_stock_compatibility_reference: { label: 'Какие имеющиеся крепления подходят', guide: 'Подтвердите совместимость и полный состав имеющихся узлов: болт, гайка и обе шайбы.' },
};

export function jubileeParameterWording(workPassportId: string | undefined, parameterId: string) {
  return workPassportId === catalogId ? wording[parameterId] : undefined;
}

export function jubileeParameterGroups(workPassportId: string | undefined, cards: AiEstimateParameterCard[]) {
  if (workPassportId !== catalogId) return null;
  const visible = cards.filter(card => card.editable && card.consumerInputRole !== 'APPLICATION_TECHNICAL');
  return {
    basic: basic.flatMap(key => visible.filter(card => card.key === key)),
    foundation: visible.filter(card => foundation.includes(card.key)),
    procurement: visible.filter(card => !basic.includes(card.key) && !foundation.includes(card.key)),
  };
}
