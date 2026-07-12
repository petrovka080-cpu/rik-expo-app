import fs from "node:fs";
import path from "node:path";

import {
  DEFAULT_PRODUCTION_CANDIDATE_BRANCH,
  GREEN_PRODUCTION_SOURCE_OF_TRUTH_LINEAGE_READY,
  buildProductionCandidateSourceOfTruthSummary,
} from "../../scripts/release/auditProductionCandidateSourceOfTruth";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

function read(filePath: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, filePath), "utf8");
}

describe("production candidate source of truth", () => {
  it("documents the no-release branch and owner-controlled blockers", () => {
    const doc = read("docs/release/PRODUCTION_SOURCE_OF_TRUTH.md");

    expect(doc).toContain("release/production-candidate");
    expect(doc).toContain("No production deploy");
    expect(doc).toContain("No release");
    expect(doc).toContain("BLOCKED_OWNER_RENDER_DEPLOY_HOOK_ROTATION_REQUIRED");
    expect(doc).toContain("3fa29e4d507e8967790543986911563b6f23f98f");
  });

  it("builds a green source lineage summary only for the candidate branch", () => {
    const summary = buildProductionCandidateSourceOfTruthSummary({
      env: {
        GITHUB_HEAD_REF: DEFAULT_PRODUCTION_CANDIDATE_BRANCH,
      },
      candidateBranch: DEFAULT_PRODUCTION_CANDIDATE_BRANCH,
      verified11610Sha: "3fa29e4d507e8967790543986911563b6f23f98f",
      gitState: {
        headSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        originMainSha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        mergeBaseWithMain: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        aheadBehindMain: "0 1",
        status: "",
        upstreamSync: "0 0",
        originMainIsAncestor: true,
        verified11610ShaIsAncestor: true,
      },
    });

    expect(summary.current_branch).toBe(DEFAULT_PRODUCTION_CANDIDATE_BRANCH);
    expect(summary.final_status).toBe(GREEN_PRODUCTION_SOURCE_OF_TRUTH_LINEAGE_READY);
    expect(summary.production_deploy_started).toBe(false);
    expect(summary.staging_deploy_started).toBe(false);
    expect(summary.native_build_started).toBe(false);
    expect(summary.main_merge_started).toBe(false);
    expect(summary.fake_green_claimed).toBe(false);
  });
});
