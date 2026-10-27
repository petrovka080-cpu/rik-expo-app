import type { AutomaticInclusionCondition, AutomaticParameterSpec, AutomaticRowSpec } from "./automaticConstructionOwnerR1";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";

/** SAME AutomaticOwner resources. Actual gross consumption separates original
 * assembly/disassembly, every placement/extraction and whole-group calendar
 * service. No maker rate, guessed damage, kit hardware purchase or return of
 * dirty used wipes into compatible unused stock. Actual compatibility, all
 * losses and exclusive cost/stock allocations belong to the project programme.
 */
export const ROAD_CROSSING_SLEEVES_SHORING_CONSUMABLE_MODES_R1 = Object.freeze({
  separate: "Отдельные фактически совместимые расходники только этой программы, исключённые из аренды/работ/техники/других поставок",
  otherParty: "Весь этот фактический расходник обеспечивает другая сторона без отдельной закупки исполнителем",
});
export const ROAD_CROSSING_SLEEVES_SHORING_CONSUMABLE_BASIS_R1 = "Только новый отдельный заказ этого совместимого расходника в полной поставочной упаковке; без уже выделенного запаса, работ, техники/энергии, аренды, доставки, отходов и второй покупки включённых деталей крепления";
type Scope = Readonly<{ key: string; title: string; selected: AutomaticInclusionCondition; facts: readonly string[];
  kitCountId: string; cyclesId: string; calendarId: string }>;
