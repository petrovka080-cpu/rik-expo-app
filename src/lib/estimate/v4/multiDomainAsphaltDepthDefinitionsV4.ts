import { professionalEstimatePassportId } from "./professionalEstimatePassportV4";
import type {
  ReferenceBoqRowV4,
  ReferenceFormulaNodeV4,
  ReferenceParameterV4,
} from "./multiDomainReferenceTypesV4";

export type AsphaltDepthDefinitionV4 = {
  parameters: readonly ReferenceParameterV4[];
  formulaGraph: readonly ReferenceFormulaNodeV4[];
  boq: readonly ReferenceBoqRowV4[];
  sourceIds: readonly string[];
};

type DepthSeed = {
  catalogWorkId: string;
  primaryFormulaId: string;
  resultUnit: string;
  transportRateUnit: string;
  transportRateDefault: number;
  laborProductivityDefault: number;
  equipmentProductivityDefault: number;
  preparationName: string;
  auxiliaryMaterialName: string;
  laborName: string;
  equipmentName: string;
  transportName: string;
  serviceName: string;
  documentName: string;
};

const parameter = (
  parameterId: string,
  labelRu: string,
  quantityType: ReferenceParameterV4["quantityType"],
  unit: string,
  requiredLevel: "P1" | "P2",
  maximum: number,
  defaultValue: number,
  formulaConsumers: readonly string[],
): ReferenceParameterV4 => ({
  parameterId,
  labelRu,
  quantityType,
  unit,
  requiredLevel,
  minimum: 0.000001,
  maximum,
  defaultValue,
  defaultSource: "transparent_editable_assumption",
  formulaConsumers,
  validationRules: ["FINITE", "GREATER_THAN_ZERO", `MAX_${maximum}`],
});

const formula = (
  formulaNodeId: string,
  operation: ReferenceFormulaNodeV4["operation"],
  inputs: readonly string[],
  outputUnit: string,
  roundingPolicy: ReferenceFormulaNodeV4["roundingPolicy"] = "ROUND_6",
): ReferenceFormulaNodeV4 => ({
  formulaNodeId,
  operation,
  inputs,
  output: formulaNodeId,
  outputUnit,
  coefficient: 1,
  coefficientSource: "USER_INPUT",
  applicability: "Видимое редактируемое допущение профессионального паспорта",
  roundingPolicy,
});

const boqRow = (
  workId: string,
  rowDefinitionId: string,
  category: ReferenceBoqRowV4["category"],
  professionalNameRu: string,
  unit: string,
  formulaNodeId: string,
  sourceId: string,
): ReferenceBoqRowV4 => ({
  rowDefinitionId,
  semanticOwner: professionalEstimatePassportId(workId),
  category,
  professionalNameRu,
  unit,
  formulaNodeId,
  sourceId,
  inclusionReason: "Технологически применимый элемент полного профессионального состава работы",
  priceState: "PRICE_REQUIRED",
});

