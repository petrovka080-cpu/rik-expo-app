export type CapitalRenovationGroupId =
  | "demolition"
  | "rough_floors"
  | "walls"
  | "painting"
  | "floor_finishes"
  | "bathrooms"
  | "electrical"
  | "plumbing"
  | "doors"
  | "logistics";

export type CapitalRenovationLineType = "material" | "work" | "service" | "equipment";

export type CapitalRenovationEstimateRow = {
  code: string;
  groupId: CapitalRenovationGroupId;
  groupTitle: string;
  lineType: CapitalRenovationLineType;
  titleRu: string;
  quantity: number;
  unit: string;
  formula: string;
  materialKey?: string;
  includedInProcurement: boolean;
};

export const CAPITAL_RENOVATION_GROUP_TITLES: Record<CapitalRenovationGroupId, string> = {
  demolition: "Демонтаж и подготовка",
  rough_floors: "Черновые полы",
  walls: "Стены",
  painting: "Покраска",
  floor_finishes: "Полы",
  bathrooms: "Санузлы",
  electrical: "Электрика",
  plumbing: "Сантехника",
  doors: "Двери",
  logistics: "Услуги / логистика",
};
