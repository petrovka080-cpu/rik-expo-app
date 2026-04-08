import path from "node:path";

import { config as loadDotenv } from "dotenv";
import { createClient } from "@supabase/supabase-js";

import {
  createTempUser,
  cleanupTempUser,
  createVerifierAdmin,
  type RuntimeTestUser,
} from "./_shared/testUserDiscipline";
import {
  baseUrl,
  captureWebFailureArtifact,
  launchWebRuntime,
  poll,
  writeJsonArtifact,
} from "./_shared/webRuntimeHarness";
import { REQUEST_DRAFT_STATUS, REQUEST_PENDING_STATUS } from "../src/lib/api/requests.status";

loadDotenv({ path: ".env.local", override: false });
loadDotenv({ path: ".env", override: false });
process.env.RIK_WEB_BROWSER_CHANNEL ??= "msedge";

const projectRoot = process.cwd();
const admin = createVerifierAdmin("director-request-scroll-runtime-verify");
const artifactBase = "artifacts/director-request-scroll-runtime-proof";
const artifactJsonPath = path.join(projectRoot, `${artifactBase}.json`);
const artifactPngPath = path.join(projectRoot, `${artifactBase}.png`);
const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const anonKey = String(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
const supabaseProjectRef = (() => {
  try {
    return new URL(supabaseUrl).hostname.split(".")[0] || "";
  } catch {
    return "";
  }
})();
const supabaseStorageKey = `sb-${supabaseProjectRef}-auth-token`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const toText = (value: unknown) => String(value ?? "").trim();

type SeededScope = {
  requestId: string;
  displayNo: string;
  firstItemName: string;
  lastItemName: string;
  itemIds: string[];
};

async function seedScrollableDirectorRequest(): Promise<SeededScope> {
  const marker = `DIRSCROLL-${Date.now().toString(36).toUpperCase()}`;
  const displayNo = `REQ-${marker}/2026`;

  const requestInsert = await admin
    .from("requests")
    .insert({
      status: REQUEST_DRAFT_STATUS,
      display_no: displayNo,
      object_name: marker,
      note: marker,
    })
    .select("id, display_no")
    .single();
  if (requestInsert.error) throw requestInsert.error;

  const requestId = toText(requestInsert.data.id);
  const itemNames = Array.from({ length: 30 }, (_, index) => `${marker}-ITEM-${String(index + 1).padStart(2, "0")}`);

  const itemInsert = await admin
    .from("request_items")
    .insert(
      itemNames.map((name, index) => ({
        request_id: requestId,
        name_human: name,
        qty: index + 1,
        uom: "pcs",
        rik_code: name,
        status: REQUEST_DRAFT_STATUS,
        item_kind: "material",
        note: name,
      })),
    )
    .select("id,name_human");
  if (itemInsert.error) throw itemInsert.error;

  const markItemsPending = await admin
    .from("request_items")
    .update({ status: REQUEST_PENDING_STATUS })
    .eq("request_id", requestId);
  if (markItemsPending.error) throw markItemsPending.error;

  const markRequestPending = await admin
    .from("requests")
    .update({ status: REQUEST_PENDING_STATUS })
    .eq("id", requestId);
  if (markRequestPending.error) throw markRequestPending.error;

  return {
    requestId,
    displayNo: toText(requestInsert.data.display_no),
    firstItemName: itemNames[0] ?? "",
    lastItemName: itemNames[itemNames.length - 1] ?? "",
    itemIds: (itemInsert.data ?? []).map((row) => toText(row.id)).filter(Boolean),
  };
}

async function cleanupSeededScope(scope: SeededScope | null) {
  if (!scope) return;
  try {
    if (scope.itemIds.length) {
      await admin.from("request_items").delete().in("id", scope.itemIds);
    }
  } catch {
    // best effort cleanup
  }
  try {
    await admin.from("requests").delete().eq("id", scope.requestId);
  } catch {
    // best effort cleanup
  }
}

async function signInSession(email: string, password: string) {
  const client = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        "x-client-info": "director-request-scroll-runtime-verify-signin",
      },
    },
  });

  const result = await client.auth.signInWithPassword({ email, password });
  if (result.error || !result.data.session) {
    throw result.error ?? new Error(`signInWithPassword returned no session for ${email}`);
  }
  return result.data.session;
}

