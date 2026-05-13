import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

import { REQUEST_DRAFT_STATUS } from "../../src/lib/api/requests.status";
import type { Database } from "../../src/lib/database.types";
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

const previousMigrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260424153000_warehouse_receive_item_v2_return_contract_fix.sql",
);
const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260425061500_wh_receive_item_v2_search_path_fix.sql",
);

const previousSource = fs.readFileSync(previousMigrationPath, "utf8");
const source = fs.readFileSync(migrationPath, "utf8");

const admin = createVerifierAdmin("warehouse-receive-item-v2-search-path-test");

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

function extractWhReceiveItemDefinition(input: string) {
  const match = input.match(
    /create or replace function public\.wh_receive_item_v2\([\s\S]*?\n\$\$;/i,
  );
  if (!match) {
    throw new Error("Could not find public.wh_receive_item_v2 definition");
  }
  return match[0];
}

function normalizeSql(input: string) {
  return input.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
}

function stripSearchPathClause(input: string) {
  return input.replace(/\r\n/g, "\n").replace(/\nset search_path = ''\n/i, "\n");
}

function normalizeEquivalentWarehouseStrings(input: string) {
  return input
    .replace(
      /raise exception (?:U&'[^']+'|'[^']+')/g,
      "raise exception '__WAREHOUSE_INCOMING_ITEM_NOT_FOUND__'",
    )
    .replace(
      /coalesce\(p_note, (?:U&'[^']+'|'[^']+')\)/g,
      "coalesce(p_note, '__WAREHOUSE_RECEIVE_ITEM_V2_NOTE__')",
    );
}

async function createWarehouseClient(user: RuntimeTestUser) {
  const client = createClient<Database>(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        "x-client-info": "warehouse-receive-item-v2-search-path-test-client",
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
    fullName: "Warehouse Search Path Tester",
    emailPrefix: "warehouse-search-path",
    profile: { role: "warehouse" },
    userProfile: { usage_build: true },
    appMetadata: { role: "warehouse" },
  });

  const companyName = `Warehouse Search Path ${Date.now().toString(36).toUpperCase()}`;
  const companyResult = await admin
    .from("companies")
    .insert({
      owner_user_id: scope.user.id,
      name: companyName,
      city: "Bishkek",
      address: "Warehouse search_path proof",
      phone_main: "+996555000001",
      email: scope.user.email,
      about_short: "Warehouse search_path proof company",
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
    phone: "+996555000001",
    email: scope.user.email,
  });
  if (companyProfileResult.error) throw companyProfileResult.error;

  const requestResult = await admin
    .from("requests")
    .insert({
      status: REQUEST_DRAFT_STATUS,
      created_by: scope.user.id,
      requested_by: scope.user.displayLabel,
      comment: "Warehouse search_path seeded request",
      object_name: "Warehouse search_path object",
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
      name_human: "Warehouse Search Path Material",
      qty: 10,
      uom: "pcs",
      rik_code: "MAT-SQL001-WH",
      status: "approved",
      kind: "material",
      note: "Warehouse search_path seeded request item",
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
      supplier: "Warehouse Search Path Supplier",
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
      name_human: "Warehouse Search Path Material",
      qty: 10,
      uom: "pcs",
      ref_id: "MAT-SQL001-WH",
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
        note: "Warehouse search_path seeded incoming",
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
      note: "Warehouse search_path seeded incoming",
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
        rik_code: "MAT-SQL001-WH",
        name_human: "Warehouse Search Path Material",
        uom: "pcs",
        qty_expected: 10,
        qty_received: 0,
        note: "Warehouse search_path seeded incoming item",
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
      rik_code: "MAT-SQL001-WH",
      name_human: "Warehouse Search Path Material",
      uom: "pcs",
      qty_expected: 10,
      qty_received: 0,
      note: "Warehouse search_path seeded incoming item",
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

describe("wh_receive_item_v2 search_path hardening migration", () => {
  it("pins only the canonical warehouse receive item function", () => {
    expect(source.match(/create or replace function public\.wh_receive_item_v2/gi)).toHaveLength(1);
    expect(source).toContain("security definer");
    expect(source).toContain("set search_path = ''");
    expect(source.match(/set search_path = ''/g)).toHaveLength(1);
    expect(source).toContain("returns table(");
    expect(source).toContain("incoming_status text");
    expect(source).not.toContain("create or replace function public.wh_receive_apply_ui");
    expect(source).not.toContain("set search_path = public");
  });

  it("keeps the active signature, return contract, and body logic byte-for-byte except the search_path clause", () => {
    const previousDefinition = extractWhReceiveItemDefinition(previousSource);
    const hardenedDefinition = extractWhReceiveItemDefinition(source);

    expect(normalizeSql(normalizeEquivalentWarehouseStrings(stripSearchPathClause(hardenedDefinition)))).toBe(
      normalizeSql(normalizeEquivalentWarehouseStrings(previousDefinition)),
    );
  });

  it("keeps warehouse receive dependencies schema-qualified and reloads PostgREST schema", () => {
    for (const snippet of [
      "from public.wh_incoming_items wii",
      "from public.wh_incoming where id = v_incoming_id",
      "update public.wh_incoming_items wii",
      "update public.wh_incoming wi",
      "join public.purchase_items pi on pi.id = wii.purchase_item_id",
      "join public.purchases pu on pu.id = pi.purchase_id",
      "left join public.request_items ri on ri.id = pi.request_item_id",
      "insert into public.wh_moves(",
      "notify pgrst, 'reload schema'",
    ]) {
      expect(source).toContain(snippet);
    }
  });

  it("keeps warehouse receive happy path working and leaves the wrapper return contract intact", async () => {
    const scope = await createReceiveSeed();
    const client = await createWarehouseClient(scope.user as RuntimeTestUser);

    try {
      if (!scope.incomingId || !scope.purchaseItemId || !scope.incomingItemId) {
        throw new Error("Seeded receive scope is incomplete");
      }

      const clientMutationId = `sql001-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const response = await client.rpc("wh_receive_apply_ui", {
        p_incoming_id: scope.incomingId,
        p_items: [{ purchase_item_id: scope.purchaseItemId, qty: 4 }],
        p_client_mutation_id: clientMutationId,
        p_warehouseman_fio: "Warehouse Search Path Tester",
        p_note: "SQL_001 hardening proof",
      });

      expect(response.error).toBeNull();
      expect(response.data as ReceiveApplyResult).toMatchObject({
        ok: 1,
        fail: 0,
        left_after: 1,
        client_mutation_id: clientMutationId,
        idempotent_replay: false,
      });

      const lineState = await admin
        .from("wh_incoming_items")
        .select("qty_received")
        .eq("id", scope.incomingItemId)
        .single();
      expect(lineState.error).toBeNull();
      expect(Number(lineState.data?.qty_received ?? 0)).toBe(4);

      const headState = await admin
        .from("wh_incoming")
        .select("status, confirmed_at")
        .eq("id", scope.incomingId)
        .single();
      expect(headState.error).toBeNull();
      expect(String(headState.data?.status ?? "")).toBe("pending");
      expect(headState.data?.confirmed_at ?? null).toBeNull();

      const moves = await admin
        .from("wh_moves")
        .select("move_id, qty, direction, note")
        .eq("incoming_id", scope.incomingId);
      expect(moves.error).toBeNull();
      expect(moves.data ?? []).toHaveLength(1);
      expect(moves.data?.[0]).toMatchObject({
        qty: 4,
        direction: "in",
      });
      expect(String(moves.data?.[0]?.note ?? "").trim().length).toBeGreaterThan(0);
    } finally {
      await client.auth.signOut().catch(() => undefined);
      await cleanupReceiveSeed(scope);
    }
  });
});
