import fs from "node:fs";
import path from "node:path";

describe("AI 1000 post-BOQ architecture: no synthetic marketplace success", () => {
  it("keeps payload-parity proof separate from the server-confirmed market handoff", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/ai/builtInAi1000/validateBuiltInAi1000PostBoqResult.ts"),
      "utf8",
    );

    expect(source).not.toContain("sendConsumerRepairRequestToMarketplace(");
    expect(source).toContain('marketplaceStatus: "payload_ready_not_sent"');
  });
});