async function hydrateDirectorSession(
  page: import("playwright").Page,
  user: RuntimeTestUser,
  readyNeedles: (string | RegExp)[],
) {
  const session = await signInSession(user.email, user.password);
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    {
      key: supabaseStorageKey,
      value: JSON.stringify(session),
    },
  );

  await page.goto(`${baseUrl}/director`, { waitUntil: "networkidle", timeout: 60_000 });
  await poll(
    "director_scroll_session_hydrated",
    async () => {
      const currentUrl = page.url();
      if (currentUrl.includes("/auth/login")) return null;
      const body = await page.evaluate(() => document.body.innerText || "");
      return readyNeedles.some((needle) =>
        typeof needle === "string" ? body.includes(needle) : needle.test(body),
      )
        ? true
        : null;
    },
    45_000,
    500,
  );
}

async function clickDirectorRequestCard(page: import("playwright").Page, displayNo: string) {
  const clicked = await page.evaluate((label) => {
    const nodes = Array.from(document.querySelectorAll('div[tabindex],button,[role="button"]'));
    const target = nodes.find((node) =>
      String(node.textContent ?? "").replace(/\s+/g, " ").trim().includes(label),
    ) as HTMLElement | undefined;
    if (!target) return false;
    target.click();
    return true;
  }, displayNo);
  if (!clicked) {
    throw new Error(`Director request card not found for ${displayNo}`);
  }
}

async function captureScrollMetrics(
  page: import("playwright").Page,
  params: { firstItemName: string; lastItemName: string },
) {
  return await poll(
    "director_request_scroll_metrics",
    async () => {
      const metrics = await page.evaluate(async ({ firstItemName, lastItemName }) => {
        const markerPrefix = firstItemName.split("-ITEM-")[0] ?? firstItemName;
        let lastItemElement = Array.from(document.querySelectorAll("div,span")).find((element) =>
          String(element.textContent || "").replace(/\s+/g, " ").trim().includes(lastItemName),
        ) as HTMLElement | undefined;

        const candidates = Array.from(document.querySelectorAll("div"))
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            const style = window.getComputedStyle(element);
            return (
              rect.width > 0 &&
              rect.height > 0 &&
              style.display !== "none" &&
              style.visibility !== "hidden" &&
              style.opacity !== "0"
            );
          })
          .map((element) => ({
            element,
            text: (element.textContent || "").replace(/\s+/g, " ").trim(),
            scrollHeight: element.scrollHeight,
            clientHeight: element.clientHeight,
          }))
          .filter((candidate) => candidate.scrollHeight - candidate.clientHeight > 40 && candidate.text.includes(firstItemName));

        const sortedCandidates = candidates.sort(
          (left, right) =>
            (right.scrollHeight - right.clientHeight) - (left.scrollHeight - left.clientHeight),
        );
        if (sortedCandidates.length === 0) return null;

        let bestMetrics: {
          beforeTop: number;
          afterTop: number;
          clientHeight: number;
          scrollHeight: number;
          maxScrollTop: number;
          lastItemElementFound: boolean;
          beforeLastVisible: boolean;
          afterLastVisible: boolean;
          targetContainsLastItem: boolean;
          lastItemRenderedInScrolledBody: boolean;
          renderedMarkerTexts: string[];
          candidateIndex: number;
        } | null = null;

        for (let index = 0; index < sortedCandidates.length; index += 1) {
          const target = sortedCandidates[index]!;
          const beforeTop = target.element.scrollTop;
          const beforeLastRect = lastItemElement?.getBoundingClientRect() ?? null;
          const beforeLastVisible = beforeLastRect
            ? beforeLastRect.height > 0 &&
              beforeLastRect.width > 0 &&
              beforeLastRect.bottom > 0 &&
              beforeLastRect.right > 0 &&
              beforeLastRect.top < window.innerHeight &&
              beforeLastRect.left < window.innerWidth
            : false;

          target.element.scrollTop = target.element.scrollHeight;
          target.element.dispatchEvent(new Event("scroll", { bubbles: true }));
          await new Promise<void>((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
          });

          lastItemElement = Array.from(document.querySelectorAll("div,span")).find((element) =>
            String(element.textContent || "").replace(/\s+/g, " ").trim().includes(lastItemName),
          ) as HTMLElement | undefined;
          const afterTop = target.element.scrollTop;
          const afterLastRect = lastItemElement?.getBoundingClientRect() ?? null;
          const afterLastVisible = afterLastRect
            ? afterLastRect.height > 0 &&
              afterLastRect.width > 0 &&
              afterLastRect.bottom > 0 &&
              afterLastRect.right > 0 &&
              afterLastRect.top < window.innerHeight &&
              afterLastRect.left < window.innerWidth
            : false;
          const lastItemRect = lastItemElement?.getBoundingClientRect() ?? null;
          const lastItemStyle = lastItemElement ? window.getComputedStyle(lastItemElement) : null;
          const renderedMarkerTexts = Array.from(target.element.querySelectorAll("div,span"))
            .map((element) => String(element.textContent || "").replace(/\s+/g, " ").trim())
            .filter((text) => text.includes(markerPrefix))
            .slice(0, 80);
          const candidateMetrics = {
            beforeTop,
            afterTop,
            clientHeight: target.clientHeight,
            scrollHeight: target.scrollHeight,
            maxScrollTop: Math.max(0, target.scrollHeight - target.clientHeight),
            lastItemElementFound: Boolean(
              lastItemRect &&
                lastItemStyle &&
                lastItemRect.width > 0 &&
                lastItemRect.height > 0 &&
                lastItemStyle.display !== "none" &&
                lastItemStyle.visibility !== "hidden" &&
                lastItemStyle.opacity !== "0",
            ),
            beforeLastVisible,
            afterLastVisible,
            targetContainsLastItem: Boolean(lastItemElement && target.element.contains(lastItemElement)),
            lastItemRenderedInScrolledBody: renderedMarkerTexts.some((text) => text.includes(lastItemName)),
            renderedMarkerTexts,
            candidateIndex: index,
          };

          if (
            !bestMetrics ||
            candidateMetrics.lastItemRenderedInScrolledBody ||
            candidateMetrics.afterLastVisible ||
            candidateMetrics.afterTop > bestMetrics.afterTop
          ) {
            bestMetrics = candidateMetrics;
          }

          if (candidateMetrics.lastItemRenderedInScrolledBody || candidateMetrics.afterLastVisible) {
            break;
          }
        }

        return bestMetrics;
      }, params);

      if (!metrics) return null;
      return metrics.afterTop > metrics.beforeTop || metrics.afterLastVisible ? metrics : null;
    },
    20_000,
    400,
  );
}

