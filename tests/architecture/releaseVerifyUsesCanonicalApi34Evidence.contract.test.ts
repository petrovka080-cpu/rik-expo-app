import fs from "node:fs";
import path from "node:path";

const OLD_ANDROID_GATES = [
  ["scripts/e2e/runAndroidB2cRequestEmbeddedAiRouteBootstrapProof.ts", "android-b2c-request-embedded-ai-route-bootstrap-proof"],
  ["scripts/e2e/runAndroidAppRootReadyMarkerUnblockForB2cRequestEmbeddedAiProof.ts", "android-app-root-ready-marker-b2c-request-embedded-ai-proof"],
  ["scripts/e2e/runB2cRequestEmbeddedAiEntrypointAuditProof.ts", "b2c-request-embedded-ai-entrypoint-audit-proof"],
  ["scripts/e2e/runB2cRequestEmbeddedAiExpandedEstimateFixProof.ts", "b2c-request-embedded-ai-expanded-estimate-binding-proof"],
  ["scripts/e2e/runLiveB2cRequestEmbeddedAiEstimateRealityProof.ts", "live-b2c-request-embedded-ai-estimate-reality-proof"],
] as const;

describe("release verify canonical API34 evidence", () => {
  it("ties canonical Pixel_7_API_34 evidence to the current HEAD", () => {
    const helper = fs.readFileSync(path.join(process.cwd(), "scripts/e2e/canonicalApi34Evidence.ts"), "utf8");

    expect(helper).toContain("currentGitHead");
    expect(helper).toContain("head_sha");
    expect(helper).toContain("git_short_hash");
    expect(helper).toContain("Pixel_7_API_34");
    expect(helper).toContain("android_sdk === 34");
    expect(helper).toContain("CANONICAL_API34_EVIDENCE_STALE_FOR_CURRENT_HEAD");
  });

  it("bridges every old Android gate to current canonical API34 evidence", () => {
    for (const [file, gate] of OLD_ANDROID_GATES) {
      const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
      expect(source).toContain("requireCanonicalApi34EvidenceForGate");
      expect(source).toContain(gate);
    }
  });
});
