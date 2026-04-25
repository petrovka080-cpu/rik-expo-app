import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../../src/lib/database.types";
import { resolveForemanContext } from "../../../src/screens/foreman/foreman.context.resolver";
import { adaptFormContext } from "../../../src/screens/foreman/foreman.locator.adapter";
import {
  getForemanLevelOptions,
  getForemanObjectOptions,
  getForemanZoneOptions,
} from "../../../src/screens/foreman/foreman.options";
import {
  cleanupTempUser,
  createTempUser,
  createVerifierAdmin,
  type RuntimeTestUser,
} from "../../_shared/testUserDiscipline";

type AdminClient = SupabaseClient<Database>;
type AuthenticatedClient = SupabaseClient<Database>;
type RequestInsert = Database["public"]["Tables"]["requests"]["Insert"];
type RequestStatus = NonNullable<RequestInsert["status"]>;
type ProposalSubmitResponse = {
  proposals?: Array<{
    proposal_id?: unknown;
  }>;
};

type RefOption = {
  code: string;
  name: string;
};

type BuyerSeed = {
  rfqRequestId: string;
  rfqRequestItemId: string;
  proposalRequestId: string;
  proposalRequestItemId: string;
  proposalId: string;
};

type DirectorSeed = {
  proposalRequestId: string;
  proposalRequestItemId: string;
  proposalId: string;
};

type WarehouseSeed = {
  requestId: string;
  requestItemId: string;
  purchaseId: string;
  purchaseItemId: string;
  incomingId: string;
};

type ForemanSeed = {
  objectCode: string;
  locatorCode: string;
};

type SeedUsers = {
  owner: RuntimeTestUser;
  buyer: RuntimeTestUser;
  warehouse: RuntimeTestUser;
  foreman: RuntimeTestUser;
};

export type MaestroCriticalBusinessSeed = {
  admin: AdminClient;
  marker: string;
  companyId: string;
  companyProfileId: string;
  users: SeedUsers;
  buyer: BuyerSeed;
  director: DirectorSeed;
  warehouse: WarehouseSeed;
  foreman: ForemanSeed;
  env: Record<string, string>;
  cleanup: () => Promise<void>;
};

const BUYER_APPROVED_STATUS = "\u0423\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u043e";
const FOREMAN_AI_PROMPT = "rebar 12 mm 10 pcs";
const FOREMAN_EXPECTED_CODE = "MAT-REBAR-A500-12";
const PURCHASE_STATUS_APPROVED = "\u0423\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u043e";
const PURCHASE_ITEM_STATUS_DRAFT = "\u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A";