async function main() {
  let directorUser: RuntimeTestUser | null = null;
  let scope: SeededScope | null = null;
  let browser: import("playwright").Browser | null = null;

  try {
    if (!supabaseUrl || !anonKey || !supabaseProjectRef) {
      throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY");
    }

    scope = await seedScrollableDirectorRequest();
    directorUser = await createTempUser(admin, {
      role: "director",
      fullName: "Director Scroll Verify",
      emailPrefix: "director.request.scroll",
    });

    const session = await launchWebRuntime();
    browser = session.browser;
    const page = session.page;

    await hydrateDirectorSession(page, directorUser, [/Прор/i, /Заяв/i]);
    await poll(
      `director_request_visible:${scope.displayNo}`,
      async () => {
        const body = await page.evaluate(() => document.body.innerText || "");
        return body.includes(scope!.displayNo) ? true : null;
      },
      45_000,
      500,
    );

    await clickDirectorRequestCard(page, scope.displayNo);
    await poll(
      "director_sheet_open",
      async () => {
        const body = await page.evaluate(() => document.body.innerText || "");
        return body.includes(scope!.firstItemName) ? true : null;
      },
      15_000,
      300,
    );

    const metrics = await captureScrollMetrics(page, {
      firstItemName: scope.firstItemName,
      lastItemName: scope.lastItemName,
    });

    await sleep(750);
    await page.screenshot({
      path: artifactPngPath,
      fullPage: true,
    });

    writeJsonArtifact(artifactJsonPath, {
      status:
        metrics.afterTop > metrics.beforeTop &&
        metrics.maxScrollTop > 0 &&
        (metrics.afterLastVisible || metrics.lastItemRenderedInScrolledBody)
          ? "GREEN"
          : "NOT_GREEN",
      checkedAt: new Date().toISOString(),
      baseUrl,
      request: {
        requestId: scope.requestId,
        displayNo: scope.displayNo,
        firstItemName: scope.firstItemName,
        lastItemName: scope.lastItemName,
        itemCount: scope.itemIds.length,
      },
      metrics,
      finalUrl: page.url(),
      pageErrors: session.runtime.pageErrors,
      badResponses: session.runtime.badResponses,
      blockingConsole: session.runtime.console.filter((entry) => entry.type === "error"),
      screenshot: artifactPngPath.replace(/\\/g, "/"),
    });
  } catch (error) {
    if (browser) {
      const page = browser.contexts()[0]?.pages()[0] ?? null;
      if (page) {
        await captureWebFailureArtifact(page, artifactBase).catch(() => undefined);
      }
    }
    writeJsonArtifact(artifactJsonPath, {
      status: "NOT_GREEN",
      checkedAt: new Date().toISOString(),
      request: scope,
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack ?? null,
            }
          : String(error),
    });
    throw error;
  } finally {
    if (browser) await browser.close().catch(() => undefined);
    await cleanupSeededScope(scope);
    await cleanupTempUser(admin, directorUser);
  }
}

void main();
