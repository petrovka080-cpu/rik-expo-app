import { normalizeRuText } from "../text/encoding";

export type VisibleEstimateSectionType = "materials" | "labor" | "equipment" | "delivery" | "tax";

const RU = {
  needsSelection: "\u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044f \u043f\u043e\u0434\u0431\u043e\u0440",
  catalogPrefix:
    "\u041a\u0430\u0442\u0430\u043b\u043e\u0433 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u043e\u0432: \u043f\u043e\u0434\u043e\u0431\u0440\u0430\u0442\u044c",
};

const MATERIAL_LABELS_RU: Record<string, string> = {
  foundation_concrete: "\u0411\u0435\u0442\u043e\u043d \u0434\u043b\u044f \u0444\u0443\u043d\u0434\u0430\u043c\u0435\u043d\u0442\u0430",
  concrete: "\u0411\u0435\u0442\u043e\u043d B25 W6 F150",
  rebar: "\u0410\u0440\u043c\u0430\u0442\u0443\u0440\u0430 A500C",
  wire: "\u0412\u044f\u0437\u0430\u043b\u044c\u043d\u0430\u044f \u043f\u0440\u043e\u0432\u043e\u043b\u043e\u043a\u0430",
  tie_wire: "\u0412\u044f\u0437\u0430\u043b\u044c\u043d\u0430\u044f \u043f\u0440\u043e\u0432\u043e\u043b\u043e\u043a\u0430",
  spacers: "\u0424\u0438\u043a\u0441\u0430\u0442\u043e\u0440\u044b \u0437\u0430\u0449\u0438\u0442\u043d\u043e\u0433\u043e \u0441\u043b\u043e\u044f",
  formwork: "\u041e\u043f\u0430\u043b\u0443\u0431\u043a\u0430",
  primer: "\u041f\u0440\u0430\u0439\u043c\u0435\u0440",
  roof_membrane: "\u041a\u0440\u043e\u0432\u0435\u043b\u044c\u043d\u0430\u044f \u043c\u0435\u043c\u0431\u0440\u0430\u043d\u0430",
  roll_membrane: "\u0420\u0443\u043b\u043e\u043d\u043d\u0430\u044f \u0433\u0438\u0434\u0440\u043e\u0438\u0437\u043e\u043b\u044f\u0446\u0438\u044f",
  drainage_membrane: "\u0414\u0440\u0435\u043d\u0430\u0436\u043d\u0430\u044f \u043c\u0435\u043c\u0431\u0440\u0430\u043d\u0430",
  bitumen_mastic: "\u0411\u0438\u0442\u0443\u043c\u043d\u0430\u044f \u043c\u0430\u0441\u0442\u0438\u043a\u0430",
  sealant: "\u0413\u0435\u0440\u043c\u0435\u0442\u0438\u043a",
  detail_tape: "\u041b\u0435\u043d\u0442\u0430 \u0434\u043b\u044f \u043f\u0440\u0438\u043c\u044b\u043a\u0430\u043d\u0438\u0439",
  turbine: "\u0413\u0438\u0434\u0440\u043e\u0442\u0443\u0440\u0431\u0438\u043d\u0430",
  generator: "\u0413\u0435\u043d\u0435\u0440\u0430\u0442\u043e\u0440",
  control_cabinet: "\u0428\u043a\u0430\u0444 \u0443\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u044f",
  cable: "\u041a\u0430\u0431\u0435\u043b\u044c \u0412\u0412\u0413\u043d\u0433-LS",
  dc_cable: "\u041a\u0430\u0431\u0435\u043b\u044c DC/AC",
  switchgear: "\u0429\u0438\u0442\u043e\u0432\u043e\u0435 \u043e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u0435",
  laminate: "\u041b\u0430\u043c\u0438\u043d\u0430\u0442",
  underlayment: "\u041f\u043e\u0434\u043b\u043e\u0436\u043a\u0430",
  baseboard: "\u041f\u043b\u0438\u043d\u0442\u0443\u0441",
  threshold: "\u041f\u043e\u0440\u043e\u0436\u0435\u043a",
  brick: "\u041a\u0438\u0440\u043f\u0438\u0447",
  mortar: "\u041a\u043b\u0430\u0434\u043e\u0447\u043d\u044b\u0439 \u0440\u0430\u0441\u0442\u0432\u043e\u0440",
  masonry_mesh: "\u041a\u043b\u0430\u0434\u043e\u0447\u043d\u0430\u044f \u0441\u0435\u0442\u043a\u0430",
  reinforcement: "\u0410\u0440\u043c\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435",
  drywall_sheet: "\u041b\u0438\u0441\u0442\u044b \u0413\u041a\u041b",
  track_profile: "\u041d\u0430\u043f\u0440\u0430\u0432\u043b\u044f\u044e\u0449\u0438\u0439 \u043f\u0440\u043e\u0444\u0438\u043b\u044c",
  stud_profile: "\u0421\u0442\u043e\u0435\u0447\u043d\u044b\u0439 \u043f\u0440\u043e\u0444\u0438\u043b\u044c",
  fasteners: "\u041a\u0440\u0435\u043f\u0435\u0436 \u043f\u043e \u0441\u0438\u0441\u0442\u0435\u043c\u0435 \u043c\u043e\u043d\u0442\u0430\u0436\u0430",
  joint_tape: "\u041b\u0435\u043d\u0442\u0430 \u0434\u043b\u044f \u0448\u0432\u043e\u0432",
  joint_putty: "\u0428\u043f\u0430\u043a\u043b\u0435\u0432\u043a\u0430 \u0448\u0432\u043e\u0432",
  sand: "\u041f\u0435\u0441\u043e\u043a",
  crushed_stone: "\u0429\u0435\u0431\u0435\u043d\u044c",
  bitumen_emulsion: "\u0411\u0438\u0442\u0443\u043c\u043d\u0430\u044f \u044d\u043c\u0443\u043b\u044c\u0441\u0438\u044f",
  asphalt_concrete: "\u0410\u0441\u0444\u0430\u043b\u044c\u0442\u043e\u0431\u0435\u0442\u043e\u043d",
  window_unit: "\u041e\u043a\u043e\u043d\u043d\u044b\u0439 \u0431\u043b\u043e\u043a",
  sill: "\u041f\u043e\u0434\u043e\u043a\u043e\u043d\u043d\u0438\u043a",
  flashing: "\u041e\u0442\u043b\u0438\u0432 / \u0434\u043e\u0431\u043e\u0440\u043d\u044b\u0439 \u044d\u043b\u0435\u043c\u0435\u043d\u0442",
  foam: "\u041c\u043e\u043d\u0442\u0430\u0436\u043d\u0430\u044f \u043f\u0435\u043d\u0430",
  duct: "\u0412\u043e\u0437\u0434\u0443\u0445\u043e\u0432\u043e\u0434",
  grille: "\u0420\u0435\u0448\u0435\u0442\u043a\u0430 / \u0434\u0438\u0444\u0444\u0443\u0437\u043e\u0440",
  fan: "\u0412\u0435\u043d\u0442\u0438\u043b\u044f\u0442\u043e\u0440",
  damper: "\u041a\u043b\u0430\u043f\u0430\u043d / \u0448\u0443\u043c\u043e\u0433\u043b\u0443\u0448\u0438\u0442\u0435\u043b\u044c",
  insulation: "\u0423\u0442\u0435\u043f\u043b\u0438\u0442\u0435\u043b\u044c",
  solar_panel: "\u0421\u043e\u043b\u043d\u0435\u0447\u043d\u0430\u044f \u043f\u0430\u043d\u0435\u043b\u044c",
  inverter: "\u0418\u043d\u0432\u0435\u0440\u0442\u043e\u0440",
  mounting: "\u041a\u0440\u0435\u043f\u0435\u0436\u043d\u0430\u044f \u0441\u0438\u0441\u0442\u0435\u043c\u0430",
  protection: "\u0417\u0430\u0449\u0438\u0442\u043d\u0430\u044f \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u043a\u0430",
  casing: "\u041e\u0431\u0441\u0430\u0434\u043d\u0430\u044f \u0442\u0440\u0443\u0431\u0430",
  filter: "\u0424\u0438\u043b\u044c\u0442\u0440",
  pump: "\u041d\u0430\u0441\u043e\u0441",
  gravel_pack: "\u0413\u0440\u0430\u0432\u0438\u0439\u043d\u0430\u044f \u043e\u0431\u0441\u044b\u043f\u043a\u0430",
  head: "\u041e\u0433\u043e\u043b\u043e\u0432\u043e\u043a",
  equipment: "\u041e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u0435",
  controls: "\u0410\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u043a\u0430",
  main_material: "\u041c\u0430\u0442\u0435\u0440\u0438\u0430\u043b \u043f\u043e \u0442\u0435\u0445\u043d\u043e\u043b\u043e\u0433\u0438\u0438 \u0440\u0430\u0431\u043e\u0442",
  auxiliary_material: "\u041a\u043e\u043c\u043f\u043b\u0435\u043a\u0442 \u0440\u0430\u0441\u0445\u043e\u0434\u043d\u044b\u0445 \u0438\u0437\u0434\u0435\u043b\u0438\u0439",
  bags: "\u041c\u0435\u0448\u043a\u0438 \u0434\u043b\u044f \u0432\u044b\u0432\u043e\u0437\u0430",
  container: "\u041a\u043e\u043d\u0442\u0435\u0439\u043d\u0435\u0440 \u0434\u043b\u044f \u043e\u0442\u0445\u043e\u0434\u043e\u0432",
  dust_protection: "\u041f\u044b\u043b\u0435\u0437\u0430\u0449\u0438\u0442\u0430",
  conduit: "\u0413\u043e\u0444\u0440\u0430 / \u043a\u0430\u0431\u0435\u043b\u044c-\u043a\u0430\u043d\u0430\u043b",
  breaker: "\u0410\u0432\u0442\u043e\u043c\u0430\u0442",
  panel: "\u0429\u0438\u0442 \u0440\u0430\u0441\u043f\u0440\u0435\u0434\u0435\u043b\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0439",
  socket: "\u0420\u043e\u0437\u0435\u0442\u043a\u0430",
  devices: "\u0420\u043e\u0437\u0435\u0442\u043a\u0438, \u0432\u044b\u043a\u043b\u044e\u0447\u0430\u0442\u0435\u043b\u0438 \u0438 \u0443\u0441\u0442\u0430\u043d\u043e\u0432\u043e\u0447\u043d\u044b\u0435 \u043a\u043e\u0440\u043e\u0431\u043a\u0438",
  electrical_consumables: "\u041c\u0430\u0440\u043a\u0438\u0440\u043e\u0432\u043a\u0430, \u043d\u0430\u043a\u043e\u043d\u0435\u0447\u043d\u0438\u043a\u0438 \u0438 \u044d\u043b\u0435\u043a\u0442\u0440\u043e\u0440\u0430\u0441\u0445\u043e\u0434\u043d\u0438\u043a\u0438",
  timber: "\u041f\u0438\u043b\u043e\u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b",
  membrane: "\u041c\u0435\u043c\u0431\u0440\u0430\u043d\u0430",
  battens: "\u041e\u0431\u0440\u0435\u0448\u0435\u0442\u043a\u0430",
  roof_covering: "\u041a\u0440\u043e\u0432\u0435\u043b\u044c\u043d\u043e\u0435 \u043f\u043e\u043a\u0440\u044b\u0442\u0438\u0435",
};

