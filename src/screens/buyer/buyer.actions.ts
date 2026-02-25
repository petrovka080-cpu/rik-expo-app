// src/screens/buyer/buyer.actions.ts
import { SUPP_NONE, normName } from "./buyerUtils";
import { repoGetProposalItemsForView, repoGetRequestItemsByIds } from "./buyer.repo";
import { repoGetProposalItemLinks, repoGetRequestItemToRequestMap } from "./buyer.repo";
import {
  repoSetProposalBuyerFio,
  repoUpdateProposalItems,
  type RepoProposalItemUpdate,
} from "./buyer.repo";

type AlertFn = (title: string, message: string) => void;
type OpenProposalViewDeps = {
  pidStr: string;
  head: any;
  supabase: any;

  openPropDetailsSheet: (pid: string) => void;
  setPropViewId: (v: string | null) => void;
  setPropViewHead: (v: any) => void;
  setPropViewLines: (v: any[]) => void;
  setPropViewBusy: (v: boolean) => void;

  log?: (...args: any[]) => void;
};
type ConfirmSendWithoutAttachments = () => Promise<boolean>;

type CreateProposalsDeps = {
  // guards/state
  creating: boolean;
  sendingRef: { current: boolean };

  // data (через refs — как у тебя)
  pickedIds: string[];
  metaNow: Record<string, any>;
  attachmentsNow: Record<string, any>;
  buyerFio: string;

  // ui flags
  needAttachWarn: boolean;
  kbOpen: boolean;

  // validators / confirms
  validatePicked: () => boolean;
  confirmSendWithoutAttachments: ConfirmSendWithoutAttachments;

  // api
  apiCreateProposalsBySupplier: (payload: any[], opts?: any) => Promise<any>;
  supabase: any;
  uploadProposalAttachment: (pid: string, file: any, fileName: string, groupKey: string) => Promise<void>;

  // side-effects in screen
  setAttachments: (v: any) => void;
  removeFromInboxLocally: (ids: string[]) => void;
  clearPick: () => void;
  fetchInbox: () => Promise<void>;
  fetchBuckets: () => Promise<void>;
  setTab: (t: any) => void;
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
  if (ids.length === 0) {
    p.showToast("Выбери позиции");
    p.alert("Пусто", "Выбери позиции");
    return;
  }

  if (p.needAttachWarn && !p.kbOpen) {
    p.setShowAttachBlock(true);
    p.showToast("Вложения не добавлены — можно отправить без них");
  }

  if (!p.validatePicked()) return;

  p.sendingRef.current = true;

  try {
    const okNoAtt = await p.confirmSendWithoutAttachments();
    if (!okNoAtt) return;

    // группируем по поставщику (как было)
    const bySupp = new Map<string, { ids: string[]; display: string }>();
    for (const id of ids) {
      const raw = (p.metaNow?.[id]?.supplier || "").trim();
      const key = normName(raw) || SUPP_NONE;
      const display = raw || SUPP_NONE;
      if (!bySupp.has(key)) bySupp.set(key, { ids: [], display });
      bySupp.get(key)!.ids.push(id);
    }

    const payload = Array.from(bySupp.values()).map((bucket) => {
      const supplierForProposal = bucket.display === SUPP_NONE ? null : bucket.display;
      return {
        supplier: supplierForProposal,
        request_item_ids: bucket.ids,
        meta: bucket.ids.map((id) => ({
          request_item_id: id,
          price: p.metaNow?.[id]?.price ?? null,
          supplier: supplierForProposal,
          note: p.metaNow?.[id]?.note ?? null,
        })),
      };
    });

    const result = await p.apiCreateProposalsBySupplier(payload, {
      buyerFio: (p.buyerFio || "").trim(),
      requestItemStatus: "У директора",
    });

    const created = result?.proposals ?? [];
    if (!created.length) {
      p.alert("Внимание", "Не удалось сформировать предложения");
      return;
    }

    // ✅ прикрепляем supplier_quote (как было)
    try {
      const proposalIds = Array.from(
        new Set(
          (created as any[])
            .map((x: any) => String(x?.proposal_id ?? x?.id ?? "").trim())
            .filter(Boolean)
        )
      );

      if (proposalIds.length) {
        const qProps = await p.supabase
          .from("proposals")
          .select("id, supplier")
          .in("id", proposalIds);

        if (qProps.error) throw qProps.error;

        for (const r of (qProps.data || []) as any[]) {
          const pid = String(r?.id ?? "").trim();
          if (!pid) continue;

          const supplierLabel = String(r?.supplier ?? "").trim() || SUPP_NONE;
          const k = normName(supplierLabel) || SUPP_NONE;

          const att = p.attachmentsNow?.[k];
          if (!att?.file) continue;

          const fileName = String(att.name || `file_${Date.now()}`).trim();
          await p.uploadProposalAttachment(pid, att.file, fileName, "supplier_quote");
        }
      }
    } catch (e: any) {
      p.alert("Вложения", e?.message ?? "Предложения созданы, но вложения не прикрепились.");
    }

    p.setAttachments({});
    const affectedIds = created.flatMap((x: any) => x.request_item_ids);

    try {
      await p.supabase
        .from("request_items")
        .update({ director_reject_note: null, director_reject_at: null })
        .in("id", affectedIds);
    } catch {}

    p.removeFromInboxLocally(affectedIds);
    p.clearPick();

    p.alert("Отправлено", `Создано предложений: ${created.length}`);
    await p.fetchInbox();
    await p.fetchBuckets();
    p.setTab("pending");
    p.closeSheet();
  } catch (e: any) {
    p.alert("Ошибка", e?.message ?? "Не удалось отправить директору");
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

  supabase: any;

  setBusy: (v: boolean) => void;
  closeSheet: () => void;
  alert: (t: string, m: string) => void;
};

export async function publishRfqAction(p: PublishRfqDeps) {
  try {
    if (p.pickedIds.length === 0) {
      p.alert("Пусто", "Выбери позиции для торгов");
      return;
    }

    const d = new Date(p.rfqDeadlineIso);
    if (Number.isNaN(d.getTime())) {
      p.alert("Дедлайн", "Неверная дата");
      return;
    }
    if (d.getTime() < Date.now() + 5 * 60 * 1000) {
      p.alert("Дедлайн", "Поставь минимум +5 минут от текущего времени");
      return;
    }

    const deliveryDays = Number(String(p.rfqDeliveryDays).trim());
    if (!Number.isFinite(deliveryDays) || deliveryDays < 0) {
      p.alert("Срок поставки", "Укажи число дней (0 или больше)");
      return;
    }

    const city = p.rfqCity.trim();
    const addr = p.rfqAddressText.trim();
    if (!city && !addr) {
      p.alert("Место поставки", "Укажи город или адрес");
      return;
    }

    const phoneLocal = String(p.rfqPhone ?? "").replace(/[^\d]/g, "").trim();
    const ccDigits = String(p.rfqCountryCode ?? "+996").replace(/[^\d]/g, "");
    const phoneFull = phoneLocal ? `+${ccDigits}${phoneLocal}` : null;

    const email = String(p.rfqEmail ?? "").trim() || null;

    if (!(phoneFull || email)) {
      p.alert("Контакты", "Укажи телефон или email");
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

    p.alert("Готово", `Торги опубликованы (${String(tenderId).slice(0, 8)})`);
    p.closeSheet();
  } catch (e: any) {
    p.alert("Ошибка", e?.message ?? String(e));
  } finally {
    p.setBusy(false);
  }
}
type SendToAccountingDeps = {
  acctProposalId: string;

  invNumber: string;
  invDate: string;
  invAmount: string;
  invCurrency: string;
  invFile?: any | null;

  invoiceUploadedName?: string; // важно для условия "!invoiceUploadedName && invFile"

  // html предложения -> прикрепить proposal_pdf
  buildProposalPdfHtml: (pidStr: string) => Promise<string>;

  // основной адаптер
  proposalSendToAccountant: (p: {
    proposalId: string;
    invoiceNumber: string;
    invoiceDate: string;
    invoiceAmount: number;
    invoiceCurrency: string;
  }) => Promise<void>;

  // вложения
  uploadProposalAttachment: (pid: string, file: any, name: string, key: string) => Promise<void>;

  // гарант-флаги (твоя функция из buyer.tsx)
  ensureAccountingFlags: (pidStr: string, invoiceAmountNum?: number) => Promise<void>;

  // supabase (для fallback RPC + chk)
  supabase: any;

  // UI
  fetchBuckets: () => Promise<void>;
  closeSheet: () => void;
  setApproved: (fn: (prev: any[]) => any[]) => void;

  setBusy: (v: boolean) => void;
  alert: (t: string, m: string) => void;
  log?: (...args: any[]) => void;
};

export async function sendToAccountingAction(p: SendToAccountingDeps) {
  if (!p.acctProposalId) return;

  // 1) валидация полей (1:1)
  const amount = Number(String(p.invAmount).replace(",", "."));
  const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(String(p.invDate || "").trim());

  if (!String(p.invNumber || "").trim()) { p.alert("№ счёта", "Укажите номер счёта"); return; }
  if (!dateOk) { p.alert("Дата счёта", "Формат YYYY-MM-DD"); return; }
  if (!Number.isFinite(amount) || amount <= 0) { p.alert("Сумма", "Введите положительную сумму"); return; }

  p.setBusy(true);
  const pidStr = String(p.acctProposalId);

  try {
    // 2) если ещё не грузили мгновенно — прикрепим выбранный файл как invoice (1:1)
    if (!p.invoiceUploadedName && p.invFile) {
      await p.uploadProposalAttachment(
        pidStr,
        p.invFile,
        (p.invFile.name ?? "invoice.pdf"),
        "invoice"
      );
    }

    // 3) HTML предложения (если ещё нет) — создаём/обновляем (1:1)
    try {
      const html = await p.buildProposalPdfHtml(pidStr);
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      await p.uploadProposalAttachment(
        pidStr,
        blob as any,
        `proposal_${pidStr.slice(0, 8)}.html`,
        "proposal_pdf"
      );
    } catch (e: any) {
      p.log?.("[buyer] attach proposal doc failed:", e?.message ?? e);
    }

    // 4) отправка в бухгалтерию (адаптер -> fallback RPC) (1:1)
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

    // ✅ ГАРАНТ-ФЛАГИ (1:1)
    await p.ensureAccountingFlags(pidStr, amount);

    // 5) контроль select proposals (1:1)
    const chk = await p.supabase
      .from("proposals")
      .select("payment_status, sent_to_accountant_at")
      .eq("id", pidStr)
      .maybeSingle();
    if (chk.error) throw chk.error;

    // 6) локально убрать из approved (1:1) и обновить бакеты
    p.setApproved((prev) => prev.filter((x) => String((x as any)?.id) !== pidStr));
    await p.fetchBuckets();

    p.alert("Готово", "Счёт отправлен бухгалтеру.");
    p.closeSheet();
  } catch (e: any) {
    const msg = e?.message ?? e?.error_description ?? e?.details ?? String(e);
    p.alert("Ошибка отправки", msg);
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

function detectReworkSourceSafe(r: any): "director" | "accountant" {
  const st = String(r?.status || "").toLowerCase();
  if (st.includes("бух")) return "accountant";
  if (st.includes("дир")) return "director";

  const base = String(
    r?.return_reason || r?.accountant_comment || r?.accountant_note || ""
  ).toLowerCase();

  if (base.includes("бух") || base.includes("account")) return "accountant";
  if (base.includes("дир")) return "director";

  return "director";
}

async function rwPersistItems(supabase: any, pid: string, items: RwItem[]) {
  for (const it of items || []) {
    const upd: any = {};
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
  supabase: any,
  pid: string,
  buildProposalPdfHtml: (pidStr: string) => Promise<string>,
  uploadProposalAttachment: (pid: string, file: any, name: string, key: string) => Promise<void>
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
      blob as any,
      `proposal_${pid.slice(0, 8)}.html`,
      "proposal_pdf"
    );
  } catch {
    // 1:1 не ломаем UX
  }
}

type OpenReworkDeps = {
  pid: string;

  supabase: any;

  openReworkSheet: (pid: string) => void;

  // setters (1:1 как в buyer.tsx)
  setRwBusy: (v: boolean) => void;
  setRwPid: (v: string | null) => void;
  setRwReason: (v: string) => void;
  setRwItems: (v: RwItem[]) => void;
  setRwInvNumber: (v: string) => void;
  setRwInvDate: (v: string) => void;
  setRwInvAmount: (v: string) => void;
  setRwInvCurrency: (v: string) => void;
  setRwInvFile: (v: any) => void;
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
    // 1) читаем поля безопасно (1:1): сначала расширенно, потом fallback
    let r: any = null;

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
      } catch {}
    }

    // 2) источник
    const src: "director" | "accountant" =
      r?.redo_source === "accountant" ? "accountant"
      : r?.redo_source === "director" ? "director"
      : detectReworkSourceSafe(r || {});
    p.setRwSource(src);

    // 3) причина
    let base = String(
      r?.redo_comment ??
      r?.return_comment ??
      r?.accountant_comment ??
      ""
    ).trim();

    if (!/Источник:/i.test(base)) {
      base = base
        ? `${base}\nИсточник: ${src === "accountant" ? "бухгалтера" : "директора"}`
        : `Источник: ${src === "accountant" ? "бухгалтера" : "директора"}`;
    }
    p.setRwReason(base);

    // 4) строки предложения
    const pi = await p.supabase
      .from("proposal_items")
      .select("request_item_id, price, supplier, note")
      .eq("proposal_id", p.pid);

    const items = Array.isArray(pi.data) ? (pi.data as any[]) : [];

    // имена/единицы/количество из request_items
    const ids = Array.from(new Set(items.map((x) => String(x.request_item_id)).filter(Boolean)));
    const names = new Map<string, any>();

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
  } catch (e: any) {
    p.alert("Ошибка", e?.message ?? "Не удалось открыть доработку");
  } finally {
    p.setRwBusy(false);
  }
}

