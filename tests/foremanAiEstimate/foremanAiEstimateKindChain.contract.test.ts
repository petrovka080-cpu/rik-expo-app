import { readFileSync } from "fs";
import { join } from "path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("foreman AI estimate kind chain", () => {
  it("preserves kind through sync payload, local draft, request parsing, and buyer gate", () => {
    const migration = read("supabase/migrations/20260617124500_foreman_ai_estimate_kind_chain_v1.sql");
    const syncService = read("src/lib/api/requestDraftSync.service.ts");
    const localDraft = read("src/screens/foreman/foreman.localDraft.ts");
    const catalogMapping = read("src/lib/catalog/catalog.request.mapping.ts");
    const buyer = read("src/lib/api/buyer.ts");

    expect(migration).toContain("item_kind = v_kind");
    expect(migration).toContain("'kind', coalesce");
    expect(migration).toContain("kind_chain_owner");
    expect(syncService).toContain("mergeRequestDraftSyncKinds");
    expect(localDraft).toContain("kind: item.kind");
    expect(catalogMapping).toContain("pickFirstString(row.kind, row.item_kind)");
    expect(buyer).toContain("isBuyerProcurementKind");
    expect(buyer).toContain("BuyerInboxScopeMissingKindGuardError");
  });
});