const OBJECT_LABELS_RU: Record<string, string> = {
  foundation_system: "\u0444\u0443\u043d\u0434\u0430\u043c\u0435\u043d\u0442",
  foundation: "\u0444\u0443\u043d\u0434\u0430\u043c\u0435\u043d\u0442",
  strip_foundation: "\u043b\u0435\u043d\u0442\u043e\u0447\u043d\u044b\u0439 \u0444\u0443\u043d\u0434\u0430\u043c\u0435\u043d\u0442",
  door_block: "дверной блок",
  window_block: "оконный блок",
  roof_system: "\u043a\u0440\u043e\u0432\u043b\u044f",
  roof: "\u043a\u0440\u043e\u0432\u043b\u044f",
  facade_system: "фасад",
  electrical_system: "\u044d\u043b\u0435\u043a\u0442\u0440\u0438\u043a\u0430",
  electrical_network: "\u044d\u043b\u0435\u043a\u0442\u0440\u0438\u0447\u0435\u0441\u043a\u0430\u044f \u0441\u0435\u0442\u044c",
  plumbing_system: "\u0441\u0430\u043d\u0442\u0435\u0445\u043d\u0438\u043a\u0430",
  heating_system: "система отопления",
  boiler_system: "котельное оборудование",
  ventilation_network: "\u0432\u0435\u043d\u0442\u0438\u043b\u044f\u0446\u0438\u044f",
  waterproofing_surface: "\u0433\u0438\u0434\u0440\u043e\u0438\u0437\u043e\u043b\u044f\u0446\u0438\u044f",
  road_area: "\u0434\u043e\u0440\u043e\u0436\u043d\u043e\u0435 \u043f\u043e\u043a\u0440\u044b\u0442\u0438\u0435",
  hydropower_unit: "\u0433\u0438\u0434\u0440\u043e\u0430\u0433\u0440\u0435\u0433\u0430\u0442",
  well: "\u0441\u043a\u0432\u0430\u0436\u0438\u043d\u0430",
  solar_array: "\u0441\u043e\u043b\u043d\u0435\u0447\u043d\u0430\u044f \u044d\u043b\u0435\u043a\u0442\u0440\u043e\u0441\u0442\u0430\u043d\u0446\u0438\u044f",
  masonry_wall: "\u043a\u0438\u0440\u043f\u0438\u0447\u043d\u0430\u044f \u043a\u043b\u0430\u0434\u043a\u0430",
  plastered_surface: "штукатурные работы",
  wall: "\u0441\u0442\u0435\u043d\u0430",
  floor: "\u043f\u043e\u043b",
  ceiling: "\u043f\u043e\u0442\u043e\u043b\u043e\u043a",
  window_opening: "\u043e\u043a\u043e\u043d\u043d\u044b\u0439 \u043f\u0440\u043e\u0435\u043c",
  door_opening: "\u0434\u0432\u0435\u0440\u043d\u043e\u0439 \u043f\u0440\u043e\u0435\u043c",
  site: "\u0443\u0447\u0430\u0441\u0442\u043e\u043a",
  concrete_pedestal: "\u0431\u0435\u0442\u043e\u043d\u043d\u044b\u0435 \u0442\u0443\u043c\u0431\u044b",
  metal_canopy: "\u043c\u0435\u0442\u0430\u043b\u043b\u0438\u0447\u0435\u0441\u043a\u0438\u0439 \u043d\u0430\u0432\u0435\u0441",
  paving_stone: "\u0431\u0440\u0443\u0441\u0447\u0430\u0442\u043a\u0430",
  industrial_floor: "\u043f\u0440\u043e\u043c\u044b\u0448\u043b\u0435\u043d\u043d\u044b\u0439 \u043f\u043e\u043b",
  drywall_system: "\u0441\u0438\u0441\u0442\u0435\u043c\u0430 \u0413\u041a\u041b",
  floor_covering: "\u043d\u0430\u043f\u043e\u043b\u044c\u043d\u043e\u0435 \u043f\u043e\u043a\u0440\u044b\u0442\u0438\u0435",
  earthwork_scope: "земляные работы",
  fire_alarm_system: "пожарная сигнализация",
  apartment_renovation: "ремонт квартиры",
  house_renovation: "ремонт дома",
  bathroom_renovation: "ремонт санузла",
  kitchen_renovation: "ремонт кухни",
  site_preparation: "подготовка участка",
  low_voltage_system: "\u0441\u043b\u0430\u0431\u043e\u0442\u043e\u0447\u043d\u0430\u044f \u0441\u0435\u0442\u044c",
  solar_power_system: "\u0441\u043e\u043b\u043d\u0435\u0447\u043d\u0430\u044f \u044d\u043b\u0435\u043a\u0442\u0440\u043e\u0441\u0442\u0430\u043d\u0446\u0438\u044f",
  hydropower_turbine: "\u0442\u0443\u0440\u0431\u0438\u043d\u0430 \u0413\u042d\u0421",
  passenger_elevator: "\u043f\u0430\u0441\u0441\u0430\u0436\u0438\u0440\u0441\u043a\u0438\u0439 \u043b\u0438\u0444\u0442",
  drainage_channel: "\u0434\u0440\u0435\u043d\u0430\u0436\u043d\u044b\u0439 \u043b\u043e\u0442\u043e\u043a",
  unknown: "\u0440\u0443\u0447\u043d\u0430\u044f \u0441\u043c\u0435\u0442\u043d\u0430\u044f \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0430",
};

