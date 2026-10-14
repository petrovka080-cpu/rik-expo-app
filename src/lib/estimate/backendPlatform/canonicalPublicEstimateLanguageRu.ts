import publicBindings from '../../../../data/estimate-benchmarks/source-packs/public-estimate-language-s27-50.json';
import aggressiveFloorFacts from '../../../../data/estimate-benchmarks/source-packs/aggressive-floor-actual-thickness-four-s27-69.json';
import concreteBaseFacts from '../../../../data/estimate-benchmarks/source-packs/concrete-floor-base-demolition-s27-54.json';

/** Public wording only. Saved product/source identities and calculation inputs
 * remain unchanged. Brand recommendations are not enabled. */
function cleanEditedPublicTextRu(value: string): string {
  return value.replace(/\s{2,}/gu, ' ').replace(/\s+([,;])/gu, '$1').trim();
}

export function canonicalPublicEstimateTextRu(value: string): string {
  const edited = value.replace(/для\s+LOGICROOF/giu, 'для выбранной кровельной мембраны')
    .replace(/\bLeister\s+Variant\s+V\b/giu, '')
    .replace(/\b(?:VELUX|VALTEC|fischer|LOGICROOF|Leister)\b/giu, '');
  return edited === value ? value : cleanEditedPublicTextRu(edited);
}

/** The calculation status is shown separately from a resource's name. */
export function canonicalPublicEstimatePendingRowTitleRu(value: string): string {
  const title = value.replace(/^Требует проверки в проекте\s*[—–-]\s*/iu, '').trim();
  return title === value ? value : title.charAt(0).toLocaleUpperCase('ru-RU') + title.slice(1);
}

export function canonicalPublicEstimateRequestTextRu(value: string): string {
  const edited = value.replace(/Кровельные(?:\s+световые)?\s+фонари\s+VELUX\s+CFP\s+100100\s*(?:[—–]\s*предварительный состав)?/giu,
    'Окна в крыше');
  const result = canonicalPublicEstimateTextRu(edited);
  return edited === value ? result : cleanEditedPublicTextRu(result);
}

export function canonicalPublicEstimateChoiceLabelRu(value: string): string {
  if(value===concreteBaseFacts.conditionsValue){
    return 'Разбираются отдельные участки бетонного основания пневматическим инструментом. Объём измерен; спуск через окно в лотках и перемещение до 130 м, в том числе до 50 м от объекта.';
  }
  const concreteBase=concreteBaseFacts.types.find(type=>type.materialRu===value);
  if(concreteBase)return concreteBase.materialRu.replace(/ по46-04-009-0[12]$/u,'');
  if (value === aggressiveFloorFacts.workScopeValue) {
    return 'Цементное или бетонное покрытие из кислото- или жароупорного бетона в агрессивной среде. Разборка отдельных мест пневмомеханизмами, спуск через окно в лотках, перемещение до 130 м, в том числе до 50 м от объекта.';
  }
  const edited = value.replace('VELUX CFP Q 73FQV 100100 + ISD 100100 0010',
    'Неоткрывающееся окно с прозрачным куполом, проём 100 × 100 см');
  const result = canonicalPublicEstimateTextRu(edited);
  return edited === value ? result : cleanEditedPublicTextRu(result);
}

export function canonicalPublicEstimateParameterTitleRu(parameterId: string, titleRu: string): string {
  // Area is a separate object measurement. The legacy rate's base thickness
  // does not describe the observed thickness entered in another field.
  if (parameterId === 'floor_covering_area_m2'
    && /^Площадь цементного или бетонного покрытия пола толщиной 25 мм(?:\s|$)/u.test(titleRu)) {
    return titleRu.replace(' толщиной 25 мм', '');
  }
  if (parameterId === 'lantern_model') return 'Исполнение окна';
  if (parameterId === 'lantern_count') return 'Количество одинаковых окон';
  return canonicalPublicEstimateTextRu(titleRu)
    .replace('Доступно на объекте: основания CFP', 'Основания окон, которые уже есть')
    .replace('Сохранить в запасе: основания CFP', 'Основания окон, которые оставить в запасе')
    .replace('Доступно на объекте: купола ISD', 'Прозрачные купола, которые уже есть')
    .replace('Сохранить в запасе: купола ISD', 'Прозрачные купола, которые оставить в запасе');
}

export function canonicalPublicEstimateWorkTitleRu(value: string): string {
  if (/кровельн[а-яё]*\s+(?:светов[а-яё]*\s+)?фонар.*\bCFP\s+100100\b/iu.test(value)) {
    const quantity = value.match(/\s*[—–]\s*\d[\d\s,.]*\s*(?:шт\.?|м²|м2)\s*$/u)?.[0] ?? '';
    return `Окна в крыше${quantity}`;
  }
  return canonicalPublicEstimateTextRu(value);
}

export function canonicalPublicEstimateRowNameRu(input: {
  rowId?: string | null; titleRu: string; sourceTitleRu?: string; manualTitleOverride?: boolean;
}): string {
  if (input.manualTitleOverride) return input.titleRu;
  if (input.rowId?.startsWith('f09:asphalt_floor_covering_demolition:')) {
    return canonicalPublicEstimateTextRu(input.titleRu
      .replace('со снятой асфальтовым', 'со снятым асфальтовым')
      .replace('приём снятой асфальтового', 'приём снятого асфальтового'));
  }
  const authored = publicBindings.bindings.find(binding => binding.rowId === input.rowId
    && binding.sourceTitleRu === (input.sourceTitleRu ?? input.titleRu));
  if (authored) return authored.nameRu;
  return canonicalPublicEstimateTextRu(input.titleRu);
}
