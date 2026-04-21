import fs from "node:fs";
import path from "node:path";

import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../src/lib/database.types";
import {
  baseUrl,
  bodyText,
  captureWebFailureArtifact,
  launchWebRuntime,
  poll,
  writeJsonArtifact,
} from "./_shared/webRuntimeHarness";
import {
  cleanupTempUser,
  createTempUser,
  createVerifierAdmin,
  type RuntimeTestUser,
} from "./_shared/testUserDiscipline";

type JsonRecord = Record<string, unknown>;

type AccReportSeed = {
  marker: string;
  requestId: string;
  requestItemIds: string[];
  proposalId: string;
  proposalItemIds: string[];
  paymentId: number;
  supplierLabel: string;
  invoiceNumber: string;
  amount: number;
};

type ObservabilityEvent = {
  id?: string;
  at?: number;
  screen?: string | null;
  surface?: string | null;
  event?: string | null;
  result?: string | null;
  durationMs?: number | null;
  cacheLayer?: string | null;
  sourceKind?: string | null;
  extra?: JsonRecord | null;
};

type TimingMode = "artifact_miss" | "repeat" | "artifact_hit" | "warm";

type TimingSample = {
  platform: "web";
  mode: TimingMode;
  sampleIndex: number;
  paymentId: number;
  proposalId: string;
  marker: string;
  sourceEvent: string;
  result: string | null;
  cacheLayer: string | null;
  durationMs: number;
  openDurationMs?: number | null;
};

type WebProofSummary = {
  status: "GREEN" | "NOT_GREEN";
  route: string;
  baseUrl: string;
  paidTabLabel: string;
  reportLabel: string;
  samples: TimingSample[];
  seedPaymentIds: number[];
  runtime: {
    pageErrors: string[];
    badResponses: { url: string; status: number; method: string }[];
    consoleErrors: { type: string; text: string }[];
  };
  invariants: {
    accountantSurfaceReached: boolean;
    reportPathReachable: boolean;
    repeatCycleWorked: boolean;
    noPageErrors: boolean;
    noBadResponses: boolean;
    noBlockingConsoleErrors: boolean;
    noStuckLoading: boolean;
  };
  artifacts: {
    screenshot: string | null;
    failureArtifact: { screenshot: string; html: string } | null;
  };
};

const projectRoot = process.cwd();
const artifactBase = "artifacts/ACC_REPORT_FINAL_web_runtime";
const webTimingPath = path.join(projectRoot, "artifacts/ACC_REPORT_FINAL_web_timing.md");
const timingSamplesPath = path.join(projectRoot, "artifacts/ACC_REPORT_FINAL_timing_samples.json");
const webRuntimeJsonPath = path.join(projectRoot, `${artifactBase}.json`);
const PAID_TAB_LABEL = "\u041e\u043f\u043b\u0430\u0447\u0435\u043d\u043e";
const REPORT_BUTTON_LABEL = "\u041e\u0442\u0447\u0451\u0442";
const CARD_TITLE_LABEL = "\u041a\u0430\u0440\u0442\u043e\u0447\u043a\u0430 \u043f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u044f";
const ACCOUNTANT_ROUTE = "/office/accountant";
const ACCOUNTANT_FIO_LABEL = "ACC REPORT FINAL";

const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const anonKey = String(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
const admin = createVerifierAdmin("acc-report-final-web-verify") as SupabaseClient<Database>;
const supabaseProjectRef = (() => {
  try {
    return new URL(supabaseUrl).hostname.split(".")[0] || "";
  } catch {
    return "";
  }
})();
const supabaseStorageKey = `sb-${supabaseProjectRef}-auth-token`;

if (!supabaseUrl || !anonKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY");
}

const trim = (value: unknown) => String(value ?? "").trim();

const writeTextArtifact = (fullPath: string, content: string) => {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, "utf8");
};

const median = (values: number[]) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1]! + sorted[middle]!) / 2)
    : sorted[middle]!;
};

