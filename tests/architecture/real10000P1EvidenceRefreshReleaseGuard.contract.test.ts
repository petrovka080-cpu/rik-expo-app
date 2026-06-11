import { REQUIRED_RELEASE_GATES } from "../../scripts/release/releaseGuard.shared";

test("release guard requires Real10000 P1 evidence refresh proof", () => {
  expect(REQUIRED_RELEASE_GATES).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "real-10000-audit-p1-evidence-refresh-proof",
        command:
          "npx tsx scripts/release/verifyExistingProofArtifact.ts --artifact artifacts/S_REAL_10000_AUDIT_P1_EVIDENCE_REFRESH/matrix.json --expect-status GREEN_REAL_10000_AUDIT_P1_EVIDENCE_REFRESH_READY --expect-fake-green false",
      }),
    ]),
  );
});
