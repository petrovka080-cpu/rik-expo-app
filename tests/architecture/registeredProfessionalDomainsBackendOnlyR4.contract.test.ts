import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("R4 registered professional domains use one backend compiler", () => {
  it("does not import any frontend production binding from the production registry", () => {
    const registry = read("src/lib/estimate/v4/domains/registeredProfessionalEstimateDomainsV1.ts");
    expect(registry).not.toContain("buildElectricalFromInlineInputV1");
    expect(registry).not.toContain("buildHvacFromInlineInputV1");
    expect(registry).not.toContain("buildInteriorFinishesFromInlineInputV1");
    expect(registry).not.toContain('from "./electricalComplete"');
    expect(registry).not.toContain('from "./heatingVentilationComplete"');
    expect(registry).not.toContain('from "./interiorFinishesComplete"');
  });

  it("fails the synchronous exact-domain route closed until the canonical backend responds", () => {
    const inline = read("src/lib/estimate/buildEstimateFromInlineWorkPrompt.ts");
    expect(inline).toContain("resolveRegisteredProfessionalEstimateSelectionV1(explicitExactId)");
    expect(inline).toContain('blockingReason: "CANONICAL_BACKEND_REQUIRED"');
    expect(inline).not.toContain("buildRegisteredProfessionalEstimateFromInlineInputV1(input)");
  });

  it("keeps the screen's real compile owner on the canonical backend client", () => {
    const container = read("src/features/consumerRepair/ConsumerRepairRequestScreenContainer.tsx");
    const backend = read("src/features/consumerRepair/consumerCanonicalBaselineCompile.ts");
    expect(container).toContain("compileConsumerCanonicalBaseline");
    expect(backend).toContain("compileCanonicalEstimateAndLoad");
    expect(backend).toContain("it never compiles a fallback estimate on the client");
  });
});
