import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../src/lib/database.types";
import { createAndroidHarness } from "./_shared/androidHarness";
import {
  clearAndroidReactNativeLogcat,
  parseAndroidObservabilityEvents,
  readAndroidReactNativeLogcat,
  type AndroidObservabilityEvent,
} from "./_shared/androidObservability";
import {
  cleanupTempUser,
  createTempUser,
  createVerifierAdmin,
  type RuntimeTestUser,
} from "./_shared/testUserDiscipline";

type JsonRecord = Record<string, unknown>;

type AndroidNode = {
  text: string;
  contentDesc: string;
  resourceId: string;
  className: string;
  clickable: boolean;
  enabled: boolean;
  focused: boolean;
  bounds: string;
  hint: string;
  password: boolean;
};

type AndroidScreen = ReturnType<ReturnType<typeof createAndroidHarness>["dumpAndroidScreen"]>;

type AccReportSeed = {
  marker: string;
  requestId: string;
  requestItemIds: string[];
  proposalId: string;
  proposalItemIds: string[];
  paymentId: number;
  amount: number;
  invoiceNumber: string;
};

type TimingMode = "artifact_miss" | "repeat" | "artifact_hit" | "warm";

type TimingSample = {
  platform: "android";
  mode: TimingMode;
  sampleIndex: number;
  paymentId: number;
  proposalId: string;
  marker: string;
  result: string | null;
  durationMs: number;
  openDurationMs?: number | null;
};

type AndroidProofSummary = {
  status: "GREEN" | "BLOCKED" | "NOT_GREEN";
  route: string;
  samples: TimingSample[];
  seedPaymentIds: number[];
  invariants: {
    accountantSurfaceReached: boolean;
    reportPathReachable: boolean;
    repeatCycleWorked: boolean;
    noFatalOrAnr: boolean;
    processAlive: boolean;
    noStuckLoading: boolean;
  };
  preflight: unknown;
  recovery: unknown;
  artifacts: {
    finalXml: string | null;
    finalPng: string | null;
    failureArtifacts?: unknown;
  };
  failureReason?: string | null;
};

const projectRoot = process.cwd();
const artifactBase = "artifacts/ACC_REPORT_FINAL_android_runtime";
const androidTimingPath = path.join(projectRoot, "artifacts/ACC_REPORT_FINAL_android_timing.md");
const androidRuntimeJsonPath = path.join(projectRoot, `${artifactBase}.json`);
const timingSamplesPath = path.join(projectRoot, "artifacts/ACC_REPORT_FINAL_timing_samples.json");
const ACCOUNTANT_ROUTE = "rik:///office/accountant";
const ACCOUNTANT_FIO_LABEL = "acc_report_final_pdf";
const PAID_TAB_LABEL = "\u041e\u043f\u043b\u0430\u0447\u0435\u043d\u043e";
const REPORT_BUTTON_LABEL = "\u041e\u0442\u0447\u0451\u0442";
const androidDevClientPort = Number(process.env.ACC_REPORT_FINAL_ANDROID_DEV_PORT ?? "8081");
const admin = createVerifierAdmin("acc-report-final-android-verify") as SupabaseClient<Database>;
const harness = createAndroidHarness({
  projectRoot,
  devClientPort: androidDevClientPort,
  devClientStdoutPath: "artifacts/acc-report-final-android.stdout.log",
  devClientStderrPath: "artifacts/acc-report-final-android.stderr.log",
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const writeTextArtifact = (fullPath: string, content: string) => {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, "utf8");
};

const trim = (value: unknown) => String(value ?? "").trim();

function writeJson(relativePath: string, payload: unknown) {
  const fullPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1]! + sorted[middle]!) / 2)
    : sorted[middle]!;
}

