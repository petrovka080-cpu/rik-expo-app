import fs from "node:fs";
import path from "node:path";

describe("no feature-specific camera duplicate", () => {
  it("does not create camera services under the existing-row photo feature", () => {
    const root = path.join(process.cwd(), "src", "lib", "ai", "photoMaterialExistingRow");
    const files = fs.readdirSync(root).filter((file) => /camera|capture/i.test(file));
    expect(files).toEqual([]);
  });
});
