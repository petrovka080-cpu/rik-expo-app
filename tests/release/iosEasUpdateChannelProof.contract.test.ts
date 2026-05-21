import fs from "node:fs";
import path from "node:path";

describe("iOS OTA channel proof runner", () => {
  const scriptPath = path.join(process.cwd(), "scripts/release/runIosOtaChannelProof.ts");
  const source = fs.readFileSync(scriptPath, "utf8");

  it("does not publish an EAS update or run an iOS build by default", () => {
    expect(source).not.toContain('easCommand(["update"');
    expect(source).not.toContain('easCommand(["build"');
    expect(source).toContain("publishedByThisScript: false");
  });

  it("requires physical iPhone proof before green", () => {
    expect(source).toContain("IOS_INSTALLED_CHANNEL");
    expect(source).toContain("IOS_INSTALLED_RUNTIME_VERSION");
    expect(source).toContain("IOS_IPHONE_RECEIVED_UPDATE");
    expect(source).toContain("IOS_IPHONE_UI_CHANGES_VISIBLE");
    expect(source).toContain("BLOCKED_PHYSICAL_IPHONE_OTA_PROOF_MISSING");
  });

  it("writes all required closeout artifacts for OTA QA", () => {
    expect(source).toContain("S_IOS_EAS_UPDATE_CHANNEL_FAST_QA_NO_REBUILD");
    expect(source).toContain("_channel_map.json");
    expect(source).toContain("_runtime_map.json");
    expect(source).toContain("_update_publish.json");
    expect(source).toContain("_iphone_qa.json");
    expect(source).toContain("_matrix.json");
    expect(source).toContain("_proof.md");
  });
});
