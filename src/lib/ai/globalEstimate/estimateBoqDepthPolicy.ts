import type { GlobalEstimateResult } from "./globalEstimateTypes";

export type EstimateBoqDepthClass =
  | "local_operation"
  | "full_professional"
  | "complex_professional"
  | "industrial_infrastructure"
  | "mega_project";

export type ProfessionalEstimateComplexityProfile = {
  level: EstimateBoqDepthClass;
  minimumMeaningfulRows: number;
  fullProfessionalClaimAllowed: boolean;
  reason: string;
};

export const ESTIMATE_BOQ_MINIMUM_ROWS: Record<EstimateBoqDepthClass, number> = {
  local_operation: 1,
  full_professional: 46,
  complex_professional: 100,
  industrial_infrastructure: 200,
  mega_project: 500,
};

type EstimateComplexityInput = {
  work: Pick<GlobalEstimateResult["work"], "workKey" | "title" | "category">;
  input: Pick<
    GlobalEstimateResult["input"],
    "originalText" | "unit" | "volume"
  >;
  requiresReview: boolean;
};

function estimateText(result: Pick<EstimateComplexityInput, "work" | "input">): string {
  return [
    result.work.workKey,
    result.work.title,
    result.work.category,
    result.input.originalText ?? "",
    result.input.unit,
    String(result.input.volume ?? ""),
  ].join(" ").toLocaleLowerCase("ru-RU");
}

function isAtomicLocalOperation(
  result: Pick<EstimateComplexityInput, "work" | "input">,
): boolean {
  const text = estimateText(result);
  return /(?:алмазн|core\s*drill|бурени[ея]\s+отверст|отдельн\w*\s+операц|локальн\w*\s+расч[её]т)/i.test(text);
}

export function buildProfessionalEstimateComplexityProfile(
  result: EstimateComplexityInput,
): ProfessionalEstimateComplexityProfile {
  const text = estimateText(result);
  if (isAtomicLocalOperation(result)) {
    return {
      level: "local_operation",
      minimumMeaningfulRows: ESTIMATE_BOQ_MINIMUM_ROWS.local_operation,
      fullProfessionalClaimAllowed: false,
      reason: "atomic_local_operation",
    };
  }
  if (/(?:mega|мега|аэропорт|\bметро\b|тэц|дамб|завод|\b(?:500|1000)\s*(?:mw|мвт)\b|\b\d+\s*(?:км|km)\s*(?:тоннел|tunnel|мост|bridge)\b)/i.test(text)) {
    return {
      level: "mega_project",
      minimumMeaningfulRows: ESTIMATE_BOQ_MINIMUM_ROWS.mega_project,
      fullProfessionalClaimAllowed: true,
      reason: "mega_project_scope",
    };
  }
  if (
    /(?:solar|солнеч|сэс|mw|мвт|substation|подстанц|power_line|лэп|grid|industrial|промышлен|infrastructure|инфраструкт|road|дорог|bridge|tunnel|hydro)/i.test(text) ||
    result.work.category === "roadworks" ||
    result.work.category === "delivery_equipment"
  ) {
    return {
      level: "industrial_infrastructure",
      minimumMeaningfulRows: ESTIMATE_BOQ_MINIMUM_ROWS.industrial_infrastructure,
      fullProfessionalClaimAllowed: true,
      reason: "industrial_or_infrastructure_scope",
    };
  }
  if (
    /(?:комплексн|капитальн|turnkey|под\s+ключ|система|system|bms|fire|пожар|hvac|вентиляц|электромонтаж|сантех|отоплен)/i.test(text) ||
    result.work.category === "electrical" ||
    result.work.category === "plumbing" ||
    result.work.category === "heating_hvac"
  ) {
    return {
      level: "complex_professional",
      minimumMeaningfulRows: ESTIMATE_BOQ_MINIMUM_ROWS.complex_professional,
      fullProfessionalClaimAllowed: true,
      reason: "complex_professional_scope",
    };
  }
  return {
    level: "full_professional",
    minimumMeaningfulRows: ESTIMATE_BOQ_MINIMUM_ROWS.full_professional,
    fullProfessionalClaimAllowed: true,
    reason: "full_professional_scope",
  };
}

export function classifyEstimateBoqDepth(
  result: EstimateComplexityInput,
): EstimateBoqDepthClass {
  return buildProfessionalEstimateComplexityProfile(result).level;
}

export function minimumRowsForEstimate(result: EstimateComplexityInput): number {
  return buildProfessionalEstimateComplexityProfile(result).minimumMeaningfulRows;
}
