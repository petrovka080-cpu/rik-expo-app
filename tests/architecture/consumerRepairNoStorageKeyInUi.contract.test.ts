import * as fs from "fs";
import * as path from "path";

describe("consumer repair no storage key in UI architecture", () => {
  it("opens PDFs through signed URL without rendering storage keys", () => {
    const feature = fs.readdirSync(path.join(process.cwd(), "src/features/consumerRepair"))
      .filter((file) => file.endsWith(".tsx") || file.endsWith(".ts"))
      .map((file) => fs.readFileSync(path.join(process.cwd(), "src/features/consumerRepair", file), "utf8"))
      .join("\n");

    expect(feature).not.toMatch(/storageKey|storage_key/);
    expect(feature).toContain("pdf.signedUrl");
    expect(feature).toContain("Открыть PDF");
  });
});
