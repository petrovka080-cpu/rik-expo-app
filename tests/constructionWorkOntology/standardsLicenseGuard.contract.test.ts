import { readArtifactJson, readMigration } from "./constructionWorkOntologyTestHelpers";

it("uses internal/custom classification codes and blocks unlicensed official CSI claims", () => {
  const sql = readMigration();
  const proof = readArtifactJson<Record<string, unknown>>("standards_license_guard.json");

  expect(sql).toContain("source_kind <> 'official_csi'");
  expect(sql).toContain("check (is_official is false)");
  expect(sql).toContain("'internal'");
  expect(sql).not.toMatch(/\b(masterformat|uniformat|omniclass)\b.*\bofficial\b/i);
  expect(proof).toEqual(
    expect.objectContaining({
      official_csi_bulk_content_used: false,
      internal_custom_codes_used: true,
      licensed_classification_source_required_for_official_bulk_codes: true,
      fake_green_claimed: false,
    }),
  );
});
