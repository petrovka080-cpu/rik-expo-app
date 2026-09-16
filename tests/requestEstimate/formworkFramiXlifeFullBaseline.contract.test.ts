import { buildCanonicalBaselinePlan } from "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";
import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";
import {
  FORMWORK_FRAMI_XLIFE_EXACT_INPUT,
  FORMWORK_FRAMI_XLIFE_PARAMETERS,
  FORMWORK_FRAMI_XLIFE_PILE_CAP_WET_ZONE_CATALOG_ID,
} from "../../src/lib/estimate/v4/formworkFramiXlifeProjectKitR1";

const FULL_PROJECT_PROMPT = [
  "Опалубка Doka Frami Xlife по RICS NRM 2",
  "измеренная площадь контакта: 100 м²",
  "ссылка на чертёж: ACCEPTANCE-FW-PC-WZ-001-REV-A",
  "тип элемента: Два монолитных свайных ростверка; влажная зона; приёмочный тестовый проект",
  "размеры и количество граней: 2 ростверка 5,0×2,0×0,8 м; измерены 8 вертикальных граней; итог 100 м² по ведомости",
  "отделка: PLAIN",
  "класс геометрии: VERTICAL",
  "стороны опалубки: DOUBLE_SIDED",
  "правило проёмов и пустот: PROJECT_RULE:no openings or voids; DEDUCTION_M2=0",
  "тип опалубки: REMOVABLE",
  "правило измерения проекта: RICS_NRM2_WS11_CONFIRMED:ACCEPTANCE-FW-PC-WZ-001-REV-A",
  "согласование сметчика: ACCEPTANCE-EST-FW-001-REV-A",
  "утверждённая раскладка щитов и комплектующих: ACCEPTANCE-FW-LAYOUT-001-REV-A",
  "согласование раскладки инженером: ACCEPTANCE-FW-ENG-001-REV-A",
  "толщина бетонируемого элемента: 80 см",
  "точный тип и размер щита Frami Xlife: Щит Doka Frami Xlife 0,90×1,50 м по ведомости ACCEPTANCE-FW-LAYOUT-001-REV-A",
  "точный тип углового элемента Frami Xlife: Наружный угловой элемент Doka Frami Xlife по ведомости ACCEPTANCE-FW-LAYOUT-001-REV-A",
  "точный тип соединителя щитов Frami: Зажим соединительный Doka Frami по ведомости ACCEPTANCE-FW-LAYOUT-001-REV-A",
  "щиты Frami Xlife по проектной ведомости: 24 шт",
  "угловые элементы Frami Xlife по проектной ведомости: 8 шт",
  "соединители щитов Frami по проектной ведомости: 64 шт",
  "плоские стяжки Frami 10–80 см по проектной ведомости: 32 шт",
  "зажимы плоских стяжек Frami по проектной ведомости: 64 шт",
  "фундаментные зажимы Frami по проектной ведомости: 32 шт",
  "подкосы для выверки 260 по проектной ведомости: 8 шт",
  "перфорированная лента 50×2 мм по проектной ведомости: 50 м",
  "точный тип ленты для герметизации стыков: Лента ПЭ закрытоячеистая 30×3 мм по проектной ведомости",
  "лента для герметизации стыков по проектной ведомости: 40 м",
  "точный разделительный состав для щитов: Разделительный состав для ламинированной поверхности Xlife по ведомости поставщика",
  "разделительный состав по проектной ведомости: 8 л",
  "приёмка, сортировка и перемещение комплекта: 16 чел·ч",
  "сборка, установка и выверка опалубки: 72 чел·ч",
  "распалубка, очистка и подготовка к возврату: 32 чел·ч",
  "проверка раскладки и ведомости инженером: 1 документ",
  "работа крана на подачу и перестановку: 6 маш·ч",
  "масса отправляемого комплекта: 2,4 т",
  "расстояние доставки на объект: 25 км",
  "расстояние возврата арендного комплекта: 25 км",
  "срок аренды возвратного комплекта: 14 суток",
  "число этапов установки и перестановки: 2 этапа",
  "способ обеспечения возвратного комплекта: аренда с возвратом",
  "способ обеспечения расходных материалов: покупка для проекта",
  "способ привлечения рабочих: отдельная работа подрядчика",
  "способ обеспечения крана: отдельная аренда",
  "способ учёта доставки и возврата: доставка и возврат отдельными рейсами",
  "отдельная рабочая площадка: не требуется для фундамента на уровне земли",
  "отдельная поддерживающая конструкция: не требуется для двухсторонней стяжной опалубки",
  "компенсационная вставка: не требуется: утверждённая раскладка без зазоров",
  "отдельный арендный депозит: не предусмотрен предложением поставщика",
  "отдельная сервисная плата за обслуживание: не предусмотрена: включена в условия возврата",
].join("\n");

function catalog(catalogId = FORMWORK_FRAMI_XLIFE_PILE_CAP_WET_ZONE_CATALOG_ID) {
  return {
    catalogId,
    workKey: "foundation_pile_cap_formwork_wet_zone",
    parameterSchema: FORMWORK_FRAMI_XLIFE_PARAMETERS.map((parameter) => ({
      parameterId: parameter.parameter_id,
      ordinal: parameter.ordinal,
      titleRu: parameter.title_ru,
      valueType: parameter.value_type,
      unitId: parameter.unit_id,
      required: parameter.required,
      defaultValue: parameter.default_value,
      constraints: parameter.constraints_json,
      visibilityRole: parameter.truth_metadata.visibility_role,
      valueSourceRole: parameter.truth_metadata.value_source_role,
      semanticParameterKey: parameter.truth_metadata.semantic_parameter_key,
      preliminaryCompilationAllowed: parameter.truth_metadata.preliminary_compilation_allowed,
    })),
  } as unknown as CanonicalEstimateCatalogItem;
}

describe("ordinary Web baseline for the full Frami Xlife project kit", () => {
  test("maps all 52 confirmed project fields without area-derived kit quantities", () => {
    const plan = buildCanonicalBaselinePlan({
      catalog: catalog(),
      prompt: FULL_PROJECT_PROMPT,
    });

    expect(plan.primaryMeasureParameterId).toBe("measured_formwork_contact_area_m2");
    expect(Object.keys(plan.parameters)).toHaveLength(52);
    expect(plan.parameters).toEqual(FORMWORK_FRAMI_XLIFE_EXACT_INPUT);
    expect(plan.parameters.frami_xlife_panel_count).toBe(24);
    expect(plan.parameters.rental_duration_days).toBe(14);
  });

  test("does not inject the named manufacturer schedule into another catalog", () => {
    expect(() => buildCanonicalBaselinePlan({
      catalog: catalog("canonical-work:base:unrelated-formwork"),
      prompt: FULL_PROJECT_PROMPT,
    })).toThrow("CANONICAL_BASELINE_CONTRACT_MISSING");
  });
});