function max(values: number[]) {
  return values.length > 0 ? Math.max(...values) : null;
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function asNumber(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function adb(args: string[]) {
  const result = spawnSync("adb", args, {
    cwd: projectRoot,
    encoding: "utf8",
    timeout: 45_000,
  });
  if (result.status !== 0) {
    throw new Error(`adb ${args.join(" ")} failed: ${String(result.stderr ?? result.stdout ?? "").trim()}`);
  }
  return String(result.stdout ?? "");
}

function readFullLogcat() {
  return adb(["logcat", "-d", "-v", "brief", "-t", "1200"]);
}

function fatalLines(logText: string) {
  return String(logText ?? "")
    .split(/\r?\n/)
    .filter((line) =>
      /FATAL EXCEPTION|ANR in|ReactNativeJS.*(?:Fatal|fatal)|AndroidRuntime.*FATAL/i.test(line),
    )
    .slice(0, 20);
}

function normalizeUiText(value: unknown) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function labelOf(node: AndroidNode) {
  return `${String(node.text || "")} ${String(node.contentDesc || "")} ${String(node.hint || "")} ${String(node.resourceId || "")}`.trim();
}

function containsUiText(source: unknown, ...needles: string[]) {
  const normalizedSource = normalizeUiText(source);
  return needles.some((needle) => {
    const normalizedNeedle = normalizeUiText(needle);
    return normalizedNeedle ? normalizedSource.includes(normalizedNeedle) : false;
  });
}

function findNode(nodes: AndroidNode[], predicate: (node: AndroidNode) => boolean) {
  return (
    nodes.find((node) => predicate(node) && node.enabled && node.clickable)
    ?? nodes.find((node) => predicate(node) && node.enabled)
    ?? null
  );
}

function isLoginSurface(xml: string) {
  return /Email|Login/i.test(xml) && /android\.widget\.EditText/i.test(xml);
}

function isAccountantSurface(xml: string) {
  return containsUiText(xml, PAID_TAB_LABEL, "\u041a \u043e\u043f\u043b\u0430\u0442\u0435", "\u0418\u0441\u0442\u043e\u0440\u0438\u044f");
}

function isFioModalSurface(xml: string) {
  return xml.includes("warehouse-fio-input") && xml.includes("warehouse-fio-confirm");
}

function getProcessAlive(packageName: string | null) {
  if (!packageName) return false;
  try {
    return Boolean(adb(["shell", "pidof", packageName]).trim());
  } catch {
    return false;
  }
}

async function poll<T>(
  label: string,
  fn: () => Promise<T | null> | T | null,
  timeoutMs = 45_000,
  delayMs = 700,
): Promise<T> {
  const startedAt = Date.now();
  let lastError: unknown = null;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const value = await fn();
      if (value != null) return value;
    } catch (error) {
      lastError = error;
    }
    await sleep(delayMs);
  }
  if (lastError) throw lastError;
  throw new Error(`poll timeout: ${label}`);
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
  const marker = `acc-report-final-android-${Date.now().toString(36)}-${index}`;
  const amount = 35 + index;
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
    amount,
    invoiceNumber,
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

async function openAccountantSurface(packageName: string | null, user: RuntimeTestUser, artifactName: string) {
  const routed = await harness.loginAndroidWithProtectedRoute({
    packageName,
    user,
    protectedRoute: ACCOUNTANT_ROUTE,
    artifactBase: artifactName,
    successPredicate: (xml) => isAccountantSurface(xml) || isFioModalSurface(xml),
    renderablePredicate: (xml) => isLoginSurface(xml) || isAccountantSurface(xml) || isFioModalSurface(xml),
    loginScreenPredicate: isLoginSurface,
  });
  return await maybeConfirmFio(routed);
}

function findFioInputNode(screen: AndroidScreen) {
  const nodes = harness.parseAndroidNodes(screen.xml) as AndroidNode[];
  return (
    nodes.find((node) => node.resourceId.includes("warehouse-fio-input"))
    ?? nodes.find(
      (node) =>
        node.enabled &&
        !node.password &&
        /android\.widget\.EditText/i.test(node.className),
    )
    ?? null
  );
}

function findFioConfirmNode(screen: AndroidScreen) {
  const nodes = harness.parseAndroidNodes(screen.xml) as AndroidNode[];
  return (
    nodes.find((node) => node.resourceId.includes("warehouse-fio-confirm") && node.enabled)
    ?? findNode(nodes, (node) => containsUiText(labelOf(node), "\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c", "\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044c"))
  );
}

async function maybeConfirmFio(screen: AndroidScreen) {
  if (!isFioModalSurface(screen.xml)) return screen;
  let current = screen;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const input = findFioInputNode(current);
    if (!input) throw new Error("Android accountant FIO modal input not found");
    if (trim(input.text) === ACCOUNTANT_FIO_LABEL) break;
    await harness.replaceAndroidFieldText(input, ACCOUNTANT_FIO_LABEL);
    await sleep(350);
    current = harness.dumpAndroidScreen(`acc-report-final-android-fio-typed-${attempt + 1}`);
  }
  const verifiedInput = findFioInputNode(current);
  if (!verifiedInput || trim(verifiedInput.text) !== ACCOUNTANT_FIO_LABEL) {
    throw new Error("Android accountant FIO modal value did not stabilize");
  }
  adb(["shell", "input", "keyevent", "4"]);
  await sleep(500);
  const confirm = await poll(
    "android-fio-confirm",
    async () => {
      const current = harness.dumpAndroidScreen("acc-report-final-android-fio");
      const node = findFioConfirmNode(current);
      return node ? { current, node } : null;
    },
    15_000,
    700,
  );
  harness.tapAndroidBounds(confirm.node.bounds);
  return await poll(
    "android-fio-closed",
    async () => {
      const current = harness.dumpAndroidScreen("acc-report-final-android-fio-closed");
      return isFioModalSurface(current.xml) ? null : current;
    },
    20_000,
    900,
  );
}

