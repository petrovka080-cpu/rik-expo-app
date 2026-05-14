import type {
  ConstructionDomainId,
  ConstructionExternalIntelPolicyDecision,
  ConstructionInternalFirstStatus,
} from "./constructionKnowhowTypes";
import { getConstructionDomainPlaybook } from "./constructionDomainPlaybooks";

export function resolveConstructionExternalIntelPolicy(params: {
  domainId: ConstructionDomainId;
  internalFirstStatus: ConstructionInternalFirstStatus;
  externalPreviewRequested?: boolean;
}): ConstructionExternalIntelPolicyDecision {
  const playbook = getConstructionDomainPlaybook(params.domainId);
  const externalRequested = params.externalPreviewRequested === true;

  if (!externalRequested) {
    return {
      externalPreviewAllowed: false,
      status: "not_needed",
      citationsRequired: true,
      previewOnly: true,
      externalLiveFetch: false,
      mobileExternalFetch: false,
      providerCalled: false,
      mutationCount: 0,
      reason: "Internal-first analysis did not request external preview.",
    };
  }

  if (!playbook || playbook.externalPreviewPolicy === "disabled") {
    return {
      externalPreviewAllowed: false,
      status: "blocked",
      citationsRequired: true,
      previewOnly: true,
      externalLiveFetch: false,
      mobileExternalFetch: false,
      providerCalled: false,
      mutationCount: 0,
      reason: "External preview is disabled for this construction domain.",
    };
  }

  return {
    externalPreviewAllowed: true,
    status: "available_preview_only",
    citationsRequired: true,
    previewOnly: true,
    externalLiveFetch: false,
    mobileExternalFetch: false,
    providerCalled: false,
    mutationCount: 0,
    reason:
      params.internalFirstStatus === "insufficient"
        ? "Internal evidence is insufficient; cited external preview may be prepared by backend only."
        : "Internal evidence exists; cited external comparison remains preview-only.",
  };
}