const max = (values: number[]) => (values.length > 0 ? Math.max(...values) : null);

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function asText(value: unknown) {
  const text = trim(value);
  return text || null;
}

function asNumber(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function getBlockingConsoleErrors(entries: { type: string; text: string }[]) {
  return entries.filter((entry) => entry.type === "error");
}

function getBlockingBadResponses(entries: { url: string; status: number; method: string }[]) {
  return entries.filter((entry) => !entry.url.includes("/favicon"));
}

async function signInSession(user: RuntimeTestUser): Promise<Session> {
  const client = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        "x-client-info": "acc-report-final-web-signin",
      },
    },
  });
  const result = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (result.error || !result.data.session) {
    throw result.error ?? new Error(`signInWithPassword returned no session for ${user.email}`);
  }
  return result.data.session;
}

async function openAccountantRoute(page: import("playwright").Page, user: RuntimeTestUser) {
  const session = await signInSession(user);
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    {
      key: supabaseStorageKey,
      value: JSON.stringify(session),
    },
  );
  await page.goto(`${baseUrl}${ACCOUNTANT_ROUTE}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
}

async function ensureAccountantFioSettled(
  page: import("playwright").Page,
  observeWindowMs = 1_500,
) {
  const input = page.getByTestId("warehouse-fio-input").first();
  const confirm = page.getByTestId("warehouse-fio-confirm").first();
  const deadline = Date.now() + observeWindowMs;
  let handled = false;

  while (Date.now() <= deadline) {
    const inputVisible =
      (await input.count().catch(() => 0)) > 0 && (await input.isVisible().catch(() => false));
    if (!inputVisible) {
      if (handled) return true;
      await page.waitForTimeout(150);
      continue;
    }

    handled = true;
    await input.fill(ACCOUNTANT_FIO_LABEL);
    await poll(
      "web-accountant-fio-enabled",
      async () => {
        const ariaDisabled = await confirm.getAttribute("aria-disabled").catch(() => "true");
        return ariaDisabled === "true" ? null : true;
      },
      5_000,
      150,
    );
    await confirm.click({ force: true });
    await poll(
      "web-accountant-fio-confirmed",
      async () => {
        const stillVisible =
          (await input.count().catch(() => 0)) > 0 && (await input.isVisible().catch(() => false));
        return stillVisible ? null : true;
      },
      10_000,
      150,
    );
    return true;
  }

  return handled;
}

async function waitForAccountantSurface(page: import("playwright").Page) {
  await poll(
    "web-accountant-surface",
    async () => {
      const body = await bodyText(page);
      return body.includes(PAID_TAB_LABEL) ? true : null;
    },
    45_000,
    250,
  );
}

async function clickText(page: import("playwright").Page, text: string, label: string) {
  const locator = page.getByText(text, { exact: true }).first();
  await poll(
    `${label}:visible`,
    async () => ((await locator.count()) > 0 && (await locator.isVisible().catch(() => false)) ? true : null),
    20_000,
    250,
  );
  await ensureAccountantFioSettled(page, 750).catch(() => false);
  await locator.click({ force: true });
  await ensureAccountantFioSettled(page, 750).catch(() => false);
}

async function ensureSeedVisibleInPaidTab(page: import("playwright").Page, seed: AccReportSeed) {
  const paidTab = page.getByText(PAID_TAB_LABEL, { exact: true }).first();
  const supplierLabel = page.getByText(seed.supplierLabel, { exact: true }).first();
  const row = page.locator('[tabindex="0"]').filter({ has: supplierLabel }).first();
  await poll(
    `seed-row:${seed.marker}`,
    async () => {
      await ensureAccountantFioSettled(page, 750).catch(() => false);
      const rowVisible =
        (await supplierLabel.count().catch(() => 0)) > 0 && (await supplierLabel.isVisible().catch(() => false));
      if (rowVisible) return true;

      const paidTabVisible =
        (await paidTab.count().catch(() => 0)) > 0 && (await paidTab.isVisible().catch(() => false));
      if (paidTabVisible) {
        await paidTab.click({ force: true }).catch(() => undefined);
      }
      return null;
    },
    30_000,
    350,
  );
  return row;
}

async function openSeedCard(page: import("playwright").Page, seed: AccReportSeed) {
  await waitForAccountantSurface(page);
  const row = await ensureSeedVisibleInPaidTab(page, seed);
  await row.click({ force: true });
  await ensureAccountantFioSettled(page, 750).catch(() => false);
  await poll(
    `seed-card:${seed.marker}`,
    async () => {
      const body = await bodyText(page);
      return body.includes(CARD_TITLE_LABEL) && body.includes(seed.supplierLabel) && body.includes(REPORT_BUTTON_LABEL)
        ? true
        : null;
    },
    20_000,
    250,
  );
}

async function readObservabilityEvents(page: import("playwright").Page): Promise<ObservabilityEvent[]> {
  return await page.evaluate(() => {
    const root = globalThis as typeof globalThis & {
      __RIK_PLATFORM_OBSERVABILITY__?: { events?: unknown[] };
    };
    return Array.isArray(root.__RIK_PLATFORM_OBSERVABILITY__?.events)
      ? (root.__RIK_PLATFORM_OBSERVABILITY__?.events as ObservabilityEvent[])
      : [];
  });
}

async function waitForObservabilityEvent(
  page: import("playwright").Page,
  label: string,
  startIndex: number,
  predicate: (event: ObservabilityEvent) => boolean,
) {
  return await poll(
    label,
    async () => {
      const events = await readObservabilityEvents(page);
      return events.slice(startIndex).find(predicate) ?? null;
    },
    60_000,
    250,
  );
}

function isAccountantReadyEventForPayment(paymentId: number, event: ObservabilityEvent) {
  return (
    event.screen === "accountant" &&
    event.surface === "accountant_payment_report_pdf" &&
    event.event === "accountant_payment_report_pdf_ready" &&
    String(event.extra?.paymentId ?? "") === String(paymentId)
  );
}

function isPdfOpenEventForPayment(paymentId: number, event: ObservabilityEvent) {
  return (
    event.screen === "accountant" &&
    event.surface === "pdf_open_performance" &&
    event.event === "pdf_open_latency" &&
    String(event.extra?.documentType ?? "") === "payment_order" &&
    String(event.extra?.originModule ?? "") === "accountant" &&
    String(event.extra?.entityId ?? "") === String(paymentId)
  );
}

async function clickReportAndCollect(
  page: import("playwright").Page,
  seed: AccReportSeed,
) {
  const startIndex = (await readObservabilityEvents(page)).length;
  await clickText(page, REPORT_BUTTON_LABEL, `report-button:${seed.marker}`);

  const readyEvent = await waitForObservabilityEvent(
    page,
    `ready-event:${seed.paymentId}`,
    startIndex,
    (event) => isAccountantReadyEventForPayment(seed.paymentId, event),
  );
  const openEvent = await waitForObservabilityEvent(
    page,
    `pdf-open-event:${seed.paymentId}`,
    startIndex,
    (event) => isPdfOpenEventForPayment(seed.paymentId, event) && event.result === "success",
  );

  await poll(
    `viewer-route:${seed.paymentId}`,
    async () => (page.url().includes("/pdf-viewer") ? true : null),
    30_000,
    250,
  );

  return {
    readyEvent,
    openEvent,
  };
}

async function classifyAccountantView(page: import("playwright").Page, seed: AccReportSeed) {
  await ensureAccountantFioSettled(page, 750).catch(() => false);
  const body = await bodyText(page);
  const onAccountantRoute = page.url().includes(ACCOUNTANT_ROUTE) || page.url().endsWith("/accountant");
  if (!onAccountantRoute) return null;
  if (body.includes(CARD_TITLE_LABEL) && body.includes(seed.supplierLabel) && body.includes(REPORT_BUTTON_LABEL)) {
    return "card" as const;
  }
  if (body.includes(PAID_TAB_LABEL) && !body.includes(CARD_TITLE_LABEL)) {
    return "list" as const;
  }
  return null;
}

async function leaveViewer(page: import("playwright").Page) {
  const back = page.getByLabel("Back").first();
  const backVisible =
    (await back.count().catch(() => 0)) > 0 && (await back.isVisible().catch(() => false));
  if (backVisible) {
    await back.click({ force: true });
    return;
  }
  await page.goBack({ waitUntil: "domcontentloaded", timeout: 60_000 }).catch(() => undefined);
}

async function backToAccountant(page: import("playwright").Page, seed: AccReportSeed) {
  await leaveViewer(page);
  const view = await poll(
    `back-to-accountant:${seed.paymentId}`,
    async () => await classifyAccountantView(page, seed),
    20_000,
    250,
  ).catch(() => null);
  if (view) return view;

  await page.goto(`${baseUrl}${ACCOUNTANT_ROUTE}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await ensureAccountantFioSettled(page, 2_500).catch(() => false);
  await waitForAccountantSurface(page);
  return "list" as const;
}

