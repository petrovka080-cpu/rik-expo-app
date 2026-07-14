import type { S2BDomainPack, S2BWave2Kind } from "../types";

export const S2B_WELLS_RENEWABLES_DOMAIN_PACKS: Pick<Record<S2BWave2Kind, S2BDomainPack>, "well" | "solar"> = {
  well: {
    prefix: "s2b_well",
    workUnit: "m",
    components: [
      { code: "mobilization", titleRu: "мобилизация буровой", materialUnit: "set", materialKey: "well_mobilization" },
      { code: "geology", titleRu: "геология и интервал бурения", materialUnit: "set", materialKey: "well_geology" },
      { code: "drilling", titleRu: "бурение по интервалам", materialUnit: "m", materialKey: "well_drilling" },
      { code: "casing", titleRu: "обсадная труба", materialUnit: "m", materialKey: "well_casing" },
      { code: "cementing", titleRu: "цементаж затрубного пространства", materialUnit: "set", materialKey: "well_cementing" },
      { code: "filter_column", titleRu: "фильтровая колонна", materialUnit: "m", materialKey: "well_filter_column" },
      { code: "gravel_pack", titleRu: "гравийная обсыпка", materialUnit: "m3", materialKey: "well_gravel_pack" },
      { code: "flushing", titleRu: "промывка скважины", materialUnit: "set", materialKey: "well_flushing" },
      { code: "test_pumping", titleRu: "опытная откачка", materialUnit: "set", materialKey: "well_test_pumping" },
      { code: "water_analysis", titleRu: "анализ воды", materialUnit: "set", materialKey: "well_water_analysis" },
      { code: "pump_head", titleRu: "насос и оголовок", materialUnit: "set", materialKey: "well_pump_head" },
      { code: "passport_zone", titleRu: "паспорт и санитарная зона", materialUnit: "set", materialKey: "well_passport_zone" },
    ],
  },
  solar: {
    prefix: "s2b_solar",
    workUnit: "set",
    components: [
      { code: "capacity_region", titleRu: "мощность, регион и ориентация", materialUnit: "set", materialKey: "solar_capacity_region" },
      { code: "foundations", titleRu: "основания конструкций", materialUnit: "m3", materialKey: "solar_foundations" },
      { code: "mounting_structure", titleRu: "несущая конструкция", materialUnit: "set", materialKey: "solar_mounting_structure" },
      { code: "panels", titleRu: "солнечные панели без выбора модели", materialUnit: "set", materialKey: "solar_panels" },
      { code: "inverters", titleRu: "инверторы без выбора модели", materialUnit: "set", materialKey: "solar_inverters" },
      { code: "dc_cables", titleRu: "DC кабельные трассы", materialUnit: "m", materialKey: "solar_dc_cables" },
      { code: "ac_cables", titleRu: "AC кабельные трассы", materialUnit: "m", materialKey: "solar_ac_cables" },
      { code: "combiner_boxes", titleRu: "строковые боксы и защита", materialUnit: "pcs", materialKey: "combiner_boxes" },
      { code: "grounding", titleRu: "заземление станции", materialUnit: "set", materialKey: "solar_grounding" },
      { code: "monitoring", titleRu: "мониторинг станции", materialUnit: "set", materialKey: "solar_monitoring" },
      { code: "grid_connection", titleRu: "подключение к сети", materialUnit: "set", materialKey: "solar_grid_connection" },
      { code: "commissioning", titleRu: "испытания и ввод в работу", materialUnit: "set", materialKey: "solar_commissioning" },
    ],
  },
};
