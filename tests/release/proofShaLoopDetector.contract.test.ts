import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { assertNoProofShaLoop } from "../../scripts/release/assertNoProofShaLoop";

describe("proof SHA loop detector", () => {
  it("blocks after more than two stale proof failures for the same wave", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "proof-sha-loop-"));
    const waveDir = path.join(root, "S_TEST_WAVE");
    fs.mkdirSync(waveDir, { recursive: true });
    for (let index = 1; index <= 3; index += 1) {
      fs.writeFileSync(
        path.join(waveDir, `failure_${index}.json`),
        `${JSON.stringify({ wave: "S_TEST_WAVE", reason: "SOURCE_CODE_CHANGED_AFTER_PROOF" })}\n`,
        "utf8",
      );
    }

    const result = assertNoProofShaLoop(root);

    expect(result.final_status).toBe("BLOCKED_PROOF_SHA_LOOP_DETECTED");
    expect(result.stale_failures_for_wave.S_TEST_WAVE).toBe(3);
    expect(result.message).toContain("Do not rerun full release blindly");
    expect(result.fake_green_claimed).toBe(false);
  });
});