type RwSaveItemsDeps = {
  pid: string;
  items: RwItem[];
  supabase: any;
  setBusy: (v: boolean) => void;
  alert: AlertFn;
};

export async function rwSaveItemsAction(p: RwSaveItemsDeps) {
  p.setBusy(true);
  try {
    await rwPersistItems(p.supabase, p.pid, p.items);
    p.alert("Сохранено", "Изменения по позициям сохранены");
  } catch (e: any) {
    p.alert("Ошибка сохранения", e?.message ?? String(e));
  } finally {
    p.setBusy(false);
  }
}

type RwSendToDirectorDeps = {
  pid: string;
  items: RwItem[];
  supabase: any;
  proposalSubmit: (pid: any) => Promise<void>;
  fetchBuckets: () => Promise<void>;
  setRejected: (fn: (prev: any[]) => any[]) => void;
  closeSheet: () => void;
  setBusy: (v: boolean) => void;
  alert: AlertFn;
};

export async function rwSendToDirectorAction(p: RwSendToDirectorDeps) {
  p.setBusy(true);
  try {
    await rwPersistItems(p.supabase, p.pid, p.items);

    await p.supabase
      .from("proposals")
      .update({ payment_status: null, sent_to_accountant_at: null })
      .eq("id", p.pid);

    await p.proposalSubmit(p.pid as any);

    await p.supabase
      .from("proposals")
      .update({ sent_to_accountant_at: null })
      .eq("id", p.pid);

    await p.fetchBuckets();
    p.setRejected((prev) => prev.filter((x) => String((x as any)?.id) !== p.pid));

    p.alert("Готово", "Отправлено директору.");
    p.closeSheet();
  } catch (e: any) {
    p.alert("Ошибка отправки", e?.message ?? String(e));
  } finally {
    p.setBusy(false);
  }
}

