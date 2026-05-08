import fs from "fs";
import path from "path";
import { resolveBuyerActionFioFromMetadata } from "../../src/screens/buyer/buyer.actions.auth.transport";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("buyer action auth transport boundary", () => {
  it("keeps buyer action auth reads behind the transport boundary", () => {
    const actionSource = read("src/screens/buyer/buyer.actions.ts");
    const transportSource = read("src/screens/buyer/buyer.actions.auth.transport.ts");

    expect(actionSource).toContain("buyer.actions.auth.transport");
    expect(actionSource).not.toContain("supabase.auth.getUser");
    expect(actionSource).not.toContain("auth.getUser");
    expect(transportSource).toContain("auth.getUser");
    expect(transportSource).toContain("loadBuyerActionFioCandidate");
  });

  it("preserves full_name before name fallback semantics", () => {
    expect(
      resolveBuyerActionFioFromMetadata(
        {
          full_name: " Buyer One ",
          name: "Ignored Name",
        },
        "Fallback Buyer",
      ),
    ).toBe("Buyer One");

    expect(
      resolveBuyerActionFioFromMetadata(
        {
          full_name: " ",
          name: " Buyer Fallback ",
        },
        "Fallback Buyer",
      ),
    ).toBe("Buyer Fallback");

    expect(resolveBuyerActionFioFromMetadata(null, "Fallback Buyer")).toBe(
      "Fallback Buyer",
    );
  });
});

describe("buyer action write transport boundary", () => {
  it("keeps buyer action writes behind the transport boundary", () => {
    const repoSource = read("src/screens/buyer/buyer.actions.repo.ts");
    const transportSource = read("src/screens/buyer/buyer.actions.write.transport.ts");

    expect(repoSource).toContain("buyer.actions.write.transport");
    expect(repoSource).not.toContain("supabase.rpc(");
    expect(repoSource).not.toContain("supabase.from(");
    expect(repoSource).not.toContain('.from("request_items")');
    expect(transportSource).toContain("supabase.rpc(");
    expect(transportSource).toContain('"request_items_set_status"');
    expect(transportSource).toContain('"buyer_rfq_create_and_publish_v1"');
    expect(transportSource).toContain('"proposal_send_to_accountant_min"');
    expect(transportSource).toContain('.from("request_items")');
  });
});
