import {
  type ConstructionDiscipline,
} from "./constructionKnowledgeTypes";

type DisciplineRule = {
  discipline: ConstructionDiscipline;
  terms: string[];
};

const DISCIPLINE_RULES: readonly DisciplineRule[] = [
  { discipline: "architecture", terms: ["архитект", "ap", "ar-", "планировка", "экспликация", "фасадный паспорт"] },
  { discipline: "structural", terms: ["конструктив", "кр", "каркас", "фундамент", "перекрытие", "балка", "колонна"] },
  { discipline: "civil", terms: ["общестрой", "civil", "генплан", "наружные работы"] },
  { discipline: "road", terms: ["дорога", "асфальт", "брусчат", "бордюр", "тротуар", "проезж"] },
  { discipline: "earthworks", terms: ["землян", "грунт", "котлован", "засыпка", "уплотнение"] },
  { discipline: "concrete", terms: ["бетон", "армирован", "опалуб", "монолит", "заливка"] },
  { discipline: "steel", terms: ["металлоконструк", "свар", "болтов", "сталь", "ферма"] },
  { discipline: "masonry", terms: ["кладка", "кирпич", "газоблок", "перегород"] },
  { discipline: "roofing", terms: ["кров", "водосток", "пароизоля", "рулонная"] },
  { discipline: "facade", terms: ["фасад", "подсистема", "витраж", "облицовка"] },
  { discipline: "finishing", terms: ["отдел", "штукатур", "стяжка", "плитка", "покраска", "потолок"] },
  { discipline: "mep", terms: ["mep", "инженерные системы", "инженерка"] },
  { discipline: "hvac", terms: ["вентиляц", "раздел ов", "кондиционир", "дымоудален", "воздуховод"] },
  { discipline: "plumbing", terms: ["раздел вк", "водопровод", "канализац", "труба", "трубопровод", "насос"] },
  { discipline: "electrical", terms: ["эом", "электр", "кабель", "щит", "освещение"] },
  { discipline: "low_voltage", terms: ["слаботоч", "скс", "видеонаблюден", "сигнализац", "лоу"] },
  { discipline: "fire_safety", terms: ["пожар", "апс", "спз", "огнезащ", "пожаротуш"] },
  { discipline: "automation", terms: ["автоматизац", "диспетчер", "кип", "bms"] },
  { discipline: "geodesy", terms: ["геодез", "разбив", "отметк", "исполнительная съемка"] },
  { discipline: "landscaping", terms: ["благоустрой", "озелен", "малые формы", "газон"] },
  { discipline: "hydraulic", terms: ["гидро", "водосброс", "дамба", "канал", "лоток"] },
  { discipline: "energy", terms: ["подстанц", "тэц", "гэс", "котельн", "энерго"] },
  { discipline: "industrial", terms: ["промышлен", "технологическое оборудование", "производствен"] },
  { discipline: "commissioning", terms: ["пусконалад", "испытан", "наладка", "commissioning"] },
  { discipline: "as_built", terms: ["исполнительн", "as-built", "исп схема"] },
  { discipline: "quality_control", terms: ["качество", "дефект", "замечан", "приемка"] },
  { discipline: "safety", terms: ["охрана труда", "техника безопасности", "наряд-допуск"] },
];

function normalize(value: string): string {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

export function classifyConstructionDiscipline(input: {
  fileName?: string;
  text?: string;
}): {
  discipline: ConstructionDiscipline | "unknown";
  confidence: "high" | "medium" | "low";
  matchedTerms: string[];
} {
  const haystack = normalize(`${input.fileName ?? ""} ${input.text ?? ""}`);
  if (!haystack) {
    return { discipline: "unknown", confidence: "low", matchedTerms: [] };
  }

  const scored = DISCIPLINE_RULES
    .map((rule) => ({
      discipline: rule.discipline,
      matchedTerms: rule.terms.filter((term) => haystack.includes(normalize(term))),
    }))
    .filter((item) => item.matchedTerms.length > 0)
    .sort((a, b) => b.matchedTerms.length - a.matchedTerms.length);

  const best = scored[0];
  if (!best) {
    return { discipline: "unknown", confidence: "low", matchedTerms: [] };
  }

  return {
    discipline: best.discipline,
    confidence: best.matchedTerms.length >= 2 ? "high" : "medium",
    matchedTerms: best.matchedTerms,
  };
}

export function aiConstructionDisciplineProvider(input: {
  fileName?: string;
  text?: string;
}) {
  return classifyConstructionDiscipline(input);
}
