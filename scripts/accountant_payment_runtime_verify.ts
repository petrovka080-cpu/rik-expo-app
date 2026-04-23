import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../src/lib/database.types";
import { createAndroidHarness } from "./_shared/androidHarness";
import { createTempUser, cleanupTempUser, createVerifierAdmin, type RuntimeTestUser } from "./_shared/testUserDiscipline";

const projectRoot = process.cwd();
const artifactPath = "artifacts/accountant-payment-runtime-proof.json";
const androidDevClientPort = Number(process.env.ACCOUNTANT_ANDROID_DEV_PORT ?? "8081");
const admin = createVerifierAdmin("accountant-payment-runtime-verify") as SupabaseClient<Database>;
const harness = createAndroidHarness({ projectRoot, devClientPort: androidDevClientPort });
const ACCOUNTANT_TO_PAY_TAB = "К оплате";

type SeedBundle = {
  marker: string;
  requestId: string;
  proposalId: string;
  requestItemIds: string[];
  proposalItemIds: string[];
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const trim = (value: unknown) => String(value ?? "").trim();
const describeError = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") return JSON.stringify(error);
  return String(error);
};

const writeJson = (relativePath: string, payload: unknown) => {
  const fullPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
};

function adb(args: string[]) {
  const result = spawnSync("adb", args, {
    cwd: projectRoot,
    encoding: "utf8",
    timeout: 30_000,
  });
  if (result.status !== 0) {
    throw new Error(`adb ${args.join(" ")} failed: ${String(result.stderr || result.stdout).trim()}`);
  }
  return String(result.stdout ?? "");
}

function clearAndroidLogcat() {
  adb(["logcat", "-c"]);
}

