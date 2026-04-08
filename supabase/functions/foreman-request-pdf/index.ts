/* eslint-disable import/no-unresolved */
// @ts-nocheck

import { createClient } from "npm:@supabase/supabase-js@2";
import { normalizeForemanRequestPdfRequest } from "../../../src/lib/pdf/foremanRequestPdf.shared.ts";
import {
  createCanonicalPdfErrorResponse,
  createCanonicalPdfOptionsResponse,
  createCanonicalPdfSuccessResponse,
} from "../../../src/lib/pdf/canonicalPdfPlatformContract.ts";
import { resolveForemanRequestPdfAccess } from "../../../src/lib/pdf/rolePdfAuth.ts";
import {
  buildCanonicalPdfFileName,
  buildStoragePath,
  cleanText,
  normalizePdfFileName,
  renderPdfBytes,
  resolveSignedUrlTtlSeconds,
  uploadCanonicalPdf,
} from "../_shared/canonicalPdf.ts";
import { renderForemanRequestPdfHtml } from "../_shared/foremanRequestPdfHtml.ts";

const FUNCTION_NAME = "foreman-request-pdf";
const DEFAULT_BUCKET = "role_pdf_exports";
const RENDER_BRANCH = "backend_foreman_request_v1";

const asObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const pickRefName = (row: Record<string, unknown> | null | undefined) => {
  if (!row) return "";
  const candidates = [
    row.name_ru,
    row.name_human_ru,
    row.display_name,
    row.alias_ru,
    row.name,
  ];
  for (const candidate of candidates) {
    const text = cleanText(candidate);
    if (text) return text;
  }
  return "";
};

const stripContextFromNote = (raw: unknown) => {
  const source = cleanText(raw);
  if (!source) return "";
  const lines = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const filtered = lines.filter((line) => {
    const lower = line.toLowerCase();
    if (lower.startsWith("объект:")) return false;
    if (lower.startsWith("этаж") || lower.startsWith("этаж/") || lower.startsWith("этаж /")) return false;
    if (lower.startsWith("система:")) return false;
    if (lower.startsWith("зона:") || lower.startsWith("зона /") || lower.startsWith("зона/")) return false;
    if (lower.startsWith("участок:")) return false;
    if (lower.startsWith("подрядчик:")) return false;
    if (lower.startsWith("телефон:")) return false;
    if (lower.startsWith("объём:") || lower.startsWith("объем:")) return false;
    return true;
  });

  return filtered
    .join("\n")
    .replace(/объект\s*:\s*[^;\n]+;?\s*/gi, "")
    .replace(/этаж\s*\/?\s*уровень\s*:\s*[^;\n]+;?\s*/gi, "")
    .replace(/система\s*:\s*[^;\n]+;?\s*/gi, "")
    .replace(/зона\s*\/?\s*участок\s*:\s*[^;\n]+;?\s*/gi, "")
    .replace(/подрядчик\s*:\s*[^;\n]+;?\s*/gi, "")
    .replace(/телефон\s*:\s*[^;\n]+;?\s*/gi, "")
    .replace(/объ[её]м\s*:\s*[^;\n]+;?\s*/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
};

const parseContextFromNotes = (notes: unknown[]) => {
  const context = {
    contractor: "",
    phone: "",
    volume: "",
  };

  const put = (key: "contractor" | "phone" | "volume", value: string) => {
    const next = cleanText(value);
    if (!next || context[key]) return;
    context[key] = next;
  };

  for (const rawNote of notes) {
    const raw = cleanText(rawNote);
    if (!raw) continue;
    const parts = raw
      .split(/[\n;]+/)
      .map((part) => part.trim())
      .filter(Boolean);
    for (const part of parts) {
      const match = part.match(/^([^:]+)\s*:\s*(.+)$/);
      if (!match) continue;
      const key = cleanText(match[1]).toLowerCase();
      const value = cleanText(match[2]);
      if (!value) continue;
      if (key.includes("подряд")) put("contractor", value);
      else if (key.includes("телефон")) put("phone", value);
      else if (key.includes("объём") || key.includes("объем")) put("volume", value);
    }
  }

  return context;
};

const formatDate = (value: unknown, locale: string) => {
  const text = cleanText(value);
  if (!text) return "";
  const date = new Date(text);
  if (!Number.isNaN(date.getTime())) return date.toLocaleDateString(locale);
  return text;
};

const formatDateTime = (value: unknown, locale: string) => {
  const text = cleanText(value);
  if (!text) return "";
  const date = new Date(text);
  if (!Number.isNaN(date.getTime())) return date.toLocaleString(locale);
  return text;
};

const normalizeStatusRu = (raw?: string | null) => {
  const original = cleanText(raw);
  const normalized = original.toLowerCase();
  if (!normalized) return "—";
  if (normalized === "draft" || normalized === "черновик") return "Черновик";
  if (normalized === "pending" || normalized === "на утверждении") return "На утверждении";
  if (normalized === "approved" || normalized === "утверждено" || normalized === "утверждена") {
    return "Утверждена";
  }
  if (
    normalized === "rejected" ||
    normalized === "cancelled" ||
    normalized === "canceled" ||
    normalized === "отклонено" ||
    normalized === "отклонена"
  ) {
    return "Отклонена";
  }
  return original || "—";
};

async function requireForemanAuth(request: Request, supabaseUrl: string) {
  const anonKey = cleanText(Deno.env.get("SUPABASE_ANON_KEY"));
  const authHeader = cleanText(request.headers.get("Authorization"));

  if (!anonKey || !authHeader) {
    throw createCanonicalPdfErrorResponse({
      status: 401,
      role: "foreman",
      documentType: "request",
      errorCode: "auth_failed",
      error: "Unauthorized.",
    });
  }

  const requester = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        Authorization: authHeader,
        apikey: anonKey,
      },
    },
  });

  const { data: userData, error: userError } = await requester.auth.getUser();

  if (userError || !userData?.user) {
    throw createCanonicalPdfErrorResponse({
      status: 401,
      role: "foreman",
      documentType: "request",
      errorCode: "auth_failed",
      error: "Unauthorized.",
    });
  }

  return {
    userId: userData.user.id,
    requester,
  };
}