async function backToAccountantList(page: import("playwright").Page, seed: AccReportSeed) {
  const view = await backToAccountant(page, seed);
  if (view === "list") return;

  const close = page.getByLabel("\u0417\u0430\u043a\u0440\u044b\u0442\u044c").first();
  await poll(
    `close-card:${seed.paymentId}:visible`,
    async () => ((await close.count()) > 0 && (await close.isVisible().catch(() => false)) ? true : null),
    10_000,
    250,
  );
  await close.click({ force: true });
  await poll(
    `back-to-accountant-list:${seed.paymentId}`,
    async () => {
      const body = await bodyText(page);
      const onAccountantRoute = page.url().includes(ACCOUNTANT_ROUTE) || page.url().endsWith("/accountant");
      return onAccountantRoute && body.includes(PAID_TAB_LABEL) && !body.includes(CARD_TITLE_LABEL) ? true : null;
    },
    20_000,
    250,
  ).catch(async () => {
    await page.goto(`${baseUrl}${ACCOUNTANT_ROUTE}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await ensureAccountantFioSettled(page, 2_500).catch(() => false);
    await waitForAccountantSurface(page);
  });
}

async function insertRequest(marker: string) {
  const result = await admin
    .from("requests")
    .insert({
      status: "\u0427\u0435\u0440\u043d\u043e\u0432\u0438\u043a",
      comment: `${marker}:request`,
      object_name: marker,
      note: marker,
    })
    .select("id")
    .single<{ id: string }>();
  if (result.error) throw result.error;
  return trim(result.data.id);
}

async function insertRequestItem(requestId: string, marker: string, index: number, amount: number) {
  const result = await admin
    .from("request_items")
    .insert({
      request_id: requestId,
      name_human: `${marker}:item:${index}`,
      qty: 1,
      uom: "pcs",
      rik_code: `${marker}:rik:${index}`,
      status: "\u0427\u0435\u0440\u043d\u043e\u0432\u0438\u043a",
      price: amount,
    } as Database["public"]["Tables"]["request_items"]["Insert"])
    .select("id")
    .single<{ id: string }>();
  if (result.error) throw result.error;
  return trim(result.data.id);
}

async function insertProposal(requestId: string, marker: string, invoiceNumber: string) {
  const result = await admin
    .from("proposals")
    .insert({
      request_id: requestId,
      status: "\u0427\u0435\u0440\u043d\u043e\u0432\u0438\u043a",
      supplier: `${marker}:supplier`,
      invoice_number: invoiceNumber,
      invoice_date: new Date().toISOString().slice(0, 10),
      invoice_currency: "KGS",
      invoice_amount: 0,
      sent_to_accountant_at: null,
    })
    .select("id")
    .single<{ id: string }>();
  if (result.error) throw result.error;
  return trim(result.data.id);
}

async function insertProposalItem(
  proposalId: string,
  requestItemId: string,
  marker: string,
  index: number,
  amount: number,
) {
  const result = await admin
    .from("proposal_items")
    .insert({
      proposal_id: proposalId,
      proposal_id_text: proposalId,
      request_item_id: requestItemId,
      name_human: `${marker}:item:${index}`,
      qty: 1,
      uom: "pcs",
      price: amount,
      rik_code: `${marker}:rik:${index}`,
      supplier: `${marker}:supplier`,
      status: "\u0423\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u043e",
    })
    .select("id")
    .single<{ id: number }>();
  if (result.error) throw result.error;
  return String(result.data.id);
}

async function promoteProposalToApproved(proposalId: string, amount: number) {
  const updateResult = await admin
    .from("proposals")
    .update({
      status: "\u0423\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u043e",
      sent_to_accountant_at: new Date().toISOString(),
      invoice_amount: amount,
      payment_status: "\u041a \u043e\u043f\u043b\u0430\u0442\u0435",
    })
    .eq("id", proposalId);
  if (updateResult.error) throw updateResult.error;
}

async function createPaymentForProposal(seed: {
  proposalId: string;
  proposalItemId: string;
  marker: string;
  invoiceNumber: string;
  amount: number;
}) {
  const rpc = await admin.rpc("accounting_pay_invoice_v1", {
    p_proposal_id: seed.proposalId,
    p_amount: seed.amount,
    p_accountant_fio: ACCOUNTANT_FIO_LABEL,
    p_purpose: `${seed.marker}:purpose`,
    p_method: "bank",
    p_client_mutation_id: `${seed.marker}:payment`,
    p_allocations: [
      {
        proposal_item_id: seed.proposalItemId,
        amount: seed.amount,
      },
    ],
    p_invoice_number: seed.invoiceNumber,
    p_invoice_date: new Date().toISOString().slice(0, 10),
    p_invoice_amount: seed.amount,
    p_invoice_currency: "KGS",
  });
  if (rpc.error) throw rpc.error;
  const payload = asRecord(rpc.data);
  const paymentId = asNumber(payload.payment_id ?? payload.paymentId, 0);
  if (paymentId <= 0) {
    throw new Error(`accounting_pay_invoice_v1 missing payment_id for ${seed.proposalId}`);
  }
  return paymentId;
}

async function seedPaidProposal(index: number): Promise<AccReportSeed> {
  const marker = `acc-report-final-web-${Date.now().toString(36)}-${index}`;
  const amount = 25 + index;
  const invoiceNumber = `${marker}:INV`;
  const requestId = await insertRequest(marker);
  const requestItemId = await insertRequestItem(requestId, marker, index, amount);
  const proposalId = await insertProposal(requestId, marker, invoiceNumber);
  const proposalItemId = await insertProposalItem(proposalId, requestItemId, marker, index, amount);
  await promoteProposalToApproved(proposalId, amount);
  const paymentId = await createPaymentForProposal({
    proposalId,
    proposalItemId,
    marker,
    invoiceNumber,
    amount,
  });
  const sourceResult = await admin.rpc("pdf_payment_source_v1", {
    p_payment_id: paymentId,
  });
  if (sourceResult.error) throw sourceResult.error;
  return {
    marker,
    requestId,
    requestItemIds: [requestItemId],
    proposalId,
    proposalItemIds: [proposalItemId],
    paymentId,
    supplierLabel: `${marker}:supplier`,
    invoiceNumber,
    amount,
  };
}

async function cleanupSeed(seed: AccReportSeed | null) {
  if (!seed) return;
  try {
    await admin
      .from("proposal_payment_allocations")
      .delete()
      .in("payment_id", [seed.paymentId])
      .throwOnError();
  } catch {}
  try {
    await admin
      .from("proposal_payments")
      .delete()
      .eq("id", seed.paymentId)
      .throwOnError();
  } catch {}
  try {
    await (admin as any)
      .from("accounting_pay_invoice_mutations_v1")
      .delete()
      .eq("proposal_id", seed.proposalId)
      .throwOnError();
  } catch {}
  try {
    await admin
      .from("proposal_items")
      .delete()
      .in("id", seed.proposalItemIds.map((value) => Number(value)))
      .throwOnError();
  } catch {}
  try {
    await admin
      .from("proposals")
      .delete()
      .eq("id", seed.proposalId)
      .throwOnError();
  } catch {}
  try {
    await admin
      .from("request_items")
      .delete()
      .in("id", seed.requestItemIds)
      .throwOnError();
  } catch {}
  try {
    await admin
      .from("requests")
      .delete()
      .eq("id", seed.requestId)
      .throwOnError();
  } catch {}
}

async function assertSeedsVisibleInPaidTab(seeds: AccReportSeed[]) {
  const result = await admin.rpc("accountant_inbox_scope_v1", {
    p_tab: PAID_TAB_LABEL,
    p_offset: 0,
    p_limit: 60,
  });
  if (result.error) throw result.error;
  const envelope = asRecord(result.data);
  const rows = Array.isArray(envelope.rows) ? envelope.rows.map(asRecord) : [];
  for (const seed of seeds) {
    const found = rows.some((row) => JSON.stringify(row).includes(seed.marker));
    if (!found) {
      throw new Error(`Seed ${seed.marker} was not visible in accountant_inbox_scope_v1(${PAID_TAB_LABEL})`);
    }
  }
}

function buildTimingMarkdown(summary: WebProofSummary) {
  const lines = [
    "# ACC_REPORT_FINAL Web Timing",
    "",
    `Status: ${summary.status}`,
    `Route: ${summary.route}`,
    `Base URL: ${summary.baseUrl}`,
    "",
    "## Runtime Proof",
    "",
    `- Accountant surface reached: ${summary.invariants.accountantSurfaceReached}`,
    `- Report path reachable: ${summary.invariants.reportPathReachable}`,
    `- Repeat cycle worked: ${summary.invariants.repeatCycleWorked}`,
    `- No page errors: ${summary.invariants.noPageErrors}`,
    `- No 4xx/5xx responses: ${summary.invariants.noBadResponses}`,
    `- No blocking console errors: ${summary.invariants.noBlockingConsoleErrors}`,
    `- No stuck loading: ${summary.invariants.noStuckLoading}`,
    "",
    "## Timing Summary",
    "",
  ];

  const modes: TimingMode[] = ["artifact_miss", "repeat", "artifact_hit", "warm"];
  for (const mode of modes) {
    const samples = summary.samples.filter((sample) => sample.mode === mode).map((sample) => sample.durationMs);
    lines.push(
      `- ${mode}: count=${samples.length}, median=${median(samples) ?? "n/a"} ms, max=${max(samples) ?? "n/a"} ms`,
    );
  }

  lines.push("", "## Samples", "");
  for (const sample of summary.samples) {
    lines.push(
      `- ${sample.mode} #${sample.sampleIndex}: paymentId=${sample.paymentId}, duration=${sample.durationMs} ms, cacheLayer=${sample.cacheLayer ?? "n/a"}, openDuration=${sample.openDurationMs ?? "n/a"} ms`,
    );
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

async function main() {
  let user: RuntimeTestUser | null = null;
  const seeds: AccReportSeed[] = [];
  const samples: TimingSample[] = [];
  const { browser, page, runtime } = await launchWebRuntime();
  let failureArtifact: { screenshot: string; html: string } | null = null;
  let screenshot: string | null = null;
  let accountantSurfaceReached = false;
  let reportPathReachable = false;
  let repeatCycleWorked = false;
  let noStuckLoading = false;

  try {
    for (let index = 1; index <= 3; index += 1) {
      seeds.push(await seedPaidProposal(index));
    }
    await assertSeedsVisibleInPaidTab(seeds);

    user = await createTempUser(admin, {
      role: "accountant",
      fullName: "ACC REPORT FINAL Web",
      emailPrefix: "acc.report.final.web",
    });

    await openAccountantRoute(page, user);
    await ensureAccountantFioSettled(page, 5_000).catch(() => false);
    await waitForAccountantSurface(page);
    accountantSurfaceReached = true;

    for (const [index, seed] of seeds.entries()) {
      await openSeedCard(page, seed);
      const miss = await clickReportAndCollect(page, seed);
      if (miss.readyEvent.result !== "success" || miss.readyEvent.cacheLayer !== "rebuild") {
        throw new Error(
          `artifact_miss expected success/rebuild for payment ${seed.paymentId}, got ${String(
            miss.readyEvent.result ?? "null",
          )}/${String(miss.readyEvent.cacheLayer ?? "null")}`,
        );
      }
      reportPathReachable = true;
      samples.push({
        platform: "web",
        mode: "artifact_miss",
        sampleIndex: index + 1,
        paymentId: seed.paymentId,
        proposalId: seed.proposalId,
        marker: seed.marker,
        sourceEvent: String(miss.readyEvent.event ?? ""),
        result: miss.readyEvent.result ?? null,
        cacheLayer: miss.readyEvent.cacheLayer ?? null,
        durationMs: asNumber(miss.readyEvent.durationMs, 0),
        openDurationMs: asNumber(miss.openEvent.durationMs, 0),
      });

      const repeatReturnView = await backToAccountant(page, seed);
      if (repeatReturnView !== "card") {
        await openSeedCard(page, seed);
      }
      const repeat = await clickReportAndCollect(page, seed);
      if (
        repeat.readyEvent.result !== "cache_hit" ||
        (repeat.readyEvent.cacheLayer !== "memory" && repeat.readyEvent.cacheLayer !== "storage")
      ) {
        throw new Error(
          `repeat expected cache_hit without rebuild for payment ${seed.paymentId}, got ${String(
            repeat.readyEvent.result ?? "null",
          )}/${String(repeat.readyEvent.cacheLayer ?? "null")}`,
        );
      }
      repeatCycleWorked = true;
      samples.push({
        platform: "web",
        mode: "repeat",
        sampleIndex: index + 1,
        paymentId: seed.paymentId,
        proposalId: seed.proposalId,
        marker: seed.marker,
        sourceEvent: String(repeat.readyEvent.event ?? ""),
        result: repeat.readyEvent.result ?? null,
        cacheLayer: repeat.readyEvent.cacheLayer ?? null,
        durationMs: asNumber(repeat.readyEvent.durationMs, 0),
        openDurationMs: asNumber(repeat.openEvent.durationMs, 0),
      });
      await backToAccountantList(page, seed);
    }

    for (const [index, seed] of seeds.entries()) {
      await page.goto(`${baseUrl}${ACCOUNTANT_ROUTE}`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await ensureAccountantFioSettled(page, 2_500).catch(() => false);
      await waitForAccountantSurface(page);
      await openSeedCard(page, seed);
      const hit = await clickReportAndCollect(page, seed);
      if (
        hit.readyEvent.result !== "cache_hit" ||
        (hit.readyEvent.cacheLayer !== "memory" && hit.readyEvent.cacheLayer !== "storage")
      ) {
        throw new Error(
          `artifact_hit expected cache_hit without rebuild for payment ${seed.paymentId}, got ${String(
            hit.readyEvent.result ?? "null",
          )}/${String(hit.readyEvent.cacheLayer ?? "null")}`,
        );
      }
      samples.push({
        platform: "web",
        mode: "artifact_hit",
        sampleIndex: index + 1,
        paymentId: seed.paymentId,
        proposalId: seed.proposalId,
        marker: seed.marker,
        sourceEvent: String(hit.readyEvent.event ?? ""),
        result: hit.readyEvent.result ?? null,
        cacheLayer: hit.readyEvent.cacheLayer ?? null,
        durationMs: asNumber(hit.readyEvent.durationMs, 0),
        openDurationMs: asNumber(hit.openEvent.durationMs, 0),
      });
      samples.push({
        platform: "web",
        mode: "warm",
        sampleIndex: index + 1,
        paymentId: seed.paymentId,
        proposalId: seed.proposalId,
        marker: seed.marker,
        sourceEvent: String(hit.openEvent.event ?? ""),
        result: hit.openEvent.result ?? null,
        cacheLayer: hit.readyEvent.cacheLayer ?? null,
        durationMs: asNumber(hit.openEvent.durationMs, 0),
        openDurationMs: asNumber(hit.openEvent.durationMs, 0),
      });
      await backToAccountantList(page, seed);
    }

    noStuckLoading = true;
    screenshot = `${artifactBase}.png`;
    await page.screenshot({
      path: path.join(projectRoot, screenshot),
      fullPage: true,
    });

    const summary: WebProofSummary = {
      status:
        accountantSurfaceReached &&
        reportPathReachable &&
        repeatCycleWorked &&
        noStuckLoading &&
        getBlockingConsoleErrors(runtime.console).length === 0 &&
        getBlockingBadResponses(runtime.badResponses).length === 0 &&
        runtime.pageErrors.length === 0
          ? "GREEN"
          : "NOT_GREEN",
      route: `${baseUrl}${ACCOUNTANT_ROUTE}`,
      baseUrl,
      paidTabLabel: PAID_TAB_LABEL,
      reportLabel: REPORT_BUTTON_LABEL,
      samples,
      seedPaymentIds: seeds.map((seed) => seed.paymentId),
      runtime: {
        pageErrors: runtime.pageErrors,
        badResponses: runtime.badResponses,
        consoleErrors: getBlockingConsoleErrors(runtime.console),
      },
      invariants: {
        accountantSurfaceReached,
        reportPathReachable,
        repeatCycleWorked,
        noPageErrors: runtime.pageErrors.length === 0,
        noBadResponses: getBlockingBadResponses(runtime.badResponses).length === 0,
        noBlockingConsoleErrors: getBlockingConsoleErrors(runtime.console).length === 0,
        noStuckLoading,
      },
      artifacts: {
        screenshot,
        failureArtifact,
      },
    };

    writeJsonArtifact(webRuntimeJsonPath, summary);
    writeJsonArtifact(timingSamplesPath, {
      generatedAt: new Date().toISOString(),
      samples,
    });
    writeTextArtifact(webTimingPath, buildTimingMarkdown(summary));
    console.log(JSON.stringify(summary, null, 2));
    if (summary.status !== "GREEN") process.exitCode = 1;
  } catch (error) {
    failureArtifact = await captureWebFailureArtifact(page, artifactBase);
    const summary: WebProofSummary = {
      status: "NOT_GREEN",
      route: `${baseUrl}${ACCOUNTANT_ROUTE}`,
      baseUrl,
      paidTabLabel: PAID_TAB_LABEL,
      reportLabel: REPORT_BUTTON_LABEL,
      samples,
      seedPaymentIds: seeds.map((seed) => seed.paymentId),
      runtime: {
        pageErrors: runtime.pageErrors,
        badResponses: runtime.badResponses,
        consoleErrors: getBlockingConsoleErrors(runtime.console),
      },
      invariants: {
        accountantSurfaceReached,
        reportPathReachable,
        repeatCycleWorked,
        noPageErrors: runtime.pageErrors.length === 0,
        noBadResponses: getBlockingBadResponses(runtime.badResponses).length === 0,
        noBlockingConsoleErrors: getBlockingConsoleErrors(runtime.console).length === 0,
        noStuckLoading,
      },
      artifacts: {
        screenshot,
        failureArtifact,
      },
    };
    writeJsonArtifact(webRuntimeJsonPath, {
      ...summary,
      error: error instanceof Error ? error.message : String(error),
    });
    writeJsonArtifact(timingSamplesPath, {
      generatedAt: new Date().toISOString(),
      samples,
      error: error instanceof Error ? error.message : String(error),
    });
    writeTextArtifact(
      webTimingPath,
      `${buildTimingMarkdown(summary)}\nFailure: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    console.error(error);
    process.exitCode = 1;
  } finally {
    await browser.close().catch(() => undefined);
    for (const seed of seeds) {
      await cleanupSeed(seed).catch(() => undefined);
    }
    await cleanupTempUser(admin, user).catch(() => undefined);
  }
}

void main();
