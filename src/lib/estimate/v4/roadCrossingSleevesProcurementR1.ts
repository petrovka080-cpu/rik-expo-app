import type { AutomaticParameterSpec, AutomaticRowSpec } from "./automaticConstructionOwnerR1";
import { effectivePurchaseBalanceExpressionsR1 } from "./effectivePurchaseBalanceR1";
import { ROAD_CROSSING_SLEEVES_QUANTITY_EXPRESSIONS_R1 as quantities } from "./roadCrossingSleevesQuantityModelR1";

/** Supply component, not a published/full crossing owner. Actual selected
 * products, compatible stock, quote inclusions and losses are explicit facts;
 * none is a hidden engineering default. Existing FormulaGraph does all math.
 * Tape scope is ONE full-width circumferential course. Narrow/multi-course
 * layouts require their own approved scope, not an inferred consumption rate.
 * https://www.racispacers.com/specifications/ (taping and supplied tape).
 */
export const ROAD_CROSSING_SLEEVES_PROCUREMENT_SCOPE_R1 = Object.freeze({
  fullOwner: false,
  engineeringAccepted: false,
  tapeLayout: "ONE_FULL_WIDTH_COURSE_ONLY",
  suppliedTape: "Confirmed compatible metres per newly ordered element pack; no duplicate purchase",
  endSealFasteners: "Selected kit includes fastening straps; no separate quantity or cost owner",
});

const count = (id: string, title: string, min = 0): AutomaticParameterSpec =>
  ({ id, title, valueType: "integer", unitId: "piece", kind: "ordinary", min });
const length = (id: string, title: string, min = 0): AutomaticParameterSpec =>
  ({ id, title, valueType: "decimal", unitId: "m", kind: "ordinary", min });
const designation = (id: string, title: string): AutomaticParameterSpec =>
  ({ id, title, valueType: "text", unitId: null, kind: "ordinary" });

export const ROAD_CROSSING_SLEEVES_PROCUREMENT_PARAMETERS_R1: readonly AutomaticParameterSpec[] = Object.freeze([
  designation("rcs_raci_element_designation", "Обозначение выбранного совместимого опорного элемента RACI"),
  count("rcs_element_technological_loss_count", "Подтверждённые повреждённые или расходуемые при монтаже элементы"),
  count("rcs_element_retained_spare_count", "Сохраняемый резерв опорных элементов"),
  count("rcs_element_compatible_stock_count", "Целые совместимые опорные элементы в наличии"),
  count("rcs_element_supplier_pack_count", "Опорных элементов в фактической поставочной упаковке", 1),
  designation("rcs_end_seal_kit_designation", "Обозначение совместимого комплекта торцевого уплотнения с включёнными хомутами"),
  count("rcs_end_seal_technological_loss_count", "Подтверждённые расходуемые комплекты торцевого уплотнения"),
  count("rcs_end_seal_retained_spare_count", "Сохраняемый резерв комплектов торцевого уплотнения"),
  count("rcs_end_seal_compatible_stock_count", "Совместимые целые комплекты торцевого уплотнения в наличии"),
  count("rcs_end_seal_supplier_pack_count", "Комплектов торцевого уплотнения в поставочной упаковке", 1),
  designation("rcs_contact_tape_designation", "Обозначение совместимой контактной ленты, включая ленту в комплекте опор"),
  { id: "rcs_raci_ring_width_mm", title: "Ширина выбранного опорного кольца RACI", valueType: "decimal", unitId: "mm", kind: "ordinary", min: 0.000_001 },
  { id: "rcs_contact_tape_width_mm", title: "Ширина выбранной контактной ленты для одного полного прохода", valueType: "decimal", unitId: "mm", kind: "ordinary", min: 0.000_001 },
  length("rcs_tape_provided_m_per_element_pack", "Подтверждённая совместимая лента в одной новой упаковке опор, м"),
  length("rcs_tape_technological_loss_m", "Подтверждённые технологические потери контактной ленты"),
  length("rcs_tape_retained_spare_m", "Сохраняемый резерв контактной ленты"),
  length("rcs_tape_compatible_stock_m", "Совместимая контактная лента в наличии"),
  length("rcs_tape_supplier_roll_length_m", "Длина совместимой ленты в фактическом поставочном рулоне", 0.000_001),
]);

function balance(prefix: string, unitId: string, installed: string, loss: string, spare: string, stock: string, pack: string, provided = "0") {
  const total = `(${installed})+${loss}+${spare}`;
  const need = `max(0,(${total})-${stock}-(${provided}))`;
  const packages = `ceil((${need})/${pack})`;
  const ordered = `(${packages})*${pack}`;
  const effective = effectivePurchaseBalanceExpressionsR1({ ownerRowId: `rcs:${prefix}:ordered`, orderUnitId: unitId,
    consumed: `(${installed})+${loss}`, stock: `${stock}+(${provided})`, reserve: spare, quantum: pack });
  return { owner: effective.owner, expressions: { installed, loss, spare, stock, provided, total, need, packages: effective.packages,
    ordered, remaining: effective.remaining, free: effective.free, consumptionShortage: effective.consumptionShortage, reserveDeficit: effective.reserveDeficit } };
}
const elements = balance("raci-elements", "piece", quantities.raci_installed_element_count,
  "rcs_element_technological_loss_count", "rcs_element_retained_spare_count",
  "rcs_element_compatible_stock_count", "rcs_element_supplier_pack_count");
