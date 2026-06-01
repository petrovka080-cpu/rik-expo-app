import { scanTextForSecretMatches } from "../../scripts/release/releaseStateCleanupCore";

it("reports owner secret findings without artifacting raw values", () => {
  const matches = scanTextForSecretMatches(
    "artifacts/S_OWNER_ACCOUNT_LIVE_QUALITY_LOCK/proof.md",
    "OWNER_REPLAY_PASSWORD=super-secret-value",
  );

  const serialized = JSON.stringify(matches);
  expect(serialized).toContain("OWNER_REPLAY_PASSWORD");
  expect(serialized).not.toContain("super-secret-value");
  expect(serialized).not.toContain("OWNER_REPLAY_PASSWORD=super-secret-value");
});
