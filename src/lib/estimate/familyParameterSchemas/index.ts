import type { WorkPassportParameter } from "../workPassportContract";

export type InlineWorkParameterSchemaEntry = {
  key: string;
  labelRu: string;
  unit: string | null;
  required: boolean;
  synonyms: string[];
  missingMessageRu: string;
  requiredFor: "better_accuracy" | "contract_ready" | "safety_review";
  blocksPreliminaryEstimate: false;
};

export type InlineWorkFamilyParameterSchema = {
  templateId: string;
  templateName: string;
  familyId: string;
  requiredParams: InlineWorkParameterSchemaEntry[];
  optionalParams: InlineWorkParameterSchemaEntry[];
  defaultAssumptions: {
    param: string;
    value: unknown;
    reason: string;
    visibleToUser: true;
  }[];
  unitParserRules: string[];
  synonyms: string[];
  promptExamples: string[];
  missingInputPolicy: "show_missing_and_continue_preliminary_boq";
};

export const INLINE_WORK_GENERIC_UNIT_PARSER_RULES = [
  "area_m2: 1500 kv meters, 1500 m2, 1500 sqm",
  "length_m: 5 km -> 5000 m, 150 m -> 150 m",
  "line_length_m: 3 km -> 3000 m",
  "height_m: height/vysota values in m, cm, mm, km",
  "thickness_m: thickness/tolschina values in m, cm, mm",
  "depth_mm: 22 cm -> 220 mm, d/depth values normalized to mm",
  "volume_m3: 25 kubov, 25 m3",
  "diameter_mm: d132, dn132, diameter 132 mm",
  "cable_section: 4x50, 4h50",
  "package_mode: pod kluch/turnkey",
] as const;

const PARAM_SYNONYMS: Record<string, string[]> = {
  source_prompt: ["prompt", "raw input", "work prompt"],
  project_location: ["city", "location", "site"],
  drawings_or_specification: ["drawings", "spec", "project"],
  area_m2: ["area", "sqm", "m2", "kv meters", "ploshchad"],
  length_m: ["length", "lm", "m", "km", "dlina"],
  line_length_m: ["line length", "route length", "trassa", "km"],
  width_m: ["width", "shirina"],
  height_m: ["height", "vysota"],
  thickness_m: ["thickness", "tolschina"],
  depth_mm: ["depth", "glubina", "cm", "mm"],
  diameter_mm: ["diameter", "dn", "d132"],
  volume_m3: ["volume", "m3", "kub"],
  count: ["count", "qty", "pcs", "sht"],
  cable_section: ["section", "cable", "4x50"],
  package_mode: ["turnkey", "pod kluch"],
};

function trimText(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function synonymsForInlineWorkParam(param: WorkPassportParameter): string[] {
  const key = trimText(param.key);
  return [
    key,
    trimText(param.labelRu),
    ...(PARAM_SYNONYMS[key] ?? []),
  ].filter(Boolean);
}

export function inlineWorkSchemaEntryFromPassportParam(
  param: WorkPassportParameter,
): InlineWorkParameterSchemaEntry {
  return {
    key: param.key,
    labelRu: trimText(param.labelRu) || param.key,
    unit: param.unit,
    required: param.required,
    synonyms: synonymsForInlineWorkParam(param),
    missingMessageRu: `${trimText(param.labelRu) || param.key}: parameter not specified; preliminary BOQ can continue with visible assumptions.`,
    requiredFor: param.missingBlocksDetailedEstimate ? "contract_ready" : "better_accuracy",
    blocksPreliminaryEstimate: false,
  };
}

export function buildDefaultInlineWorkAssumptions(input: {
  familyId: string;
  templateName: string;
}) {
  return [
    {
      param: "estimate_level",
      value: "PRELIMINARY_BOQ",
      reason: `${input.templateName}: preliminary estimate; contract-ready version needs project review.`,
      visibleToUser: true as const,
    },
    {
      param: "prices",
      value: "PRICE_MISSING",
      reason: "Prices are not invented; quantity rows remain source/formula-backed until a price source is selected.",
      visibleToUser: true as const,
    },
  ];
}
