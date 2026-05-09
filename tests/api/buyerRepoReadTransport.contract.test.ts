import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");

const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

const exportedFunctionSource = (source: string, functionName: string) => {
  const start = source.indexOf(`export async function ${functionName}`);
  if (start < 0) throw new Error(`Missing function ${functionName}`);
  const rest = source.slice(start);
  const next = rest.indexOf("\nexport async function ", 1);
  return next < 0 ? rest : rest.slice(0, next);
};

describe("buyer repo read transport boundary", () => {
  it("moves buyer read provider calls behind the typed transport", () => {
    const repoSource = read("src/screens/buyer/buyer.repo.ts");
    const transportSource = read("src/screens/buyer/buyer.repo.read.transport.ts");

    expect(repoSource).toContain('from "./buyer.repo.read.transport"');
    expect(repoSource).toContain("createBuyerProposalItemsForAccountingQuery(supabase, pidStr)");
    expect(repoSource).toContain("selectBuyerSupplierCardByName(supabase, name)");
    expect(repoSource).toContain("createBuyerProposalItemsForViewQuery(supabase, pidStr)");
    expect(repoSource).toContain("createBuyerRequestItemsByIdsQuery(supabase, clean)");
    expect(repoSource).toContain("createBuyerProposalItemLinksQuery(supabase, ids)");
    expect(repoSource).toContain("createBuyerRequestItemToRequestMapQuery(supabase, ids)");

    const readFunctions = [
      "repoGetProposalItemsForAccounting",
      "repoGetSupplierCardByName",
      "repoGetProposalItemsForView",
      "repoGetRequestItemsByIds",
      "repoGetProposalItemLinks",
      "repoGetRequestItemToRequestMap",
    ];

    for (const functionName of readFunctions) {
      const body = exportedFunctionSource(repoSource, functionName);
      expect(body).not.toContain("supabase.from(");
      expect(body).not.toContain(".from(\"proposal_items\")");
      expect(body).not.toContain(".from(\"request_items\")");
      expect(body).not.toContain(".from(\"suppliers\")");
    }

    expect(transportSource).toContain("export type BuyerProposalAccountingItemRow");
    expect(transportSource).toContain("export type BuyerSupplierCardRow");
    expect(transportSource).toContain("export type BuyerProposalItemViewRow");
    expect(transportSource).toContain("export type BuyerRequestItemRow");
    expect(transportSource).toContain("export type BuyerProposalItemLinkRow");
    expect(transportSource).toContain("export type BuyerRequestItemToRequestRow");
    expect(transportSource).toContain("createGuardedPagedQuery");
    expect(transportSource).toContain("isBuyerProposalAccountingItemRow");
    expect(transportSource).toContain("isBuyerProposalItemViewRow");
    expect(transportSource).toContain('.from("proposal_items")');
    expect(transportSource).toContain('.from("request_items")');
    expect(transportSource).toContain('.from("suppliers")');
    expect(transportSource).not.toContain("unknown as PagedQuery");
  });

  it("preserves query contracts while repository keeps mapping and error semantics", () => {
    const repoSource = read("src/screens/buyer/buyer.repo.ts");
    const transportSource = read("src/screens/buyer/buyer.repo.read.transport.ts");

    expect(transportSource).toContain('.select("supplier, qty, price")');
    expect(transportSource).toContain('.eq("proposal_id", proposalId)');
    expect(transportSource).toContain('.order("id", { ascending: true })');

    expect(transportSource).toContain('.select("name, inn, bank_account, phone, email")');
    expect(transportSource).toContain('.ilike("name", supplierName)');
    expect(transportSource).toContain(".maybeSingle<BuyerSupplierCardRow>()");

    expect(transportSource).toContain(
      '.select("request_item_id, name_human, uom, qty, rik_code, app_code, price, supplier, note")',
    );
    expect(transportSource).toContain('.order("request_item_id", { ascending: true })');
    expect(transportSource).toContain(
      '.select("id, name_human, uom, qty, rik_code, app_code, status, cancelled_at")',
    );
    expect(transportSource).toContain('.in("id", requestItemIds)');
    expect(transportSource).toContain('.select("proposal_id, request_item_id")');
    expect(transportSource).toContain('.in("proposal_id", proposalIds)');
    expect(transportSource).toContain('.order("proposal_id", { ascending: true })');
    expect(transportSource).toContain('.select("id, request_id")');

    expect(repoSource).toContain("loadPagedBuyerRepoRows");
    expect(repoSource).toContain("if (pi.error) throw pi.error");
    expect(repoSource).toContain("if (cardQ.error) return { name }");
    expect(repoSource).toContain("if (q.error) throw q.error");
    expect(repoSource).toContain("if (ri.error) throw ri.error");
    expect(repoSource).toContain("return Array.isArray(q.data) ? q.data : []");
    expect(transportSource).not.toContain("recordCatchDiscipline");
    expect(transportSource).not.toContain("validateRpcResponse");
  });

  it("leaves buyer write provider ownership unchanged for this wave", () => {
    const repoSource = read("src/screens/buyer/buyer.repo.ts");

    expect(exportedFunctionSource(repoSource, "repoSetProposalBuyerFio")).toContain(
      '.from("proposals")',
    );
    expect(exportedFunctionSource(repoSource, "repoUpdateProposalItems")).toContain(
      '.upsert(pack, { onConflict: "proposal_id,request_item_id" })',
    );
    expect(exportedFunctionSource(repoSource, "repoUpdateProposalItems")).toContain(
      ".update(upd)",
    );
  });
});
