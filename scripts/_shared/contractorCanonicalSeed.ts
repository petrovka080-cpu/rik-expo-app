import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createTempUser, cleanupTempUser, createVerifierAdmin, type RuntimeTestUser } from "./testUserDiscipline";
import { poll } from "./webRuntimeHarness";

type AdminClient = SupabaseClient;

type RefNameSeed = {
  code: string;
  name: string;
};

type ReferenceSeeds = {
  objectType: RefNameSeed | null;
  system: RefNameSeed | null;
  zone: RefNameSeed | null;
  level: RefNameSeed | null;
};

export type ContractorScenarioSeed = {
  key: string;
  sourceKind:
    | "buyer_subcontract"
    | "foreman_subcontract_request"
    | "foreman_material_request"
    | "invalid_missing_contractor"
    | "invalid_material_only";
  requestId: string | null;
  subcontractId: string | null;
  workItemId: string | null;
  workName: string;
  objectName: string;
  materialTitle: string | null;
  warehouseIssueExpected: boolean;
};

export type ContractorCanonicalSeedContext = {
  admin: AdminClient;
  contractorUser: RuntimeTestUser;
  buyerUser: RuntimeTestUser;
  foremanUser: RuntimeTestUser;
  contractorRecord: {
    id: string;
    companyName: string;
    inn: string;
    phone: string;
    email: string;
  };
  refs: ReferenceSeeds;
  scenarios: ContractorScenarioSeed[];
};

type CleanupState = {
  warehouseIssueItemIds: string[];
  warehouseIssueIds: string[];
  workProgressIds: string[];
  purchaseItemIds: string[];
  purchaseIds: string[];
  requestItemIds: string[];
  requestIds: string[];
  subcontractIds: string[];
  contractorId: string | null;
};

const cleanupStateByContractorId = new Map<string, CleanupState>();

const ensureClient = (admin?: AdminClient): AdminClient =>
  admin ?? createVerifierAdmin("contractor-canonical-seed");

const trimText = (value: unknown): string | null => {
  const normalized = String(value ?? "").trim();
  return normalized || null;
};

const readRefSeed = async (admin: AdminClient, table: string): Promise<RefNameSeed | null> => {
  const { data, error } = await admin.from(table).select("*").limit(1);
  if (error || !Array.isArray(data) || !data[0]) return null;
  const row = data[0] as Record<string, unknown>;
  const code = trimText(row.code);
  const name =
    trimText(row.display_name) ??
    trimText(row.name_human_ru) ??
    trimText(row.name_ru) ??
    trimText(row.name) ??
    code;
  if (!code || !name) return null;
  return { code, name };
};

const fetchReferenceSeeds = async (admin: AdminClient): Promise<ReferenceSeeds> => {
  const [objectType, system, zone, level] = await Promise.all([
    readRefSeed(admin, "ref_object_types"),
    readRefSeed(admin, "ref_systems"),
    readRefSeed(admin, "ref_zones"),
    readRefSeed(admin, "ref_levels"),
  ]);
  return { objectType, system, zone, level };
};

const createCleanupState = (): CleanupState => ({
  warehouseIssueItemIds: [],
  warehouseIssueIds: [],
  workProgressIds: [],
  purchaseItemIds: [],
  purchaseIds: [],
  requestItemIds: [],
  requestIds: [],
  subcontractIds: [],
  contractorId: null,
});

const remember = <K extends keyof CleanupState>(state: CleanupState, key: K, value: string | null) => {
  if (!value) return;
  if (Array.isArray(state[key])) {
    (state[key] as string[]).push(value);
  }
};

const insertContractorRecord = async (
  admin: AdminClient,
  user: RuntimeTestUser,
  suffix: string,
  cleanup: CleanupState,
) => {
  const companyName = `Runtime Contractor ${suffix}`;
  const inn = `12345678${suffix.slice(-4).replace(/\D/g, "7").padEnd(4, "7")}`;
  const phone = "+996555000111";
  const email = `${user.email}`;
  const { data, error } = await admin
    .from("contractors")
    .insert({
      user_id: user.id,
      full_name: user.displayLabel,
      company_name: companyName,
      phone,
      email,
      inn,
    })
    .select("id")
    .single();
  if (error) throw error;
  cleanup.contractorId = String(data.id);
  cleanupStateByContractorId.set(cleanup.contractorId, cleanup);
  return {
    id: cleanup.contractorId,
    companyName,
    inn,
    phone,
    email,
  };
};

