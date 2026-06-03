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
    expect(helper).toContain('file.startsWith("tests/architecture/real10000")');
    expect(helper).toContain('tests/architecture/worldConstructionReleaseReusePolicy.contract.test.ts');
  });

  it("keeps current Visible500 canonical reuse scoped away from parked waves", () => {
    const helper = fs.readFileSync(path.join(process.cwd(), "scripts/e2e/canonicalApi34Evidence.ts"), "utf8");

    expect(helper).toContain("isCurrentVisible500FullCloseoutCanonicalApi34ChangedFile");
    expect(helper).toContain("CURRENT_VISIBLE500_FULL_CLOSEOUT_CANONICAL_REUSE_REASON");
    expect(helper).toContain('file.startsWith("src/lib/catalog/")');
    expect(helper).toContain('file.startsWith("tests/catalogItems/")');
    expect(helper).toContain('file.startsWith("tests/constructionFormulas/")');
    expect(helper).toContain('file.startsWith("tests/professionalQuality/")');
    expect(helper).toContain('file.startsWith("tests/releaseStateCleanup/")');
    expect(helper).not.toContain('file.startsWith("tests/") ||');
    expect(helper).not.toContain('file.startsWith("src/lib/ai/workOntology/")');
    expect(helper).not.toContain('file.startsWith("tests/mobileRelease/")');
    expect(helper).not.toContain('file.startsWith("tests/liveQuality/")');
  });

  it("bridges every old Android gate to current canonical API34 evidence", () => {
    for (const [file, gate] of OLD_ANDROID_GATES) {
      const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
      expect(source).toContain("requireCanonicalApi34EvidenceForGate");
      expect(source).toContain(gate);
    }
  });

  it("runs canonical API34 replay before old Android evidence consumers", () => {
    const releaseGuard = fs.readFileSync(path.join(process.cwd(), "scripts/release/releaseGuard.shared.ts"), "utf8");
    const releaseGates = releaseGuard.slice(releaseGuard.indexOf("export const REQUIRED_RELEASE_GATES"));
    const canonicalIndex = releaseGates.indexOf('"android-api34-canonical-replay-b2c-expanded-estimate-binding-proof"');
    expect(canonicalIndex).toBeGreaterThanOrEqual(0);

    for (const [, gate] of OLD_ANDROID_GATES) {
      const gateIndex = releaseGates.indexOf(`"${gate}"`);
      expect(gateIndex).toBeGreaterThan(canonicalIndex);
    }
  });

  it("does not start a long Android replay inside release verify when canonical evidence is stale", () => {
    const replay = fs.readFileSync(
      path.join(process.cwd(), "scripts/e2e/runAndroidApi34CanonicalReplayB2cExpandedEstimateBinding.ts"),
      "utf8",
    );

    expect(replay).toContain('process.env.RELEASE_GUARD_IN_PROGRESS === "1"');
    expect(replay).toContain("BLOCKED_CANONICAL_API34_EVIDENCE_NOT_REUSABLE_IN_RELEASE_VERIFY");
    expect(replay).toContain("Release verify refuses to start a long Android replay");
  });
});
