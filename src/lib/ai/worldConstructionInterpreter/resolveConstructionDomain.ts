import { CONSTRUCTION_DOMAIN_MAP, type WorldConstructionDomain } from "../worldConstructionOntology";
import { normalizeConstructionPrompt } from "./normalizeConstructionPrompt";

type DomainRule = {
  domain: WorldConstructionDomain;
  tokens: readonly string[];
};

const domainRules: readonly DomainRule[] = [
  { domain: "steel_structures", tokens: ["steel frame", "metal farm storage", "farm storage", "storage buildings", "warehouse", "steel structure", "metalworks"] },
  { domain: "commercial_fit_out", tokens: ["fitout", "fit-out", "clinic", "school", "medical", "retail", "office", "restaurant"] },
  { domain: "renovation", tokens: ["renovation", "maintenance", "repair construction", "building maintenance", "turnkey", "emergency repair", "emergency repairs", "home repairs", "small home repairs", "home construction work", "repair emergency"] },
  { domain: "hydropower", tokens: ["гэс", "гидроэлектростанц", "гидро турбин", "hydro turbine", "hydropower"] },
  { domain: "roadworks", tokens: ["асфальт", "асфальтобетон", "дорог", "парковк", "road", "asphalt", "paving"] },
  { domain: "roofing", tokens: ["крыша", "кровля", "кровель", "стропил", "roof", "gable"] },
  { domain: "waterproofing", tokens: ["гидроизоля", "waterproof"] },
  { domain: "masonry", tokens: ["кладк", "кирпич", "газоблок", "masonry", "brick"] },
  { domain: "drywall", tokens: ["гкл", "гипсокартон", "drywall"] },
  { domain: "windows", tokens: ["окн", "window"] },
  { domain: "flooring", tokens: ["ламинат", "ковролин", "паркет", "линолеум", "floor", "laminate", "carpet"] },
  { domain: "well_drilling", tokens: ["бурение", "скважин", "well drilling", "well"] },
  { domain: "ventilation", tokens: ["вентиляц", "воздуховод", "ventilation", "duct"] },
  { domain: "solar", tokens: ["солнеч", "панел", "solar", "pv"] },
  { domain: "electrical", tokens: ["электр", "кабель", "щит", "розет", "electrical", "wiring"] },
  { domain: "foundations", tokens: ["фундамент", "foundation"] },
  { domain: "concrete", tokens: ["бетон", "арматур", "concrete", "rebar"] },
  { domain: "tiling", tokens: ["плитк", "кафель", "tile"] },
  { domain: "painting", tokens: ["покрас", "краск", "paint"] },
  { domain: "plumbing", tokens: ["сантех", "труб", "канализац", "plumbing", "pipe"] },
  { domain: "demolition", tokens: ["демонтаж", "снос", "demolition"] },
  { domain: "facade", tokens: ["фасад", "facade"] },
  { domain: "insulation", tokens: ["утепл", "insulation"] },
  { domain: "landscaping", tokens: ["благоустрой", "газон", "landscaping"] },
];

function matchesDomainToken(normalized: string, token: string): boolean {
  const normalizedToken = normalizeConstructionPrompt(token);
  if (normalizedToken === "\u043a\u043b\u0430\u0434\u043a") {
    return normalized.split(" ").some((word) => /^кладк/i.test(word));
  }
  return normalized.includes(normalizedToken);
}

export function resolveConstructionDomain(text: string): {
  domain: WorldConstructionDomain;
  secondaryDomains: WorldConstructionDomain[];
  score: number;
} {
  const normalized = normalizeConstructionPrompt(text);
  const scored = domainRules
    .map((rule) => ({
      domain: rule.domain,
      score: rule.tokens.filter((token) => matchesDomainToken(normalized, token)).length,
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score);

  const primary = scored[0]?.domain ?? "unknown";
  const secondary = scored.slice(1).map((item) => item.domain);
  if (primary === "waterproofing" && secondary.includes("roofing")) {
    return { domain: "roofing", secondaryDomains: ["waterproofing", ...secondary.filter((item) => item !== "roofing")], score: scored[0]?.score ?? 1 };
  }
  if (primary === "roofing" && normalized.includes("гидроизоля")) {
    return { domain: "roofing", secondaryDomains: ["waterproofing", ...secondary], score: scored[0]?.score ?? 1 };
  }
  if (primary !== "unknown" && CONSTRUCTION_DOMAIN_MAP.some((definition) => definition.domain === primary)) {
    return { domain: primary, secondaryDomains: secondary, score: scored[0]?.score ?? 1 };
  }
  return { domain: "unknown", secondaryDomains: [], score: 0 };
}
