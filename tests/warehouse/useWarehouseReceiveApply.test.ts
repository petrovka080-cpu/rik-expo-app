import { createClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

import { REQUEST_DRAFT_STATUS } from "../../src/lib/api/requests.status";
import type { Database } from "../../src/lib/database.types";
import { RpcValidationError } from "../../src/lib/api/queryBoundary";
import { applyWarehouseReceive } from "../../src/screens/warehouse/hooks/useWarehouseReceiveApply";
import {
  cleanupTempUser,
  createTempUser,
  createVerifierAdmin,
  type RuntimeTestUser,
} from "../../scripts/_shared/testUserDiscipline";

loadDotenv({ path: ".env.local", override: false });
loadDotenv({ path: ".env", override: false });

const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const anonKey = String(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

if (!supabaseUrl || !anonKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY");
}

const admin = createVerifierAdmin("warehouse-receive-rpc-chain-fix-test");

type SeedScope = {
  user: RuntimeTestUser | null;
  companyId: string | null;
  companyProfileId: string | null;
  requestId: string | null;
  requestItemId: string | null;
  purchaseId: string | null;
  purchaseItemId: string | null;
  incomingId: string | null;
  incomingItemId: string | null;
};

type ReceiveApplyResult = {
  ok: number;
  fail: number;
  left_after: number;
  client_mutation_id: string;
  idempotent_replay: boolean;
};

jest.setTimeout(120_000);

async function createWarehouseClient(user: RuntimeTestUser) {
  const client = createClient<Database>(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        "x-client-info": "warehouse-receive-rpc-chain-fix-test-client",
      },
    },
  });

  const signIn = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (signIn.error || !signIn.data.session) {
    throw signIn.error ?? new Error(`signInWithPassword returned no session for ${user.email}`);
  }

  return client;
}