function depth(seed: DepthSeed): AsphaltDepthDefinitionV4 {
  const prefix = seed.catalogWorkId;
  return {
    parameters: [
      parameter(`${prefix}_transport_rate`, "Транспортная масса на единицу результата", "ratio", seed.transportRateUnit, "P1", 100, seed.transportRateDefault, [`${prefix}_transport_mass`]),
      parameter(`${prefix}_labor_productivity`, "Производительность профессионального звена", "productivity", `${seed.resultUnit}/h`, "P1", 1_000_000, seed.laborProductivityDefault, [`${prefix}_labor_hours`]),
      parameter(`${prefix}_equipment_productivity`, "Производительность основного механизма", "productivity", `${seed.resultUnit}/h`, "P2", 1_000_000, seed.equipmentProductivityDefault, [`${prefix}_equipment_hours`]),
      parameter(`${prefix}_delivery_distance_km`, "Расстояние доставки или вывоза", "length", "km", "P2", 100_000, 20, [`${prefix}_transport_work`]),
      parameter(`${prefix}_payload_t`, "Полезная грузоподъёмность транспорта", "mass", "t", "P2", 1_000, 10, [`${prefix}_transport_trips`]),
    ],
    formulaGraph: [
      formula(`${prefix}_preparation_quantity`, "IDENTITY", [seed.primaryFormulaId], seed.resultUnit),
      formula(`${prefix}_transport_mass`, "MULTIPLY", [seed.primaryFormulaId, `${prefix}_transport_rate`], "t"),
      formula(`${prefix}_labor_hours`, "DIVIDE", [seed.primaryFormulaId, `${prefix}_labor_productivity`], "h"),
      formula(`${prefix}_equipment_hours`, "DIVIDE", [seed.primaryFormulaId, `${prefix}_equipment_productivity`], "h"),
      formula(`${prefix}_transport_work`, "MULTIPLY", [`${prefix}_transport_mass`, `${prefix}_delivery_distance_km`], "t_km"),
      formula(`${prefix}_transport_trips`, "CEIL_DIVIDE", [`${prefix}_transport_mass`, `${prefix}_payload_t`], "trip", "CEIL_INTEGER"),
      formula(`${prefix}_service_quantity`, "IDENTITY", [seed.primaryFormulaId], seed.resultUnit),
      formula(`${prefix}_document_count`, "DIVIDE", [seed.primaryFormulaId, seed.primaryFormulaId], "pcs", "CEIL_INTEGER"),
    ],
    boq: [
      boqRow(prefix, `${prefix}_professional_preparation`, "preparation", seed.preparationName, seed.resultUnit, `${prefix}_preparation_quantity`, "engineering_geometry"),
      boqRow(prefix, `${prefix}_professional_labor`, "labor", seed.laborName, "h", `${prefix}_labor_hours`, "transparent_editable_assumption"),
      boqRow(prefix, `${prefix}_primary_equipment`, "equipment", seed.equipmentName, "h", `${prefix}_equipment_hours`, "transparent_editable_assumption"),
      boqRow(prefix, `${prefix}_material_transport`, "transport", seed.transportName, "t_km", `${prefix}_transport_work`, "engineering_geometry"),
      boqRow(prefix, `${prefix}_transport_trips_row`, "transport", `${seed.transportName}: расчёт рейсов`, "trip", `${prefix}_transport_trips`, "engineering_geometry"),
      boqRow(prefix, `${prefix}_professional_service`, "services", seed.serviceName, seed.resultUnit, `${prefix}_service_quantity`, "transparent_editable_assumption"),
      boqRow(prefix, `${prefix}_depth_quality_control`, "quality_control", `Операционный контроль: ${seed.serviceName}`, seed.resultUnit, `${prefix}_service_quantity`, "transparent_editable_assumption"),
      boqRow(prefix, `${prefix}_professional_document`, "documentation", seed.documentName, "pcs", `${prefix}_document_count`, "transparent_editable_assumption"),
    ],
    sourceIds: ["transparent_editable_assumption"],
  };
}