function findPaidTabNode(screen: AndroidScreen) {
  const nodes = harness.parseAndroidNodes(screen.xml) as AndroidNode[];
  return findNode(nodes, (node) => containsUiText(labelOf(node), PAID_TAB_LABEL));
}

function findSeedRowNode(screen: AndroidScreen, seed: AccReportSeed) {
  const nodes = harness.parseAndroidNodes(screen.xml) as AndroidNode[];
  return findNode(
    nodes,
    (node) =>
      node.clickable &&
      containsUiText(labelOf(node), seed.marker) &&
      !containsUiText(labelOf(node), REPORT_BUTTON_LABEL),
  );
}

function findReportButtonNode(screen: AndroidScreen) {
  const nodes = harness.parseAndroidNodes(screen.xml) as AndroidNode[];
  return findNode(nodes, (node) => containsUiText(labelOf(node), REPORT_BUTTON_LABEL));
}

async function ensurePaidTab(screen: AndroidScreen, seed: AccReportSeed, artifactBase: string) {
  if (findSeedRowNode(screen, seed)) return screen;
  const paidTab = findPaidTabNode(screen);
  if (!paidTab) {
    throw new Error("Android paid tab node not found");
  }
  harness.tapAndroidBounds(paidTab.bounds);
  return await poll(
    `${artifactBase}:paid-tab`,
    async () => {
      const current = harness.dumpAndroidScreen(`${artifactBase}-paid-tab`);
      return findSeedRowNode(current, seed) ? current : null;
    },
    30_000,
    1000,
  );
}

async function openSeedCard(screen: AndroidScreen, seed: AccReportSeed, artifactBase: string) {
  const paidTab = await ensurePaidTab(screen, seed, artifactBase);
  const rowNode = findSeedRowNode(paidTab, seed);
  if (!rowNode) {
    throw new Error(`Android accountant row for ${seed.marker} not found`);
  }
  harness.tapAndroidBounds(rowNode.bounds);
  return await poll(
    `${artifactBase}:card-open`,
    async () => {
      const current = harness.dumpAndroidScreen(`${artifactBase}-card`);
      return findReportButtonNode(current) && containsUiText(current.xml, seed.marker) ? current : null;
    },
    20_000,
    900,
  );
}

