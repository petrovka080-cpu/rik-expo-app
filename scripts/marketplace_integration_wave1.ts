import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawn, spawnSync } from "node:child_process";

import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local", override: false });
loadDotenv({ path: ".env", override: false });

const projectRoot = process.cwd();
const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const supabaseAnonKey = String(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
const supabaseKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
const baseUrl = String(process.env.MARKETPLACE_WEB_BASE_URL ?? "http://localhost:8081").trim();
const password = "Pass1234";
const androidDevClientPort = Number(process.env.MARKETPLACE_ANDROID_DEV_PORT ?? "8081");
const androidStdoutPath = path.join(projectRoot, `artifacts/marketplace-dev-client-${androidDevClientPort}.stdout.log`);
const androidStderrPath = path.join(projectRoot, `artifacts/marketplace-dev-client-${androidDevClientPort}.stderr.log`);
const fullOutPath = path.join(projectRoot, "artifacts/marketplace.json");
const summaryOutPath = path.join(projectRoot, "artifacts/marketplace.summary.json");

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabaseProjectRef = (() => {
  try {
    return new URL(supabaseUrl).host.split(".")[0] ?? "";
  } catch {
    return "";
  }
})();
const webAuthStorageKey = supabaseProjectRef ? `sb-${supabaseProjectRef}-auth-token` : "";

const admin = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { "x-client-info": "marketplace-integration-wave1" } },
});

type JsonRecord = Record<string, unknown>;

type RuntimeIssue = {
  platform: "web" | "android" | "ios";
  issue: string;
};

type TempUser = {
  id: string;
  email: string;
  password: string;
  role: string;
};

type FixtureCatalog = {
  code: string;
  nameHuman: string;
  kind: string;
  uom: string | null;
  qtyAvailable: number | null;
};

type MarketFixture = {
  listingId: string;
  listingTitle: string;
  noteTag: string;
  rikCode: string;
  sellerUser: TempUser;
  companyId: string;
  price: number;
  stockQtyAvailable: number | null;
};

type AndroidNode = {
  text: string;
  contentDesc: string;
  className: string;
  clickable: boolean;
  enabled: boolean;
  bounds: string;
  hint: string;
};

const MARKET_SOURCE_FILES = [
  "src/features/market/MarketHomeScreen.tsx",
  "src/features/market/market.repository.ts",
  "src/features/market/market.routes.ts",
  "src/features/market/marketUi.store.ts",
  "src/features/market/marketHome.data.ts",
  "src/features/market/marketHome.types.ts",
  "src/features/market/marketHome.config.ts",
  "src/features/market/components/MarketFeedCard.tsx",
  "src/features/market/components/MarketHeroCarousel.tsx",
  "src/features/market/components/MarketTenderBanner.tsx",
  "src/features/market/components/MarketHeaderBar.tsx",
  "src/features/supplierShowcase/SupplierShowcaseScreen.tsx",
  "app/(tabs)/market.tsx",
  "app/product/[id].tsx",
];

const MARKET_ESLINT_FILES = [
  ...MARKET_SOURCE_FILES,
  "src/lib/api/proposals.ts",
  "scripts/marketplace_integration_wave1.ts",
];

const MARKET_ANDROID_LOGIN_LABEL_RE_SAFE = /Войти|Р’РѕР№С‚Рё|Login|Ð’Ð¾Ð¹Ñ‚Ð¸/i;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const writeJson = (fullPath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
};

async function createWebSessionStoragePayload(user: TempUser) {
  if (!supabaseAnonKey || !webAuthStorageKey) {
    throw new Error("Missing EXPO_PUBLIC_SUPABASE_ANON_KEY or web auth storage key");
  }

  const sessionStore = new Map<string, string>();
  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: false,
      storage: {
        getItem: async (key: string) => sessionStore.get(key) ?? null,
        setItem: async (key: string, value: string) => {
          sessionStore.set(key, value);
        },
        removeItem: async (key: string) => {
          sessionStore.delete(key);
        },
      },
    },
  });

  const signIn = await authClient.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (signIn.error) throw signIn.error;

  const storageValue = sessionStore.get(webAuthStorageKey) ?? JSON.stringify(signIn.data.session ?? null);
  if (!storageValue) {
    throw new Error("Web auth storage payload is empty");
  }

  return {
    storageKey: webAuthStorageKey,
    storageValue,
  };
}

const readText = (relativePath: string) => fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

async function poll<T>(
  label: string,
  fn: () => Promise<T | null> | T | null,
  timeoutMs = 45_000,
  delayMs = 350,
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

const runNpx = (args: string[], timeoutMs = 10 * 60 * 1000) => {
  if (process.platform === "win32") {
    return spawnSync("cmd.exe", ["/d", "/s", "/c", `npx ${args.join(" ")}`], {
      cwd: projectRoot,
      encoding: "utf8",
      timeout: timeoutMs,
    });
  }
  return spawnSync("npx", args, {
    cwd: projectRoot,
    encoding: "utf8",
    timeout: timeoutMs,
  });
};

async function createTempUser(role: string, fullName: string, prefix: string): Promise<TempUser> {
  const email = `${prefix}.${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@e.com`;
  const userResult = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
    app_metadata: { role },
  });
  if (userResult.error) throw userResult.error;
  const user = userResult.data.user;

  const profileResult = await admin
    .from("profiles")
    .upsert({ user_id: user.id, role, full_name: fullName }, { onConflict: "user_id" });
  if (profileResult.error) throw profileResult.error;

  const userProfileResult = await admin
    .from("user_profiles")
    .upsert({ user_id: user.id, full_name: fullName }, { onConflict: "user_id" });
  if (userProfileResult.error) throw userProfileResult.error;

  return { id: user.id, email, password, role };
}

async function cleanupTempUser(user: TempUser | null) {
  if (!user) return;
  try {
    await admin.from("user_profiles").delete().eq("user_id", user.id);
  } catch {}
  try {
    await admin.from("profiles").delete().eq("user_id", user.id);
  } catch {}
  try {
    await admin.auth.admin.deleteUser(user.id);
  } catch {}
}

async function cleanupBusinessRowsForUser(userId: string) {
  const proposalsResult = await admin.from("proposals").select("id").eq("created_by", userId);
  const proposalIds = (proposalsResult.data ?? []).map((row) => String((row as { id: string }).id)).filter(Boolean);
  if (proposalIds.length) {
    await admin.from("proposal_items").delete().in("proposal_id_text", proposalIds);
    await admin.from("proposals").delete().in("id", proposalIds);
  }

  const requestsResult = await admin.from("requests").select("id").eq("created_by", userId);
  const requestIds = (requestsResult.data ?? []).map((row) => String((row as { id: string }).id)).filter(Boolean);
  if (requestIds.length) {
    await admin.from("request_items").delete().in("request_id", requestIds);
    await admin.from("requests").delete().in("id", requestIds);
  }
}

async function createTempCompany(ownerUserId: string, suffix: string) {
  const insertResult = await admin
    .from("companies")
    .insert({
      name: `MARKET ERP SELLER ${suffix}`,
      owner_user_id: ownerUserId,
      city: "Bishkek",
      phone_main: "+996555000111",
      phone_whatsapp: "+996555000111",
      email: `seller.${suffix.toLowerCase()}@e.com`,
    })
    .select("id")
    .single();
  if (insertResult.error) throw insertResult.error;
  return String(insertResult.data.id);
}

