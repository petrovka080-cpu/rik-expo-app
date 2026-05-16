import { supabase } from "../supabaseClient";
import type { Database } from "../database.types";
import { recordCatchDiscipline } from "../observability/catchDiscipline";
import { client, normStr } from "./_core";
import { renderPdfHtmlToUri } from "../pdf/pdf.runner";
import { renderProposalPdfErrorHtml, renderProposalPdfHtml } from "../pdf/pdf.proposal";
import type { ProposalPdfModel } from "../pdf/pdf.model";
import { listSuppliers } from "./suppliers";
import type { Supplier } from "./types";
import { MAX_LIST_LIMIT } from "./queryLimits";

type ProposalHeadRow = Pick<
  Database["public"]["Tables"]["proposals"]["Row"],
  "status" | "submitted_at" | "buyer_fio" | "buyer_email" | "created_by" | "approved_at" | "proposal_no" | "id_short"
> & {
  display_no?: string | null;
};

type ProposalPdfItemRow = Pick<
  Database["public"]["Tables"]["proposal_items"]["Row"],
  "id" | "request_item_id" | "name_human" | "uom" | "qty" | "app_code" | "rik_code" | "price" | "supplier" | "note"
>;

type RequestItemRow = Pick<
  Database["public"]["Tables"]["request_items"]["Row"],
  "id" | "request_id" | "name_human" | "uom" | "qty" | "app_code" | "rik_code"
>;

type RequestHeadRow = Pick<
  Database["public"]["Tables"]["requests"]["Row"],
  "id" | "display_no" | "need_by" | "status" | "created_at" | "object_type_code" | "level_code" | "system_code" | "zone_code"
>;

type RefNameRow = {
  name?: string | null;
  name_ru?: string | null;
  name_human_ru?: string | null;
  display_name?: string | null;
  alias_ru?: string | null;
};

function getObjectField<T>(value: unknown, key: string): T | undefined {
  if (typeof value !== "object" || value === null || !(key in value)) return undefined;
  return (value as Record<string, unknown>)[key] as T;
}

async function selectProposalHeadSafe(idFilter: string) {
  const q = await supabase
    .from("proposals")
    .select("status,submitted_at,buyer_fio,buyer_email,created_by,approved_at,proposal_no,display_no,id_short")
    .eq("id", idFilter)
    .maybeSingle();

  if (q.error || !q.data) {
    return {
      status: "",
      submittedAt: null as string | null,
      buyerFioAny: null as string | null,
      approvedAt: null as string | null,
      proposalNo: null as string | null,
    };
  }

  const d = q.data as ProposalHeadRow;
  const buyerFio = (typeof d.buyer_fio === "string" ? d.buyer_fio.trim() : "") || "";
  const buyerEmail = (typeof d.buyer_email === "string" ? d.buyer_email.trim() : "") || "";
  const createdBy = d.created_by ? String(d.created_by) : "";

  const looksLikeUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(createdBy.trim());

  const fallback =
    buyerFio ||
    buyerEmail ||
    (!looksLikeUuid && createdBy.trim() ? createdBy.trim() : "") ||
    null;

  const proposalNo =
    (typeof d.proposal_no === "string" && d.proposal_no.trim()) ||
    (typeof d.display_no === "string" && d.display_no.trim()) ||
    (d.id_short != null ? `PR-${String(d.id_short)}` : null);

  return {
    status: (typeof d.status === "string" ? d.status : "") || "",
    submittedAt: d.submitted_at ?? null,
    buyerFioAny: fallback,
    approvedAt: d.approved_at ?? null,
    proposalNo,
  };
}

function rikKindLabel(rikCode?: string | null): string {
  const p = String(rikCode ?? "").trim().toUpperCase().split("-")[0];
  switch (p) {
    case "MAT":
      return "Материал";
    case "WRK":
    case "WORK":
      return "Работа";
    case "SRV":
      return "Услуга";
    case "KIT":
      return "Комплект";
    case "SPEC":
      return "Спец.";
    default:
      return "";
  }
}

