import publicBindings from '../../../../data/estimate-benchmarks/source-packs/public-estimate-language-s27-50.json';
import simpleResourceBindings from '../../../../data/estimate-benchmarks/source-packs/public-subwork-resource-presentation-r2.json';
import aggressiveFloorFacts from '../../../../data/estimate-benchmarks/source-packs/aggressive-floor-actual-thickness-four-s27-69.json';
import concreteBaseFacts from '../../../../data/estimate-benchmarks/source-packs/concrete-floor-base-demolition-s27-54.json';
import { canonicalPublicEstimateInputWordingRu, type CanonicalPublicInputContext } from './canonicalPublicEstimateInputWordingRu';
import type { CanonicalEstimateOperationReference } from './canonicalEstimateOperationComposition';

/** Public wording only. Saved product/source identities and calculation inputs
 * remain unchanged. Brand recommendations are not enabled. */
function cleanEditedPublicTextRu(value: string): string {
  return value.replace(/\s{2,}/gu, ' ').replace(/\s+([,;])/gu, '$1').trim();
}

export function canonicalPublicEstimateFixtureTextRu(value: string): string {
  // Internal fixture annotations are not product names or supplier evidence.
  // Keep the public distinction between an example and confirmed object facts;
  // never rewrite saved input, source identities or ordinary model/SKU text.
  const edited = value
    .replace(/(?:\bCONTROL_ONLY(?:\s+QA)?|Проверочный\s+пример)\s+exact source-compatible supply(?:,?\s+not (?:an actual )?supplier offer)?\b/giu,
      'Проверочный пример; поставка не подтверждена')
    .replace(/\bCONTROL_ONLY\s+QA\s+exact source-compatible supply, not supplier offer\b/giu,
      'Проверочный пример; поставка не подтверждена')
    .replace(/\bCONTROL_ONLY\s+QA\s+source-compatible project reference\b/giu,
      'Проверочный пример; проектный документ не подтверждён')
    .replace(/\bCONTROL_ONLY\s+QA\s+consignment document\s+([A-Z0-9-]+);\s*not actual shipment\b/giu,
      'Проверочный пример $1; фактическая доставка не подтверждена')
    .replace(/\bCONTROL_ONLY\s+QA:\s*not an actual contract or supplier order\b/giu,
      'Проверочный пример; договор и заказ поставщику не подтверждены')
    .replace(/\b(?:CONTROL_ONLY|VALIDATION_FIXTURE(?:_ONLY)?|FIXTURE_ONLY|TEST_ONLY)(?:[ _-]+QA)?\b/giu,
      'Проверочный пример');
  return edited === value ? value : cleanEditedPublicTextRu(edited);
}

// Whole accepted components can retain their exact source title under a new
// row namespace. These functional names apply to that title in every public
// view; source descriptors and explicit manual titles remain independent.
const functionalReusableResourceNamesRu = new Map<string,string>([
  ['Измеренная площадь контакта опалубки с бетоном по RICS NRM 2','Измеренная площадь контакта опалубки с бетоном'],
  ['Измеренная площадь контакта горизонтальной опалубки с бетоном по RICS NRM 2','Измеренная площадь контакта горизонтальной опалубки с бетоном'],
  ['Щиты рамной опалубки Doka Frami Xlife','Щиты рамной опалубки'],
  ['Угловые элементы Doka Frami Xlife','Угловые элементы рамной опалубки'],
  ['Соединители щитов Doka Frami','Соединители щитов рамной опалубки'],
  ['Плоская стяжка Frami 10–80 см, артикул 588475000','Плоская стяжка для опалубки, 10–80 см'],
  ['Зажим плоской стяжки Frami, артикул 588434000','Зажим плоской стяжки опалубки'],
  ['Фундаментный зажим Frami, артикул 588452000','Фундаментный зажим опалубки'],
  ['Подкосы Doka 260 для выверки щитов','Подкосы для выверки щитов'],
  ['Перфорированная лента Frami 50×2 мм, артикул 588206000','Перфорированная лента для опалубки, 50 × 2 мм'],
]);

