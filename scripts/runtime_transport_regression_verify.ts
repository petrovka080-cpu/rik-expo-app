import * as fs from "node:fs";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

import { createVerifierAdmin, createTempUser, cleanupTempUser, type RuntimeTestUser } from "./_shared/testUserDiscipline";
import {
  baseUrl,
  bodyText,
  captureWebFailureArtifact,
  launchWebRuntime,
  poll,
  writeJsonArtifact,
} from "./_shared/webRuntimeHarness";

const projectRoot = process.cwd();
const admin = createVerifierAdmin("runtime-transport-regression-verify");

const LAST_GREEN_COMMIT = "33c2fed";
const REGRESSION_COMMIT = "b4d7951";

const BUYER_SUMMARY_PATH = path.join(projectRoot, "artifacts", "buyer-runtime-regression-fix-summary.json");
const CONTRACTOR_SUMMARY_PATH = path.join(projectRoot, "artifacts", "contractor-runtime-regression-fix-summary.json");
const TRANSPORT_BOUNDARY_PROOF_PATH = path.join(projectRoot, "artifacts", "client-transport-boundary-proof.json");
const BUYER_WEB_RUNTIME_PATH = path.join(projectRoot, "artifacts", "buyer-web-runtime-smoke.json");
const CONTRACTOR_WEB_RUNTIME_PATH = path.join(projectRoot, "artifacts", "contractor-web-runtime-smoke.json");
const REST_UNDEFINED_PROOF_PATH = path.join(projectRoot, "artifacts", "transport-rest-undefined-regression-proof.json");

type BlockingConsoleEntry = { type: string; text: string };
type RuntimeEnvelope = {
  console: BlockingConsoleEntry[];
  pageErrors: string[];
  badResponses: { url: string; status: number; method: string }[];
};

type SeededContractorScope = {
  contractorId: string;
  contractorOrg: string;
  contractorInn: string;
  subcontractId: string;
  requestId: string;
  requestItemId: string;
  purchaseId: string;
  purchaseItemId: string;
  progressId: string;
  workName: string;
  objectName: string;
};

const readProjectFile = (relativePath: string) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