async function createReceiveSeed(): Promise<SeedScope> {
  const scope: SeedScope = {
    user: null,
    companyId: null,
    companyProfileId: null,
    requestId: null,
    requestItemId: null,
    purchaseId: null,
    purchaseItemId: null,
    incomingId: null,
    incomingItemId: null,
  };

  scope.user = await createTempUser(admin, {
    role: "warehouse",
    fullName: "Warehouse RPC Chain Tester",
    emailPrefix: "warehouse-rpc-chain",
    profile: { role: "warehouse" },
    userProfile: { usage_build: true },
    appMetadata: { role: "warehouse" },
  });

  const companyName = `Warehouse RPC Chain ${Date.now().toString(36).toUpperCase()}`;
  const companyResult = await admin
    .from("companies")
    .insert({
      owner_user_id: scope.user.id,
      name: companyName,
      city: "Bishkek",
      address: "Warehouse RPC chain proof",
      phone_main: "+996555000000",
      email: scope.user.email,
      about_short: "Warehouse RPC chain proof company",
    })
    .select("id")
    .single();
  if (companyResult.error || !companyResult.data) {
    throw companyResult.error ?? new Error("Failed to create warehouse proof company");
  }

  scope.companyId = String(companyResult.data.id ?? "").trim();
  scope.companyProfileId = scope.companyId;

  const membershipResult = await admin.from("company_members").insert({
    company_id: scope.companyId,
    user_id: scope.user.id,
    role: "warehouse",
  });
  if (membershipResult.error) throw membershipResult.error;

  const companyProfileResult = await admin.from("company_profiles").insert({
    id: scope.companyId,
    user_id: scope.user.id,
    owner_user_id: scope.user.id,
    name: companyName,
    phone: "+996555000000",
    email: scope.user.email,
  });
  if (companyProfileResult.error) throw companyProfileResult.error;

  const requestResult = await admin
    .from("requests")
    .insert({
      status: REQUEST_DRAFT_STATUS,
      created_by: scope.user.id,
      requested_by: scope.user.displayLabel,
      comment: "Warehouse RPC chain seeded request",
      object_name: "Warehouse RPC chain object",
    })
    .select("id")
    .single();
  if (requestResult.error || !requestResult.data) {
    throw requestResult.error ?? new Error("Failed to create seeded request");
  }
  scope.requestId = String(requestResult.data.id ?? "").trim();

  const requestItemResult = await admin
    .from("request_items")
    .insert({
      request_id: scope.requestId,
      name_human: "Warehouse RPC Chain Material",
      qty: 10,
      uom: "pcs",
      rik_code: "MAT-WAVE2B-CHAIN",
      status: "approved",
      kind: "material",
      note: "Warehouse RPC chain seeded request item",
    })
    .select("id")
    .single();
  if (requestItemResult.error || !requestItemResult.data) {
    throw requestItemResult.error ?? new Error("Failed to create seeded request item");
  }
  scope.requestItemId = String(requestItemResult.data.id ?? "").trim();

  const paymentStatusProbe = await admin
    .from("purchases")
    .select("payment_status")
    .not("payment_status", "is", null)
    .limit(1)
    .maybeSingle();
  if (paymentStatusProbe.error) throw paymentStatusProbe.error;
  const paymentStatus = String(paymentStatusProbe.data?.payment_status ?? "").trim();
  if (!paymentStatus) {
    throw new Error("Missing canonical purchases.payment_status sample");
  }

  const purchaseResult = await admin
    .from("purchases")
    .insert({
      created_by: scope.user.id,
      request_id: scope.requestId,
      supplier: "Warehouse RPC Chain Supplier",
      currency: "KGS",
      payment_status: paymentStatus,
      po_no: `PO-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      attachments: [],
    })
    .select("id")
    .single();
  if (purchaseResult.error || !purchaseResult.data) {
    throw purchaseResult.error ?? new Error("Failed to create seeded purchase");
  }
  scope.purchaseId = String(purchaseResult.data.id ?? "").trim();

  const purchaseItemResult = await admin
    .from("purchase_items")
    .insert({
      purchase_id: scope.purchaseId,
      request_item_id: scope.requestItemId,
      name_human: "Warehouse RPC Chain Material",
      qty: 10,
      uom: "pcs",
      ref_id: "MAT-WAVE2B-CHAIN",
      status: REQUEST_DRAFT_STATUS,
    })
    .select("id")
    .single();
  if (purchaseItemResult.error || !purchaseItemResult.data) {
    throw purchaseItemResult.error ?? new Error("Failed to create seeded purchase item");
  }
  scope.purchaseItemId = String(purchaseItemResult.data.id ?? "").trim();

  const existingIncomingResult = await admin
    .from("wh_incoming")
    .select("id")
    .eq("purchase_id", scope.purchaseId)
    .maybeSingle();
  if (existingIncomingResult.error) throw existingIncomingResult.error;

  if (existingIncomingResult.data?.id) {
    scope.incomingId = String(existingIncomingResult.data.id ?? "").trim();
  } else {
    const incomingResult = await admin
      .from("wh_incoming")
      .insert({
        purchase_id: scope.purchaseId,
        status: "pending",
        qty: 10,
        note: "Warehouse RPC chain seeded incoming",
      })
      .select("id")
      .single();
    if (incomingResult.error || !incomingResult.data) {
      throw incomingResult.error ?? new Error("Failed to create seeded incoming head");
    }
    scope.incomingId = String(incomingResult.data.id ?? "").trim();
  }

  const incomingNormalizeResult = await admin
    .from("wh_incoming")
    .update({
      status: "pending",
      qty: 10,
      note: "Warehouse RPC chain seeded incoming",
      warehouseman_fio: null,
      confirmed_at: null,
    })
    .eq("id", scope.incomingId);
  if (incomingNormalizeResult.error) throw incomingNormalizeResult.error;

  const existingIncomingItemResult = await admin
    .from("wh_incoming_items")
    .select("id")
    .eq("incoming_id", scope.incomingId)
    .eq("purchase_item_id", scope.purchaseItemId)
    .maybeSingle();
  if (existingIncomingItemResult.error) throw existingIncomingItemResult.error;

  if (existingIncomingItemResult.data?.id) {
    scope.incomingItemId = String(existingIncomingItemResult.data.id ?? "").trim();
  } else {
    const incomingItemResult = await admin
      .from("wh_incoming_items")
      .insert({
        incoming_id: scope.incomingId,
        purchase_item_id: scope.purchaseItemId,
        rik_code: "MAT-WAVE2B-CHAIN",
        name_human: "Warehouse RPC Chain Material",
        uom: "pcs",
        qty_expected: 10,
        qty_received: 0,
        note: "Warehouse RPC chain seeded incoming item",
      })
      .select("id")
      .single();
    if (incomingItemResult.error || !incomingItemResult.data) {
      throw incomingItemResult.error ?? new Error("Failed to create seeded incoming item");
    }
    scope.incomingItemId = String(incomingItemResult.data.id ?? "").trim();
  }

  const incomingItemNormalizeResult = await admin
    .from("wh_incoming_items")
    .update({
      purchase_item_id: scope.purchaseItemId,
      rik_code: "MAT-WAVE2B-CHAIN",
      name_human: "Warehouse RPC Chain Material",
      uom: "pcs",
      qty_expected: 10,
      qty_received: 0,
      note: "Warehouse RPC chain seeded incoming item",
    })
    .eq("id", scope.incomingItemId);
  if (incomingItemNormalizeResult.error) throw incomingItemNormalizeResult.error;

  return scope;
}

async function cleanupReceiveSeed(scope: SeedScope) {
  try {
    if (scope.incomingId) {
      await admin.from("wh_moves").delete().eq("incoming_id", scope.incomingId);
    }
  } catch {
    // best-effort cleanup
  }

  try {
    if (scope.incomingId) {
      await admin.from("warehouse_receive_apply_idempotency_v1").delete().eq("incoming_id", scope.incomingId);
    }
  } catch {
    // best-effort cleanup
  }

  try {
    if (scope.incomingItemId) {
      await admin.from("wh_incoming_items").delete().eq("id", scope.incomingItemId);
    }
  } catch {
    // best-effort cleanup
  }

  try {
    if (scope.incomingId) {
      await admin.from("wh_incoming").delete().eq("id", scope.incomingId);
    }
  } catch {
    // best-effort cleanup
  }

  try {
    if (scope.purchaseItemId) {
      await admin.from("purchase_items").delete().eq("id", scope.purchaseItemId);
    }
  } catch {
    // best-effort cleanup
  }

  try {
    if (scope.purchaseId) {
      await admin.from("purchases").delete().eq("id", scope.purchaseId);
    }
  } catch {
    // best-effort cleanup
  }

  try {
    if (scope.requestItemId) {
      await admin.from("request_items").delete().eq("id", scope.requestItemId);
    }
  } catch {
    // best-effort cleanup
  }

  try {
    if (scope.requestId) {
      await admin.from("requests").delete().eq("id", scope.requestId);
    }
  } catch {
    // best-effort cleanup
  }

  try {
    if (scope.companyId) {
      await admin.from("company_invites").delete().eq("company_id", scope.companyId);
    }
  } catch {
    // best-effort cleanup
  }

  try {
    if (scope.companyId) {
      await admin.from("company_members").delete().eq("company_id", scope.companyId);
    }
  } catch {
    // best-effort cleanup
  }

  try {
    if (scope.companyProfileId) {
      await admin.from("company_profiles").delete().eq("id", scope.companyProfileId);
    }
  } catch {
    // best-effort cleanup
  }

  try {
    if (scope.companyId) {
      await admin.from("companies").delete().eq("id", scope.companyId);
    }
  } catch {
    // best-effort cleanup
  }

  await cleanupTempUser(admin, scope.user).catch(() => undefined);
}

describe("applyWarehouseReceive", () => {
  it("passes a stable client mutation id to the warehouse receive RPC", async () => {
    const rpc = jest.fn(async () => ({
      data: { ok: 1, fail: 0, left_after: 0 },
      error: null,
    }));

    const result = await applyWarehouseReceive({
      supabase: { rpc } as never,
      incomingId: "incoming-1",
      items: [{ purchase_item_id: "purchase-item-1", qty: 2 }],
      warehousemanFio: "  Warehouse Tester  ",
      clientMutationId: "wrq-stable-1",
    });

    expect(result.error).toBeNull();
    expect(result.data).toEqual({ ok: 1, fail: 0, left_after: 0 });
    expect(rpc).toHaveBeenCalledWith("wh_receive_apply_ui", {
      p_incoming_id: "incoming-1",
      p_items: [{ purchase_item_id: "purchase-item-1", qty: 2 }],
      p_client_mutation_id: "wrq-stable-1",
      p_warehouseman_fio: "Warehouse Tester",
      p_note: null,
    });
  });

  it("returns a typed validation error when receive RPC response shape is malformed", async () => {
    const rpc = jest.fn(async () => ({
      data: { ok: 1 },
      error: null,
    }));

    const result = await applyWarehouseReceive({
      supabase: { rpc } as never,
      incomingId: "incoming-1",
      items: [{ purchase_item_id: "purchase-item-1", qty: 2 }],
      warehousemanFio: "Warehouse Tester",
      clientMutationId: "wrq-stable-1",
    });

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(RpcValidationError);
    expect(String(result.error?.message)).not.toContain("purchase-item-1");
  });
});

describe("applyWarehouseReceive backend chain", () => {
  it("applies receive through wh_receive_apply_ui without the 42883 mismatch and replays idempotently", async () => {
    const scope = await createReceiveSeed();
    const client = await createWarehouseClient(scope.user as RuntimeTestUser);

    try {
      if (!scope.incomingId || !scope.purchaseItemId || !scope.incomingItemId) {
        throw new Error("Seeded receive scope is incomplete");
      }

      const clientMutationId = `wrpc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const first = await client.rpc("wh_receive_apply_ui", {
        p_incoming_id: scope.incomingId,
        p_items: [{ purchase_item_id: scope.purchaseItemId, qty: 4 }],
        p_client_mutation_id: clientMutationId,
        p_warehouseman_fio: "Warehouse Tester",
        p_note: undefined,
      });

      expect(first.error).toBeNull();
      expect(first.data as ReceiveApplyResult).toMatchObject({
        ok: 1,
        fail: 0,
        left_after: 1,
        client_mutation_id: clientMutationId,
        idempotent_replay: false,
      });

      const firstLineState = await admin
        .from("wh_incoming_items")
        .select("qty_received")
        .eq("id", scope.incomingItemId)
        .single();
      expect(firstLineState.error).toBeNull();
      expect(Number(firstLineState.data?.qty_received ?? 0)).toBe(4);

      const firstMoves = await admin
        .from("wh_moves")
        .select("move_id", { count: "exact", head: true })
        .eq("incoming_id", scope.incomingId);
      expect(firstMoves.error).toBeNull();
      expect(firstMoves.count ?? 0).toBe(1);

      const replay = await client.rpc("wh_receive_apply_ui", {
        p_incoming_id: scope.incomingId,
        p_items: [{ purchase_item_id: scope.purchaseItemId, qty: 4 }],
        p_client_mutation_id: clientMutationId,
        p_warehouseman_fio: "Warehouse Tester",
        p_note: undefined,
      });

      expect(replay.error).toBeNull();
      expect(replay.data as ReceiveApplyResult).toMatchObject({
        ok: 1,
        fail: 0,
        left_after: 1,
        client_mutation_id: clientMutationId,
        idempotent_replay: true,
      });

      const replayLineState = await admin
        .from("wh_incoming_items")
        .select("qty_received")
        .eq("id", scope.incomingItemId)
        .single();
      expect(replayLineState.error).toBeNull();
      expect(Number(replayLineState.data?.qty_received ?? 0)).toBe(4);

      const replayMoves = await admin
        .from("wh_moves")
        .select("move_id", { count: "exact", head: true })
        .eq("incoming_id", scope.incomingId);
      expect(replayMoves.error).toBeNull();
      expect(replayMoves.count ?? 0).toBe(1);
    } finally {
      await client.auth.signOut().catch(() => undefined);
      await cleanupReceiveSeed(scope);
    }
  });

  it("keeps invalid receive payload behavior deterministic instead of surfacing 42883", async () => {
    const scope = await createReceiveSeed();
    const client = await createWarehouseClient(scope.user as RuntimeTestUser);

    try {
      if (!scope.incomingId || !scope.incomingItemId) {
        throw new Error("Seeded receive scope is incomplete");
      }

      const response = await client.rpc("wh_receive_apply_ui", {
        p_incoming_id: scope.incomingId,
        p_items: [{ purchase_item_id: crypto.randomUUID(), qty: 1 }],
        p_client_mutation_id: `wrpc-invalid-${Date.now().toString(36)}`,
        p_warehouseman_fio: "Warehouse Tester",
        p_note: undefined,
      });

      expect(response.error).not.toBeNull();
      expect(String(response.error?.code ?? "")).not.toBe("42883");
      expect(String(response.error?.message ?? "")).toContain("wh_receive_apply_ui_item_not_found");

      const lineState = await admin
        .from("wh_incoming_items")
        .select("qty_received")
        .eq("id", scope.incomingItemId)
        .single();
      expect(lineState.error).toBeNull();
      expect(Number(lineState.data?.qty_received ?? 0)).toBe(0);
    } finally {
      await client.auth.signOut().catch(() => undefined);
      await cleanupReceiveSeed(scope);
    }
  });
});
