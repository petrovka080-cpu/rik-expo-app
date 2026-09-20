import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type {
  ReleaseReceiptBundle,
  ReleaseReceiptValidationContext,
} from "../../scripts/audit/releaseReceiptBundle";

const FIXTURE_PATH = path.join(
  process.cwd(),
  "tests",
  "fixtures",
  "audit",
  "releaseReceiptBundle.good.fixture.json",
);

export function readGoodReleaseReceiptFixture(): ReleaseReceiptBundle {
  return JSON.parse(fs.readFileSync(FIXTURE_PATH, "utf8")) as ReleaseReceiptBundle;
}

export function fixtureReleaseReceiptContext(): Omit<ReleaseReceiptValidationContext, "rootDir"> {
  return {
    expectedReleaseId: "fixture-release",
    expectedSubjectSha: "1111111111111111111111111111111111111111",
    expectedWorkspaceFingerprint: "2222222222222222222222222222222222222222222222222222222222222222",
  };
}

export function createSyntheticActualReleaseReceiptFixture(): {
  bundle: ReleaseReceiptBundle;
  context: Omit<ReleaseReceiptValidationContext, "rootDir">;
  rootDir: string;
  cleanup: () => void;
} {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "green-claim-actual-receipts-"));
  const bundle = readGoodReleaseReceiptFixture();
  bundle.evidence_class = "actual_environment";
  for (const receipt of bundle.receipts) {
    const fullPath = path.join(rootDir, receipt.artifact_path);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, `${receipt.kind}\n`, "utf8");
    const hash = crypto.createHash("sha256").update(fs.readFileSync(fullPath)).digest("hex");
    receipt.expected_sha256 = hash;
    receipt.observed_sha256 = hash;
  }
  return {
    bundle,
    context: fixtureReleaseReceiptContext(),
    rootDir,
    cleanup: () => fs.rmSync(rootDir, { recursive: true, force: true }),
  };
}
