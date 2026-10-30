/* eslint-disable import/no-unresolved */
// @ts-nocheck

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  buildForemanRequestManifestContract,
  normalizeForemanRequestPdfRequest,
} from "../../../src/lib/pdf/foremanRequestPdf.shared.ts";
import {
  createCanonicalPdfErrorResponse,
  createCanonicalPdfOptionsResponse,
  createCanonicalPdfSuccessResponse,
} from "../../../src/lib/pdf/canonicalPdfPlatformContract.ts";
import { assertForemanRequestPdfSnapshotCurrent, loadForemanRequestPdfAuthoritySnapshot } from "../../../src/lib/pdf/foremanRequestPdfAuthority.ts";
import {
  buildCanonicalPdfFileName,
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
const FOREMAN_REQUEST_ARTIFACT_CACHE_VERSION =
  "pdf_z4_foreman_request_artifact_v1";

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
    if (
      lower.startsWith("этаж") ||
      lower.startsWith("этаж/") ||
      lower.startsWith("этаж /")
    )
      return false;
    if (lower.startsWith("система:")) return false;
    if (
      lower.startsWith("зона:") ||
      lower.startsWith("зона /") ||
      lower.startsWith("зона/")
    )
      return false;
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
      else if (key.includes("объём") || key.includes("объем"))
        put("volume", value);
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
  if (normalized === "pending" || normalized === "на утверждении")
    return "На утверждении";
  if (
    normalized === "approved" ||
    normalized === "утверждено" ||
    normalized === "утверждена"
  ) {
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

function loadRequestPdfModel(snapshot: Awaited<ReturnType<typeof loadForemanRequestPdfAuthoritySnapshot>>, requestId: string) {
  const locale = "ru-RU";
  const request = snapshot.request;
  const itemRows = snapshot.items;
  const objectRef = { data: snapshot.refs.object };
  const levelRef = { data: snapshot.refs.level };
  const systemRef = { data: snapshot.refs.system };
  const zoneRef = { data: snapshot.refs.zone };

  const objectName = pickRefName(asObject(objectRef.data));
  const levelName = pickRefName(asObject(levelRef.data));
  const systemName = pickRefName(asObject(systemRef.data));
  const zoneName = pickRefName(asObject(zoneRef.data));
  const noteContext = parseContextFromNotes(
    itemRows.map((row: Record<string, unknown>) => row.note),
  );
  const requestLabel =
    cleanText(request.display_no) || `#${requestId.slice(0, 8)}`;

  const formatQty = (value: unknown) => {
    const parsed = Number(String(value ?? "").replace(",", "."));
    return Number.isFinite(parsed)
      ? parsed.toLocaleString(locale, { maximumFractionDigits: 3 })
      : "";
  };

  const metaFields = [
    { label: "Объект", value: objectName || "—" },
    { label: "Система", value: systemName || "—" },
    {
      label: "ФИО прораба",
      value: cleanText(request.foreman_name) || "(не указано)",
    },
    { label: "Нужно к", value: formatDate(request.need_by, locale) || "—" },
    { label: "ID заявки", value: cleanText(request.id) || "—" },
    { label: "Этаж / уровень", value: levelName || "—" },
    { label: "Зона / участок", value: zoneName || "—" },
    {
      label: "Дата создания",
      value: formatDateTime(request.created_at, locale) || "—",
    },
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
    rows: itemRows.map((row: Record<string, unknown>) => ({
      name: cleanText(row.name_human),
      uom: cleanText(row.uom),
      qtyText: formatQty(row.qty),
      status: normalizeStatusRu(cleanText(row.status)),
      note: stripContextFromNote(row.note),
    })),
  };
}

function buildForemanRequestSourceModel(model: Record<string, unknown>) {
  return {
    requestLabel: model.requestLabel ?? null,
    comment: model.comment ?? null,
    foremanName: model.foremanName ?? null,
    metaFields: model.metaFields ?? [],
    rows: model.rows ?? [],
  };
}

async function trySignExistingPdfArtifact(args: {
  admin: any;
  bucketId: string;
  storagePath: string;
}) {
  const slashIndex = args.storagePath.lastIndexOf("/");
  const prefix = slashIndex >= 0 ? args.storagePath.slice(0, slashIndex) : "";
  const objectName =
    slashIndex >= 0 ? args.storagePath.slice(slashIndex + 1) : args.storagePath;
  const listed = await args.admin.storage.from(args.bucketId).list(prefix, {
    limit: 1,
    search: objectName,
  });
  if (listed.error || !Array.isArray(listed.data)) return null;
  const exists = listed.data.some(
    (item: Record<string, unknown>) => cleanText(item?.name) === objectName,
  );
  if (!exists) return null;

  const ttlSeconds = resolveSignedUrlTtlSeconds();
  const signed = await args.admin.storage
    .from(args.bucketId)
    .createSignedUrl(args.storagePath, ttlSeconds);
  const signedUrl = cleanText(signed.data?.signedUrl);
  if (signed.error || !signedUrl) return null;
  return {
    bucketId: args.bucketId,
    storagePath: args.storagePath,
    signedUrl,
    expiresInSeconds: ttlSeconds,
  };
}

function isStorageAlreadyExistsError(error: unknown) {
  const message = cleanText(
    (error as { message?: unknown } | null)?.message,
  ).toLowerCase();
  const status = cleanText(
    (error as { statusCode?: unknown } | null)?.statusCode,
  );
  return (
    status === "409" ||
    message.includes("already exists") ||
    message.includes("duplicate")
  );
}

async function uploadForemanRequestPdfArtifact(args: {
  admin: any;
  bucketId: string;
  storagePath: string;
  bytes: Uint8Array;
}) {
  try {
    const uploaded = await uploadCanonicalPdf({
      admin: args.admin,
      bucketId: args.bucketId,
      storagePath: args.storagePath,
      bytes: args.bytes,
      ttlSeconds: resolveSignedUrlTtlSeconds(),
    });
    return {
      bucketId: args.bucketId,
      storagePath: uploaded.storagePath,
      signedUrl: uploaded.signedUrl,
    };
  } catch (error) {
    if (isStorageAlreadyExistsError(error)) {
      const existing = await trySignExistingPdfArtifact({
        admin: args.admin,
        bucketId: args.bucketId,
        storagePath: args.storagePath,
      });
      if (existing) return existing;
    }
    throw error;
  }
}

const serverPort = Number(Deno.env.get("PORT") ?? "8000");

Deno.serve(
  { port: Number.isFinite(serverPort) ? serverPort : 8000 },
  async (request) => {
    if (request.method === "OPTIONS") {
      return createCanonicalPdfOptionsResponse();
    }

    try {
      const supabaseUrl = cleanText(Deno.env.get("SUPABASE_URL"));
      const serviceRoleKey = cleanText(
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
      );
      const bucketId =
        cleanText(Deno.env.get("CANONICAL_PDF_EXPORTS_BUCKET")) ||
        DEFAULT_BUCKET;

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
      const totalStartedAt = Date.now();
      const sourceStartedAt = Date.now();
      // The caller JWT, never the service role, authorizes and loads the snapshot.
      // A missing/denied RPC is terminal: there is no metadata or admin fallback.
      let snapshot;
      try {
        snapshot = await loadForemanRequestPdfAuthoritySnapshot({
          requester: auth.requester,
          requestId: payload.requestId,
          actorId: auth.userId,
        });
      } catch {
        throw createCanonicalPdfErrorResponse({
          status: 403, role: "foreman", documentType: "request",
          errorCode: "auth_failed", error: "Forbidden.",
        });
      }
      const model = loadRequestPdfModel(snapshot, payload.requestId);
      const sourceLoadedAt = Date.now();
      const title = model.requestLabel
        ? `Заявка ${model.requestLabel}`
        : `Заявка ${payload.requestId}`;
      const fileName = normalizePdfFileName(
        buildCanonicalPdfFileName({
          documentType: "request",
          title: model.requestLabel || payload.requestId,
          entityId: payload.requestId,
        }),
        "request",
      );
      const artifact = await buildForemanRequestManifestContract({
        requestId: payload.requestId,
        sourceModel: {
          authorityScope: snapshot.authority,
          model: buildForemanRequestSourceModel(model),
        },
        fileName,
      });
      const cachedArtifact = await trySignExistingPdfArtifact({
        admin,
        bucketId,
        storagePath: artifact.artifactPath,
      });

      if (cachedArtifact) {
        console.info(
          `[${FUNCTION_NAME}] backend_foreman_request_artifact_hit`,
          {
            requestId: payload.requestId,
            bucketId: cachedArtifact.bucketId,
            storagePath: cachedArtifact.storagePath,
            sourceVersion: artifact.sourceVersion,
            artifactVersion: artifact.artifactVersion,
            sourceMs: sourceLoadedAt - sourceStartedAt,
            totalMs: Date.now() - totalStartedAt,
          },
        );

        return createCanonicalPdfSuccessResponse({
          role: "foreman",
          documentType: "request",
          bucketId: cachedArtifact.bucketId,
          storagePath: cachedArtifact.storagePath,
          signedUrl: cachedArtifact.signedUrl,
          fileName,
          generatedAt: new Date().toISOString(),
          renderBranch: RENDER_BRANCH,
          renderer: "artifact_cache",
          telemetry: {
            functionName: FUNCTION_NAME,
            requestId: payload.requestId,
            title,
            requestedByUserId: auth.userId,
            cacheStatus: "artifact_hit",
            cacheVersion: FOREMAN_REQUEST_ARTIFACT_CACHE_VERSION,
            templateVersion: artifact.templateVersion,
            sourceVersion: artifact.sourceVersion,
            artifactVersion: artifact.artifactVersion,
            sourceMs: sourceLoadedAt - sourceStartedAt,
            renderMs: 0,
            uploadAndSignMs: 0,
            totalMs: Date.now() - totalStartedAt,
          },
        });
      }

      const html = renderForemanRequestPdfHtml(model);
      const renderStartedAt = Date.now();
      const { pdfBytes, renderer } = await renderPdfBytes(html);
      const renderFinishedAt = Date.now();
      // Rendering can outlive membership/factor or source changes.
      try {
        await assertForemanRequestPdfSnapshotCurrent({ requester: auth.requester, snapshot });
      } catch {
        throw createCanonicalPdfErrorResponse({
          status: 403, role: "foreman", documentType: "request",
          errorCode: "auth_failed", error: "PDF source or authority changed; retry required.",
        });
      }
      const uploadStartedAt = Date.now();
      const uploaded = await uploadForemanRequestPdfArtifact({
        admin,
        bucketId,
        storagePath: artifact.artifactPath,
        bytes: pdfBytes,
      });
      const uploadFinishedAt = Date.now();

      console.info(`[${FUNCTION_NAME}] backend_foreman_request_artifact_miss`, {
        requestId: payload.requestId,
        bucketId: uploaded.bucketId,
        storagePath: uploaded.storagePath,
        sourceVersion: artifact.sourceVersion,
        artifactVersion: artifact.artifactVersion,
        sourceMs: sourceLoadedAt - sourceStartedAt,
        renderMs: renderFinishedAt - renderStartedAt,
        uploadAndSignMs: uploadFinishedAt - uploadStartedAt,
        totalMs: uploadFinishedAt - totalStartedAt,
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
          cacheStatus: "artifact_miss",
          cacheVersion: FOREMAN_REQUEST_ARTIFACT_CACHE_VERSION,
          templateVersion: artifact.templateVersion,
          sourceVersion: artifact.sourceVersion,
          artifactVersion: artifact.artifactVersion,
          sourceMs: sourceLoadedAt - sourceStartedAt,
          renderMs: renderFinishedAt - renderStartedAt,
          uploadAndSignMs: uploadFinishedAt - uploadStartedAt,
          totalMs: uploadFinishedAt - totalStartedAt,
          htmlLength: html.length,
          pdfSizeBytes: pdfBytes.byteLength,
        },
      });
    } catch (error) {
      if (error instanceof Response) return error;
      console.error(
        `[${FUNCTION_NAME}]`,
        error instanceof Error ? error.message : String(error),
      );
      return createCanonicalPdfErrorResponse({
        status: 500,
        role: "foreman",
        documentType: "request",
        errorCode: "backend_pdf_failed",
        error:
          error instanceof Error
            ? error.message
            : "Foreman request PDF render failed.",
        renderBranch: RENDER_BRANCH,
      });
    }
  },
);
