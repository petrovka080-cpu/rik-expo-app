import { useEffect, useState } from "react";
import { getCanonicalEstimatePreliminaryNeedEvidence } from "../../lib/estimate/backendPlatform/canonicalEstimateClient";
import type { CanonicalEstimatePreliminaryNeedEvidence, CanonicalEstimatePreliminaryNeedEvidenceReference } from "../../lib/estimate/backendPlatform/contracts";
import { CanonicalEstimateApiError } from "../../lib/estimate/backendPlatform/contracts";

export function useCanonicalPreliminaryNeedEvidence(rawReference: unknown, open: boolean) {
  const reference = rawReference != null && typeof rawReference === "object"
    && (rawReference as CanonicalEstimatePreliminaryNeedEvidenceReference).contractVersion === "canonical-preliminary-need-evidence/v1"
    ? rawReference as CanonicalEstimatePreliminaryNeedEvidenceReference : null;
  const key = reference == null ? "" : JSON.stringify(reference);
  const [result, setResult] = useState<{ key: string; evidence: CanonicalEstimatePreliminaryNeedEvidence | null;
    status: "loading" | "ready" | "unavailable"; errorCode?: string }>({ key: "", evidence: null, status: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!open || !key) return;
    const selectedReference = JSON.parse(key) as CanonicalEstimatePreliminaryNeedEvidenceReference;
    const controller = new AbortController();
    setResult({ key, evidence: null, status: "loading" });
    void getCanonicalEstimatePreliminaryNeedEvidence(selectedReference, controller.signal).then(evidence => {
      if (!controller.signal.aborted) setResult({ key, evidence, status: "ready" });
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setResult({ key, evidence: null, status: "unavailable",
        errorCode: error instanceof CanonicalEstimateApiError ? error.code : "NETWORK_UNAVAILABLE" });
    });
    return () => controller.abort();
  }, [key, open, attempt]);
  return { referenced: Boolean(key), evidence: result.key === key ? result.evidence : null,
    status: result.key === key ? result.status : "loading", errorCode: result.key === key ? result.errorCode : undefined,
    retry: () => setAttempt(value => value + 1) };
}
