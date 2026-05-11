import { asListingItems } from "../market/marketHome.data";
import { planFanoutBatch } from "../../lib/async/fanoutBatchPlan";
import { mapWithConcurrencyLimit } from "../../lib/async/mapWithConcurrencyLimit";
import { recordPlatformObservability } from "../../lib/observability/platformObservability";
import {
  clearLocalDraftId,
  fetchRequestDetails,
  getLocalDraftId,
  getOrCreateDraftRequestId,
  rikQuickSearch,
  updateRequestMeta,
} from "../../lib/catalog_api";
import { requestItemAddOrIncAndPatchMeta } from "../../screens/foreman/foreman.helpers";
import {
  resolveForemanQuickRequest,
} from "../../screens/foreman/foreman.ai";
import {
  loadAssistantCurrentAuthUser,
  loadAssistantActorReadScope,
  loadAssistantCompanyRowsByIds,
  loadAssistantMarketListingRows,
  loadAssistantProfileRowsByUserIds,
} from "./assistantActions.transport";
import {
  clearForemanAssistantSession,
  loadForemanAssistantSession,
  saveForemanAssistantSession,
  type AssistantParsedItemSnapshot,
  type ForemanAssistantSession,
} from "./assistantStorage";
import type { AssistantContext, AssistantRole } from "./assistant.types";
import {
  assertNoDirectAiMutation,
  submitAiActionForApproval,
} from "./approval/aiApprovalGate";
import { createAiActionAuditEvent } from "./audit/aiActionAudit";
import type { AiDomain, AiUserRole } from "./policy/aiRolePolicy";
import type { AiActionType } from "./policy/aiRiskPolicy";
import { normalizeAssistantRoleToAiUserRole } from "./schemas/aiRoleSchemas";

type AssistantActorContext = {
  userId: string;
  fullName: string;
  companyId: string | null;
};

const ASSISTANT_CATALOG_MATCH_CONCURRENCY_LIMIT = 5;
const ASSISTANT_CATALOG_MATCH_ITEM_LIMIT = 40;
const ASSISTANT_MARKET_SEARCH_QUERY_LIMIT = 3;
const ASSISTANT_MARKET_SEARCH_CONCURRENCY_LIMIT = 2;
const ASSISTANT_FOREMAN_SCREEN_ID = "foreman.ai.quick_modal";
const ASSISTANT_BUYER_SCREEN_ID = "buyer.main";
const ASSISTANT_MARKET_SCREEN_ID = "market.home";

type AssistantActionResult = {
  handled: boolean;
  reply?: string;
};

type AssistantParsedItem = AssistantParsedItemSnapshot & {
  name: string;
  qty: number;
  unit: string;
  kind: "material" | "work" | "service";
  specs?: string | null;
};

type MarketSearchResult = {
  source: "market" | "catalog";
  id: string;
  title: string;
  price: number | null;
  city: string | null;
  supplier: string | null;
};

const isNonEmptyString = (value: string | null | undefined): value is string =>
  typeof value === "string" && value.trim().length > 0;

const recordAssistantActionFallback = (
  event: string,
  error: unknown,
  extra?: Record<string, unknown>,
) =>
  recordPlatformObservability({
    screen: "ai",
    surface: "assistant_actions",
    category: "ui",
    event,
    result: "error",
    fallbackUsed: true,
    errorClass: error instanceof Error ? error.name : undefined,
    errorMessage: error instanceof Error ? error.message : String(error ?? "assistant_action_failed"),
    extra: {
      module: "ai.assistantActions",
      route: "/ai",
      role: "ai",
      owner: "assistant_actions",
      severity: "error",
      ...extra,
    },
  });

type ForemanItemsResolution =
  | { kind: "items"; items: AssistantParsedItem[] }
  | { kind: "clarify"; pending: AssistantParsedItem[] };

const CREATE_REQUEST_RE =
  /(сдела(й|ть)|созда(й|ть)|оформи|собери|добав(ь|ить)|нужн[аоы]?|надо|подготовь).{0,24}(заявк|черновик)|\b(заявк[ауеи]|черновик)\b/i;
const SEND_DRAFT_RE =
  /(отправ(ь|ить)?|подай|на утверждение|директору|пошли).{0,18}(черновик|заявк)?|\bотправь черновик\b/i;
