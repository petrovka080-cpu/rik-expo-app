import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("AI external market intelligence canary architecture", () => {
  it("keeps the provider registry disabled, cited, and preview-only by default", () => {
    const registry = read("src/features/ai/externalIntel/aiExternalProviderRegistry.ts");
    const searchPolicy = read("src/features/ai/externalIntel/aiExternalSearchPolicy.ts");
    const citationPolicy = read("src/features/ai/externalIntel/aiExternalCitationPolicy.ts");
    const candidatePreview = read("src/features/ai/externalIntel/aiExternalSupplierCandidatePreview.ts");

    expect(registry).toContain("AI_EXTERNAL_PROVIDER_REGISTRY");
    expect(registry).toContain("liveFetchEnabledByDefault: false");
    expect(registry).toContain("mobileApiKeyAllowed: false");
    expect(registry).toContain("rawHtmlReturned: false");
    expect(searchPolicy).toContain("externalLiveFetchDefault: false");
    expect(searchPolicy).toContain("finalActionForbidden: true");
    expect(searchPolicy).toContain("providerCalled: false");
    expect(citationPolicy).toContain("BLOCKED_EXTERNAL_RESULT_WITHOUT_CITATION");
    expect(citationPolicy).toContain("BLOCKED_EXTERNAL_RAW_HTML_RETURNED");
    expect(candidatePreview).toContain("AI_EXTERNAL_SUPPLIER_CANDIDATE_CANARY_CONTRACT");
    expect(candidatePreview).toContain("supplierConfirmationAllowed: false");
    expect(candidatePreview).toContain("orderCreationAllowed: false");
    expect(candidatePreview).toContain("fakeSuppliersAllowed: false");
    expect(candidatePreview).toContain("finalActionAllowed: false");
  });

  it("keeps Wave 17 BFF and runner proof on internal-first preview boundaries", () => {
    const bff = read("src/features/ai/agent/agentBffRouteShell.ts");
    const runner = read("scripts/e2e/runAiExternalMarketIntelCanaryMaestro.ts");
    const combined = `${bff}\n${runner}`;

    expect(bff).toContain("previewAiExternalSupplierCandidatesCanary");
    expect(bff).toContain("POST /agent/external-intel/search/preview");
    expect(bff).toContain("POST /agent/procurement/external-supplier-candidates/preview");
    expect(runner).toContain("S_AI_MAGIC_17_EXTERNAL_MARKET_INTELLIGENCE_CANARY");
    expect(runner).toContain("verifyAndroidInstalledBuildRuntime");
    expect(runner).toContain("runAiProcurementExternalIntelMaestro");
    expect(runner).toContain("resolveAiProcurementRuntimeRequest");
    expect(runner).toContain("external_live_fetch: false");
    expect(runner).toContain("supplier_confirmed: false");
    expect(runner).toContain("order_created: false");
    expect(runner).toContain("warehouse_mutated: false");
    expect(runner).toContain("payment_created: false");
    expect(runner).not.toMatch(/\bfetch\s*\(/);
    expect(combined).not.toMatch(/service_role|auth\.admin|listUsers|raw\s+prompt|provider\s+payload|hardcoded response/i);
  });
});
