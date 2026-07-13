import type { ProfessionalBoqRiskPolicy } from "./professionalBoqContract";

export const DRAWINGS_NOT_REQUIRED_FOR_PRELIMINARY_BOQ = true as const;

export const PROFESSIONAL_DRAWINGS_POLICY_RU =
  "Чертежи и проект помогают уточнить детальную версию, но предварительный BOQ уже построен по указанным объемам.";

const BASE_MISSING_INPUTS_RU = [
  "город, адрес и доступ к объекту",
  "подтвержденные объемы и спецификация материалов",
  "фото/схема/чертежи, если они уже есть",
] as const;

const BASIC_PARAMETER_RE =
  /(?:\d+(?:[,.]\d+)?\s*(?:м2|м3|м|км|мм|шт|кв|мвт|т|сло[йя]|pcs|m2|m3|mm|km|kw|mw|ton)|диаметр|глубин|толщин|ширин|высот|площад|объем|объ[её]м|длина|шаг|этаж|трасс|напряж|diameter|depth|thickness|spacing|floors|route\s+length|voltage)/i;

function unique(items: readonly string[]): string[] {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

export type ProfessionalMissingInputPolicy = {
  drawingsNotRequiredForPreliminaryBoq: typeof DRAWINGS_NOT_REQUIRED_FOR_PRELIMINARY_BOQ;
  drawingsRequiredForDraft: false;
  draftEstimateGeneratedWhenDrawingsMissing: true;
  finalContractStatusBlockedUntilReview: true;
  promptHasBasicParameters: boolean;
  missingInputsRu: string[];
  drawingsPolicyRu: string;
};

export function promptHasBasicProfessionalParameters(prompt: string): boolean {
  return BASIC_PARAMETER_RE.test(prompt);
}

export function buildProfessionalMissingInputPolicy(input: {
  prompt: string;
  riskPolicy: ProfessionalBoqRiskPolicy;
}): ProfessionalMissingInputPolicy {
  const promptHasBasicParameters = promptHasBasicProfessionalParameters(input.prompt);
  const missingInputsRu = unique([
    ...input.riskPolicy.missingInputsRu,
    ...BASE_MISSING_INPUTS_RU,
    promptHasBasicParameters
      ? ""
      : "минимальный объем: длина, площадь, количество, диаметр, толщина или другая базовая величина",
  ]);

  return {
    drawingsNotRequiredForPreliminaryBoq: DRAWINGS_NOT_REQUIRED_FOR_PRELIMINARY_BOQ,
    drawingsRequiredForDraft: false,
    draftEstimateGeneratedWhenDrawingsMissing: true,
    finalContractStatusBlockedUntilReview: true,
    promptHasBasicParameters,
    missingInputsRu,
    drawingsPolicyRu: PROFESSIONAL_DRAWINGS_POLICY_RU,
  };
}
