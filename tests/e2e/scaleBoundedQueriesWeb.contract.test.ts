import fs from "node:fs";
import path from "node:path";

describe("S_SCALE_01 bounded queries web runner contract", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "scripts/e2e/runScaleBoundedQueriesWeb.ts"),
    "utf8",
  );

  it("targets the required list screens without submitting auth or mutation flows", () => {
    for (const screenId of [
      "buyer.requests",
      "director.dashboard",
      "warehouse.main",
      "accountant.history",
      "market.home",
      "map.main",
      "office.hub",
    ]) {
      expect(source).toContain(screenId);
    }

    expect(source).not.toContain(".click(");
    expect(source).not.toContain(".fill(");
    expect(source).not.toContain("process.env.SUPABASE_SERVICE_ROLE");
  });

  it("records runtime safety signals and refreshes scale artifacts", () => {
    expect(source).toContain("verifyBoundedDatabaseQueries");
    expect(source).toContain("writeBoundedDatabaseQueryArtifacts");
    expect(source).toContain("noProviderCall");
    expect(source).toContain("noDbWrites");
    expect(source).toContain("noRawQueryRowsPrinted");
    expect(source).toContain("SCALE_BOUNDED_DATABASE_QUERIES_WAVE");
  });
});
