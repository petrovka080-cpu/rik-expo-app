import fs from "node:fs";
import path from "node:path";

describe("AI external market intelligence canary runner", () => {
  const runner = fs.readFileSync(
    path.join(process.cwd(), "scripts/e2e/runAiExternalMarketIntelCanaryMaestro.ts"),
    "utf8",
  );

  it("writes Wave 17 artifacts and allows only preview/read proof", () => {
    expect(runner).toContain("`${artifactPrefix}_inventory.json`");
    expect(runner).toContain("`${artifactPrefix}_matrix.json`");
    expect(runner).toContain("`${artifactPrefix}_emulator.json`");
    expect(runner).toContain("GREEN_AI_EXTERNAL_MARKET_INTELLIGENCE_CANARY_READY");
    expect(runner).toContain("external_live_fetch: false");
    expect(runner).toContain("mutation_count: 0");
    expect(runner).toContain("supplier_confirmed: false");
    expect(runner).toContain("order_created: false");
    expect(runner).toContain("fake_suppliers_created: false");
    expect(runner).toContain("secrets_printed: false");
  });

  it("keeps env checks to flags only and avoids secret output", () => {
    expect(runner).toContain("S_AI_NO_SECRETS_PRINTING");
    expect(runner).not.toMatch(/console\.log\([^)]*(PASSWORD|JWT|DB_URL|SECRET|TOKEN)/i);
    expect(runner).not.toMatch(/service_role|listUsers|auth\.admin|seed/i);
  });
});