type RwSendToAccountingDeps = {
  pid: string;
  items: RwItem[];

  invNumber: string;
  invDate: string;
  invAmount: string;
  invCurrency: string;
  invFile?: any | null;

  supabase: any;

  buildProposalPdfHtml: (pidStr: string) => Promise<string>;
  uploadProposalAttachment: (pid: string, file: any, name: string, key: string) => Promise<void>;

  proposalSendToAccountant: (p: any) => Promise<void>;

  ensureAccountingFlags: (pidStr: string, invoiceAmountNum?: number) => Promise<void>;

  fetchBuckets: () => Promise<void>;
  setRejected: (fn: (prev: any[]) => any[]) => void;
  closeSheet: () => void;

  setBusy: (v: boolean) => void;
  alert: AlertFn;
};

export async function rwSendToAccountingAction(p: RwSendToAccountingDeps) {
  const amt = Number(String(p.invAmount).replace(",", "."));
  const dateStr = String(p.invDate || "").trim();
  const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);

  if (!String(p.invNumber || "").trim()) { p.alert("№ счёта", "Укажите номер счёта"); return; }
  if (!dateOk) { p.alert("Дата счёта", "Формат YYYY-MM-DD"); return; }
  if (!Number.isFinite(amt) || amt <= 0) { p.alert("Сумма", "Введите положительную сумму"); return; }

  p.setBusy(true);
  try {
    await rwPersistItems(p.supabase, p.pid, p.items);

    if (p.invFile) {
      await p.uploadProposalAttachment(
        p.pid,
        p.invFile,
        (p.invFile.name ?? "invoice.pdf"),
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
    p.setRejected((prev) => prev.filter((x) => String((x as any)?.id) !== p.pid));

    p.alert("Готово", "Отправлено бухгалтеру.");
    p.closeSheet();
  } catch (e: any) {
    p.alert("Ошибка отправки", e?.message ?? String(e));
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
    const baseLines = await repoGetProposalItemsForView(p.supabase, p.pidStr);
    const ids = Array.from(new Set(baseLines.map((x: any) => String(x?.request_item_id || "")).filter(Boolean)));

    let byId: Record<string, any> = {};
    if (ids.length) {
    // @ts-ignore
      const ri = await repoGetRequestItemsByIds(p.supabase, ids);
      for (const r of ri as any[]) byId[String(r.id)] = r;
    }

    const merged = baseLines.map((ln: any) => {
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
  } catch (e: any) {
    p.log?.("[openProposalViewAction] error:", e?.message ?? e);
    p.setPropViewLines([]);
  } finally {
    p.setPropViewBusy(false);
  }
}
type PreloadProposalTitlesDeps = {
  proposalIds: string[];

  supabase: any;
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

    const reqItemIds = Array.from(
      new Set((pi || []).map((r: any) => String(r?.request_item_id || "")).filter(Boolean))
    );
    if (!reqItemIds.length) return;

    // 2) request_items -> (id, request_id)
    // @ts-ignore
    const ri = await repoGetRequestItemToRequestMap(p.supabase, reqItemIds);

    const reqIdByItem: Record<string, string> = {};
    (ri || []).forEach((x: any) => {
      const k = String(x?.id || "");
      const v = String(x?.request_id || "");
      if (k && v) reqIdByItem[k] = v;
    });

    // 3) build reqIdsByProp
    const reqIdsByProp: Record<string, string[]> = {};
    (pi || []).forEach((r: any) => {
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

    // 5) titles exactly like было
    const next: Record<string, string> = {};
    Object.entries(reqIdsByProp).forEach(([pid, rids]) => {
      const uniqReq = Array.from(new Set(rids));
      const labels = uniqReq.map((id) => map?.[id] || (id.length > 8 ? id.slice(0, 8) : id));

      next[pid] =
        labels.length === 1 ? `Заявка ${labels[0]}` :
        labels.length === 2 ? `Заявки ${labels[0]} + ${labels[1]}` :
        `Заявки ${labels[0]} + ${labels[1]} + … (${labels.length})`;
    });

    p.setTitleByPid((prev) => ({ ...prev, ...next }));
  } catch {
    // 1:1 no-op
  }
}
// =====================================
// buyer.actions.ts — финальные write ops
// =====================================

export async function setProposalBuyerFioAction(opts: {
  supabase: any;
  propId: string | number;
  typedFio?: string;
  log?: (...a: any[]) => void;
}) {
  const { supabase, propId, typedFio, log } = opts;
  try {
    let fio = String(typedFio ?? "").trim();

    if (!fio) {
      const { data } = await supabase.auth.getUser();
      fio =
        (data?.user?.user_metadata?.full_name?.trim()) ||
        (data?.user?.user_metadata?.name?.trim()) ||
        "Снабженец";
    }

    await repoSetProposalBuyerFio(supabase, propId, fio);
  } catch (e: any) {
    (log ?? console.warn)?.("[buyer_fio]", e?.message ?? e);
  }
}

export async function snapshotProposalItemsAction(opts: {
  supabase: any;
  proposalId: string | number;
  ids: string[];
  rows: any[]; // BuyerInboxRow[]
  meta: Record<string, { price?: string; note?: string }>;
  log?: (...a: any[]) => void;
}) {
  const { supabase, proposalId, ids, rows, meta, log } = opts;

  try {
    const cleanIds = Array.from(new Set((ids || []).map(String).filter(Boolean)));
    if (!cleanIds.length) return;

    // 1) пытаемся взять из request_items (как было)
    let riData: any[] = [];
    try {
      const ri = await supabase
        .from("request_items")
        .select("id, name_human, uom, qty, app_code, rik_code")
        .in("id", cleanIds);

      if (!ri.error && Array.isArray(ri.data)) riData = ri.data;
    } catch {}

    // 2) fallback из текущего inbox rows (как было)
    if (!riData.length) {
      const byId = new Map((rows || []).map((r: any) => [String(r.request_item_id), r]));
      riData = cleanIds.map((id) => {
        const r: any = byId.get(String(id)) || {};
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

      const m: any = meta?.[rid] || {};
      const upd: RepoProposalItemUpdate = {
        request_item_id: rid,
        name_human: r?.name_human ?? null,
        uom: r?.uom ?? null,
        qty: r?.qty ?? null,
        app_code: r?.app_code ?? null,
        rik_code: r?.rik_code ?? null,
        // ⚠️ supplier НЕ трогаем — как и было
      };

      if (m.price != null && String(m.price).trim() !== "") {
        const pv = Number(String(m.price).replace(",", "."));
        if (Number.isFinite(pv)) upd.price = pv;
      }

      if (m.note) upd.note = m.note;

      payload.push(upd);
    }

    await repoUpdateProposalItems(supabase, proposalId, payload);
  } catch (e: any) {
    (log ?? console.warn)?.("[snapshotProposalItems]", e?.message ?? e);
  }
}
