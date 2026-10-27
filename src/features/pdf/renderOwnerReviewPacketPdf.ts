import { AI_ESTIMATE_OWNER_REVIEW_BUSINESS_READINESS } from "../../lib/platform/aiEstimateBusinessReadinessContract";
import { AI_ESTIMATE_OWNER_REVIEW_PILOT_OPERATING_MODEL } from "../../lib/platform/aiEstimatePilotOperatingModel";
import { buildDefaultAiEstimateOwnerReviewChecklist } from "../../lib/platform/aiEstimateGoNoGoChecklist";

export type OwnerReviewPacketPdfArtifact = {
  pdfArtifactId: string;
  body: string;
  ownerApproved: false;
  productionReleaseStarted: false;
  contractTotalClaimed: false;
};

export function renderOwnerReviewPacketPdf(): OwnerReviewPacketPdfArtifact {
  const readiness = AI_ESTIMATE_OWNER_REVIEW_BUSINESS_READINESS;
  const model = AI_ESTIMATE_OWNER_REVIEW_PILOT_OPERATING_MODEL;
  const checklist = buildDefaultAiEstimateOwnerReviewChecklist();
  const body = [
    "Executive summary",
    "Technical pilot readiness is prepared for owner review only.",
    "owner_approved=false",
    "owner_go_no_go_status=PENDING_OWNER_REVIEW",
    "production_release_started=false",
    "public_beta_started=false",
    "contract_total_claimed=false",
    "Technical readiness",
    `technical_pilot_ready=${readiness.technicalPilotReady}`,
    "Known limitations",
    "Known limitations remain visible for pricebook coverage, high-risk work, and owner review.",
    "Trusted costing status",
    "Trusted costing is preliminary until owner review and full pricebook coverage are accepted.",
    "Pricebook limitations",
    "Contract totals are not claimed; missing or untrusted prices must stay visible.",
    "History scaling status",
    "Approved history scaling is part of the prerequisite evidence packet.",
    "Web/Android evidence",
    "Web and Android owner-review smokes must be green before this packet is accepted.",
    "Pilot operating model",
    `cohort_size_limit=${model.cohortSizeLimit}`,
    `allowed_roles=${model.allowedRoles.join(",")}`,
    `blocked_work_families=${model.blockedWorkFamilies.join(",")}`,
    "Risk register",
    "P0 defect stops the pilot automatically; P1 requires review before continuation.",
    "GO/NO-GO checklist",
    ...checklist.checklist_items.map((item) => `${item.id}=${item.passed}`),
    "Owner signature placeholder",
    "Owner:",
    "Decision: GO / NO-GO / HOLD",
  ].join("\n");
  return {
    pdfArtifactId: "owner-review-pilot-operating-system",
    body,
    ownerApproved: false,
    productionReleaseStarted: false,
    contractTotalClaimed: false,
  };
}