const MARKET_SEARCH_RE =
  /(найд(и|и мне)|ищ(и|и мне)|поиск|рынок|маркет|сколько стоит|цена|поставщик|сравн(и|ить)|предложени)/i;
const MARKET_SEARCH_EN_RE =
  /\b(find|search|market|supplier|price|compare|catalog|rfq)\b/i;
const BUYER_PROPOSAL_RE =
  /(предложени|закупк|оформи заказ|создай заказ|сделай заказ|создай предложение)/i;
const DIRECT_AI_MUTATION_RE =
  /\b(submit|send|create|update|delete|approve|confirm|finali[sz]e|pay|payment)\b/i;
const UNIT_RE =
  /(\d+(?:[.,]\d+)?)\s*(шт|штук|штука|мешок|мешка|мешков|м2|м²|м3|м³|м|метр(?:а|ов)?|кг|килограмм(?:а|ов)?|т|тонн(?:а|ы)?|л|литр(?:а|ов)?|комплект(?:а|ов)?)/i;
const FILLER_RE =
  /\b(мне|нужен|нужна|нужны|нужно|пожалуйста|срочно|надо|для|сделай|создай|оформи|добавь|в|заявку|черновик|заказ|предложение|закупку|на|рынке|маркет|найди|ищи|цена|стоит|сравни|поставщиков?)\b/gi;

function normalizeText(value: string | null | undefined): string {
  return String(value ?? "").trim().toLowerCase();
}

function buildAssistantCatalogMatchFanoutKey(item: AssistantParsedItem): string {
  return JSON.stringify([
    normalizeText(item.name),
    Number.isFinite(item.qty) ? item.qty : 0,
    normalizeUnit(item.unit),
    item.kind,
    normalizeText(item.specs ?? null),
  ]);
}

function normalizeUnit(unit: string | null | undefined): string {
  const raw = normalizeText(unit).replace(/\s+/g, "");
  if (!raw) return "шт";
  if (["шт", "штук", "штука"].includes(raw)) return "шт";
  if (["мешок", "мешка", "мешков"].includes(raw)) return "мешок";
  if (["м", "метр", "метра", "метров"].includes(raw)) return "м";
  if (["м2", "м²"].includes(raw)) return "м2";
  if (["м3", "м³"].includes(raw)) return "м3";
  if (["кг", "килограмм", "килограмма", "килограммов"].includes(raw)) return "кг";
  if (["т", "тонна", "тонны"].includes(raw)) return "т";
  if (["л", "литр", "литра", "литров"].includes(raw)) return "л";
  if (["комплект", "комплекта", "комплектов"].includes(raw)) return "комплект";
  return raw;
}

function inferKind(name: string): "material" | "work" | "service" {
  const text = normalizeText(name);
  if (/(достав|аренд|кран|экскават|логист|перевоз|манипулятор|самосвал|услуг)/.test(text)) {
    return "service";
  }
  if (/(монтаж|демонтаж|кладк|бетон|сварк|штукатур|маляр|работ)/.test(text)) {
    return "work";
  }
  return "material";
}