const createRequest = async (
  admin: AdminClient,
  params: {
    createdBy: string;
    role: "buyer" | "foreman";
    name: string;
    objectName: string;
    subcontractId?: string | null;
    contractorJobId?: string | null;
    contractorCompanyName?: string | null;
    contractorInn?: string | null;
    refs: ReferenceSeeds;
  },
  cleanup: CleanupState,
) => {
  const { data, error } = await admin
    .from("requests")
    .insert({
      created_by: params.createdBy,
      role: params.role,
      name: params.name,
      object_name: params.objectName,
      status: "Утверждено",
      submitted_at: new Date().toISOString(),
      date: new Date().toISOString().slice(0, 10),
      subcontract_id: params.subcontractId ?? null,
      contractor_job_id: params.contractorJobId ?? null,
      company_name_snapshot: params.contractorCompanyName ?? null,
      company_inn_snapshot: params.contractorInn ?? null,
      object_type_code: params.refs.objectType?.code ?? null,
      system_code: params.refs.system?.code ?? null,
      zone_code: params.refs.zone?.code ?? null,
      level_code: params.refs.level?.code ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  const requestId = String(data.id);
  remember(cleanup, "requestIds", requestId);
  return requestId;
};

const createRequestItem = async (
  admin: AdminClient,
  params: {
    requestId: string;
    rowNo: number;
    nameHuman: string;
    rikCode: string;
    qty: number;
    uom: string;
    kind: "material" | "service" | "work";
  },
  cleanup: CleanupState,
) => {
  const { data, error } = await admin
    .from("request_items")
    .insert({
      request_id: params.requestId,
      row_no: params.rowNo,
      position_order: params.rowNo,
      name_human: params.nameHuman,
      rik_code: params.rikCode,
      qty: params.qty,
      uom: params.uom,
      kind: params.kind,
      item_kind: params.kind,
    })
    .select("id")
    .single();
  if (error) throw error;
  const requestItemId = String(data.id);
  remember(cleanup, "requestItemIds", requestItemId);
  return requestItemId;
};

const createPurchasePipeline = async (
  admin: AdminClient,
  params: {
    createdBy: string;
    requestId: string;
    requestItemId: string;
    objectName: string;
    supplier: string;
    itemName: string;
    uom: string;
    qty: number;
    unitPrice: number;
  },
  cleanup: CleanupState,
) => {
  const purchaseResult = await admin
    .from("purchases")
    .insert({
      created_by: params.createdBy,
      request_id: params.requestId,
      object_name: params.objectName,
      supplier: params.supplier,
      currency: "KGS",
    })
    .select("id")
    .single();
  if (purchaseResult.error) throw purchaseResult.error;
  const purchaseId = String(purchaseResult.data.id);
  remember(cleanup, "purchaseIds", purchaseId);

  const purchaseItemResult = await admin
    .from("purchase_items")
    .insert({
      purchase_id: purchaseId,
      request_item_id: params.requestItemId,
      name_human: params.itemName,
      qty: params.qty,
      uom: params.uom,
      price_per_unit: params.unitPrice,
      price: params.unitPrice,
    })
    .select("id")
    .single();
  if (purchaseItemResult.error) throw purchaseItemResult.error;
  const purchaseItemId = String(purchaseItemResult.data.id);
  remember(cleanup, "purchaseItemIds", purchaseItemId);
  return { purchaseId, purchaseItemId };
};

const createWorkProgress = async (
  admin: AdminClient,
  params: {
    purchaseItemId: string;
    contractorId: string | null;
    contractorName: string | null;
    qtyPlanned: number;
    uom: string;
    location: string;
  },
  cleanup: CleanupState,
) => {
  const progressId = randomUUID();
  const { error } = await admin.from("work_progress").insert({
    id: progressId,
    purchase_item_id: params.purchaseItemId,
    contractor_id: params.contractorId,
    contractor_name: params.contractorName,
    qty_planned: params.qtyPlanned,
    qty_done: 0,
    qty_left: params.qtyPlanned,
    status: "active",
    uom: params.uom,
    work_dt: new Date().toISOString().slice(0, 10),
    location: params.location,
  });
  if (error) throw error;
  remember(cleanup, "workProgressIds", progressId);
  return progressId;
};

const createWarehouseIssue = async (
  admin: AdminClient,
  params: {
    requestId: string;
    requestItemId: string;
    objectName: string;
    workName: string;
    rikCode: string;
    uom: string;
    qty: number;
    baseNo: string;
  },
  cleanup: CleanupState,
) => {
  const issueResult = await admin
    .from("warehouse_issues")
    .insert({
      request_id: params.requestId,
      base_no: params.baseNo,
      no: params.baseNo,
      iss_date: new Date().toISOString().slice(0, 10),
      qty: params.qty,
      uom: params.uom,
      who: "Runtime Warehouse",
      status: "Подтверждено",
      object_name: params.objectName,
      work_name: params.workName,
    })
    .select("id")
    .single();
  if (issueResult.error) throw issueResult.error;
  const issueId = String(issueResult.data.id);
  remember(cleanup, "warehouseIssueIds", issueId);

  const issueItemResult = await admin
    .from("warehouse_issue_items")
    .insert({
      issue_id: issueId,
      request_item_id: params.requestItemId,
      rik_code: params.rikCode,
      uom_id: params.uom,
      qty: params.qty,
    })
    .select("id")
    .single();
  if (issueItemResult.error) throw issueItemResult.error;
  remember(cleanup, "warehouseIssueItemIds", String(issueItemResult.data.id));
};

const createApprovedSubcontract = async (
  admin: AdminClient,
  params: {
    createdBy: string;
    contractorOrg: string;
    contractorInn: string;
    objectName: string;
    workType: string;
    contractNumber: string;
    workZone: string;
    qty: number;
    uom: string;
    totalPrice: number;
  },
  cleanup: CleanupState,
) => {
  const { data, error } = await admin
    .from("subcontracts")
    .insert({
      created_by: params.createdBy,
      status: "approved",
      foreman_name: "Runtime Foreman",
      contractor_org: params.contractorOrg,
      contractor_inn: params.contractorInn,
      contractor_rep: "Runtime Rep",
      contractor_phone: "+996555000111",
      contract_number: params.contractNumber,
      contract_date: new Date().toISOString().slice(0, 10),
      object_name: params.objectName,
      work_zone: params.workZone,
      work_type: params.workType,
      qty_planned: params.qty,
      uom: params.uom,
      date_start: new Date().toISOString().slice(0, 10),
      date_end: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      work_mode: "labor_only",
      price_per_unit: params.totalPrice / params.qty,
      total_price: params.totalPrice,
      price_type: "by_volume",
      approved_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw error;
  const subcontractId = String(data.id);
  remember(cleanup, "subcontractIds", subcontractId);
  return subcontractId;
};

export async function seedContractorCanonicalScenarios(adminInput?: AdminClient): Promise<ContractorCanonicalSeedContext> {
  const admin = ensureClient(adminInput);
  const cleanup = createCleanupState();
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

  const contractorUser = await createTempUser(admin, {
    role: "foreman",
    fullName: `Contractor Canonical ${suffix}`,
    emailPrefix: "contractor.canonical",
    userProfile: { is_contractor: true },
  });
  const buyerUser = await createTempUser(admin, {
    role: "buyer",
    fullName: `Buyer Canonical ${suffix}`,
    emailPrefix: "buyer.canonical",
  });
  const foremanUser = await createTempUser(admin, {
    role: "foreman",
    fullName: `Foreman Canonical ${suffix}`,
    emailPrefix: "foreman.canonical",
  });

  const refs = await fetchReferenceSeeds(admin);
  const contractorRecord = await insertContractorRecord(admin, contractorUser, suffix, cleanup);

  const scenarios: ContractorScenarioSeed[] = [];

  const buyerObjectName = `ЖК Север ${suffix}`;
  const buyerWorkName = `Фасадные работы ${suffix}`;
  const buyerSubcontractId = await createApprovedSubcontract(
    admin,
    {
      createdBy: buyerUser.id,
      contractorOrg: contractorRecord.companyName,
      contractorInn: contractorRecord.inn,
      objectName: buyerObjectName,
      workType: buyerWorkName,
      contractNumber: `CTR-BUY-${suffix.toUpperCase()}`,
      workZone: refs.zone?.name ?? "Зона 1",
      qty: 10,
      uom: "м2",
      totalPrice: 25000,
    },
    cleanup,
  );
  const buyerRequestId = await createRequest(
    admin,
    {
      createdBy: buyerUser.id,
      role: "buyer",
      name: buyerWorkName,
      objectName: buyerObjectName,
      subcontractId: buyerSubcontractId,
      contractorJobId: buyerSubcontractId,
      contractorCompanyName: contractorRecord.companyName,
      contractorInn: contractorRecord.inn,
      refs,
    },
    cleanup,
  );
  const buyerMaterialTitle = `Грунтовка ${suffix}`;
  const buyerMaterialCode = `MAT-BUY-${suffix.toUpperCase()}`;
  const buyerMaterialRequestItemId = await createRequestItem(
    admin,
    {
      requestId: buyerRequestId,
      rowNo: 1,
      nameHuman: buyerMaterialTitle,
      rikCode: buyerMaterialCode,
      qty: 12,
      uom: "л",
      kind: "material",
    },
    cleanup,
  );

  scenarios.push({
    key: "buyer_subcontract",
    sourceKind: "buyer_subcontract",
    requestId: buyerRequestId,
    subcontractId: buyerSubcontractId,
    workItemId: null,
    workName: buyerWorkName,
    objectName: buyerObjectName,
    materialTitle: buyerMaterialTitle,
    warehouseIssueExpected: false,
  });

  const foremanObjectName = `Блок B ${suffix}`;
  const foremanWorkName = `Монтаж перегородок ${suffix}`;
  const foremanSubcontractId = await createApprovedSubcontract(
    admin,
    {
      createdBy: foremanUser.id,
      contractorOrg: contractorRecord.companyName,
      contractorInn: contractorRecord.inn,
      objectName: foremanObjectName,
      workType: foremanWorkName,
      contractNumber: `CTR-FOR-${suffix.toUpperCase()}`,
      workZone: refs.zone?.name ?? "Зона 2",
      qty: 5,
      uom: "усл",
      totalPrice: 18000,
    },
    cleanup,
  );
  const foremanRequestId = await createRequest(
    admin,
    {
      createdBy: foremanUser.id,
      role: "foreman",
      name: foremanWorkName,
      objectName: foremanObjectName,
      subcontractId: foremanSubcontractId,
      contractorJobId: foremanSubcontractId,
      contractorCompanyName: contractorRecord.companyName,
      contractorInn: contractorRecord.inn,
      refs,
    },
    cleanup,
  );
  scenarios.push({
    key: "foreman_subcontract_request",
    sourceKind: "foreman_subcontract_request",
    requestId: foremanRequestId,
    subcontractId: foremanSubcontractId,
    workItemId: null,
    workName: foremanWorkName,
    objectName: foremanObjectName,
    materialTitle: null,
    warehouseIssueExpected: false,
  });

  const materialsObjectName = `Секция C ${suffix}`;
  const materialsWorkName = `Отделка узла ${suffix}`;
  const materialsRequestId = await createRequest(
    admin,
    {
      createdBy: foremanUser.id,
      role: "foreman",
      name: materialsWorkName,
      objectName: materialsObjectName,
      contractorCompanyName: contractorRecord.companyName,
      contractorInn: contractorRecord.inn,
      refs,
    },
    cleanup,
  );
  const materialsRequestItemId = await createRequestItem(
    admin,
    {
      requestId: materialsRequestId,
      rowNo: 1,
      nameHuman: materialsWorkName,
      rikCode: `WRK-FRM-${suffix.toUpperCase()}`,
      qty: 3,
      uom: "усл",
      kind: "service",
    },
    cleanup,
  );
  const materialsPurchase = await createPurchasePipeline(
    admin,
    {
      createdBy: foremanUser.id,
      requestId: materialsRequestId,
      requestItemId: materialsRequestItemId,
      objectName: materialsObjectName,
      supplier: contractorRecord.companyName,
      itemName: materialsWorkName,
      uom: "усл",
      qty: 3,
      unitPrice: 9000,
    },
    cleanup,
  );
  await createWorkProgress(
    admin,
    {
      purchaseItemId: materialsPurchase.purchaseItemId,
      contractorId: contractorRecord.id,
      contractorName: contractorRecord.companyName,
      qtyPlanned: 3,
      uom: "усл",
      location: materialsObjectName,
    },
    cleanup,
  );
  scenarios.push({
    key: "foreman_material_request",
    sourceKind: "foreman_material_request",
    requestId: materialsRequestId,
    subcontractId: null,
    workItemId: null,
    workName: materialsWorkName,
    objectName: materialsObjectName,
    materialTitle: null,
    warehouseIssueExpected: false,
  });

  const invalidWorkName = `Невалидная работа ${suffix}`;
  const invalidRequestId = await createRequest(
    admin,
    {
      createdBy: foremanUser.id,
      role: "foreman",
      name: invalidWorkName,
      objectName: `Объект D ${suffix}`,
      refs,
    },
    cleanup,
  );
  const invalidRequestItemId = await createRequestItem(
    admin,
    {
      requestId: invalidRequestId,
      rowNo: 1,
      nameHuman: invalidWorkName,
      rikCode: `WRK-INV-${suffix.toUpperCase()}`,
      qty: 2,
      uom: "усл",
      kind: "service",
    },
    cleanup,
  );
  const invalidPurchase = await createPurchasePipeline(
    admin,
    {
      createdBy: foremanUser.id,
      requestId: invalidRequestId,
      requestItemId: invalidRequestItemId,
      objectName: `Объект D ${suffix}`,
      supplier: "Unknown Supplier",
      itemName: invalidWorkName,
      uom: "усл",
      qty: 2,
      unitPrice: 7000,
    },
    cleanup,
  );
  await createWorkProgress(
    admin,
    {
      purchaseItemId: invalidPurchase.purchaseItemId,
      contractorId: null,
      contractorName: null,
      qtyPlanned: 2,
      uom: "усл",
      location: `Объект D ${suffix}`,
    },
    cleanup,
  );
  scenarios.push({
    key: "invalid_missing_contractor",
    sourceKind: "invalid_missing_contractor",
    requestId: invalidRequestId,
    subcontractId: null,
    workItemId: null,
    workName: invalidWorkName,
    objectName: `Объект D ${suffix}`,
    materialTitle: null,
    warehouseIssueExpected: false,
  });

  const leakWorkName = `Материал leak ${suffix}`;
  const leakRequestId = await createRequest(
    admin,
    {
      createdBy: foremanUser.id,
      role: "foreman",
      name: leakWorkName,
      objectName: `Складской объект ${suffix}`,
      contractorCompanyName: contractorRecord.companyName,
      contractorInn: contractorRecord.inn,
      refs,
    },
    cleanup,
  );
  const leakRequestItemId = await createRequestItem(
    admin,
    {
      requestId: leakRequestId,
      rowNo: 1,
      nameHuman: leakWorkName,
      rikCode: `MAT-LEAK-${suffix.toUpperCase()}`,
      qty: 20,
      uom: "шт",
      kind: "material",
    },
    cleanup,
  );
  const leakPurchase = await createPurchasePipeline(
    admin,
    {
      createdBy: foremanUser.id,
      requestId: leakRequestId,
      requestItemId: leakRequestItemId,
      objectName: `Складской объект ${suffix}`,
      supplier: contractorRecord.companyName,
      itemName: leakWorkName,
      uom: "шт",
      qty: 20,
      unitPrice: 100,
    },
    cleanup,
  );
  await createWorkProgress(
    admin,
    {
      purchaseItemId: leakPurchase.purchaseItemId,
      contractorId: contractorRecord.id,
      contractorName: contractorRecord.companyName,
      qtyPlanned: 20,
      uom: "шт",
      location: `Складской объект ${suffix}`,
    },
    cleanup,
  );
  scenarios.push({
    key: "invalid_material_only",
    sourceKind: "invalid_material_only",
    requestId: leakRequestId,
    subcontractId: null,
    workItemId: null,
    workName: leakWorkName,
    objectName: `Складской объект ${suffix}`,
    materialTitle: null,
    warehouseIssueExpected: false,
  });

  const trackedRequestIds = scenarios
    .map((scenario) => scenario.requestId)
    .filter((value): value is string => Boolean(value));
  await poll(
    "contractor_canonical_candidates",
    async () => {
      const { data, error } = await admin
        .from("v_contractor_publication_candidates_v1")
        .select("work_item_id, source_request_id, source_subcontract_id, publication_state")
        .in("source_request_id", trackedRequestIds);
      if (error) throw error;
      return Array.isArray(data) && data.length >= 5 ? data : null;
    },
    20_000,
    500,
  );

  const { data: candidates, error: candidateError } = await admin
    .from("v_contractor_publication_candidates_v1")
    .select("work_item_id, source_request_id, source_subcontract_id, publication_state")
    .in("source_request_id", trackedRequestIds);
  if (candidateError) throw candidateError;
  for (const scenario of scenarios) {
    const match =
      (Array.isArray(candidates) ? candidates : []).find((row) => {
        const record = row as Record<string, unknown>;
        return (
          String(record.source_request_id ?? "") === String(scenario.requestId ?? "") ||
          String(record.source_subcontract_id ?? "") === String(scenario.subcontractId ?? "")
        );
      }) ?? null;
    scenario.workItemId = match ? String((match as Record<string, unknown>).work_item_id ?? "") : null;
  }

  return {
    admin,
    contractorUser,
    buyerUser,
    foremanUser,
    contractorRecord,
    refs,
    scenarios,
  };
}

export async function cleanupContractorCanonicalScenarios(context: ContractorCanonicalSeedContext | null) {
  if (!context) return;
  const cleanup = cleanupStateByContractorId.get(context.contractorRecord.id);
  if (cleanup) {
    for (const id of cleanup.warehouseIssueItemIds.reverse()) {
      try {
        await context.admin.from("warehouse_issue_items").delete().eq("id", id);
      } catch {}
    }
    for (const id of cleanup.warehouseIssueIds.reverse()) {
      try {
        await context.admin.from("warehouse_issues").delete().eq("id", id);
      } catch {}
    }
    for (const id of cleanup.workProgressIds.reverse()) {
      try {
        await context.admin.from("work_progress_log_materials").delete().eq("log_id", id);
      } catch {}
      try {
        await context.admin.from("work_progress_log").delete().eq("progress_id", id);
      } catch {}
      try {
        await context.admin.from("work_progress").delete().eq("id", id);
      } catch {}
    }
    for (const id of cleanup.purchaseItemIds.reverse()) {
      try {
        await context.admin.from("purchase_items").delete().eq("id", id);
      } catch {}
    }
    for (const id of cleanup.purchaseIds.reverse()) {
      try {
        await context.admin.from("purchases").delete().eq("id", id);
      } catch {}
    }
    for (const id of cleanup.requestItemIds.reverse()) {
      try {
        await context.admin.from("request_items").delete().eq("id", id);
      } catch {}
    }
    for (const id of cleanup.requestIds.reverse()) {
      try {
        await context.admin.from("requests").delete().eq("id", id);
      } catch {}
    }
    for (const id of cleanup.subcontractIds.reverse()) {
      try {
        await context.admin.from("subcontracts").delete().eq("id", id);
      } catch {}
    }
    if (cleanup.contractorId) {
      try {
        await context.admin.from("contractors").delete().eq("id", cleanup.contractorId);
      } catch {}
      cleanupStateByContractorId.delete(cleanup.contractorId);
    }
  }

  await cleanupTempUser(context.admin, context.foremanUser);
  await cleanupTempUser(context.admin, context.buyerUser);
  await cleanupTempUser(context.admin, context.contractorUser);
}