async function assertForemanRequestAccess(args: {
  admin: any;
  requestId: string;
  userId: string;
}) {
  const { data, error } = await args.admin
    .from("requests")
    .select("id, created_by")
    .eq("id", args.requestId)
    .maybeSingle();

  if (error || !data) {
    console.log(
      `[${FUNCTION_NAME}] foreman access reject ${JSON.stringify({
        rejectionReason: "request_not_found",
        requestFound: Boolean(data),
        requestId: args.requestId,
        authUid: args.userId,
        error: error?.message ?? null,
      })}`,
    );
    console.log(
      `[${FUNCTION_NAME}] foreman request access denied ${JSON.stringify({
        requestId: args.requestId,
        uid: args.userId,
        error: error?.message ?? null,
        found: Boolean(data),
      })}`,
    );
    throw createCanonicalPdfErrorResponse({
      status: 403,
      role: "foreman",
      documentType: "request",
      errorCode: "auth_failed",
      error: "Forbidden.",
    });
  }

  const requestCreatedBy = cleanText(data.created_by);
  const actorMemberships = await args.admin
    .from("company_members")
    .select("role, company_id")
    .eq("user_id", args.userId)
    .in("role", ["foreman", "director"]);

  const creatorMemberships = requestCreatedBy
    ? await args.admin
        .from("company_members")
        .select("company_id")
        .eq("user_id", requestCreatedBy)
    : { data: [], error: null };
  const decision = resolveForemanRequestPdfAccess({
    authUid: args.userId,
    requestFound: true,
    requestCreatedBy,
    actorMembershipRows: actorMemberships.data,
    creatorCompanyIds: Array.isArray(creatorMemberships.data)
      ? creatorMemberships.data.map((row) => row.company_id)
      : [],
  });

  if (!decision.allowed && decision.reason !== "owner_mismatch") {
    console.log(
      `[${FUNCTION_NAME}] foreman access reject ${JSON.stringify({
        rejectionReason: decision.reason,
        requestFound: true,
        requestId: args.requestId,
        authUid: args.userId,
        requestCompanyId: decision.companyId,
        requestCreatedBy,
        membershipFound: decision.membershipFound,
        membershipCompanyIds: decision.membershipCompanyIds,
        membershipRoles: decision.membershipRoles,
        creatorMembershipCompanyIds: Array.isArray(creatorMemberships.data)
          ? creatorMemberships.data.map((row) => cleanText(row.company_id)).filter(Boolean)
          : [],
        sharedCompanyIds: decision.companyId ? [decision.companyId] : [],
        isDirector: decision.isDirector,
        ownerCheckApplied: decision.ownerCheckApplied,
        membershipError: actorMemberships.error?.message ?? null,
        creatorMembershipError: creatorMemberships.error?.message ?? null,
      })}`,
    );
    console.log(
      `[${FUNCTION_NAME}] foreman membership forbidden ${JSON.stringify({
        requestId: args.requestId,
        uid: args.userId,
        companyId: decision.companyId,
        membershipRoles: decision.membershipRoles,
        membershipError: actorMemberships.error?.message ?? null,
      })}`,
    );
    throw createCanonicalPdfErrorResponse({
      status: 403,
      role: "foreman",
      documentType: "request",
      errorCode: "auth_failed",
      error: "Forbidden.",
    });
  }

  if (!decision.allowed && decision.reason === "owner_mismatch") {
    console.log(
      `[${FUNCTION_NAME}] foreman access reject ${JSON.stringify({
        rejectionReason: decision.reason,
        requestFound: true,
        requestId: args.requestId,
        authUid: args.userId,
        requestCompanyId: decision.companyId,
        requestCreatedBy,
        membershipFound: decision.membershipFound,
        membershipCompanyIds: decision.membershipCompanyIds,
        membershipRoles: decision.membershipRoles,
        isDirector: decision.isDirector,
        ownerCheckApplied: decision.ownerCheckApplied,
      })}`,
    );
    console.log(
      `[${FUNCTION_NAME}] foreman request owner mismatch ${JSON.stringify({
        requestId: args.requestId,
        uid: args.userId,
        createdBy: cleanText(data.created_by),
      })}`,
    );
    throw createCanonicalPdfErrorResponse({
      status: 403,
      role: "foreman",
      documentType: "request",
      errorCode: "auth_failed",
      error: "Forbidden.",
    });
  }
}

