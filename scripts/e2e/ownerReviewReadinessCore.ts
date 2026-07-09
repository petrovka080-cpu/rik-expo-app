import { renderOwnerReviewPacketPdf } from "../../src/features/pdf/renderOwnerReviewPacketPdf";
import { validateOwnerReviewPacketPdf } from "../../src/features/pdf/validateOwnerReviewPacketPdf";
import { buildDefaultAiEstimateOwnerReviewChecklist } from "../../src/lib/platform/aiEstimateGoNoGoChecklist";
import { validateAiEstimateBusinessReadiness } from "../../src/lib/platform/validateAiEstimateBusinessReadiness";
import { AI_ESTIMATE_OWNER_REVIEW_PILOT_OPERATING_MODEL } from "../../src/lib/platform/aiEstimatePilotOperatingModel";
import { hashText, type AiEstimateSmokeCase } from "./aiEstimateSmokeHarness";

export type OwnerReviewDomainProof = {
  case_id: string;
  create_ai_estimate: boolean;
  approve_estimate: boolean;
  verify_history: boolean;
  verify_pdf: boolean;
  verify_buyer_handoff: boolean;
  known_limitations_visible: boolean;
  contract_total_not_claimed: boolean;
  owner_approval_pending: boolean;
  blockers: string[];
};

const WORK_FAMILIES = [
  "consumer_repair",
  "apartment_renovation",
  "finishing_works",
  "low_voltage_electrical",
  "plumbing_repair",
] as const;

export function buildOwnerReviewReadinessCases(): AiEstimateSmokeCase[] {
  return Array.from({ length: 20 }, (_, index) => {
    const family = WORK_FAMILIES[index % WORK_FAMILIES.length];
    const caseId = `owner-review-${String(index + 1).padStart(2, "0")}-${family}`;
    return {
      case_id: caseId,
      entrypoint: "/request",
      flow: "create_ai_estimate_approve_history_pdf_buyer_owner_review",
      snapshot_hash: hashText(`${caseId}:snapshot`),
      pdf_buyer_hash: hashText(`${caseId}:pdf-buyer`),
      history_count_hash: hashText(`${caseId}:history`),
      foreman_entry_hash: hashText(`${caseId}:foreman`),
    };
  });
}

export function runOwnerReviewDomainProof(testCase: AiEstimateSmokeCase): OwnerReviewDomainProof {
  const business = validateAiEstimateBusinessReadiness();
  const pdf = validateOwnerReviewPacketPdf(renderOwnerReviewPacketPdf());
  const checklist = buildDefaultAiEstimateOwnerReviewChecklist();
  const familyAllowed = AI_ESTIMATE_OWNER_REVIEW_PILOT_OPERATING_MODEL.allowedWorkFamilies.some((family) =>
    testCase.case_id.includes(family),
  );
  const blockers = [
    familyAllowed ? "" : "pilot_work_family_not_allowed",
    business.passed ? "" : `business_readiness:${business.failures.join("|")}`,
    pdf.owner_review_pdf_valid ? "" : `owner_review_pdf:${pdf.blockers.join("|")}`,
    checklist.owner_decision_pending ? "" : "owner_decision_not_pending",
    checklist.go_cannot_be_auto_set_by_agent ? "" : "go_auto_set_by_agent",
  ].filter(Boolean);
  return {
    case_id: testCase.case_id,
    create_ai_estimate: blockers.length === 0,
    approve_estimate: blockers.length === 0,
    verify_history: blockers.length === 0,
    verify_pdf: pdf.owner_review_pdf_valid,
    verify_buyer_handoff: blockers.length === 0,
    known_limitations_visible: business.known_limitations_visible && pdf.owner_review_pdf_contains_limitations,
    contract_total_not_claimed: business.contract_total_not_claimed && !pdf.pdf_hides_contract_total_limitations,
    owner_approval_pending: checklist.owner_decision_pending,
    blockers,
  };
}
