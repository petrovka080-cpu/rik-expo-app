import type { GlobalEstimateInput } from "./globalEstimateTypes";
import { resolveGlobalWorkType } from "./globalWorkTypeResolver";

export function parsePhotoGlobalEstimateInput(input: GlobalEstimateInput): GlobalEstimateInput {
  if (!input.photoAnalysis) return input;
  const resolved = resolveGlobalWorkType({
    text: input.text,
    explicitWorkKey: input.explicitWorkKey,
    photoAnalysis: input.photoAnalysis,
    language: input.language,
  });
  const dangerous = resolved.dangerous || resolved.safetyReviewRequired;
  return {
    ...input,
    explicitWorkKey: input.explicitWorkKey ?? resolved.workKey,
    volume: input.volume ?? (input.countryCode === "US" ? 100 : 10),
    unit: input.unit ?? (input.countryCode === "US" ? "sq_ft" : "sq_m"),
    surfaceCondition: input.surfaceCondition ?? "unknown",
    text: [
      input.text,
      input.photoAnalysis.detectedProblem ? `Photo problem: ${input.photoAnalysis.detectedProblem}` : null,
      input.photoAnalysis.detectedSurface ? `Surface: ${input.photoAnalysis.detectedSurface}` : null,
      dangerous ? "Safety-sensitive estimate only; no DIY steps." : "Photo-based approximate estimate; hidden damage is not assumed.",
    ].filter(Boolean).join(" "),
  };
}
