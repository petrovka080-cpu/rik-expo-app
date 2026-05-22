import fs from "fs";
import path from "path";

const ROOT = process.cwd();

const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8");

describe("screen random client mutation ids", () => {
  it("does not generate director approval clientMutationId from Date.now or Math.random in screens", () => {
    const requestScreen = read("src/screens/director/director.request.ts");
    const proposalScreen = read("src/screens/director/director.proposal.ts");

    expect(requestScreen).not.toContain("dar_${");
    expect(proposalScreen).not.toContain("dap_${");
    expect(`${requestScreen}\n${proposalScreen}`).not.toContain("Date.now()}_${Math.random");
  });
});