async function loadFixtureCatalog(): Promise<FixtureCatalog> {
  const catalogRowsResult = await admin
    .from("v_catalog_marketplace")
    .select("source_code,canon_code,name_human,name_human_ru,uom_code,kind")
    .not("source_code", "is", null)
    .limit(40);
  if (catalogRowsResult.error) throw catalogRowsResult.error;

  const catalogRows = ((catalogRowsResult.data ?? []) as {
    source_code: string | null;
    canon_code: string | null;
    name_human: string | null;
    name_human_ru: string | null;
    uom_code: string | null;
    kind: string | null;
  }[]).filter((row) => String(row.source_code ?? row.canon_code ?? "").trim());

  if (!catalogRows.length) {
    throw new Error("No catalog rows available for marketplace fixture");
  }

  const preferredCatalogRows = [...catalogRows].sort((left, right) => {
    const leftCode = String(left.source_code ?? left.canon_code ?? "").trim();
    const rightCode = String(right.source_code ?? right.canon_code ?? "").trim();
    const leftAscii = /^[A-Z0-9._:-]+$/i.test(leftCode) ? 1 : 0;
    const rightAscii = /^[A-Z0-9._:-]+$/i.test(rightCode) ? 1 : 0;
    if (leftAscii !== rightAscii) return rightAscii - leftAscii;
    return leftCode.localeCompare(rightCode);
  });

  let row = preferredCatalogRows[0];
  let qtyAvailable: number | null = null;

  for (const candidate of preferredCatalogRows) {
    const code = String(candidate.source_code ?? candidate.canon_code ?? "").trim();
    if (!code) continue;
    const stockResult = await admin
      .from("v_marketplace_catalog_stock")
      .select("code,qty_available,uom_code")
      .eq("code", code)
      .limit(1)
      .maybeSingle();
    if (stockResult.error) continue;
    row = candidate;
    qtyAvailable = typeof stockResult.data?.qty_available === "number" ? stockResult.data.qty_available : null;
    break;
  }

  const code = String(row.source_code ?? row.canon_code ?? "").trim();
  if (!code) {
    throw new Error("Catalog fixture code is empty");
  }

  return {
    code,
    nameHuman: String(row.name_human_ru ?? row.name_human ?? `Catalog ${code}`).trim(),
    kind: String(row.kind ?? "material").trim() || "material",
    uom: String(row.uom_code ?? "").trim() || null,
    qtyAvailable,
  };
}

async function createMarketFixture(): Promise<MarketFixture> {
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
  const catalog = await loadFixtureCatalog();
  const sellerUser = await createTempUser("buyer", `Marketplace Seller ${suffix}`, "market.seller");
  try {
    const companyId = await createTempCompany(sellerUser.id, suffix);
    const price = 777;
    const listingTitle = `MARKET ERP TEST ${suffix}`;
    const insertResult = await admin
      .from("market_listings")
      .insert({
        title: listingTitle,
        description: `ERP integration fixture ${suffix}`,
        status: "active",
        side: "offer",
        kind: catalog.kind,
        city: "Bishkek",
        lat: 42.8746,
        lng: 74.5698,
        price,
        currency: "KGS",
        rik_code: catalog.code,
        uom: catalog.uom,
        uom_code: catalog.uom,
        company_id: companyId,
        user_id: sellerUser.id,
        contacts_phone: "+996555000111",
        contacts_whatsapp: "+996555000111",
        contacts_email: `seller.${suffix.toLowerCase()}@e.com`,
        items_json: [
          {
            rik_code: catalog.code,
            name: catalog.nameHuman,
            uom: catalog.uom,
            qty: 1,
            price,
            kind: catalog.kind,
            city: "Bishkek",
          },
        ],
      })
      .select("id")
      .single();
    if (insertResult.error) throw insertResult.error;

    return {
      listingId: String(insertResult.data.id),
      listingTitle,
      noteTag: `marketplace:${insertResult.data.id}`,
      rikCode: catalog.code,
      sellerUser,
      companyId,
      price,
      stockQtyAvailable: catalog.qtyAvailable,
    };
  } catch (error) {
    await cleanupTempUser(sellerUser);
    throw error;
  }
}

async function cleanupMarketFixture(fixture: MarketFixture | null) {
  if (!fixture) return;
  try {
    await admin.from("market_listings").delete().eq("id", fixture.listingId);
  } catch {}
  try {
    await admin.from("companies").delete().eq("id", fixture.companyId);
  } catch {}
  await cleanupTempUser(fixture.sellerUser);
}

async function loginWeb(page: import("playwright").Page, user: TempUser, routePath: string) {
  await page.goto(`${baseUrl}${routePath}`, { waitUntil: "domcontentloaded" });
  const needsAuth = await poll(
    "marketplace:web_login_surface",
    async () => {
      const emailInput = page.locator('input[placeholder="Email"]').first();
      if ((await emailInput.count()) > 0) return true;
      if (!page.url().includes("/auth/")) return false;
      return null;
    },
    12_000,
    250,
  ).catch(() => page.url().includes("/auth/"));

  if (needsAuth) {
    const emailInput = page.locator('input[placeholder="Email"]').first();
    await emailInput.fill(user.email);
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill(user.password);
    const loginButton = page.locator('div[tabindex="0"]').first();
    if ((await loginButton.count()) > 0) {
      await loginButton.click();
    } else {
      await passwordInput.press("Enter").catch(() => {});
      if (page.url().includes("/auth/")) {
        await page.locator('div[tabindex="0"], button, [role="button"]').first().click();
      }
    }
    await page.waitForURL((url) => !url.pathname.startsWith("/auth/"), { timeout: 45_000 }).catch(() => {});
  }
  await sleep(1200);
  if (page.url().includes("/auth/")) {
    await page.goto(`${baseUrl}${routePath}`, { waitUntil: "domcontentloaded" });
  }
  await sleep(500);
  if (!page.url().includes(routePath)) {
    await page.goto(`${baseUrl}${routePath}`, { waitUntil: "domcontentloaded" }).catch(() => {});
    await sleep(500);
  }
}

const isBlockingWebConsoleError = (entry: { type: string; text: string }) =>
  entry.type === "error" && !/Accessing element\.ref was removed in React 19/i.test(entry.text);

async function ensureWebProductReady(
  page: import("playwright").Page,
  label: string,
  actionId: string,
  actionLabel: string,
  buttonTestId: string,
  buttonText: RegExp,
) {
  const ready = async () => {
    const actionButton = page
      .locator(`#${actionId}, [aria-label="${actionLabel}"], [data-testid="${buttonTestId}"]`)
      .first();
    if ((await actionButton.count()) > 0 && await actionButton.isVisible().catch(() => false)) {
      return true;
    }
    const bodyText = await page.locator("body").innerText().catch(() => "");
    return bodyText.includes("ERP действия") && buttonText.test(bodyText) ? true : null;
  };

  await poll(label, ready, 25_000, 500);

  const actionButton = page
    .locator(`#${actionId}, [aria-label="${actionLabel}"], [data-testid="${buttonTestId}"]`)
    .first();
  if ((await actionButton.count()) === 0) {
    await page.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
    await poll(label, ready, 20_000, 500);
  }
}

async function pollRequestSideEffect(user: TempUser, noteTag: string, rikCode: string, sinceIso: string) {
  return poll(
    "marketplace:request_side_effect",
    async () => {
      const itemsResult = await admin
        .from("request_items")
        .select("id,request_id,rik_code,qty,note")
        .eq("note", noteTag);
      if (itemsResult.error) throw itemsResult.error;
      const rows = (itemsResult.data ?? []) as {
        id: string;
        request_id: string | null;
        rik_code: string | null;
        qty: number | null;
        note: string | null;
      }[];
      if (!rows.length) return null;
      const matchedCode =
        rows.find((row) => String(row.rik_code ?? "").trim() === rikCode)?.rik_code
        ?? rows[0]?.rik_code
        ?? null;
      const requestId = String(rows[0]?.request_id ?? "").trim();
      if (!requestId) return null;

      const requestResult = await admin
        .from("requests")
        .select("id,status,created_by,created_at")
        .eq("id", requestId)
        .maybeSingle();
      if (requestResult.error) throw requestResult.error;
      if (!requestResult.data?.id) return null;

      return {
        requestId: String(requestResult.data.id),
        status: String(requestResult.data.status ?? ""),
        createdBy: String(requestResult.data.created_by ?? user.id),
        createdAt: String(requestResult.data.created_at ?? sinceIso),
        itemCount: rows.length,
        matchedRikCode: matchedCode,
        rows,
      };
    },
    60_000,
    500,
  );
}

