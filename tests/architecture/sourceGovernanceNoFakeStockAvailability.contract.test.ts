import fs from "node:fs";
import path from "node:path";

describe("source governance no fake stock availability", () => {
  it("does not mark catalog/request runtime data available or in stock by default", () => {
    const source = [
      "src/lib/catalog/catalogItemsService.ts",
      "src/lib/consumerRequests/consumerRequestService.ts",
      "src/lib/consumerRequests/consumerRequestItemService.ts",
      "src/lib/consumerRequests/consumerRequestGlobalEstimateIntegration.ts",
    ].map((file) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8")).join("\n");
    expect(source).not.toMatch(/availabilityStatus:\s*"available"/);
    expect(source).not.toMatch(/stockStatus:\s*"in_stock"/);
    expect(source).not.toMatch(/sourceLabel:\s*"fake/i);
  });
});
