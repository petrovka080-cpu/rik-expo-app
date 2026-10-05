import { buildAutomaticConstructionOwnerR1, compileAutomaticConstructionOwnerR1,
  type AutomaticInclusionCondition, type AutomaticParameterSpec, type AutomaticRowSpec } from "./automaticConstructionOwnerR1";
import { effectivePurchaseBalanceExpressionsR1 } from "./effectivePurchaseBalanceR1";
import { INTERIOR_FINISHES_DOMAIN_INVENTORY } from "./domains/interiorFinishesComplete/inventory";
import { buildWaterproofingCeresitCl51ProfessionalPackagePartsV1 } from "./domains/interiorFinishesComplete/waterproofingCeresitCl51ProfessionalV1";
import { CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_SOURCE_METADATA as CL51 } from "./domainFactory/professionalPhysicalNormApplicabilityV1";
import { estimateDeterministicHash } from "../estimateDeterministicHash";

export const WET_ZONE_COMPLETION_CONTRACT_S2735 = "wet-zone-cl51-completion:s27-35.v1";
export const WET_ZONE_COMPLETION_CATALOG_ID_S2735 = "canonical-work:base:tile_stone_interior_ceramic_tile_waterproof_wet_zone";
export const WET_ZONE_COMPLETION_SOURCE_ID_S2735 = "src_wet_zone_cl51_completion_s27_35";
export const WET_ZONE_COMPLETION_NORM_ID_S2735 = "norm:wet-zone-cl51-completion:s27-35.v1";
export const WET_ZONE_COMPLETION_SOURCE_METADATA_S2735 = Object.freeze({
  source_title: "Ceresit CL 51 TDS 03/2024 и CT 17 Profi TDS 03.24; проектные количества оснащения и ведомость производства работ",
  source_authority: "Henkel: только свойства и расход материалов; исходные проектные факты подтверждает пользователь",
  source_document_version: WET_ZONE_COMPLETION_CONTRACT_S2735,
  definition_hash: "wet-zone-cl51-completion-s27-35-v1",
  artifact_sha256: "3a56230731f0cf6ecbc5e5bb44588703597ac19a0357bac382c6036aa87d8a79",
  exact_locator: "CL 51: стр. 1–2 — применимость, стр. 2 — минимум 1,3 кг/м² на два слоя; CT 17: стр. 2 — 0,1–0,5 л/м² по основанию и фасовки 1/2/5/10 л. Выработка, расходники, запасы и доставка — по выбранной ведомости проекта.",
  use_restriction: "Бытовая мокрая зона внутри помещения под плитку; проектные условия и оплаты нельзя выводить из площади. CL 51 — готовая эмульсия без воды затворения. Нормы труда и техники не заявляются.",
  official_url: "https://datasheets.tdx.henkel.com/CERESIT-CL-51-en_GL.pdf",
});
const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find(item => `canonical-work:base:${item.catalog_id}` === WET_ZONE_COMPLETION_CATALOG_ID_S2735);
if (!inventory) throw new Error("WET_ZONE_READY_OPERATION_MISSING");
const parts = buildWaterproofingCeresitCl51ProfessionalPackagePartsV1(inventory);
if (!parts || CL51.rate_value !== 1.3 || CL51.coat_count !== 2) throw new Error("WET_ZONE_READY_PROFILE_DRIFT");
const ready = parts.child_assemblies.flatMap(child => child.rows);
function operation(suffix: string) {
  const row = ready.find(candidate => candidate.row_id.endsWith(`:row:${suffix}`));
  if (!row) throw new Error(`WET_ZONE_READY_ROW_MISSING:${suffix}`);
  return row;
}
export const WET_ZONE_COMPLETION_ROWS_S2735 = Object.freeze({
  scope: "work:wet-zone:cl51-scope",
  membrane: operation("cl51_material").row_id,
  labor: operation("waterproofing_labor").row_id,
  preparation: operation("substrate_preparation").row_id,
  tape: operation("junction_tape").row_id,
  collars: operation("penetration_collars").row_id,
  equipment: operation("waterproofing_equipment").row_id,
  quality: operation("quality_tests").row_id,
  documentation: operation("documentation_records").row_id,
  primer: "material:wet-zone:ct17-primer",
});
const ids = WET_ZONE_COMPLETION_ROWS_S2735;
const equals = (parameterId: string, value: string): AutomaticInclusionCondition => ({ kind: "equals", parameterId, value });
const prime = equals("primer_mode", "CT17");
const vacuum = equals("equipment_mode", "VACUUM_CLEANING");
const freight = equals("delivery_mode", "SEPARATE_TRIPS");
const confirmationIds = ["under_ceramic_covering", "substrate_preparation_confirmed", "permanent_water_contact_excluded",
  "rear_surface_moisture_excluded", "chemical_exposure_excluded", "regional_tds_conditions_confirmed"] as const;
