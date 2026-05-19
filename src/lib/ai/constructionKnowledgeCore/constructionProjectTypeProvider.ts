import type { ConstructionProjectType } from "./constructionKnowledgeTypes";

const PROJECT_TYPE_RULES: readonly {
  projectType: ConstructionProjectType;
  terms: string[];
}[] = [
  { projectType: "residential", terms: ["жилой", "жк", "дом", "коттедж", "квартира", "многоэтаж"] },
  { projectType: "commercial", terms: ["офис", "торгов", "магазин", "коммерчес", "бизнес-центр"] },
  { projectType: "industrial", terms: ["пром", "склад", "производ", "цех", "завод"] },
  { projectType: "road", terms: ["дорога", "трасса", "асфальт", "брусчат", "тротуар"] },
  { projectType: "infrastructure", terms: ["мост", "тоннель", "инфраструкт", "линейный"] },
  { projectType: "energy", terms: ["подстанц", "энергообъект", "электросеть", "кабельная линия"] },
  { projectType: "hydro", terms: ["гэс", "гидро", "водозабор", "дамба"] },
  { projectType: "thermal_power", terms: ["тэц", "котельн", "теплоэлект", "теплостанц"] },
  { projectType: "utility_network", terms: ["водопровод", "канализац", "теплосеть", "наружные сети"] },
  { projectType: "landscaping", terms: ["благоустрой", "озелен", "парк", "площадка"] },
];

function normalize(value: string): string {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

export function classifyConstructionProjectType(input: {
  title?: string;
  description?: string;
  fileName?: string;
}): {
  projectType: ConstructionProjectType;
  confidence: "high" | "medium" | "low";
  matchedTerms: string[];
} {
  const haystack = normalize(`${input.title ?? ""} ${input.description ?? ""} ${input.fileName ?? ""}`);
  const scored = PROJECT_TYPE_RULES
    .map((rule) => ({
      projectType: rule.projectType,
      matchedTerms: rule.terms.filter((term) => haystack.includes(normalize(term))),
    }))
    .filter((item) => item.matchedTerms.length > 0)
    .sort((a, b) => b.matchedTerms.length - a.matchedTerms.length);

  const best = scored[0];
  if (!best) {
    return { projectType: "other", confidence: "low", matchedTerms: [] };
  }

  return {
    projectType: best.projectType,
    confidence: best.matchedTerms.length >= 2 ? "high" : "medium",
    matchedTerms: best.matchedTerms,
  };
}

export function aiConstructionProjectTypeProvider(input: {
  title?: string;
  description?: string;
  fileName?: string;
}) {
  return classifyConstructionProjectType(input);
}
