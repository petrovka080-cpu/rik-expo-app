import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function readTree(dir: string): string {
  return readdirSync(join(process.cwd(), dir))
    .flatMap((entry) => {
      const relative = join(dir, entry);
      const full = join(process.cwd(), relative);
      if (statSync(full).isDirectory()) return readTree(relative);
      if (!/\.(ts|tsx)$/.test(entry)) return [];
      return readFileSync(full, "utf8");
    })
    .join("\n");
}

describe("foreman AI estimate no screen-local calculation", () => {
  it("keeps estimate calculation out of foreman screens and hooks", () => {
    const foremanScreens = readTree("src/screens/foreman");

    expect(foremanScreens).not.toContain("calculateGlobalConstructionEstimateSync");
    expect(foremanScreens).not.toContain("buildStructuredEstimatePayload");
    expect(foremanScreens).not.toContain("buildEstimatePresentationViewModel");
    expect(foremanScreens).not.toContain("Prompt -> local regex");
    expect(foremanScreens).not.toContain("PRICE_HARDCODED");
  });
});