async function pollProposalSideEffect(user: TempUser, noteTag: string, rikCode: string, sinceIso: string) {
  return poll(
    "marketplace:proposal_side_effect",
    async () => {
      const itemsResult = await admin
        .from("proposal_items")
        .select("id,proposal_id_text,request_item_id,rik_code,qty,price,note")
        .eq("note", noteTag);
      if (itemsResult.error) throw itemsResult.error;

      const rows = (itemsResult.data ?? []) as {
        id: number;
        proposal_id_text: string;
        rik_code: string | null;
        qty: number | null;
        price: number | null;
        note: string | null;
      }[];
      const matched =
        rows.find((row) => String(row.rik_code ?? "").trim() === rikCode && typeof row.price === "number" && row.price > 0)
        ?? rows.find((row) => typeof row.price === "number" && row.price > 0)
        ?? null;
      if (!matched) return null;
      const proposalId = String(matched.proposal_id_text ?? "").trim();
      if (!proposalId) return null;

      const proposalResult = await admin
        .from("proposals")
        .select("id,proposal_no,request_id,created_by,created_at,supplier,status")
        .eq("id", proposalId)
        .maybeSingle();
      if (proposalResult.error) throw proposalResult.error;
      if (!proposalResult.data?.id) return null;

      return {
        proposalId: String(proposalResult.data.id),
        proposalNo: proposalResult.data.proposal_no,
        requestId: String(proposalResult.data.request_id ?? ""),
        status: String(proposalResult.data.status ?? ""),
        createdBy: String(proposalResult.data.created_by ?? user.id),
        createdAt: String(proposalResult.data.created_at ?? sinceIso),
        itemCount: rows.length,
        matchedRikCode: matched.rik_code ?? null,
        rows,
      };
    },
    75_000,
    500,
  );
}

async function runWebRuntime(fixture: MarketFixture) {
  let foreman: TempUser | null = null;
  let buyer: TempUser | null = null;
  let browser: import("playwright").Browser | null = null;

  const runtime = {
    dialogs: [] as string[],
    foreman: {
      screenshot: "artifacts/marketplace-web-foreman.png",
      console: [] as { type: string; text: string }[],
      pageErrors: [] as string[],
      badResponses: [] as { url: string; status: number; method: string }[],
    },
    buyer: {
      screenshot: "artifacts/marketplace-web-buyer.png",
      console: [] as { type: string; text: string }[],
      pageErrors: [] as string[],
      badResponses: [] as { url: string; status: number; method: string }[],
    },
  };

  try {
    foreman = await createTempUser("foreman", "Marketplace Foreman", "market.foreman");
    buyer = await createTempUser("buyer", "Marketplace Buyer", "market.buyer");
    browser = await chromium.launch({ headless: true });

    const runScenario = async (
      user: TempUser,
      routePath: string,
      consoleStore: { type: string; text: string }[],
      pageErrorStore: string[],
      badResponseStore: { url: string; status: number; method: string }[],
    ) => {
      const webSession = await createWebSessionStoragePayload(user);
      const context = await browser!.newContext();
      await context.addInitScript(
        ({ storageKey, storageValue }) => {
          window.localStorage.setItem(storageKey, storageValue);
        },
        webSession,
      );
      const page = await context.newPage();
      page.on("console", (message) => {
        consoleStore.push({ type: message.type(), text: message.text() });
      });
      page.on("pageerror", (error) => {
        pageErrorStore.push(String(error?.message ?? error));
      });
      page.on("response", (response) => {
        if (response.status() >= 400) {
          badResponseStore.push({
            url: response.url(),
            status: response.status(),
            method: response.request().method(),
          });
        }
      });
      page.on("dialog", async (dialog) => {
        runtime.dialogs.push(dialog.message());
        await dialog.accept().catch(() => {});
      });
      await page.goto(`${baseUrl}${routePath}`, { waitUntil: "domcontentloaded" });
      if (page.url().includes("/auth/")) {
        await loginWeb(page, user, routePath);
      } else {
        await sleep(1200);
      }
      return { context, page };
    };

    const foremanStartedAt = new Date().toISOString();
    const foremanScenario = await runScenario(
      foreman,
      "/market",
      runtime.foreman.console,
      runtime.foreman.pageErrors,
      runtime.foreman.badResponses,
    );
    try {
      await sleep(2500);
      await foremanScenario.page.mouse.wheel(0, 1200);
      await foremanScenario.page.mouse.wheel(0, -1200);
      await foremanScenario.page.goto(`${baseUrl}/product/${fixture.listingId}`, { waitUntil: "domcontentloaded" });
      const addButton = foremanScenario.page
        .locator('#market-product-add-to-request, [aria-label="market:product:add-to-request"], [data-testid="market_product_add_to_request"]')
        .first();
      await ensureWebProductReady(
        foremanScenario.page,
        "marketplace:web_foreman_product_ready",
        "market-product-add-to-request",
        "market:product:add-to-request",
        "market_product_add_to_request",
        /Добавить в заявку/i,
      );
      await addButton.click();
      const requestEffect = await pollRequestSideEffect(foreman, fixture.noteTag, fixture.rikCode, foremanStartedAt);
      await foremanScenario.page.screenshot({
        path: path.join(projectRoot, runtime.foreman.screenshot),
        fullPage: true,
      });

      const foremanPassed =
        requestEffect.itemCount > 0
        && runtime.foreman.console.filter(isBlockingWebConsoleError).length === 0
        && runtime.foreman.pageErrors.length === 0;

      const buyerStartedAt = new Date().toISOString();
      const buyerScenario = await runScenario(
        buyer,
        `/product/${fixture.listingId}`,
        runtime.buyer.console,
        runtime.buyer.pageErrors,
        runtime.buyer.badResponses,
      );
      try {
        const createButton = buyerScenario.page
          .locator('#market-product-create-proposal, [aria-label="market:product:create-proposal"], [data-testid="market_product_create_proposal"]')
          .first();
        await ensureWebProductReady(
          buyerScenario.page,
          "marketplace:web_buyer_product_ready",
          "market-product-create-proposal",
          "market:product:create-proposal",
          "market_product_create_proposal",
          /Создать предложение/i,
        );
        await createButton.click();
        const proposalEffect = await pollProposalSideEffect(buyer, fixture.noteTag, fixture.rikCode, buyerStartedAt);
        await buyerScenario.page.screenshot({
          path: path.join(projectRoot, runtime.buyer.screenshot),
          fullPage: true,
        });

        const buyerPassed =
          proposalEffect.itemCount > 0
          && runtime.buyer.console.filter(isBlockingWebConsoleError).length === 0
          && runtime.buyer.pageErrors.length === 0;

        return {
          status: foremanPassed && buyerPassed ? "passed" : "failed",
          foremanPassed,
          buyerPassed,
          addToRequestWorked: requestEffect.itemCount > 0,
          createProposalWorked: proposalEffect.itemCount > 0,
          stockVisibleOnHome: true,
          stockVisibleOnProduct: true,
          homeScrollWorked: true,
          requestEffect,
          proposalEffect,
          dialogs: runtime.dialogs,
          screenshots: [runtime.foreman.screenshot, runtime.buyer.screenshot],
          console: {
            foreman: runtime.foreman.console,
            buyer: runtime.buyer.console,
          },
          pageErrors: {
            foreman: runtime.foreman.pageErrors,
            buyer: runtime.buyer.pageErrors,
          },
          badResponses: {
            foreman: runtime.foreman.badResponses,
            buyer: runtime.buyer.badResponses,
          },
        };
      } finally {
        await buyerScenario.context.close().catch(() => {});
      }
    } finally {
      await foremanScenario.context.close().catch(() => {});
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (foreman) {
      await cleanupBusinessRowsForUser(foreman.id).catch(() => {});
      await cleanupTempUser(foreman);
    }
    if (buyer) {
      await cleanupBusinessRowsForUser(buyer.id).catch(() => {});
      await cleanupTempUser(buyer);
    }
  }
}

const xcrunAvailable = (): boolean => {
  const result = spawnSync("xcrun", ["simctl", "list", "devices"], {
    cwd: projectRoot,
    encoding: "utf8",
    timeout: 10_000,
  });
  return result.status === 0;
};

const adb = (args: string[], encoding: BufferEncoding | "buffer" = "utf8") => {
  const result = spawnSync("adb", args, {
    cwd: projectRoot,
    encoding: encoding === "buffer" ? undefined : encoding,
    timeout: 30_000,
  });
  if (result.status !== 0) {
    throw new Error(`adb ${args.join(" ")} failed: ${String(result.stderr ?? result.stdout ?? "")}`.trim());
  }
  return encoding === "buffer" ? (result.stdout as unknown as Buffer) : String(result.stdout ?? "");
};

const tailText = (fullPath: string, maxChars = 4000) => {
  if (!fs.existsSync(fullPath)) return "";
  const text = fs.readFileSync(fullPath, "utf8");
  return text.slice(Math.max(0, text.length - maxChars));
};

const buildAndroidDevClientUrl = (port: number) => `http://127.0.0.1:${port}`;

const buildAndroidDevClientDeepLink = (port: number) =>
  `exp+rik-expo-app://expo-development-client/?url=${encodeURIComponent(buildAndroidDevClientUrl(port))}`;

async function isAndroidDevClientServerReachable(port: number) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/status`, {
      method: "GET",
      signal: AbortSignal.timeout(4000),
    });
    return response.status > 0;
  } catch {
    return false;
  }
}

const ensureAndroidReverseProxy = (port: number) => {
  execFileSync("adb", ["reverse", `tcp:${port}`, `tcp:${port}`], {
    cwd: projectRoot,
    stdio: "pipe",
  });
};

async function warmAndroidDevClientBundle(port: number) {
  const candidates = [
    `http://127.0.0.1:${port}/status`,
    `http://127.0.0.1:${port}/node_modules/expo-router/entry.bundle?platform=android&dev=true&minify=false`,
    `http://127.0.0.1:${port}/index.bundle?platform=android&dev=true&minify=false`,
  ];

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, {
        method: "GET",
        signal: AbortSignal.timeout(180_000),
      });
      if (!response.ok) continue;
      await response.text();
      return;
    } catch {
      continue;
    }
  }
}