const toText = (value: unknown) => String(value ?? "").trim();
const toSelectorToken = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const buildMarker = () =>
  `MCRIT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
const supabaseUrl = toText(process.env.EXPO_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = toText(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
const MUTABLE_REQUEST_STATUS = "\u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A" as RequestStatus;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY for Maestro E2E seed.");
}

const isMutableRequestStatus = (status: RequestStatus) => {
  const normalized = toText(status).toLowerCase();
  return normalized === "" || normalized === "draft" || normalized === "\u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A";
};

const toRefOptions = (
  rows: Array<Record<string, unknown>>,
  includeEmpty: boolean,
): RefOption[] => {
  const mapped = rows
    .map((row) => ({
      code: toText(row.code),
      name: toText(row.name_ru) || toText(row.name) || toText(row.code),
    }))
    .filter((row) => row.code && row.name);
  return includeEmpty ? [{ code: "", name: "--" }, ...mapped] : mapped;
};

async function fetchDictRows(
  admin: AdminClient,
  table: "ref_object_types" | "ref_levels" | "ref_systems" | "ref_zones",
  orderColumn: string,
  selectColumns: string,
  fallbackColumns: string,
) {
  const first = await admin.from(table).select(selectColumns).order(orderColumn);
  if (!first.error) return first;

  const message = toText(first.error.message).toLowerCase();
  if (!message.includes("name_ru")) return first;
  return await admin.from(table).select(fallbackColumns).order(orderColumn);
}

async function resolveWarehouseVisibleStatus(admin: AdminClient) {
  const inbox = await admin.rpc("warehouse_issue_queue_scope_v4" as never, {
    p_offset: 0,
    p_limit: 1,
  } as never);
  if (inbox.error) throw inbox.error;

  const root = (inbox.data ?? {}) as { rows?: Array<{ request_id?: unknown }> };
  const requestId = toText(root.rows?.[0]?.request_id);
  if (!requestId) {
    throw new Error("Unable to resolve a warehouse-visible request status probe.");
  }

  const request = await admin.from("requests").select("status").eq("id", requestId).single();
  if (request.error) throw request.error;

  const status = toText(request.data?.status);
  if (!status) {
    throw new Error("Warehouse-visible request status probe returned an empty status.");
  }
  return status as RequestStatus;
}

async function insertCompany(admin: AdminClient, owner: RuntimeTestUser, marker: string) {
  const companyName = `Maestro Critical ${marker}`;
  const companyInsert = await admin
    .from("companies")
    .insert({
      owner_user_id: owner.id,
      name: companyName,
      city: "Bishkek",
      address: "Maestro critical seed",
      phone_main: "+996555000000",
      email: owner.email,
      about_short: "Deterministic Maestro seed company",
    })
    .select("id")
    .single();
  if (companyInsert.error) throw companyInsert.error;

  const companyId = toText(companyInsert.data?.id);
  if (!companyId) throw new Error("Seeded company id is empty.");

  const profileInsert = await admin.from("company_profiles").insert({
    id: companyId,
    user_id: owner.id,
    owner_user_id: owner.id,
    name: companyName,
    phone: "+996555000000",
    email: owner.email,
  });
  if (profileInsert.error) throw profileInsert.error;

  return {
    companyId,
    companyProfileId: companyId,
  };
}

async function attachCompanyMember(
  admin: AdminClient,
  params: { companyId: string; userId: string; role: string },
) {
  const membership = await admin.from("company_members").upsert(
    {
      company_id: params.companyId,
      user_id: params.userId,
      role: params.role,
    },
    { onConflict: "company_id,user_id" },
  );
  if (membership.error) throw membership.error;
}

async function finalizeSeedRequestStatus(
  admin: AdminClient,
  params: {
    requestId: string;
    requestStatus: RequestStatus;
    submittedBy?: string | null;
  },
) {
  if (isMutableRequestStatus(params.requestStatus)) {
    return;
  }

  const submissionTimestamp = new Date().toISOString();
  const update = await admin
    .from("requests")
    .update({
      status: params.requestStatus,
      submitted_at: submissionTimestamp,
      submitted_by: params.submittedBy ?? null,
    })
    .eq("id", params.requestId);
  if (update.error) throw update.error;
}

async function finalizeApprovedProposal(
  admin: AdminClient,
  params: {
    proposalId: string;
  },
) {
  const decisionTimestamp = new Date().toISOString();
  const update = await admin
    .from("proposals")
    .update({
      status: BUYER_APPROVED_STATUS,
      submitted_at: decisionTimestamp,
      approved_at: decisionTimestamp,
      decided_at: decisionTimestamp,
    })
    .eq("id", params.proposalId);
  if (update.error) throw update.error;
}

async function finalizePendingProposal(
  admin: AdminClient,
  params: {
    proposalId: string;
  },
) {
  const submissionTimestamp = new Date().toISOString();
  const update = await admin
    .from("proposals")
    .update({
      status: "На утверждении",
      submitted_at: submissionTimestamp,
      approved_at: null,
      decided_at: null,
      sent_to_accountant_at: null,
    })
    .eq("id", params.proposalId);
  if (update.error) throw update.error;
}

function createRuntimeUserClient(clientInfo: string): AuthenticatedClient {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        "x-client-info": clientInfo,
      },
    },
  });
}

async function signInRuntimeUser(
  user: RuntimeTestUser,
  clientInfo: string,
): Promise<AuthenticatedClient> {
  const runtimeClient = createRuntimeUserClient(clientInfo);
  const signIn = await runtimeClient.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (signIn.error || !signIn.data.session) {
    throw signIn.error ?? new Error(`signInWithPassword returned no session for ${user.email}`);
  }
  return runtimeClient;
}

async function submitSeedProposal(
  buyerClient: AuthenticatedClient,
  params: {
    marker: string;
    user: RuntimeTestUser;
    requestId: string;
    requestItemId: string;
  },
) {
  const proposalSubmit = await buyerClient.rpc("rpc_proposal_submit_v3" as never, {
    p_client_mutation_id: `maestro-critical-${params.marker.toLowerCase()}-proposal`,
    p_buckets: [
      {
        supplier: `E2E Supplier ${params.marker}`,
        request_item_ids: [params.requestItemId],
        meta: [
          {
            request_item_id: params.requestItemId,
            price: "123",
            supplier: `E2E Supplier ${params.marker}`,
            note: params.marker,
          },
        ],
      },
    ],
    p_buyer_fio: params.user.displayLabel,
    p_submit: true,
    p_request_item_status: null,
    p_request_id: params.requestId,
  } as never);
  if (proposalSubmit.error) throw proposalSubmit.error;

  const proposalId = toText(
    ((proposalSubmit.data ?? {}) as ProposalSubmitResponse).proposals?.[0]?.proposal_id,
  );
  if (!proposalId) {
    throw new Error("Seeded buyer proposal submit returned an empty proposal id.");
  }

  return {
    proposalId,
  };
}

async function seedBuyerRfqRequest(
  admin: AdminClient,
  params: {
    marker: string;
    user: RuntimeTestUser;
    requestStatus: RequestStatus;
  },
) {
  const requestInsert = await admin
    .from("requests")
    .insert({
      status: MUTABLE_REQUEST_STATUS,
      display_no: `REQ-${params.marker}-BUY-RFQ/2026`,
      object_name: `Buyer RFQ ${params.marker}`,
      note: `Buyer RFQ ${params.marker}`,
      created_by: params.user.id,
      requested_by: params.user.displayLabel,
    })
    .select("id")
    .single();
  if (requestInsert.error) throw requestInsert.error;

  const requestId = toText(requestInsert.data?.id);
  const requestItemInsert = await admin
    .from("request_items")
    .insert({
      request_id: requestId,
      name_human: `Buyer RFQ ${params.marker}`,
      qty: 1,
      uom: "pcs",
      rik_code: `MAT-BUY-RFQ-${params.marker}`,
      status: "approved",
      kind: "material",
      note: params.marker,
    })
    .select("id")
    .single();
  if (requestItemInsert.error) throw requestItemInsert.error;

  await finalizeSeedRequestStatus(admin, {
    requestId,
    requestStatus: params.requestStatus,
    submittedBy: params.user.id,
  });

  return {
    requestId,
    requestItemId: toText(requestItemInsert.data?.id),
  };
}

async function seedBuyerProposalReview(
  admin: AdminClient,
  buyerClient: AuthenticatedClient,
  params: {
    marker: string;
    user: RuntimeTestUser;
    requestStatus: RequestStatus;
  },
) {
  const requestInsert = await admin
    .from("requests")
    .insert({
      status: MUTABLE_REQUEST_STATUS,
      display_no: `REQ-${params.marker}-BUY-PROP/2026`,
      object_name: `Buyer Proposal ${params.marker}`,
      note: `Buyer Proposal ${params.marker}`,
      created_by: params.user.id,
      requested_by: params.user.displayLabel,
    })
    .select("id")
    .single();
  if (requestInsert.error) throw requestInsert.error;
  const requestId = toText(requestInsert.data?.id);

  const requestItemInsert = await admin
    .from("request_items")
    .insert({
      request_id: requestId,
      name_human: `Buyer Proposal ${params.marker}`,
      qty: 2,
      uom: "pcs",
      rik_code: `MAT-BUY-PROP-${params.marker}`,
      status: "approved",
      kind: "material",
      note: params.marker,
    })
    .select("id")
    .single();
  if (requestItemInsert.error) throw requestItemInsert.error;
  const requestItemId = toText(requestItemInsert.data?.id);

  await finalizeSeedRequestStatus(admin, {
    requestId,
    requestStatus: params.requestStatus,
    submittedBy: params.user.id,
  });

  const proposalSeed = await submitSeedProposal(buyerClient, {
    marker: params.marker,
    user: params.user,
    requestId,
    requestItemId,
  });

  const proposalId = proposalSeed.proposalId;

  await finalizeApprovedProposal(admin, {
    proposalId,
  });

  return {
    requestId,
    requestItemId,
    proposalId,
  };
}

async function seedDirectorPendingProposal(
  admin: AdminClient,
  buyerClient: AuthenticatedClient,
  params: {
    marker: string;
    user: RuntimeTestUser;
    requestStatus: RequestStatus;
  },
) {
  const requestInsert = await admin
    .from("requests")
    .insert({
      status: MUTABLE_REQUEST_STATUS,
      display_no: `REQ-${params.marker}-DIR-PROP/2026`,
      object_name: `Director Proposal ${params.marker}`,
      note: `Director Proposal ${params.marker}`,
      created_by: params.user.id,
      requested_by: params.user.displayLabel,
    })
    .select("id")
    .single();
  if (requestInsert.error) throw requestInsert.error;
  const requestId = toText(requestInsert.data?.id);

  const requestItemInsert = await admin
    .from("request_items")
    .insert({
      request_id: requestId,
      name_human: `Director Proposal ${params.marker}`,
      qty: 1,
      uom: "pcs",
      rik_code: `MAT-DIR-PROP-${params.marker}`,
      status: "approved",
      kind: "material",
      note: params.marker,
    })
    .select("id")
    .single();
  if (requestItemInsert.error) throw requestItemInsert.error;
  const requestItemId = toText(requestItemInsert.data?.id);

  await finalizeSeedRequestStatus(admin, {
    requestId,
    requestStatus: params.requestStatus,
    submittedBy: params.user.id,
  });

  const proposalSeed = await submitSeedProposal(buyerClient, {
    marker: `${params.marker}-director`,
    user: params.user,
    requestId,
    requestItemId,
  });

  const proposalId = proposalSeed.proposalId;

  await finalizePendingProposal(admin, {
    proposalId,
  });

  return {
    requestId,
    requestItemId,
    proposalId,
  };
}

async function seedWarehouseBusinessFlow(
  admin: AdminClient,
  params: {
    marker: string;
    requestStatus: RequestStatus;
  },
) {
  const requestInsert = await admin
    .from("requests")
    .insert({
      status: MUTABLE_REQUEST_STATUS,
      display_no: `REQ-${params.marker}-WH/2026`,
      object_name: `Warehouse ${params.marker}`,
      note: `Warehouse ${params.marker}`,
    })
    .select("id")
    .single();
  if (requestInsert.error) throw requestInsert.error;
  const requestId = toText(requestInsert.data?.id);

  const requestItemInsert = await admin
    .from("request_items")
    .insert({
      request_id: requestId,
      name_human: `Warehouse ${params.marker}`,
      qty: 3,
      uom: "\u0448\u0442",
      rik_code: `MAT-WH-${params.marker}`,
      status: "approved",
      kind: "material",
      note: params.marker,
    })
    .select("id")
    .single();
  if (requestItemInsert.error) throw requestItemInsert.error;
  const requestItemId = toText(requestItemInsert.data?.id);

  await finalizeSeedRequestStatus(admin, {
    requestId,
    requestStatus: params.requestStatus,
  });

  const purchaseInsert = await admin
    .from("purchases")
    .insert({
      request_id: requestId,
      po_no: `PO-${params.marker}/2026`,
      supplier: `Warehouse Supplier ${params.marker}`,
      currency: "KGS",
      status: PURCHASE_STATUS_APPROVED,
    })
    .select("id")
    .single();
  if (purchaseInsert.error) throw purchaseInsert.error;
  const purchaseId = toText(purchaseInsert.data?.id);

  const purchaseItemInsert = await admin
    .from("purchase_items")
    .insert({
      purchase_id: purchaseId,
      request_item_id: requestItemId,
      name_human: `Warehouse ${params.marker}`,
      qty: 3,
      uom: "\u0448\u0442",
      status: PURCHASE_ITEM_STATUS_DRAFT,
    })
    .select("id")
    .single();
  if (purchaseItemInsert.error) throw purchaseItemInsert.error;
  const purchaseItemId = toText(purchaseItemInsert.data?.id);

  const existingIncoming = await admin
    .from("wh_incoming")
    .select("id")
    .eq("purchase_id", purchaseId)
    .maybeSingle();
  if (existingIncoming.error) throw existingIncoming.error;

  let incomingId = toText(existingIncoming.data?.id);
  if (!incomingId) {
    const incomingInsert = await admin
      .from("wh_incoming")
      .insert({
        purchase_id: purchaseId,
        qty: 3,
        status: "pending",
        note: params.marker,
      })
      .select("id")
      .single();
    if (incomingInsert.error) throw incomingInsert.error;
    incomingId = toText(incomingInsert.data?.id);
  }

  const existingIncomingItem = await admin
    .from("wh_incoming_items")
    .select("id")
    .eq("incoming_id", incomingId)
    .eq("purchase_item_id", purchaseItemId)
    .maybeSingle();
  if (existingIncomingItem.error) throw existingIncomingItem.error;

  if (!toText(existingIncomingItem.data?.id)) {
    const incomingItemInsert = await admin.from("wh_incoming_items").insert({
      incoming_id: incomingId,
      purchase_item_id: purchaseItemId,
      qty_expected: 3,
      qty_received: 0,
      rik_code: `MAT-WH-${params.marker}`,
      name_human: `Warehouse ${params.marker}`,
      uom: "\u0448\u0442",
    });
    if (incomingItemInsert.error) throw incomingItemInsert.error;
  }

  return {
    requestId,
    requestItemId,
    purchaseId,
    purchaseItemId,
    incomingId,
  };
}

async function resolveForemanHeaderSeed(admin: AdminClient): Promise<ForemanSeed> {
  const [objects, levels, zones] = await Promise.all([
    fetchDictRows(admin, "ref_object_types", "name", "code,name,name_ru", "code,name"),
    fetchDictRows(admin, "ref_levels", "sort", "code,name,name_ru,sort", "code,name,sort"),
    fetchDictRows(admin, "ref_zones", "name", "code,name,name_ru", "code,name"),
  ]);

  if (objects.error) throw objects.error;
  if (levels.error) throw levels.error;
  if (zones.error) throw zones.error;

  const objectOptions = getForemanObjectOptions(
    toRefOptions((objects.data ?? []) as unknown as Array<Record<string, unknown>>, false),
  );
  const levelOptions = getForemanLevelOptions(
    toRefOptions((levels.data ?? []) as unknown as Array<Record<string, unknown>>, true),
  );
  const zoneOptions = getForemanZoneOptions(
    toRefOptions((zones.data ?? []) as unknown as Array<Record<string, unknown>>, true),
  );

  const objectOption = objectOptions.find((option) => option.code);
  if (!objectOption) {
    throw new Error("Unable to resolve a selectable Foreman object option.");
  }

  const formUi = adaptFormContext(
    resolveForemanContext(objectOption.code, objectOption.name),
    levelOptions,
    zoneOptions,
  );
  const locatorOption = formUi.locator.options.find((option) => option.code);

  return {
    objectCode: objectOption.code,
    locatorCode: locatorOption?.code ?? "",
  };
}

const buildCriticalEnv = (params: {
  users: SeedUsers;
  buyer: BuyerSeed;
  director: DirectorSeed;
  warehouse: WarehouseSeed;
  foreman: ForemanSeed;
}) => ({
  E2E_AUTH_EMAIL: params.users.buyer.email,
  E2E_AUTH_PASSWORD: params.users.buyer.password,
  E2E_BUYER_EMAIL: params.users.buyer.email,
  E2E_BUYER_PASSWORD: params.users.buyer.password,
  E2E_BUYER_FIO: "MaestroBuyer",
  E2E_BUYER_RFQ_REQUEST_ID: params.buyer.rfqRequestId,
  E2E_BUYER_RFQ_ITEM_ID: params.buyer.rfqRequestItemId,
  E2E_BUYER_RFQ_CITY: "Bishkek",
  E2E_BUYER_RFQ_PHONE: "555123123",
  E2E_BUYER_PROPOSAL_ID: params.buyer.proposalId,
  E2E_BUYER_PROPOSAL_REQUEST_ID: params.buyer.proposalRequestId,
  E2E_BUYER_PROPOSAL_ITEM_ID: params.buyer.proposalRequestItemId,
  E2E_DIRECTOR_EMAIL: params.users.owner.email,
  E2E_DIRECTOR_PASSWORD: params.users.owner.password,
  E2E_DIRECTOR_FIO: "MaestroDirector",
  E2E_DIRECTOR_PROPOSAL_ID: params.director.proposalId,
  E2E_DIRECTOR_PROPOSAL_REQUEST_ID: params.director.proposalRequestId,
  E2E_DIRECTOR_PROPOSAL_ITEM_ID: params.director.proposalRequestItemId,
  E2E_WAREHOUSE_EMAIL: params.users.warehouse.email,
  E2E_WAREHOUSE_PASSWORD: params.users.warehouse.password,
  E2E_WAREHOUSE_FIO: "MaestroWarehouse",
  E2E_WAREHOUSE_RECIPIENT: "Maestro Recipient",
  E2E_WAREHOUSE_REQUEST_ID: params.warehouse.requestId,
  E2E_WAREHOUSE_REQUEST_ITEM_ID: params.warehouse.requestItemId,
  E2E_WAREHOUSE_INCOMING_ID: params.warehouse.incomingId,
  E2E_WAREHOUSE_PURCHASE_ITEM_ID: params.warehouse.purchaseItemId,
  E2E_WAREHOUSE_RECEIVE_QTY: "3",
  E2E_WAREHOUSE_ISSUE_QTY: "2",
  E2E_FOREMAN_EMAIL: params.users.foreman.email,
  E2E_FOREMAN_PASSWORD: params.users.foreman.password,
  E2E_FOREMAN_FIO: "MaestroForeman",
  E2E_FOREMAN_OBJECT_CODE: params.foreman.objectCode,
  E2E_FOREMAN_OBJECT_CODE_TOKEN: toSelectorToken(params.foreman.objectCode),
  E2E_FOREMAN_LOCATOR_CODE: params.foreman.locatorCode,
  E2E_FOREMAN_LOCATOR_CODE_TOKEN: toSelectorToken(params.foreman.locatorCode),
  E2E_FOREMAN_AI_PROMPT: FOREMAN_AI_PROMPT,
  E2E_FOREMAN_EXPECTED_CODE: FOREMAN_EXPECTED_CODE,
  E2E_FOREMAN_EXPECTED_CODE_TOKEN: toSelectorToken(FOREMAN_EXPECTED_CODE),
});

async function cleanupById(
  admin: AdminClient,
  table:
    | "wh_incoming_items"
    | "wh_incoming"
    | "purchase_items"
    | "purchases"
    | "proposal_items"
    | "proposals"
    | "request_items"
    | "requests",
  ids: string[],
) {
  const uniqueIds = Array.from(new Set(ids.map((value) => toText(value)).filter(Boolean)));
  if (uniqueIds.length === 0) return;
  await admin.from(table).delete().in("id", uniqueIds as never);
}

export async function createMaestroCriticalBusinessSeed(): Promise<MaestroCriticalBusinessSeed> {
  const admin = createVerifierAdmin("maestro-critical-business-seed") as AdminClient;
  const marker = buildMarker();

  const createdRequests: string[] = [];
  const createdRequestItems: string[] = [];
  const createdProposals: string[] = [];
  const createdPurchases: string[] = [];
  const createdPurchaseItems: string[] = [];
  const createdIncomingHeads: string[] = [];

  const owner = await createTempUser(admin, {
    role: "director",
    fullName: "Maestro Critical Owner",
    emailPrefix: "maestro-critical-owner",
    userProfile: { usage_build: true },
  });
  const buyer = await createTempUser(admin, {
    role: "buyer",
    fullName: "Maestro Critical Buyer",
    emailPrefix: "maestro-critical-buyer",
    userProfile: { usage_build: true, usage_market: true },
  });
  const warehouse = await createTempUser(admin, {
    role: "warehouse",
    fullName: "Maestro Critical Warehouse",
    emailPrefix: "maestro-critical-warehouse",
    userProfile: { usage_build: true },
  });
  const foreman = await createTempUser(admin, {
    role: "foreman",
    fullName: "Maestro Critical Foreman",
    emailPrefix: "maestro-critical-foreman",
    userProfile: { usage_build: true },
  });

  const users: SeedUsers = {
    owner,
    buyer,
    warehouse,
    foreman,
  };
  const buyerClient = await signInRuntimeUser(buyer, "maestro-critical-buyer-seed");

  const officeCompany = await insertCompany(admin, owner, marker);
  await attachCompanyMember(admin, {
    companyId: officeCompany.companyId,
    userId: owner.id,
    role: "director",
  });
  await Promise.all([
    attachCompanyMember(admin, {
      companyId: officeCompany.companyId,
      userId: buyer.id,
      role: "buyer",
    }),
    attachCompanyMember(admin, {
      companyId: officeCompany.companyId,
      userId: warehouse.id,
      role: "warehouse",
    }),
    attachCompanyMember(admin, {
      companyId: officeCompany.companyId,
      userId: foreman.id,
      role: "foreman",
    }),
  ]);

  const requestStatus = await resolveWarehouseVisibleStatus(admin);

  const buyerRfq = await seedBuyerRfqRequest(admin, {
    marker,
    user: buyer,
    requestStatus,
  });
  createdRequests.push(buyerRfq.requestId);
  createdRequestItems.push(buyerRfq.requestItemId);

  const buyerProposal = await seedBuyerProposalReview(admin, buyerClient, {
    marker,
    user: buyer,
    requestStatus,
  });
  createdRequests.push(buyerProposal.requestId);
  createdRequestItems.push(buyerProposal.requestItemId);
  createdProposals.push(buyerProposal.proposalId);

  const directorProposal = await seedDirectorPendingProposal(admin, buyerClient, {
    marker,
    user: buyer,
    requestStatus,
  });
  createdRequests.push(directorProposal.requestId);
  createdRequestItems.push(directorProposal.requestItemId);
  createdProposals.push(directorProposal.proposalId);

  const warehouseSeed = await seedWarehouseBusinessFlow(admin, {
    marker,
    requestStatus,
  });
  createdRequests.push(warehouseSeed.requestId);
  createdRequestItems.push(warehouseSeed.requestItemId);
  createdPurchases.push(warehouseSeed.purchaseId);
  createdPurchaseItems.push(warehouseSeed.purchaseItemId);
  createdIncomingHeads.push(warehouseSeed.incomingId);

  const foremanSeed = await resolveForemanHeaderSeed(admin);

  const cleanup = async () => {
    try {
      if (createdIncomingHeads.length > 0) {
        await admin.from("wh_incoming_items").delete().in("incoming_id", createdIncomingHeads as never);
      }
    } catch {
      // best effort cleanup
    }
    try {
      await cleanupById(admin, "wh_incoming", createdIncomingHeads);
    } catch {
      // best effort cleanup
    }
    try {
      await cleanupById(admin, "purchase_items", createdPurchaseItems);
    } catch {
      // best effort cleanup
    }
    try {
      await cleanupById(admin, "purchases", createdPurchases);
    } catch {
      // best effort cleanup
    }
    try {
      if (createdProposals.length > 0) {
        await admin.from("proposal_items").delete().in("proposal_id", createdProposals as never);
      }
    } catch {
      // best effort cleanup
    }
    try {
      await cleanupById(admin, "proposals", createdProposals);
    } catch {
      // best effort cleanup
    }
    try {
      await cleanupById(admin, "request_items", createdRequestItems);
    } catch {
      // best effort cleanup
    }
    try {
      await cleanupById(admin, "requests", createdRequests);
    } catch {
      // best effort cleanup
    }
    try {
      await admin.from("company_invites").delete().eq("company_id", officeCompany.companyId);
    } catch {
      // best effort cleanup
    }
    try {
      await admin.from("company_members").delete().eq("company_id", officeCompany.companyId);
    } catch {
      // best effort cleanup
    }
    try {
      await admin.from("company_profiles").delete().eq("id", officeCompany.companyProfileId);
    } catch {
      // best effort cleanup
    }
    try {
      await admin.from("companies").delete().eq("id", officeCompany.companyId);
    } catch {
      // best effort cleanup
    }
    await buyerClient.auth.signOut().catch(() => undefined);
    await cleanupTempUser(admin, foreman).catch(() => undefined);
    await cleanupTempUser(admin, warehouse).catch(() => undefined);
    await cleanupTempUser(admin, buyer).catch(() => undefined);
    await cleanupTempUser(admin, owner).catch(() => undefined);
  };

  const env = buildCriticalEnv({
    users,
    buyer: {
      rfqRequestId: buyerRfq.requestId,
      rfqRequestItemId: buyerRfq.requestItemId,
      proposalRequestId: buyerProposal.requestId,
      proposalRequestItemId: buyerProposal.requestItemId,
      proposalId: buyerProposal.proposalId,
    },
    director: {
      proposalRequestId: directorProposal.requestId,
      proposalRequestItemId: directorProposal.requestItemId,
      proposalId: directorProposal.proposalId,
    },
    warehouse: warehouseSeed,
    foreman: foremanSeed,
  });

  return {
    admin,
    marker,
    companyId: officeCompany.companyId,
    companyProfileId: officeCompany.companyProfileId,
    users,
    buyer: {
      rfqRequestId: buyerRfq.requestId,
      rfqRequestItemId: buyerRfq.requestItemId,
      proposalRequestId: buyerProposal.requestId,
      proposalRequestItemId: buyerProposal.requestItemId,
      proposalId: buyerProposal.proposalId,
    },
    director: {
      proposalRequestId: directorProposal.requestId,
      proposalRequestItemId: directorProposal.requestItemId,
      proposalId: directorProposal.proposalId,
    },
    warehouse: warehouseSeed,
    foreman: foremanSeed,
    env,
    cleanup,
  };
}