const materials = [
  { key: "lubricant", title: "совместимая смазка деталей крепления, не топливо/энергия или обслуживание других механизмов", unit: "kg", rateUnit: "kg" },
  { key: "cleaner", title: "совместимый очиститель деталей крепления", unit: "l", rateUnit: "l" },
  { key: "wipes", title: "одноразовые обтирочные материалы крепления, целые новые изделия", unit: "piece", rateUnit: "piece" },
] as const;
export function buildRoadCrossingSleevesShoringConsumablesR1(scopes: readonly Scope[]): Readonly<{
  parameters: readonly AutomaticParameterSpec[]; rows: readonly AutomaticRowSpec[];
  cargos: readonly Readonly<{ key: string; title: string; rowId: string; stockId: string; unit: "kg" | "l" | "piece"; quantum: string }>[];
}> {
  const branches = scopes.flatMap(scope => materials.map(material => {
    const id = (suffix: string) => `rcs_shoring_material_${scope.key}_${material.key}_${suffix}`;
    const weighted = `${scope.kitCountId}*${id("gross_per_initial_kit")}+${scope.cyclesId}*${id("gross_per_placement_cycle")}+${scope.calendarId}*${id("gross_per_group_calendar_hour")}`;
    const consumed = material.unit === "piece" ? `ceil(${weighted})` : weighted;
    const positive: AutomaticInclusionCondition = { kind: "and", operands: [scope.selected,
      { kind: "formula_greater_than", expression: consumed, unitId: material.unit, value: 0 }] };
    const own: AutomaticInclusionCondition = { kind: "and", operands: [positive,
      { kind: "equals", parameterId: id("mode"), value: ROAD_CROSSING_SLEEVES_SHORING_CONSUMABLE_MODES_R1.separate }] };
    const facts = [...scope.facts, ...[scope.kitCountId, scope.cyclesId, scope.calendarId].flatMap(expression => compileFormulaGraph(expression).inputParameterIds), id("program_and_compatibility_reference"),
      id("gross_per_initial_kit"), id("gross_per_placement_cycle"), id("gross_per_group_calendar_hour")];
    const purchaseFacts = [...facts, id("mode"), id("product_designation"), id("cost_basis"), id("compatible_unused_stock"), id("retained_reserve"), id("supplier_pack_net")];
    const need = `max(0,(${consumed})+${id("retained_reserve")}-${id("compatible_unused_stock")})`, packs = `ceil((${need})/${id("supplier_pack_net")})`;
    const ordered = `(${packs})*${id("supplier_pack_net")}`, remaining = `${id("compatible_unused_stock")}+(${ordered})-(${consumed})`;
    return { scope, material, id, consumed, positive, own, facts, purchaseFacts, need, packs, ordered, remaining };
  }));
  const parameters: AutomaticParameterSpec[] = branches.flatMap(({ scope, material, id, positive, own }) => {
    const title = `${scope.title}: ${material.title}`;
    return [
      { id: id("program_and_compatibility_reference"), title: `${title}: фактическая применимость/совместимость и полная исключительная программа с валовым расходом/потерями по всем этапам; явные нули подтверждают отсутствие расхода, обслуживание другой техники/топливо не повторяются`,
        valueType: "text", unitId: null, kind: "conditional", requiredWhen: scope.selected } as AutomaticParameterSpec,
      ...[ ["gross_per_initial_kit", "валовой расход сборки и окончательной разборки одного исходного комплекта вместе", `${material.rateUnit}_per_piece`],
        ["gross_per_placement_cycle", "валовой расход одной полной установки/перестановки и её извлечения вместе", `${material.rateUnit}_per_piece`],
        ["gross_per_group_calendar_hour", "валовой расход обслуживания ВСЕЙ группы за календарный час, не на каждый комплект", `${material.rateUnit}_per_hour`] ]
        .map(([suffix, caption, unitId]): AutomaticParameterSpec => ({ id: id(suffix), title: `${title}: ${caption}, включая все фактические потери; не универсальная норма`,
          valueType: "decimal", unitId, min: 0, kind: "conditional", requiredWhen: scope.selected })),
      { id: id("mode"), title: `${title}: фактическая граница обеспечения`, valueType: "enum", unitId: null,
        values: Object.values(ROAD_CROSSING_SLEEVES_SHORING_CONSUMABLE_MODES_R1), kind: "conditional", requiredWhen: positive } as AutomaticParameterSpec,
      { id: id("product_designation"), title: `${title}: фактическое совместимое изделие/продукт и состояние пригодного запаса`, valueType: "text", unitId: null,
        kind: "conditional", requiredWhen: positive } as AutomaticParameterSpec,
      ...[ ["compatible_unused_stock", "пригодный НЕИСПОЛЬЗОВАННЫЙ исключительно выделенный запас до программы; не ожидаемый возврат использованных материалов", 0],
        ["retained_reserve", "сохраняемый пригодный резерв", 0], ["supplier_pack_net", "фактическое нетто одной полной новой поставочной упаковки", material.unit === "piece" ? 1 : 0.000_001] ]
        .map(([suffix, caption, min]): AutomaticParameterSpec => ({ id: id(String(suffix)), title: `${title}: ${caption}`, valueType: material.unit === "piece" ? "integer" : "decimal",
          unitId: material.unit, min: Number(min), kind: "conditional", requiredWhen: own })),
      { id: id("cost_basis"), title: `${title}: граница нового отдельного заказа`, valueType: "enum", unitId: null,
        values: [ROAD_CROSSING_SLEEVES_SHORING_CONSUMABLE_BASIS_R1], kind: "conditional", requiredWhen: own } as AutomaticParameterSpec,
    ];
  });
  const rows: AutomaticRowSpec[] = branches.flatMap(({ scope, material, id, consumed, positive, own, facts, purchaseFacts, need, packs, ordered, remaining }) => {
    const row = (suffix: string, caption: string, expression: string, unitId: string, extra: Partial<AutomaticRowSpec> = {}): AutomaticRowSpec => ({
      rowId: `rcs:shoring-material:${scope.key}:${material.key}:${suffix}`, formulaId: `rcs:shoring-material:${scope.key}:${material.key}:${suffix}`,
      section: `${scope.title}: расходники всей программы`, category: "material", title: `${material.title}: ${caption}`, expression, unitId,
      inclusion: own, costTreatment: "INFORMATIONAL_SCOPE", inputParameterIds: purchaseFacts, ...extra });
    return [
      row("consumed", "валовой расход всей программы сборки/установок/извлечений/обслуживания/разборки, целые одноразовые изделия округлены один раз", consumed, material.unit,
        { inclusion: scope.selected, inputParameterIds: facts }),
      ...[ ["need_before_pack", "дефицит до новой поставочной упаковки", need, material.unit], ["supplier_pack_count", "целые новые поставочные упаковки", packs, "package"],
        ["ordered", "новый отдельный заказ совместимого материала", ordered, material.unit], ["remaining_unused", "пригодный неиспользованный остаток с сохраняемым резервом", remaining, material.unit],
        ["free_unused_beyond_reserve", "свободный пригодный неиспользованный остаток сверх резерва", `(${remaining})-${id("retained_reserve")}`, material.unit] ]
        .map(([suffix, caption, expression, unitId]) => row(suffix, caption, expression, unitId, suffix === "ordered" ? {
          costTreatment: "OWN_COST", procurement: true, titleParameterIds: [id("product_designation")] } : {})),
      row("provided_by_other_party", "весь положительный расход предоставляется отдельно другой стороной без закупки исполнителем", consumed, material.unit, {
        inclusion: { kind: "and", operands: [positive, { kind: "equals", parameterId: id("mode"), value: ROAD_CROSSING_SLEEVES_SHORING_CONSUMABLE_MODES_R1.otherParty }] },
        inputParameterIds: [...facts, id("mode"), id("product_designation")] }),
    ];
  });
  return Object.freeze({ parameters: Object.freeze(parameters), rows: Object.freeze(rows), cargos: Object.freeze(branches.map(({ scope, material, id }) => Object.freeze({
    key: `shoring_${scope.key}_${material.key}`, title: `${scope.title}: ${material.title}`, rowId: `rcs:shoring-material:${scope.key}:${material.key}:ordered`,
    stockId: id("compatible_unused_stock"), unit: material.unit, quantum: id("supplier_pack_net"),
  }))) });
}
