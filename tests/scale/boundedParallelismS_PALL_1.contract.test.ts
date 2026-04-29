import fs from "fs";

const readProjectFile = (path: string) => fs.readFileSync(path, "utf8");

describe("S-PALL-1 bounded parallelism contracts", () => {
  it("bounds request item batch RPC mutations without changing all-settled semantics", () => {
    const source = readProjectFile("src/lib/api/requests.ts");

    expect(source).toContain("allSettledWithConcurrencyLimit");
    expect(source).toContain("const chunkSize = 8");
    expect(source).toContain("pack,");
    expect(source).toContain("3,");
    expect(source).not.toContain("Promise.allSettled(\n      pack.map");
  });

  it("bounds buyer summary dynamic scope loads", () => {
    const source = readProjectFile("src/screens/buyer/buyer.summary.service.ts");

    expect(source).toContain("mapWithConcurrencyLimit");
    expect(source).toContain("scopes,");
    expect(source).toContain("2,");
    expect(source).not.toContain("scopes.map(async");
  });

  it("bounds foreman draft queue cleanup by queue key", () => {
    const source = readProjectFile("src/screens/foreman/hooks/useForemanDraftBoundary.ts");

    expect(source).toContain("mapWithConcurrencyLimit");
    expect(source).toContain("Array.from(cacheClearPlan.queueKeys)");
    expect(source).toContain("2,");
    expect(source).not.toContain(".map(async (key)");
  });

  it("keeps foreman runPool bounded through the shared concurrency helper", () => {
    const source = readProjectFile("src/screens/foreman/foreman.helpers.ts");

    expect(source).toContain("allSettledWithConcurrencyLimit");
    expect(source).toContain("const n = Math.max(1, Math.min(20, Number(limit) || 6))");
    expect(source).not.toContain("Promise.all(Array.from({ length: Math.min(n, items.length) }");
  });

  it("keeps director report chunk fanout bounded through the shared helper", () => {
    const source = readProjectFile("src/lib/api/director_reports.context.ts");

    expect(source).toContain("mapWithConcurrencyLimit(parts, c");
    expect(source).not.toContain("Promise.all(runners)");
  });
});
