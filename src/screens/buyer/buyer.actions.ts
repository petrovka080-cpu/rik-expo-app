// src/screens/buyer/buyer.actions.ts
import { SUPP_NONE, normName } from "./buyerUtils";
import type {
  ProposalBucketInput,
  CreateProposalsOptions as CatalogCreateProposalsOptions,
  CreateProposalsResult as CatalogCreateProposalsResult,
} from "../../lib/catalog_api";
import { repoGetProposalItemsForView, repoGetRequestItemsByIds } from "./buyer.repo";
import { repoGetProposalItemLinks, repoGetRequestItemToRequestMap } from "./buyer.repo";
import {
  repoSetProposalBuyerFio,
  repoUpdateProposalItems,
  type RepoProposalItemUpdate,
} from "./buyer.repo";
import type { SupabaseClient } from "@supabase/supabase-js";
import { enqueueSubmitJob, JOB_QUEUE_ENABLED } from "../../lib/infra/jobQueue";
import { stageProposalAttachmentForQueue } from "../../lib/api/storage";
import type { QueuedProposalAttachment } from "../../lib/api/queuedProposalAttachments";

type AlertFn = (title: string, message: string) => void;
type FileLike = File | Blob | {
  name?: string | null;
  uri?: string | null;
  fileCopyUri?: string | null;
  mimeType?: string | null;
  type?: string | null;
  size?: number | null;
};
type LogFn = (...args: unknown[]) => void;
type CreateProposalMetaRow = {
  request_item_id: string;
  price: number | string | null;
  supplier: string | null;
  note: string | null;
};
type CreateProposalPayloadRow = {
  supplier: string | null;
  request_item_ids: string[];
  meta: CreateProposalMetaRow[];
};
type ProposalSendToAccountantPayload = {
  proposalId: string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceAmount: number;
  invoiceCurrency: string;
};
type MaybeId = { id?: string | number | null };
type CreatedProposalRow = {
  id?: string | null;
  proposal_id?: string | null;
  request_item_ids?: string[] | null;
  supplier?: string | null;
};
type ProposalRowLite = { id?: string | null; supplier?: string | null };
type ProposalItemLinkRow = { proposal_id?: string | null; request_item_id?: string | null };
type RequestItemToRequestRow = { id?: string | null; request_id?: string | null };
type RequestItemViewRow = {
  id?: string | null;
  request_item_id?: string | null;
  name_human?: string | null;
  uom?: string | null;
  qty?: number | null;
  rik_code?: string | null;
  app_code?: string | null;
};
type ReworkProposalItemRow = {
  request_item_id?: string | null;
  price?: number | string | null;
  supplier?: string | null;
  note?: string | null;
};
type BuyerInboxLikeRow = {
  request_item_id?: string | null;
  name_human?: string | null;
  uom?: string | null;
  qty?: number | null;
  app_code?: string | null;
  rik_code?: string | null;
};
type ReworkProposalRow = {
  status?: string | null;
  sent_to_accountant_at?: string | null;
  payment_status?: string | null;
  invoice_number?: string | null;
  redo_source?: string | null;
  redo_comment?: string | null;
  return_comment?: string | null;
  accountant_comment?: string | null;
  return_reason?: string | null;
  accountant_note?: string | null;
};
type RequestItemNameRow = {
  id?: string | null;
  name_human?: string | null;
  uom?: string | null;
  qty?: number | null;
};
type SnapshotMetaRow = { price?: string; note?: string };
type CreateProposalsApi = (
  payload: ProposalBucketInput[],
  opts?: CatalogCreateProposalsOptions
) => Promise<CatalogCreateProposalsResult>;
type BuyerSubmitIntentPayload = {
  requestId: string | null;
  requestItemIds: string[];
  metaById: Record<string, { supplier?: string; price?: number | string | null; note?: string | null }>;
  buyerId: string | null;
  buyerFio: string;
  attachments: QueuedProposalAttachment[];
};

const bytesToUuid = (bytes: Uint8Array): string => {
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
};

const makeClientRequestId = (): string | null => {
  const cryptoLike =
    typeof globalThis !== "undefined"
      ? (globalThis as typeof globalThis & {
          crypto?: {
            randomUUID?: () => string;
            getRandomValues?: (array: Uint8Array) => Uint8Array;
          };
        }).crypto
      : undefined;

  if (typeof cryptoLike?.randomUUID === "function") {
    return cryptoLike.randomUUID();
  }

  if (typeof cryptoLike?.getRandomValues === "function") {
    const bytes = cryptoLike.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    return bytesToUuid(bytes);
  }

  return null;
};

const errMessage = (e: unknown, fallback = "Unknown error"): string => {
  if (e instanceof Error) {
    const message = e.message.trim();
    if (message) return message;
  }

  if (typeof e === "string") {
    const message = e.trim();
    if (message) return message;
  }

  if (e && typeof e === "object") {
    const record = e as Record<string, unknown>;
    for (const key of ["message", "error", "details", "hint", "code"] as const) {
      const value = String(record[key] ?? "").trim();
      if (value) return value;
    }
    try {
      const json = JSON.stringify(e);
      if (json && json !== "{}") return json;
    } catch {}
  }

  return fallback;
};

const normalizeRuntimeError = (e: unknown, fallback: string): Error => {
  return new Error(errMessage(e, fallback));
};
const toPriceString = (v: number | string | null | undefined): string | null => {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
};

type OpenProposalViewDeps = {
  pidStr: string;
  head: Record<string, unknown> | null;
  supabase: SupabaseClient;

  openPropDetailsSheet: (pid: string) => void;
  setPropViewId: (v: string | null) => void;
  setPropViewHead: (v: Record<string, unknown> | null) => void;
  setPropViewLines: (v: RequestItemViewRow[]) => void;
  setPropViewBusy: (v: boolean) => void;

  log?: LogFn;
};
type ConfirmSendWithoutAttachments = () => Promise<boolean>;

