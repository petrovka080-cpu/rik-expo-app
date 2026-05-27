import type { WorldConstructionComplexity, WorldConstructionDomain, WorldConstructionObjectScope } from "./worldConstructionTypes";

const regulatedDomains = new Set<WorldConstructionDomain>([
  "hydropower",
  "electrical",
  "solar",
  "fire_alarm",
  "low_voltage",
  "structural_repair",
  "demolition",
  "well_drilling",
]);

export function classifyConstructionRisk(input: {
  domain: WorldConstructionDomain;
  objectScope: WorldConstructionObjectScope;
  text: string;
}): { riskClass: "normal" | "safety_sensitive" | "regulated"; complexity: WorldConstructionComplexity } {
  const text = input.text.toLocaleLowerCase("ru-RU");
  if (regulatedDomains.has(input.domain) || /лиценз|гэс|электр|газ|несущ|пожар|опасн|regulated|licensed/.test(text)) {
    return { riskClass: "regulated", complexity: input.domain === "hydropower" ? "infrastructure" : "complex" };
  }
  if (input.objectScope === "roof" || input.objectScope === "foundation" || input.objectScope === "basement") {
    return { riskClass: "safety_sensitive", complexity: "complex" };
  }
  if (["roadworks", "civil_infrastructure", "ventilation"].includes(input.domain)) {
    return { riskClass: "normal", complexity: "complex" };
  }
  return { riskClass: "normal", complexity: "medium" };
}

export function requiredMinimumRows(complexity: WorldConstructionComplexity): number {
  if (complexity === "infrastructure") return 45;
  if (complexity === "complex") return 35;
  if (complexity === "medium") return 20;
  return 12;
}
