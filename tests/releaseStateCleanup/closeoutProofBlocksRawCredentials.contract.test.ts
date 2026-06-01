import { scanTextForSecretMatches } from "../../scripts/release/releaseStateCleanupCore";

it("detects raw credentials without requiring secret values in closeout artifacts", () => {
  const matches = scanTextForSecretMatches(
    "artifacts/S_PRODUCTION_RELEASE_STATE_CLEANUP_CLOSEOUT/proof.md",
    "SUPABASE_SERVICE_ROLE_KEY=sk_live_123456789abcdef",
  );

  expect(matches).toEqual([
    {
      file: "artifacts/S_PRODUCTION_RELEASE_STATE_CLEANUP_CLOSEOUT/proof.md",
      line: 1,
      label: "SUPABASE_SERVICE_ROLE_KEY",
    },
  ]);
});