const DOMAIN_LABELS_RU: Record<string, string> = {
  foundations: "\u0444\u0443\u043d\u0434\u0430\u043c\u0435\u043d\u0442",
  foundation: "фундамент",
  concrete: "\u0431\u0435\u0442\u043e\u043d\u043d\u044b\u0435 \u0440\u0430\u0431\u043e\u0442\u044b",
  masonry: "\u043a\u043b\u0430\u0434\u043a\u0430",
  roofing: "\u043a\u0440\u043e\u0432\u043b\u044f",
  facade: "фасад",
  electrical: "\u044d\u043b\u0435\u043a\u0442\u0440\u0438\u043a\u0430",
  plumbing: "\u0441\u0430\u043d\u0442\u0435\u0445\u043d\u0438\u043a\u0430",
  heating: "\u043e\u0442\u043e\u043f\u043b\u0435\u043d\u0438\u0435",
  ventilation: "\u0432\u0435\u043d\u0442\u0438\u043b\u044f\u0446\u0438\u044f",
  waterproofing: "гидроизоляция",
  earthworks: "земляные работы",
  demolition: "демонтаж",
  doors: "двери",
  windows: "окна",
  fire_alarm: "пожарная сигнализация",
  apartment_renovation: "ремонт квартиры",
  house_renovation: "ремонт дома",
  bathroom_renovation: "ремонт санузла",
  kitchen_renovation: "ремонт кухни",
  site_preparation: "подготовка участка",
  boilers_regulated: "котельное оборудование",
  roadworks: "\u0434\u043e\u0440\u043e\u0436\u043d\u044b\u0435 \u0440\u0430\u0431\u043e\u0442\u044b",
  landscaping: "\u043b\u0430\u043d\u0434\u0448\u0430\u0444\u0442",
  canopies: "\u043d\u0430\u0432\u0435\u0441",
  screeds: "\u0441\u0442\u044f\u0436\u043a\u0430",
  plastering: "\u0448\u0442\u0443\u043a\u0430\u0442\u0443\u0440\u043a\u0430",
  putty: "\u0448\u043f\u0430\u043a\u043b\u0435\u0432\u043a\u0430",
};