type CreateProposalsDeps = {
  // guards/state
  creating: boolean;
  sendingRef: { current: boolean };

  // data (С‡РµСЂРµР· refs вЂ” РєР°Рє Сѓ С‚РµР±СЏ)
  pickedIds: string[];
  metaNow: Record<string, { supplier?: string; price?: number | string | null; note?: string | null }>;
  attachmentsNow: Record<string, { file?: FileLike; name?: string }>;
  buyerFio: string;
  buyerId?: string | null;
  requestId?: string | null;

  // ui flags
  needAttachWarn: boolean;
  kbOpen: boolean;

  // validators / confirms
  validatePicked: () => boolean;
  confirmSendWithoutAttachments: ConfirmSendWithoutAttachments;

  // api
  apiCreateProposalsBySupplier: CreateProposalsApi;
  supabase: SupabaseClient;
  uploadProposalAttachment: (pid: string, file: FileLike, fileName: string, groupKey: string) => Promise<void>;

  // side-effects in screen
  setAttachments: (v: Record<string, never>) => void;
  removeFromInboxLocally: (ids: string[]) => void;
  clearPick: () => void;
  fetchInbox: () => Promise<void>;
  fetchBuckets: () => Promise<void>;
  setTab: (t: "pending") => void;
  closeSheet: () => void;

  // ui helpers
  setShowAttachBlock: (v: boolean) => void;
  showToast: (msg: string) => void;
  alert: AlertFn;
};

