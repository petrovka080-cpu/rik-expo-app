/**
 * Product route deep-link contract tests.
 *
 * WAVE L: Validates that the product/[id] route correctly trims and
 * validates the `id` param before making server calls.
 */

import fs from "fs";
import path from "path";

describe("product/[id] deep-link contract", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "../../app/product/[id].tsx"),
    "utf8",
  );

  it("trims the id param before use", () => {
    // The id must be trimmed to prevent whitespace-only IDs from triggering fetches
    expect(source).toContain("rawId");
    expect(source).toContain(".trim()");
  });

  it("treats undefined rawId as undefined id", () => {
    // typeof guard ensures non-string values become undefined
    expect(source).toContain('typeof rawId === "string"');
  });

  it("guards against empty id before fetch in the function body", () => {
    // Scope to the ProductDetailsScreen function body
    const fnStart = source.indexOf("function ProductDetailsScreen");
    expect(fnStart).toBeGreaterThan(0);
    const fnBody = source.slice(fnStart);
    const guardIndex = fnBody.indexOf("if (!id)");
    const fetchIndex = fnBody.indexOf("loadMarketListingById");
    expect(guardIndex).toBeGreaterThan(0);
    expect(fetchIndex).toBeGreaterThan(guardIndex);
  });

  it("has an error boundary wrapper", () => {
    expect(source).toContain("withScreenErrorBoundary(ProductDetailsScreen");
    expect(source).toContain('"product"');
    expect(source).toContain('"/product/[id]"');
  });

  it("does not export the raw component as default", () => {
    // The default export must be the wrapped version
    expect(source).not.toContain("export default function ProductDetailsScreen");
  });
});