const OPERATION_LABELS_RU: Record<string, string> = {
  installation: "\u043c\u043e\u043d\u0442\u0430\u0436",
  replacement: "\u0437\u0430\u043c\u0435\u043d\u0430",
  repair: "\u0440\u0435\u043c\u043e\u043d\u0442",
  waterproofing: "\u0433\u0438\u0434\u0440\u043e\u0438\u0437\u043e\u043b\u044f\u0446\u0438\u044f",
  masonry: "\u043a\u043b\u0430\u0434\u043a\u0430",
  paving: "\u043c\u043e\u0449\u0435\u043d\u0438\u0435",
  drilling: "\u0431\u0443\u0440\u0435\u043d\u0438\u0435",
  demolition: "\u0434\u0435\u043c\u043e\u043d\u0442\u0430\u0436",
  painting: "\u043f\u043e\u043a\u0440\u0430\u0441\u043a\u0430",
  tiling: "\u0443\u043a\u043b\u0430\u0434\u043a\u0430 \u043f\u043b\u0438\u0442\u043a\u0438",
  concrete_pour: "\u0437\u0430\u043b\u0438\u0432\u043a\u0430 \u0431\u0435\u0442\u043e\u043d\u0430",
  preparation: "\u043f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u043a\u0430",
  commissioning: "\u043f\u0443\u0441\u043a\u043e\u043d\u0430\u043b\u0430\u0434\u043a\u0430",
  design_survey: "\u043e\u0431\u043c\u0435\u0440 \u0438 \u043f\u0440\u0438\u0432\u044f\u0437\u043a\u0430",
};

