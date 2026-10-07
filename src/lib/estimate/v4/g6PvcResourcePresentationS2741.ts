import type { AutomaticOwnerDefinition } from './automaticConstructionOwnerR1';
import type { CanonicalPublicResourcePresentationV1 } from '../backendPlatform/canonicalPublicResourcePresentationV1';
import { estimateDeterministicHash } from '../estimateDeterministicHash';
import sourceBindings from '../../../../data/estimate-benchmarks/source-packs/g6-pvc-resource-presentation-source-bindings-s27-41.json';

type Label = readonly [nameRu: string, brandAndModelRu: string | null, detailsRu?: readonly string[]];
// Only selected, existing G6 resource identities. Brands and dimensions are
// copied from their source definitions; unknown specifications stay unknown.
const labels: Record<string, Label> = {
  'pvc-roof:material:field': ['Мембрана кровельная ПВХ, армированная, 1,2 мм', 'LOGICROOF V-RP', ['Технический лист 2.01, 03.2026. Нормативная площадь требует проверки раскладки.']],
  'pvc-roof:material:detail': ['Мембрана ПВХ неармированная, 1,5 мм', 'LOGICROOF V-SR', ['Технический лист 2.33, 03.2026. Местное усиление Т-стыков; примыкания отдельно.']],
  'pvc-roof:material:dornit': ['Геотекстиль нетканый, 300 г/м²', 'Дорнит', ['Разделительный слой; совместимость основания проверить.']],
  'pvc-roof:material:screw': ['Саморез остроконечный, 4,8×70 мм', null, ['Нормативный бюджет требует проверки ветровой схемы.']],
  'pvc-roof:material:roof-dowel': ['Дюбель кровельный полипропиленовый, 50×15×150 мм', null, ['Отдельно от винта; применимость длины проверить.']],
  'pvc-roof:material:anchor': ['Дюбель распорный полиэтиленовый, 6×40 мм', null, ['Исходная норма 0,4 десятка: 4 шт. на 100 м².']],
  'pvc-roof:material:cleaner': ['Очиститель для ПВХ-мембран', 'ТЕХНОНИКОЛЬ', ['250 г/м² обмеренной обработки. Канистра 3 л; перевод по подтверждённой плотности.']],
  'pvc-roof:material:cleaner-volume-472219': ['Очиститель для ПВХ-мембран', 'ТЕХНОНИКОЛЬ, ЕКН 472219', ['Объёмная версия: 0,25 л/м² по выбранной листовке, канистра 3 л. Поставленную версию подтвердить.']],
  'pvc-roof:labor:workers': ['Труд монтажников', null],
  'pvc-roof:scope:operators': ['Труд машинистов', null],
  'pvc-roof:work:labor-rate': ['Монтаж: труд и включённая оснастка', null],
  'pvc-roof:machine:tower8t': ['Кран башенный, 8 т', null],
  'pvc-roof:machine:truckCrane10t': ['Кран автомобильный, 10 т', null],
  'pvc-roof:machine:screwdriver': ['Шуруповёрт', null],
  'pvc-roof:machine:variant4_6kw': ['Аппарат автоматической сварки горячим воздухом, 4,6 кВт', 'Leister Variant V'],
  'pvc-roof:machine:hammer': ['Перфоратор электрический', null],
  'pvc-roof:machine:triac1_6kw': ['Фен сварочный, 1,6 кВт', 'TRIAC'],
  'pvc-roof:machine:lorry5t': ['Автомобиль бортовой до 5 т', null],
  'transition:material:tape': ['Лента переходная ПВХ битумостойкая, армированная, с геотекстилем', 'LOGICROOF Tape PVC-B'],
  'transition:material:adhesive22': ['Мастика для временного перехода', 'ТЕХНОНИКОЛЬ №22'],
  'transition:material:adhesive23': ['Мастика для временного перехода', 'ТЕХНОНИКОЛЬ Фиксер №23'],
  'transition:material:hot_mastic': ['Мастика битумная горячая для постоянного перехода', 'ТЕХНОНИКОЛЬ'],
  'transition:material:hot_bitumen': ['Битум горячий для постоянного перехода', 'БН 90-10'],
  'transition:material:plate_holder': ['Держатель тарельчатый для переходной ленты', null],
  'transition:material:telescopic_holder': ['Элемент телескопический для переходной ленты', null],
  'transition:material:screw': ['Саморез для крепления переходной ленты', null],
  'transition:material:separation': ['Геотекстиль термообработанный для разделения ПВХ и битума, не менее 300 г/м²', null],
  'transition:material:uv_grit': ['Посыпка для защиты открытой мастики от ультрафиолета', null],
  'transition:material:uv_band': ['Полоса битумная или битумно-полимерная для защиты от ультрафиолета', null],
  'transition:material:liquid_pvc': ['Жидкий ПВХ совместимой системы', null],
  'transition:labor:worker': ['Труд монтажников переходной ленты', null],
  'transition:work:labor-rate': ['Переход: труд и включённая оснастка', null],
};
const tools: Record<string, string> = { knife: 'Нож монтажный для раскроя мембраны', scissors: 'Ножницы для раскроя мембраны',
  'hand-roller': 'Ролик силиконовый для прикатки сварного шва', probe: 'Щуп для проверки сварного шва', tape: 'Рулетка для разметки',
  'white-cloth': 'Ткань безворсовая белая для подготовки сварных зон', gloves: 'Перчатки рабочие', goggles: 'Очки защитные' };
for (const [key, title] of Object.entries(tools)) labels['pvc-roof:tool:'+key] = [title, null];

export function withG6PvcResourcePresentationS2741(base: AutomaticOwnerDefinition): AutomaticOwnerDefinition {
  return Object.freeze({ ...base, resources: base.resources.map(row => {
    const label = labels[row.row_id];
    const acceptedTitles = (sourceBindings.sourceTitlesByRowId as Record<string, string[]>)[row.row_id];
    if (!label || !acceptedTitles?.includes(row.title_ru)) return row;
    // Keep the complete original specification accessible, including labour
    // sources, inclusions, tooling assumptions and source-version restrictions.
    const descriptor: CanonicalPublicResourcePresentationV1 = { contractVersion: 'canonical-public-resource-presentation/v1',
      sourceTitleRu: row.title_ru, nameRu: label[0], brandAndModelRu: label[1], specificationRu: null, detailsRu: label[2] ?? [row.title_ru] };
    const parameterLabels = row.row_id === 'transition:material:tape'
      ? { titleSpecificationParameterLabelsRu: { tape_width_mm: 'Ширина (мм)', tape_thickness_mm: 'Толщина (мм)', tape_roll_length_m: 'Длина рулона (м)' } }
      : {};
    const presented = { ...row, resource_graph: { ...row.resource_graph, ...parameterLabels, publicResourcePresentationV1: descriptor }, row_sha256: '' };
    presented.row_sha256 = estimateDeterministicHash(presented); return presented;
  }) });
}
