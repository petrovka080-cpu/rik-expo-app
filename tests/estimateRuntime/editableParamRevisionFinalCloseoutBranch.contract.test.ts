import fs from "node:fs";
import path from "node:path";

describe("editable parameter revision final closeout branch gate", () => {
  it("requires the production candidate branch for the S1B seal", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/estimate/auditEditableParamRevisionFinalCloseout.ts"),
      "utf8",
    );

    expect(source).toContain('const REQUIRED_BRANCH = "release/production-candidate"');
    expect(source).not.toContain('branch === "release/ios-after-build48-integration"');
  });
});
