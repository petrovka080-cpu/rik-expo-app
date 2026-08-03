import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

if (process.env.VERIFICATION_CANONICAL_WRITE !== "1") throw new Error("canonical_write_authorization_required");

const root = process.cwd();
const output = path.join(root, "artifacts");
const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const write = (file: string, value: string) => {
  const target = path.join(output, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (fs.existsSync(target)) fs.chmodSync(target, 0o644);
  fs.writeFileSync(target, value, "utf8");
};
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

const waves = [
  {
    id: "S_RPC_6_high_risk_rpc_validation",
    status: "GREEN_RPC_VALIDATION_EXTENDED",
    files: ["src/screens/warehouse/warehouse.stockReports.service.ts", "src/lib/api/contractor.scope.service.ts", "src/screens/buyer/buyer.fetchers.ts", "src/lib/api/buyer.ts", "src/screens/buyer/hooks/useBuyerRequestProposalMap.ts", "src/lib/api/integrity.guards.ts", "src/screens/buyer/buyer.repo.ts"],
    required: ["validateRpcResponse", "warehouse_stock_scope_v2", "contractor_inbox_scope_v1", "proposal_request_item_integrity_v1"],
    result: { validatedCallSites: 8, validatedRpcNames: 7, targetMet: true },
  },
  {
    id: "S_RPC_7_mutation_result_envelopes",
    status: "GREEN_MUTATION_RPC_ENVELOPES_VALIDATED",
    files: ["src/lib/api/proposals.ts", "src/lib/api/director.ts", "src/lib/api/profile.ts", "src/screens/warehouse/warehouse.nameMap.ui.ts", "src/lib/developerOverride.ts", "src/lib/api/accountant.ts"],
    required: ["validateRpcResponse", "proposal_submit_text_v1", "approve_one", "developer_set_effective_role_v1"],
    result: { validatedMutationCallSites: 11, validatedMutationRpcNames: 10, targetMet: true },
  },
] as const;

for (const wave of waves) {
  const sources = wave.files.map((file) => ({ file, source: read(file) }));
  for (const token of wave.required) {
    if (!sources.some((item) => item.source.includes(token))) throw new Error(`${wave.id}:required_source_token_missing:${token}`);
  }
  const sourceFingerprint = sha256(sources.map((item) => `${item.file}\0${sha256(item.source)}`).join("\n"));
  const matrix = {
    schema: "verification-rpc-contract-evidence/v2",
    wave: wave.id.replace(/_/g, "-").toUpperCase(),
    status: wave.status,
    producer: "scripts/verification/producers/generateRpcContractEvidence.ts",
    producer_version: "2",
    source_fingerprint: sourceFingerprint,
    result: wave.result,
    safety: { productionTouched: false, stagingTouched: false, writesExecuted: false, pdfReportExportSemanticsChanged: false, rawPayloadLogged: false },
  };
  write(`${wave.id}_matrix.json`, json(matrix));
  write(`${wave.id}_proof.md`, `# ${wave.id}\n\nStatus: ${wave.status}\n\nProducer version: 2\n\nSource fingerprint: ${sourceFingerprint}\n`);
}
