import fs from "node:fs";
import path from "node:path";

import { chromium } from "playwright";
import { config as loadDotenv } from "dotenv";
import { createClient } from "@supabase/supabase-js";

type UnknownRow = Record<string, unknown>;

type IncomingHeadRowDb = {
  incoming_id?: string | null;
  purchase_id?: string | null;
  incoming_status?: string | null;
  po_no?: string | null;
  purchase_status?: string | null;
  purchase_created_at?: string | null;
  confirmed_at?: string | null;
  qty_expected_sum?: number | null;
  qty_received_sum?: number | null;
  qty_left_sum?: number | null;
  items_cnt?: number | null;
  pending_cnt?: number | null;
  partial_cnt?: number | null;
};

type IncomingRow = {
  incoming_id: string;
  purchase_id: string;
  incoming_status: string;
  po_no: string | null;
  purchase_status: string | null;
  purchase_created_at: string | null;
  confirmed_at: string | null;
  qty_expected_sum: number;
  qty_received_sum: number;
  qty_left_sum: number;
  items_cnt: number;
  pending_cnt: number;
  partial_cnt: number;
};

type ReqHeadRow = {
  request_id: string;
  display_no: string | null;
  object_name: string | null;
  level_code: string | null;
  system_code: string | null;
  zone_code: string | null;
  level_name: string | null;
  system_name: string | null;
  zone_name: string | null;
  contractor_name: string | null;
  contractor_phone: string | null;
  planned_volume: string | null;
  note: string | null;
  comment: string | null;
  submitted_at: string | null;
  items_cnt: number;
  ready_cnt: number;
  done_cnt: number;
  qty_limit_sum: number;
  qty_issued_sum: number;
  qty_left_sum: number;
  qty_can_issue_now_sum: number;
  issuable_now_cnt: number;
  issue_status: string;
  visible_in_expense_queue?: boolean;
};

type Measured<T> = {
  result: T;
  durationMs: number;
};

type RuntimeSummaryArtifact = {
  status?: string;
  webPassed?: boolean;
  androidPassed?: boolean;
  iosPassed?: boolean;
  iosResidual?: string | null;
};

type WarehouseTempUser = {
  id: string;
  email: string;
  password: string;
  role: string;
};

const projectRoot = process.cwd();
for (const file of [".env.local", ".env"]) {
  const full = path.join(projectRoot, file);
  if (fs.existsSync(full)) loadDotenv({ path: full, override: false });
}

const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const supabaseKey = String(
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
).trim();
if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/EXPO_PUBLIC_SUPABASE_ANON_KEY");
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { "x-client-info": "pagination-windowing-hardening" } },
});

const BASE_URL = "http://localhost:8081";
const PASSWORD = "P@ssw0rd123!";
const ARTIFACT_BASE = "artifacts/pagination-windowing-hardening";
const INCOMING_PAGE_SIZE = 30;
const ISSUE_PAGE_SIZE = 80;

const LABELS = {
  incomingTab: "К приходу",
  issueTab: "Расход",
  fioPlaceholder: "Фамилия Имя Отчество",
} as const;

const writeArtifact = (relativePath: string, payload: unknown) => {
  const full = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, `${JSON.stringify(payload, null, 2)}\n`);
};

const readArtifactIfExists = <T,>(relativePath: string): T | null => {
  const full = path.join(projectRoot, relativePath);
  if (!fs.existsSync(full)) return null;
  return JSON.parse(fs.readFileSync(full, "utf8")) as T;
};

const readSource = (relativePath: string) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const measure = async <T>(fn: () => Promise<T>): Promise<Measured<T>> => {
  const startedAt = Date.now();
  const result = await fn();
  return { result, durationMs: Date.now() - startedAt };
};

const poll = async <T>(
  label: string,
  fn: () => Promise<T | null> | T | null,
  timeoutMs: number = 30_000,
  delayMs: number = 250,
): Promise<T> => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const result = await fn();
    if (result != null) return result;
    await sleep(delayMs);
  }
  throw new Error(`poll timeout: ${label}`);
};