// Exact existing resource identities. A selected project specification is kept
// in source details; its physical dimensions remain in the functional name.
// This is a display projection, never a material or compatibility substitution.
const projectFormworkResourceNamesRu: readonly (readonly [string,string,string])[] = [
  ['equipment:formwork:dokaflex-3so-sheets-rental','Опалубочные листы Doka 3-SO','Опалубочные листы'],
  ['equipment:formwork:dokaflex-primary-beams-rental','Главные балки Doka H20','Главные балки опалубки'],
  ['equipment:formwork:dokaflex-secondary-beams-rental','Второстепенные балки Doka H20','Второстепенные балки опалубки'],
  ['equipment:formwork:dokaflex-floor-props-rental','Стойки перекрытия Doka Eurex','Стойки перекрытия'],
  ['equipment:formwork:dokaflex-lowering-heads-rental','Опускные головки Doka H20, артикул 586174000','Опускные головки для балок опалубки'],
  ['equipment:formwork:dokaflex-supporting-heads-rental','Поддерживающие головки Doka H20 DF, артикул 586179000','Поддерживающие головки для балок опалубки'],
  ['equipment:formwork:dokaflex-tripods-rental','Съёмные треноги Doka для стоек перекрытия','Съёмные треноги для стоек перекрытия'],
  ['equipment:formwork:dokaflex-secondary-beam-stabilizers-rental','Стабилизаторы второстепенных балок Doka','Стабилизаторы второстепенных балок опалубки'],
  ['equipment:formwork:dokaflex-floor-end-shutter-rental','Торцевая опалубка плиты Doka','Торцевая опалубка плиты'],
  ['equipment:formwork:dokaflex-edge-protection-rental','Защита открытых кромок плиты','Защита открытых кромок плиты'],
  ['material:formwork:dokaflex-project-fixings','Монтажный крепёж и расходные материалы по ведомости','Монтажный крепёж и расходные материалы'],
  ['material:formwork:dokaflex-release-agent','Разделительный состав для опалубочных листов','Разделительный состав для опалубочных листов'],
  ['delivery:formwork:dokaflex-outbound-kit','Доставка комплекта Dokaflex на объект','Доставка комплекта опалубки на объект'],
  ['delivery:formwork:dokaflex-return-kit','Возврат арендного комплекта Dokaflex поставщику','Возврат арендного комплекта опалубки поставщику'],
];

function projectFormworkResourcePresentationRu(input: {rowId?:string|null;titleRu:string;sourceTitleRu?:string}) {
  const source=input.sourceTitleRu??input.titleRu;
  const binding=projectFormworkResourceNamesRu.find(([rowId,title])=>rowId===input.rowId
    && (source===title||source.startsWith(title+' — ')));
  if(!binding)return null;
  const [,base,name]=binding;
  if(source===base)return{nameRu:name,detailsRu:[source]};
  const selected=source.slice(base.length+3);
  // Only registered commercial wording and explicit document-reference tails
  // are removed. Other selected characteristics are retained verbatim.
  const specification=cleanEditedPublicTextRu(selected
    .replace(/Doka floor end-shutter clamp 586239000/gu,'зажим торцевой опалубки')
    .replace(/для Doka 3-SO/gu,'для опалубочных листов')
    .replace(/Doka XP/gu,'стоечное ограждение')
    .replace(/Doka (?:3-SO|H20(?: top)?|Eurex)/gu,'')
    .replace(/\s+(?:по\s+(?:ведомости|раскладке|предложению\s+поставщика|плану\s+защиты\s+кромок)|и\s+расч[её]ту)(?=\s|$).*$/u,'')
    .replace(/,\s*(?:главная|второстепенная) балка$/u,'')
    .replace(/^[\s,;—-]+|[\s,;—-]+$/gu,''));
  return{nameRu:specification&&specification.toLocaleLowerCase('ru-RU')!==name.toLocaleLowerCase('ru-RU')
    ?name+', '+specification:name,detailsRu:[selected]};
}

/** These authored names already contain the selected physical specification.
 * The original commercial selection remains available in source details. */
export function canonicalPublicEstimateSelectedSpecificationIsInRowNameRu(input: {
  rowId?:string|null;titleRu:string;sourceTitleRu?:string;manualTitleOverride?:boolean;
}): boolean {
  return input.manualTitleOverride !== true && projectFormworkResourcePresentationRu(input) !== null;
}

