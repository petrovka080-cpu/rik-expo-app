import { CONSTRUCTION_PRIMITIVE_DOMAINS } from "../constructionDomainPrimitives";
import type {
  WorldConstructionDomain,
  WorldConstructionMethod,
  WorldConstructionObjectScope,
  WorldConstructionOperation,
} from "../../worldConstructionOntology";

export type OpenWorldPrimitiveStressCase = {
  id: string;
  prompt: string;
  domain: WorldConstructionDomain;
  object: WorldConstructionObjectScope;
  operation: WorldConstructionOperation;
  method: WorldConstructionMethod;
  quantity: number;
  unit: string;
  city: string;
  synonymSeed: string;
};

const cities = [
  "Bishkek",
  "Almaty",
  "Austin Texas",
  "Tashkent",
  "Osh",
  "Dubai",
  "Istanbul",
  "Berlin",
  "Warsaw",
  "Tbilisi",
];

const quantities = [15, 36, 48, 55, 67, 80, 100, 120, 180, 647];
const units = ["sq_m", "linear_m", "m3", "pcs", "set", "kg", "ton"];
const operationVerbs = ["estimate", "install", "build", "repair", "prepare", "measure", "scope", "price", "plan", "compile boq"];

function caseFor(domainIndex: number, variantIndex: number): OpenWorldPrimitiveStressCase {
  const definition = CONSTRUCTION_PRIMITIVE_DOMAINS[domainIndex];
  const object = definition.objects[variantIndex % definition.objects.length];
  const operation = definition.operations[variantIndex % definition.operations.length];
  const method = definition.methods[variantIndex % definition.methods.length];
  const unit = definition.units[variantIndex % definition.units.length] ?? units[variantIndex % units.length];
  const quantity = quantities[(domainIndex + variantIndex) % quantities.length];
  const city = cities[(domainIndex * 3 + variantIndex) % cities.length];
  const synonymSeed = `${definition.domain}:${object}:${operation}:${method}`;
  return {
    id: `primitive_${definition.domain}_${variantIndex + 1}`,
    prompt: `${operationVerbs[variantIndex]} ${definition.domain} ${object} ${operation} by ${method} ${quantity} ${unit} in ${city}`,
    domain: definition.domain,
    object,
    operation,
    method,
    quantity,
    unit,
    city,
    synonymSeed,
  };
}

const stressDomains = CONSTRUCTION_PRIMITIVE_DOMAINS
  .filter((domain) => domain.domain !== "unknown")
  .slice(0, 30);

export const OPEN_WORLD_PRIMITIVE_STRESS_PACK: readonly OpenWorldPrimitiveStressCase[] =
  stressDomains.flatMap((_, domainIndex) =>
    Array.from({ length: 10 }, (_value, variantIndex) => caseFor(domainIndex, variantIndex)),
  );

export const OPEN_WORLD_PRIMITIVE_STRESS_PACK_CONTRACT = {
  domains: stressDomains.map((domain) => domain.domain),
  domainsTotal: stressDomains.length,
  casesTotal: OPEN_WORLD_PRIMITIVE_STRESS_PACK.length,
  variantsPerDomain: 10,
  requiredMinimumCases: 300,
} as const;
