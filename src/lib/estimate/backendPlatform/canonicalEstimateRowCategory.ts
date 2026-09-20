export type CanonicalEstimateNormalizedRowCategory =
  | "material"
  | "work"
  | "equipment"
  | "service"
  | "delivery";

const CATEGORY_MARKERS: ReadonlyArray<{
  category: CanonicalEstimateNormalizedRowCategory;
  markers: readonly string[];
}> = [
  {
    category: "delivery",
    markers: ["delivery", "logistics", "transport", "freight", "haul", "достав", "логист", "перевоз", "транспорт"],
  },
  {
    category: "equipment",
    markers: ["equipment", "machinery", "mechanism", "machine", "tool", "механизм", "оборудован", "машин"],
  },
  {
    category: "material",
    markers: ["material", "product", "waste", "материал", "сырь", "издел", "отход"],
  },
  {
    category: "service",
    markers: ["service", "testing", "test", "documentation", "commissioning", "supervision", "control", "overhead", "услуг", "испытан", "контрол", "документ", "сопутств"],
  },
  {
    category: "work",
    markers: ["temporary_work", "labor", "works", "work", "работ", "труд", "монтаж"],
  },
];

export function normalizeCanonicalEstimateRowCategory(
  section: string | null | undefined,
  category: string | null | undefined,
): CanonicalEstimateNormalizedRowCategory {
  const value = `${section ?? ""} ${category ?? ""}`.toLocaleLowerCase("ru-RU");
  return CATEGORY_MARKERS.find(({ markers }) => markers.some((marker) => value.includes(marker)))?.category
    ?? "work";
}
