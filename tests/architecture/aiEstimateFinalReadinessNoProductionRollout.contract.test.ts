import fs from "node:fs";
import path from "node:path";

import { buildAiEstimateEnterpriseFinalReadinessReport } from "../../scripts/audit/runAiEstimateEnterpriseFinalReadinessGoNoGo";
import { isIosTestFlightInternalQaScopedRun } from "../mobileRelease/iosTestFlightInternalQaScopeTestHelper";

describe("AI estimate final readiness rollout boundary", () => {
  it("keeps final readiness as an audit gate without enabling production rollout", () => {
    const report = buildAiEstimateEnterpriseFinalReadinessReport({
      verification: {
        typecheckPassed: true,
        lintPassed: true,
        gitDiffCheckPassed: true,
        targetedTestsPassed: true,
        architectureTestsPassed: true,
        playwrightWebPassed: true,
        androidApi34SmokePassed: true,
        pdfFinalProofPassed: true,
        runtimeProofPassed: true,
        fullJestPassed: true,
        releaseVerifyPassed: true,
        commitCreated: true,
        branchPushed: true,
        finalWorktreeClean: true,
      },
      ignoreNonArtifactDirtyPaths: true,
      now: "2026-05-29T00:00:00.000Z",
    });

    expect(report.matrix.production_rollout_enabled).toBe(false);
    if (isIosTestFlightInternalQaScopedRun()) {
      expect(report.matrix.go_no_go_decision).toBe("NO_GO");
      expect(report.matrix.fake_green_claimed).toBe(false);
      expect(report.matrix.blockers.length).toBeGreaterThan(0);
      return;
    }

    expect(report.matrix.go_no_go_decision).toBe("GO_INTERNAL_CANARY_ONLY");
    expect(report.release_candidate.kill_switch_ready).toBe(true);
    expect(report.release_candidate.rollback_ready).toBe(true);
  });

  it("does not introduce hooks, screen-local calculations, or a second AI framework", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/audit/runAiEstimateEnterpriseFinalReadinessGoNoGo.ts"),
      "utf8",
    );

    expect(source).not.toMatch(/\buseEffect\b|\buseState\b|\buseMemo\b|\buseCallback\b/);
    expect(source).not.toMatch(/screen-local|screen local|inline rows/i);
    expect(source).not.toMatch(/new\s+(OpenAI|Anthropic|GoogleGenerativeAI)|from\s+["']openai["']/);
  });
});
