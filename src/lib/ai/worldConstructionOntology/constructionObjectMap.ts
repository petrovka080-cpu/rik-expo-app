import type { WorldConstructionObjectScope } from "./worldConstructionTypes";

export type ConstructionObjectRule = {
  objectScope: WorldConstructionObjectScope;
  keywords: readonly string[];
  labelRu: string;
};

export const CONSTRUCTION_OBJECT_RULES: readonly ConstructionObjectRule[] = [
  { objectScope: "roof", labelRu: "кровля", keywords: ["крыш", "кровля", "кровель", "roof", "flat roof", "gable roof"] },
  { objectScope: "bathroom", labelRu: "ванная / санузел", keywords: ["ванн", "сануз", "душев", "bathroom", "shower"] },
  { objectScope: "foundation", labelRu: "фундамент", keywords: ["фундамент", "foundation"] },
  { objectScope: "basement", labelRu: "подвал", keywords: ["подвал", "цоколь", "basement"] },
  { objectScope: "balcony_terrace", labelRu: "балкон / терраса", keywords: ["балкон", "терраса", "terrace", "balcony"] },
  { objectScope: "wall", labelRu: "стена", keywords: ["стена", "стены", "фасад", "wall", "facade"] },
  { objectScope: "floor", labelRu: "пол", keywords: [" пол ", "полы", "наполь", "floor", "subfloor"] },
  { objectScope: "ceiling", labelRu: "потолок", keywords: ["потолок", "ceiling"] },
  { objectScope: "window_opening", labelRu: "оконный проем", keywords: ["окно", "окон", "window"] },
  { objectScope: "door_opening", labelRu: "дверной проем", keywords: ["двер", "door"] },
  { objectScope: "road_area", labelRu: "дорожное покрытие", keywords: ["асфальт", "дорога", "парковка", "road", "asphalt", "paving"] },
  { objectScope: "hydropower_unit", labelRu: "гидроагрегат", keywords: ["гэс", "гидроагрегат", "гидротурбина", "турбина", "hydropower", "hydro turbine", "turbine"] },
  { objectScope: "well", labelRu: "скважина", keywords: ["скважин", "бурение", "well", "drilling"] },
  { objectScope: "solar_array", labelRu: "солнечная станция", keywords: ["солнеч", "панел", "solar", "pv"] },
  { objectScope: "ventilation_network", labelRu: "сеть вентиляции", keywords: ["вентиляц", "воздуховод", "ventilation", "duct"] },
  { objectScope: "electrical_network", labelRu: "электросеть", keywords: ["электр", "кабель", "щит", "розет", "electrical", "cable"] },
  { objectScope: "masonry_wall", labelRu: "кирпичная стена", keywords: ["кладк", "кирпич", "masonry", "brick"] },
  { objectScope: "strip_foundation", labelRu: "ленточный фундамент", keywords: ["ленточный фундамент", "strip foundation"] },
  { objectScope: "site", labelRu: "площадка", keywords: ["площадк", "участок", "site"] },
];

export function objectLabelRu(objectScope: WorldConstructionObjectScope): string {
  return CONSTRUCTION_OBJECT_RULES.find((rule) => rule.objectScope === objectScope)?.labelRu ?? "объект не уточнен";
}