export async function handleCreateProposalsBySupplierAction(p: CreateProposalsDeps) {
  if (p.creating) return;
  if (p.sendingRef.current) return;

  const ids = p.pickedIds || [];
  console.info("[buyer.submit] pressed", {
    pickedIds: ids,
    pickedCount: ids.length,
    metaSnapshot: ids.map((id) => ({
      requestItemId: id,
      supplier: String(p.metaNow?.[id]?.supplier ?? "").trim(),
      price: String(p.metaNow?.[id]?.price ?? "").trim(),
      note: String(p.metaNow?.[id]?.note ?? "").trim(),
    })),
    attachmentKeys: Object.keys(p.attachmentsNow || {}),
    queueEnabled: JOB_QUEUE_ENABLED,
    needAttachWarn: p.needAttachWarn,
    kbOpen: p.kbOpen,
  });
  if (ids.length === 0) {
    p.showToast("Выбери позиции");
    p.alert("Пусто", "Выбери позиции");
    return;
  }

  if (p.needAttachWarn && !p.kbOpen) {
    p.setShowAttachBlock(true);
    p.showToast("Вложения не добавлены, но отправка без них разрешена");
  }

  const validateOk = p.validatePicked();
  console.info("[buyer.submit] validatePicked.result", { validateOk });
  if (!validateOk) return;

  p.sendingRef.current = true;

  try {
    const tAll = Date.now();
    const tIntent = tAll;
    let queueInsertMs = 0;
    const okNoAtt = await p.confirmSendWithoutAttachments();
    if (!okNoAtt) return;
    const submitIntentMs = Date.now() - tIntent;
    console.info("[buyer.submit] queue.enabled", { queueEnabled: JOB_QUEUE_ENABLED });
    console.info(
      JOB_QUEUE_ENABLED
        ? "[buyer.submit] queue-mode path"
        : "[buyer.submit] legacy sync path",
      "rows=",
      ids.length,
    );

    if (JOB_QUEUE_ENABLED) {
      const tQueue = Date.now();
      const clientRequestId = makeClientRequestId();
      const attachmentEntries = Object.entries(p.attachmentsNow || {});
      const attachmentInputCount = attachmentEntries.filter(([, value]) => !!value?.file).length;
      const stagedAttachments: QueuedProposalAttachment[] = [];
      for (const [key, value] of attachmentEntries) {
        const fileName = String(value?.name || "").trim();
        if (!fileName || !value?.file) continue;
        stagedAttachments.push(
          await stageProposalAttachmentForQueue(value.file, fileName, key, "supplier_quote"),
        );
      }
      if (attachmentInputCount > 0 && stagedAttachments.length === 0) {
        console.warn("[buyer.submit] queue.attachments.stagedEmpty", {
          attachmentKeys: attachmentEntries.map(([key]) => key),
          attachmentInputCount,
        });
      }
      const intentPayload: BuyerSubmitIntentPayload = {
        requestId: p.requestId ? String(p.requestId).trim() || null : null,
        requestItemIds: ids,
        metaById: p.metaNow || {},
        buyerId: p.buyerId ? String(p.buyerId).trim() || null : null,
        buyerFio: (p.buyerFio || "").trim(),
        attachments: stagedAttachments,
      };
      try {
        await enqueueSubmitJob({
          jobType: "buyer_submit_proposal",
          entityType: "request_items",
          entityId: ids[0] || null,
          entityKey: p.requestId ? String(p.requestId).trim() || null : ids[0] || null,
          payload: intentPayload as unknown as Record<string, unknown>,
          clientRequestId,
        });
      } catch (e: unknown) {
        console.warn("[buyer.submit] queue.enqueue.failed", {
          clientRequestId,
          requestItemIds: ids,
          attachmentCount: stagedAttachments.length,
          error: errMessage(e, "Не удалось поставить заявку в очередь."),
          raw: e,
        });
        throw normalizeRuntimeError(e, "Не удалось поставить заявку в очередь.");
      }
      queueInsertMs = Date.now() - tQueue;
      console.info("[buyer.submit] queue.enqueued", {
        clientRequestId,
        queueInsertMs,
        requestItemIds: ids,
        attachmentCount: stagedAttachments.length,
      });

      // Fast UX path: enqueue accepted.
      p.clearPick();
      p.closeSheet();
      p.alert("Отправлено", "Заявка поставлена в очередь на обработку.");
      void Promise.allSettled([p.fetchInbox(), p.fetchBuckets()]);
      console.info(
        "[buyer.submit] queued",
        "submitIntentMs=",
        submitIntentMs,
        "queueInsertMs=",
        queueInsertMs,
        "rows=",
        ids.length,
      );
      console.info("[buyer.submit] queue-mode enqueued, returning early");
      console.info(
        "[buyer.submit] totalUserWait.ms=",
        Date.now() - tAll,
        "submitIntentMs=",
        submitIntentMs,
        "queueInsertMs=",
        queueInsertMs,
      );
      return;
    }

    // РіСЂСѓРїРїРёСЂСѓРµРј РїРѕ РїРѕСЃС‚Р°РІС‰РёРєСѓ (РєР°Рє Р±С‹Р»Рѕ)
    const bySupp = new Map<string, { ids: string[]; display: string }>();
    for (const id of ids) {
      const raw = (p.metaNow?.[id]?.supplier || "").trim();
      const key = normName(raw) || SUPP_NONE;
      const display = raw || SUPP_NONE;
      if (!bySupp.has(key)) bySupp.set(key, { ids: [], display });
      bySupp.get(key)!.ids.push(id);
    }

    const payload: ProposalBucketInput[] = Array.from(bySupp.values()).map((bucket) => {
      const supplierForProposal = bucket.display === SUPP_NONE ? null : bucket.display;
      return {
        supplier: supplierForProposal,
        request_item_ids: bucket.ids,
        meta: bucket.ids.map((id) => ({
          request_item_id: id,
          price: toPriceString(p.metaNow?.[id]?.price),
          supplier: supplierForProposal,
          note: p.metaNow?.[id]?.note ?? null,
        })),
      };
    });

    const tCreate = Date.now();
    let result: CatalogCreateProposalsResult;
    try {
      result = await p.apiCreateProposalsBySupplier(payload, {
        buyerFio: (p.buyerFio || "").trim(),
      });
    } catch (e) {
      console.warn("[buyer.submit] createProposalsBySupplier.failed", {
        error: errMessage(e),
        pickedIds: ids,
        payloadBuckets: payload.length,
        payloadPreview: payload.map((x) => ({
          supplier: x.supplier,
          count: Array.isArray(x.request_item_ids) ? x.request_item_ids.length : 0,
        })),
      });
      throw normalizeRuntimeError(e, "Не удалось создать предложения.");
    }
    console.info(
      "[buyer.submit] createProposalsBySupplier.ms=",
      Date.now() - tCreate,
      "rows=",
      ids.length,
      "buckets=",
      payload.length,
      "submitIntentMs=",
      submitIntentMs,
      "queueInsertMs=",
      queueInsertMs,
    );

    const created: CreatedProposalRow[] = Array.isArray(result?.proposals) ? result.proposals : [];
    console.info("[buyer.submit] create.result", {
      createdCount: created.length,
      proposals: created.map((row) => ({
        proposalId: String(row?.proposal_id ?? row?.id ?? "").trim(),
        requestItemIds: Array.isArray(row?.request_item_ids) ? row.request_item_ids : [],
        supplier: row?.supplier ?? null,
      })),
    });
    if (!created.length) {
      p.alert("Внимание", "Не удалось сформировать предложения");
      return;
    }

    // Upload supplier_quote in parallel to avoid long sequential wait on many proposals.
    try {
      const proposalIds = Array.from(
        new Set(
          created
            .map((x) => String(x?.proposal_id ?? x?.id ?? "").trim())
            .filter(Boolean)
        )
      );

      if (proposalIds.length) {
        const qProps = await p.supabase
          .from("proposals")
          .select("id, supplier")
          .in("id", proposalIds);

        if (qProps.error) throw qProps.error;

        const proposalRows: ProposalRowLite[] = Array.isArray(qProps.data) ? qProps.data : [];
        const uploads: Promise<void>[] = [];
        for (const r of proposalRows) {
          const pid = String(r?.id ?? "").trim();
          if (!pid) continue;

          const supplierLabel = String(r?.supplier ?? "").trim() || SUPP_NONE;
          const k = normName(supplierLabel) || SUPP_NONE;

          const att = p.attachmentsNow?.[k];
          if (!att?.file) continue;

          const fileName = String(att.name || `file_${Date.now()}`).trim();
          uploads.push(p.uploadProposalAttachment(pid, att.file, fileName, "supplier_quote"));
        }
        const tAtt = Date.now();
        const settled = await Promise.allSettled(uploads);
        const failed = settled.filter((x) => x.status === "rejected").length;
        console.info("[buyer.submit] attachmentUploads.ms=", Date.now() - tAtt, "total=", uploads.length, "failed=", failed);
      }
    } catch (e: unknown) {
      p.alert("Вложения", errMessage(e, "Предложения созданы, но вложения не прикрепились."));
    }

    p.setAttachments({});
    const affectedIds = created.flatMap((x) =>
      Array.isArray(x?.request_item_ids) ? x.request_item_ids : []
    );

    // Post-submit request_items maintenance in background (non-blocking for UX wait).
    void (async () => {
      if (!affectedIds.length) return;
      const tPost = Date.now();
      try {
        const rpc = await p.supabase.rpc("request_items_set_status" as any, {
          p_request_item_ids: affectedIds,
          p_status: "У директора",
        } as any);
        if (rpc.error) throw rpc.error;
      } catch {
        try {
          await p.supabase.from("request_items").update({ status: "У директора" }).in("id", affectedIds);
        } catch {}
      }
      try {
        await p.supabase
          .from("request_items")
          .update({ director_reject_note: null, director_reject_at: null })
          .in("id", affectedIds);
      } catch {}
      console.info("[buyer.submit] postSubmitRequestItems.ms=", Date.now() - tPost, "rows=", affectedIds.length);
    })();

    p.removeFromInboxLocally(affectedIds);
    p.clearPick();

    p.alert("Отправлено", `Создано предложений: ${created.length}`);
    p.setTab("pending");
    p.closeSheet();
    // Do not block UX on full screen reload; refresh in background.
    const tRefresh = Date.now();
    void Promise.allSettled([p.fetchInbox(), p.fetchBuckets()]).then(() => {
      console.info("[buyer.submit] backgroundRefresh.ms=", Date.now() - tRefresh);
    });
    console.info(
      "[buyer.submit] totalUserWait.ms=",
      Date.now() - tAll,
      "submitIntentMs=",
      submitIntentMs,
      "queueInsertMs=",
      queueInsertMs,
    );
  } catch (e: unknown) {
    const message = errMessage(e, "Не удалось отправить директору");
    console.warn("[buyer.submit] final.error", { error: message, raw: e });
    p.alert("Ошибка", message);
  } finally {
    p.sendingRef.current = false;
  }
}
type PublishRfqDeps = {
  pickedIds: string[];

  rfqDeadlineIso: string;
  rfqDeliveryDays: string;

  rfqCity: string;
  rfqAddressText: string;

  rfqPhone: string;
  rfqCountryCode: string;
  rfqEmail: string;

  rfqVisibility: "open" | "company_only";
  rfqNote: string;

  supabase: SupabaseClient;

  setBusy: (v: boolean) => void;
  closeSheet: () => void;
  alert: (t: string, m: string) => void;
};