const WEAK_GENERIC_EXACT = new Set([
  "material",
  "materials",
  "work",
  "works",
  "misc",
  "other",
  "position 1",
  "position 2",
  "\u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b",
  "\u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b",
  "\u0440\u0430\u0431\u043e\u0442\u044b",
  "\u043f\u0440\u043e\u0447\u0435\u0435",
  "\u0443\u0441\u043b\u0443\u0433\u0438",
  "\u043f\u043e\u0437\u0438\u0446\u0438\u044f 1",
  "\u043f\u043e\u0437\u0438\u0446\u0438\u044f 2",
  "\u0434\u043e\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b",
  "\u0434\u043e\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u0440\u0430\u0431\u043e\u0442\u044b",
]);

const FORBIDDEN_VISIBLE_PATTERNS: readonly { code: string; pattern: RegExp }[] = [
  { code: "TEXT_REPLACEMENT_CHAR", pattern: /\uFFFD/u },
  { code: "SNAKE_CASE_INTERNAL_KEY", pattern: /\b[a-z][a-z0-9]+(?:_[a-z0-9]+)+\b/ },
  { code: "ENGLISH_SYSTEM_KEY", pattern: /\b(?:foundation|roofing|electrical|plumbing|ventilation|waterproofing|industrial|general)\s+system\b/i },
  { code: "VISIBLE_WARNING_TOKEN", pattern: /\bwarning\b/i },
  {
    code: "ESTIMATE_VOLUME_CONTROL_ROW",
    pattern: /\u043a\u043e\u043d\u0442\u0440\u043e\u043b\u044c\s+\u0441\u043c\u0435\u0442\u043d\u043e\u0433\u043e\s+\u043e\u0431\u044a[\u0435\u0451]\u043c\u0430/i,
  },
  {
    code: "PROFILE_MATERIAL_RESERVE_ROW",
    pattern: /\u0440\u0435\u0437\u0435\u0440\u0432\s+\u043f\u0440\u043e\u0444\u0438\u043b\u044c\u043d\u044b\u0445\s+\u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u043e\u0432/i,
  },
  {
    code: "PROFILE_FASTENERS_ROW",
    pattern: /\u043a\u0440\u0435\u043f[\u0435\u0451]\u0436\s+\u0438\s+\u043f\u0440\u043e\u0444\u0438\u043b\u044c\u043d\u044b\u0435\s+\u0440\u0430\u0441\u0445\u043e\u0434\u043d\u0438\u043a\u0438/i,
  },
  { code: "PROFESSIONAL_ASSURANCE_KEY", pattern: /\bprofessional\s+assurance\b/i },
];