const applicabilityIds = ["coat_count", "installation_location", "wet_zone_type", "substrate_type", ...confirmationIds,
  "method_reference", "payment_scope_reference"];
const project = (id: string, title: string, valueType: AutomaticParameterSpec["valueType"], unitId: string | null,
  extra: Partial<AutomaticParameterSpec> = {}): AutomaticParameterSpec => ({ id, title, valueType, unitId, kind: "conditional", ...extra });
const profiles: AutomaticParameterSpec[] = [
  { id: "coat_count", title: "Выбранная технология CL 51: два слоя", valueType: "integer", unitId: "item", kind: "profile", defaultValue: 2, min: 2, max: 2 },
  { id: "installation_location", title: "Выбранная технология: внутри помещения", valueType: "enum", unitId: null, kind: "profile", defaultValue: "indoor", values: ["indoor"] },
];
for (const resource of ["cl51", "ct17", "tape"]) for (const kind of ["stock", "reserve"])
  profiles.push({ id: `${resource}_${kind}`, title: `${resource}: ${kind === "stock" ? "доступный остаток" : "сохраняемый резерв"}; предварительно 0, уточните по объекту`,
    valueType: "decimal", unitId: resource === "cl51" ? "kg" : resource === "ct17" ? "l" : "m", kind: "profile", defaultValue: 0, min: 0 });