export async function publishRfqAction(p: PublishRfqDeps) {
  try {
    if (p.pickedIds.length === 0) {
      p.alert("РџСѓСЃС‚Рѕ", "Р’С‹Р±РµСЂРё РїРѕР·РёС†РёРё РґР»СЏ С‚РѕСЂРіРѕРІ");
      return;
    }

    const d = new Date(p.rfqDeadlineIso);
    if (Number.isNaN(d.getTime())) {
      p.alert("Р”РµРґР»Р°Р№РЅ", "РќРµРІРµСЂРЅР°СЏ РґР°С‚Р°");
      return;
    }
    if (d.getTime() < Date.now() + 5 * 60 * 1000) {
      p.alert("Р”РµРґР»Р°Р№РЅ", "РџРѕСЃС‚Р°РІСЊ РјРёРЅРёРјСѓРј +5 РјРёРЅСѓС‚ РѕС‚ С‚РµРєСѓС‰РµРіРѕ РІСЂРµРјРµРЅРё");
      return;
    }

    const deliveryDays = Number(String(p.rfqDeliveryDays).trim());
    if (!Number.isFinite(deliveryDays) || deliveryDays < 0) {
      p.alert("РЎСЂРѕРє РїРѕСЃС‚Р°РІРєРё", "РЈРєР°Р¶Рё С‡РёСЃР»Рѕ РґРЅРµР№ (0 РёР»Рё Р±РѕР»СЊС€Рµ)");
      return;
    }

    const city = p.rfqCity.trim();
    const addr = p.rfqAddressText.trim();
    if (!city && !addr) {
      p.alert("РњРµСЃС‚Рѕ РїРѕСЃС‚Р°РІРєРё", "РЈРєР°Р¶Рё РіРѕСЂРѕРґ РёР»Рё Р°РґСЂРµСЃ");
      return;
    }

    const phoneLocal = String(p.rfqPhone ?? "").replace(/[^\d]/g, "").trim();
    const ccDigits = String(p.rfqCountryCode ?? "+996").replace(/[^\d]/g, "");
    const phoneFull = phoneLocal ? `+${ccDigits}${phoneLocal}` : null;

    const email = String(p.rfqEmail ?? "").trim() || null;

    if (!(phoneFull || email)) {
      p.alert("РљРѕРЅС‚Р°РєС‚С‹", "РЈРєР°Р¶Рё С‚РµР»РµС„РѕРЅ РёР»Рё email");
      return;
    }

    const visibility = p.rfqVisibility === "company_only" ? "invited" : "open";

    p.setBusy(true);

    const res = await p.supabase.rpc("rfq_create_and_publish", {
      p_request_item_ids: p.pickedIds,
      p_deadline_at: d.toISOString(),

      p_contact_phone: phoneFull,
      p_contact_email: email,
      p_contact_whatsapp: null,

      p_delivery_days: deliveryDays,
      p_radius_km: null,
      p_visibility: visibility,

      p_city: city || null,
      p_lat: null,
      p_lng: null,

      p_address_text: addr || null,
      p_address_place_id: null,

      p_note: p.rfqNote.trim() || null,
    });

    if (res.error) throw res.error;

    const tenderId = res.data;

    p.alert("Р“РѕС‚РѕРІРѕ", `РўРѕСЂРіРё РѕРїСѓР±Р»РёРєРѕРІР°РЅС‹ (${String(tenderId).slice(0, 8)})`);
    p.closeSheet();
  } catch (e: unknown) {
    p.alert("РћС€РёР±РєР°", errMessage(e));
  } finally {
    p.setBusy(false);
  }
}
type SendToAccountingDeps<TApproved extends MaybeId = MaybeId> = {
  acctProposalId: string;

  invNumber: string;
  invDate: string;
  invAmount: string;
  invCurrency: string;
  invFile?: FileLike | null;

  invoiceUploadedName?: string; // РІР°Р¶РЅРѕ РґР»СЏ СѓСЃР»РѕРІРёСЏ "!invoiceUploadedName && invFile"

  // html РїСЂРµРґР»РѕР¶РµРЅРёСЏ -> technical attachment, РЅРµ proposal_pdf
  buildProposalPdfHtml: (pidStr: string) => Promise<string>;

  // РѕСЃРЅРѕРІРЅРѕР№ Р°РґР°РїС‚РµСЂ
  proposalSendToAccountant: (p: ProposalSendToAccountantPayload) => Promise<void>;

  // РІР»РѕР¶РµРЅРёСЏ
  uploadProposalAttachment: (pid: string, file: FileLike, name: string, key: string) => Promise<void>;

  // РіР°СЂР°РЅС‚-С„Р»Р°РіРё (С‚РІРѕСЏ С„СѓРЅРєС†РёСЏ РёР· buyer.tsx)
  ensureAccountingFlags: (pidStr: string, invoiceAmountNum?: number) => Promise<void>;

  // supabase (РґР»СЏ fallback RPC + chk)
  supabase: SupabaseClient;

  // UI
  fetchBuckets: () => Promise<void>;
  closeSheet: () => void;
  setApproved: (fn: (prev: TApproved[]) => TApproved[]) => void;

  setBusy: (v: boolean) => void;
  alert: (t: string, m: string) => void;
  log?: (...args: unknown[]) => void;
};

