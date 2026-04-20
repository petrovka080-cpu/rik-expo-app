import {
  buildAccountantProposalPdfClientSourceFingerprint,
  buildAccountantProposalPdfManifestContract,
} from "./accountantProposalPdf.shared";

const baseHtml = `<!doctype html>
<html>
<body>
  <div>Сформировано: 20.04.2026, 10:00:00</div>
  <table><tr><td>Cement</td><td>4</td><td>120</td></tr></table>
</body>
</html>`;

describe("accountant proposal PDF manifest contract (PDF-ACC-FINAL)", () => {
  it("keeps the same fingerprint and versions for the same business HTML", () => {
    const firstFingerprint = buildAccountantProposalPdfClientSourceFingerprint({
      proposalId: "proposal-1",
      html: baseHtml,
    });
    const secondFingerprint = buildAccountantProposalPdfClientSourceFingerprint({
      proposalId: "proposal-1",
      html: String(baseHtml),
    });
    const first = buildAccountantProposalPdfManifestContract({
      proposalId: "proposal-1",
      html: baseHtml,
      fileName: "proposal_proposal-1.pdf",
    });
    const second = buildAccountantProposalPdfManifestContract({
      proposalId: "proposal-1",
      html: String(baseHtml),
      fileName: "proposal_proposal-1.pdf",
    });

    expect(secondFingerprint).toBe(firstFingerprint);
    expect(second.sourceVersion).toBe(first.sourceVersion);
    expect(second.artifactVersion).toBe(first.artifactVersion);
    expect(first.artifactPath).toContain("accountant/proposal/artifacts/v1/");
    expect(first.manifestPath).toContain("accountant/proposal/manifests/v1/");
    expect(first.status).toBe("ready");
  });

  it("changes source and artifact versions when rendered proposal content changes", () => {
    const first = buildAccountantProposalPdfManifestContract({
      proposalId: "proposal-1",
      html: baseHtml,
      fileName: "proposal_proposal-1.pdf",
    });
    const changed = buildAccountantProposalPdfManifestContract({
      proposalId: "proposal-1",
      html: baseHtml.replace("Cement", "Steel"),
      fileName: "proposal_proposal-1.pdf",
    });

    expect(changed.sourceVersion).not.toBe(first.sourceVersion);
    expect(changed.artifactVersion).not.toBe(first.artifactVersion);
  });

  it("ignores generated-at timestamp churn", () => {
    const first = buildAccountantProposalPdfManifestContract({
      proposalId: "proposal-1",
      html: baseHtml,
      fileName: "proposal_proposal-1.pdf",
    });
    const noisy = buildAccountantProposalPdfManifestContract({
      proposalId: "proposal-1",
      html: baseHtml.replace("20.04.2026, 10:00:00", "20.04.2026, 10:05:30"),
      fileName: "proposal_proposal-1.pdf",
    });

    expect(noisy.sourceVersion).toBe(first.sourceVersion);
    expect(noisy.artifactVersion).toBe(first.artifactVersion);
  });
});