function stripContextFromText(raw: unknown) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  return s
    .replace(/объект\s*:\s*[^;\n]+;?\s*/gi, "")
    .replace(/этаж\s*\/?\s*уровень\s*:\s*[^;\n]+;?\s*/gi, "")
    .replace(/система\s*:\s*[^;\n]+;?\s*/gi, "")
    .replace(/зона\s*\/?\s*участок\s*:\s*[^;\n]+;?\s*/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function pickRefName(row: { data?: RefNameRow | null } | RefNameRow | null | undefined) {
  const nested = getObjectField<RefNameRow | null>(row, "data");
  const source: RefNameRow = nested ?? (row && typeof row === "object" ? (row as RefNameRow) : {});
  const candidates = [
    source.name_ru,
    source.name_human_ru,
    source.display_name,
    source.alias_ru,
    source.name,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return "";
}

function formatDate(value: unknown, locale: string) {
  if (!value) return "";
  const date = new Date(String(value));
  if (!Number.isNaN(date.getTime())) return date.toLocaleDateString(locale);
  return String(value ?? "").trim();
}

function formatDateTime(value: unknown, locale: string) {
  if (!value) return "";
  const date = new Date(String(value));
  if (!Number.isNaN(date.getTime())) return date.toLocaleString(locale);
  return String(value ?? "").trim();
}

function normalizeStatusRu(raw?: string | null) {
  const original = String(raw ?? "").trim();
  const s = original.toLowerCase();
  if (!s) return "-";
  if (s === "draft" || s === "черновик") return "Черновик";
  if (s === "pending" || s === "на утверждении") return "На утверждении";
  if (s === "approved" || s === "утверждено" || s === "утверждена") return "Утверждена";
  if (s === "rejected" || s === "cancelled" || s === "отклонено" || s === "отклонена") return "Отклонена";
  return original || "-";
}

function formatProposalNumber(value: number, locale: string) {
  return value.toLocaleString(locale);
}

export async function buildProposalPdfHtml(proposalId: number | string): Promise<string> {
  const pid = String(proposalId);
  const locale = "ru-RU";

  const num = (v?: unknown) => {
    const n = Number(String(v ?? "").replace(",", ".").trim());
    return Number.isFinite(n) ? n : 0;
  };

  try {
    const head = await selectProposalHeadSafe(pid);
    const status = head.status;
    const submittedAt = head.submittedAt;
    const buyerFio = head.buyerFioAny;
    const approvedAt = head.approvedAt;
    const prettyNo = head.proposalNo || `PR-${pid.slice(0, 8)}`;

    const { data: piRaw } = await supabase
      .from("proposal_items")
      .select("id, request_item_id, name_human, uom, qty, app_code, rik_code, price, supplier, note")
      .eq("proposal_id", pid)
      .order("id", { ascending: true })
      .limit(MAX_LIST_LIMIT);

    const pi: ProposalPdfItemRow[] = Array.isArray(piRaw) ? piRaw : [];
    let requestIdFromItems: string | null = null;

    if (pi.length) {
      const ids = Array.from(new Set(pi.map((r) => r.request_item_id).filter(Boolean))).map(String);
      if (ids.length) {
        const ri = await supabase
          .from("request_items")
          .select("id, request_id, name_human, uom, qty, app_code, rik_code")
          .in("id", ids)
          .limit(Math.min(ids.length, MAX_LIST_LIMIT));

        if (!ri.error && Array.isArray(ri.data)) {
          const byId = new Map<string, RequestItemRow>(ri.data.map((r) => [String(r.id), r]));
          for (const r of pi) {
            const src = byId.get(String(r.request_item_id));
            if (!src) continue;

            requestIdFromItems = requestIdFromItems || (src.request_id ? String(src.request_id) : null);
            r.name_human = r.name_human ?? src.name_human ?? null;
            r.uom = r.uom ?? src.uom ?? null;
            r.qty = r.qty ?? src.qty ?? null;
            r.app_code = r.app_code ?? src.app_code ?? null;
            r.rik_code = r.rik_code ?? src.rik_code ?? null;
          }
        }
      }
    }

    let objectName = "";
    let levelName = "";
    let systemName = "";
    let zoneName = "";
    let requestCreatedAt = "";
    let requestNeedBy = "";
    let requestStatus = "";
    let requestDisplayNo = "";

    if (requestIdFromItems) {
      const req = await supabase
        .from("requests")
        .select("id,display_no,need_by,status,created_at,object_type_code,level_code,system_code,zone_code")
        .eq("id", requestIdFromItems)
        .maybeSingle();

      if (!req.error && req.data) {
        const h = req.data as RequestHeadRow;
        requestDisplayNo = String(h.display_no ?? "").trim();
        requestCreatedAt = formatDateTime(h.created_at, locale);
        requestNeedBy = formatDate(h.need_by, locale);
        requestStatus = normalizeStatusRu(h.status);

        const [obj, lvl, sys, zn] = await Promise.all([
          h.object_type_code
            ? supabase
                .from("ref_object_types")
                .select("name,name_ru,name_human_ru,display_name,alias_ru")
                .eq("code", h.object_type_code)
                .maybeSingle()
            : Promise.resolve({ data: null as RefNameRow | null }),
          h.level_code
            ? supabase
                .from("ref_levels")
                .select("name,name_ru,name_human_ru,display_name,alias_ru")
                .eq("code", h.level_code)
                .maybeSingle()
            : Promise.resolve({ data: null as RefNameRow | null }),
          h.system_code
            ? supabase
                .from("ref_systems")
                .select("name,name_ru,name_human_ru,display_name,alias_ru")
                .eq("code", h.system_code)
                .maybeSingle()
            : Promise.resolve({ data: null as RefNameRow | null }),
          h.zone_code
            ? supabase
                .from("ref_zones")
                .select("name,name_ru,name_human_ru,display_name,alias_ru")
                .eq("code", h.zone_code)
                .maybeSingle()
            : Promise.resolve({ data: null as RefNameRow | null }),
        ]);

        objectName = pickRefName(obj);
        levelName = pickRefName(lvl);
        systemName = pickRefName(sys);
        zoneName = pickRefName(zn);
      }
    }

    const distinctSupplierNames = Array.from(new Set(pi.map((r) => String(r.supplier || "").trim()).filter(Boolean)));
    let supplierCards: Supplier[] = [];

    if (distinctSupplierNames.length) {
      const all = await listSuppliers();
      supplierCards = distinctSupplierNames.map((nm) => {
        const hit = all.find((s) => normStr(s.name) === normStr(nm));
        return hit || ({ id: `ghost:${nm}`, name: nm } as Supplier);
      });
    }

    let appNames: Record<string, string> = {};
    try {
      const apps = await client.from("rik_apps" as never).select("app_code,name_human").limit(MAX_LIST_LIMIT);
      if (!apps.error && Array.isArray(apps.data)) {
        appNames = Object.fromEntries(
          apps.data.map((a) => [
            String(getObjectField<string>(a, "app_code") ?? ""),
            String(getObjectField<string>(a, "name_human") ?? ""),
          ]),
        );
      }
    } catch (error) {
      recordCatchDiscipline({
        screen: "reports",
        surface: "proposal_pdf",
        event: "proposal_pdf_app_names_lookup_failed",
        kind: "degraded_fallback",
        error,
        sourceKind: "table:rik_apps",
        errorStage: "load_app_names",
        extra: {
          proposalId: pid,
        },
      });
    }

    const includeSupplier = pi.some((r) => String(r.supplier ?? "").trim() !== "");
    const total = pi.reduce((acc, r) => acc + num(r.qty) * num(r.price), 0);
    const generatedAt = new Date().toLocaleString(locale);

    const leftMetaFields = [
      { label: "Объект", value: objectName || "-" },
      { label: "Этаж / уровень", value: levelName || "-" },
      { label: "Система", value: systemName || "-" },
      { label: "Зона / участок", value: zoneName || "-" },
    ];

    const rightMetaFields = [
      { label: "Снабженец", value: buyerFio || "-" },
      { label: "Нужно к", value: requestNeedBy || "-" },
      { label: "Дата создания", value: requestCreatedAt || (submittedAt ? formatDateTime(submittedAt, locale) : generatedAt) },
      { label: "Статус", value: requestStatus || normalizeStatusRu(status) || "-" },
      { label: "Заявка", value: requestDisplayNo ? `#${requestDisplayNo}` : "-" },
    ];

    const model: ProposalPdfModel = {
      proposalLabel: prettyNo,
      generatedAt,
      approvedAt: approvedAt ? formatDateTime(approvedAt, locale) : "",
      status: status ? normalizeStatusRu(status) : "",
      leftMetaFields,
      rightMetaFields,
      suppliers: supplierCards.map((supplier) => {
        const meta: string[] = [];
        if (supplier.phone) meta.push(`Тел.: ${supplier.phone}`);
        if (supplier.email) meta.push(`Email: ${supplier.email}`);
        if (supplier.inn) meta.push(`ИНН: ${supplier.inn}`);
        if (supplier.address) meta.push(`Адрес: ${supplier.address}`);
        return {
          name: supplier.name,
          metaLine: meta.filter(Boolean).join(" · "),
        };
      }),
      includeSupplier,
      rows: pi.map((row) => {
        const qty = num(row.qty);
        const price = num(getObjectField<unknown>(row, "price"));
        const amount = qty * price;
        const appCode = getObjectField<string>(row, "app_code");
        const app = appCode ? appNames[appCode] ?? appCode : "";
        const noteText = stripContextFromText(
          String(getObjectField<string>(row, "note") ?? "").trim().replace(/^прим\.:\s*/i, ""),
        );
        return {
          name: String(getObjectField<string>(row, "name_human") ?? "").trim(),
          kind: rikKindLabel(getObjectField<string | null>(row, "rik_code")),
          qtyText: qty ? formatProposalNumber(qty, locale) : "",
          uom: String(getObjectField<string>(row, "uom") ?? ""),
          appAndNote: [app, noteText].filter(Boolean).join(" · "),
          supplier: String(getObjectField<string>(row, "supplier") ?? ""),
          priceText: price ? formatProposalNumber(price, locale) : "",
          amountText: amount ? formatProposalNumber(amount, locale) : "",
        };
      }),
      totalText: formatProposalNumber(total, locale),
      buyerFio: buyerFio || "",
      serviceId: pid,
    };

    return renderProposalPdfHtml(model);
  } catch (e: unknown) {
    recordCatchDiscipline({
      screen: "reports",
      surface: "proposal_pdf",
      event: "proposal_pdf_build_failed",
      kind: "critical_fail",
      error: e,
      sourceKind: "pdf:proposal_html",
      errorStage: "build_html",
      extra: {
        proposalId: pid,
        publishState: "error",
      },
    });
    return renderProposalPdfErrorHtml(String(getObjectField<string>(e, "message") || e));
  }
}

export async function exportProposalPdf(
  proposalId: number | string,
  mode: "preview" | "share" = "preview",
) {
  const html = await buildProposalPdfHtml(proposalId);
  return renderPdfHtmlToUri({
    html,
    documentType: "proposal",
    source: "director",
    maxLength: 500_000,
    share: mode === "share",
  });
}