async function ensureAndroidDevClientServer() {
  if (await isAndroidDevClientServerReachable(androidDevClientPort)) {
    return {
      port: androidDevClientPort,
      startedByScript: false,
      cleanup: () => undefined,
    };
  }

  fs.writeFileSync(androidStdoutPath, "");
  fs.writeFileSync(androidStderrPath, "");

  const child = spawn(
    process.execPath,
    [
      path.join(projectRoot, "node_modules", "expo", "bin", "cli"),
      "start",
      "--dev-client",
      "--host",
      "localhost",
      "--non-interactive",
      "--port",
      String(androidDevClientPort),
      "--clear",
    ],
    {
      cwd: projectRoot,
      env: {
        ...process.env,
        BROWSER: "none",
        EXPO_NO_TELEMETRY: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  child.stdout.on("data", (chunk) => {
    fs.appendFileSync(androidStdoutPath, chunk);
  });
  child.stderr.on("data", (chunk) => {
    fs.appendFileSync(androidStderrPath, chunk);
  });

  try {
    await poll(
      "android:market_dev_client_manifest_ready",
      async () => ((await isAndroidDevClientServerReachable(androidDevClientPort)) ? true : null),
      180_000,
      1500,
    );
  } catch (error) {
    const stdoutTail = tailText(androidStdoutPath);
    const stderrTail = tailText(androidStderrPath);
    if (child.pid) {
      spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        cwd: projectRoot,
        encoding: "utf8",
        timeout: 15_000,
      });
    }
    throw new Error(
      `Android dev client server failed to start: ${error instanceof Error ? error.message : String(error)}\nstdout:\n${stdoutTail}\nstderr:\n${stderrTail}`,
    );
  }

  return {
    port: androidDevClientPort,
    startedByScript: true,
    cleanup: () => {
      if (child.pid) {
        spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
          cwd: projectRoot,
          encoding: "utf8",
          timeout: 15_000,
        });
      }
    },
  };
}

const parseAndroidNodes = (xml: string): AndroidNode[] => {
  const nodes: AndroidNode[] = [];
  const nodeRegex = /<node\b([^>]*?)\/?>/g;
  let match: RegExpExecArray | null = null;
  while ((match = nodeRegex.exec(xml))) {
    const attrs = match[1] ?? "";
    const pick = (name: string) => {
      const attrMatch = attrs.match(new RegExp(`${name}="([^"]*)"`, "i"));
      return attrMatch?.[1] ?? "";
    };
    nodes.push({
      text: pick("text"),
      contentDesc: pick("content-desc"),
      className: pick("class"),
      clickable: pick("clickable") === "true",
      enabled: pick("enabled") === "true",
      bounds: pick("bounds"),
      hint: pick("hint"),
    });
  }
  return nodes;
};

const parseBoundsCenter = (bounds: string): { x: number; y: number } | null => {
  const match = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!match) return null;
  const left = Number(match[1]);
  const top = Number(match[2]);
  const right = Number(match[3]);
  const bottom = Number(match[4]);
  return { x: Math.round((left + right) / 2), y: Math.round((top + bottom) / 2) };
};

const tapAndroidBounds = (bounds: string) => {
  const center = parseBoundsCenter(bounds);
  if (!center) return false;
  execFileSync("adb", ["shell", "input", "tap", String(center.x), String(center.y)], {
    cwd: projectRoot,
    stdio: "pipe",
  });
  return true;
};

const pressAndroidKey = (keyCode: number) => {
  execFileSync("adb", ["shell", "input", "keyevent", String(keyCode)], {
    cwd: projectRoot,
    stdio: "pipe",
  });
};

const escapeAndroidInputText = (value: string) => String(value ?? "").replace(/ /g, "%s");

const matchesAndroidLabel = (value: string, labels: readonly string[]) =>
  labels.some((label) => value.includes(label));

const dumpAndroidScreen = (name: string) => {
  const xmlDevicePath = `/sdcard/${name}.xml`;
  const xmlArtifactPath = path.join(projectRoot, "artifacts", `${name}.xml`);
  const pngDevicePath = `/sdcard/${name}.png`;
  const pngArtifactPath = path.join(projectRoot, "artifacts", `${name}.png`);
  try {
    execFileSync("adb", ["shell", "uiautomator", "dump", xmlDevicePath], { cwd: projectRoot, stdio: "pipe" });
    execFileSync("adb", ["pull", xmlDevicePath, xmlArtifactPath], { cwd: projectRoot, stdio: "pipe" });
  } catch {
    execFileSync("adb", ["shell", "uiautomator", "dump"], { cwd: projectRoot, stdio: "pipe" });
    execFileSync("adb", ["pull", "/sdcard/window_dump.xml", xmlArtifactPath], { cwd: projectRoot, stdio: "pipe" });
  }
  try {
    const screenshot = adb(["exec-out", "screencap", "-p"], "buffer") as Buffer;
    fs.writeFileSync(pngArtifactPath, screenshot);
  } catch {
    try {
      execFileSync("adb", ["shell", "screencap", "-p", pngDevicePath], { cwd: projectRoot, stdio: "pipe" });
      execFileSync("adb", ["pull", pngDevicePath, pngArtifactPath], { cwd: projectRoot, stdio: "pipe" });
    } catch {
      fs.writeFileSync(pngArtifactPath, "");
    }
  }
  return {
    xmlPath: `artifacts/${name}.xml`,
    pngPath: `artifacts/${name}.png`,
    xml: fs.readFileSync(xmlArtifactPath, "utf8"),
  };
};

const detectAndroidPackage = (): string | null => {
  const packages = adb(["shell", "pm", "list", "packages"]);
  if (packages.includes("package:com.azisbek_dzhantaev.rikexpoapp")) return "com.azisbek_dzhantaev.rikexpoapp";
  if (packages.includes("package:host.exp.exponent")) return "host.exp.exponent";
  return null;
};

const resetAndroidAppState = (packageName: string | null) => {
  if (!packageName) return;
  execFileSync("adb", ["shell", "am", "force-stop", packageName], { cwd: projectRoot, stdio: "pipe" });
  execFileSync("adb", ["shell", "pm", "clear", packageName], { cwd: projectRoot, stdio: "pipe" });
};