export async function sendToAccountingAction<TApproved extends MaybeId = MaybeId>(p: SendToAccountingDeps<TApproved>) {
  if (!p.acctProposalId) return;

  // 1) РІР°Р»РёРґР°С†РёСЏ РїРѕР»РµР№ (1:1)
  const amount = Number(String(p.invAmount).replace(",", "."));
  const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(String(p.invDate || "").trim());

  if (!String(p.invNumber || "").trim()) { p.alert("в„– СЃС‡С‘С‚Р°", "РЈРєР°Р¶РёС‚Рµ РЅРѕРјРµСЂ СЃС‡С‘С‚Р°"); return; }
  if (!dateOk) { p.alert("Р”Р°С‚Р° СЃС‡С‘С‚Р°", "Р¤РѕСЂРјР°С‚ YYYY-MM-DD"); return; }
  if (!Number.isFinite(amount) || amount <= 0) { p.alert("РЎСѓРјРјР°", "Р’РІРµРґРёС‚Рµ РїРѕР»РѕР¶РёС‚РµР»СЊРЅСѓСЋ СЃСѓРјРјСѓ"); return; }

  p.setBusy(true);
  const pidStr = String(p.acctProposalId);

  try {
    // 2) РµСЃР»Рё РµС‰С‘ РЅРµ РіСЂСѓР·РёР»Рё РјРіРЅРѕРІРµРЅРЅРѕ вЂ” РїСЂРёРєСЂРµРїРёРј РІС‹Р±СЂР°РЅРЅС‹Р№ С„Р°Р№Р» РєР°Рє invoice (1:1)
    if (!p.invoiceUploadedName && p.invFile) {
      await p.uploadProposalAttachment(
        pidStr,
        p.invFile,
        ((p.invFile as { name?: string | null })?.name ?? "invoice.pdf"),
        "invoice"
      );
    }

    // 3) HTML РїСЂРµРґР»РѕР¶РµРЅРёСЏ (РµСЃР»Рё РµС‰С‘ РЅРµС‚) вЂ” СЃРѕР·РґР°С‘Рј/РѕР±РЅРѕРІР»СЏРµРј (1:1)
    try {
      const html = await p.buildProposalPdfHtml(pidStr);
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      await p.uploadProposalAttachment(
        pidStr,
        blob,
        `proposal_${pidStr.slice(0, 8)}.html`,
        "proposal_html"
      );
    } catch (e: unknown) {
      p.log?.("[buyer] attach proposal doc failed:", errMessage(e));
    }

    // 4) РѕС‚РїСЂР°РІРєР° РІ Р±СѓС…РіР°Р»С‚РµСЂРёСЋ (Р°РґР°РїС‚РµСЂ -> fallback RPC) (1:1)
    try {
      await p.proposalSendToAccountant({
        proposalId: pidStr,
        invoiceNumber: String(p.invNumber).trim(),
        invoiceDate: String(p.invDate).trim(),
        invoiceAmount: amount,
        invoiceCurrency: String(p.invCurrency || "KGS").trim(),
      });
    } catch {
      const { error } = await p.supabase.rpc("proposal_send_to_accountant_min", {
        p_proposal_id: pidStr,
        p_invoice_number: String(p.invNumber).trim(),
        p_invoice_date: String(p.invDate).trim(),
        p_invoice_amount: amount,
        p_invoice_currency: String(p.invCurrency || "KGS").trim(),
      });
      if (error) throw error;
    }

    // вњ… Р“РђР РђРќРў-Р¤Р›РђР“Р (1:1)
    await p.ensureAccountingFlags(pidStr, amount);

    // 5) РєРѕРЅС‚СЂРѕР»СЊ select proposals (1:1)
    const chk = await p.supabase
      .from("proposals")
      .select("payment_status, sent_to_accountant_at")
      .eq("id", pidStr)
      .maybeSingle();
    if (chk.error) throw chk.error;

    // 6) Р»РѕРєР°Р»СЊРЅРѕ СѓР±СЂР°С‚СЊ РёР· approved (1:1) Рё РѕР±РЅРѕРІРёС‚СЊ Р±Р°РєРµС‚С‹
    p.setApproved((prev) => prev.filter((x) => String(x?.id ?? "") !== pidStr));
    await p.fetchBuckets();

    p.alert("Р“РѕС‚РѕРІРѕ", "РЎС‡С‘С‚ РѕС‚РїСЂР°РІР»РµРЅ Р±СѓС…РіР°Р»С‚РµСЂСѓ.");
    p.closeSheet();
  } catch (e: unknown) {
    const msg = errMessage(e);
    p.alert("РћС€РёР±РєР° РѕС‚РїСЂР°РІРєРё", msg);
  } finally {
    p.setBusy(false);
  }
}
// ===================== REWORK (1:1) =====================


export type RwItem = {
  request_item_id: string;
  name_human?: string | null;
  uom?: string | null;
  qty?: number | null;
  price?: string;
  supplier?: string;
  note?: string;
};

function detectReworkSourceSafe(r: ReworkProposalRow | null | undefined): "director" | "accountant" {
  const st = String(r?.status || "").toLowerCase();
  if (st.includes("Р±СѓС…")) return "accountant";
  if (st.includes("РґРёСЂ")) return "director";

  const base = String(
    r?.return_reason || r?.accountant_comment || r?.accountant_note || ""
  ).toLowerCase();

  if (base.includes("Р±СѓС…") || base.includes("account")) return "accountant";
  if (base.includes("РґРёСЂ")) return "director";

  return "director";
}

async function rwPersistItems(supabase: SupabaseClient, pid: string, items: RwItem[]) {
  for (const it of items || []) {
    const upd: { price?: number; supplier?: string | null; note?: string | null } = {};
    const pv = Number(String(it.price ?? "").replace(",", "."));
    if (Number.isFinite(pv) && pv > 0) upd.price = pv;
    if (it.supplier != null) upd.supplier = it.supplier?.trim() || null;
    if (it.note != null) upd.note = it.note?.trim() || null;

    if (!Object.keys(upd).length) continue;

    const q = await supabase
      .from("proposal_items")
      .update(upd)
      .eq("proposal_id", pid)
      .eq("request_item_id", it.request_item_id);

    if (q.error) throw q.error;
  }
}

async function rwEnsureProposalPdf(
  supabase: SupabaseClient,
  pid: string,
  buildProposalPdfHtml: (pidStr: string) => Promise<string>,
  uploadProposalAttachment: (pid: string, file: FileLike, name: string, key: string) => Promise<void>
) {
  try {
    const q = await supabase
      .from("proposal_attachments")
      .select("id")
      .eq("proposal_id", pid)
      .eq("group_key", "proposal_pdf")
      .limit(1);

    if (!q.error && (q.data || []).length) return;

    const html = await buildProposalPdfHtml(pid);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    await uploadProposalAttachment(
      pid,
      blob,
      `proposal_${pid.slice(0, 8)}.html`,
      "proposal_html"
    );
  } catch {
    // 1:1 РЅРµ Р»РѕРјР°РµРј UX
  }
}