function waitForObservedEvent(
  label: string,
  predicate: (event: AndroidObservabilityEvent) => boolean,
  timeoutMs = 60_000,
) {
  return poll(
    label,
    async () => {
      const events = parseAndroidObservabilityEvents(readAndroidReactNativeLogcat());
      return events.find(predicate) ?? null;
    },
    timeoutMs,
    900,
  );
}

async function clickReportAndCollect(
  screen: AndroidScreen,
  seed: AccReportSeed,
  expectation: { result: "success" | "cache_hit" },
  artifactBase: string,
) {
  const reportButton = findReportButtonNode(screen);
  if (!reportButton) {
    throw new Error(`Android report button for ${seed.marker} not found`);
  }
  clearAndroidReactNativeLogcat();
  harness.tapAndroidBounds(reportButton.bounds);

  const readyEvent = await waitForObservedEvent(
    `${artifactBase}:ready-event`,
    (event) =>
      event.screen === "accountant" &&
      event.surface === "accountant_payment_report_pdf" &&
      event.event === "accountant_payment_report_pdf_ready" &&
      event.result === expectation.result,
  );
  const openEvent = await waitForObservedEvent(
    `${artifactBase}:open-event`,
    (event) =>
      event.screen === "accountant" &&
      event.surface === "pdf_open_performance" &&
      event.event === "pdf_open_latency" &&
      event.result === "success",
  );

  const fullLog = readFullLogcat();
  const fatal = fatalLines(fullLog);
  const viewerScreen = harness.dumpAndroidScreen(`${artifactBase}-viewer`);
  return {
    readyEvent,
    openEvent,
    fatal,
    viewerScreen,
  };
}

async function backToAccountant(seed: AccReportSeed, artifactBase: string) {
  harness.pressAndroidKey(4);
  await sleep(1500);
  return await poll(
    `${artifactBase}:back`,
    async () => {
      const current = harness.dumpAndroidScreen(`${artifactBase}-back`);
      if (isFioModalSurface(current.xml)) return await maybeConfirmFio(current);
      return isAccountantSurface(current.xml) && findSeedRowNode(current, seed) ? current : null;
    },
    30_000,
    1000,
  );
}

