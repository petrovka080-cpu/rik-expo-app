import type { AutomaticInclusionCondition, AutomaticParameterSpec, AutomaticRowSpec } from "./automaticConstructionOwnerR1";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";

/** SAME AutomaticOwner: one actually compatible homogeneous service-waste
 * party, including all consumed disposable wipes and actual discarded product
 * packaging/residues, in whole single-use collection containers. Net waste
 * mass/packing compatibility are actual programme facts, not cleaner volume,
 * guessed density, purchased packs or a forecast equipment defect percentage.
 * CRC example SDS distinguishes residual product and contaminated packaging;
 * its product/classifications/US rules are NOT project defaults or permissions.
 * https://www.crcindustries.com/media/msdsen/default/msds_en-1003455.pdf */
export const ROAD_CROSSING_SLEEVES_SERVICE_WASTE_MODES_R1 = Object.freeze({
  complete: "Одна фактически совместимая однородная партия ВСЕХ отходов обслуживания этой программы, включая все израсходованные одноразовые обтирочные изделия и фактическую выброшенную тару/остатки, в целых одноразовых закрытых местах; отдельный полный сервис",
  otherParty: "Все отходы этой программы обслуживает другая сторона без отдельной оплаты исполнителем; не скрытое отсутствие отходов",
  other: "Раздельные/несовместимые партии, исключённые отходы, возвратная тара, совместный груз или другая схема: отдельные фактические владельцы",
});
export const ROAD_CROSSING_SLEEVES_SERVICE_WASTE_TRIP_BASIS_R1 = "Один полный отдельный цикл этого груза: поставка всех фактически нужных совместимых одноразовых сборных мест, весь сбор/закрытие/маркировка и исполнители после отдельно оплаченного обслуживания/снятия, совместимый транспорт/энергия/погрузка/выгрузка/возврат; без повторного материала, очистки/разборки комплектов, других отходов, приёма и других рейсов";
export const ROAD_CROSSING_SLEEVES_SERVICE_WASTE_RECEIVING_MODES_R1 = Object.freeze({
  tonnes: "Отдельный фактический приём по полной массе отходов с выбрасываемой сборной тарой в тоннах",
  otherParty: "Приём обеспечен отдельно другой стороной без оплаты исполнителем и без повторной платы за рейс",
});
export const ROAD_CROSSING_SLEEVES_SERVICE_WASTE_RECEIVING_BASIS_R1 = "Только приём подтверждённых фактических тонн этой совместимой партии, включая выбрасываемую сборную тару; без повторного сбора/упаковки/перевозки/исполнителей и приёма других отходов/воды";
type Scope = Readonly<{ key: string; title: string; selected: AutomaticInclusionCondition; facts: readonly string[]; wipesExpression: string; wipesProductId: string;
  /** Actual discarded flow, not purchased stock/reserve or a forecast fraction.
   * A positive litre/piece flow proves nonzero waste; it does not supply density. */
  discardedFlow?: Readonly<{ expression: string; unitId: string }>;
  minimumDiscardedDryKgExpression?: string;
}>;
export function buildRoadCrossingSleevesServiceWasteR1(scopes: readonly Scope[]): Readonly<{
  parameters: readonly AutomaticParameterSpec[]; rows: readonly AutomaticRowSpec[];
}> {
  const parties = scopes.map(scope => {
    const id = (suffix: string) => `rcs_service_waste_${scope.key}_${suffix}`;
    const own: AutomaticInclusionCondition = { kind: "and", operands: [scope.selected,
      { kind: "equals", parameterId: id("mode"), value: ROAD_CROSSING_SLEEVES_SERVICE_WASTE_MODES_R1.complete }] };
    const positive: AutomaticInclusionCondition = { kind: "and", operands: [own, { kind: "greater_than", parameterId: id("net_waste_kg"), value: 0 }] };
    const wipesPositive: AutomaticInclusionCondition = { kind: "and", operands: [own,
      { kind: "formula_greater_than", expression: scope.wipesExpression, unitId: "piece", value: 0 }] };
    const discardPositive: AutomaticInclusionCondition | null = scope.discardedFlow ? { kind: "and", operands: [own,
      { kind: "formula_greater_than", expression: scope.discardedFlow.expression, unitId: scope.discardedFlow.unitId, value: 0 }] } : null;
    const packs = `ceil(${id("net_waste_kg")}/${id("effective_net_kg_per_container")})`;
    const capacity = `floor(min(${id("vehicle_container_places")},${id("route_payload_kg")}/${id("certified_max_shipping_kg_per_container")}))`;
    const gross = `${id("net_waste_kg")}+(${packs})*${id("container_tare_kg")}`;
    const facts = [...scope.facts, id("mode"), id("program_reference")];
    const packFacts = [...facts, id("net_waste_kg"), id("contents_and_compatibility_reference"), id("container_designation"),
      id("effective_net_kg_per_container"), id("container_tare_kg"), id("certified_max_shipping_kg_per_container")];
    const haulFacts = [...packFacts, id("vehicle_designation"), id("route_and_handling_reference"), id("route_payload_kg"), id("vehicle_container_places"), id("trip_cost_basis"),
      id("receiver_designation"), id("receiving_reference"), id("receiving_mode")];
    return { scope, id, own, positive, wipesPositive, discardPositive, packs, capacity, gross, facts, packFacts, haulFacts };
  });
  const parameters: AutomaticParameterSpec[] = parties.flatMap(({ scope, id, own, positive, wipesPositive }) => {
    const text = (suffix: string, title: string, when: AutomaticInclusionCondition = positive): AutomaticParameterSpec => ({ id: id(suffix), title: `${scope.title}: ${title}`,
      valueType: "text", unitId: null, kind: "conditional", requiredWhen: when });
    const number = (suffix: string, title: string, unitId: string, min: number, when: AutomaticInclusionCondition = positive, integer = false): AutomaticParameterSpec => ({
      id: id(suffix), title: `${scope.title}: ${title}`, valueType: integer ? "integer" : "decimal", unitId, min, kind: "conditional", requiredWhen: when });
    return [
      { id: id("mode"), title: `${scope.title}: фактическая полная граница обращения с отходами обслуживания`, valueType: "enum", unitId: null,
        values: Object.values(ROAD_CROSSING_SLEEVES_SERVICE_WASTE_MODES_R1), kind: "conditional", requiredWhen: scope.selected } as AutomaticParameterSpec,
      text("program_reference", "фактическая полная инвентаризация всех отходов/остатков/тары по программе и распределение сторон; все израсходованные одноразовые обтирочные изделия внутри этой партии, нет второго счёта за очистку/снятие/материалы/рейсы/другие отходы; несовместимые или исключённые части требуют другой схемы", scope.selected),
      number("net_waste_kg", "фактическая масса ВСЕХ отходов партии ДО новой сборной тары: обтирочные материалы/загрязнение/остатки/выброшенная исходная тара по инвентаризации; не расход очистителя, не упаковки заказа и не универсальная плотность; явный ноль подтверждён отсутствием всей партии", "kg", 0, own),
      number("dry_kg_per_original_wipe", "фактическая исходная сухая масса одного целого одноразового обтирочного изделия по тому же выбранному продукту; нижняя проверка массы всех израсходованных изделий, не прогноз загрязнения", "kg_per_piece", 0.000_001, wipesPositive),
      text("wipe_mass_reference", "источник массы того же исходного одноразового обтирочного изделия и полное включение всех израсходованных изделий в инвентаризацию; нет скрытого исключения или возврата использованных изделий в запас", wipesPositive),
      text("contents_and_compatibility_reference", "фактические состав/состояние/классификация/совместимость ВСЕХ отходов и полной одноразовой тары/закрытия/маркировки/обращения; эффективная вместимость при реальном размещении каждого предмета и максимальная масса каждого места; не смешивать несовместимые потоки по одному примеру SDS"),
      text("container_designation", "фактическое совместимое целое одноразовое закрытое сборное место со всеми принадлежностями; поставка уже в полном сервисе, не второй заказ тары"),
      number("effective_net_kg_per_container", "фактическая подтверждённая эффективная допустимая нетто-вместимость одного целого места для ЭТОЙ однородной партии по массе/реальному размещению/обращению", "kg_per_piece", 0.000_001),
      number("container_tare_kg", "фактическая масса одной полной новой выбрасываемой сборной тары со всеми принадлежностями; исходная выброшенная продуктовая тара уже в нетто партии", "kg_per_piece", 0.000_001),
      number("certified_max_shipping_kg_per_container", "подтверждённая ВЕРХНЯЯ перевозочная масса КАЖДОГО целого закрытого места с тарой, не средняя масса всей партии", "kg_per_piece", 0.000_001),
      text("vehicle_designation", "фактический совместимый транспортный/погрузочный комплект всего сервиса"),
      text("route_and_handling_reference", "фактический отдельный маршрут/право/совместимость/сбор/закрытие/погрузка/крепление/выгрузка/возврат и поставка только нужной сборной тары; нет повторения обслуживания или другого рейса/отходов"),
      number("route_payload_kg", "фактическая допустимая полезная масса транспорта для этого груза/маршрута", "kg", 0.000_001),
      number("vehicle_container_places", "фактическое целое число совместимых закрытых сборных мест в рейсе по размещению/креплению, не килограммы партии", "piece", 1, positive, true),
      { id: id("trip_cost_basis"), title: `${scope.title}: граница одного полного отдельного сервисного рейса`, valueType: "enum", unitId: null,
        values: [ROAD_CROSSING_SLEEVES_SERVICE_WASTE_TRIP_BASIS_R1], kind: "conditional", requiredWhen: positive } as AutomaticParameterSpec,
      { id: id("receiving_mode"), title: `${scope.title}: фактическая отдельная граница приёма`, valueType: "enum", unitId: null,
        values: Object.values(ROAD_CROSSING_SLEEVES_SERVICE_WASTE_RECEIVING_MODES_R1), kind: "conditional", requiredWhen: positive } as AutomaticParameterSpec,
      text("receiver_designation", "фактическое место/исполнитель допустимого приёма этой полной партии"),
      text("receiving_reference", "фактическая применимость/классификация/условия/документ разрешённого приёма этой партии с новой выбрасываемой сборной тарой, без повторного сбора/перевозки/других потоков"),
      { id: id("receiving_cost_basis"), title: `${scope.title}: граница отдельного приёма по фактической полной массе`, valueType: "enum", unitId: null,
        values: [ROAD_CROSSING_SLEEVES_SERVICE_WASTE_RECEIVING_BASIS_R1], kind: "conditional", requiredWhen: { kind: "and", operands: [positive,
          { kind: "equals", parameterId: id("receiving_mode"), value: ROAD_CROSSING_SLEEVES_SERVICE_WASTE_RECEIVING_MODES_R1.tonnes }] } } as AutomaticParameterSpec,
    ];
  });
  const rows: AutomaticRowSpec[] = parties.flatMap(({ scope, id, own, positive, wipesPositive, discardPositive, packs, capacity, gross, facts, packFacts, haulFacts }) => {
    const bounds = (unitId: string, minimum = 0) => ({ schemaVersion: "canonical_formula_output_bounds_v1" as const, unitId, minimum,
      reasonRu: "Все исходные одноразовые изделия остаются в партии, каждое полное место допустимо по вместимости/верхней массе/таре и транспорт вмещает хотя бы одно такое место. Несовместимость не исправляется нулём, средней массой или ручными рейсами/тоннами." });
    const row = (suffix: string, caption: string, expression: string, unitId: string, extra: Partial<AutomaticRowSpec> = {}): AutomaticRowSpec => ({
      rowId: `rcs:service-waste:${scope.key}:${suffix}`, formulaId: `rcs:service-waste:${scope.key}:${suffix}`, section: `${scope.title}: отходы обслуживания`, title: caption,
      category: "service", expression, unitId, inclusion: positive, costTreatment: "INFORMATIONAL_SCOPE", inputParameterIds: packFacts, ...extra });
    return [
      row("net_waste_kg", "Фактическая масса всех отходов/выброшенной исходной тары до новой сборной тары", id("net_waste_kg"), "kg", { inclusion: own, inputParameterIds: facts }),
      ...(discardPositive ? [row("actual_discard_nonzero_waste_kg", "Положительный фактический сброс включён в полную ненулевую партию отходов; плотность не предполагается", id("net_waste_kg"), "kg", {
        inclusion: discardPositive, inputParameterIds: [...facts, ...compileFormulaGraph(scope.discardedFlow!.expression).inputParameterIds],
        formulaOutputBounds: { ...bounds("kg"), exclusiveMinimum: 0,
          reasonRu: "Фактически положительный сброс этой полной партии нельзя скрыть нулевой массой отходов. Масса/вода определяются фактической инвентаризацией, без предполагаемой плотности." },
      })] : []),
      ...(scope.minimumDiscardedDryKgExpression ? [row("actual_discard_dry_mass_margin_kg", "Масса полной партии покрывает весь фактически выброшенный сухой материал без второго заказа", `${id("net_waste_kg")}-(${scope.minimumDiscardedDryKgExpression})`, "kg", {
        inclusion: own, inputParameterIds: [...facts, ...compileFormulaGraph(scope.minimumDiscardedDryKgExpression).inputParameterIds], formulaOutputBounds: bounds("kg"),
      })] : []),
      row("all_original_wipes_count", "Все израсходованные одноразовые обтирочные изделия этой программы в партии отходов, не закупочные упаковки", scope.wipesExpression, "piece", {
        inclusion: wipesPositive, inputParameterIds: [...facts, ...compileFormulaGraph(scope.wipesExpression).inputParameterIds] }),
      row("wipe_mass_margin_kg", "Разность массы партии до новой тары и исходной сухой массы ВСЕХ израсходованных одноразовых изделий; не приписанное загрязнение", `${id("net_waste_kg")}-(${scope.wipesExpression})*${id("dry_kg_per_original_wipe")}`, "kg", {
        inclusion: wipesPositive, inputParameterIds: [...facts, ...compileFormulaGraph(scope.wipesExpression).inputParameterIds,
          scope.wipesProductId, id("net_waste_kg"), id("dry_kg_per_original_wipe"), id("wipe_mass_reference")], formulaOutputBounds: bounds("kg") }),
      row("closed_container_count", "Целые фактически нужные совместимые закрытые одноразовые сборные места, уже обеспечены полным сервисом", packs, "piece"),
      row("container_mass_margin_kg", "Запас верхней перевозочной массы каждого полного места над эффективным нетто и полной тарой", `${id("certified_max_shipping_kg_per_container")}-${id("effective_net_kg_per_container")}-${id("container_tare_kg")}`, "kg", { formulaOutputBounds: bounds("kg") }),
      row("gross_shipping_kg", "Полная фактическая масса партии с выбрасываемой новой сборной тарой, без подмены верхней массой всех мест", gross, "kg"),
      row("effective_containers_per_trip", "Целые полные допустимые закрытые места в рейсе по реальному размещению и ВЕРХНЕЙ массе каждого места", capacity, "piece", {
        inputParameterIds: haulFacts, formulaOutputBounds: bounds("piece", 1) }),
      row("full_service_trip_count", "Полные отдельные сервисные рейсы со всей нужной сборной тарой/сбором/закрытием/исполнителями/транспортом/энергией/погрузкой/выгрузкой/возвратом, без повторного обслуживания комплектов", `ceil((${packs})/(${capacity}))`, "trip", {
        category: "transport", costTreatment: "OWN_COST", procurement: true, inputParameterIds: haulFacts, titleParameterIds: [id("vehicle_designation")] }),
      row("receiving_tonnes", "Отдельный приём фактических тонн всех отходов и выбрасываемой новой сборной тары, без повторного сбора/перевозки", `(${gross})/1000`, "tonne", {
        inclusion: { kind: "and", operands: [positive, { kind: "equals", parameterId: id("receiving_mode"), value: ROAD_CROSSING_SLEEVES_SERVICE_WASTE_RECEIVING_MODES_R1.tonnes }] },
        costTreatment: "OWN_COST", procurement: true, titleParameterIds: [id("receiver_designation")],
        inputParameterIds: [...packFacts, id("receiving_mode"), id("receiver_designation"), id("receiving_reference"), id("receiving_cost_basis")] }),
    ];
  });
  return Object.freeze({ parameters: Object.freeze(parameters), rows: Object.freeze(rows) });
}
