import type { WorldConstructionDomain, WorldConstructionObjectScope, WorldConstructionOperation } from "../worldConstructionOntology";
import { normalizeConstructionPrompt } from "./normalizeConstructionPrompt";

export function disambiguateConstructionWork(input: {
  text: string;
  domain: WorldConstructionDomain;
  objectScope: WorldConstructionObjectScope;
  operation: WorldConstructionOperation;
}): { ambiguous: boolean; options: string[]; reason: string | null } {
  const normalized = normalizeConstructionPrompt(input.text);
  if (
    input.operation === "waterproofing" &&
    input.domain === "waterproofing" &&
    input.objectScope === "unknown" &&
    !/(крыша|кровля|ванная|санузел|душевая|фундамент|подвал|цоколь|балкон|терраса|roof|bathroom|foundation|basement)/.test(normalized)
  ) {
    return {
      ambiguous: true,
      options: ["кровля", "ванная / санузел", "фундамент", "подвал", "балкон / терраса"],
      reason: "WATERPROOFING_OBJECT_SCOPE_REQUIRED",
    };
  }
  return { ambiguous: false, options: [], reason: null };
}