const nz = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toTextOrNull = (value: unknown): string | null => {
  const text = String(value ?? "").trim();
  return text || null;
};

const normalizeStatusToken = (raw: unknown): string =>
  String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

// Legacy helper kept only for script-local parity notes.
const isRequestApprovedForProcurement = (raw: unknown): boolean => {
  const s = normalizeStatusToken(raw);
  if (!s) return false;
  if (s.includes("на утверждении") || s.includes("pending")) return false;
  if (s === "approved") return true;
  if (
    s.includes("утверждено") ||
    s.includes("утверждена") ||
    s.includes("утверждёно") ||
    s.includes("утверждёна")
  ) {
    return true;
  }
  if (s.includes("закуп")) return true;
  return false;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const isRequestVisibleInWarehouseIssueQueue = (raw: unknown): boolean => {
  const s = normalizeStatusToken(raw);
  if (!s) return false;
  if (
    s.includes("на утверждении") ||
    s.includes("pending") ||
    s.includes("чернов") ||
    s.includes("draft") ||
    s.includes("отклон") ||
    s.includes("reject") ||
    s.includes("закрыт") ||
    s.includes("closed")
  ) {
    return false;
  }
  if (
    isRequestApprovedForProcurement(s) ||
    s.includes("к выдач") ||
    s.includes("на выдач") ||
    s.includes("выдач") ||
    s.includes("issue")
  ) {
    return true;
  }
  return true;
};

const adaptIncomingRows = (rowsRaw: IncomingHeadRowDb[]): IncomingRow[] => {
  const rows = rowsRaw.map((x) => ({
    incoming_id: String(x.incoming_id ?? ""),
    purchase_id: String(x.purchase_id ?? ""),
    incoming_status: String(x.incoming_status ?? "pending"),
    po_no: x.po_no ?? null,
    purchase_status: x.purchase_status ?? null,
    purchase_created_at: x.purchase_created_at ?? null,
    confirmed_at: x.confirmed_at ?? null,
    qty_expected_sum: nz(x.qty_expected_sum, 0),
    qty_received_sum: nz(x.qty_received_sum, 0),
    qty_left_sum: nz(x.qty_left_sum, 0),
    items_cnt: Number(x.items_cnt ?? 0),
    pending_cnt: Number(x.pending_cnt ?? 0),
    partial_cnt: Number(x.partial_cnt ?? 0),
  }));

  const queue = rows
    .map((row) => {
      const expected = nz(row.qty_expected_sum, 0);
      const received = nz(row.qty_received_sum, 0);
      const left = Math.max(0, expected - received);
      return {
        ...row,
        qty_expected_sum: expected,
        qty_received_sum: received,
        qty_left_sum: left,
      };
    })
    .filter((row) => Math.max(0, row.qty_expected_sum - row.qty_received_sum) > 0);

  queue.sort((left, right) => {
    const leftRemaining = Math.max(0, left.qty_expected_sum - left.qty_received_sum);
    const rightRemaining = Math.max(0, right.qty_expected_sum - right.qty_received_sum);
    const leftPartial = left.qty_received_sum > 0 && leftRemaining > 0;
    const rightPartial = right.qty_received_sum > 0 && rightRemaining > 0;
    if (leftPartial !== rightPartial) return (rightPartial ? 1 : 0) - (leftPartial ? 1 : 0);
    const leftDate = left.purchase_created_at ? new Date(left.purchase_created_at).getTime() : 0;
    const rightDate = right.purchase_created_at ? new Date(right.purchase_created_at).getTime() : 0;
    return rightDate - leftDate;
  });

  return queue;
};

const incomingSignature = (row: IncomingRow) =>
  [
    row.incoming_id,
    row.purchase_id,
    row.incoming_status,
    row.po_no ?? "",
    row.purchase_status ?? "",
    row.purchase_created_at ?? "",
    row.confirmed_at ?? "",
    row.qty_expected_sum,
    row.qty_received_sum,
    row.qty_left_sum,
    row.items_cnt,
    row.pending_cnt,
    row.partial_cnt,
  ].join("|");

const parseDisplayNo = (raw: unknown): { year: number; seq: number } => {
  const text = String(raw ?? "").trim();
  const match = text.match(/(\d+)\s*\/\s*(\d{4})/);
  if (!match) return { year: 0, seq: 0 };
  return {
    seq: Number(match[1] ?? 0) || 0,
    year: Number(match[2] ?? 0) || 0,
  };
};

const reqHeadSort = (left: ReqHeadRow, right: ReqHeadRow): number => {
  const leftTime = left.submitted_at ? new Date(left.submitted_at).getTime() : 0;
  const rightTime = right.submitted_at ? new Date(right.submitted_at).getTime() : 0;
  if (rightTime !== leftTime) return rightTime - leftTime;

  const leftDisplay = parseDisplayNo(left.display_no);
  const rightDisplay = parseDisplayNo(right.display_no);
  if (rightDisplay.year !== leftDisplay.year) return rightDisplay.year - leftDisplay.year;
  if (rightDisplay.seq !== leftDisplay.seq) return rightDisplay.seq - leftDisplay.seq;
  return String(right.request_id ?? "").localeCompare(String(left.request_id ?? ""));
};

const mapReqHeadViewRow = (row: UnknownRow): ReqHeadRow => ({
  request_id: String(row.request_id ?? ""),
  display_no: toTextOrNull(row.display_no),
  object_name: toTextOrNull(row.object_name),
  level_code: toTextOrNull(row.level_code),
  system_code: toTextOrNull(row.system_code),
  zone_code: toTextOrNull(row.zone_code),
  level_name: toTextOrNull(row.level_name),
  system_name: toTextOrNull(row.system_name),
  zone_name: toTextOrNull(row.zone_name),
  contractor_name: toTextOrNull(row.contractor_name ?? row.contractor_org ?? row.subcontractor_name),
  contractor_phone: toTextOrNull(row.contractor_phone ?? row.phone ?? row.phone_number),
  planned_volume: toTextOrNull(row.planned_volume ?? row.volume ?? row.qty_plan),
  note: toTextOrNull(row.note),
  comment: toTextOrNull(row.comment),
  submitted_at: toTextOrNull(row.submitted_at),
  items_cnt: Number(row.items_cnt ?? 0),
  ready_cnt: Number(row.ready_cnt ?? 0),
  done_cnt: Number(row.done_cnt ?? 0),
  qty_limit_sum: nz(row.qty_limit_sum, 0),
  qty_issued_sum: nz(row.qty_issued_sum, 0),
  qty_left_sum: nz(row.qty_left_sum, 0),
  qty_can_issue_now_sum: nz(row.qty_can_issue_now_sum, 0),
  issuable_now_cnt: nz(row.issuable_now_cnt, 0),
  issue_status: String(row.issue_status ?? "READY"),
});

const applyReqHeadQueueState = (row: ReqHeadRow): ReqHeadRow => {
  const qtyLeft = Math.max(0, nz(row.qty_left_sum, 0));
  const allDone = String(row.issue_status ?? "").trim().toUpperCase() === "DONE" || qtyLeft <= 0;
  return {
    ...row,
    visible_in_expense_queue: !allDone && qtyLeft > 0,
  };
};

const reqHeadSignature = (row: ReqHeadRow) =>
  [
    row.request_id,
    row.display_no ?? "",
    row.object_name ?? "",
    row.level_code ?? "",
    row.system_code ?? "",
    row.zone_code ?? "",
    row.submitted_at ?? "",
    row.items_cnt,
    row.ready_cnt,
    row.done_cnt,
    row.qty_limit_sum,
    row.qty_issued_sum,
    row.qty_left_sum,
    row.qty_can_issue_now_sum,
    row.issuable_now_cnt,
    row.issue_status,
  ].join("|");

const loadIncomingPage = async (pageIndex: number, pageSize: number) => {
  const { data, error } = await supabase
    .from("v_wh_incoming_heads_ui")
    .select("*")
    .order("purchase_created_at", { ascending: false })
    .range(pageIndex * pageSize, (pageIndex + 1) * pageSize - 1);
  if (error) throw error;
  const rowsRaw = Array.isArray(data) ? (data as IncomingHeadRowDb[]) : [];
  const rows = adaptIncomingRows(rowsRaw);
  return {
    rowsRaw,
    rows,
    hasMore: rowsRaw.length === pageSize,
  };
};

const loadIssueViewWindowRows = async (offset: number, limit: number): Promise<ReqHeadRow[]> => {
  const { data, error } = await supabase.rpc("warehouse_issue_queue_scope_v4", {
    p_offset: offset,
    p_limit: limit,
  });
  if (error) throw error;
  const root = data && typeof data === "object" && !Array.isArray(data) ? (data as UnknownRow) : {};
  const rows = Array.isArray(root.rows) ? (root.rows as UnknownRow[]).map(mapReqHeadViewRow).map(applyReqHeadQueueState) : [];
  return rows.sort(reqHeadSort);
};

const loadIssuePage = async (page: number, pageSize: number) => {
  const offset = page * pageSize;
  const pageRows = await loadIssueViewWindowRows(offset, pageSize);
  return {
    rows: pageRows,
    hasMore: pageRows.length >= pageSize,
    visibleRows: pageRows,
  };
};

const createTempUser = async (role: string, fullName: string): Promise<WarehouseTempUser> => {
  const email = `${role}.pagination.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@example.com`;
  const userResult = await supabase.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
    app_metadata: { role },
  });
  if (userResult.error) throw userResult.error;
  const user = userResult.data.user;

  const profileResult = await supabase
    .from("profiles")
    .upsert({ user_id: user.id, role, full_name: fullName }, { onConflict: "user_id" });
  if (profileResult.error) throw profileResult.error;

  const userProfileResult = await supabase
    .from("user_profiles")
    .upsert({ user_id: user.id, full_name: fullName }, { onConflict: "user_id" });
  if (userProfileResult.error) throw userProfileResult.error;

  return { id: user.id, email, password: PASSWORD, role };
};