function buildTimingMarkdown(summary: AndroidProofSummary) {
  const lines = [
    "# ACC_REPORT_FINAL Android Timing",
    "",
    `Status: ${summary.status}`,
    `Route: ${summary.route}`,
    "",
    "## Runtime Proof",
    "",
    `- Accountant surface reached: ${summary.invariants.accountantSurfaceReached}`,
    `- Report path reachable: ${summary.invariants.reportPathReachable}`,
    `- Repeat cycle worked: ${summary.invariants.repeatCycleWorked}`,
    `- No fatal/ANR: ${summary.invariants.noFatalOrAnr}`,
    `- Process alive: ${summary.invariants.processAlive}`,
    `- No stuck loading: ${summary.invariants.noStuckLoading}`,
    "",
    "## Timing Summary",
    "",
  ];

  const modes: TimingMode[] = ["artifact_miss", "repeat", "artifact_hit", "warm"];
  for (const mode of modes) {
    const values = summary.samples.filter((sample) => sample.mode === mode).map((sample) => sample.durationMs);
    lines.push(
      `- ${mode}: count=${values.length}, median=${median(values) ?? "n/a"} ms, max=${max(values) ?? "n/a"} ms`,
    );
  }

  lines.push("", "## Samples", "");
  for (const sample of summary.samples) {
    lines.push(
      `- ${sample.mode} #${sample.sampleIndex}: paymentId=${sample.paymentId}, duration=${sample.durationMs} ms, result=${sample.result ?? "n/a"}, openDuration=${sample.openDurationMs ?? "n/a"} ms`,
    );
  }
  if (summary.failureReason) {
    lines.push("", `Failure: ${summary.failureReason}`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

async function mergeTimingSamples(androidSamples: TimingSample[]) {
  const fullPath = timingSamplesPath;
  let existing: { generatedAt?: string; samples?: unknown[] } = {};
  if (fs.existsSync(fullPath)) {
    existing = JSON.parse(fs.readFileSync(fullPath, "utf8")) as {
      generatedAt?: string;
      samples?: unknown[];
    };
  }
  const previousSamples = Array.isArray(existing.samples) ? existing.samples : [];
  writeJson("artifacts/ACC_REPORT_FINAL_timing_samples.json", {
    generatedAt: new Date().toISOString(),
    samples: [...previousSamples, ...androidSamples],
  });
}

async function main() {
  let user: RuntimeTestUser | null = null;
  const seeds: AccReportSeed[] = [];
  const samples: TimingSample[] = [];
  let finalScreen: AndroidScreen | null = null;
  let accountantSurfaceReached = false;
  let reportPathReachable = false;
  let repeatCycleWorked = false;
  let noStuckLoading = false;
  let noFatalOrAnr = true;
  let processAlive = false;
  let preflight: unknown = null;
  let recovery: unknown = null;
  let failureReason: string | null = null;

  try {
    for (let index = 1; index <= 3; index += 1) {
      seeds.push(await seedPaidProposal(index));
    }
    await assertSeedsVisibleInPaidTab(seeds);

    user = await createTempUser(admin, {
      role: "accountant",
      fullName: "ACC REPORT FINAL Android",
      emailPrefix: "acc.report.final.android",
    });

    const prepared = await harness.prepareAndroidRuntime({ clearApp: true, clearGms: false });
    preflight = prepared.preflight;
    recovery = harness.getRecoverySummary();
    let current = await openAccountantSurface(prepared.packageName, user, "acc-report-final-android-login");
    accountantSurfaceReached = true;

    for (const [index, seed] of seeds.entries()) {
      current = await openSeedCard(current, seed, `acc-report-final-android-miss-${index + 1}`);
      const miss = await clickReportAndCollect(
        current,
        seed,
        { result: "success" },
        `acc-report-final-android-miss-${index + 1}`,
      );
      reportPathReachable = true;
      noFatalOrAnr = noFatalOrAnr && miss.fatal.length === 0;
      samples.push({
        platform: "android",
        mode: "artifact_miss",
        sampleIndex: index + 1,
        paymentId: seed.paymentId,
        proposalId: seed.proposalId,
        marker: seed.marker,
        result: miss.readyEvent.result,
        durationMs: asNumber(miss.readyEvent.durationMs, 0),
        openDurationMs: asNumber(miss.openEvent.durationMs, 0),
      });
      current = await backToAccountant(seed, `acc-report-final-android-miss-${index + 1}`);

      current = await openSeedCard(current, seed, `acc-report-final-android-repeat-${index + 1}`);
      const repeat = await clickReportAndCollect(
        current,
        seed,
        { result: "cache_hit" },
        `acc-report-final-android-repeat-${index + 1}`,
      );
      repeatCycleWorked = true;
      noFatalOrAnr = noFatalOrAnr && repeat.fatal.length === 0;
      samples.push({
        platform: "android",
        mode: "repeat",
        sampleIndex: index + 1,
        paymentId: seed.paymentId,
        proposalId: seed.proposalId,
        marker: seed.marker,
        result: repeat.readyEvent.result,
        durationMs: asNumber(repeat.readyEvent.durationMs, 0),
        openDurationMs: asNumber(repeat.openEvent.durationMs, 0),
      });
      current = await backToAccountant(seed, `acc-report-final-android-repeat-${index + 1}`);
    }

    if (prepared.packageName) {
      adb(["shell", "am", "force-stop", prepared.packageName]);
      await sleep(1500);
    }

    current = await openAccountantSurface(prepared.packageName, user, "acc-report-final-android-warm-open");

    for (const [index, seed] of seeds.entries()) {
      current = await openSeedCard(current, seed, `acc-report-final-android-warm-${index + 1}`);
      const warm = await clickReportAndCollect(
        current,
        seed,
        { result: "cache_hit" },
        `acc-report-final-android-warm-${index + 1}`,
      );
      noFatalOrAnr = noFatalOrAnr && warm.fatal.length === 0;
      samples.push({
        platform: "android",
        mode: "artifact_hit",
        sampleIndex: index + 1,
        paymentId: seed.paymentId,
        proposalId: seed.proposalId,
        marker: seed.marker,
        result: warm.readyEvent.result,
        durationMs: asNumber(warm.readyEvent.durationMs, 0),
        openDurationMs: asNumber(warm.openEvent.durationMs, 0),
      });
      samples.push({
        platform: "android",
        mode: "warm",
        sampleIndex: index + 1,
        paymentId: seed.paymentId,
        proposalId: seed.proposalId,
        marker: seed.marker,
        result: warm.openEvent.result,
        durationMs: asNumber(warm.openEvent.durationMs, 0),
        openDurationMs: asNumber(warm.openEvent.durationMs, 0),
      });
      current = await backToAccountant(seed, `acc-report-final-android-warm-${index + 1}`);
    }

    finalScreen = current;
    processAlive = getProcessAlive(prepared.packageName);
    noStuckLoading = true;

    const summary: AndroidProofSummary = {
      status:
        accountantSurfaceReached &&
        reportPathReachable &&
        repeatCycleWorked &&
        noStuckLoading &&
        noFatalOrAnr &&
        processAlive
          ? "GREEN"
          : "NOT_GREEN",
      route: ACCOUNTANT_ROUTE,
      samples,
      seedPaymentIds: seeds.map((seed) => seed.paymentId),
      invariants: {
        accountantSurfaceReached,
        reportPathReachable,
        repeatCycleWorked,
        noFatalOrAnr,
        processAlive,
        noStuckLoading,
      },
      preflight,
      recovery,
      artifacts: {
        finalXml: finalScreen?.xmlPath ?? null,
        finalPng: finalScreen?.pngPath ?? null,
      },
      failureReason,
    };

    await mergeTimingSamples(samples);
    writeJson(`${artifactBase}.json`, summary);
    writeTextArtifact(androidTimingPath, buildTimingMarkdown(summary));
    console.log(JSON.stringify(summary, null, 2));
    if (summary.status !== "GREEN") process.exitCode = 1;
  } catch (error) {
    failureReason = error instanceof Error ? error.message : String(error);
    const failureArtifacts = harness.captureFailureArtifacts("acc-report-final-android-failure");
    const preparedPackageName = harness.detectAndroidPackage();
    processAlive = getProcessAlive(preparedPackageName);
    const summary: AndroidProofSummary = {
      status: accountantSurfaceReached ? "NOT_GREEN" : "BLOCKED",
      route: ACCOUNTANT_ROUTE,
      samples,
      seedPaymentIds: seeds.map((seed) => seed.paymentId),
      invariants: {
        accountantSurfaceReached,
        reportPathReachable,
        repeatCycleWorked,
        noFatalOrAnr,
        processAlive,
        noStuckLoading,
      },
      preflight,
      recovery: harness.getRecoverySummary(),
      artifacts: {
        finalXml: finalScreen?.xmlPath ?? null,
        finalPng: finalScreen?.pngPath ?? null,
        failureArtifacts,
      },
      failureReason,
    };
    await mergeTimingSamples(samples);
    writeJson(`${artifactBase}.json`, summary);
    writeTextArtifact(androidTimingPath, buildTimingMarkdown(summary));
    console.error(JSON.stringify(summary, null, 2));
    process.exitCode = 1;
  } finally {
    for (const seed of seeds) {
      await cleanupSeed(seed).catch(() => undefined);
    }
    await cleanupTempUser(admin, user).catch(() => undefined);
  }
}

void main();
