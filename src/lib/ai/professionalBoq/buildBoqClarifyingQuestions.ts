import type { WorldConstructionPrimitive } from "../worldConstructionOntology";

export function buildBoqClarifyingQuestions(primitive: WorldConstructionPrimitive): string[] {
  if (primitive.workKey === "micro_hydro_preparation") {
    return [
      "Напор H?",
      "Расход Q?",
      "Тип турбины?",
      "Длина и диаметр напорной трубы?",
      "Состояние машинного зала?",
      "Точка подключения?",
      "Режим работы: сеть или автономно?",
      "Нужен ли трансформатор?",
      "Нужна ли ЛЭП?",
      "Какие допуски, разрешения и инспекции требуются на объекте?",
    ];
  }
  if (primitive.outcome === "AMBIGUOUS_NEEDS_DISAMBIGUATION") {
    return [`Уточните объект: ${primitive.disambiguationOptions.join(", ")}?`];
  }
  if (primitive.workKey === "roof_waterproofing") {
    return [
      "Какой материал нужен для кровли: рулонный, мембрана или мастика?",
      "Есть ли парапеты, проходки, воронки и сложные примыкания?",
      "Нужно ли включить ремонт дефектов основания кровли?",
      "Нужна ли проверка герметичности после работ?",
    ];
  }
  return [...primitive.clarifyingQuestions].slice(0, 8);
}