function readAndroidLogcat() {
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

async function typeAsciiLowercaseByKeyEvents(value: string) {
  const keyCodes: Record<string, number> = {
    a: 29,
    b: 30,
    c: 31,
    d: 32,
    e: 33,
    f: 34,
    g: 35,
    h: 36,
    i: 37,
    j: 38,
    k: 39,
    l: 40,
    m: 41,
    n: 42,
    o: 43,
    p: 44,
    q: 45,
    r: 46,
    s: 47,
    t: 48,
    u: 49,
    v: 50,
    w: 51,
    x: 52,
    y: 53,
    z: 54,
  };
  for (const char of value.toLowerCase()) {
    const code = keyCodes[char];
    if (!code) continue;
    adb(["shell", "input", "keyevent", String(code)]);
    await sleep(100);
  }
}

function isLoginSurface(xml: string) {
  return /android\.widget\.EditText/i.test(xml) && /Email|Login|Р’РѕР№С‚Рё|Р вЂ™Р С•Р в„–РЎвЂљР С‘/i.test(xml);
}

function isAccountantSurface(xml: string) {
  return (
    xml.includes("Бухгалтер") ||
    xml.includes("Рљ РѕРїР»Р°С‚Рµ") ||
    xml.includes("Р§Р°СЃС‚РёС‡РЅРѕ") ||
    xml.includes("РћРїР»Р°С‡РµРЅРѕ") ||
    xml.includes("Excel") ||
    xml.includes("Уведомления")
  );
}

function isPaymentEntrySurface(xml: string, marker: string) {
  if (
    xml.includes(marker) &&
    (xml.includes("payment-form-rest") ||
      xml.includes("payment-form-mode-full") ||
      xml.includes("payment-form-mode-partial"))
  ) {
    return true;
  }
  return (
    xml.includes(marker) &&
    (xml.includes("Р¤РРћ Р±СѓС…РіР°Р»С‚РµСЂР°") ||
      xml.includes("РџРѕСЃС‚Р°РІС‰РёРє") ||
      xml.includes("РќРѕРјРµСЂ СЃС‡С‘С‚Р°") ||
      xml.includes("Р‘Р°РЅРє") ||
      xml.includes("MAX"))
  );
}

function isProfileSurface(xml: string, user: RuntimeTestUser | null) {
  return Boolean(user?.email && xml.includes(user.email)) || xml.includes("Access Summary") || xml.includes("Identity");
}

function isFioModalSurface(xml: string) {
  return xml.includes("warehouse-fio-input") && xml.includes("warehouse-fio-confirm");
}

type AndroidScreen = ReturnType<typeof harness.dumpAndroidScreen>;

function rpcEnvelopeRows(value: unknown): Record<string, unknown>[] {
  if (!value || typeof value !== "object") return [];
  const rows = (value as { rows?: unknown }).rows;
  return Array.isArray(rows) ? rows.filter((row): row is Record<string, unknown> => !!row && typeof row === "object") : [];
}

async function assertSeedVisibleInAccountantRpc(seed: SeedBundle) {
  const result = await admin.rpc("accountant_inbox_scope_v1", {
    p_tab: ACCOUNTANT_TO_PAY_TAB,
    p_offset: 0,
    p_limit: 40,
  });
  if (result.error) throw result.error;
  const rows = rpcEnvelopeRows(result.data);
  const matched = rows.some((row) => JSON.stringify(row).includes(seed.marker));
  if (!matched) {
    throw new Error(
      `Seed proposal ${seed.proposalId} was not visible in accountant_inbox_scope_v1(${ACCOUNTANT_TO_PAY_TAB})`,
    );
  }
  const meta = result.data && typeof result.data === "object" ? (result.data as { meta?: unknown }).meta : null;
  return {
    rowCount: rows.length,
    meta: meta && typeof meta === "object" ? meta : null,
  };
}

async function openAndroidLoginSurface(packageName: string | null) {
  return harness.openAndroidRoute({
    packageName,
    routes: ["rik:///auth/login", "rik://auth/login", "rik:///sign-in"],
    artifactBase: "accountant-payment-runtime-auth-login",
    predicate: isLoginSurface,
    renderablePredicate: isLoginSurface,
    loginScreenPredicate: isLoginSurface,
    timeoutMs: 45_000,
    delayMs: 1200,
  });
}

function findFioInputNode(screen: AndroidScreen) {
  return (
    harness
      .parseAndroidNodes(screen.xml)
      .find(
        (node) =>
          node.resourceId.includes("warehouse-fio-input") ||
          (node.enabled && !node.password && /android\.widget\.EditText/i.test(node.className)),
      ) ?? null
  );
}

function findFioConfirmNode(screen: AndroidScreen) {
  const nodes = harness.parseAndroidNodes(screen.xml);
  const explicit = nodes.find((node) => node.resourceId.includes("warehouse-fio-confirm"));
  if (explicit?.enabled && explicit.clickable) return explicit;
  return (
    nodes.find((node) => {
      if (!node.enabled || !node.clickable) return false;
      const match = node.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
      if (!match) return false;
      const left = Number(match[1]);
      const top = Number(match[2]);
      const right = Number(match[3]);
      const bottom = Number(match[4]);
      return left <= 160 && top >= 1300 && right >= 900 && bottom <= 1650;
    }) ?? null
  );
}

async function waitForFioConfirmNode(screen: AndroidScreen, artifactBase: string) {
  let current = screen;
  let confirm = findFioConfirmNode(current);
  for (let attempt = 0; !confirm && attempt < 8; attempt += 1) {
    await sleep(750);
    current = harness.dumpAndroidScreen(`${artifactBase}-${attempt + 1}`);
    confirm = findFioConfirmNode(current);
  }
  return { screen: current, confirm };
}

async function maybeConfirmFio(
  screen: AndroidScreen,
  fioLabel: string,
): Promise<{ screen: AndroidScreen; fioConfirmed: boolean }> {
  if (!isFioModalSurface(screen.xml)) return { screen, fioConfirmed: false };
  let working = screen;
  let input = findFioInputNode(working);
  if (!input) throw new Error("Accountant FIO modal was visible but input node was not found");

  const strategies: Array<(target: NonNullable<ReturnType<typeof findFioInputNode>>) => Promise<void>> = [
    async (target) => {
      await harness.replaceAndroidFieldText(target, fioLabel);
    },
    async (target) => {
      harness.tapAndroidBounds(target.bounds);
      await sleep(900);
      harness.typeAndroidText(fioLabel);
      await sleep(500);
    },
    async (target) => {
      harness.tapAndroidBounds(target.bounds);
      await sleep(900);
      await typeAsciiLowercaseByKeyEvents(fioLabel);
      await sleep(500);
    },
  ];

  let confirm = null as ReturnType<typeof findFioConfirmNode>;
  for (let strategyIndex = 0; strategyIndex < strategies.length && !confirm; strategyIndex += 1) {
    input = findFioInputNode(working);
    if (!input) throw new Error("Accountant FIO modal input disappeared before confirmation");
    await strategies[strategyIndex](input);
    adb(["shell", "input", "keyevent", "4"]);
    await sleep(600);
    const result = await waitForFioConfirmNode(
      harness.dumpAndroidScreen(`accountant-payment-runtime-fio-typed-${strategyIndex + 1}`),
      `accountant-payment-runtime-fio-ready-${strategyIndex + 1}`,
    );
    working = result.screen;
    confirm = result.confirm;
  }
  if (!confirm) {
    const inputAfterType = findFioInputNode(working);
    throw new Error(
      `Accountant FIO modal confirm did not become enabled after input; inputText=${JSON.stringify(
        inputAfterType?.text ?? "",
      )}`,
    );
  }

  harness.tapAndroidBounds(confirm.bounds);
  await sleep(1800);

  let afterConfirm = harness.dumpAndroidScreen("accountant-payment-runtime-fio-after-confirm");
  for (let attempt = 0; isFioModalSurface(afterConfirm.xml) && attempt < 20; attempt += 1) {
    await sleep(1000);
    afterConfirm = harness.dumpAndroidScreen(`accountant-payment-runtime-fio-closed-${attempt + 1}`);
  }
  if (isFioModalSurface(afterConfirm.xml)) {
    throw new Error("Accountant FIO modal did not close after enabled confirm tap");
  }

  return { screen: afterConfirm, fioConfirmed: true };
}

async function insertRequest(marker: string) {
  const result = await admin
    .from("requests")
    .insert({
      status: "Черновик",
      comment: `${marker}:request`,
      object_name: marker,
      note: marker,
    })
    .select("id")
    .single<{ id: string }>();
  if (result.error) throw result.error;
  return trim(result.data.id);
}

async function insertRequestItem(requestId: string, marker: string, index: number) {
  const result = await admin
    .from("request_items")
    .insert({
      request_id: requestId,
      name_human: `${marker}:item:${index}`,
      qty: 1,
      uom: "pcs",
      rik_code: `${marker}:rik:${index}`,
      status: "Черновик",
    })
    .select("id")
    .single<{ id: string }>();
  if (result.error) throw result.error;
  return trim(result.data.id);
}

async function insertProposal(requestId: string, marker: string) {
  const result = await admin
    .from("proposals")
    .insert({
      request_id: requestId,
      status: "Черновик",
      supplier: `${marker}:supplier`,
      invoice_number: `${marker}:INV`,
      invoice_date: new Date().toISOString().slice(0, 10),
      invoice_currency: "KGS",
      sent_to_accountant_at: null,
    })
    .select("id")
    .single<{ id: string }>();
  if (result.error) throw result.error;
  return trim(result.data.id);
}

async function insertProposalItem(proposalId: string, requestItemId: string, marker: string, index: number) {
  const result = await admin
    .from("proposal_items")
    .insert({
      proposal_id: proposalId,
      proposal_id_text: proposalId,
      request_item_id: requestItemId,
      name_human: `${marker}:item:${index}`,
      qty: 1,
      uom: "pcs",
      price: 25,
      rik_code: `${marker}:rik:${index}`,
      supplier: `${marker}:supplier`,
      status: "Утверждено",
    })
    .select("id")
    .single<{ id: number }>();
  if (result.error) throw result.error;
  return String(result.data.id);
}

async function seedPayableProposal(): Promise<SeedBundle> {
  const marker = `accountant-runtime-${Date.now().toString(36)}`;
  const requestId = await insertRequest(marker);
  const proposalId = await insertProposal(requestId, marker);
  const requestItemId = await insertRequestItem(requestId, marker, 1);
  const proposalItemId = await insertProposalItem(proposalId, requestItemId, marker, 1);
  const promote = await admin
    .from("proposals")
    .update({
      status: "Утверждено",
      sent_to_accountant_at: new Date().toISOString(),
    })
    .eq("id", proposalId);
  if (promote.error) throw promote.error;
  return {
    marker,
    requestId,
    proposalId,
    requestItemIds: [requestItemId],
    proposalItemIds: [proposalItemId],
  };
}

async function cleanupSeed(seed: SeedBundle | null) {
  if (!seed) return;
  await admin.from("proposal_payment_allocations").delete().in("proposal_item_id", seed.proposalItemIds.map((id) => Number(id)));
  await admin.from("proposal_payments").delete().eq("proposal_id", seed.proposalId);
  await (admin as any).from("accounting_pay_invoice_mutations_v1").delete().eq("proposal_id", seed.proposalId);
  await admin.from("proposal_items").delete().in("id", seed.proposalItemIds.map((id) => Number(id)));
  await admin.from("proposals").delete().eq("id", seed.proposalId);
  await admin.from("request_items").delete().in("id", seed.requestItemIds);
  await admin.from("requests").delete().eq("id", seed.requestId);
}

async function waitForMarkerOnAccountantScreen(marker: string, fioLabel: string) {
  let fioConfirmed = false;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const screen = await harness.openAndroidRoute({
      packageName: harness.detectAndroidPackage(),
      routes: ["rik:///office/accountant", "rik:///%28tabs%29/office/accountant", "rik:///accountant"],
      artifactBase: `accountant-payment-runtime-${attempt + 1}`,
      predicate: (xml) => (isAccountantSurface(xml) && xml.includes(marker)) || isFioModalSurface(xml),
      renderablePredicate: (xml) => isLoginSurface(xml) || isAccountantSurface(xml) || isFioModalSurface(xml),
      loginScreenPredicate: isLoginSurface,
      timeoutMs: 45_000,
      delayMs: 1500,
    });
    if (isFioModalSurface(screen.xml)) {
      const confirmed = await maybeConfirmFio(screen, fioLabel);
      fioConfirmed = fioConfirmed || confirmed.fioConfirmed;
      if (isAccountantSurface(confirmed.screen.xml) && confirmed.screen.xml.includes(marker)) {
        return { screen: confirmed.screen, fioConfirmed };
      }
      continue;
    }
    if (isAccountantSurface(screen.xml) && screen.xml.includes(marker)) return { screen, fioConfirmed };
  }
  throw new Error(`Accountant route opened but fixture marker ${marker} did not render`);
}