export function canonicalPublicEstimateTextRu(value: string): string {
  const reusableName = functionalReusableResourceNamesRu.get(value);
  if (reusableName) return reusableName;
  const edited = canonicalPublicEstimateFixtureTextRu(value).replace(/для\s+LOGICROOF/giu, 'для выбранной кровельной мембраны')
    .replaceAll('Утверждённая новая atomic граница и судьба прежних 59 строк без переписывания истории',
      'Подтверждённый состав и границы подработы')
    .replaceAll('Подтверждённая отдельная физическая граница этой atomic работы: без уже оплаченного объёма укладки или полной конструкции',
      'Отдельный объём подработы без повторного учёта ранее оплаченных работ')
    .replace(/\bLeister\s+Variant\s+V\b/giu, '')
    .replace(/\b(?:VELUX|VALTEC|fischer|LOGICROOF|Leister)\b/giu, '');
  return edited === value ? value : cleanEditedPublicTextRu(edited);
}

/** The calculation status is shown separately from a resource's name. */
export function canonicalPublicEstimatePendingRowTitleRu(value: string): string {
  const title = canonicalPublicEstimateTextRu(value).replace(/^Требует проверки в проекте\s*[—–-]\s*/iu, '').trim();
  return title === value ? value : title.charAt(0).toLocaleUpperCase('ru-RU') + title.slice(1);
}

export function canonicalPublicEstimateRequestTextRu(value: string): string {
  const edited = value.replace(/Кровельные(?:\s+световые)?\s+фонари\s+VELUX\s+CFP\s+100100\s*(?:[—–]\s*предварительный состав)?/giu,
    'Окна в крыше');
  const result = canonicalPublicEstimateTextRu(edited);
  return edited === value ? result : cleanEditedPublicTextRu(result);
}