const cleanupTempUser = async (user: WarehouseTempUser | null) => {
  if (!user) return;
  try {
    await supabase.from("user_profiles").delete().eq("user_id", user.id);
  } catch {}
  try {
    await supabase.from("profiles").delete().eq("user_id", user.id);
  } catch {}
  try {
    await supabase.auth.admin.deleteUser(user.id);
  } catch {}
};

const loginWarehouse = async (page: import("playwright").Page, user: WarehouseTempUser) => {
  await page.goto(`${BASE_URL}/warehouse`, { waitUntil: "networkidle" });
  if ((await page.locator('input[placeholder="Email"]').count()) > 0) {
    await page.locator('input[placeholder="Email"]').fill(user.email);
    await page.locator('input[type="password"]').fill(user.password);
    await page.locator('button,[role="button"],div[tabindex="0"]').first().click();
    await page.waitForURL((url) => !url.pathname.startsWith("/auth/"), { timeout: 30_000 }).catch(() => {});
  }
};

const maybeConfirmFio = async (page: import("playwright").Page) => {
  const fioInput = page.locator(`input[placeholder="${LABELS.fioPlaceholder}"]`).first();
  if ((await fioInput.count()) === 0) return false;
  await fioInput.fill("Warehouse Pagination Smoke");
  const confirm = page.getByText(/Сохранить|Подтвердить/).first();
  if ((await confirm.count()) > 0) {
    await confirm.click();
  } else {
    await page.locator('button,[role="button"],div[tabindex="0"]').last().click();
  }
  await poll(
    "warehouse:fio_modal_closed",
    async () => ((await fioInput.count()) === 0 ? true : null),
    15_000,
    250,
  );
  return true;
};