export const MULTI_DOMAIN_ASPHALT_DEPTH_DEFINITIONS_V4: Readonly<Record<string, AsphaltDepthDefinitionV4>> = {
  building_structure_demolition: depth({
    catalogWorkId: "building_structure_demolition", primaryFormulaId: "demolished_volume", resultUnit: "m3",
    transportRateUnit: "t/m3", transportRateDefault: 1.5, laborProductivityDefault: 0.8, equipmentProductivityDefault: 8,
    preparationName: "Отключение и ограждение зоны разборки конструкций",
    auxiliaryMaterialName: "Вода и расходные материалы пылеподавления при разборке",
    laborName: "Труд рабочих по безопасной разборке и сортировке конструкций",
    equipmentName: "Работа демонтажного экскаватора с навесным оборудованием",
    transportName: "Перевозка отсортированных отходов строительной разборки",
    serviceName: "Приём и документирование строительных отходов",
    documentName: "Акт завершения разборки и передачи строительных отходов",
  }),
  trench_excavation: depth({
    catalogWorkId: "trench_excavation", primaryFormulaId: "excavation_volume", resultUnit: "m3",
    transportRateUnit: "t/m3", transportRateDefault: 1.7, laborProductivityDefault: 4, equipmentProductivityDefault: 25,
    preparationName: "Геодезическая разбивка оси и границ траншеи",
    auxiliaryMaterialName: "Материалы временного крепления и обозначения траншеи",
    laborName: "Труд землекопов по зачистке дна и откосов траншеи",
    equipmentName: "Работа экскаватора при разработке грунта траншеи",
    transportName: "Перевозка избыточного грунта разработки траншеи",
    serviceName: "Геодезическое сопровождение разработки траншеи",
    documentName: "Исполнительная схема отметок и профиля траншеи",
  }),
  strip_foundation: depth({
    catalogWorkId: "strip_foundation", primaryFormulaId: "foundation_concrete_volume", resultUnit: "m3",
    transportRateUnit: "t/m3", transportRateDefault: 2.4, laborProductivityDefault: 0.7, equipmentProductivityDefault: 12,
    preparationName: "Разбивка осей и подготовка основания фундаментной ленты",
    auxiliaryMaterialName: "Комплект подбетонки, фиксаторов арматуры и опалубочной смазки",
    laborName: "Труд бетонщиков, арматурщиков и плотников ленточного фундамента",
    equipmentName: "Работа автобетононасоса и глубинных вибраторов фундамента",
    transportName: "Доставка бетонной смеси и арматуры ленточного фундамента",
    serviceName: "Геодезический контроль осей и отметок фундаментной ленты",
    documentName: "Акт скрытых работ армирования и бетонирования фундамента",
  }),
  monolithic_slab_concreting: depth({
    catalogWorkId: "monolithic_slab_concreting", primaryFormulaId: "slab_concrete_volume", resultUnit: "m3",
    transportRateUnit: "t/m3", transportRateDefault: 2.4, laborProductivityDefault: 1, equipmentProductivityDefault: 18,
    preparationName: "Приёмка опалубки, армирования и закладных монолитной плиты",
    auxiliaryMaterialName: "Фиксаторы арматуры, опалубочная смазка и материалы ухода за бетоном",
    laborName: "Труд бетонщиков по укладке, вибрированию и уходу за плитой",
    equipmentName: "Работа автобетононасоса и вибрационного оборудования плиты",
    transportName: "Доставка бетонной смеси монолитной плиты",
    serviceName: "Лабораторный контроль бетонной смеси и образцов плиты",
    documentName: "Акт скрытых работ и журнал бетонирования монолитной плиты",
  }),
  masonry_wall: depth({
    catalogWorkId: "masonry_wall", primaryFormulaId: "masonry_volume", resultUnit: "m3",
    transportRateUnit: "t/m3", transportRateDefault: 1.8, laborProductivityDefault: 0.5, equipmentProductivityDefault: 6,
    preparationName: "Разметка осей, проёмов и уровней кирпичной стены",
    auxiliaryMaterialName: "Кладочный раствор, армирующая сетка и гибкие связи стены",
    laborName: "Труд каменщиков по кладке кирпичной стены с расшивкой",
    equipmentName: "Работа подъёмника подачи кирпича и кладочного раствора",
    transportName: "Доставка кирпича и компонентов кладочного раствора",
    serviceName: "Приёмочный контроль перевязки, швов и вертикальности кладки",
    documentName: "Акт скрытых работ армирования и связей кирпичной кладки",
  }),
  wall_plaster: depth({
    catalogWorkId: "wall_plaster", primaryFormulaId: "plaster_area", resultUnit: "m2",
    transportRateUnit: "t/m2", transportRateDefault: 0.02, laborProductivityDefault: 8, equipmentProductivityDefault: 35,
    preparationName: "Очистка, грунтование и установка маяков на стенах",
    auxiliaryMaterialName: "Грунтовка, маячковые профили, угловые профили и штукатурная сетка",
    laborName: "Труд штукатуров по нанесению и выравниванию раствора",
    equipmentName: "Работа штукатурной станции и смесительного оборудования",
    transportName: "Доставка сухих смесей и штукатурных комплектующих",
    serviceName: "Контроль влажности основания и плоскостности штукатурки",
    documentName: "Акт приёмки подготовленного основания и штукатурного покрытия",
  }),
  roll_roofing: depth({
    catalogWorkId: "roll_roofing", primaryFormulaId: "roof_area", resultUnit: "m2",
    transportRateUnit: "t/m2", transportRateDefault: 0.015, laborProductivityDefault: 10, equipmentProductivityDefault: 45,
    preparationName: "Очистка, просушка и грунтование основания рулонной кровли",
    auxiliaryMaterialName: "Праймер, мастика, газ и материалы усиления примыканий",
    laborName: "Труд кровельщиков по устройству многослойного рулонного ковра",
    equipmentName: "Работа кровельного оборудования наплавления и прикатки",
    transportName: "Подъём и доставка рулонных кровельных материалов",
    serviceName: "Пожарное наблюдение при выполнении огневых кровельных работ",
    documentName: "Акт скрытых слоёв и журнал устройства рулонной кровли",
  }),
  water_pipe_installation: depth({
    catalogWorkId: "water_pipe_installation", primaryFormulaId: "installed_pipe_length", resultUnit: "m",
    transportRateUnit: "t/m", transportRateDefault: 0.004, laborProductivityDefault: 4, equipmentProductivityDefault: 20,
    preparationName: "Разметка трассы, опор и проходок внутреннего водопровода",
    auxiliaryMaterialName: "Фитинги, крепления, гильзы, уплотнения и теплоизоляция водопровода",
    laborName: "Труд монтажников внутренних водопроводных трубопроводов",
    equipmentName: "Работа оборудования резки, сварки или пресс-соединения труб",
    transportName: "Доставка труб, фитингов и креплений водопроводной системы",
    serviceName: "Промывка и гидравлическое испытание водопровода",
    documentName: "Акт скрытой прокладки и протокол испытания водопровода",
  }),
  sewer_pipe_installation: depth({
    catalogWorkId: "sewer_pipe_installation", primaryFormulaId: "installed_sewer_length", resultUnit: "m",
    transportRateUnit: "t/m", transportRateDefault: 0.012, laborProductivityDefault: 3, equipmentProductivityDefault: 15,
    preparationName: "Разбивка трассы и отметок наружной самотечной канализации",
    auxiliaryMaterialName: "Соединения, уплотнения, песчаная постель и сигнальные материалы канализации",
    laborName: "Труд монтажников наружного канализационного трубопровода",
    equipmentName: "Работа трубоукладочного и уплотняющего оборудования канализации",
    transportName: "Доставка труб и вывоз вытесненного грунта канализационной трассы",
    serviceName: "Промывка и телеинспекция проложенной канализационной линии",
    documentName: "Исполнительная схема и протокол испытания канализационной сети",
  }),
  power_cable_laying: depth({
    catalogWorkId: "power_cable_laying", primaryFormulaId: "installed_cable_length", resultUnit: "m",
    transportRateUnit: "t/m", transportRateDefault: 0.008, laborProductivityDefault: 12, equipmentProductivityDefault: 60,
    preparationName: "Разметка кабельной трассы, проходов и мест оконцевания",
    auxiliaryMaterialName: "Кабельные крепления, маркировка, наконечники и защитные элементы",
    laborName: "Труд электромонтажников по раскатке, креплению и оконцеванию кабеля",
    equipmentName: "Работа кабельной лебёдки, роликов и измерительных приборов",
    transportName: "Доставка кабельных барабанов и монтажных принадлежностей",
    serviceName: "Измерение сопротивления изоляции и фазировка силового кабеля",
    documentName: "Кабельный журнал и протокол электрических измерений",
  }),
  heating_appliance_installation: depth({
    catalogWorkId: "heating_appliance_installation", primaryFormulaId: "installed_appliance_count", resultUnit: "pcs",
    transportRateUnit: "t/pcs", transportRateDefault: 0.04, laborProductivityDefault: 0.5, equipmentProductivityDefault: 4,
    preparationName: "Разметка креплений и подготовка точек подключения отопительных приборов",
    auxiliaryMaterialName: "Кронштейны, арматура, воздухоотводчики и уплотнения радиаторов",
    laborName: "Труд монтажников по установке и подключению отопительных приборов",
    equipmentName: "Работа инструмента монтажа и опрессовочного оборудования отопления",
    transportName: "Доставка отопительных приборов и монтажных комплектов",
    serviceName: "Опрессовка, удаление воздуха и балансировка отопительных приборов",
    documentName: "Протокол опрессовки и акт готовности отопительных приборов",
  }),
  asphalt_pavement: depth({
    catalogWorkId: "asphalt_pavement", primaryFormulaId: "asphalt_area", resultUnit: "m2",
    transportRateUnit: "t/m2", transportRateDefault: 0.12, laborProductivityDefault: 20, equipmentProductivityDefault: 180,
    preparationName: "Очистка основания и подготовка фронта укладки асфальтобетона",
    auxiliaryMaterialName: "Битумная эмульсия, материалы сопряжений и технологические расходники",
    laborName: "Труд дорожных рабочих по укладке и сопряжению асфальтобетона",
    equipmentName: "Работа асфальтоукладчика и комплекта дорожных катков",
    transportName: "Доставка асфальтобетонной смеси автомобилями-самосвалами",
    serviceName: "Лабораторный контроль смеси, уплотнения и ровности покрытия",
    documentName: "Журнал укладки и протокол контроля асфальтобетонного покрытия",
  }),
};
