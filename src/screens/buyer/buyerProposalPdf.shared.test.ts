import {
  buildBuyerProposalPdfClientSourceFingerprint,
  buildBuyerProposalPdfManifestContract,
} from "./buyerProposalPdf.shared";
import type { ProposalHeadLite, ProposalViewLine } from "./buyer.types";

const baseHead: ProposalHeadLite = {
  id: "proposal-1",
  status: "approved",
  submitted_at: "2026-04-20T10:00:00.000Z",
  total_sum: 999999,
  sent_to_accountant_at: "transport-only",
};

const baseLines: ProposalViewLine[] = [
  {
    request_item_id: "ri-1",
    app_code: "MAT",
    name_human: "Cement",
    note: "For slab",
    price: 120,
    qty: 4,
    rik_code: "MAT-1",
    supplier: "Supplier A",
    uom: "bag",
    request_item_integrity_state: "active",
    request_item_integrity_reason: null,
    request_item_source_status: "ready",
    request_item_cancelled_at: null,
  },
];

const baseArgs = {
  proposalId: "proposal-1",
  fileName: "proposal_proposal-1.pdf",
  head: baseHead,
  lines: baseLines,
};

describe("buyer proposal PDF manifest contract (PDF-PUR-1)", () => {
  it("keeps the same fingerprint and versions for the same business data", () => {
    const firstFingerprint = buildBuyerProposalPdfClientSourceFingerprint(baseArgs);
    const secondFingerprint = buildBuyerProposalPdfClientSourceFingerprint(
      JSON.parse(JSON.stringify(baseArgs)),
    );
    const first = buildBuyerProposalPdfManifestContract(baseArgs);
    const second = buildBuyerProposalPdfManifestContract(JSON.parse(JSON.stringify(baseArgs)));

    expect(secondFingerprint).toBe(firstFingerprint);
    expect(second.sourceVersion).toBe(first.sourceVersion);
    expect(second.artifactVersion).toBe(first.artifactVersion);
    expect(first.artifactPath).toContain("buyer/proposal/artifacts/v1/");
    expect(first.manifestPath).toContain("buyer/proposal/manifests/v1/");
    expect(first.status).toBe("ready");
  });

  it("changes source and artifact versions when visible PDF line data changes", () => {
    const first = buildBuyerProposalPdfManifestContract(baseArgs);
    const changed = buildBuyerProposalPdfManifestContract({
      ...baseArgs,
      lines: [
        {
          ...baseLines[0],
          qty: 5,
        },
      ],
    });

    expect(changed.sourceVersion).not.toBe(first.sourceVersion);
    expect(changed.artifactVersion).not.toBe(first.artifactVersion);
  });

  it("ignores screen-only metadata noise that is not rendered into the PDF", () => {
    const first = buildBuyerProposalPdfManifestContract(baseArgs);
    const noisy = buildBuyerProposalPdfManifestContract({
      ...baseArgs,
      head: {
        ...baseHead,
        total_sum: 1,
        sent_to_accountant_at: "different-noise",
      },
      lines: [
        {
          ...baseLines[0],
          request_item_integrity_state: "source_missing",
          request_item_integrity_reason: "request_item_missing",
          request_item_source_status: "changed-noise",
          request_item_cancelled_at: "2026-04-21T00:00:00.000Z",
        },
      ],
    });

    expect(noisy.sourceVersion).toBe(first.sourceVersion);
    expect(noisy.artifactVersion).toBe(first.artifactVersion);
  });
});