type OpenReworkDeps = {
  pid: string;

  supabase: SupabaseClient;

  openReworkSheet: (pid: string) => void;

  // setters (1:1 РєР°Рє РІ buyer.tsx)
  setRwBusy: (v: boolean) => void;
  setRwPid: (v: string | null) => void;
  setRwReason: (v: string) => void;
  setRwItems: (v: RwItem[]) => void;
  setRwInvNumber: (v: string) => void;
  setRwInvDate: (v: string) => void;
  setRwInvAmount: (v: string) => void;
  setRwInvCurrency: (v: string) => void;
  setRwInvFile: (v: FileLike | null) => void;
  setRwInvUploadedName: (v: string) => void;
  setRwSource: (v: "director" | "accountant") => void;

  alert: AlertFn;
};

export async function openReworkAction(p: OpenReworkDeps) {
  p.openReworkSheet(p.pid);
  p.setRwBusy(true);
  p.setRwPid(p.pid);
  p.setRwReason("");
  p.setRwItems([]);
  p.setRwInvNumber("");
  p.setRwInvDate(new Date().toISOString().slice(0, 10));
  p.setRwInvAmount("");
  p.setRwInvCurrency("KGS");
  p.setRwInvFile(null);
  p.setRwInvUploadedName("");

  try {
    // 1) С‡РёС‚Р°РµРј РїРѕР»СЏ Р±РµР·РѕРїР°СЃРЅРѕ (1:1): СЃРЅР°С‡Р°Р»Р° СЂР°СЃС€РёСЂРµРЅРЅРѕ, РїРѕС‚РѕРј fallback
    let r: ReworkProposalRow | null = null;

    try {
      const pr1 = await p.supabase
        .from("proposals")
        .select("status, sent_to_accountant_at, payment_status, invoice_number, redo_source, redo_comment, return_comment, accountant_comment")
        .eq("id", p.pid)
        .maybeSingle();

      if (!pr1.error && pr1.data) r = pr1.data;
      else if (pr1.error) throw pr1.error;
    } catch {
      try {
        const pr2 = await p.supabase
          .from("proposals")
          .select("status, redo_source, redo_comment, return_comment, accountant_comment")
          .eq("id", p.pid)
          .maybeSingle();
        if (!pr2.error && pr2.data) r = pr2.data;
      } catch { }
    }

    // 2) РёСЃС‚РѕС‡РЅРёРє
    const src: "director" | "accountant" =
      r?.redo_source === "accountant" ? "accountant"
        : r?.redo_source === "director" ? "director"
          : detectReworkSourceSafe(r || {});
    p.setRwSource(src);

    // 3) РїСЂРёС‡РёРЅР°
    let base = String(
      r?.redo_comment ??
      r?.return_comment ??
      r?.accountant_comment ??
      ""
    ).trim();

    if (!/РСЃС‚РѕС‡РЅРёРє:/i.test(base)) {
      base = base
        ? `${base}\nРСЃС‚РѕС‡РЅРёРє: ${src === "accountant" ? "Р±СѓС…РіР°Р»С‚РµСЂР°" : "РґРёСЂРµРєС‚РѕСЂР°"}`
        : `РСЃС‚РѕС‡РЅРёРє: ${src === "accountant" ? "Р±СѓС…РіР°Р»С‚РµСЂР°" : "РґРёСЂРµРєС‚РѕСЂР°"}`;
    }
    p.setRwReason(base);

    // 4) СЃС‚СЂРѕРєРё РїСЂРµРґР»РѕР¶РµРЅРёСЏ
    const pi = await p.supabase
      .from("proposal_items")
      .select("request_item_id, price, supplier, note")
      .eq("proposal_id", p.pid);

    const items: ReworkProposalItemRow[] = Array.isArray(pi.data) ? pi.data : [];

    // РёРјРµРЅР°/РµРґРёРЅРёС†С‹/РєРѕР»РёС‡РµСЃС‚РІРѕ РёР· request_items
    const ids = Array.from(new Set(items.map((x) => String(x.request_item_id)).filter(Boolean)));
    const names = new Map<string, RequestItemNameRow>();

    if (ids.length) {
      const ri = await p.supabase
        .from("request_items")
        .select("id, name_human, uom, qty")
        .in("id", ids);

      if (!ri.error && Array.isArray(ri.data)) {
        for (const rr of ri.data) names.set(String(rr.id), rr);
      }
    }

    p.setRwItems(
      items.map((x) => {
        const n = names.get(String(x.request_item_id)) || {};
        return {
          request_item_id: String(x.request_item_id),
          name_human: n.name_human ?? null,
          uom: n.uom ?? null,
          qty: n.qty ?? null,
          price: x.price != null ? String(x.price) : "",
          supplier: x.supplier ?? "",
          note: x.note ?? "",
        } as RwItem;
      })
    );
  } catch (e: unknown) {
    p.alert("РћС€РёР±РєР°", errMessage(e) ?? "РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‚РєСЂС‹С‚СЊ РґРѕСЂР°Р±РѕС‚РєСѓ");
  } finally {
    p.setRwBusy(false);
  }
}

type RwSaveItemsDeps = {
  pid: string;
  items: RwItem[];
  supabase: SupabaseClient;
  setBusy: (v: boolean) => void;
  alert: AlertFn;
};

export async function rwSaveItemsAction(p: RwSaveItemsDeps) {
  p.setBusy(true);
  try {
    await rwPersistItems(p.supabase, p.pid, p.items);
    p.alert("РЎРѕС…СЂР°РЅРµРЅРѕ", "РР·РјРµРЅРµРЅРёСЏ РїРѕ РїРѕР·РёС†РёСЏРј СЃРѕС…СЂР°РЅРµРЅС‹");
  } catch (e: unknown) {
    p.alert("РћС€РёР±РєР° СЃРѕС…СЂР°РЅРµРЅРёСЏ", errMessage(e));
  } finally {
    p.setBusy(false);
  }
}

type RwSendToDirectorDeps<TRejected extends MaybeId = MaybeId> = {
  pid: string;
  items: RwItem[];
  supabase: SupabaseClient;
  proposalSubmit: (pid: string) => Promise<void>;
  fetchBuckets: () => Promise<void>;
  setRejected: (fn: (prev: TRejected[]) => TRejected[]) => void;
  closeSheet: () => void;
  setBusy: (v: boolean) => void;
  alert: AlertFn;
};

