import fs from "node:fs";
import path from "node:path";

describe("photo material existing-row prerequisite", () => {
  it("starts only from the repo-wide green release proof", () => {
    const general = JSON.parse(fs.readFileSync(
      path.join(process.cwd(), "artifacts/S_RELEASE_PIPELINE_RECOVERY/GENERAL_RELEASE_CLOSEOUT_PROOF.json"),
      "utf8",
    ));
    const pipeline = JSON.parse(fs.readFileSync(
      path.join(process.cwd(), "artifacts/S_RELEASE_PIPELINE_RECOVERY/CLOSEOUT_PROOF.json"),
      "utf8",
    ));

    expect(general.final_status).toBe("GREEN_REPO_WIDE_GENERAL_RELEASE_VERIFY_PRODUCTION_SAFE_READY");
    expect(general.release_pipeline_status).toBe("GREEN_RELEASE_PIPELINE_SOURCE_FREEZE_BUILD_CACHE_PROOF_LINEAGE_STABILIZED_READY");
    expect(general.runtime_output_tracked).toBe(false);
    expect(general.promotion_is_only_tracked_writer).toBe(true);
    expect(general.source_changes_after_freeze).toBe(0);
    expect(general.android_actual_api).toBe(34);
    expect(general.android_uses_metro).toBe(false);
    expect(general.android_uses_dev_client).toBe(false);
    expect(general.post_push_pipeline_verify_passed).toBe(true);
    expect(general.post_push_general_release_verify_passed).toBe(true);
    expect(general.local_head_equals_upstream).toBe(true);
    expect(general.final_worktree_clean).toBe(true);
    expect(general.fake_green_claimed).toBe(false);
    expect(pipeline.final_status).toBe("GREEN_RELEASE_PIPELINE_SOURCE_FREEZE_BUILD_CACHE_PROOF_LINEAGE_STABILIZED_READY");
  });
});