const ROW_TEMPLATES: Record<Exclude<VisibleEstimateSectionType, "tax">, readonly string[]> = {
  materials: [
    "\u041a\u043e\u043c\u043f\u043b\u0435\u043a\u0442 \u0440\u0430\u0441\u0445\u043e\u0434\u043d\u044b\u0445 \u0438\u0437\u0434\u0435\u043b\u0438\u0439: {object}",
    "\u0423\u0437\u043b\u043e\u0432\u044b\u0435 \u044d\u043b\u0435\u043c\u0435\u043d\u0442\u044b: {object}",
    "\u0417\u0430\u043f\u0430\u0441 \u043d\u0430 \u043f\u043e\u0434\u0440\u0435\u0437\u043a\u0443 \u0438 \u0434\u043e\u0431\u043e\u0440: {object}",
  ],
  labor: [
    "\u041f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u043a\u0430 \u043e\u0441\u043d\u043e\u0432\u0430\u043d\u0438\u044f: {object}",
    "\u0412\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u0438\u0435 \u0440\u0430\u0431\u043e\u0442: {object}",
    "\u041f\u0440\u0438\u0435\u043c\u043a\u0430 \u043e\u0441\u043d\u043e\u0432\u0430\u043d\u0438\u044f \u043f\u043e\u0434 {object}",
    "\u0424\u0438\u043d\u0438\u0448\u043d\u0430\u044f \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 \u0438 \u0441\u0434\u0430\u0447\u0430: {object}",
  ],
  equipment: [
    "\u041c\u0430\u043b\u0430\u044f \u043c\u0435\u0445\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044f: {object}",
    "\u0418\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442 \u0438 \u043e\u0441\u043d\u0430\u0441\u0442\u043a\u0430: {object}",
    "\u041f\u043e\u0434\u044a\u0435\u043c \u0438 \u043f\u043e\u0434\u0430\u0447\u0430 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u043e\u0432: {object}",
  ],
  delivery: [
    "\u0414\u043e\u0441\u0442\u0430\u0432\u043a\u0430 \u0438 \u0440\u0430\u0437\u0433\u0440\u0443\u0437\u043a\u0430: {object}",
    "\u0412\u044b\u0432\u043e\u0437 \u043e\u0442\u0445\u043e\u0434\u043e\u0432 \u043f\u043e\u0441\u043b\u0435 \u0440\u0430\u0431\u043e\u0442: {object}",
    "\u0417\u0430\u0449\u0438\u0442\u0430 \u0438 \u0445\u0440\u0430\u043d\u0435\u043d\u0438\u0435 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u043e\u0432 \u0434\u043b\u044f {object}",
  ],
};

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeVisibleText(value: string): string {
  return normalize(normalizeRuText(value));
}

