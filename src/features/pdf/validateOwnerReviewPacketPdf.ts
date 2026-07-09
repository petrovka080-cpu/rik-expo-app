import type { OwnerReviewPacketPdfArtifact } from "./renderOwnerReviewPacketPdf";

export type OwnerReviewPacketPdfValidation = {
  owner_review_pdf_created: boolean;
  owner_review_pdf_valid: boolean;
  owner_review_pdf_does_not_claim_approval: boolean;
  owner_review_pdf_contains_limitations: boolean;
  owner_review_pdf_contains_go_no_go_checklist: boolean;
  pdf_claims_owner_approved: boolean;
  pdf_claims_production_release: boolean;
  pdf_hides_known_limitations: boolean;
  pdf_hides_contract_total_limitations: boolean;
  blockers: string[];
};

const REQUIRED_SECTIONS = [
  "Executive summary",
  "Technical readiness",
  "Known limitations",
  "Trusted costing status",
  "Pricebook limitations",
  "History scaling status",
  "Web/Android evidence",
  "Pilot operating model",
  "Risk register",
  "GO/NO-GO checklist",
  "Owner signature placeholder",
];

export function validateOwnerReviewPacketPdf(
  artifact: OwnerReviewPacketPdfArtifact | null | undefined,
): OwnerReviewPacketPdfValidation {
  const body = artifact?.body ?? "";
  const missingSections = REQUIRED_SECTIONS.filter((section) => !body.includes(section));
  const claimsOwnerApproved = /owner_approved\s*=\s*true|owner approved:\s*true/i.test(body);
  const claimsProductionRelease = /production_release_started\s*=\s*true|production release:\s*started/i.test(body);
  const hidesKnownLimitations = !/Known limitations/i.test(body);
  const hidesContractTotal = !/contract_total_claimed=false|Contract totals are not claimed/i.test(body);
  const blockers = [
    artifact ? "" : "owner_review_pdf_missing",
    ...missingSections.map((section) => `owner_review_pdf_section_missing:${section}`),
    claimsOwnerApproved ? "pdf_claims_owner_approved" : "",
    claimsProductionRelease ? "pdf_claims_production_release" : "",
    hidesKnownLimitations ? "pdf_hides_known_limitations" : "",
    hidesContractTotal ? "pdf_hides_contract_total_limitations" : "",
  ].filter(Boolean);
  return {
    owner_review_pdf_created: Boolean(artifact),
    owner_review_pdf_valid: blockers.length === 0,
    owner_review_pdf_does_not_claim_approval: !claimsOwnerApproved,
    owner_review_pdf_contains_limitations: !hidesKnownLimitations && !hidesContractTotal,
    owner_review_pdf_contains_go_no_go_checklist: body.includes("GO/NO-GO checklist"),
    pdf_claims_owner_approved: claimsOwnerApproved,
    pdf_claims_production_release: claimsProductionRelease,
    pdf_hides_known_limitations: hidesKnownLimitations,
    pdf_hides_contract_total_limitations: hidesContractTotal,
    blockers,
  };
}
