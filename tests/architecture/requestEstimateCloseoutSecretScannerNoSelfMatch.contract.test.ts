import fs from "node:fs";
import path from "node:path";

function readCloseoutSource(): string {
  return fs.readFileSync(
    path.resolve(process.cwd(), "scripts/e2e/runRequestEstimateProductionSafeSelectedWorkCatalogUxCloseout.ts"),
    "utf8",
  );
}

it("keeps live token detector prefixes out of the closeout source diff", () => {
  const source = readCloseoutSource();
  const stripeLivePrefix = ["sk", "live", ""].join("_");

  expect(source).not.toContain(stripeLivePrefix);
  expect(source).toContain('["sk", "live", ""].join("_")');
  expect(source).toContain('["ghp", "[A-Za-z0-9_]{20,}"].join("_")');
  expect(source).toContain('["xox", "[baprs]-"].join("")');
});
