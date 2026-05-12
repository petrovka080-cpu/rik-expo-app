import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function readIfExists(relativePath: string): string {
  const fullPath = path.join(root, relativePath);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, "utf8") : "";
}

describe("external intelligence no-mutation boundary", () => {
  it("has no external network, database, auth admin, or final action surface in source", () => {
    const source = [
      "src/features/ai/externalIntel/externalIntelTypes.ts",
      "src/features/ai/externalIntel/externalSourceRegistry.ts",
      "src/features/ai/externalIntel/externalIntelPolicy.ts",
      "src/features/ai/externalIntel/externalIntelRedaction.ts",
      "src/features/ai/externalIntel/externalIntelProviderFlags.ts",
      "src/features/ai/externalIntel/DisabledExternalIntelProvider.ts",
      "src/features/ai/externalIntel/ExternalIntelGateway.ts",
      "src/features/ai/externalIntel/internalFirstExternalGate.ts",
      "src/features/ai/procurement/procurementSupplierMatchEngine.ts",
      "src/features/ai/agent/agentBffRouteShell.ts",
    ].map(read).join("\n");

    expect(source).not.toMatch(/\bfetch\s*\(|\bXMLHttpRequest\b|uncontrolled_scraping/i);
    expect(source).not.toMatch(/@supabase\/supabase-js|\bauth\.admin\b|\blistUsers\b|\bservice_role\b/i);
    expect(source).not.toMatch(/\.(?:from|rpc|insert|update|delete|upsert)\s*\(/);
    expect(source).not.toMatch(/\bcreateOrder\b|\bconfirmSupplier\b|\bsendRfq\b|\bwarehouseMutation\b|\bsendDocument\b/);
    expect(source).not.toMatch(/finalActionAllowed:\s*true|supplierConfirmationAllowed:\s*true|orderCreationAllowed:\s*true/);
    expect(source).not.toMatch(/\brawHtml\s*:|\brawDbRows\s*:|\bproviderPayload\s*:|\brawPrompt\s*:/i);
  });

  it("does not persist provider secrets or fake external results in artifacts", () => {
    const artifactSource = [
      "artifacts/S_AI_MAGIC_03_EXTERNAL_INTEL_GATEWAY_inventory.json",
      "artifacts/S_AI_MAGIC_03_EXTERNAL_INTEL_GATEWAY_matrix.json",
      "artifacts/S_AI_MAGIC_03_EXTERNAL_INTEL_GATEWAY_emulator.json",
      "artifacts/S_AI_MAGIC_03_EXTERNAL_INTEL_GATEWAY_proof.md",
    ].map(readIfExists).join("\n");

    expect(artifactSource).not.toMatch(/sk-[A-Za-z0-9_-]{12,}|AIza[0-9A-Za-z_-]{20,}|Bearer\s+[0-9A-Za-z._-]{12,}|password\s*[:=]\s*["'][^"']+["']/i);
    expect(artifactSource).not.toMatch(/fake_external_results_created":\s*true|fake_suppliers_created":\s*true/i);
  });
});
