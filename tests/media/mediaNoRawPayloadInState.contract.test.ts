import fs from "fs";
import path from "path";

test("media core has no React state for raw payloads", () => {
  const mediaDir = path.resolve(__dirname, "../../src/lib/media");
  const source = fs.readdirSync(mediaDir).map((file) => fs.statSync(path.join(mediaDir, file)).isFile() ? fs.readFileSync(path.join(mediaDir, file), "utf8") : "").join("\n");
  expect(source).not.toContain("useState");
  expect(source).not.toContain("FileReader");
});
