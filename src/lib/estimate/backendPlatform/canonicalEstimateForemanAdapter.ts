/** Server/CLI compatibility facade. Presentation has one shared implementation. */
import {
  adaptCanonicalRevisionToStructuredEstimate as projectRevision,
  adaptCanonicalCompilationToAssistantProjection as projectCompilation,
} from './canonicalEstimateClientForemanProjection';
import { projectCanonicalEstimatePhysicalNormApplicabilityV1 } from './canonicalEstimatePhysicalNormProjection';

export function adaptCanonicalRevisionToStructuredEstimate(input: Parameters<typeof projectRevision>[0]) {
  return projectRevision(input,projectCanonicalEstimatePhysicalNormApplicabilityV1);
}
export function adaptCanonicalCompilationToAssistantProjection(draft: unknown,userId?: string) {
  return projectCompilation(draft,userId,projectCanonicalEstimatePhysicalNormApplicabilityV1);
}
