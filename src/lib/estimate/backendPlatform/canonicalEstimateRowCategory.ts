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
  // A mixed operation section can contain labor and machinery together.
  // The persisted row category determines its resource type.
  const explicit = (category ?? "").trim().toLocaleLowerCase("ru-RU");
  const canonical: Readonly<Record<string, CanonicalEstimateNormalizedRowCategory>> = {
    material: "material", labor: "work", work: "work", equipment: "equipment",
    machinery: "equipment", service: "service", delivery: "delivery",
  };
  if (Object.hasOwn(canonical, explicit)) return canonical[explicit];
  const value = `${section ?? ""} ${category ?? ""}`.toLocaleLowerCase("ru-RU");
  return CATEGORY_MARKERS.find(({ markers }) => markers.some((marker) => value.includes(marker)))?.category
    ?? "work";
}