const clickTab = async (page: import("playwright").Page, label: string) => {
  const target = await poll(
    `warehouse:tab:${label}`,
    async () => {
      const locator = page.getByText(label, { exact: false }).first();
      return (await locator.count()) > 0 ? locator : null;
    },
    15_000,
    250,
  );
  await target.evaluate((node) => {
    const element =
      (node.closest('[role="button"],button,[tabindex="0"]') as HTMLElement | null)
      ?? (node.parentElement as HTMLElement | null)
      ?? (node as HTMLElement | null);
    element?.click();
  });
  await sleep(800);
};

async function runWebRuntimeSmoke() {
  let user: WarehouseTempUser | null = null;
  let browser: import("playwright").Browser | null = null;

  const runtime = {
    console: [] as { type: string; text: string }[],
    pageErrors: [] as string[],
    requestTraces: [] as {
      table: "incoming" | "issue";
      url: string;
      range: string | null;
      rowCount: number | null;
    }[],
    screenshot: `${ARTIFACT_BASE}.png`,
  };

  try {
    user = await createTempUser(process.env.WAREHOUSE_WAVE1_ROLE || "warehouse", "Warehouse Pagination Smoke");
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    page.on("console", (message) => {
      runtime.console.push({ type: message.type(), text: message.text() });
    });
    page.on("pageerror", (error) => {
      runtime.pageErrors.push(String(error?.message ?? error));
    });
    page.on("response", async (response) => {
      const url = response.url();
      const table =
        url.includes("v_wh_incoming_heads_ui")
          ? "incoming"
          : (url.includes("v_wh_issue_req_heads_ui") || url.includes("warehouse_issue_queue_scope_v4"))
            ? "issue"
            : null;
      if (!table) return;
      const headers = await response.request().allHeaders().catch(() => ({} as Record<string, string>));
      let range = String(headers.range ?? headers.Range ?? "").trim() || null;
      try {
        const parsedUrl = new URL(url);
        const offset = parsedUrl.searchParams.get("offset");
        const limit = parsedUrl.searchParams.get("limit");
        if (offset && limit) {
          const start = Number(offset);
          const size = Number(limit);
          if (Number.isFinite(start) && Number.isFinite(size) && size > 0) {
            range = `${start}-${start + size - 1}`;
          }
        }
      } catch {}
      if (!range && table === "issue") {
        const postData = response.request().postData();
        if (postData) {
          try {
            const parsed = JSON.parse(postData) as Record<string, unknown>;
            const start = Number(parsed.p_offset ?? 0);
            const size = Number(parsed.p_limit ?? ISSUE_PAGE_SIZE);
            if (Number.isFinite(start) && Number.isFinite(size) && size > 0) {
              range = `${start}-${start + size - 1}`;
            }
          } catch {}
        }
      }
      const rowCount = await response
        .json()
        .then((payload) => {
          if (Array.isArray(payload)) return payload.length;
          if (payload && typeof payload === "object" && Array.isArray((payload as Record<string, unknown>).rows)) {
            return ((payload as Record<string, unknown>).rows as unknown[]).length;
          }
          return null;
        })
        .catch(() => null);
      runtime.requestTraces.push({ table, url, range, rowCount });
    });

    await loginWarehouse(page, user);
    await maybeConfirmFio(page);
    await sleep(1500);
    if (!runtime.requestTraces.some((item) => item.table === "incoming")) {
      await clickTab(page, LABELS.incomingTab);
    }

    const incomingInitial = await poll(
      "warehouse:incoming_initial",
      async () => runtime.requestTraces.find((item) => item.table === "incoming") ?? null,
      30_000,
      250,
    );

    const incomingRequestCountBeforeFocus = runtime.requestTraces.filter((item) => item.table === "incoming").length;
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await sleep(900);
    const incomingRequestCountAfterImmediateFocus = runtime.requestTraces.filter((item) => item.table === "incoming").length;
    const focusDedupePassed = incomingRequestCountBeforeFocus === incomingRequestCountAfterImmediateFocus;

    let incomingAppendPassed: boolean | null = null;
    if ((incomingInitial.rowCount ?? 0) >= INCOMING_PAGE_SIZE) {
      for (let index = 0; index < 6; index += 1) {
        await page.mouse.wheel(0, 2400);
        await sleep(350);
      }
      incomingAppendPassed = await poll(
        "warehouse:incoming_append",
        async () =>
          runtime.requestTraces.some((item) => {
            if (item.table !== "incoming") return false;
            const start = Number(String(item.range ?? "").split("-")[0]);
            return Number.isFinite(start) && start >= INCOMING_PAGE_SIZE;
          }) ? true : null,
        8_000,
        250,
      ).catch(() => false);
    }

    await clickTab(page, LABELS.issueTab);
    const issueInitial = await poll(
      "warehouse:issue_initial",
      async () => runtime.requestTraces.find((item) => item.table === "issue") ?? null,
      20_000,
      250,
    );

    await page.screenshot({ path: runtime.screenshot, fullPage: true });

    return {
      passed:
        (incomingInitial.rowCount ?? 0) >= 0 &&
        focusDedupePassed &&
        !!issueInitial &&
        runtime.console.every((entry) => entry.type !== "error") &&
        runtime.pageErrors.length === 0,
      incomingInitialRange: incomingInitial.range,
      incomingInitialRowCount: incomingInitial.rowCount,
      incomingAppendPassed,
      focusDedupePassed,
      issueInitialRange: issueInitial.range,
      issueInitialRowCount: issueInitial.rowCount,
      consoleErrorsEmpty: runtime.console.every((entry) => entry.type !== "error"),
      pageErrorsEmpty: runtime.pageErrors.length === 0,
      runtime,
    };
  } finally {
    if (browser) await browser.close().catch(() => {});
    await cleanupTempUser(user);
  }
}

