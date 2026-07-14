import fs from "node:fs";
import path from "node:path";

import {
  evaluateProductionSafeReleaseState,
  type ProductionSafeReleaseStateInput,
} from "../../scripts/production_safe_verify";

const projectRoot = path.resolve(__dirname, "..", "..");
const verifierPath = path.join(projectRoot, "scripts", "production_safe_verify.ts");

function baseReleaseState(overrides: Partial<ProductionSafeReleaseStateInput> = {}): ProductionSafeReleaseStateInput {
  return {
    currentBranch: "enterprise/release-branch",
    head: "feature-head",
    upstreamRef: "origin/enterprise/release-branch",
    upstreamCommit: "feature-head",
    upstreamDivergence: "0\t0",
    originMain: "main-head",
    worktreeShort: "",
    releaseTargetBranch: null,
    postMergeMainCloseout: false,
    ...overrides,
  };
}

describe("production-safe release-state branch readiness", () => {
  it("passes a clean feature branch when HEAD equals upstream with no divergence", () => {
    const state = evaluateProductionSafeReleaseState(baseReleaseState());

    expect(state.releaseStateOk).toBe(true);
    expect(state.headEqualsUpstream).toBe(true);
    expect(state.headEqualsOriginMain).toBe(false);
    expect(state.mainCloseoutRequiresOriginMain).toBe(false);
    expect(state.blockers).toEqual([]);
  });

  it("fails when the branch is ahead or behind upstream", () => {
    expect(evaluateProductionSafeReleaseState(baseReleaseState({ upstreamDivergence: "0\t1" })).blockers)
      .toContain("release-state-head-not-upstream");
    expect(evaluateProductionSafeReleaseState(baseReleaseState({ upstreamDivergence: "1\t0" })).blockers)
      .toContain("release-state-head-not-upstream");
  });

  it("fails when the worktree is dirty", () => {
    const state = evaluateProductionSafeReleaseState(baseReleaseState({ worktreeShort: " M scripts/a.ts\n" }));

    expect(state.releaseStateOk).toBe(false);
    expect(state.blockers).toContain("release-state-not-clean");
  });

  it("requires HEAD to equal origin/main for main or explicit main closeout", () => {
    const mainBranch = evaluateProductionSafeReleaseState(baseReleaseState({
      currentBranch: "main",
      originMain: "different-main-head",
    }));
    const explicitMain = evaluateProductionSafeReleaseState(baseReleaseState({
      releaseTargetBranch: "main",
      originMain: "different-main-head",
    }));
    const postMerge = evaluateProductionSafeReleaseState(baseReleaseState({
      postMergeMainCloseout: true,
      originMain: "different-main-head",
    }));

    expect(mainBranch.blockers).toContain("release-state-head-not-origin-main");
    expect(explicitMain.blockers).toContain("release-state-head-not-origin-main");
    expect(postMerge.blockers).toContain("release-state-head-not-origin-main");
  });

  it("never pushes a feature branch directly to main automatically", () => {
    const source = fs.readFileSync(verifierPath, "utf8");
    const state = evaluateProductionSafeReleaseState(baseReleaseState());

    expect(state.featureBranchPushesToMainAutomatically).toBe(false);
    expect(source).not.toMatch(/git\s+push\s+origin\s+main/);
  });
});
