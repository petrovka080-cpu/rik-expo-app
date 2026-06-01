import {
  runProductionReleaseSecretScan,
  scanTextForSecretMatches,
} from "../../scripts/release/releaseStateCleanupCore";
import { tempReleaseRoot, writeText } from "./releaseStateCleanupTestHelpers";

it("blocks raw owner credentials without recording secret values", () => {
  const matches = scanTextForSecretMatches(
    "artifacts/S_OWNER_ACCOUNT_LIVE_QUALITY_LOCK/proof.md",
    "OWNER_REPLAY_PASSWORD=hunter2\nOWNER_REPLAY_EMAIL=owner@company.invalid",
  );

  expect(matches).toEqual([
    {
      file: "artifacts/S_OWNER_ACCOUNT_LIVE_QUALITY_LOCK/proof.md",
      line: 1,
      label: "OWNER_REPLAY_PASSWORD",
    },
    {
      file: "artifacts/S_OWNER_ACCOUNT_LIVE_QUALITY_LOCK/proof.md",
      line: 2,
      label: "raw owner email",
    },
  ]);
  expect(JSON.stringify(matches)).not.toContain("hunter2");
  expect(JSON.stringify(matches)).not.toContain("owner@company.invalid");
});

it("does not inspect or artifact raw .env values", () => {
  const root = tempReleaseRoot();
  writeText(root, ".env.local", "OWNER_REPLAY_PASSWORD=hunter2");

  const report = runProductionReleaseSecretScan(root);

  expect(report.matches).toEqual([]);
  expect(report.raw_credentials_written).toBe(false);
  expect(JSON.stringify(report)).not.toContain("hunter2");
});