function normalizeKey(key: string | undefined): string | undefined {
  const normalized = key?.replace(/\\/g, "/").trim();
  return normalized ? normalized : undefined;
}

function stripVisibleDebugWords(label: string): string {
  return normalize(
    normalizeRuText(label)
      .replace(/\bwarning\b/gi, "\u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044f \u0443\u0442\u043e\u0447\u043d\u0435\u043d\u0438\u0435")
      .replace(/\bprofessional\s+assurance\b/gi, "\u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 \u043a\u0430\u0447\u0435\u0441\u0442\u0432\u0430")
  );
}

export function isWeakGenericVisibleEstimateLabel(value: string): boolean {
  return WEAK_GENERIC_EXACT.has(normalizeVisibleText(value).toLocaleLowerCase("ru-RU"));
}

export function visibleEstimateLabelViolations(value: string): string[] {
  const normalized = normalizeVisibleText(value);
  const failures = FORBIDDEN_VISIBLE_PATTERNS
    .filter(({ pattern }) => pattern.test(normalized))
    .map(({ code }) => code);
  if (!/[\u0400-\u04ff]/u.test(normalized) && /[a-z]{3,}/i.test(normalized) && !/^[A-Z0-9/ .-]{2,10}$/.test(normalized)) {
    failures.push("ENGLISH_FALLBACK_VISIBLE_LABEL");
  }
  if (isWeakGenericVisibleEstimateLabel(normalized)) failures.push("WEAK_GENERIC_VISIBLE_LABEL");
  return failures;
}

