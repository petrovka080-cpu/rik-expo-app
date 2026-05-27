import type { ProfessionalBoqRow } from "./professionalBoqTypes";

function delivery(code: string, nameRu: string, factor: number, unitPrice: number): ProfessionalBoqRow {
  return {
    sectionType: "delivery",
    code,
    nameRu,
    unit: "set",
    quantityFactor: factor,
    unitPrice,
    rateKey: `world_${code}`,
    sourcePolicy: "configured_reference",
    catalogPolicy: "not_material",
    commentRu: "Логистика зависит от адреса, этажности, подъезда и сроков.",
  };
}

export function buildBoqLogisticsRows(workKey: string | null): ProfessionalBoqRow[] {
  if (workKey === "micro_hydro_preparation") {
    return [
      delivery("hydro_delivery", "Доставка гидроагрегата и автоматики", 1, 35000),
      delivery("hydro_team_mobilization", "Мобилизация бригады", 1, 18000),
      delivery("hydro_reserve", "Резерв", 1, 45000),
    ];
  }
  return [
    delivery("delivery_materials", "Доставка материалов", 1, 120),
    delivery("waste_removal", "Вывоз мусора", 1, 80),
    delivery("contingency_reserve", "Резерв на уточнение объема", 1, 100),
  ];
}