export async function rwSendToDirectorAction<TRejected extends MaybeId = MaybeId>(p: RwSendToDirectorDeps<TRejected>) {
  p.setBusy(true);
  try {
    await rwPersistItems(p.supabase, p.pid, p.items);

    await p.supabase
      .from("proposals")
      .update({ payment_status: null, sent_to_accountant_at: null })
      .eq("id", p.pid);

    await p.proposalSubmit(p.pid);

    await p.supabase
      .from("proposals")
      .update({ sent_to_accountant_at: null })
      .eq("id", p.pid);

    await p.fetchBuckets();
    p.setRejected((prev) => prev.filter((x) => String(x?.id ?? "") !== p.pid));

    p.alert("Р“РѕС‚РѕРІРѕ", "РћС‚РїСЂР°РІР»РµРЅРѕ РґРёСЂРµРєС‚РѕСЂСѓ.");
    p.closeSheet();
  } catch (e: unknown) {
    p.alert("РћС€РёР±РєР° РѕС‚РїСЂР°РІРєРё", errMessage(e));
  } finally {
    p.setBusy(false);
  }
}

type RwSendToAccountingDeps<TRejected extends MaybeId = MaybeId> = {
  pid: string;
  items: RwItem[];

  invNumber: string;
  invDate: string;
  invAmount: string;
  invCurrency: string;
  invFile?: FileLike | null;

  supabase: SupabaseClient;

  buildProposalPdfHtml: (pidStr: string) => Promise<string>;
  uploadProposalAttachment: (pid: string, file: FileLike, name: string, key: string) => Promise<void>;

  proposalSendToAccountant: (p: ProposalSendToAccountantPayload) => Promise<void>;

  ensureAccountingFlags: (pidStr: string, invoiceAmountNum?: number) => Promise<void>;

  fetchBuckets: () => Promise<void>;
  setRejected: (fn: (prev: TRejected[]) => TRejected[]) => void;
  closeSheet: () => void;

  setBusy: (v: boolean) => void;
  alert: AlertFn;
};

export async function rwSendToAccountingAction<TRejected extends MaybeId = MaybeId>(p: RwSendToAccountingDeps<TRejected>) {
  const amt = Number(String(p.invAmount).replace(",", "."));
  const dateStr = String(p.invDate || "").trim();
  const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);

  if (!String(p.invNumber || "").trim()) { p.alert("в„– СЃС‡С‘С‚Р°", "РЈРєР°Р¶РёС‚Рµ РЅРѕРјРµСЂ СЃС‡С‘С‚Р°"); return; }
  if (!dateOk) { p.alert("Р”Р°С‚Р° СЃС‡С‘С‚Р°", "Р¤РѕСЂРјР°С‚ YYYY-MM-DD"); return; }
  if (!Number.isFinite(amt) || amt <= 0) { p.alert("РЎСѓРјРјР°", "Р’РІРµРґРёС‚Рµ РїРѕР»РѕР¶РёС‚РµР»СЊРЅСѓСЋ СЃСѓРјРјСѓ"); return; }

  p.setBusy(true);
  try {
    await rwPersistItems(p.supabase, p.pid, p.items);

    if (p.invFile) {
      await p.uploadProposalAttachment(
        p.pid,
        p.invFile,
        ((p.invFile as { name?: string | null })?.name ?? "invoice.pdf"),
        "invoice"
      );
    }

    await rwEnsureProposalPdf(p.supabase, p.pid, p.buildProposalPdfHtml, p.uploadProposalAttachment);

    try {
      await p.proposalSendToAccountant({
        proposalId: p.pid,
        invoiceNumber: String(p.invNumber).trim(),
        invoiceDate: dateStr,
        invoiceAmount: amt,
        invoiceCurrency: String(p.invCurrency || "KGS").trim(),
      });
    } catch {
      const { error } = await p.supabase.rpc("proposal_send_to_accountant_min", {
        p_proposal_id: p.pid,
        p_invoice_number: String(p.invNumber).trim(),
        p_invoice_date: dateStr,
        p_invoice_amount: amt,
        p_invoice_currency: String(p.invCurrency || "KGS").trim(),
      });
      if (error) throw error;
    }

    await p.ensureAccountingFlags(p.pid, amt);

    await p.fetchBuckets();
    p.setRejected((prev) => prev.filter((x) => String(x?.id ?? "") !== p.pid));

    p.alert("Р“РѕС‚РѕРІРѕ", "РћС‚РїСЂР°РІР»РµРЅРѕ Р±СѓС…РіР°Р»С‚РµСЂСѓ.");
    p.closeSheet();
  } catch (e: unknown) {
    p.alert("РћС€РёР±РєР° РѕС‚РїСЂР°РІРєРё", errMessage(e));
  } finally {
    p.setBusy(false);
  }
}
export async function openProposalViewAction(p: OpenProposalViewDeps) {
  p.openPropDetailsSheet(p.pidStr);
  p.setPropViewId(p.pidStr);
  p.setPropViewHead(p.head || null);
  p.setPropViewLines([]);
  p.setPropViewBusy(true);

  try {
    const baseLines: RequestItemViewRow[] = await repoGetProposalItemsForView(p.supabase, p.pidStr);
    const ids = Array.from(new Set(baseLines.map((x) => String(x?.request_item_id || "")).filter(Boolean)));

    let byId: Record<string, RequestItemViewRow> = {};
    if (ids.length) {
      const ri: RequestItemViewRow[] = await repoGetRequestItemsByIds(p.supabase, ids);
      for (const r of ri) byId[String(r.id)] = r;
    }

    const merged = baseLines.map((ln) => {
      const r = byId[String(ln.request_item_id)] || {};
      return {
        ...ln,
        name_human: r.name_human ?? null,
        uom: r.uom ?? null,
        qty: ln.qty ?? r.qty ?? null,
        rik_code: r.rik_code ?? null,
        app_code: r.app_code ?? null,
      };
    });

    p.setPropViewLines(merged);
  } catch (e: unknown) {
    p.log?.("[openProposalViewAction] error:", errMessage(e));
    p.setPropViewLines([]);
  } finally {
    p.setPropViewBusy(false);
  }
}
type PreloadProposalTitlesDeps = {
  proposalIds: string[];

  supabase: SupabaseClient;
  batchResolveRequestLabels: (reqIds: string[]) => Promise<Record<string, string>>;

  // cache + setter
  getExisting: () => Record<string, string>;
  setTitleByPid: (fn: (prev: Record<string, string>) => Record<string, string>) => void;
};

