import * as fs from "fs";
import * as path from "path";

describe("AI estimate PDF no debug payload leak contract", () => {
  it("does not put raw provider payloads or storage keys in estimatePdf modules", () => {
    const dir = path.resolve(process.cwd(), "src/lib/ai/estimatePdf");
    const combined = fs.readdirSync(dir)
      .filter((file) => file.endsWith(".ts"))
      .map((file) => fs.readFileSync(path.join(dir, file), "utf8"))
      .join("\n");

    expect(combined).not.toContain("rawProviderPayload");
    expect(combined).not.toContain("storageKey");
  });
});