async function loadRequestPdfModel(admin: any, requestId: string) {
  const locale = "ru-RU";

  const head = await admin
    .from("requests")
    .select("id, display_no, foreman_name, need_by, comment, status, created_at, object_type_code, level_code, system_code, zone_code")
    .eq("id", requestId)
    .maybeSingle();

  if (head.error || !head.data) {
    throw new Error("Заявка не найдена");
  }

  const request = head.data;
  const [objectRef, levelRef, systemRef, zoneRef, noteRows, itemRows] = await Promise.all([
    request.object_type_code
      ? admin
          .from("ref_object_types")
          .select("name,name_ru,name_human_ru,display_name,alias_ru")
          .eq("code", request.object_type_code)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    request.level_code
      ? admin
          .from("ref_levels")
          .select("name,name_ru,name_human_ru,display_name,alias_ru")
          .eq("code", request.level_code)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    request.system_code
      ? admin
          .from("ref_systems")
          .select("name,name_ru,name_human_ru,display_name,alias_ru")
          .eq("code", request.system_code)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    request.zone_code
      ? admin
          .from("ref_zones")
          .select("name,name_ru,name_human_ru,display_name,alias_ru")
          .eq("code", request.zone_code)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    admin.from("request_items").select("note").eq("request_id", requestId),
    admin
      .from("request_items")
      .select("id, name_human, uom, qty, note, status")
      .eq("request_id", requestId)
      .order("id", { ascending: true }),
  ]);

  const objectName = pickRefName(asObject(objectRef.data));
  const levelName = pickRefName(asObject(levelRef.data));
  const systemName = pickRefName(asObject(systemRef.data));
  const zoneName = pickRefName(asObject(zoneRef.data));
  const noteContext = parseContextFromNotes(
    Array.isArray(noteRows.data) ? noteRows.data.map((row: Record<string, unknown>) => row.note) : [],
  );
  const requestLabel = cleanText(request.display_no) || `#${requestId.slice(0, 8)}`;

  const formatQty = (value: unknown) => {
    const parsed = Number(String(value ?? "").replace(",", "."));
    return Number.isFinite(parsed)
      ? parsed.toLocaleString(locale, { maximumFractionDigits: 3 })
      : "";
  };

  const metaFields = [
    { label: "Объект", value: objectName || "—" },
    { label: "Система", value: systemName || "—" },
    { label: "ФИО прораба", value: cleanText(request.foreman_name) || "(не указано)" },
    { label: "Нужно к", value: formatDate(request.need_by, locale) || "—" },
    { label: "ID заявки", value: cleanText(request.id) || "—" },
    { label: "Этаж / уровень", value: levelName || "—" },
    { label: "Зона / участок", value: zoneName || "—" },
    { label: "Дата создания", value: formatDateTime(request.created_at, locale) || "—" },
    { label: "Статус", value: normalizeStatusRu(request.status) || "—" },
  ];

  if (noteContext.contractor) {
    metaFields.push({ label: "Подрядчик", value: noteContext.contractor });
  }
  if (noteContext.phone) {
    metaFields.push({ label: "Телефон", value: noteContext.phone });
  }
  if (noteContext.volume) {
    metaFields.push({ label: "Объём", value: noteContext.volume });
  }

  return {
    requestLabel,
    generatedAt: new Date().toLocaleString(locale),
    comment: cleanText(request.comment),
    foremanName: cleanText(request.foreman_name),
    metaFields,
    rows: Array.isArray(itemRows.data)
      ? itemRows.data.map((row: Record<string, unknown>) => ({
          name: cleanText(row.name_human),
          uom: cleanText(row.uom),
          qtyText: formatQty(row.qty),
          status: normalizeStatusRu(cleanText(row.status)),
          note: stripContextFromNote(row.note),
        }))
      : [],
  };
}