export function canonicalPublicEstimateChoiceLabelRu(value: string, sourceValue?: unknown): string {
  const authored = publicBindings.choiceBindings.find(binding => binding.sourceValue === (typeof sourceValue === 'string' ? sourceValue : value)
    && (!('fallbackOnly' in binding) || binding.fallbackOnly !== true
      || value === binding.sourceValue || value === 'Вариант по проектной документации'));
  if (authored) return authored.nameRu;
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

// Exact source labels only: public wording must not rewrite saved facts,
// manufacturer applicability or a different field with the same ID.
const functionalParameterBindings = [
  {parameterId:'q',sourceTitleRu:'Площадь работ, м² (CT54 — за вычетом проёмов)',nameRu:'Площадь окраски фасада за вычетом проёмов, м²'},
  {parameterId:'ct54_15l_stock_cans',sourceTitleRu:'Пригодное наличие целых канистр CT54 15л выбранного цвета и партии',nameRu:'Пригодные целые канистры фасадной краски по 15 л выбранного цвета и партии'},
  {parameterId:'ct54_15l_reserve_cans',sourceTitleRu:'Сохраняемый резерв целых канистр CT54 15л',nameRu:'Целые канистры фасадной краски по 15 л, которые оставить в запасе'},
  {parameterId:'ct54_15l_supplier_can_multiple',sourceTitleRu:'Кратность поставщика в канистрах CT54 15л',nameRu:'Кратность поставки фасадной краски в канистрах по 15 л'},
  {parameterId:"light_colour_scope",sourceTitleRu:"Белая или светлая CT54 одной партии",nameRu:"Белая или светлая фасадная краска одной партии"},
  {parameterId:"colour_batch_reference",sourceTitleRu:"Выбранные цвет, поставленная версия CT54 и одна партия на плоскость",nameRu:"Выбранные цвет, версия фасадной краски и одна партия на плоскость"},
  {parameterId:"selected_paint_can_l",sourceTitleRu:"Размер канистры CT54, л",nameRu:"Объём канистры фасадной краски, л"},
  {parameterId:"ct54_3_5l_stock_cans",sourceTitleRu:"Пригодное наличие целых канистр CT54 3.5л выбранного цвета и партии",nameRu:"Пригодные целые канистры фасадной краски по 3,5 л выбранного цвета и партии"},
  {parameterId:"ct54_3_5l_reserve_cans",sourceTitleRu:"Сохраняемый резерв целых канистр CT54 3.5л",nameRu:"Целые канистры фасадной краски по 3,5 л, которые оставить в запасе"},
  {parameterId:"ct54_3_5l_supplier_can_multiple",sourceTitleRu:"Кратность поставщика в канистрах CT54 3.5л",nameRu:"Кратность поставки фасадной краски в канистрах по 3,5 л"},
  {parameterId:"ct54_3_5l_stock_compatibility_reference",sourceTitleRu:"Пригодность наличия CT54 3.5л: тот же цвет, партия, срок и состояние",nameRu:"Пригодность имеющейся фасадной краски по 3,5 л: цвет, партия, срок и состояние"},
  {parameterId:"ct54_15l_stock_compatibility_reference",sourceTitleRu:"Пригодность наличия CT54 15л: тот же цвет, партия, срок и состояние",nameRu:"Пригодность имеющейся фасадной краски по 15 л: цвет, партия, срок и состояние"},
  {parameterId:"open_qty_mixer_provision",sourceTitleRu:"Электрическая дрель с насадкой-миксером для перемешивания готовой CT54 — обеспечение и часы не определены",nameRu:"Дрель с насадкой для перемешивания готовой фасадной краски"},
  {parameterId:"open_qty_brush",sourceTitleRu:"Кисть для ручного нанесения силикатной CT54 — выбранный инструмент, количество не определено",nameRu:"Кисть для ручного нанесения силикатной фасадной краски"},
  {parameterId:"open_qty_roller",sourceTitleRu:"Валик для ручного нанесения силикатной CT54 — выбранный инструмент, количество не определено",nameRu:"Валик для ручного нанесения силикатной фасадной краски"},
  {parameterId:"open_qty_protection_tape",sourceTitleRu:"Малярная лента для крепления укрытия при CT54 — ширина, совместимость и длина не определены",nameRu:"Малярная лента для крепления укрытия"},
  {parameterId:"open_qty_eye_protection",sourceTitleRu:"Защитные очки от брызг щелочной CT54 — исполнение и обеспечение не определены",nameRu:"Защитные очки от брызг щелочной фасадной краски"},
  {parameterId:"open_qty_skin_protection",sourceTitleRu:"Перчатки и защитная одежда от контакта кожи с CT54 — состав и обеспечение не определены",nameRu:"Перчатки и защитная одежда для работы с фасадной краской"},
  {parameterId:"open_qty_weather_protection",sourceTitleRu:"Обеспечение защиты фасада CT54 от солнца и дождя до высыхания — принятый способ, объём оплаты не определён",nameRu:"Защита окрашенного фасада от солнца и дождя до высыхания"},
  {parameterId:"open_qty_cleaning_water",sourceTitleRu:"Чистая вода очистки инструмента после CT54 — расход не опубликован",nameRu:"Чистая вода для очистки инструмента после фасадной краски"},
  {parameterId:"open_qty_quality_completion",sourceTitleRu:"Контроль готовности покрытия CT54 и передача документации сверх основной окраски — отдельный объём не определён",nameRu:"Дополнительный контроль готовности фасадного покрытия и передача документации"},
  {parameterId:"open_qty_extra_logistics",sourceTitleRu:"Дополнительная доставка или разгрузка CT54 сверх включённых машинных операций — отдельная граница и количество не приняты",nameRu:"Дополнительная доставка или разгрузка фасадной краски"},
  {parameterId:"open_qty_cleanup_waste",sourceTitleRu:"Дополнительная уборка зоны CT54 и передача упаковки сверх основной операции — отдельная граница и количество не приняты",nameRu:"Дополнительная уборка и передача упаковки фасадной краски"},
  {parameterId:"effective_resource_quantity_paint_ct54_simple_ready_facade_ct54_3_5l_order",sourceTitleRu:"Принятое количество: Силикатная краска Ceresit CT54 Silicate Aero, канистра 3.5л, один цвет и партия",nameRu:"Принятое количество силикатной фасадной краски в канистрах по 3,5 л одного цвета и партии"},
  {parameterId:"effective_resource_quantity_paint_ct54_simple_ready_facade_ct54_15l_order",sourceTitleRu:"Принятое количество: Силикатная краска Ceresit CT54 Silicate Aero, канистра 15л, один цвет и партия",nameRu:"Принятое количество силикатной фасадной краски в канистрах по 15 л одного цвета и партии"},
  {parameterId:"effective_resource_quantity_paint_ct54_rectangular_protection_film_order",sourceTitleRu:"Принятое количество: Укрытие tesa4369,14м×1,8м с интегрированной верхней лентой — новый заказ в целых рулонах",nameRu:"Принятое количество рулонов укрывной плёнки 14 м × 1,8 м с верхней клейкой лентой"},
  {parameterId:"effective_resource_quantity_paint_ct54_rectangular_protection_tape_order",sourceTitleRu:"Принятое количество: Лента tesa4363,25м×50мм для трёх остальных сторон — новый заказ в целых рулонах",nameRu:"Принятое количество рулонов малярной ленты 25 м × 50 мм для трёх сторон укрытия"},
] as const;

export function canonicalPublicEstimateParameterTitleRu(parameterId: string, titleRu: string, context: CanonicalPublicInputContext = {}): string {
  const simple: Readonly<Record<string,string>> = {
    delivery_payment_scope_reference: 'Что входит в доставку',
    cleaner_designation: 'Средство для очистки',
    cleaner_package_l: 'Объём упаковки очистителя',
    qa_interval_m_check: 'Через сколько метров проверять работу',
  };
  if (simple[parameterId]) return simple[parameterId];
  const authored = publicBindings.parameterBindings.find(binding => binding.parameterId === parameterId
    && (!('catalogId' in binding) || binding.catalogId === context.catalogId)
    && binding.sourceTitleRu === titleRu);
  if (authored) return authored.nameRu;
  const functional = functionalParameterBindings.find(binding => binding.parameterId === parameterId && binding.sourceTitleRu === titleRu);
  if (functional) return functional.nameRu;
  const question = canonicalPublicEstimateInputWordingRu(parameterId, titleRu, context);
  if (question) return question.labelRu;
  if(parameterId==='existing_covering_confirmed'&&titleRu==='На чём выполнено бетонное основание')return 'Какое бетонное основание разбираем';
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

/** Display questions do not change immutable validation or source ownership. */
export function canonicalPublicEstimateParameterGuideRu(parameterId: string, titleRu: string, context: CanonicalPublicInputContext = {}): string | undefined {
  const authored = publicBindings.parameterBindings.find(binding => binding.parameterId === parameterId
    && (!('catalogId' in binding) || binding.catalogId === context.catalogId)
    && (binding.sourceTitleRu === titleRu || binding.nameRu === titleRu));
  return authored && 'guideRu' in authored && typeof authored.guideRu === 'string' ? authored.guideRu
    : canonicalPublicEstimateInputWordingRu(parameterId, titleRu, context)?.guideRu;
}

export function canonicalPublicEstimatePendingRowGuideRu(input: {
  rowId?: string | null; titleRu: string; sourceTitleRu?: string; manualTitleOverride?: boolean;
}): string | undefined {
  if (input.manualTitleOverride) return undefined;
  const authored = publicRowBinding(input);
  return authored && 'pendingGuideRu' in authored && typeof authored.pendingGuideRu === 'string' ? authored.pendingGuideRu : undefined;
}

// Additional operation wording leaves the source-pinned vocabulary and saved
// manufacturer-specific scope intact. All views use this exact title boundary.
const functionalOperationBindings = [
  {sourceTitleRu:'Два слоя CT54 на готовом простом фасаде — шесть существующих типов',nameRu:'Окраска подготовленного цементного фасада в два слоя'},
  {sourceTitleRu:'Окраска простого фасада Ceresit CT54 по готовой цементной штукатурке с готовых лесов, два слоя',nameRu:'Окраска цементной штукатурки фасада в два слоя с готовых лесов'},
  {sourceTitleRu:'Перемешивание готовой CT54',nameRu:'Перемешать готовую фасадную краску'},
  {sourceTitleRu:'Два ручных слоя CT54 — один владелец труда',nameRu:'Нанести фасадную краску в два слоя вручную'},
] as const;

export function canonicalPublicEstimateWorkTitleRu(value: string, options: { manualTitleOverride?: boolean } = {}): string {
  if (options.manualTitleOverride) return canonicalPublicEstimateFixtureTextRu(value);
  // A canonical system measure suffix is presentation only. Older saved
  // revisions retain their original unit ID, title bytes and checksum.
  value = value.replace(/([—–]\s*\d[\d\s\u00a0\u202f.,]*\s+)set(\s*)$/u, '$1компл.$2');
  for (const binding of [...publicBindings.workBindings,...functionalOperationBindings]) {
    if (value === binding.sourceTitleRu) return binding.nameRu;
    if (!value.startsWith(binding.sourceTitleRu)) continue;
    const measure = value.slice(binding.sourceTitleRu.length);
    // Only the system-authored measurement suffix may follow an exact source title.
    // A custom title or a different physical variant remains unchanged.
    if (/^\s*[—–]\s*\d[\d\s\u00a0\u202f.,]*\s*(?:м(?:²|³|2|3)?|m[23]?|шт\.?|pcs|item|компл\.)\s*$/u.test(measure)) {
      return binding.nameRu + measure;
    }
  }
  if (/кровельн[а-яё]*\s+(?:светов[а-яё]*\s+)?фонар.*\bCFP\s+100100\b/iu.test(value)) {
    const quantity = value.match(/\s*[—–]\s*\d[\d\s,.]*\s*(?:шт\.?|м²|м2)\s*$/u)?.[0] ?? '';
    return `Окна в крыше${quantity}`;
  }
  return canonicalPublicEstimateTextRu(value);
}

/** Display a saved operation through the same authored names as estimate/PDF
 * headings. IDs, applicability, owners and the saved graph stay untouched. */
export function canonicalPublicEstimateOperationReferenceRu(operation: CanonicalEstimateOperationReference): CanonicalEstimateOperationReference;
export function canonicalPublicEstimateOperationReferenceRu(operation: CanonicalEstimateOperationReference | null): CanonicalEstimateOperationReference | null;
export function canonicalPublicEstimateOperationReferenceRu(operation: CanonicalEstimateOperationReference | null): CanonicalEstimateOperationReference | null {
  if (!operation) return null;
  return { ...operation,
    groupTitleRu: canonicalPublicEstimateWorkTitleRu(operation.groupTitleRu),
    operationTitleRu: canonicalPublicEstimateWorkTitleRu(operation.operationTitleRu),
    ...(operation.additionalOperations ? { additionalOperations: operation.additionalOperations.map(related => ({ ...related,
      operationTitleRu: canonicalPublicEstimateWorkTitleRu(related.operationTitleRu),
    })) } : {}),
  };
}

export function canonicalPublicEstimateRowNameRu(input: {
  rowId?: string | null; titleRu: string; sourceTitleRu?: string; manualTitleOverride?: boolean;
}): string {
  if (input.manualTitleOverride) return canonicalPublicEstimateFixtureTextRu(input.titleRu);
  const projectResource=projectFormworkResourcePresentationRu(input);
  if(projectResource)return projectResource.nameRu;
  if (input.rowId?.startsWith('f09:asphalt_floor_covering_demolition:')) {
    return canonicalPublicEstimateTextRu(input.titleRu
      .replace('со снятой асфальтовым', 'со снятым асфальтовым')
      .replace('приём снятой асфальтового', 'приём снятого асфальтового'));
  }
  const authored = publicRowBinding(input);
  if (authored) return authored.nameRu;
  return canonicalPublicEstimateTextRu(input.titleRu);
}

/** Details of the same exact authored name; no quantity or source admission. */
export function canonicalPublicEstimateRowDetailsRu(input: {
  rowId?: string | null; titleRu: string; sourceTitleRu?: string; manualTitleOverride?: boolean;
}): readonly string[] {
  if (input.manualTitleOverride) return [];
  const projectResource=projectFormworkResourcePresentationRu(input);
  if(projectResource)return projectResource.detailsRu;
  const authored = publicRowBinding(input);
  return authored?.detailsRu ?? [];
}

function publicRowBinding(input: {rowId?: string | null; titleRu: string; sourceTitleRu?: string}) {
  const matches=(binding:{rowId:string;sourceTitleRu:string})=>binding.rowId === input.rowId
    && (binding.sourceTitleRu === (input.sourceTitleRu ?? input.titleRu)
      // A validated saved descriptor can append a selected specification to its
      // exact original title. Keep that specification in the existing details.
      || binding.sourceTitleRu === input.titleRu
        && input.sourceTitleRu?.startsWith(binding.sourceTitleRu + ' — '));
  return simpleResourceBindings.bindings.find(matches)??publicBindings.bindings.find(matches);
}
