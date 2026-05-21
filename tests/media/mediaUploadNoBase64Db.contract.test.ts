import fs from "fs";
import path from "path";

test("media upload layer does not encode DB payloads as base64", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../../src/lib/media/services/mediaUploadService.ts"), "utf8");
  expect(source).not.toMatch(/toString\(["']base64["']\)/);
  expect(source).not.toMatch(/data:[^;]+;base64/);
});
