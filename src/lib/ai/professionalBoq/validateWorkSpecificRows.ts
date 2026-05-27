import type { ProfessionalBoqResult } from "./professionalBoqTypes";

const tokensByWork: Record<string, string[]> = {
  micro_hydro_preparation: ["турбина", "генератор", "шкаф", "синхронизац", "кабел", "пнр", "напор", "расход"],
  roof_waterproofing: ["кровл", "праймер", "мембран", "мастик", "примыкан", "воронк", "герметизац"],
  laminate_laying: ["ламинат", "подлож", "плинтус", "укладк", "подрез"],
  brick_masonry: ["кирпич", "раствор", "клад", "армирован", "расшив"],
  drywall_wall_cladding: ["гкл", "профиль", "крепеж", "каркас", "шпаклев"],
  asphalt_paving: ["пес", "щеб", "битум", "асфальт", "уплотнен"],
  window_installation: ["окон", "подокон", "отлив", "пена", "герметизац"],
};

export function validateWorkSpecificRows(result: ProfessionalBoqResult): { passed: boolean; failures: string[] } {
  const workKey = result.primitive.workKey ?? "";
  const expected = tokensByWork[workKey] ?? [];
  if (expected.length === 0) return { passed: true, failures: [] };
  const haystack = result.sections.flatMap((section) => section.rows.map((row) => row.nameRu)).join("\n").toLocaleLowerCase("ru-RU");
  const hits = expected.filter((token) => haystack.includes(token.toLocaleLowerCase("ru-RU")));
  const minimum = workKey === "micro_hydro_preparation" ? 6 : 4;
  return {
    passed: hits.length >= minimum,
    failures: hits.length >= minimum ? [] : [`work_specific_rows_missing:${workKey}:${hits.length}/${minimum}`],
  };
}
