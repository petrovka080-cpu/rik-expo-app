import { supabase } from "../../lib/supabaseClient";
import { normalizePage } from "../../lib/api/_core";

import type {
  AuctionItemsJson,
  AuctionJsonItem,
  AuctionListTab,
  AuctionRow,
  TenderItemRow,
  TenderRow,
  UnifiedAuctionDetail,
  UnifiedAuctionItem,
  UnifiedAuctionSummary,
} from "./auctions.types";

const AUCTION_CHILD_LIST_PAGE_DEFAULTS = { pageSize: 100, maxPageSize: 100 };

type PagedAuctionQuery<T> = {
  range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error?: unknown }>;
};

async function loadPagedAuctionRows<T>(
  queryFactory: () => PagedAuctionQuery<T>,
): Promise<{ data: T[] | null; error: unknown | null }> {
  const rows: T[] = [];
  for (let pageIndex = 0; ; pageIndex += 1) {
    const page = normalizePage({ page: pageIndex }, AUCTION_CHILD_LIST_PAGE_DEFAULTS);
    const result = await queryFactory().range(page.from, page.to);
    if (result.error) return { data: null, error: result.error };

    const pageRows = Array.isArray(result.data) ? result.data : [];
    rows.push(...pageRows);
    if (pageRows.length < page.pageSize) return { data: rows, error: null };
  }
}

function toMaybeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "Без даты";
  try {
    return new Date(value).toLocaleDateString("ru-RU");
  } catch {
    return "Без даты";
  }
}

function getStatusLabel(status: string | null | undefined): string {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "published") return "Активный торг";
  if (normalized === "closed") return "Завершен";
  if (normalized === "draft") return "Черновик";
  if (normalized) return normalized;
  return "Без статуса";
}

function isClosedByTab(status: string | null | undefined, deadlineAt: string | null | undefined): boolean {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "closed") return true;
  if (!deadlineAt) return false;
  const ts = new Date(deadlineAt).getTime();
  return Number.isFinite(ts) && ts < Date.now();
}

function matchesTab(
  tab: AuctionListTab,
  status: string | null | undefined,
  deadlineAt: string | null | undefined,
): boolean {
  const closed = isClosedByTab(status, deadlineAt);
  return tab === "closed" ? closed : !closed;
}

function buildItemsPreview(items: UnifiedAuctionItem[]): string[] {
  return items
    .slice(0, 3)
    .map((item) => {
      const name = item.name || item.rikCode || "Позиция";
      if (item.qty == null) return name;
      return `${name} — ${item.qty}${item.uom ? ` ${item.uom}` : ""}`;
    });
}

function mapTenderItems(rows: TenderItemRow[]): UnifiedAuctionItem[] {
  return rows.map((row) => ({
    id: row.id,
    rikCode: row.rik_code,
    name: row.name_human,
    qty: row.qty,
    uom: row.uom,
  }));
}

function mapAuctionJsonItems(value: AuctionItemsJson | null): UnifiedAuctionItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const row = item as AuctionJsonItem;
      return {
        id: `json-${index}`,
        rikCode: typeof row.rik_code === "string" ? row.rik_code : null,
        name:
          typeof row.name_human === "string"
            ? row.name_human
            : typeof row.name === "string"
              ? row.name
              : null,
        qty: toMaybeNumber(row.qty),
        uom: typeof row.uom === "string" ? row.uom : null,
      } satisfies UnifiedAuctionItem;
    })
    .filter((item): item is UnifiedAuctionItem => Boolean(item));
}

function toTenderSummary(row: TenderRow, items: UnifiedAuctionItem[]): UnifiedAuctionSummary {
  return {
    id: row.id,
    source: "tender",
    title: row.city ? `Торг · ${row.city}` : `Торг · ${String(row.id).slice(0, 8)}`,
    subtitle: `${getStatusLabel(row.status)} • ${formatDate(row.created_at)}`,
    city: row.city,
    status: row.status,
    deadlineAt: row.deadline_at,
    createdAt: row.created_at,
    note: row.note,
    contactPhone: row.contact_phone,
    contactWhatsApp: row.contact_whatsapp,
    contactEmail: row.contact_email,
    itemsCount: items.length,
    itemsPreview: buildItemsPreview(items),
  };
}

function toAuctionSummary(row: AuctionRow, items: UnifiedAuctionItem[]): UnifiedAuctionSummary {
  return {
    id: row.id,
    source: "auction",
    title: row.display_no || row.object_name || `Аукцион · ${String(row.id).slice(0, 8)}`,
    subtitle: `${getStatusLabel(row.status)} • ${formatDate(row.created_at)}`,
    city: null,
    status: row.status,
    deadlineAt: row.need_by,
    createdAt: row.created_at,
    note: row.object_name,
    contactPhone: null,
    contactWhatsApp: null,
    contactEmail: null,
    itemsCount: items.length,
    itemsPreview: buildItemsPreview(items),
  };
}