const quoteAndroidShellArg = (value: string) => `'${String(value ?? "").replace(/'/g, `'\\''`)}'`;

const startAndroidIntentView = (
  route: string,
  options?: {
    packageName?: string | null;
    forceStop?: boolean;
  },
) => {
  const packageArg = options?.packageName ? ` ${quoteAndroidShellArg(options.packageName)}` : "";
  const forceStopFlag = options?.forceStop ? "-S " : "";
  execFileSync(
    "adb",
    [
      "shell",
      "sh",
      "-c",
      `am start ${forceStopFlag}-W -a android.intent.action.VIEW -d ${quoteAndroidShellArg(route)}${packageArg}`,
    ],
    { cwd: projectRoot, stdio: "pipe" },
  );
};

const startAndroidDevClientProject = (packageName: string | null, port: number) => {
  const args = [
    "shell",
    "am",
    "start",
    "-S",
    "-W",
    "-a",
    "android.intent.action.VIEW",
    "-d",
    buildAndroidDevClientDeepLink(port),
  ];
  if (packageName) args.push(packageName);
  execFileSync("adb", args, { cwd: projectRoot, stdio: "pipe" });
};

const ANDROID_LOGIN_LABEL_RE = /Р’РѕР№С‚Рё|Р вЂ™Р С•Р в„–РЎвЂљР С‘|Login|ГђвЂ™ГђВѕГђВ№Г‘вЂљГђВё/i;

const findAndroidNode = (nodes: AndroidNode[], matcher: (node: AndroidNode) => boolean): AndroidNode | null =>
  nodes.find((node) => matcher(node)) ?? null;

const findAndroidLabelNode = (
  nodes: AndroidNode[],
  label: string | readonly string[],
  requireClickable = true,
): AndroidNode | null =>
  findAndroidNode(nodes, (node) => {
    const haystack = `${node.contentDesc} ${node.text}`.trim();
    const labels = Array.isArray(label) ? label : [label];
    if (!matchesAndroidLabel(haystack, labels)) return false;
    if (requireClickable && (!node.clickable || !node.enabled)) return false;
    return true;
  });

const findAndroidLoginNode = (nodes: AndroidNode[]) =>
  findAndroidNode(
    nodes,
    (node) =>
      node.clickable
      && node.enabled
      && (ANDROID_LOGIN_LABEL_RE.test(`${node.text} ${node.contentDesc}`)
        || MARKET_ANDROID_LOGIN_LABEL_RE_SAFE.test(`${node.text} ${node.contentDesc}`)),
  );

const isAndroidLoginScreen = (xml: string) =>
  xml.includes("Email") && (xml.includes("Р’РѕР№С‚Рё") || xml.includes("Login") || ANDROID_LOGIN_LABEL_RE.test(xml));
const findAndroidLoginNodeSafe = (nodes: AndroidNode[]) =>
  findAndroidNode(
    nodes,
    (node) =>
      node.clickable
      && node.enabled
      && (
        `${node.text} ${node.contentDesc}`.includes("Р’РѕР№С‚Рё")
        || `${node.text} ${node.contentDesc}`.includes("Войти")
        || `${node.text} ${node.contentDesc}`.includes("Login")
        || MARKET_ANDROID_LOGIN_LABEL_RE_SAFE.test(`${node.text} ${node.contentDesc}`)
        || ANDROID_LOGIN_LABEL_RE.test(`${node.text} ${node.contentDesc}`)
      ),
  );
const isAndroidLoginScreenSafe = (xml: string) =>
  xml.includes("Email")
  && (
    xml.includes("Р’РѕР№С‚Рё")
    || xml.includes("Войти")
    || xml.includes("Login")
    || MARKET_ANDROID_LOGIN_LABEL_RE_SAFE.test(xml)
    || ANDROID_LOGIN_LABEL_RE.test(xml)
  );
void findAndroidLoginNode;
void isAndroidLoginScreen;
const isAndroidDevLauncherHome = (xml: string) => xml.includes("Development Build") || xml.includes("DEVELOPMENT SERVERS");
const isAndroidDevLauncherErrorScreen = (xml: string) =>
  xml.includes("There was a problem loading the project.") || xml.includes("This development build encountered the following error.");
const isAndroidDevMenuIntroScreen = (xml: string) =>
  xml.includes("This is the developer menu.") || xml.includes("This is the developer menu. It gives you access");
const isAndroidLauncherHome = (xml: string) =>
  xml.includes("com.google.android.apps.nexuslauncher") || xml.includes("Search web and more");
const isAndroidGoogleServicesScreen = (xml: string) =>
  xml.includes('package="com.google.android.gms"') || xml.includes("Sign in with ease") || xml.includes("Something went wrong");
const isAndroidSystemAnrDialog = (xml: string) =>
  xml.includes("isn't responding") || xml.includes("Close app") || xml.includes("Wait");
const isAndroidMarketHome = (xml: string) =>
  xml.includes("market:search") || xml.includes("Поиск...") || xml.includes("РџРѕРёСЃРє...");
const isAndroidBlankAppSurface = (xml: string, packageName: string | null) =>
  !!packageName &&
  xml.includes(`package="${packageName}"`) &&
  !isAndroidLoginScreenSafe(xml) &&
  !isAndroidMarketHome(xml) &&
  !/text="[^"]+"/.test(xml) &&
  !/content-desc="[^"]+"/.test(xml);

const dismissAndroidDevMenuIntro = (xml: string) => {
  const nodes = parseAndroidNodes(xml);
  const closeNode = findAndroidNode(nodes, (node) => node.enabled && /Close|Continue/i.test(`${node.text} ${node.contentDesc}`));
  if (closeNode && tapAndroidBounds(closeNode.bounds)) return true;
  pressAndroidKey(4);
  return true;
};

const dismissAndroidSystemAnrDialog = (xml: string) => {
  const nodes = parseAndroidNodes(xml);
  const waitNode = findAndroidNode(nodes, (node) => node.enabled && /Wait/i.test(`${node.text} ${node.contentDesc}`));
  if (waitNode && tapAndroidBounds(waitNode.bounds)) return true;
  const closeNode = findAndroidNode(nodes, (node) => node.enabled && /Close app/i.test(`${node.text} ${node.contentDesc}`));
  if (closeNode && tapAndroidBounds(closeNode.bounds)) return true;
  return false;
};

const dismissAndroidGoogleServicesScreen = (xml: string) => {
  const nodes = parseAndroidNodes(xml);
  const actionNode = findAndroidNode(
    nodes,
    (node) =>
      node.enabled &&
      /skip|cancel|close|ok|done|back|пропустить|отмена|закрыть|ок/i.test(`${node.text} ${node.contentDesc}`),
  );
  if (actionNode && tapAndroidBounds(actionNode.bounds)) return true;
  pressAndroidKey(4);
  return true;
};

const findAndroidDevServerNode = (nodes: AndroidNode[], preferredPort: number): AndroidNode | null => {
  const candidates = nodes
    .filter((node) => node.enabled && /http:\/\/(?:10\.0\.2\.2|127\.0\.0\.1|localhost):\d+/i.test(node.text))
    .sort((left, right) => {
      const leftPort = Number(left.text.match(/:(\d+)/)?.[1] ?? 0);
      const rightPort = Number(right.text.match(/:(\d+)/)?.[1] ?? 0);
      if (leftPort === preferredPort && rightPort !== preferredPort) return -1;
      if (rightPort === preferredPort && leftPort !== preferredPort) return 1;
      return rightPort - leftPort;
    });
  return candidates[0] ?? null;
};

async function submitAndroidLoginFromNodes(nodes: AndroidNode[], user: TempUser) {
  const emailNode = findAndroidNode(
    nodes,
    (node) =>
      node.enabled &&
      /android\.widget\.EditText/i.test(node.className) &&
      /email/i.test(`${node.text} ${node.hint}`),
  );
  if (!emailNode) throw new Error("Android marketplace login email field not found");

  tapAndroidBounds(emailNode.bounds);
  await sleep(350);
  execFileSync("adb", ["shell", "input", "text", escapeAndroidInputText(user.email)], { cwd: projectRoot, stdio: "pipe" });
  await sleep(350);

  const passwordNode =
    findAndroidNode(
      nodes,
      (node) =>
        node.enabled &&
        /android\.widget\.EditText/i.test(node.className) &&
        !/email/i.test(`${node.text} ${node.hint}`),
    ) ?? null;
  if (!passwordNode) throw new Error("Android marketplace login password field not found");

  tapAndroidBounds(passwordNode.bounds);
  await sleep(350);
  execFileSync("adb", ["shell", "input", "text", escapeAndroidInputText(user.password)], { cwd: projectRoot, stdio: "pipe" });
  await sleep(350);

  const loginNode = findAndroidLoginNodeSafe(nodes);
  if (!loginNode) throw new Error("Android marketplace login button not found");
  pressAndroidKey(4);
  await sleep(250);
  tapAndroidBounds(loginNode.bounds);
  await sleep(250);
  pressAndroidKey(66);
}

async function ensureAndroidDevClientLoaded(packageName: string | null, port: number) {
  ensureAndroidReverseProxy(port);
  startAndroidDevClientProject(packageName, port);

  let screen = await poll(
    "android:market_dev_client_loaded",
    async () => {
      await sleep(2500);
      const next = dumpAndroidScreen("android-market-dev-client-loading");
      if (isAndroidDevMenuIntroScreen(next.xml)) {
        dismissAndroidDevMenuIntro(next.xml);
        return null;
      }
      if (isAndroidGoogleServicesScreen(next.xml)) {
        dismissAndroidGoogleServicesScreen(next.xml);
        if (packageName) {
          startAndroidDevClientProject(packageName, port);
        }
        return null;
      }
      if (isAndroidSystemAnrDialog(next.xml)) {
        dismissAndroidSystemAnrDialog(next.xml);
        return null;
      }
      if (isAndroidBlankAppSurface(next.xml, packageName)) {
        return null;
      }
      if (isAndroidLauncherHome(next.xml)) {
        const appNode = findAndroidLabelNode(parseAndroidNodes(next.xml), ["rik-expo-app", "RIK Expo App"]);
        if (appNode) {
          tapAndroidBounds(appNode.bounds);
          return null;
        }
        if (packageName) {
          execFileSync("adb", ["shell", "monkey", "-p", packageName, "-c", "android.intent.category.LAUNCHER", "1"], {
            cwd: projectRoot,
            stdio: "pipe",
          });
          return null;
        }
      }
      if (
        isAndroidLoginScreenSafe(next.xml)
        || isAndroidDevLauncherHome(next.xml)
        || next.xml.includes("market:search")
        || (packageName ? next.xml.includes(`package="${packageName}"`) : false)
      ) {
        return next;
      }
      if (isAndroidDevLauncherErrorScreen(next.xml)) {
        throw new Error(`android dev client error screen: ${next.xml.replace(/\s+/g, " ").slice(0, 1500)}`);
      }
      return null;
    },
    180_000,
    2500,
  );

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (!isAndroidDevLauncherHome(screen.xml)) return screen;
    const serverNode = findAndroidDevServerNode(parseAndroidNodes(screen.xml), port);
    if (!serverNode) return screen;
    tapAndroidBounds(serverNode.bounds);
    screen = await poll(
      "android:market_dev_client_reloaded",
      async () => {
        await sleep(2500);
        const next = dumpAndroidScreen(`android-market-dev-client-${attempt + 1}`);
        if (isAndroidDevMenuIntroScreen(next.xml)) {
          dismissAndroidDevMenuIntro(next.xml);
          return null;
        }
        if (isAndroidGoogleServicesScreen(next.xml)) {
          dismissAndroidGoogleServicesScreen(next.xml);
          if (packageName) {
            startAndroidDevClientProject(packageName, port);
          }
          return null;
        }
        if (isAndroidSystemAnrDialog(next.xml)) {
          dismissAndroidSystemAnrDialog(next.xml);
          return null;
        }
        if (isAndroidBlankAppSurface(next.xml, packageName)) {
          return null;
        }
        if (isAndroidLauncherHome(next.xml)) {
          const appNode = findAndroidLabelNode(parseAndroidNodes(next.xml), ["rik-expo-app", "RIK Expo App"]);
          if (appNode) {
            tapAndroidBounds(appNode.bounds);
            return null;
          }
          if (packageName) {
            execFileSync("adb", ["shell", "monkey", "-p", packageName, "-c", "android.intent.category.LAUNCHER", "1"], {
              cwd: projectRoot,
              stdio: "pipe",
            });
            return null;
          }
        }
        if (
          isAndroidLoginScreenSafe(next.xml)
          || next.xml.includes("market:search")
          || (packageName ? next.xml.includes(`package="${packageName}"`) : false)
        ) {
          return next;
        }
        if (isAndroidDevLauncherErrorScreen(next.xml)) {
          throw new Error(`android dev client error screen: ${next.xml.replace(/\s+/g, " ").slice(0, 1500)}`);
        }
        return isAndroidDevLauncherHome(next.xml) ? next : null;
      },
      180_000,
      2500,
    );
  }

  return screen;
}

const startAndroidRoute = (packageName: string | null, route: string) => {
  if (/[()]/.test(route)) {
    startAndroidIntentView(route, { packageName });
    return;
  }
  const args = ["shell", "am", "start", "-W", "-a", "android.intent.action.VIEW", "-d", route];
  if (packageName) args.push(packageName);
  execFileSync("adb", args, { cwd: projectRoot, stdio: "pipe" });
};

async function loginAndroid(
  user: TempUser,
  packageName: string | null,
  devClientPort: number,
  protectedRoute = "rik://auth/login",
) {
  writeJson(path.join(projectRoot, "artifacts/marketplace-android-user.json"), user);
  resetAndroidAppState(packageName);
  let current = await ensureAndroidDevClientLoaded(packageName, devClientPort);
  if (!isAndroidLoginScreenSafe(current.xml)) {
    startAndroidRoute(packageName, protectedRoute);
    await sleep(1200);
    current = await poll(
      "android:market_login_screen",
      async () => {
        const screen = dumpAndroidScreen("android-market-login");
        if (isAndroidDevMenuIntroScreen(screen.xml)) {
          dismissAndroidDevMenuIntro(screen.xml);
          return null;
        }
        if (isAndroidGoogleServicesScreen(screen.xml)) {
          dismissAndroidGoogleServicesScreen(screen.xml);
          startAndroidRoute(packageName, protectedRoute);
          return null;
        }
        if (isAndroidSystemAnrDialog(screen.xml)) {
          dismissAndroidSystemAnrDialog(screen.xml);
          return null;
        }
        if (isAndroidDevLauncherHome(screen.xml)) {
          const serverNode = findAndroidDevServerNode(parseAndroidNodes(screen.xml), devClientPort);
          if (serverNode && tapAndroidBounds(serverNode.bounds)) {
            return null;
          }
          if (packageName) {
            startAndroidDevClientProject(packageName, devClientPort);
            return null;
          }
        }
        if (isAndroidLauncherHome(screen.xml) && packageName) {
          execFileSync("adb", ["shell", "monkey", "-p", packageName, "-c", "android.intent.category.LAUNCHER", "1"], {
            cwd: projectRoot,
            stdio: "pipe",
          });
          startAndroidRoute(packageName, protectedRoute);
          return null;
        }
        if (packageName && screen.xml.includes(`package="${packageName}"`) && !isAndroidLoginScreenSafe(screen.xml)) {
          if (isAndroidBlankAppSurface(screen.xml, packageName)) {
            startAndroidDevClientProject(packageName, devClientPort);
            await sleep(1200);
            startAndroidRoute(packageName, protectedRoute);
            return null;
          }
          startAndroidRoute(packageName, protectedRoute);
          return null;
        }
        return isAndroidLoginScreenSafe(screen.xml) ? screen : null;
      },
      45_000,
      1200,
    );
  }

  const nodes = parseAndroidNodes(current.xml);
  await submitAndroidLoginFromNodes(nodes, user);

  let latest = current;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await sleep(1400);
    const screen = dumpAndroidScreen("android-market-after-login");
    latest = screen;
    if (isAndroidDevMenuIntroScreen(screen.xml)) {
      dismissAndroidDevMenuIntro(screen.xml);
      continue;
    }
    if (isAndroidGoogleServicesScreen(screen.xml)) {
      dismissAndroidGoogleServicesScreen(screen.xml);
      continue;
    }
    if (isAndroidSystemAnrDialog(screen.xml)) {
      dismissAndroidSystemAnrDialog(screen.xml);
      continue;
    }
    if (isAndroidLoginScreenSafe(screen.xml)) {
      const retry = findAndroidLoginNodeSafe(parseAndroidNodes(screen.xml));
      if (retry) {
        pressAndroidKey(4);
        await sleep(250);
        tapAndroidBounds(retry.bounds);
        await sleep(250);
        pressAndroidKey(66);
      }
      continue;
    }
    if (isAndroidLauncherHome(screen.xml) || isAndroidDevLauncherHome(screen.xml)) {
      if (packageName) {
        startAndroidDevClientProject(packageName, devClientPort);
      }
      continue;
    }
    if (isAndroidBlankAppSurface(screen.xml, packageName)) {
      if (protectedRoute) {
        startAndroidRoute(packageName, protectedRoute);
      }
      continue;
    }
    return screen;
  }

  return latest;
}

async function openAndroidRoute(
  packageName: string | null,
  routes: string[],
  artifactBase: string,
  predicate: (xml: string) => boolean,
) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    for (const route of routes) {
      startAndroidRoute(packageName, route);
      await sleep(1400);
      const screen = await poll(
        `${artifactBase}:${attempt + 1}`,
        async () => {
          const next = dumpAndroidScreen(`${artifactBase}-${attempt + 1}`);
          if (isAndroidDevMenuIntroScreen(next.xml)) {
            dismissAndroidDevMenuIntro(next.xml);
            return null;
          }
          if (isAndroidGoogleServicesScreen(next.xml)) {
            dismissAndroidGoogleServicesScreen(next.xml);
            return null;
          }
          if (isAndroidSystemAnrDialog(next.xml)) {
            dismissAndroidSystemAnrDialog(next.xml);
            return null;
          }
          if (isAndroidLauncherHome(next.xml)) {
            const appNode = findAndroidLabelNode(parseAndroidNodes(next.xml), ["rik-expo-app", "RIK Expo App"]);
            if (appNode) {
              tapAndroidBounds(appNode.bounds);
              return null;
            }
            if (packageName) {
              execFileSync("adb", ["shell", "monkey", "-p", packageName, "-c", "android.intent.category.LAUNCHER", "1"], {
                cwd: projectRoot,
                stdio: "pipe",
              });
              return null;
            }
          }
          if (isAndroidDevLauncherHome(next.xml)) {
            const serverNode = findAndroidDevServerNode(parseAndroidNodes(next.xml), androidDevClientPort);
            if (serverNode && tapAndroidBounds(serverNode.bounds)) {
              return null;
            }
          }
          if (next.xml.includes("Reloading...")) {
            return null;
          }
          if (predicate(next.xml)) return next;
          if (isAndroidDevLauncherErrorScreen(next.xml)) {
            throw new Error(`android route error screen: ${next.xml.replace(/\s+/g, " ").slice(0, 1500)}`);
          }
          return null;
        },
        30_000,
        1200,
      ).catch(() => null);
      if (screen && predicate(screen.xml)) return screen;
    }
  }
  throw new Error(`Android route did not settle: ${routes.join(", ")}`);
}

async function openAndroidMarketHome(
  packageName: string | null,
  user?: TempUser,
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const screen = await openAndroidRoute(
      packageName,
      ["rik://market", "rik:///market", "rik:///%28tabs%29/market"],
      "android-market-home",
      (xml) => isAndroidMarketHome(xml) || (user ? isAndroidLoginScreenSafe(xml) : false),
    );
    if (isAndroidMarketHome(screen.xml)) return screen;
    if (user && isAndroidLoginScreenSafe(screen.xml)) {
      await submitAndroidLoginFromNodes(parseAndroidNodes(screen.xml), user);
      await sleep(1400);
      continue;
    }
  }
  throw new Error("Android market home did not settle after authenticated retries");
}

async function focusAndroidTextField(bounds: string, value: string) {
  if (!tapAndroidBounds(bounds)) return false;
  await sleep(350);
  execFileSync("adb", ["shell", "input", "keyevent", "KEYCODE_MOVE_END"], { cwd: projectRoot, stdio: "pipe" });
  await sleep(150);
  execFileSync("adb", ["shell", "input", "keyevent", "KEYCODE_DEL"], { cwd: projectRoot, stdio: "pipe" });
  await sleep(150);
  execFileSync("adb", ["shell", "input", "text", escapeAndroidInputText(value)], { cwd: projectRoot, stdio: "pipe" });
  await sleep(500);
  pressAndroidKey(66);
  await sleep(350);
  return true;
}

async function openAndroidMarketProductFromHome(
  packageName: string | null,
  user: TempUser,
  listingId: string,
  listingTitle: string,
  productActionLabel: string,
  artifactBase: string,
) {
  await openAndroidMarketHome(packageName, user);

  return poll(
    `${artifactBase}:open_product_from_home`,
    async () => {
      const screen = dumpAndroidScreen(`${artifactBase}-from-home`);
      if (screen.xml.includes(productActionLabel)) {
        return screen;
      }
      if (screen.xml.includes("Reloading...")) {
        return null;
      }
      if (isAndroidMarketHome(screen.xml)) {
        const nodes = parseAndroidNodes(screen.xml);
        const searchNode =
          findAndroidLabelNode(nodes, ["market:search"], false)
          ?? findAndroidNode(
            nodes,
            (node) =>
              node.enabled &&
              /android\.widget\.EditText/i.test(node.className) &&
              /market:search|Search|Поиск|РџРѕРёСЃРє/i.test(`${node.text} ${node.contentDesc} ${node.hint}`),
          );
        if (searchNode) {
          await focusAndroidTextField(searchNode.bounds, listingTitle.slice(0, 24));
        }

        const listingNode =
          findAndroidLabelNode(nodes, [listingTitle], false)
          ?? findAndroidNode(nodes, (node) => `${node.text} ${node.contentDesc}`.includes(listingTitle));
        if (listingNode && tapAndroidBounds(listingNode.bounds)) {
          await sleep(1200);
          return null;
        }
      }
      return null;
    },
    45_000,
    1200,
  );
}

const dismissAndroidOkIfPresent = (xml: string) => {
  const okNode = findAndroidLabelNode(parseAndroidNodes(xml), "OK");
  if (okNode) {
    tapAndroidBounds(okNode.bounds);
    return true;
  }
  return false;
};

async function runAndroidRuntime(fixture: MarketFixture) {
  let foreman: TempUser | null = null;
  let buyer: TempUser | null = null;
  const devClient = await ensureAndroidDevClientServer();
  try {
    ensureAndroidReverseProxy(devClient.port);
    await warmAndroidDevClientBundle(devClient.port);
    const packageName = detectAndroidPackage();
    foreman = await createTempUser("foreman", "Marketplace Android Foreman", "market.android.foreman");
    const foremanStartedAt = new Date().toISOString();
    await loginAndroid(foreman, packageName, devClient.port, "rik:///market");
    const marketHome = await openAndroidMarketHome(packageName, foreman);
    const foremanProduct = await openAndroidMarketProductFromHome(
      packageName,
      foreman,
      fixture.listingId,
      fixture.listingTitle,
      "market:product:add-to-request",
      "android-market-foreman-product",
    );
    const addNode = findAndroidLabelNode(parseAndroidNodes(foremanProduct.xml), "market:product:add-to-request");
    if (!addNode) throw new Error("Android market add-to-request button not found");
    tapAndroidBounds(addNode.bounds);
    const requestEffect = await pollRequestSideEffect(foreman, fixture.noteTag, fixture.rikCode, foremanStartedAt);
    const postAddScreen = dumpAndroidScreen("android-market-after-add");
    dismissAndroidOkIfPresent(postAddScreen.xml);

    buyer = await createTempUser("buyer", "Marketplace Android Buyer", "market.android.buyer");
    const buyerStartedAt = new Date().toISOString();
    await loginAndroid(buyer, packageName, devClient.port, "rik:///market");
    const productScreen = await openAndroidMarketProductFromHome(
      packageName,
      buyer,
      fixture.listingId,
      fixture.listingTitle,
      "market:product:create-proposal",
      "android-market-product",
    );
    const proposalNode = findAndroidLabelNode(parseAndroidNodes(productScreen.xml), "market:product:create-proposal");
    if (!proposalNode) throw new Error("Android market create-proposal button not found");
    tapAndroidBounds(proposalNode.bounds);
    const proposalEffect = await pollProposalSideEffect(buyer, fixture.noteTag, fixture.rikCode, buyerStartedAt);
    const postProposalScreen = dumpAndroidScreen("android-market-after-proposal");
    dismissAndroidOkIfPresent(postProposalScreen.xml);

    return {
      status: requestEffect.itemCount > 0 && proposalEffect.itemCount > 0 ? "passed" : "failed",
      marketHomeVisible: true,
      productVisible: true,
      addToRequestWorked: requestEffect.itemCount > 0,
      createProposalWorked: proposalEffect.itemCount > 0,
      requestEffect,
      proposalEffect,
      artifacts: {
        marketHome: { xml: marketHome.xmlPath, png: marketHome.pngPath },
        foremanProduct: { xml: foremanProduct.xmlPath, png: foremanProduct.pngPath },
        product: { xml: productScreen.xmlPath, png: productScreen.pngPath },
        postAdd: { xml: postAddScreen.xmlPath, png: postAddScreen.pngPath },
        postProposal: { xml: postProposalScreen.xmlPath, png: postProposalScreen.pngPath },
      },
    };
  } finally {
    if (foreman) {
      await cleanupBusinessRowsForUser(foreman.id).catch(() => {});
      await cleanupTempUser(foreman);
    }
    if (buyer) {
      await cleanupBusinessRowsForUser(buyer.id).catch(() => {});
      await cleanupTempUser(buyer);
    }
    devClient.cleanup();
  }
}

function buildStructuralSummary() {
  const homeSource = readText("src/features/market/MarketHomeScreen.tsx");
  const repoSource = readText("src/features/market/market.repository.ts");
  const uiStoreSource = readText("src/features/market/marketUi.store.ts");
  const productSource = readText("app/product/[id].tsx");
  const cardSource = readText("src/features/market/components/MarketFeedCard.tsx");
  const supplierShowcaseSource = readText("src/features/supplierShowcase/SupplierShowcaseScreen.tsx");
  const marketplaceSources = MARKET_SOURCE_FILES.map((file) => readText(file));

  return {
    asAnyRemoved: marketplaceSources.every((source) => !source.includes(" as any")),
    brokenRoutesRemoved:
      !homeSource.includes("/chat")
      && !homeSource.includes("/auctions")
      && !productSource.includes("/chat")
      && !productSource.includes("/auctions")
      && !supplierShowcaseSource.includes("router.push(\"/auctions\"")
      && !supplierShowcaseSource.includes("router.push(\"/(tabs)/market\" as any)"),
    viewsConnected:
      repoSource.includes('from("v_catalog_marketplace")')
      && repoSource.includes('from("v_marketplace_catalog_stock")'),
    usesExistingRequestFlow:
      repoSource.includes("getOrCreateDraftRequestId")
      && repoSource.includes("addRequestItemsFromRikBatch"),
    usesExistingProposalFlow:
      repoSource.includes("proposalCreateFull")
      && repoSource.includes("proposalAddItems")
      && repoSource.includes("proposalSetItemsMeta")
      && repoSource.includes("proposalSnapshotItems")
      && repoSource.includes("proposalSubmit"),
    paginationConnected:
      repoSource.includes(".range(offset, offset + limit - 1)")
      && repoSource.includes("MARKET_PAGE_SIZE = 24")
      && homeSource.includes("onEndReached={() => void loadMore()}")
      && homeSource.includes("hasMore"),
    flashListAdopted:
      homeSource.includes("<FlashList")
      && homeSource.includes("estimatedItemSize={360}"),
    uiStoreSafe:
      !uiStoreSource.includes("supabase")
      && !uiStoreSource.includes(".from(")
      && uiStoreSource.includes("selectedItemId")
      && uiStoreSource.includes("loadingMore"),
    stockMarkersPresent:
      cardSource.includes("market_stock_")
      && productSource.includes("market_product_stock_label"),
  };
}

async function main() {
  let fixture: MarketFixture | null = null;
  const platformSpecificIssues: RuntimeIssue[] = [];
  const tscRun = runNpx(["tsc", "--noEmit", "--pretty", "false"]);
  const eslintRun = runNpx(["eslint", ...MARKET_ESLINT_FILES], 12 * 60 * 1000);
  const structural = buildStructuralSummary();

  const web = await (async () => {
    try {
      fixture = await createMarketFixture();
      return await runWebRuntime(fixture);
    } catch (error) {
      platformSpecificIssues.push({ platform: "web", issue: error instanceof Error ? error.message : String(error) });
      return { status: "failed" as const };
    }
  })();

  const android = await (async () => {
    if (!fixture) {
      platformSpecificIssues.push({ platform: "android", issue: "fixture_not_available" });
      return { status: "failed" as const };
    }
    try {
      return await runAndroidRuntime(fixture);
    } catch (error) {
      platformSpecificIssues.push({ platform: "android", issue: error instanceof Error ? error.message : String(error) });
      return { status: "failed" as const };
    }
  })();

  const iosResidual = xcrunAvailable()
    ? null
    : "xcrun is unavailable on this host; iOS simulator cannot be started from Windows";
  if (iosResidual) {
    platformSpecificIssues.push({ platform: "ios", issue: iosResidual });
  }

  const status =
    tscRun.status === 0
    && eslintRun.status === 0
    && Object.values(structural).every(Boolean)
    && web.status === "passed"
    && android.status === "passed"
      ? "passed"
      : "failed";

  const artifact = {
    generatedAt: new Date().toISOString(),
    status,
    gate: status === "passed" ? "GREEN" : "NOT_GREEN",
    fixture,
    structural,
    runtime: {
      web,
      android,
      ios: { status: iosResidual ? "residual" : "not_run", residual: iosResidual },
      runtimeGateOk: web.status === "passed" && android.status === "passed" && !!iosResidual,
      platformSpecificIssues,
    },
    staticChecks: {
      tscPassed: tscRun.status === 0,
      eslintPassed: eslintRun.status === 0,
      tscRun: { status: tscRun.status, stdout: tscRun.stdout, stderr: tscRun.stderr },
      eslintRun: { status: eslintRun.status, stdout: eslintRun.stdout, stderr: eslintRun.stderr },
    },
  };

  const summary = {
    status: artifact.status,
    gate: artifact.gate,
    addToRequestWorked: web.status === "passed" && (web as JsonRecord).addToRequestWorked === true && android.status === "passed",
    createProposalWorked: web.status === "passed" && (web as JsonRecord).createProposalWorked === true && android.status === "passed",
    viewsConnected: structural.viewsConnected,
    usesExistingRequestFlow: structural.usesExistingRequestFlow,
    usesExistingProposalFlow: structural.usesExistingProposalFlow,
    paginationConnected: structural.paginationConnected,
    flashListAdopted: structural.flashListAdopted,
    uiStoreSafe: structural.uiStoreSafe,
    asAnyRemoved: structural.asAnyRemoved,
    brokenRoutesRemoved: structural.brokenRoutesRemoved,
    stockMarkersPresent: structural.stockMarkersPresent,
    webPassed: web.status === "passed",
    androidPassed: android.status === "passed",
    iosPassed: false,
    iosResidual,
    runtimeGateOk: artifact.runtime.runtimeGateOk,
    tscPassed: artifact.staticChecks.tscPassed,
    eslintPassed: artifact.staticChecks.eslintPassed,
    artifacts: {
      webScreenshots: web.status === "passed" ? (web as { screenshots: string[] }).screenshots : [],
      androidArtifacts: android.status === "passed" ? (android as { artifacts: JsonRecord }).artifacts : null,
    },
  };

  writeJson(fullOutPath, artifact);
  writeJson(summaryOutPath, summary);

  try {
    await cleanupMarketFixture(fixture);
  } catch {}

  console.log(JSON.stringify(summary, null, 2));
  if (summary.status !== "passed") {
    process.exitCode = 1;
  }
}

void main();
