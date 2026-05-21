import * as fs from "fs";
import * as path from "path";

describe("consumer repair no unauthorized DB write architecture contract", () => {
  it("does not write DB from screens outside the consumer request service boundary", () => {
    const screen = fs.readFileSync(path.resolve(process.cwd(), "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx"), "utf8");
    const featureFiles = fs.readdirSync(path.resolve(process.cwd(), "src/features/consumerRepair"))
      .filter((file) => file.endsWith(".ts") || file.endsWith(".tsx"))
      .map((file) => fs.readFileSync(path.resolve(process.cwd(), "src/features/consumerRepair", file), "utf8"))
      .join("\n");

    expect(screen).not.toMatch(/supabase|\.from\(|insert\(|update\(/);
    expect(featureFiles).not.toMatch(/supabase|\.from\(/);
  });
});
