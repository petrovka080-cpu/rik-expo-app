import {
  CONSTRUCTION_OBJECT_RULES,
  type WorldConstructionDomain,
  type WorldConstructionObjectScope,
} from "../worldConstructionOntology";
import { normalizeConstructionPrompt } from "./normalizeConstructionPrompt";

export function resolveConstructionObject(input: {
  text: string;
  domain: WorldConstructionDomain;
}): {
  objectScope: WorldConstructionObjectScope;
  ambiguous: boolean;
  options: string[];
} {
  const normalized = normalizeConstructionPrompt(input.text);
  const matched = CONSTRUCTION_OBJECT_RULES.filter((rule) =>
    rule.keywords.some((keyword) => {
      const token = normalizeConstructionPrompt(keyword);
      return keyword.startsWith(" ") || keyword.endsWith(" ")
        ? ` ${normalized} `.includes(token)
        : normalized.includes(token);
    }),
  );
  const first = matched[0]?.objectScope;

  if (input.domain === "hydropower") return { objectScope: "hydropower_unit", ambiguous: false, options: [] };
  if (input.domain === "roadworks") return { objectScope: "road_area", ambiguous: false, options: [] };
  if (input.domain === "well_drilling") return { objectScope: "well", ambiguous: false, options: [] };
  if (input.domain === "solar") return { objectScope: first ?? "solar_array", ambiguous: false, options: [] };
  if (input.domain === "ventilation") return { objectScope: "ventilation_network", ambiguous: false, options: [] };
  if (input.domain === "electrical") return { objectScope: "electrical_network", ambiguous: false, options: [] };
  if (input.domain === "masonry") return { objectScope: "masonry_wall", ambiguous: false, options: [] };
  if (input.domain === "windows") return { objectScope: "window_opening", ambiguous: false, options: [] };
  if (input.domain === "drywall") return { objectScope: normalized.includes("потол") ? "ceiling" : "wall", ambiguous: false, options: [] };
  if (input.domain === "flooring") return { objectScope: "floor", ambiguous: false, options: [] };

  if (
    input.domain === "waterproofing" &&
    /шв|пруд|тоннел|тоннель|хаммам|мокр[а-яё]*\s+стен|отсечн|pond|tunnel|hammam/.test(normalized)
  ) {
    return { objectScope: "site", ambiguous: false, options: [] };
  }

  if (input.domain === "waterproofing" && !first) {
    return {
      objectScope: "unknown",
      ambiguous: true,
      options: ["кровля", "ванная / санузел", "фундамент", "подвал", "балкон / терраса"],
    };
  }

  if (input.domain === "waterproofing" && first === "roof") {
    return { objectScope: "roof", ambiguous: false, options: [] };
  }

  return { objectScope: first ?? "site", ambiguous: false, options: [] };
}