async function openPaymentEntry(screen: AndroidScreen, marker: string) {
  const nodes = harness.parseAndroidNodes(screen.xml);
  const rowNode = nodes.find((node) => node.enabled && node.clickable && `${node.text} ${node.contentDesc}`.includes(marker));
  if (!rowNode) {
    throw new Error(`Accountant row for marker ${marker} was rendered but no tappable row node was found`);
  }
  harness.tapAndroidBounds(rowNode.bounds);
  await sleep(2200);
  return harness.dumpAndroidScreen("accountant-payment-runtime-entry");
}

async function main() {
  let user: RuntimeTestUser | null = null;
  let seed: SeedBundle | null = null;
  const summary: Record<string, unknown> = {
    generatedAt: new Date().toISOString(),
    status: "NOT GREEN",
    route: "rik:///office/accountant",
    livePaymentMutationApplied: false,
  };

  try {
    seed = await seedPayableProposal();
    const seedRpc = await assertSeedVisibleInAccountantRpc(seed);
    user = await createTempUser(admin, {
      role: "accountant",
      fullName: "Accountant Runtime Smoke",
      emailPrefix: "accountant.payment.runtime",
    });

    const prepared = await harness.prepareAndroidRuntime({ clearApp: true, clearGms: false });
    clearAndroidLogcat();
    const runtimeFioLabel = "accountant";

    await openAndroidLoginSurface(prepared.packageName);
    const loggedIn = await harness.loginAndroidWithProtectedRoute({
      packageName: prepared.packageName,
      user,
      protectedRoute: "rik:///office/accountant",
      artifactBase: "accountant-payment-runtime-login",
      successPredicate: (xml) => isAccountantSurface(xml) || isProfileSurface(xml, user) || isFioModalSurface(xml),
      renderablePredicate: (xml) =>
        isLoginSurface(xml) || isAccountantSurface(xml) || isProfileSurface(xml, user) || isFioModalSurface(xml),
      loginScreenPredicate: isLoginSurface,
    });

    const initialFio = await maybeConfirmFio(loggedIn, runtimeFioLabel);
    const routedResult = initialFio.screen.xml.includes(seed.marker)
      ? { screen: initialFio.screen, fioConfirmed: initialFio.fioConfirmed }
      : await waitForMarkerOnAccountantScreen(seed.marker, runtimeFioLabel);
    const routed = routedResult.screen;
    const entry = await openPaymentEntry(routed, seed.marker);
    const logText = readAndroidLogcat();
    const fatal = fatalLines(logText);
    const entryRendered = isPaymentEntrySurface(entry.xml, seed.marker);
    const status = isAccountantSurface(routed.xml) && routed.xml.includes(seed.marker) && entryRendered && fatal.length === 0
      ? "GREEN"
      : "NOT GREEN";

    Object.assign(summary, {
      status,
      user: { id: user.id, email: user.email, role: user.role },
      proposalId: seed.proposalId,
      marker: seed.marker,
      seedRpc,
      preflight: prepared.preflight,
      recovery: harness.getRecoverySummary(),
      fioConfirmed: routedResult.fioConfirmed,
      screenOpened: isAccountantSurface(routed.xml),
      fixtureRowRendered: routed.xml.includes(seed.marker),
      paymentEntryOpened: entryRendered,
      fatalLines: fatal,
      artifacts: {
        routedXml: routed.xmlPath,
        routedPng: routed.pngPath,
        entryXml: entry.xmlPath,
        entryPng: entry.pngPath,
      },
      limitation: "Runtime smoke opens the accountant payment entrypoint but does not submit a live payment mutation.",
    });

    writeJson(artifactPath, summary);
    console.log(JSON.stringify(summary, null, 2));
    if (status !== "GREEN") process.exitCode = 1;
  } catch (error) {
    const failureArtifacts = harness.captureFailureArtifacts("accountant-payment-runtime-failure");
    Object.assign(summary, {
      status: "NOT GREEN",
      error: describeError(error),
      failureArtifacts,
      recovery: harness.getRecoverySummary(),
    });
    writeJson(artifactPath, summary);
    console.error(JSON.stringify(summary, null, 2));
    process.exitCode = 1;
  } finally {
    await cleanupSeed(seed).catch((error) => {
      console.error("[accountant_payment_runtime_verify][cleanup_seed]", error);
      process.exitCode = 1;
    });
    await cleanupTempUser(admin, user).catch((error) => {
      console.error("[accountant_payment_runtime_verify][cleanup_user]", error);
      process.exitCode = 1;
    });
  }
}

void main();