export function visibleMaterialLabelForKey(key: string | undefined): string | undefined {
  const normalized = normalizeKey(key);
  if (!normalized) return undefined;
  return MATERIAL_LABELS_RU[normalized] ?? MATERIAL_LABELS_RU[normalized.replace(/_material_\d+$/, "")];
}

export function visibleObjectLabelForKey(key: string | undefined): string {
  const normalized = normalizeKey(key);
  if (!normalized) return "\u0440\u0430\u0431\u043e\u0442\u044b \u043d\u0430 \u043e\u0431\u044a\u0435\u043a\u0442\u0435";
  return OBJECT_LABELS_RU[normalized] ?? DOMAIN_LABELS_RU[normalized] ?? "\u0440\u0430\u0431\u043e\u0442\u044b \u043f\u043e \u0443\u043a\u0430\u0437\u0430\u043d\u043d\u043e\u043c\u0443 \u0434\u043e\u043c\u0435\u043d\u0443";
}

export function visibleDomainLabelForKey(key: string | undefined): string {
  const normalized = normalizeKey(key);
  if (!normalized) return "\u0441\u0442\u0440\u043e\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0439 \u0434\u043e\u043c\u0435\u043d";
  return DOMAIN_LABELS_RU[normalized] ?? visibleObjectLabelForKey(normalized);
}

export function visibleOperationLabelForKey(key: string | undefined): string {
  const normalized = normalizeKey(key);
  if (!normalized) return "\u0440\u0430\u0431\u043e\u0442\u044b";
  return OPERATION_LABELS_RU[normalized] ?? "\u0440\u0430\u0431\u043e\u0442\u044b";
}

export function toVisibleEstimateLabel(input: {
  label?: string;
  materialKey?: string;
  objectKey?: string;
  domainKey?: string;
  operationKey?: string;
  sectionType?: VisibleEstimateSectionType;
}): string {
  const candidate = input.label ? stripVisibleDebugWords(input.label) : "";
  if (candidate && visibleEstimateLabelViolations(candidate).length === 0) return candidate;

  if (input.sectionType === "materials") {
    const materialLabel = visibleMaterialLabelForKey(input.materialKey);
    if (materialLabel) return materialLabel;
  }

  return buildVisibleBoqRowName({
    sectionType: input.sectionType === "tax" ? "labor" : input.sectionType ?? "labor",
    materialKey: input.materialKey,
    objectKey: input.objectKey,
    domainKey: input.domainKey,
    operationKey: input.operationKey,
  });
}

export function buildVisibleBoqRowName(input: {
  sectionType: Exclude<VisibleEstimateSectionType, "tax">;
  materialKey?: string;
  objectKey?: string;
  domainKey?: string;
  operationKey?: string;
  index?: number;
}): string {
  if (input.sectionType === "materials") {
    const materialLabel = visibleMaterialLabelForKey(input.materialKey);
    if (materialLabel) return materialLabel;
  }

  const object = visibleObjectLabelForKey(input.objectKey ?? input.domainKey);
  const templates = ROW_TEMPLATES[input.sectionType];
  const template = templates[(input.index ?? 0) % templates.length];
  const operation = visibleOperationLabelForKey(input.operationKey);
  const rowName = template.replace("{object}", object).replace("{operation}", operation);
  return toVisibleEstimateLabel({ label: rowName, sectionType: input.sectionType, objectKey: input.objectKey, domainKey: input.domainKey });
}

export function assertVisibleEstimateLabel(value: string, context = "visible_estimate_label"): void {
  const failures = visibleEstimateLabelViolations(value);
  if (failures.length > 0) {
    throw new Error(`${context}:${failures.join("|")}:${value}`);
  }
}

export function formatCatalogMaterialButtonLabel(input: {
  visibleName?: string;
  materialKey?: string;
}): string {
  const label = toVisibleEstimateLabel({
    label: input.visibleName,
    materialKey: input.materialKey,
    sectionType: "materials",
  });
  return `${RU.catalogPrefix} ${label.toLocaleLowerCase("ru-RU")}`;
}