const parameters: AutomaticParameterSpec[] = [
  project("wet_zone_type", "Тип бытовой мокрой зоны", "enum", null, { values: [...CL51.wet_zones] }),
  project("substrate_type", "Подготовленное основание из области применения CL 51", "enum", null, { values: [...CL51.documented_substrate_examples] }),
  ...confirmationIds.map(id => project(id, ({ under_ceramic_covering: "Гидроизоляция под плиточным покрытием",
    substrate_preparation_confirmed: "Основание сухое, прочное, ровное; подготовка соответствует TDS",
    permanent_water_contact_excluded: "Постоянный контакт с водой и бассейн исключены",
    rear_surface_moisture_excluded: "Увлажнение с обратной стороны исключено",
    chemical_exposure_excluded: "Химическое воздействие исключено",
    regional_tds_conditions_confirmed: "Влажность основания, температура и условия применения проверены по региональному TDS" })[id], "enum", null, { values: ["true"] })),
  project("method_reference", "Ведомость технологии: подготовка, примыкания, два слоя, выдержка, контроль и уборка; применимость CT 17 и способ грунтования", "text", null),
  project("payment_scope_reference", "Границы оплаты: труд включает работников контроля и оператора; перечисленные материалы, расходники, оснащение и отдельная доставка исключены из ставки труда", "text", null),
  project("selected_bucket_size_kg", "Выбранное ведро CL 51, кг", "integer", "kg", { min: 5, max: 15 }),
  project("primer_mode", "Грунтование: CT 17 по впитывающему основанию либо ранее выполнено и принято", "enum", null, { values: ["CT17", "ALREADY_PRIMED"] }),
  project("ct17_selected_total_consumption_l_m2", "Суммарный проектный расход CT 17 без воды разбавления; TDS 0,1–0,5 л/м² зависит от основания", "decimal", "l_per_m2", { min: 0.1, max: 0.5, requiredWhen: prime }),
  project("ct17_container_l", "Выбранная фасовка CT 17: 1/2/5/10 л", "integer", "l", { min: 1, max: 10, requiredWhen: prime }),
  project("primer_worker_h", "Фактический труд грунтования, чел.-ч", "decimal", "man_hour", { min: 0, requiredWhen: prime }),
  project("waterproofing_productivity_m2_per_man_hour", "Проектная выработка двухслойного нанесения, м²/чел.-ч; общей нормы нет", "decimal", "m2_per_man_hour", { min: 0.001 }),
  project("substrate_preparation_productivity_m2_per_man_hour", "Проектная выработка подготовки и уборки основания, м²/чел.-ч", "decimal", "m2_per_man_hour", { min: 0.001 }),
  project("junction_tape_length_m", "Полная длина ленты CL 152: примыкания, углы, перехлёсты и подрезка по деталям", "decimal", "m", { min: 0 }),
  project("tape_supplier_roll_length_m", "Фактическая длина одного совместимого рулона ленты по предложению поставщика", "decimal", "m", { min: 0.001 }),
  project("penetration_collar_count", "Целое число совместимых манжет CL 83/84 по ведомости проходок", "integer", "item", { min: 0 }),
  project("junction_worker_h", "Фактический труд ленты, углов и манжет; не выводится из числа актов", "decimal", "man_hour", { min: 0 }),
  project("equipment_mode", "Подготовка: ручной метод либо выбранный пылесос", "enum", null, { values: ["MANUAL", "VACUUM_CLEANING"] }),
  project("equipment_designation", "Совместимое обеспыливающее оборудование; энергообеспечение входит в его ставку", "text", null, { requiredWhen: vacuum }),
  project("equipment_machine_h", "Фактические часы выбранного оборудования подготовки", "decimal", "machine_hour", { min: 0.001, requiredWhen: vacuum }),
  project("qa_interval_m2_per_test", "Проектная площадь на контроль сплошности и минимальной толщины, м²/проверку", "decimal", "m2_per_test", { min: 0.001 }),
  project("documentation_record_count", "Фактическое количество записей контроля и паспортов", "integer", "item", { min: 1 }),
  project("delivery_mode", "Доставка материалов и оснастки: включена в предложение либо отдельные рейсы", "enum", null, { values: ["INCLUDED_IN_SUPPLY", "SEPARATE_TRIPS"] }),
  project("delivery_reference", "Условия доставки и грузы; повторная оплата доставки поставщика исключена", "text", null),
  project("delivery_trip_count", "Подтверждённое число отдельных рейсов", "integer", "trip", { min: 1, requiredWhen: freight }),
];
const consumables = [
  ["brush_count", "Кисть для грунтовки и примыканий", "piece"],
  ["roller_count", "Сменный валик нанесения CL 51", "piece"],
  ["tray_count", "Лоток для готовой эмульсии", "piece"],
  ["scraper_count", "Скребок подготовки основания", "piece"],
  ["glove_pair_count", "Защитные перчатки", "pair"],
  ["filter_mask_count", "Маска/фильтр при подготовке пылящего основания", "piece"],
  ["cleaning_wipe_count", "Салфетки очистки инструмента", "piece"],
  ["waste_bag_count", "Мешки для остатков и упаковки", "piece"],
] as const;
for (const [id, title, unitId] of consumables) parameters.push(project(id, `${title}: отдельная поставка по ведомости, 0 при отсутствии потребности`, "integer", unitId, { min: 0 }));
parameters.push(project("method_water_l", "Вода по выбранному способу разбавления грунтовки и уборки; в CL 51 вода не добавляется", "decimal", "l", { min: 0 }));

const rows: AutomaticRowSpec[] = [{ rowId: ids.scope, formulaId: "wet_zone_cl51_scope_v1", section: "Гидроизоляция мокрой зоны", category: "construction_work",
  title: "Принятая площадь двухслойной гидроизоляции CL 51 под плитку", unitId: "m2", expression: "area_m2", costTreatment: "INFORMATIONAL_SCOPE" }];
function reuse(suffix: string, changes: Partial<AutomaticRowSpec> = {}) {
  const row = operation(suffix);
  rows.push({ rowId: row.row_id, formulaId: row.formula.formula_id, section: row.section, category: row.category,
    title: row.title_ru, unitId: row.formula.output_unit_id, expression: row.formula.expression,
    procurement: row.procurement_eligible, inputParameterIds: applicabilityIds, ...changes });
}
reuse("substrate_preparation");
reuse("waterproofing_labor", { title: "Нанесение двух слоёв CL 51, выдержка, контроль толщины и уборка инструмента" });
reuse("waterproofing_equipment", { expression: "equipment_machine_h", inclusion: vacuum, procurement: true,
  title: "Оборудование обеспыливания основания по фактической ведомости", titleParameterIds: ["equipment_designation"] });