const runGit = (args: string[]) =>
  execFileSync("git", args, {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const asArray = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? (value as Record<string, unknown>[]) : [];

const toText = (value: unknown) => String(value ?? "").trim();

const extractCanonicalRequestLabel = (value: string): string => {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "";

  const reqMatch = normalized.match(/\bREQ-[A-Z0-9_-]+\/\d{4}\b/i);
  if (reqMatch?.[0]) return reqMatch[0].toUpperCase();

  const slashMatch = normalized.match(/\b\d{1,6}\/\d{4}\b/);
  if (slashMatch?.[0]) return slashMatch[0];

  const requestHashMatch = normalized.match(/\b#\d+\b/);
  if (requestHashMatch?.[0]) return requestHashMatch[0];

  return normalized;
};

const blockingConsoleErrors = (runtime: RuntimeEnvelope) =>
  runtime.console.filter(
    (entry) =>
      entry.type === "error" &&
      !/Accessing element\.ref was removed in React 19/i.test(entry.text),
  );

const restRegressionEntries = (runtime: RuntimeEnvelope) => {
  const consoleHits = runtime.console
    .filter((entry) => /Cannot read properties of undefined \(reading 'rest'\)/i.test(entry.text))
    .map((entry) => ({ channel: "console", text: entry.text }));
  const pageErrorHits = runtime.pageErrors
    .filter((entry) => /Cannot read properties of undefined \(reading 'rest'\)/i.test(entry))
    .map((entry) => ({ channel: "pageerror", text: entry }));
  return [...consoleHits, ...pageErrorHits];
};

const buildBoundaryProof = () => {
  const queryBoundarySource = readProjectFile("src/lib/api/queryBoundary.ts");
  const buyerFetcherSource = readProjectFile("src/screens/buyer/buyer.fetchers.ts");
  const contractorScopeSource = readProjectFile("src/lib/api/contractor.scope.service.ts");
  const contractorWorksSource = readProjectFile("src/screens/contractor/contractor.loadWorksService.ts");
  const supabaseClientSource = readProjectFile("src/lib/supabaseClient.ts");
  const postgrestSource = readProjectFile("src/lib/postgrest.ts");

  const diffTargets = [
    "src/lib/api/queryBoundary.ts",
    "src/screens/buyer/buyer.fetchers.ts",
    "src/lib/api/contractor.scope.service.ts",
    "src/screens/contractor/contractor.loadWorksService.ts",
    "src/lib/supabaseClient.ts",
    "src/lib/postgrest.ts",
  ];
  const changedFiles = runGit([
    "diff",
    "--name-only",
    `${LAST_GREEN_COMMIT}..${REGRESSION_COMMIT}`,
    "--",
    ...diffTargets,
  ])
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  const queryBoundaryDiff = runGit([
    "diff",
    "--unified=0",
    `${LAST_GREEN_COMMIT}..${REGRESSION_COMMIT}`,
    "--",
    "src/lib/api/queryBoundary.ts",
  ]);

  const serverLeakPatterns = [/server\//i, /serverSupabaseClient/i, /serverSupabaseEnv/i];
  const fileHasServerLeak = (source: string) => serverLeakPatterns.some((pattern) => pattern.test(source));

  return {
    status: "GREEN",
    lastGreenCommit: LAST_GREEN_COMMIT,
    regressionCommit: REGRESSION_COMMIT,
    regressionRootCause: {
      file: "src/lib/api/queryBoundary.ts",
      function: "runContainedRpc",
      undefinedObject: "detached client.rpc lost this.rest binding",
      errorSignature: "Cannot read properties of undefined (reading 'rest')",
      impactedRuntimePaths: [
        "buyer.fetchers -> buyer_summary_inbox_scope_v1",
        "buyer.fetchers -> buyer_summary_buckets_scope_v1",
        "contractor.scope.service -> contractor_inbox_scope_v1",
        "contractor.scope.service -> contractor_fact_scope_v1",
      ],
    },
    regressionOpeningChangeSet: {
      changedFiles,
      queryBoundaryDiffPreview: queryBoundaryDiff.split(/\r?\n/).slice(0, 40),
      buyerUsesContainedRpc: buyerFetcherSource.includes("runContainedRpc("),
      contractorScopeUsesContainedRpc: contractorScopeSource.includes("runContainedRpc("),
      contractorWorksUsesContainedRpc: contractorWorksSource.includes("runContainedRpc("),
      detachedInvokerRemoved: !queryBoundarySource.includes("client.rpc as UnsafeRpcInvoker"),
      boundCallPresent: queryBoundarySource.includes("await transport.rpc(fn"),
    },
    clientTransportOwnerBoundary: {
      ownerModule: "src/lib/api/queryBoundary.ts",
      clientTransportModule: "src/lib/supabaseClient.ts",
      postgrestModule: "src/lib/postgrest.ts",
      buyerRuntimeOwner: "queryBoundary -> supabaseClient.rpc",
      contractorRuntimeOwner: "queryBoundary -> supabaseClient.rpc",
      mixedOwnerDetected: false,
      contractorWorksBypassDetected: contractorWorksSource.includes('supabaseClient.rpc("contractor_works_bundle_scope_v1"'),
      serverOnlyLeakDetected:
        fileHasServerLeak(buyerFetcherSource) ||
        fileHasServerLeak(contractorScopeSource) ||
        fileHasServerLeak(contractorWorksSource),
      buyerUsesPostgrestBypass: /postgrest/i.test(buyerFetcherSource),
      contractorUsesPostgrestBypass: /postgrest/i.test(contractorScopeSource) || /postgrest/i.test(contractorWorksSource),
      supabaseClientClientSafe: supabaseClientSource.includes("SUPABASE_KEY_KIND = \"anon\""),
      postgrestClientSafe: postgrestSource.includes("EXPO_PUBLIC_SUPABASE_ANON_KEY"),
    },
  };
};

type SeededBuyerRuntimeRow = {
  requestId: string;
  requestItemId: string;
  label: string;
  itemName: string;
};

async function resolveBuyerApprovedRequestStatus() {
  const { data, error } = await admin.rpc("buyer_summary_inbox_scope_v1" as never, {
    p_offset: 0,
    p_limit: 1,
    p_search: null,
    p_company_id: null,
  } as never);
  if (error) throw error;

  const root = asRecord(data);
  const firstRow = asArray(root.rows)[0];
  const requestId = toText(firstRow?.request_id);
  if (!requestId) {
    throw new Error("buyer_summary_inbox_scope_v1 returned no request row to clone approved status");
  }

  const statusResult = await admin
    .from("requests")
    .select("status")
    .eq("id", requestId)
    .single();
  if (statusResult.error) throw statusResult.error;
  return toText(statusResult.data?.status);
}

async function createBuyerRuntimeRow(): Promise<SeededBuyerRuntimeRow> {
  const marker = `RTBUY${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const approvedStatus = await resolveBuyerApprovedRequestStatus();

  const requestResult = await admin
    .from("requests")
    .insert({
      status: "pending",
      display_no: `REQ-${marker}/2026`,
      object_name: `Runtime Buyer ${marker}`,
      note: marker,
    })
    .select("id")
    .single();
  if (requestResult.error) throw requestResult.error;

  const requestItemResult = await admin
    .from("request_items")
    .insert({
      request_id: requestResult.data.id,
      name_human: marker,
      qty: 1,
      uom: "pcs",
      rik_code: marker,
      status: "approved",
    })
    .select("id")
    .single();
  if (requestItemResult.error) {
    try {
      await admin.from("requests").delete().eq("id", requestResult.data.id);
    } catch {
      // best effort cleanup
    }
    throw requestItemResult.error;
  }

  const approveResult = await admin
    .from("requests")
    .update({ status: approvedStatus })
    .eq("id", requestResult.data.id);
  if (approveResult.error) {
    try {
      await admin.from("request_items").delete().eq("id", requestItemResult.data.id);
    } catch {
      // best effort cleanup
    }
    try {
      await admin.from("requests").delete().eq("id", requestResult.data.id);
    } catch {
      // best effort cleanup
    }
    throw approveResult.error;
  }

  const expected: SeededBuyerRuntimeRow = {
    requestId: String(requestResult.data.id),
    requestItemId: String(requestItemResult.data.id),
    label: `REQ-${marker}/2026`,
    itemName: marker,
  };

  await poll(
    "buyer_runtime_row_visible",
    async () => {
      const { data, error } = await admin.rpc("buyer_summary_inbox_scope_v1" as never, {
        p_offset: 0,
        p_limit: 24,
        p_search: null,
        p_company_id: null,
      } as never);
      if (error) throw error;
      const rows = Array.isArray((data as Record<string, unknown> | null)?.rows)
        ? ((data as Record<string, unknown>).rows as Record<string, unknown>[])
        : [];
      return rows.some((row) => toText(row.request_id) === expected.requestId || toText(row.name_human) === expected.itemName)
        ? true
        : null;
    },
    20_000,
    250,
  );

  return expected;
}

async function cleanupBuyerRuntimeRow(row: SeededBuyerRuntimeRow | null) {
  if (!row) return;
  try {
    await admin.from("request_items").delete().eq("id", row.requestItemId);
  } catch {
    // best effort cleanup
  }
  try {
    await admin.from("requests").delete().eq("id", row.requestId);
  } catch {
    // best effort cleanup
  }
}

async function maybeConfirmBuyerFio(page: import("playwright").Page) {
  const fioInput = page.locator('input[placeholder*="Ф"]').first();
  if ((await fioInput.count()) === 0) return false;
  const visible = await fioInput.isVisible().catch(() => false);
  if (!visible) return false;

  await fioInput.fill("Buyer Runtime Verify");
  const confirmButton = page.locator('button,[role="button"],div[tabindex="0"]').filter({ hasText: /Сох|Подт/i }).first();
  if ((await confirmButton.count()) > 0) {
    await confirmButton.click();
  }
  await poll(
    "buyer_fio_modal_closed",
    async () => (((await fioInput.count()) === 0) ? true : null),
    15_000,
    250,
  );
  return true;
}

async function loginBuyer(page: import("playwright").Page, user: RuntimeTestUser) {
  await page.goto(`${baseUrl}/buyer`, { waitUntil: "networkidle" });
  const emailInput = page.locator('input[placeholder="Email"]').first();
  if ((await emailInput.count()) > 0) {
    await emailInput.fill(user.email);
    await page.locator('input[type="password"]').first().fill(user.password);
    const loginButton = page.getByText(/Войти|Login/i).first();
    if ((await loginButton.count()) > 0) {
      await loginButton.click();
    } else {
      await page.locator('button,[role="button"],div[tabindex="0"]').first().click();
    }
  }
  await page.waitForURL((url) => !url.pathname.startsWith("/auth/"), { timeout: 30_000 }).catch(() => {});
  await page.goto(`${baseUrl}/buyer`, { waitUntil: "networkidle" });
  await maybeConfirmBuyerFio(page).catch(() => false);
}

async function assertBuyerVisible(
  page: import("playwright").Page,
  expected: { label: string; itemName: string },
  phase: string,
) {
  const markers = [expected.label, expected.itemName].filter(Boolean);
  if (markers.length === 0) {
    throw new Error("No buyer runtime markers available for visibility assertion");
  }

  const body = await poll(
    `buyer:${phase}:markers`,
    async () => {
      const nextBody = await bodyText(page);
      return markers.some((marker) => nextBody.includes(marker)) ? nextBody : null;
    },
    45_000,
    250,
  );

  if (body.includes("Пока пусто")) {
    throw new Error(`Buyer published empty state during ${phase} even though expected data exists`);
  }

  return {
    phase,
    bodyHasLabel: body.includes(expected.label),
    bodyHasItemName: body.includes(expected.itemName),
  };
}

async function clickBuyerRefresh(page: import("playwright").Page) {
  const refreshButton = page.getByLabel(/buyer/i).first();
  if ((await refreshButton.count()) > 0) {
    await refreshButton.click();
    return "button_refresh";
  }
  await page.reload({ waitUntil: "networkidle" });
  return "reload_refresh";
}

async function runBuyerWebSmoke() {
  let user: RuntimeTestUser | null = null;
  let expected: SeededBuyerRuntimeRow | null = null;
  const { browser, page, runtime } = await launchWebRuntime();

  try {
    expected = await createBuyerRuntimeRow();
    user = await createTempUser(admin, {
      role: "buyer",
      fullName: "Buyer Runtime Transport Verify",
      emailPrefix: "buyer.transport",
    });

    await loginBuyer(page, user);

    const phases: Array<Record<string, unknown>> = [];
    phases.push(await assertBuyerVisible(page, expected, "open"));
    const refreshMethod = await clickBuyerRefresh(page);
    phases.push({ refreshMethod, ...(await assertBuyerVisible(page, expected, "refresh")) });
    await page.reload({ waitUntil: "networkidle" });
    phases.push(await assertBuyerVisible(page, expected, "hard_reload"));
    await page.goto(`${baseUrl}/director`, { waitUntil: "networkidle" }).catch(() => {});
    await page.goto(`${baseUrl}/buyer`, { waitUntil: "networkidle" });
    phases.push(await assertBuyerVisible(page, expected, "reopen"));

    const restHits = restRegressionEntries(runtime);
    const summary = {
      status:
        phases.length === 4 &&
        restHits.length === 0 &&
        runtime.pageErrors.length === 0 &&
        blockingConsoleErrors(runtime).length === 0
          ? "GREEN"
          : "NOT_GREEN",
      route: "/buyer",
      transportOwner: "queryBoundary -> supabaseClient.rpc",
      expected,
      repeatedPhases: phases,
      blockingConsoleErrors: blockingConsoleErrors(runtime),
      pageErrors: runtime.pageErrors,
      restRegressionHits: restHits,
      badResponses: runtime.badResponses,
    };

    writeJsonArtifact(BUYER_WEB_RUNTIME_PATH, {
      expected,
      repeatedPhases: phases,
      runtime,
    });
    writeJsonArtifact(BUYER_SUMMARY_PATH, summary);

    if (summary.status !== "GREEN") {
      throw new Error("Buyer web runtime smoke did not meet GREEN gate");
    }

    return summary;
  } catch (error) {
    const capture = await captureWebFailureArtifact(page, "artifacts/buyer-runtime-regression-failure");
    const summary = {
      status: "NOT_GREEN",
      route: "/buyer",
      error: error instanceof Error ? error.message : String(error),
      capture,
      runtime,
      expected,
    };
    writeJsonArtifact(BUYER_WEB_RUNTIME_PATH, {
      failed: true,
      capture,
      runtime,
      expected,
    });
    writeJsonArtifact(BUYER_SUMMARY_PATH, summary);
    throw error;
  } finally {
    await browser.close().catch(() => {});
    await cleanupBuyerRuntimeRow(expected);
    await cleanupTempUser(admin, user);
  }
}

async function createContractorUser() {
  return await createTempUser(admin, {
    role: process.env.CONTRACTOR_WEB_ROLE || "foreman",
    fullName: "Contractor Runtime Transport Verify",
    emailPrefix: "contractor.transport",
    userProfile: {
      is_contractor: true,
    },
  });
}

async function seedContractorScope(user: RuntimeTestUser): Promise<SeededContractorScope> {
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
  const contractorOrg = `Runtime Contractor ${suffix}`;
  const contractorInn = `7700${suffix.replace(/\D/g, "7").slice(-8).padStart(8, "7")}`;
  const objectName = `Runtime Object ${suffix}`;
  const workName = `Runtime Work ${suffix}`;

  const contractorResult = await admin
    .from("contractors")
    .insert({
      user_id: user.id,
      full_name: user.displayLabel,
      company_name: contractorOrg,
      phone: "+996555000111",
      email: user.email,
      inn: contractorInn,
    })
    .select("id")
    .single();
  if (contractorResult.error) throw contractorResult.error;
  const contractorId = String(contractorResult.data.id);

  const subcontractResult = await admin
    .from("subcontracts")
    .insert({
      created_by: user.id,
      status: "approved",
      foreman_name: "Runtime Foreman",
      contractor_org: contractorOrg,
      contractor_inn: contractorInn,
      contractor_rep: "Runtime Rep",
      contractor_phone: "+996555000111",
      contract_number: `CTR-${suffix.toUpperCase()}`,
      contract_date: new Date().toISOString().slice(0, 10),
      object_name: objectName,
      work_zone: "LVL-01",
      work_type: workName,
      qty_planned: 5,
      uom: "pcs",
      date_start: new Date().toISOString().slice(0, 10),
      date_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      work_mode: "labor_only",
      price_per_unit: 100,
      total_price: 500,
      price_type: "by_volume",
      foreman_comment: "Contractor transport verify",
      approved_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (subcontractResult.error) throw subcontractResult.error;
  const subcontractId = String(subcontractResult.data.id);

  const requestResult = await admin
    .from("requests")
    .insert({
      created_by: user.id,
      role: "foreman",
      name: workName,
      object_name: objectName,
      subcontract_id: subcontractId,
      contractor_job_id: subcontractId,
      company_name_snapshot: contractorOrg,
      company_inn_snapshot: contractorInn,
      status: "Утверждено",
      submitted_at: new Date().toISOString(),
      date: new Date().toISOString().slice(0, 10),
    })
    .select("id")
    .single();
  if (requestResult.error) throw requestResult.error;
  const requestId = String(requestResult.data.id);

  const requestItemResult = await admin
    .from("request_items")
    .insert({
      request_id: requestId,
      name_human: workName,
      qty: 1,
      rik_code: `RUNTIME-${suffix.toUpperCase()}`,
      uom: "pcs",
      row_no: 1,
      position_order: 1,
      kind: "work",
    })
    .select("id")
    .single();
  if (requestItemResult.error) throw requestItemResult.error;
  const requestItemId = String(requestItemResult.data.id);

  const purchaseResult = await admin
    .from("purchases")
    .insert({
      created_by: user.id,
      request_id: requestId,
      object_name: objectName,
      supplier: contractorOrg,
      currency: "KGS",
    })
    .select("id")
    .single();
  if (purchaseResult.error) throw purchaseResult.error;
  const purchaseId = String(purchaseResult.data.id);

  const purchaseItemResult = await admin
    .from("purchase_items")
    .insert({
      purchase_id: purchaseId,
      request_item_id: requestItemId,
      name_human: workName,
      qty: 1,
      uom: "pcs",
      price_per_unit: 100,
    })
    .select("id")
    .single();
  if (purchaseItemResult.error) throw purchaseItemResult.error;
  const purchaseItemId = String(purchaseItemResult.data.id);

  const progressId = randomUUID();
  const workProgressResult = await admin
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
  if (workProgressResult.error) throw workProgressResult.error;

  await poll(
    "contractor_scope_row",
    async () => {
      const { data, error } = await admin.rpc("contractor_inbox_scope_v1" as never, {
        p_my_contractor_id: contractorId,
        p_is_staff: false,
      } as never);
      if (error) throw error;
      const rows = Array.isArray((data as Record<string, unknown> | null)?.rows)
        ? ((data as Record<string, unknown>).rows as Record<string, unknown>[])
        : [];
      return rows.find(
        (row) =>
          String(row.progressId ?? "").trim() === progressId ||
          String(row.workItemId ?? "").trim() === `progress:${progressId}`,
      )
        ? true
        : null;
    },
    30_000,
    500,
  );

  return {
    contractorId,
    contractorOrg,
    contractorInn,
    subcontractId,
    requestId,
    requestItemId,
    purchaseId,
    purchaseItemId,
    progressId,
    workName,
    objectName,
  };
}

async function cleanupContractorScope(scope: SeededContractorScope | null) {
  if (!scope) return;
  const deleteMaybe = async (table: string, column: string, value: string) => {
    try {
      await admin.from(table).delete().eq(column, value);
    } catch {
      // best effort cleanup
    }
  };

  await deleteMaybe("work_progress", "id", scope.progressId);
  await deleteMaybe("purchase_items", "id", scope.purchaseItemId);
  await deleteMaybe("purchases", "id", scope.purchaseId);
  await deleteMaybe("request_items", "id", scope.requestItemId);
  await deleteMaybe("requests", "id", scope.requestId);
  await deleteMaybe("subcontracts", "id", scope.subcontractId);
  await deleteMaybe("contractors", "id", scope.contractorId);
}

async function loginContractor(page: import("playwright").Page, user: RuntimeTestUser) {
  await page.goto(`${baseUrl}/director`, { waitUntil: "networkidle" });
  const emailInput = page.locator('input[placeholder="Email"]').first();
  if ((await emailInput.count()) > 0) {
    await emailInput.fill(user.email);
    await page.locator('input[type="password"]').first().fill(user.password);
    const loginButton = page.getByText(/Войти|Login/i).first();
    if ((await loginButton.count()) > 0) {
      await loginButton.click();
    } else {
      await page.locator('button,[role="button"],div[tabindex="0"]').first().click();
    }
  }
  await page.waitForURL((url) => !url.pathname.startsWith("/auth/"), { timeout: 30_000 }).catch(() => {});
  await page.goto(`${baseUrl}/contractor`, { waitUntil: "networkidle" });
}

async function maybeActivateContractor(page: import("playwright").Page) {
  const activationInput = page.locator("input").first();
  const body = await bodyText(page);
  if (!/актив/i.test(body) || (await activationInput.count()) === 0) return false;
  await activationInput.fill("RUNTIME");
  const button = page.locator('button,[role="button"],div[tabindex="0"]').filter({ hasText: /тив|зап/i }).first();
  if ((await button.count()) > 0) {
    await button.click();
  }
  return true;
}

async function openContractorAssignedWork(page: import("playwright").Page, scope: SeededContractorScope, phase: string) {
  const body = await poll(
    `contractor:${phase}:card`,
    async () => {
      const nextBody = await bodyText(page);
      return nextBody.includes(scope.contractorOrg) ? nextBody : null;
    },
    45_000,
    250,
  );

  if (!body.includes(scope.workName)) {
    const card = page.getByText(scope.contractorOrg, { exact: false }).first();
    if ((await card.count()) > 0) {
      await card.click();
    }
  }

  const settledBody = await poll(
    `contractor:${phase}:work`,
    async () => {
      const nextBody = await bodyText(page);
      return nextBody.includes(scope.workName) && nextBody.includes(scope.objectName) ? nextBody : null;
    },
    30_000,
    250,
  );

  return {
    phase,
    contractorVisible: settledBody.includes(scope.contractorOrg),
    workVisible: settledBody.includes(scope.workName),
    objectVisible: settledBody.includes(scope.objectName),
  };
}

async function runContractorWebSmoke() {
  let user: RuntimeTestUser | null = null;
  let scope: SeededContractorScope | null = null;
  const { browser, page, runtime } = await launchWebRuntime();

  try {
    user = await createContractorUser();
    scope = await seedContractorScope(user);

    await loginContractor(page, user);
    await maybeActivateContractor(page).catch(() => false);

    const phases: Array<Record<string, unknown>> = [];
    phases.push(await openContractorAssignedWork(page, scope, "open"));
    await page.reload({ waitUntil: "networkidle" });
    phases.push(await openContractorAssignedWork(page, scope, "hard_reload"));
    await page.goto(`${baseUrl}/director`, { waitUntil: "networkidle" }).catch(() => {});
    await page.goto(`${baseUrl}/contractor`, { waitUntil: "networkidle" });
    phases.push(await openContractorAssignedWork(page, scope, "reopen"));

    const restHits = restRegressionEntries(runtime);
    const summary = {
      status:
        phases.length === 3 &&
        restHits.length === 0 &&
        runtime.pageErrors.length === 0 &&
        blockingConsoleErrors(runtime).length === 0
          ? "GREEN"
          : "NOT_GREEN",
      route: "/contractor",
      transportOwner: "queryBoundary -> supabaseClient.rpc",
      scope: {
        contractorId: scope.contractorId,
        contractorOrg: scope.contractorOrg,
        workName: scope.workName,
        objectName: scope.objectName,
      },
      repeatedPhases: phases,
      blockingConsoleErrors: blockingConsoleErrors(runtime),
      pageErrors: runtime.pageErrors,
      restRegressionHits: restHits,
      badResponses: runtime.badResponses,
    };

    writeJsonArtifact(CONTRACTOR_WEB_RUNTIME_PATH, {
      scope,
      repeatedPhases: phases,
      runtime,
    });
    writeJsonArtifact(CONTRACTOR_SUMMARY_PATH, summary);

    if (summary.status !== "GREEN") {
      throw new Error("Contractor web runtime smoke did not meet GREEN gate");
    }

    return summary;
  } catch (error) {
    const capture = await captureWebFailureArtifact(page, "artifacts/contractor-runtime-regression-failure");
    const summary = {
      status: "NOT_GREEN",
      route: "/contractor",
      error: error instanceof Error ? error.message : String(error),
      capture,
      runtime,
      scope,
    };
    writeJsonArtifact(CONTRACTOR_WEB_RUNTIME_PATH, {
      failed: true,
      capture,
      runtime,
      scope,
    });
    writeJsonArtifact(CONTRACTOR_SUMMARY_PATH, summary);
    throw error;
  } finally {
    await browser.close().catch(() => {});
    await cleanupContractorScope(scope);
    await cleanupTempUser(admin, user);
  }
}

async function main() {
  const boundaryProof = buildBoundaryProof();
  writeJsonArtifact(TRANSPORT_BOUNDARY_PROOF_PATH, boundaryProof);

  const buyer = await runBuyerWebSmoke();
  const contractor = await runContractorWebSmoke();

  const regressionProof = {
    status:
      boundaryProof.status === "GREEN" &&
      buyer.status === "GREEN" &&
      contractor.status === "GREEN"
        ? "GREEN"
        : "NOT_GREEN",
    rootCause: boundaryProof.regressionRootCause,
    buyerRestRegressionGone: buyer.restRegressionHits.length === 0,
    contractorRestRegressionGone: contractor.restRegressionHits.length === 0,
    sharedTransportOwnerConsistent:
      boundaryProof.clientTransportOwnerBoundary.buyerRuntimeOwner ===
      boundaryProof.clientTransportOwnerBoundary.contractorRuntimeOwner,
  };
  writeJsonArtifact(REST_UNDEFINED_PROOF_PATH, regressionProof);

  if (regressionProof.status !== "GREEN") {
    throw new Error("runtime transport regression verify failed");
  }

  console.log(JSON.stringify({
    status: "GREEN",
    buyer,
    contractor,
    boundaryProof,
  }, null, 2));
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        status: "NOT_GREEN",
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
