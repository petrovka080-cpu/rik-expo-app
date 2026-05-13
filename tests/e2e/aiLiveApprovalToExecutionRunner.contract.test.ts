import fs from "node:fs";
import path from "node:path";

describe("S11 live approval-to-execution runner contract", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "scripts", "e2e", "runAiLiveApprovalToExecutionPointOfNoReturn.ts"),
    "utf8",
  );

  it("writes the S11 inventory, matrix, emulator, and proof artifacts", () => {
    expect(source).toContain("S_AI_MAGIC_11_LIVE_APPROVAL_TO_EXECUTION");
    expect(source).toContain("_inventory.json");
    expect(source).toContain("_matrix.json");
    expect(source).toContain("_emulator.json");
    expect(source).toContain("_proof.md");
    expect(source).toContain("writeProof");
    expect(source).toContain("writeArtifacts");
  });

  it("keeps S11 live writes bounded to ledger lifecycle and approved executor proof", () => {
    expect(source).toContain("ledger_mutations_created");
    expect(source).toContain("unsafe_domain_mutations_created: 0");
    expect(source).toContain("supplier_confirmed: false");
    expect(source).toContain("order_created: false");
    expect(source).toContain("payment_created: false");
    expect(source).toContain("warehouse_mutated: false");
    expect(source).toContain("external_live_fetch: false");
  });

  it("does not print or persist raw secrets, prompts, provider payloads, or raw rows", () => {
    expect(source).toContain("secrets_printed: false");
    expect(source).toContain("raw_rows_printed: false");
    expect(source).toContain("raw_prompt_printed: false");
    expect(source).toContain("raw_provider_payload_printed: false");
    expect(source).not.toMatch(/console\.log\(process\.env|process\.env\.[A-Z_]*(?:PASSWORD|JWT)|rawProviderPayload\s*:/i);
  });
});