export async function preloadProposalTitlesAction(p: PreloadProposalTitlesDeps) {
  const uniq = Array.from(new Set((p.proposalIds || []).map(String).filter(Boolean)));

  const existing = p.getExisting?.() || {};
  const need = uniq.filter((id) => !existing[id]);
  if (!need.length) return;

  try {
    // 1) proposal_items -> (proposal_id, request_item_id)
    const pi = await repoGetProposalItemLinks(p.supabase, need);

    const links: ProposalItemLinkRow[] = Array.isArray(pi) ? pi : [];
    const reqItemIds = Array.from(
      new Set(links.map((r) => String(r?.request_item_id || "")).filter(Boolean))
    );
    if (!reqItemIds.length) return;

    // 2) request_items -> (id, request_id)
    const ri: RequestItemToRequestRow[] = await repoGetRequestItemToRequestMap(p.supabase, reqItemIds);

    const reqIdByItem: Record<string, string> = {};
    (ri || []).forEach((x) => {
      const k = String(x?.id || "");
      const v = String(x?.request_id || "");
      if (k && v) reqIdByItem[k] = v;
    });

    // 3) build reqIdsByProp
    const reqIdsByProp: Record<string, string[]> = {};
    links.forEach((r) => {
      const pid = String(r?.proposal_id || "");
      const rid = reqIdByItem[String(r?.request_item_id || "")];
      if (!pid || !rid) return;
      (reqIdsByProp[pid] ||= []).push(rid);
    });

    const allReqIds = Array.from(new Set(Object.values(reqIdsByProp).flat()));
    if (!allReqIds.length) return;

    // 4) labels
    let map: Record<string, string> = {};
    try {
      map = await p.batchResolveRequestLabels(allReqIds);
    } catch {
      map = {};
    }

    // 5) titles exactly like Р±С‹Р»Рѕ
    const next: Record<string, string> = {};
    Object.entries(reqIdsByProp).forEach(([pid, rids]) => {
      const uniqReq = Array.from(new Set(rids));
      const labels = uniqReq.map((id) => map?.[id] || (id.length > 8 ? id.slice(0, 8) : id));

      next[pid] =
        labels.length === 1 ? `Р—Р°СЏРІРєР° ${labels[0]}` :
          labels.length === 2 ? `Р—Р°СЏРІРєРё ${labels[0]} + ${labels[1]}` :
            `Р—Р°СЏРІРєРё ${labels[0]} + ${labels[1]} + вЂ¦ (${labels.length})`;
    });

    p.setTitleByPid((prev) => ({ ...prev, ...next }));
  } catch {
    // 1:1 no-op
  }
}
// =====================================
// buyer.actions.ts вЂ” С„РёРЅР°Р»СЊРЅС‹Рµ write ops
// =====================================

export async function setProposalBuyerFioAction(opts: {
  supabase: SupabaseClient;
  propId: string | number;
  typedFio?: string;
  log?: (...a: unknown[]) => void;
}) {
  const { supabase, propId, typedFio, log } = opts;
  try {
    let fio = String(typedFio ?? "").trim();

    if (!fio) {
      const { data } = await supabase.auth.getUser();
      fio =
        (data?.user?.user_metadata?.full_name?.trim()) ||
        (data?.user?.user_metadata?.name?.trim()) ||
        "РЎРЅР°Р±Р¶РµРЅРµС†";
    }

    await repoSetProposalBuyerFio(supabase, propId, fio);
  } catch (e: unknown) {
    (log ?? console.warn)?.("[buyer_fio]", errMessage(e));
  }
}

export async function snapshotProposalItemsAction(opts: {
  supabase: SupabaseClient;
  proposalId: string | number;
  ids: string[];
  rows: BuyerInboxLikeRow[]; // BuyerInboxRow[]
  meta: Record<string, SnapshotMetaRow>;
  log?: (...a: unknown[]) => void;
}) {
  const { supabase, proposalId, ids, rows, meta, log } = opts;

  try {
    const cleanIds = Array.from(new Set((ids || []).map(String).filter(Boolean)));
    if (!cleanIds.length) return;

    // 1) РїС‹С‚Р°РµРјСЃСЏ РІР·СЏС‚СЊ РёР· request_items (РєР°Рє Р±С‹Р»Рѕ)
    let riData: RequestItemViewRow[] = [];
    try {
      const ri = await supabase
        .from("request_items")
        .select("id, name_human, uom, qty, app_code, rik_code")
        .in("id", cleanIds);

      if (!ri.error && Array.isArray(ri.data)) riData = ri.data;
    } catch { }

    // 2) fallback РёР· С‚РµРєСѓС‰РµРіРѕ inbox rows (РєР°Рє Р±С‹Р»Рѕ)
    if (!riData.length) {
      const byId = new Map((rows || []).map((r) => [String(r.request_item_id), r]));
      riData = cleanIds.map((id) => {
        const r: BuyerInboxLikeRow = byId.get(String(id)) || {};
        return {
          id,
          name_human: r?.name_human ?? null,
          uom: r?.uom ?? null,
          qty: r?.qty ?? null,
          app_code: r?.app_code ?? null,
          rik_code: r?.rik_code ?? null,
        };
      });
    }

    const payload: RepoProposalItemUpdate[] = [];

    for (const r of riData) {
      const rid = String(r?.id || "").trim();
      if (!rid) continue;

      const m: SnapshotMetaRow = meta?.[rid] || {};
      const upd: RepoProposalItemUpdate = {
        request_item_id: rid,
        name_human: r?.name_human ?? null,
        uom: r?.uom ?? null,
        qty: r?.qty ?? null,
        app_code: r?.app_code ?? null,
        rik_code: r?.rik_code ?? null,
        // вљ пёЏ supplier РќР• С‚СЂРѕРіР°РµРј вЂ” РєР°Рє Рё Р±С‹Р»Рѕ
      };

      if (m.price != null && String(m.price).trim() !== "") {
        const pv = Number(String(m.price).replace(",", "."));
        if (Number.isFinite(pv)) upd.price = pv;
      }

      if (m.note) upd.note = m.note;

      payload.push(upd);
    }

    await repoUpdateProposalItems(supabase, proposalId, payload);
  } catch (e: unknown) {
    (log ?? console.warn)?.("[snapshotProposalItems]", errMessage(e));
  }
}


