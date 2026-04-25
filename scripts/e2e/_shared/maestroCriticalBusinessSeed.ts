import { randomUUID } from "node:crypto";

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

type AccountantSeed = {
  requestId: string;
  requestItemId: string;
  proposalId: string;
  proposalItemId: string;
  supplier: string;
  invoiceNumber: string;
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

type ChatSeed = {
  listingId: string;
  listingTitle: string;
  messageText: string;
};

type ContractorSeed = {
  contractorId: string;
  subcontractId: string;
  requestId: string;
  requestItemId: string;
  purchaseId: string;
  purchaseItemId: string;
  progressId: string;
  workItemId: string;
  workItemToken: string;
  contractorOrg: string;
  workName: string;
};

type SeedUsers = {
  owner: RuntimeTestUser;
  buyer: RuntimeTestUser;
  accountant: RuntimeTestUser;
  warehouse: RuntimeTestUser;
  foreman: RuntimeTestUser;
  contractor: RuntimeTestUser;
};

export type MaestroCriticalBusinessSeed = {
  admin: AdminClient;
  marker: string;
  companyId: string;
  companyProfileId: string;
  users: SeedUsers;
  buyer: BuyerSeed;
  director: DirectorSeed;
  accountant: AccountantSeed;
  warehouse: WarehouseSeed;
  foreman: ForemanSeed;
  chat: ChatSeed;
  contractor: ContractorSeed;
  env: Record<string, string>;
  cleanup: () => Promise<void>;
};

const BUYER_APPROVED_STATUS = "\u0423\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u043e";
const ACCOUNTANT_TO_PAY_TAB = "\u041a \u043e\u043f\u043b\u0430\u0442\u0435";
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
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
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

const rpcEnvelopeRows = (value: unknown): Record<string, unknown>[] => {
  if (!value || typeof value !== "object") return [];
  const rows = (value as { rows?: unknown }).rows;
  return Array.isArray(rows)
    ? rows.filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
    : [];
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

async function seedAccountantPayableProposal(
  admin: AdminClient,
  params: {
    marker: string;
    accountantClient: AuthenticatedClient;
  },
) {
  const supplier = `E2E Accountant Supplier ${params.marker}`;
  const invoiceNumber = `INV-${params.marker}`;
  const requestInsert = await admin
    .from("requests")
    .insert({
      status: MUTABLE_REQUEST_STATUS,
      comment: `${params.marker}:request`,
      object_name: supplier,
      note: params.marker,
    })
    .select("id")
    .single();
  if (requestInsert.error) throw requestInsert.error;
  const requestId = toText(requestInsert.data?.id);

  const proposalInsert = await admin
    .from("proposals")
    .insert({
      request_id: requestId,
      status: MUTABLE_REQUEST_STATUS,
      supplier,
      invoice_number: invoiceNumber,
      invoice_date: new Date().toISOString().slice(0, 10),
      invoice_currency: "KGS",
      sent_to_accountant_at: null,
    })
    .select("id")
    .single();
  if (proposalInsert.error) throw proposalInsert.error;
  const proposalId = toText(proposalInsert.data?.id);

  const requestItemInsert = await admin
    .from("request_items")
    .insert({
      request_id: requestId,
      name_human: `Accountant ${params.marker}`,
      qty: 1,
      uom: "pcs",
      rik_code: `MAT-ACC-${params.marker}`,
      status: MUTABLE_REQUEST_STATUS,
    })
    .select("id")
    .single();
  if (requestItemInsert.error) throw requestItemInsert.error;
  const requestItemId = toText(requestItemInsert.data?.id);

  const proposalItemInsert = await admin
    .from("proposal_items")
    .insert({
      proposal_id: proposalId,
      proposal_id_text: proposalId,
      request_item_id: requestItemId,
      name_human: `Accountant ${params.marker}`,
      qty: 1,
      uom: "pcs",
      price: 125,
      rik_code: `MAT-ACC-${params.marker}`,
      supplier,
      status: BUYER_APPROVED_STATUS,
    })
    .select("id")
    .single();
  if (proposalItemInsert.error) throw proposalItemInsert.error;
  const proposalItemId = toText(proposalItemInsert.data?.id);

  const decisionTimestamp = new Date().toISOString();
  const promote = await admin
    .from("proposals")
    .update({
      status: BUYER_APPROVED_STATUS,
      submitted_at: decisionTimestamp,
      approved_at: decisionTimestamp,
      decided_at: decisionTimestamp,
      sent_to_accountant_at: decisionTimestamp,
    })
    .eq("id", proposalId);
  if (promote.error) throw promote.error;

  const accountantScope = await params.accountantClient.rpc("accountant_inbox_scope_v1" as never, {
    p_tab: ACCOUNTANT_TO_PAY_TAB,
    p_offset: 0,
    p_limit: 40,
  } as never);
  if (accountantScope.error) throw accountantScope.error;
  const matched = rpcEnvelopeRows(accountantScope.data).some(
    (row) => toText(row.proposal_id) === proposalId || JSON.stringify(row).includes(proposalId),
  );
  if (!matched) {
    throw new Error(`Seeded accountant proposal ${proposalId} was not visible in accountant_inbox_scope_v1.`);
  }

  return {
    requestId,
    requestItemId,
    proposalId,
    proposalItemId,
    supplier,
    invoiceNumber,
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

async function seedContractorProgressFlow(
  admin: AdminClient,
  params: {
    marker: string;
    user: RuntimeTestUser;
  },
) {
  const contractorOrg = `E2E Contractor ${params.marker}`;
  const contractorInn = `12345678${params.marker.slice(-4).replace(/\D/g, "7").padEnd(4, "7")}`;
  const objectName = `E2E Object ${params.marker}`;
  const workName = `E2E Work ${params.marker}`;

  const contractorInsert = await admin
    .from("contractors")
    .insert({
      user_id: params.user.id,
      full_name: params.user.displayLabel,
      company_name: contractorOrg,
      phone: "+996555000111",
      email: params.user.email,
      inn: contractorInn,
    })
    .select("id")
    .single();
  if (contractorInsert.error) throw contractorInsert.error;
  const contractorId = toText(contractorInsert.data?.id);

  const subcontractInsert = await admin
    .from("subcontracts")
    .insert({
      created_by: params.user.id,
      status: "approved",
      foreman_name: "Maestro Critical Foreman",
      contractor_org: contractorOrg,
      contractor_inn: contractorInn,
      contractor_rep: "Maestro Critical Contractor",
      contractor_phone: "+996555000111",
      contract_number: `CTR-${params.marker}`,
      contract_date: new Date().toISOString().slice(0, 10),
      object_name: objectName,
      work_zone: "Zone A",
      work_type: workName,
      qty_planned: 1,
      uom: "pcs",
      date_start: new Date().toISOString().slice(0, 10),
      date_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      work_mode: "labor_only",
      price_per_unit: 100,
      total_price: 100,
      price_type: "by_volume",
      foreman_comment: "Maestro critical contractor seed",
      approved_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (subcontractInsert.error) throw subcontractInsert.error;
  const subcontractId = toText(subcontractInsert.data?.id);

  const requestInsert = await admin
    .from("requests")
    .insert({
      created_by: params.user.id,
      role: "foreman",
      name: workName,
      object_name: objectName,
      subcontract_id: subcontractId,
      contractor_job_id: subcontractId,
      company_name_snapshot: contractorOrg,
      company_inn_snapshot: contractorInn,
      status: MUTABLE_REQUEST_STATUS,
      date: new Date().toISOString().slice(0, 10),
    })
    .select("id")
    .single();
  if (requestInsert.error) throw requestInsert.error;
  const requestId = toText(requestInsert.data?.id);

  const requestItemInsert = await admin
    .from("request_items")
    .insert({
      request_id: requestId,
      name_human: workName,
      qty: 1,
      rik_code: `CTR-WORK-${params.marker}`,
      uom: "pcs",
      row_no: 1,
      position_order: 1,
      kind: "work",
      status: BUYER_APPROVED_STATUS,
    })
    .select("id")
    .single();
  if (requestItemInsert.error) throw requestItemInsert.error;
  const requestItemId = toText(requestItemInsert.data?.id);

  await finalizeSeedRequestStatus(admin, {
    requestId,
    requestStatus: BUYER_APPROVED_STATUS as RequestStatus,
    submittedBy: params.user.id,
  });

  const purchaseInsert = await admin
    .from("purchases")
    .insert({
      created_by: params.user.id,
      request_id: requestId,
      object_name: objectName,
      supplier: contractorOrg,
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
      name_human: workName,
      qty: 1,
      uom: "pcs",
      price_per_unit: 100,
      status: PURCHASE_ITEM_STATUS_DRAFT,
    })
    .select("id")
    .single();
  if (purchaseItemInsert.error) throw purchaseItemInsert.error;
  const purchaseItemId = toText(purchaseItemInsert.data?.id);

  const progressId = randomUUID();
  const workProgressInsert = await admin
    .from("work_progress")
    .insert({
      id: progressId,
      purchase_item_id: purchaseItemId,
      contractor_id: contractorId,
      contractor_name: contractorOrg,
      qty_planned: 1,
      qty_done: 0,
      qty_left: 1,
      status: "active",
      uom: "pcs",
      work_dt: new Date().toISOString().slice(0, 10),
      location: objectName,
    })
    .select("id")
    .single();
  if (workProgressInsert.error) throw workProgressInsert.error;

  let workItemId = `progress:${progressId}`;
  let visible = false;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const scope = await admin.rpc("contractor_inbox_scope_v1" as never, {
      p_my_contractor_id: contractorId,
      p_is_staff: false,
    } as never);
    if (scope.error) throw scope.error;
    const rows = rpcEnvelopeRows(scope.data);
    const matched =
      rows.find(
        (row) =>
          toText(row.progressId ?? row.progress_id) === progressId ||
          toText(row.workItemId ?? row.work_item_id) === workItemId ||
          JSON.stringify(row).includes(progressId),
      ) ?? null;
    if (matched) {
      workItemId = toText(matched.workItemId ?? matched.work_item_id) || workItemId;
      visible = true;
      break;
    }
    await sleep(500);
  }
  if (!visible) {
    throw new Error(`Seeded contractor progress ${progressId} was not visible in contractor_inbox_scope_v1.`);
  }

  return {
    contractorId,
    subcontractId,
    requestId,
    requestItemId,
    purchaseId,
    purchaseItemId,
    progressId,
    workItemId,
    workItemToken: toSelectorToken(workItemId),
    contractorOrg,
    workName,
  };
}

async function seedMarketplaceChatFlow(
  admin: AdminClient,
  params: {
    marker: string;
    user: RuntimeTestUser;
    companyId: string;
  },
) {
  const listingTitle = `E2E Chat Listing ${params.marker}`;
  const messageText = `E2E chat ping ${params.marker}`;
  const listingRikCode = FOREMAN_EXPECTED_CODE;
  const insertResult = await admin
    .from("market_listings")
    .insert({
      title: listingTitle,
      description: `Deterministic chat listing ${params.marker}`,
      status: "active",
      side: "offer",
      kind: "material",
      city: "Bishkek",
      lat: 42.8746,
      lng: 74.5698,
      price: 777,
      currency: "KGS",
      rik_code: listingRikCode,
      uom: "pcs",
      uom_code: "pcs",
      company_id: params.companyId,
      user_id: params.user.id,
      contacts_phone: "+996555000222",
      contacts_whatsapp: "+996555000222",
      contacts_email: params.user.email,
      items_json: [
        {
          rik_code: listingRikCode,
          name: listingTitle,
          uom: "pcs",
          qty: 1,
          price: 777,
          kind: "material",
          city: "Bishkek",
        },
      ],
    })
    .select("id")
    .single();
  if (insertResult.error) throw insertResult.error;

  return {
    listingId: toText(insertResult.data?.id),
    listingTitle,
    messageText,
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
  accountant: AccountantSeed;
  warehouse: WarehouseSeed;
  foreman: ForemanSeed;
  chat: ChatSeed;
  contractor: ContractorSeed;
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
  E2E_ACCOUNTANT_EMAIL: params.users.accountant.email,
  E2E_ACCOUNTANT_PASSWORD: params.users.accountant.password,
  E2E_ACCOUNTANT_FIO: "MaestroAccountant",
  E2E_ACCOUNTANT_PROPOSAL_ID: params.accountant.proposalId,
  E2E_ACCOUNTANT_SUPPLIER: params.accountant.supplier,
  E2E_ACCOUNTANT_INVOICE_NUMBER: params.accountant.invoiceNumber,
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
  E2E_CHAT_EMAIL: params.users.buyer.email,
  E2E_CHAT_PASSWORD: params.users.buyer.password,
  E2E_CHAT_LISTING_ID: params.chat.listingId,
  E2E_CHAT_LISTING_TITLE: params.chat.listingTitle,
  E2E_CHAT_MESSAGE: params.chat.messageText,
  E2E_CONTRACTOR_EMAIL: params.users.contractor.email,
  E2E_CONTRACTOR_PASSWORD: params.users.contractor.password,
  E2E_CONTRACTOR_WORK_ITEM_ID: params.contractor.workItemId,
  E2E_CONTRACTOR_WORK_ITEM_TOKEN: params.contractor.workItemToken,
  E2E_CONTRACTOR_PROGRESS_ID: params.contractor.progressId,
  E2E_CONTRACTOR_WORK_NAME: params.contractor.workName,
  E2E_CONTRACTOR_ORG: params.contractor.contractorOrg,
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
    | "requests"
    | "work_progress"
    | "subcontracts"
    | "contractors",
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
  const createdMarketListings: string[] = [];
  const createdWorkProgress: string[] = [];
  const createdSubcontracts: string[] = [];
  const createdContractors: string[] = [];

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
  const accountant = await createTempUser(admin, {
    role: "accountant",
    fullName: "Maestro Critical Accountant",
    emailPrefix: "maestro-critical-accountant",
    userProfile: { usage_build: true },
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
  const contractor = await createTempUser(admin, {
    role: "foreman",
    fullName: "Maestro Critical Contractor",
    emailPrefix: "maestro-critical-contractor",
    userProfile: { usage_build: true, is_contractor: true },
  });

  const users: SeedUsers = {
    owner,
    buyer,
    accountant,
    warehouse,
    foreman,
    contractor,
  };
  const buyerClient = await signInRuntimeUser(buyer, "maestro-critical-buyer-seed");
  const accountantClient = await signInRuntimeUser(accountant, "maestro-critical-accountant-seed");

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
      userId: accountant.id,
      role: "accountant",
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
    attachCompanyMember(admin, {
      companyId: officeCompany.companyId,
      userId: contractor.id,
      role: "contractor",
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

  const accountantSeed = await seedAccountantPayableProposal(admin, {
    marker,
    accountantClient,
  });
  createdRequests.push(accountantSeed.requestId);
  createdRequestItems.push(accountantSeed.requestItemId);
  createdProposals.push(accountantSeed.proposalId);

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

  const chatSeed = await seedMarketplaceChatFlow(admin, {
    marker,
    user: buyer,
    companyId: officeCompany.companyId,
  });
  createdMarketListings.push(chatSeed.listingId);

  const contractorSeed = await seedContractorProgressFlow(admin, {
    marker,
    user: contractor,
  });
  createdRequests.push(contractorSeed.requestId);
  createdRequestItems.push(contractorSeed.requestItemId);
  createdPurchases.push(contractorSeed.purchaseId);
  createdPurchaseItems.push(contractorSeed.purchaseItemId);
  createdWorkProgress.push(contractorSeed.progressId);
  createdSubcontracts.push(contractorSeed.subcontractId);
  createdContractors.push(contractorSeed.contractorId);

  const cleanup = async () => {
    try {
      if (createdMarketListings.length > 0) {
        await admin.from("chat_messages" as never).delete().in("supplier_id", createdMarketListings as never);
      }
    } catch {
      // best effort cleanup
    }
    try {
      if (createdMarketListings.length > 0) {
        await admin.from("market_listings").delete().in("id", createdMarketListings as never);
      }
    } catch {
      // best effort cleanup
    }
    try {
      if (createdWorkProgress.length > 0) {
        const logs = await admin
          .from("work_progress_log")
          .select("id")
          .in("progress_id", createdWorkProgress as never);
        if (!logs.error) {
          const logIds = (logs.data ?? [])
            .map((row) => toText((row as { id?: unknown }).id))
            .filter(Boolean);
          if (logIds.length > 0) {
            await admin.from("work_progress_log_materials").delete().in("log_id", logIds as never);
          }
        }
      }
    } catch {
      // best effort cleanup
    }
    try {
      if (createdWorkProgress.length > 0) {
        await admin.from("work_progress_log").delete().in("progress_id", createdWorkProgress as never);
      }
    } catch {
      // best effort cleanup
    }
    try {
      await cleanupById(admin, "work_progress", createdWorkProgress);
    } catch {
      // best effort cleanup
    }
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
      await cleanupById(admin, "subcontracts", createdSubcontracts);
    } catch {
      // best effort cleanup
    }
    try {
      await cleanupById(admin, "contractors", createdContractors);
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
    await accountantClient.auth.signOut().catch(() => undefined);
    await cleanupTempUser(admin, contractor).catch(() => undefined);
    await cleanupTempUser(admin, accountant).catch(() => undefined);
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
    accountant: accountantSeed,
    warehouse: warehouseSeed,
    foreman: foremanSeed,
    chat: chatSeed,
    contractor: contractorSeed,
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
    accountant: accountantSeed,
    warehouse: warehouseSeed,
    foreman: foremanSeed,
    chat: chatSeed,
    contractor: contractorSeed,
    env,
    cleanup,
  };
}