for (const [suffix, consumed, stock, reserve, quantum] of [
  ["cl51_material", `area_m2*${CL51.rate_value}`, "cl51_stock", "cl51_reserve", "selected_bucket_size_kg"],
  ["junction_tape", "junction_tape_length_m", "tape_stock", "tape_reserve", "tape_supplier_roll_length_m"],
] as const) {
  const row = operation(suffix), balance = effectivePurchaseBalanceExpressionsR1({ ownerRowId: row.row_id,
    orderUnitId: row.formula.output_unit_id, consumed, stock, reserve, quantum });
  reuse(suffix, { expression: `ceil(max(0,(${consumed})+${reserve}-${stock})/${quantum})*${quantum}`, ...balance.owner });
}
reuse("penetration_collars");
reuse("quality_tests", { costTreatment: "INCLUDED_IN_RESOURCE_ROWS", procurement: false });
reuse("documentation_records", { costTreatment: "INCLUDED_IN_RESOURCE_ROWS", procurement: false });
const primerBalance = effectivePurchaseBalanceExpressionsR1({ ownerRowId: ids.primer, orderUnitId: "l",
  consumed: "area_m2*ct17_selected_total_consumption_l_m2", stock: "ct17_stock", reserve: "ct17_reserve", quantum: "ct17_container_l" });
rows.push({ rowId: ids.primer, formulaId: "wet_zone_ct17_supplier_order_v1", section: "Грунтование впитывающего основания", category: "material",
  title: "Ceresit CT 17 Profi, концентрат без воды разбавления", unitId: "l", procurement: true, inclusion: prime,
  expression: "ceil(max(0,area_m2*ct17_selected_total_consumption_l_m2+ct17_reserve-ct17_stock)/ct17_container_l)*ct17_container_l",
  inputParameterIds: applicabilityIds, ...primerBalance.owner });
for (const [id, title, expression, inclusion] of [
  ["primer-labor", "Грунтование CT 17 по выбранному способу", "primer_worker_h", prime],
  ["junction-labor", "Лента, углы и манжеты проходок", "junction_worker_h", undefined],
] as const) rows.push({ rowId: `labor:wet-zone:${id}`, formulaId: `wet_zone_${id.replace(/-/gu, "_")}_v1`, section: "Подготовка и примыкания", category: "labor",
  title, unitId: "man_hour", expression, inclusion, inputParameterIds: applicabilityIds });
for (const [parameterId, title, unitId] of [...consumables, ["method_water_l", "Вода грунтования и уборки по ведомости", "l"]] as const)
  rows.push({ rowId: `material:wet-zone:${parameterId}`, formulaId: `wet_zone_${parameterId}_v1`, section: "Поштучные расходники и уборка", category: "material",
    title, unitId, expression: parameterId, procurement: true, inputParameterIds: applicabilityIds });
rows.push({ rowId: "delivery:wet-zone:confirmed-trips", formulaId: "wet_zone_confirmed_delivery_v1", section: "Доставка", category: "delivery",
  title: "Отдельная подтверждённая доставка материалов и оснастки", unitId: "trip", expression: "delivery_trip_count", inclusion: freight,
  procurement: true, inputParameterIds: ["delivery_reference", "payment_scope_reference"], titleParameterIds: ["delivery_reference"] });
