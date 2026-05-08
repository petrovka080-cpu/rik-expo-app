import fs from "node:fs";
import path from "node:path";

import {
  ASSISTANT_STORE_READ_BFF_CONTRACT,
  ASSISTANT_STORE_READ_BFF_DIRECT_FALLBACK_REASON,
  ASSISTANT_STORE_READ_BFF_MARKET_PAGE_DEFAULTS,
  ASSISTANT_STORE_READ_BFF_OPERATION_CONTRACTS,
  ASSISTANT_STORE_READ_BFF_REFERENCE_PAGE_DEFAULTS,
} from "../../src/lib/assistant_store_read.bff.contract";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const readProjectFile = (relativePath: string): string =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

const functionBody = (source: string, functionName: string): string => {
  const start = source.indexOf(`export async function ${functionName}`);
  expect(start).toBeGreaterThanOrEqual(0);
  const next = source.indexOf("\nexport ", start + 1);
  return source.slice(start, next === -1 ? source.length : next);
};

describe("assistant/store BFF routing contract", () => {
  it("defines a permanent disabled-by-default read scope for assistant and store safe reads", () => {
    expect(ASSISTANT_STORE_READ_BFF_CONTRACT).toEqual(
      expect.objectContaining({
        contractId: "assistant_store_read_scope_v1",
        routeOperation: "assistant.store.read.scope",
        endpoint: "POST /api/staging-bff/read/assistant-store-read-scope",
        readOnly: true,
        trafficEnabledByDefault: false,
        wiredToAppRuntime: true,
        productionTrafficEnabled: false,
        callsSupabaseDirectlyFromClient: false,
      }),
    );
    expect(ASSISTANT_STORE_READ_BFF_REFERENCE_PAGE_DEFAULTS).toEqual({
      pageSize: 100,
      maxPageSize: 100,
      maxRows: 5000,
      maxPages: 51,
    });
    expect(ASSISTANT_STORE_READ_BFF_MARKET_PAGE_DEFAULTS).toEqual({
      pageSize: 100,
      maxPageSize: 100,
      maxRows: 100,
    });
    expect(ASSISTANT_STORE_READ_BFF_OPERATION_CONTRACTS.map((contract) => contract.operation)).toEqual([
      "assistant.actor.context",
      "assistant.market.active_listings",
      "assistant.market.companies_by_ids",
      "assistant.market.profiles_by_user_ids",
      "profile.current.full_name",
      "chat.actor.context",
      "chat.listing.messages.list",
      "chat.profiles_by_user_ids",
      "supplier_showcase.profile_by_user_id",
      "supplier_showcase.company_by_id",
      "supplier_showcase.company_by_owner_user_id",
      "supplier_showcase.listings_by_user_id",
      "supplier_showcase.listings_by_company_id",
      "request.submitted_at.capability",
      "store.request_items.list",
      "store.director_inbox.list",
      "store.approved_request_items.list",
    ]);
    expect(
      ASSISTANT_STORE_READ_BFF_OPERATION_CONTRACTS.every(
        (contract) => contract.readOnly && !contract.trafficEnabledByDefault && contract.wiredToAppRuntime,
      ),
    ).toBe(true);
  });

  it("routes assistant read and auth paths out of the target actions file", () => {
    const actionsSource = readProjectFile("src/features/ai/assistantActions.ts");
    const transportSource = readProjectFile("src/features/ai/assistantActions.transport.ts");

    expect(actionsSource).toContain("loadAssistantActorReadScope");
    expect(actionsSource).toContain("loadAssistantMarketListingRows");
    expect(actionsSource).toContain("loadAssistantCurrentAuthUser");
    expect(actionsSource).not.toContain("../../lib/supabaseClient");
    expect(actionsSource).not.toContain("supabase.auth.getUser");
    expect(actionsSource).not.toMatch(/\bsupabase\s*\.\s*from\s*\(/);
    expect(actionsSource).not.toMatch(/\bsupabase\s*\.\s*rpc\s*\(/);

    expect(transportSource).toContain("loadAssistantCurrentAuthUser");
    expect(transportSource).toContain("supabase.auth.getUser");
    expect(transportSource).toContain("callAssistantStoreReadBff");
    expect(transportSource.match(/\.from\(/g)?.length ?? 0).toBeGreaterThanOrEqual(6);
    expect(ASSISTANT_STORE_READ_BFF_DIRECT_FALLBACK_REASON).toContain("compatibility fallback");
  });

  it("routes store list reads out of store_supabase while routing write and RPC ownership to transport", () => {
    const storeSource = readProjectFile("src/lib/store_supabase.ts");
    const readTransportSource = readProjectFile("src/lib/store_supabase.read.transport.ts");
    const writeTransportSource = readProjectFile("src/lib/store_supabase.write.transport.ts");

    expect(storeSource).toContain("loadRequestItemRows");
    expect(storeSource).toContain("loadDirectorInboxRows");
    expect(storeSource).toContain("loadApprovedRequestItemRows");
    expect(storeSource).toContain("sendStoreRequestToDirectorRpc");
    expect(storeSource).toContain("approveOrDeclineRequestPendingRpc");
    expect(storeSource).toContain("insertStorePurchase");
    expect(functionBody(storeSource, "listRequestItems")).not.toContain(".from(");
    expect(functionBody(storeSource, "listDirectorInbox")).not.toContain(".from(");
    expect(functionBody(storeSource, "listApprovedByRequest")).not.toContain(".from(");
    expect(functionBody(storeSource, "sendRequestToDirector")).not.toContain(".rpc(");
    expect(functionBody(storeSource, "approvePending")).not.toContain(".rpc(");
    expect(functionBody(storeSource, "createPoFromRequest")).not.toContain(".from(");
    expect(functionBody(storeSource, "createPoFromRequest")).not.toContain(".insert(");

    expect(storeSource.match(/\bsupabase\s*\./g) ?? []).toHaveLength(0);
    expect(readTransportSource).toContain("callAssistantStoreReadBff");
    expect(readTransportSource.match(/\.from\(/g) ?? []).toHaveLength(3);
    expect(writeTransportSource).toContain("STORE_SUPABASE_WRITE_RPC_NAMES");
    expect(writeTransportSource.match(/\.rpc\(/g) ?? []).toHaveLength(2);
    expect(writeTransportSource.match(/\.insert\(/g) ?? []).toHaveLength(3);
  });

  it("wires the mobile BFF route without enabling production traffic", () => {
    const bffClientSource = readProjectFile("src/shared/scale/bffClient.ts");
    const assistantStoreClientSource = readProjectFile("src/lib/assistant_store_read.bff.client.ts");
    const assistantStoreHandlerSource = readProjectFile("src/lib/assistant_store_read.bff.handler.ts");

    expect(bffClientSource).toContain('"assistant.store.read.scope"');
    expect(bffClientSource).toContain("/api/staging-bff/read/assistant-store-read-scope");
    expect(assistantStoreClientSource).toContain("callBffReadonlyMobile");
    expect(assistantStoreClientSource).toContain("resolveBffReadonlyRuntimeConfig");
    expect(`${assistantStoreClientSource}\n${assistantStoreHandlerSource}`).not.toContain(".rpc(");
    expect(`${assistantStoreClientSource}\n${assistantStoreHandlerSource}`).not.toContain(".from(");
  });

  it("routes low-risk profile, chat, supplier showcase, and capability reads through typed transports", () => {
    const profileSource = readProjectFile("src/features/profile/currentProfileIdentity.ts");
    const chatSource = readProjectFile("src/lib/chat_api.ts");
    const supplierSource = readProjectFile("src/features/supplierShowcase/supplierShowcase.data.ts");
    const capabilitySource = readProjectFile("src/lib/api/requests.read-capabilities.ts");
    const lowRiskTransportSource = readProjectFile("src/lib/assistant_store_read.low_risk.transport.ts");
    const supplierTransportSource = readProjectFile("src/features/supplierShowcase/supplierShowcase.transport.ts");

    expect(profileSource).toContain("loadCurrentProfileFullNameRow");
    expect(profileSource).not.toMatch(/\bsupabase\s*\.\s*from\s*\(/);

    expect(chatSource).toContain("loadChatActorContextRows");
    expect(chatSource).toContain("loadListingChatMessageRows");
    expect(functionBody(chatSource, "fetchListingChatMessages")).not.toMatch(/\bsupabase\s*\.\s*from\s*\(/);
    expect(functionBody(chatSource, "sendListingChatMessage")).toContain(".insert(");
    expect(functionBody(chatSource, "markListingChatMessagesRead")).toContain(".update(");

    expect(supplierSource).toContain("loadSupplierShowcaseProfileByUserId");
    expect(supplierSource).not.toMatch(/\bsupabase\s*\.\s*from\s*\(/);

    expect(capabilitySource).toContain("loadRequestsSubmittedAtCapability");
    expect(capabilitySource).not.toContain('select("submitted_at")');
    expect(capabilitySource).toContain('select("*").limit(1)');

    expect(`${lowRiskTransportSource}\n${supplierTransportSource}`).toContain("callAssistantStoreReadBff");
    expect(lowRiskTransportSource).toContain("return await fallback()");
  });
});
