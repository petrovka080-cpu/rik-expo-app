/** The narrow whole-area planning branch; no extra public norm input. */
export const ROOF_PLANNED_PRIMER_CONDITIONS_V1 =
  'Принятое минеральное основание; совместимая готовая эмульсия на всю площадь; огрунтовка оплачивается только здесь; обычные условия до 15 м';
export const ROOF_PLANNED_PRIMER_GUIDE_V1 =
  'Укажите состояние принятого бетонного или растворного основания. Это новое основное поле наружной кровли при положительной температуре, высоте до 15 м и обычных условиях без непроверенных поправок; ремонт, реконструкция, стеснение, высокогорье и другие отличающиеся условия требуют отдельного допуска. Плановая ветвь относится к совместимой готовой битумной эмульсии по проекту, ко всей той же нормативной площади q; эта огрунтовка не выполнена и отдельно не оплачена другим владельцем. Приложение само получает расход, труд и нормативную подачу из КРЕР 016-02 и добавляет их в эту смету. При иной площади или частичной готовности полный объём здесь не подтверждается. Уже выполненная огрунтовка не начисляется повторно; высыхание и приёмка проверяются до наплавления. Устройство или ремонт основания этим ответом не подтверждаются.';

/** Clearing an evidence link is not proof that its external execution/payment
 * ended. Keep the parent intact until the actual owner and phase are resolved. */
export function assertRoofPlannedPreparationOwnerContextV1(input: {
  parameters: Readonly<Record<string, unknown>>;
  inheritedExternalOwner: unknown;
  suppliedExternalOwner?: unknown;
}): void {
  if (input.parameters.roof_torch_conditions !== ROOF_PLANNED_PRIMER_CONDITIONS_V1) return;
  if (input.inheritedExternalOwner != null || input.suppliedExternalOwner != null) {
    throw Object.assign(new Error(
      'Огрунтовка этой сметы конфликтует с сохранённой подготовкой того же участка. Уточните её исполнителя и фактическое состояние. Выполненную подготовку повторно не начисляйте. Удаление ссылки не подтверждает отмену внешней работы или оплаты; исходная смета сохранена.',
    ), { code: 'ROOF_PRIMER_OWNER_CONFLICT', httpStatus: 409 });
  }
}