const built = buildAutomaticConstructionOwnerR1({ contract: WET_ZONE_COMPLETION_CONTRACT_S2735, semanticOwner: "wet-zone-cl51",
  sourceId: WET_ZONE_COMPLETION_SOURCE_ID_S2735, normId: WET_ZONE_COMPLETION_NORM_ID_S2735,
  sourceMetadata: WET_ZONE_COMPLETION_SOURCE_METADATA_S2735, applicabilityRu: WET_ZONE_COMPLETION_SOURCE_METADATA_S2735.use_restriction,
  ordinary: [{ id: "area_m2", title: "Площадь гидроизоляции мокрой зоны", valueType: "decimal", unitId: "m2", kind: "ordinary", min: 0.01 }],
  profile: profiles, conditional: parameters, rows, deferMissingProjectFactsToRows: true,
  excludedUnownedAssumptions: ["универсальная норма выработки", "расход грунтовки без обследования", "линейный расход ленты из площади", "инженерное утверждение", "повторная оплата контроля и документации"],
});
export const WET_ZONE_COMPLETION_DEFINITION_S2735 = Object.freeze({ ...built,
  parameters: built.parameters.map(parameter => confirmationIds.includes(parameter.parameter_id as typeof confirmationIds[number])
    ? { ...parameter, required: true, value_type: "boolean", constraints_json: { forbiddenWhen: { kind: "equals", parameterId: parameter.parameter_id, value: false } } }
    : parameter.parameter_id === "selected_bucket_size_kg"
      ? { ...parameter, value_type: "enum", constraints_json: { values: ["5", "15"] } }
      : parameter.parameter_id === "ct17_container_l"
        ? { ...parameter, value_type: "enum", constraints_json: { values: ["1", "2", "5", "10"], requiredWhen: prime } }
        : { ...parameter, required: parameter.truth_metadata.visibility_role !== "INTERNAL_ONLY"
          && parameter.constraints_json?.requiredWhen == null }),
  resources: built.resources.map(resource => { const completed = { ...resource,
    resource_graph: { ...resource.resource_graph,
      ...(resource.procurement_eligible ? { inputParameterIds: [...applicabilityIds, "delivery_mode", "delivery_reference"] } : {}),
      ...([ids.quality, ids.documentation].includes(resource.row_id) ? { includedInResourceOwnerRowId: ids.labor } : {}) },
    source_metadata: { ...resource.source_metadata, operationReuse: ready.some(row => row.row_id === resource.row_id),
      manufacturerSourceIds: [CL51.source_id], universal_productivity_claimed: false, projectApprovalClaimed: false,
      ...(resource.row_id === ids.membrane ? { minimum_two_coat_rate_kg_m2: CL51.rate_value,
        normativeTrace: [{ sourceId: CL51.source_id, normId: CL51.norm_id, source_title: CL51.source_title,
          exact_locator: "TDS 03/2024, pages 1-3; minimum amount for two coats 1.3 kg/m2", source_definition_hash: CL51.definition_hash }] } : {}) },
  }; return { ...completed, row_sha256: estimateDeterministicHash({ ...completed, row_sha256: "" }) }; }),
});
/** Validation facts are explicitly a fixture; never a hidden runtime profile. */
export const WET_ZONE_COMPLETION_ACCEPTANCE_INPUT_S2735 = Object.freeze({
  area_m2: 25, wet_zone_type: "bathroom", substrate_type: "cement_screed", ...Object.fromEntries(confirmationIds.map(id => [id, true])),
  method_reference: "DEMO / VALIDATION_FIXTURE: сухая подготовленная впитывающая стяжка, CT17 без разбавления 0.2 л/м²; CL51 два слоя; лента с углами и нахлёстами 18 м; 3 проходки; региональные условия проверены в сценарии, инженерного утверждения нет.",
  payment_scope_reference: "DEMO / VALIDATION_FIXTURE: труд нанесения включает контроль, документацию, уборку и оператора; поставка материалов/расходников и оборудование оплачиваются отдельно; подтверждённых цен нет.",
  selected_bucket_size_kg: "5", primer_mode: "CT17", ct17_selected_total_consumption_l_m2: 0.2, ct17_container_l: "5", primer_worker_h: 1.5,
  waterproofing_productivity_m2_per_man_hour: 5, substrate_preparation_productivity_m2_per_man_hour: 10,
  junction_tape_length_m: 18, tape_supplier_roll_length_m: 10, penetration_collar_count: 3, junction_worker_h: 2,
  equipment_mode: "VACUUM_CLEANING", equipment_designation: "DEMO совместимый строительный пылесос по ведомости, энергия в ставке, оператор в труде подготовки", equipment_machine_h: 1,
  qa_interval_m2_per_test: 10, documentation_record_count: 1,
  delivery_mode: "SEPARATE_TRIPS", delivery_reference: "DEMO один отдельный рейс гидроизоляции, грунтовки, ленты и оснастки; доставка в цене поставки не учтена", delivery_trip_count: 1,
  brush_count: 2, roller_count: 2, tray_count: 1, scraper_count: 1, glove_pair_count: 2, filter_mask_count: 1,
  cleaning_wipe_count: 8, waste_bag_count: 2, method_water_l: 5,
});
export function compileWetZoneWaterproofingCompletionS2735(submittedParameters: Record<string, unknown>) {
  return compileAutomaticConstructionOwnerR1({ compilerVersion: WET_ZONE_COMPLETION_CONTRACT_S2735,
    catalogId: WET_ZONE_COMPLETION_CATALOG_ID_S2735, primaryMeasureParameterId: "area_m2",
    definition: WET_ZONE_COMPLETION_DEFINITION_S2735, submittedParameters });
}
