import {
  buildAiDirectorCommandOfficeSecurityMagicMatrix,
  listAiDirectorCommandOfficeSecurityMagicPackEntries,
} from "../../scripts/ai/aiDirectorCommandOfficeSecurityMagic";

describe("AI director reports magic", () => {
  it("keeps executive reporting domain-specific and draft-only", () => {
    const entry = listAiDirectorCommandOfficeSecurityMagicPackEntries()
      .find((item) => item.logicalScreenId === "director.reports");
    const packText = [
      entry?.pack.screenSummary,
      ...(entry?.pack.visibleDomainData ?? []),
      ...(entry?.pack.riskSummary ?? []),
      ...(entry?.pack.missingDataSummary ?? []),
    ].join(" ");
    const matrix = buildAiDirectorCommandOfficeSecurityMagicMatrix({
      webProofPass: true,
      androidProofPass: true,
      iosTestflightSignoffCurrent: true,
    });

    expect(matrix).toMatchObject({
      director_reports_ready: true,
      draft_only_not_final_submit: true,
      fake_report_content_created: false,
    });
    expect(packText).toMatch(/снабжение|склад|финансы|документы|главное решение/i);
  });
});