const serverPort = Number(Deno.env.get("PORT") ?? "8000");

Deno.serve({ port: Number.isFinite(serverPort) ? serverPort : 8000 }, async (request) => {
  if (request.method === "OPTIONS") {
    return createCanonicalPdfOptionsResponse();
  }

  try {
    const supabaseUrl = cleanText(Deno.env.get("SUPABASE_URL"));
    const serviceRoleKey = cleanText(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const bucketId = cleanText(Deno.env.get("CANONICAL_PDF_EXPORTS_BUCKET")) || DEFAULT_BUCKET;

    if (!supabaseUrl || !serviceRoleKey) {
      return createCanonicalPdfErrorResponse({
        status: 500,
        role: "foreman",
        documentType: "request",
        errorCode: "backend_pdf_failed",
        error: "Missing Supabase environment.",
        renderBranch: RENDER_BRANCH,
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const payload = normalizeForemanRequestPdfRequest(await request.json());
    const auth = await requireForemanAuth(request, supabaseUrl);
    await assertForemanRequestAccess({
      admin,
      requestId: payload.requestId,
      userId: auth.userId,
    });

    const model = await loadRequestPdfModel(admin, payload.requestId);
    const title = model.requestLabel ? `Заявка ${model.requestLabel}` : `Заявка ${payload.requestId}`;
    const fileName = normalizePdfFileName(
      buildCanonicalPdfFileName({
        documentType: "request",
        title: model.requestLabel || payload.requestId,
        entityId: payload.requestId,
      }),
      "request",
    );
    const html = renderForemanRequestPdfHtml(model);
    const { pdfBytes, renderer } = await renderPdfBytes(html);
    const storagePath = buildStoragePath("foreman/request", fileName);
    const uploaded = await uploadCanonicalPdf({
      admin,
      bucketId,
      storagePath,
      bytes: pdfBytes,
      ttlSeconds: resolveSignedUrlTtlSeconds(),
    });

    return createCanonicalPdfSuccessResponse({
      role: "foreman",
      documentType: "request",
      bucketId,
      storagePath: uploaded.storagePath,
      signedUrl: uploaded.signedUrl,
      fileName,
      generatedAt: new Date().toISOString(),
      renderBranch: RENDER_BRANCH,
      renderer,
      telemetry: {
        functionName: FUNCTION_NAME,
        requestId: payload.requestId,
        title,
        requestedByUserId: auth.userId,
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error(`[${FUNCTION_NAME}]`, error instanceof Error ? error.message : String(error));
    return createCanonicalPdfErrorResponse({
      status: 500,
      role: "foreman",
      documentType: "request",
      errorCode: "backend_pdf_failed",
      error: error instanceof Error ? error.message : "Foreman request PDF render failed.",
      renderBranch: RENDER_BRANCH,
    });
  }
});
