import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("AI cited external market preview architecture", () => {
  it("mounts Wave05 cited preview files, BFF aliases, and runtime proof without uncontrolled scraping", () => {
    const files = [
      "src/features/ai/externalIntel/aiExternalSourceTrustPolicy.ts",
      "src/features/ai/externalIntel/aiCitedExternalSearchGateway.ts",
      "src/features/ai/externalIntel/aiExternalSupplierCitationPreview.ts",
      "src/features/ai/externalIntel/aiExternalIntelRedaction.ts",
      "src/features/ai/agent/agentBffRouteShell.ts",
      "scripts/e2e/runAiExternalCitedMarketPreviewMaestro.ts",
    ];
    const combined = files.map(read).join("\n");

    expect(combined).toContain("S_AI_EXTERNAL_02_CITED_MARKET_INTELLIGENCE_PREVIEW");
    expect(combined).toContain("AI_EXTERNAL_SOURCE_TRUST_POLICY_CONTRACT");
    expect(combined).toContain("AI_CITED_EXTERNAL_SEARCH_GATEWAY_CONTRACT");
    expect(combined).toContain("AI_EXTERNAL_SUPPLIER_CITATION_PREVIEW_CONTRACT");
    expect(combined).toContain("AI_EXTERNAL_INTEL_REDACTION_CONTRACT");
    expect(combined).toContain("GET /agent/external-intel/sources");
    expect(combined).toContain("POST /agent/external-intel/cited-search-preview");
    expect(combined).toContain("POST /agent/procurement/external-supplier-preview");
    expect(combined).toContain("external_live_fetch_default");
    expect(combined).toContain("external_result_confidence_required");
    expect(combined).toContain("raw_html_returned: false");
    expect(combined).toContain("supplier_confirmed: false");
    expect(combined).toContain("order_created: false");
    expect(combined).toContain("warehouse_mutated: false");
    expect(combined).toContain("payment_created: false");
    expect(combined).not.toMatch(/\bfetch\s*\(|\bXMLHttpRequest\b|cheerio|puppeteer/i);
    expect(combined).not.toMatch(/auth\.admin|listUsers|service_role|raw\s+prompt|provider\s+payload/i);
  });
});
