import {
  CONSTRUCTION_OPERATION_RULES,
  type WorldConstructionDomain,
  type WorldConstructionOperation,
} from "../worldConstructionOntology";
import { normalizeConstructionPrompt } from "./normalizeConstructionPrompt";

function matchesOperationKeyword(normalized: string, keyword: string): boolean {
  const token = normalizeConstructionPrompt(keyword);
  if (token === "\u043a\u043b\u0430\u0434\u043a") {
    return normalized.split(" ").some((word) => /^кладк/i.test(word));
  }
  return normalized.includes(token);
}

export function resolveConstructionOperation(input: {
  text: string;
  domain: WorldConstructionDomain;
}): WorldConstructionOperation {
  const normalized = normalizeConstructionPrompt(input.text);
  const match = CONSTRUCTION_OPERATION_RULES.find((rule) =>
    rule.keywords.some((keyword) => matchesOperationKeyword(normalized, keyword)),
  );
  if (match) return match.operation;
  if (input.domain === "roadworks") return "paving";
  if (input.domain === "masonry") return "masonry";
  if (input.domain === "hydropower") return "installation";
  if (input.domain === "well_drilling") return "drilling";
  return "installation";
}