function cleanupItemName(value: string): string {
  const cleaned = String(value || "")
    .replace(UNIT_RE, "")
    .replace(FILLER_RE, " ")
    .replace(/[.,;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function parseHeuristicItems(message: string): AssistantParsedItem[] {
  const base = String(message || "")
    .replace(/\r/g, "\n")
    .replace(/\s+и\s+/gi, "\n")
    .replace(/[;,]+/g, "\n");

  return base
    .split("\n")
    .map((chunk) => {
      const raw = String(chunk || "").trim();
      if (!raw) return null;

      const unitMatch = raw.match(UNIT_RE);
      const qty = unitMatch ? Number(String(unitMatch[1]).replace(",", ".")) : 0;
      const unit = normalizeUnit(unitMatch?.[2] ?? "шт");
      const name = cleanupItemName(raw);
      if (!name) return null;

      return {
        name,
        qty: Number.isFinite(qty) ? qty : 0,
        unit,
        kind: inferKind(name),
      } satisfies AssistantParsedItem;
    })
    .filter((item): item is AssistantParsedItem => Boolean(item));
}

function extractSearchQueries(message: string): string[] {
  const heuristicItems = parseHeuristicItems(message)
    .map((item) => item.name)
    .filter(Boolean);
  if (heuristicItems.length > 0) {
    return Array.from(new Set(heuristicItems)).slice(
      0,
      ASSISTANT_MARKET_SEARCH_QUERY_LIMIT,
    );
  }

  const cleaned = String(message || "")
    .replace(FILLER_RE, " ")
    .replace(/[?!.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return [];
  return [cleaned];
}

function isForemanActionContext(role: AssistantRole, context: AssistantContext): boolean {
  return context === "foreman" || role === "foreman";
}

function isBuyerActionContext(role: AssistantRole, context: AssistantContext): boolean {
  return context === "buyer" || role === "buyer";
}

function isMarketActionContext(context: AssistantContext): boolean {
  return context === "market" || context === "supplierMap";
}

export function supportsAssistantActionMode(role: AssistantRole, context: AssistantContext): boolean {
  return isForemanActionContext(role, context) || isBuyerActionContext(role, context) || isMarketActionContext(context);
}

async function loadAssistantActorContext(): Promise<AssistantActorContext | null> {
  const { data: authResult, error } = await loadAssistantCurrentAuthUser();
  if (error) throw error;
  const user = authResult.user;
  if (!user?.id) return null;

  const { data } = await loadAssistantActorReadScope(user.id);
  const scope = data?.[0] ?? null;
  const profileResult = { data: { full_name: scope?.profile_full_name ?? null } };
  const membershipResult = { data: { company_id: scope?.membership_company_id ?? null } };
  const ownedCompanyResult = { data: { id: scope?.owned_company_id ?? null } };
  const listingCompanyResult = { data: { company_id: scope?.listing_company_id ?? null } };

  return {
    userId: user.id,
    fullName: String(profileResult.data?.full_name || user.user_metadata?.full_name || "Пользователь").trim(),
    companyId:
      membershipResult.data?.company_id
      || ownedCompanyResult.data?.id
      || listingCompanyResult.data?.company_id
      || null,
  };
}

async function searchMarketListings(query: string, limit = 6): Promise<MarketSearchResult[]> {
  const result = await loadAssistantMarketListingRows();
  if (result.error) throw result.error;

  const rows = Array.isArray(result.data) ? result.data : [];
  const normalizedQuery = normalizeText(query);
  const filtered = rows.filter((row) => {
    const items = asListingItems(row.items_json ?? null);
    const itemText = items
      .flatMap((item) => [item.name, item.rik_code, item.kind, item.city])
      .map(normalizeText)
      .filter(Boolean)
      .join(" ");
    const haystack = [
      row.title,
      row.city,
      row.description,
      row.kind,
      itemText,
    ]
      .map(normalizeText)
      .filter(Boolean)
      .join(" ");
    return haystack.includes(normalizedQuery);
  });

  const trimmed = filtered.slice(0, limit);
  const companyIds = Array.from(new Set(trimmed.map((row) => row.company_id).filter(isNonEmptyString)));
  const userIds = Array.from(new Set(trimmed.map((row) => row.user_id).filter(isNonEmptyString)));

  const [companiesResult, profilesResult] = await Promise.all([
    loadAssistantCompanyRowsByIds(companyIds),
    loadAssistantProfileRowsByUserIds(userIds),
  ]);

  const companyMap = new Map<string, string>();
  for (const company of companiesResult.data ?? []) {
    if (company?.id) companyMap.set(company.id, company.name || "Компания");
  }

  const profileMap = new Map<string, string>();
  for (const profile of profilesResult.data ?? []) {
    if (profile?.user_id) profileMap.set(profile.user_id, profile.full_name || "Поставщик");
  }

  return trimmed.map((row) => ({
    source: "market",
    id: String(row.id),
    title: String(row.title || "").trim(),
    price: typeof row.price === "number" ? row.price : row.price != null ? Number(row.price) || null : null,
    city: row.city ?? null,
    supplier:
      (row.company_id ? companyMap.get(row.company_id) : null)
      || (row.user_id ? profileMap.get(row.user_id) : null)
      || null,
  }));
}

async function smartSearch(query: string, limit = 6): Promise<MarketSearchResult[]> {
  const marketRows = await searchMarketListings(query, limit).catch((error) => {
    recordAssistantActionFallback("search_market_listings_failed", error, {
      action: "smartSearch",
      query,
      limit,
    });
    return [];
  });
  if (marketRows.length > 0) return marketRows;

  const catalogRows = await rikQuickSearch(query, limit).catch((error) => {
    recordAssistantActionFallback("search_catalog_failed", error, {
      action: "smartSearch",
      query,
      limit,
    });
    return [];
  });
  return catalogRows.slice(0, limit).map((row) => ({
    source: "catalog",
    id: String(row.rik_code || ""),
    title: String(row.name_human || row.rik_code || "").trim(),
    price: null,
    city: null,
    supplier: null,
  }));
}

function formatSearchResults(prefix: string, resultsByQuery: { query: string; rows: MarketSearchResult[] }[], buyerMode: boolean): string {
  const sections: string[] = [];

  for (const { query, rows } of resultsByQuery) {
    if (!rows.length) {
      sections.push(`• ${query}: ничего не нашел ни на рынке, ни в каталоге.`);
      continue;
    }

    const body = rows
      .slice(0, 5)
      .map((row, index) => {
        const price = row.price != null ? `${row.price.toLocaleString("ru-RU")} сом` : "цена не указана";
        const supplier = row.supplier ? ` • ${row.supplier}` : "";
        const city = row.city ? ` • ${row.city}` : "";
        const icon = row.source === "market" ? "🛒" : "📚";
        return `${index + 1}. ${icon} ${row.title} — ${price}${supplier}${city}`;
      })
      .join("\n");

    sections.push(`${query}:\n${body}`);
  }

  const lines = [`${prefix}\n${sections.join("\n\n")}`];
  if (buyerMode) {
    lines.push("Для создания предложения в текущей логике приложения нужны одобренные позиции во входе снабжения. Через AI здесь я могу быстро найти рынок и сравнить варианты, не обходя buyer boundary.");
  } else {
    lines.push("Если нужен полный список, открой Маркет или Карту поставщиков из верхних переходов.");
  }

  return lines.join("\n\n");
}

function hasMissingQuantities(items: AssistantParsedItem[]): boolean {
  return items.some((item) => !Number.isFinite(item.qty) || item.qty <= 0);
}

function formatClarifyReply(items: { name: string }[]): string {
  const names = items.map((item) => item.name).filter(Boolean);
  if (!names.length) {
    return 'Не понял позиции для заявки. Напиши, например: "цемент М400 50 мешков, кирпич 2000 шт".';
  }
  return `Нужно уточнить количество для: ${names.join(", ")}. Напиши, например: "цемент М400 50 мешков, ${names[0].toLowerCase()} 200 шт".`;
}

function isLikelyForemanMutation(message: string): boolean {
  const text = String(message || "");
  return CREATE_REQUEST_RE.test(text) || (/\d/.test(text) && /(меш|шт|м2|м3|кг|т|литр|комплект|м\b)/i.test(text));
}

function looksLikeQuantityReply(message: string): boolean {
  const text = String(message || "").trim();
  if (!text) return false;
  if (/^(на|по)?\s*\d+(?:[.,]\d+)?(\s*(шт|мешок|мешков|м2|м3|кг|т|л|м))?$/i.test(text)) return true;
  return text.length <= 32 && /\d/.test(text);
}

function extractQuantities(message: string): number[] {
  return Array.from(String(message || "").matchAll(/(\d+(?:[.,]\d+)?)/g))
    .map((match) => Number(String(match[1]).replace(",", ".")))
    .filter((value) => Number.isFinite(value) && value > 0);
}

function resolvePendingClarification(pendingItems: AssistantParsedItem[], message: string): AssistantParsedItem[] | "clarify" {
  const parsed = parseHeuristicItems(message);
  if (parsed.length > 0 && !hasMissingQuantities(parsed)) {
    if (pendingItems.length === 1 && parsed.length >= 1) {
      return [{ ...pendingItems[0], qty: parsed[0].qty, unit: parsed[0].unit || pendingItems[0].unit }];
    }
    if (pendingItems.length === parsed.length) {
      return pendingItems.map((item, index) => ({
        ...item,
        qty: parsed[index].qty,
        unit: parsed[index].unit || item.unit,
      }));
    }
    return parsed;
  }

  const quantities = extractQuantities(message);
  if (pendingItems.length === 1 && quantities.length >= 1) {
    return [{ ...pendingItems[0], qty: quantities[0] }];
  }
  if (quantities.length === pendingItems.length) {
    return pendingItems.map((item, index) => ({
      ...item,
      qty: quantities[index],
    }));
  }

  return "clarify";
}

async function resolveForemanItems(message: string): Promise<ForemanItemsResolution> {
  const heuristic = parseHeuristicItems(message);
  const quick = await resolveForemanQuickRequest(message).catch((error) => {
    recordAssistantActionFallback("resolve_foreman_quick_request_failed", error, {
      action: "resolveForemanItems",
      messageLength: message.length,
    });
    return null;
  });

  if (quick?.type === "resolved_items" && quick.items.length > 0) {
    return {
      kind: "items",
      items: quick.items.map((item) => ({
        name: item.name,
        qty: item.qty,
        unit: item.unit,
        kind: item.kind,
        specs: item.specs ?? null,
      })),
    };
  }

  if (heuristic.length > 0) {
    return { kind: "clarify", pending: heuristic };
  }

  return { kind: "clarify", pending: [] };
}

async function createOrAppendForemanDraft(
  actor: AssistantActorContext,
  items: AssistantParsedItem[],
  sourceMessage: string,
  session: ForemanAssistantSession,
  requestedByRole: AiUserRole,
): Promise<string> {
  const draftDecision = assertNoDirectAiMutation({
    actionType: "draft_request",
    role: requestedByRole,
    screenId: ASSISTANT_FOREMAN_SCREEN_ID,
    domain: "procurement",
    mutationPolicy: "draft_only",
  });
  if (!draftDecision.allowed) {
    return `AI action blocked: ${draftDecision.reason}.`;
  }

  const matchPlan = planFanoutBatch(items, {
    maxItems: ASSISTANT_CATALOG_MATCH_ITEM_LIMIT,
    getKey: (item) => buildAssistantCatalogMatchFanoutKey(item),
  });
  if (matchPlan.duplicateCount > 0 || matchPlan.cappedCount > 0) {
    recordPlatformObservability({
      screen: "ai",
      surface: "assistant_actions",
      category: "ui",
      event: "assistant_catalog_match_batch_planned",
      result: "success",
      fallbackUsed: false,
      extra: {
        module: "ai.assistantActions",
        route: "/ai",
        role: "ai",
        owner: "assistant_actions",
        sourceItemCount: matchPlan.sourceCount,
        resolveItemCount: matchPlan.resolveItems.length,
        duplicateItemCount: matchPlan.duplicateCount,
        cappedItemCount: matchPlan.cappedCount,
      },
    });
  }

  const resolvedMatches = await mapWithConcurrencyLimit(
    matchPlan.resolveItems,
    ASSISTANT_CATALOG_MATCH_CONCURRENCY_LIMIT,
    async (item) => {
      const rows = await rikQuickSearch(item.name, 6).catch((error) => {
        recordAssistantActionFallback("match_catalog_item_failed", error, {
          action: "createOrAppendForemanDraft",
          itemName: item.name,
          itemKind: item.kind,
        });
        return [];
      });
      const best = rows[0] ?? null;
      return {
        item,
        match: best,
      };
    },
  );
  const matches = items.map((item, index) => {
    const resolveIndex = matchPlan.sourceToResolveIndex[index];
    if (resolveIndex == null) return { item, match: null };
    return {
      item,
      match: resolvedMatches[resolveIndex]?.match ?? null,
    };
  });

  const matched = matches.filter((entry) => entry.match?.rik_code);
  const unmatched = matches.filter((entry) => !entry.match?.rik_code);

  if (!matched.length) {
    const missing = unmatched.map((entry) => entry.item.name).join(", ");
    return `Не смог сопоставить позиции с catalog API: ${missing || "ничего не найдено"}. Уточни названия ближе к каталогу RIK.`;
  }

  const rid = await getOrCreateDraftRequestId();
  await updateRequestMeta(rid, {
    foreman_name: actor.fullName || null,
    comment: sourceMessage,
  }).catch((error) => {
    recordAssistantActionFallback("update_request_meta_failed", error, {
      action: "createOrAppendForemanDraft",
      requestId: rid,
    });
    return false;
  });

  for (const entry of matched) {
    await requestItemAddOrIncAndPatchMeta(rid, String(entry.match?.rik_code), entry.item.qty, {
      name_human: entry.item.name,
      uom: entry.item.unit,
      kind: entry.item.kind,
      note: entry.item.specs ?? null,
    });
  }

  const draft = await fetchRequestDetails(rid).catch((error) => {
    recordAssistantActionFallback("fetch_draft_details_failed", error, {
      action: "createOrAppendForemanDraft",
      requestId: rid,
    });
    return null;
  });
  const draftLabel = String(draft?.display_no || session.draft_display_no || rid).trim() || rid;

  await saveForemanAssistantSession(actor.userId, {
    draft_request_id: rid,
    draft_display_no: draftLabel,
    pending_items: [],
  });

  const lines = [
    `Черновик ${draftLabel} сформирован.`,
    `Через catalog API добавлено позиций: ${matched.length}/${items.length}.`,
  ];

  if (matched.length) {
    lines.push(
      matched
        .map((entry, index) => `${index + 1}. ${entry.item.name} — ${entry.item.qty} ${entry.item.unit}`)
        .join("\n"),
    );
  }

  if (unmatched.length) {
    lines.push(`Не найдены в каталоге: ${unmatched.map((entry) => entry.item.name).join(", ")}.`);
  }

  lines.push('Если все верно, напиши "отправь черновик" или открой экран прораба и отправь его штатной кнопкой.');
  return lines.join("\n\n");
}

async function submitForemanDraft(
  actor: AssistantActorContext,
  session: ForemanAssistantSession,
  requestedByRole: AiUserRole,
): Promise<string> {
  const rid = String(session.draft_request_id || getLocalDraftId() || "").trim();
  if (!rid) {
    return "Сначала сформируй черновик. После этого я смогу отправить его на утверждение.";
  }

  const currentDraft = await fetchRequestDetails(rid).catch((error) => {
    recordAssistantActionFallback("fetch_current_draft_failed", error, {
      action: "submitForemanDraft",
      requestId: rid,
    });
    return null;
  });
  if (!currentDraft) {
    clearLocalDraftId();
    await clearForemanAssistantSession(actor.userId);
    return "Не нашел активный черновик. Сначала сформируй его заново.";
  }

  const label = String(currentDraft.display_no || rid).trim() || rid;
  return formatAiApprovalRequiredReply({
    classification: {
      actionType: "submit_request",
      screenId: ASSISTANT_FOREMAN_SCREEN_ID,
      domain: "procurement",
      requestedByRole,
      requiresApproval: true,
      forbidden: false,
    },
    summary: `Submit foreman draft request ${label} for director approval`,
    payload: {
      draftRef: "foreman_draft_request",
      displayNo: label,
    },
  });
}

async function handleForemanAction(message: string, requestedRole: AssistantRole): Promise<string> {
  const actor = await loadAssistantActorContext();
  if (!actor) {
    return "Чтобы создать AI-заявку, сначала войди в приложение под своим пользователем.";
  }

  const session = await loadForemanAssistantSession(actor.userId);
  const requestedByRole = normalizeAssistantRoleToAiUserRole(requestedRole);

  if (SEND_DRAFT_RE.test(message) && !CREATE_REQUEST_RE.test(message)) {
    return submitForemanDraft(actor, session, requestedByRole);
  }

  if (session.pending_items.length > 0) {
    const resumed = resolvePendingClarification(session.pending_items, message);
    if (resumed === "clarify") {
      return formatClarifyReply(session.pending_items);
    }
    return createOrAppendForemanDraft(actor, resumed, message, session, requestedByRole);
  }

  const resolution = await resolveForemanItems(message);
  if (resolution.kind === "clarify") {
    await saveForemanAssistantSession(actor.userId, {
      ...session,
      pending_items: resolution.pending,
    });
    return formatClarifyReply(resolution.pending);
  }

  return createOrAppendForemanDraft(actor, resolution.items, message, session, requestedByRole);
}

async function handleMarketSearchAction(message: string, buyerMode: boolean): Promise<string> {
  const queries = extractSearchQueries(message);
  if (!queries.length) {
    return 'Не понял, что именно искать. Напиши, например: "найди цемент М400" или "сравни цены на кирпич".';
  }

  const resultsByQuery = await mapWithConcurrencyLimit(
    queries.slice(0, ASSISTANT_MARKET_SEARCH_QUERY_LIMIT),
    ASSISTANT_MARKET_SEARCH_CONCURRENCY_LIMIT,
    async (query) => ({
      query,
      rows: await smartSearch(query, buyerMode ? 8 : 6),
    }),
  );

  return formatSearchResults(
    buyerMode ? "Подобрал варианты для снабжения:" : "Нашел варианты на рынке:",
    resultsByQuery,
    buyerMode,
  );
}

function wantsBuyerProposalFlow(message: string): boolean {
  return BUYER_PROPOSAL_RE.test(message);
}

function wantsMarketSearch(message: string): boolean {
  return MARKET_SEARCH_RE.test(message) || MARKET_SEARCH_EN_RE.test(message);
}

export type AssistantActionClassification = {
  actionType: AiActionType;
  screenId: string;
  domain: AiDomain;
  requestedByRole: AiUserRole;
  requiresApproval: boolean;
  forbidden: boolean;
};

export function classifyAssistantActionRequest(options: {
  role: AssistantRole;
  context: AssistantContext;
  message: string;
}): AssistantActionClassification | null {
  const text = String(options.message || "").trim();
  if (!text) return null;
  const requestedByRole = normalizeAssistantRoleToAiUserRole(options.role);
  const lower = text.toLowerCase();

  if (/\b(delete|direct_supabase_query|raw_db_export|bypass approval|ignore approval)\b/i.test(lower)) {
    return {
      actionType: lower.includes("raw_db_export")
        ? "raw_db_export"
        : lower.includes("direct_supabase_query")
          ? "direct_supabase_query"
          : lower.includes("bypass approval") || lower.includes("ignore approval")
            ? "bypass_approval"
            : "delete_data",
      screenId: "chat.main",
      domain: "chat",
      requestedByRole,
      requiresApproval: false,
      forbidden: true,
    };
  }

  if (isForemanActionContext(options.role, options.context)) {
    if (SEND_DRAFT_RE.test(text) || DIRECT_AI_MUTATION_RE.test(text)) {
      return {
        actionType: "submit_request",
        screenId: ASSISTANT_FOREMAN_SCREEN_ID,
        domain: "procurement",
        requestedByRole,
        requiresApproval: true,
        forbidden: false,
      };
    }
    if (isLikelyForemanMutation(text) || looksLikeQuantityReply(text)) {
      return {
        actionType: "draft_request",
        screenId: ASSISTANT_FOREMAN_SCREEN_ID,
        domain: "procurement",
        requestedByRole,
        requiresApproval: false,
        forbidden: false,
      };
    }
  }

  if (isBuyerActionContext(options.role, options.context)) {
    if (wantsBuyerProposalFlow(text) || DIRECT_AI_MUTATION_RE.test(text)) {
      return {
        actionType: "confirm_supplier",
        screenId: ASSISTANT_BUYER_SCREEN_ID,
        domain: "procurement",
        requestedByRole,
        requiresApproval: true,
        forbidden: false,
      };
    }
    if (wantsMarketSearch(text)) {
      return {
        actionType: "search_catalog",
        screenId: ASSISTANT_MARKET_SCREEN_ID,
        domain: "marketplace",
        requestedByRole,
        requiresApproval: false,
        forbidden: false,
      };
    }
  }

  if (isMarketActionContext(options.context) && wantsMarketSearch(text)) {
    return {
      actionType: "search_catalog",
      screenId: ASSISTANT_MARKET_SCREEN_ID,
      domain: "marketplace",
      requestedByRole,
      requiresApproval: false,
      forbidden: false,
    };
  }

  return null;
}

function formatAiApprovalRequiredReply(params: {
  classification: AssistantActionClassification;
  summary: string;
  payload: unknown;
}): string {
  const directDecision = assertNoDirectAiMutation({
    actionType: params.classification.actionType,
    role: params.classification.requestedByRole,
    screenId: params.classification.screenId,
    domain: params.classification.domain,
    mutationPolicy: "approval_required",
  });
  const auditEvent = createAiActionAuditEvent({
    eventType: directDecision.requiresApproval
      ? "ai.action.approval_required"
      : "ai.action.blocked_for_risk",
    actionType: params.classification.actionType,
    screenId: params.classification.screenId,
    domain: params.classification.domain,
    role: params.classification.requestedByRole,
    riskLevel: directDecision.riskLevel,
    decision: directDecision.requiresApproval ? "approval_required" : "blocked",
    reason: directDecision.reason,
  });

  if (params.classification.forbidden || directDecision.riskLevel === "forbidden") {
    return `AI action blocked: ${directDecision.reason}.`;
  }

  const action = submitAiActionForApproval({
    actionType: params.classification.actionType,
    screenId: params.classification.screenId,
    domain: params.classification.domain,
    requestedByRole: params.classification.requestedByRole,
    summary: params.summary,
    redactedPayload: params.payload,
    evidenceRefs: ["assistant.chat"],
    idempotencyKey: `assistant:${params.classification.screenId}:${params.classification.actionType}`,
  });

  return [
    "approval_required: AI prepared this as an approval-controlled action.",
    `Action: ${action.actionType}.`,
    `Status: ${action.status}.`,
    `Audit: ${auditEvent.eventType}.`,
    "No final mutation was executed from chat.",
  ].join("\n");
}

async function hasPendingForemanSession(): Promise<boolean> {
  const actor = await loadAssistantActorContext().catch((error) => {
    recordAssistantActionFallback("load_actor_context_failed", error, {
      action: "hasPendingForemanSession",
    });
    return null;
  });
  if (!actor) return false;
  const session = await loadForemanAssistantSession(actor.userId);
  return Boolean(session.pending_items.length || session.draft_request_id);
}

export async function tryRunAssistantAction(options: {
  role: AssistantRole;
  context: AssistantContext;
  message: string;
}): Promise<AssistantActionResult> {
  const { role, context, message } = options;
  const text = String(message || "").trim();
  if (!text) return { handled: false };

  try {
    const classification = classifyAssistantActionRequest({ role, context, message: text });
    if (classification?.forbidden) {
      return {
        handled: true,
        reply: formatAiApprovalRequiredReply({
          classification,
          summary: "Forbidden AI-originated chat action",
          payload: { request: "blocked_for_policy" },
        }),
      };
    }

    if (
      isForemanActionContext(role, context)
      && (
        isLikelyForemanMutation(text)
        || SEND_DRAFT_RE.test(text)
        || looksLikeQuantityReply(text)
        || await hasPendingForemanSession()
      )
    ) {
      return { handled: true, reply: await handleForemanAction(text, role) };
    }

    if (isBuyerActionContext(role, context) && (wantsMarketSearch(text) || wantsBuyerProposalFlow(text))) {
      if (classification?.requiresApproval) {
        return {
          handled: true,
          reply: formatAiApprovalRequiredReply({
            classification,
            summary: "Buyer AI action requires controlled approval before supplier or order confirmation",
            payload: { request: "buyer_approval_required" },
          }),
        };
      }
      const reply = await handleMarketSearchAction(text, true);
      if (wantsBuyerProposalFlow(text)) {
        return {
          handled: true,
          reply: `${reply}\n\nАвтосоздание предложения из свободного текста здесь не включаю: текущий buyer write-path работает через одобренные позиции во входе снабжения, и я не обхожу этот boundary.`,
        };
      }
      return { handled: true, reply };
    }

    if (isMarketActionContext(context) && wantsMarketSearch(text)) {
      return { handled: true, reply: await handleMarketSearchAction(text, false) };
    }
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "Не удалось выполнить AI-действие.";
    recordAssistantActionFallback("assistant_action_failed", error, {
      action: "tryRunAssistantAction",
      assistantRole: role,
      assistantContext: context,
    });
    return { handled: true, reply: messageText };
  }

  return { handled: false };
}
