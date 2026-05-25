import fs from "node:fs";
import path from "node:path";
import { listFilesRecursively } from "./requestEstimateArchitectureTestHelpers";

function readSourceFiles(dir: string): string {
  return listFilesRecursively(dir)
    .filter((file) => /\.(ts|tsx)$/.test(file))
    .filter((file) => !file.includes("/globalEstimateSeedData.ts"))
    .filter((file) => !file.includes("\\globalEstimateSeedData.ts"))
    .map((file) => `\n/* ${file} */\n${fs.readFileSync(path.resolve(file), "utf8")}`)
    .join("\n");
}

describe("BOQ depth no prompt-hardcoded prices", () => {
  it("does not smuggle prices or tax into prompt/UI layers", () => {
    const appSource = readSourceFiles("app");
    const featureSource = readSourceFiles("src/features");

    expect(appSource).not.toMatch(/prompt.*(?:price|tax|НДС|сом|KGS).*(?:=|:)\s*\d{2,}/i);
    expect(featureSource).not.toMatch(/prompt.*(?:price|tax|НДС|сом|KGS).*(?:=|:)\s*\d{2,}/i);
    expect(appSource + featureSource).not.toContain("hardcoded prompt price");
  });
});