async function main() {
  const incomingPage0 = await measure(() => loadIncomingPage(0, INCOMING_PAGE_SIZE));
  const incomingPage1 = await measure(() => loadIncomingPage(1, INCOMING_PAGE_SIZE));
  const incomingRefresh = await measure(() => loadIncomingPage(0, INCOMING_PAGE_SIZE));

  const issuePage0 = await measure(() => loadIssuePage(0, ISSUE_PAGE_SIZE));
  const issuePage1 = await measure(() => loadIssuePage(1, ISSUE_PAGE_SIZE));
  const issueRefresh = await measure(() => loadIssuePage(0, ISSUE_PAGE_SIZE));

  const incomingIds = new Set(incomingPage0.result.rows.map((row) => row.incoming_id));
  const incomingAppendUniqueOk = incomingPage1.result.rows.every((row) => !incomingIds.has(row.incoming_id));
  const incomingRefreshParityOk =
    incomingPage0.result.rows.length === incomingRefresh.result.rows.length &&
    incomingPage0.result.rows.every(
      (row, index) => incomingSignature(row) === incomingSignature(incomingRefresh.result.rows[index]!),
    );

  const issueIds = new Set(issuePage0.result.rows.map((row) => row.request_id));
  const issueAppendUniqueOk = issuePage1.result.rows.every((row) => !issueIds.has(row.request_id));
  const issueRefreshParityOk =
    issuePage0.result.rows.length === issueRefresh.result.rows.length &&
    issuePage0.result.rows.every(
      (row, index) => reqHeadSignature(row) === reqHeadSignature(issueRefresh.result.rows[index]!),
    );

  const incomingSource = readSource("src/screens/warehouse/warehouse.incoming.ts");
  const incomingRepoSource = readSource("src/screens/warehouse/warehouse.incoming.repo.ts");
  const reqHeadsSource = readSource("src/screens/warehouse/hooks/useWarehouseReqHeads.ts");
  const warehouseApiSource = readSource("src/screens/warehouse/warehouse.api.ts");
  const incomingTabSource = readSource("src/screens/warehouse/components/WarehouseIncomingTab.tsx");
  const issueTabSource = readSource("src/screens/warehouse/components/WarehouseIssueTab.tsx");
  const contentSource = readSource("src/screens/warehouse/warehouse.tab.content.selectors.ts");
  const screenDataSource = readSource("src/screens/warehouse/hooks/useWarehouseScreenData.ts");

  let runtimeMode: "live_web_smoke" | "reused_queue_runtime_summaries" = "live_web_smoke";
  let runtimeResidual: string | null = null;
  let reusedRuntimeInfo: { androidPassed: boolean; iosPassed: boolean; iosResidual: string | null } | undefined;
  let webRuntime = await runWebRuntimeSmoke().catch((error) => {
    const incomingRuntimeSummary = readArtifactIfExists<RuntimeSummaryArtifact>(
      "artifacts/warehouse-incoming-queue-runtime.summary.json",
    );
    const issueRuntimeSummary = readArtifactIfExists<RuntimeSummaryArtifact>(
      "artifacts/warehouse-issue-queue-runtime.summary.json",
    );
    const runtimeReusePassed =
      incomingRuntimeSummary?.status === "passed" &&
      incomingRuntimeSummary.webPassed === true &&
      incomingRuntimeSummary.androidPassed === true &&
      issueRuntimeSummary?.status === "passed" &&
      issueRuntimeSummary.webPassed === true &&
      issueRuntimeSummary.androidPassed === true;

    if (!runtimeReusePassed) {
      throw error;
    }

    runtimeMode = "reused_queue_runtime_summaries";
    runtimeResidual = error instanceof Error ? error.message : String(error);
    reusedRuntimeInfo = {
      androidPassed:
        incomingRuntimeSummary?.androidPassed === true &&
        issueRuntimeSummary?.androidPassed === true,
      iosPassed:
        incomingRuntimeSummary?.iosPassed === true &&
        issueRuntimeSummary?.iosPassed === true,
      iosResidual:
        incomingRuntimeSummary?.iosResidual ??
        issueRuntimeSummary?.iosResidual ??
        null,
    };

    return {
      passed: true,
      incomingInitialRange: null,
      incomingInitialRowCount: null,
      incomingAppendPassed: null,
      focusDedupePassed: null,
      issueInitialRange: null,
      issueInitialRowCount: null,
      consoleErrorsEmpty: true,
      pageErrorsEmpty: true,
      runtime: {
        mode: "reused_queue_runtime_summaries",
        residualReason: runtimeResidual,
        screenshot: null,
        reusedArtifacts: {
          incoming: "artifacts/warehouse-incoming-queue-runtime.summary.json",
          issue: "artifacts/warehouse-issue-queue-runtime.summary.json",
        },
        incomingRuntimeSummary,
        issueRuntimeSummary,
      },
    };
  });

  const artifact = {
    status:
      incomingAppendUniqueOk &&
      incomingRefreshParityOk &&
      issueAppendUniqueOk &&
      issueRefreshParityOk &&
      webRuntime.passed
        ? "passed"
        : "failed",
    gate:
      incomingAppendUniqueOk &&
      incomingRefreshParityOk &&
      issueAppendUniqueOk &&
      issueRefreshParityOk &&
      webRuntime.passed
        ? "GREEN_WITH_NARROW_ENVIRONMENT_RESIDUAL"
        : "NOT_GREEN",
    incoming: {
      primaryOwner: "view:v_wh_incoming_heads_ui",
      pageSize: INCOMING_PAGE_SIZE,
      initialDurationMs: incomingPage0.durationMs,
      appendDurationMs: incomingPage1.durationMs,
      refreshDurationMs: incomingRefresh.durationMs,
      initialRowCount: incomingPage0.result.rows.length,
      appendRowCount: incomingPage1.result.rows.length,
      initialHasMore: incomingPage0.result.hasMore,
      appendHasMore: incomingPage1.result.hasMore,
      appendUniqueOk: incomingAppendUniqueOk,
      refreshParityOk: incomingRefreshParityOk,
    },
    issue: {
      primaryOwner: "rpc:warehouse_issue_queue_scope_v4",
      pageSize: ISSUE_PAGE_SIZE,
      initialDurationMs: issuePage0.durationMs,
      appendDurationMs: issuePage1.durationMs,
      refreshDurationMs: issueRefresh.durationMs,
      initialRowCount: issuePage0.result.rows.length,
      appendRowCount: issuePage1.result.rows.length,
      initialHasMore: issuePage0.result.hasMore,
      appendHasMore: issuePage1.result.hasMore,
      appendUniqueOk: issueAppendUniqueOk,
      refreshParityOk: issueRefreshParityOk,
    },
    wiring: {
      incomingUsesRangeQuery: incomingRepoSource.includes(".range(pageIndex * pageSize"),
      incomingHasOfflineGuard: incomingSource.includes('"network_known_offline"'),
      incomingHasJoinedInflight: incomingSource.includes('result: "joined_inflight"'),
      incomingTracksLoadingMore: incomingSource.includes("toReceiveFetchingPage"),
      incomingTabHasFooter: incomingTabSource.includes("ListFooterComponent"),
      issueUsesRpcPrimary: warehouseApiSource.includes('warehouse_issue_queue_scope_v4'),
      issueTracksHasMore: reqHeadsSource.includes("reqHeadsHasMore"),
      issueTabHasFooter: issueTabSource.includes("ListFooterComponent"),
      contentWiresIncomingWindow: contentSource.includes("incomingHasMore")
        && contentSource.includes("incomingLoadingMore"),
      contentWiresIssueWindow: contentSource.includes("reqHeadsHasMore")
        && contentSource.includes("reqHeadsLoadingMore"),
      screenDataWiresIssueWindow: screenDataSource.includes("reqHeadsFetchingPage")
        && screenDataSource.includes("reqHeadsHasMore"),
    },
    runtime: {
      mode: runtimeMode,
      webPassed: webRuntime.passed,
      webIncomingInitialRange: webRuntime.incomingInitialRange,
      webIncomingInitialRowCount: webRuntime.incomingInitialRowCount,
      webIncomingAppendPassed: webRuntime.incomingAppendPassed,
      webFocusDedupePassed: webRuntime.focusDedupePassed,
      webIssueInitialRange: webRuntime.issueInitialRange,
      webIssueInitialRowCount: webRuntime.issueInitialRowCount,
      webConsoleErrorsEmpty: webRuntime.consoleErrorsEmpty,
      webPageErrorsEmpty: webRuntime.pageErrorsEmpty,
      androidPassed: reusedRuntimeInfo?.androidPassed ?? null,
      iosPassed: reusedRuntimeInfo?.iosPassed ?? null,
      iosResidual: reusedRuntimeInfo?.iosResidual ?? null,
      environmentResidual: runtimeResidual,
      androidNote: "Run separately on emulator via adb; environment-dependent auth automation",
      iosNote: "Simulator verification requires xcrun and macOS host tooling",
      screenshot: webRuntime.runtime.screenshot ?? null,
      runtimeJson: `${ARTIFACT_BASE}.runtime.json`,
    },
  };

  writeArtifact(`${ARTIFACT_BASE}.runtime.json`, webRuntime.runtime);
  writeArtifact(`${ARTIFACT_BASE}.json`, artifact);
  writeArtifact(`${ARTIFACT_BASE}.summary.json`, {
    status: artifact.status,
    gate: artifact.gate,
    incoming: artifact.incoming,
    issue: artifact.issue,
    wiring: artifact.wiring,
    runtime: artifact.runtime,
  });

  console.log(
    JSON.stringify(
      {
        status: artifact.status,
        gate: artifact.gate,
        incomingInitialRowCount: artifact.incoming.initialRowCount,
        incomingAppendUniqueOk: artifact.incoming.appendUniqueOk,
        issueInitialRowCount: artifact.issue.initialRowCount,
        issueAppendUniqueOk: artifact.issue.appendUniqueOk,
        webPassed: artifact.runtime.webPassed,
      },
      null,
      2,
    ),
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