const seals = balance("end-seal-kits", "piece", quantities.installed_end_seal_kit_count,
  "rcs_end_seal_technological_loss_count", "rcs_end_seal_retained_spare_count",
  "rcs_end_seal_compatible_stock_count", "rcs_end_seal_supplier_pack_count");
// Link the inclusion to the actual NEW pack order, not to installed rings,
// whole stock elements or an unrelated independently submitted tape total.
const providedTape = `(${elements.expressions.packages})*rcs_tape_provided_m_per_element_pack`;
const tape = balance("contact-tape", "m", quantities.raci_installed_contact_tape_length_m,
  "rcs_tape_technological_loss_m", "rcs_tape_retained_spare_m",
  "rcs_tape_compatible_stock_m", "rcs_tape_supplier_roll_length_m", providedTape);

const labels: Record<keyof ReturnType<typeof balance>["expressions"], string> = {
  installed: "Смонтированное количество", loss: "Технологические потери",
  spare: "Сохраняемый резерв", stock: "Совместимое наличие", provided: "Включено в новую поставку опор",
  total: "Общая потребность с потерями и резервом", need: "Дополнительная потребность после наличия и комплектации",
  packages: "Количество новых поставочных упаковок", ordered: "Новый заказ после округления упаковок",
  remaining: "Остаток после монтажа и потерь", free: "Свободный остаток сверх сохраняемого резерва",
  consumptionShortage: "Недостающее количество для монтажа и потерь; закупка не готова", reserveDeficit: "Непокрытый сохраняемый резерв; закупка не готова",
};
function rows(prefix: string, title: string, unitId: string, expressions: ReturnType<typeof balance>,
  titleParameterId: string, inputs: readonly string[]): AutomaticRowSpec[] {
  return (Object.entries(expressions.expressions) as [keyof typeof expressions.expressions, string][])
    .filter(([key]) => key !== "provided" || prefix === "contact-tape")
    .map(([key, expression]) => ({
      rowId: `rcs:${prefix}:${key}`, section: key === "ordered" ? "Материалы дорожного футляра" : `Баланс: ${title}`,
      category: "material", title: key === "ordered" ? title : `${labels[key]}: ${title}`,
      unitId: key === "packages" ? "package" : unitId,
      formulaId: `rcs:${prefix}:${key}`, expression,
      procurement: key === "ordered", costTreatment: key === "ordered" ? "OWN_COST" : "INFORMATIONAL_SCOPE",
      ...(key === "ordered" ? expressions.owner : {}),
      titleParameterIds: [titleParameterId], inputParameterIds: inputs,
    }));
}
const elementProductInputs = ["rcs_casing_inside_diameter_mm", "rcs_carrier_outside_diameter_mm", "rcs_maximum_joint_envelope_diameter_mm", "rcs_raci_selected_element_height_mm"];
export const ROAD_CROSSING_SLEEVES_PROCUREMENT_ROWS_R1: readonly AutomaticRowSpec[] = Object.freeze([
  // An authoritative output bound, rather than a cross-input relation that
  // rejects the whole preliminary estimate when its peer is still unknown.
  // Missing width stays local; a manual control quantity cannot hide failure.
  { rowId: "rcs:contact-tape:width-compatibility", section: "Совместимость контактной ленты", category: "service",
    title: "Превышение ширины контактной ленты над шириной кольца для одного полного прохода",
    unitId: "mm", formulaId: "rcs:contact-tape:width-compatibility", expression: "rcs_contact_tape_width_mm-rcs_raci_ring_width_mm",
    costTreatment: "INFORMATIONAL_SCOPE", formulaOutputBounds: {
      schemaVersion: "canonical_formula_output_bounds_v1", unitId: "mm", minimum: 0,
      reasonRu: "Для одного полного прохода ширина контактной ленты должна быть не меньше ширины выбранного кольца RACI. Для узкой ленты нужна отдельная согласованная схема соседних проходов.",
    } },
  ...rows("raci-elements", "Опорные элементы RACI для выбранной схемы", "piece", elements,
    "rcs_raci_element_designation", elementProductInputs),
  ...rows("end-seal-kits", "Комплекты торцевого уплотнения с включёнными хомутами", "piece", seals,
    "rcs_end_seal_kit_designation", ["rcs_casing_outside_diameter_mm", "rcs_carrier_outside_diameter_mm"]),
  ...rows("contact-tape", "Дополнительно приобретаемая совместимая контактная лента", "m", tape,
    "rcs_contact_tape_designation", ["rcs_raci_ring_width_mm", "rcs_contact_tape_width_mm", "rcs_raci_element_designation", ...elementProductInputs]),
]);