export async function loadAuctionSummaries(tab: AuctionListTab): Promise<UnifiedAuctionSummary[]> {
  const tenderResult = await supabase
    .from("tenders")
    .select("id, city, status, deadline_at, created_at, note, contact_phone, contact_whatsapp, contact_email")
    .order("created_at", { ascending: false })
    .limit(120);

  if (tenderResult.error) {
    throw tenderResult.error;
  }

  const tenders = (tenderResult.data ?? []) as TenderRow[];
  if (tenders.length > 0) {
    const tenderIds = tenders.map((row) => row.id);
    const itemsResult = await loadPagedAuctionRows<TenderItemRow>(() =>
      supabase
        .from("tender_items")
        .select("id, tender_id, rik_code, name_human, qty, uom, request_item_id, created_at")
        .in("tender_id", tenderIds)
        .order("tender_id", { ascending: true })
        .order("created_at", { ascending: true })
        .order("id", { ascending: true }) as unknown as PagedAuctionQuery<TenderItemRow>,
    );

    if (itemsResult.error) throw itemsResult.error;

    const itemsByTender = new Map<string, UnifiedAuctionItem[]>();
    for (const row of (itemsResult.data ?? []) as TenderItemRow[]) {
      const nextItems = itemsByTender.get(row.tender_id) || [];
      nextItems.push(...mapTenderItems([row]));
      itemsByTender.set(row.tender_id, nextItems);
    }

    return tenders
      .filter((row) => matchesTab(tab, row.status, row.deadline_at))
      .map((row) => toTenderSummary(row, itemsByTender.get(row.id) || []));
  }

  const auctionsResult = await supabase
    .from("auctions")
    .select("id, display_no, object_name, status, need_by, created_at, items")
    .order("created_at", { ascending: false })
    .limit(120);

  if (auctionsResult.error) throw auctionsResult.error;

  return ((auctionsResult.data ?? []) as AuctionRow[])
    .filter((row) => matchesTab(tab, row.status, row.need_by))
    .map((row) => toAuctionSummary(row, mapAuctionJsonItems(row.items)));
}

export async function loadAuctionDetail(id: string): Promise<UnifiedAuctionDetail | null> {
  const tenderResult = await supabase
    .from("tenders")
    .select("id, city, status, deadline_at, created_at, note, contact_phone, contact_whatsapp, contact_email")
    .eq("id", id)
    .maybeSingle();

  if (tenderResult.error) throw tenderResult.error;

  if (tenderResult.data) {
    const itemResult = await supabase
      .from("tender_items")
      .select("id, tender_id, rik_code, name_human, qty, uom, request_item_id, created_at")
      .eq("tender_id", id)
      .order("created_at", { ascending: true });

    if (itemResult.error) throw itemResult.error;

    const items = mapTenderItems((itemResult.data ?? []) as TenderItemRow[]);
    const summary = toTenderSummary(tenderResult.data as TenderRow, items);
    return {
      ...summary,
      items,
    };
  }

  const auctionResult = await supabase
    .from("auctions")
    .select("id, display_no, object_name, status, need_by, created_at, items")
    .eq("id", id)
    .maybeSingle();

  if (auctionResult.error) throw auctionResult.error;
  if (!auctionResult.data) return null;

  const items = mapAuctionJsonItems((auctionResult.data as AuctionRow).items);
  const summary = toAuctionSummary(auctionResult.data as AuctionRow, items);
  return {
    ...summary,
    items,
  };
}

export function buildAuctionAssistantPrompt(detail: UnifiedAuctionDetail): string {
  const parts: string[] = [
    `Помоги оценить торг "${detail.title}".`,
    `Статус: ${getStatusLabel(detail.status)}.`,
  ];

  if (detail.city) {
    parts.push(`Город: ${detail.city}.`);
  }
  if (detail.deadlineAt) {
    parts.push(`Дедлайн: ${formatDate(detail.deadlineAt)}.`);
  }
  if (detail.note) {
    parts.push(`Комментарий: ${detail.note}.`);
  }
  if (detail.itemsPreview.length > 0) {
    parts.push(`Позиции: ${detail.itemsPreview.join("; ")}.`);
  }

  parts.push("Подскажи, что проверить перед откликом и какие условия уточнить у заказчика.");
  return parts.join(" ");
}

export function buildAuctionsAssistantPrompt(
  tab: AuctionListTab,
  rows: UnifiedAuctionSummary[],
): string {
  const scope = tab === "closed" ? "завершенным торгам" : "активным торгам";
  const parts: string[] = [
    `Помоги быстро сориентироваться по ${scope} в приложении.`,
    `Сейчас в списке ${rows.length} записей.`,
  ];

  const preview = rows
    .slice(0, 3)
    .map((row) => `${row.title}${row.city ? ` (${row.city})` : ""}`)
    .filter(Boolean);

  if (preview.length > 0) {
    parts.push(`Примеры: ${preview.join("; ")}.`);
  }

  parts.push("Подскажи, как быстро отфильтровать приоритетные торги и что проверить перед откликом.");
  return parts.join(" ");
}
