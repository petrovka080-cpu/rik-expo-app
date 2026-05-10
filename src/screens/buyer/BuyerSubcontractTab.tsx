import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

import { supabase } from "../../lib/supabaseClient";
import type { Database } from "../../lib/database.types";
import { useForemanDicts } from "../foreman/useForemanDicts";
import {
  BUYER_SUBCONTRACT_EMPTY_FORM as EMPTY_FORM,
  buyerSubcontractToNum as toNum,
  filterBuyerSubcontractContractorRows,
  firstBuyerSubcontractContractorRow,
  getBuyerSubcontractErrorText as errText,
  normalizeBuyerSubcontractInn as normalizeInn,
  normalizeBuyerSubcontractPhone996 as normalizePhone996,
  toBuyerSubcontractPriceType,
  toBuyerSubcontractWorkMode,
  type BuyerSubcontractFormState as FormState,
} from "./buyerSubcontractForm.model";
import { resolveCurrentBuyerSubcontractUserId } from "./BuyerSubcontractTab.auth.transport";
import {
  BuyerSubcontractTabView,
  type BuyerSubcontractDateTarget,
} from "./BuyerSubcontractTab.view";
import {
  SUBCONTRACT_DEFAULT_PAGE_SIZE,
  createSubcontractDraftWithPatch,
  listForemanSubcontractsPage,
  mergeSubcontractPages,
  submitSubcontract,
  updateSubcontract,
  type Subcontract,
} from "../subcontracts/subcontracts.shared";

type SubcontractUpdate = Database["public"]["Tables"]["subcontracts"]["Update"];
type ContractorAttachPatch = SubcontractUpdate & { contractor_id: string };

const buildContractorAttachPatch = (contractorId: string): ContractorAttachPatch => ({
  contractor_id: contractorId,
});

const buildBuyerSubcontractPatch = (form: FormState, buyerFio: string): Partial<Subcontract> => {
  const phoneNormalized = normalizePhone996(form.contractorPhone);
  const innNormalized = normalizeInn(form.contractorInn);

  return {
    foreman_name: form.foremanName.trim() || buyerFio || "\u0421\u043d\u0430\u0431\u0436\u0435\u043d\u0435\u0446",
    contractor_org: form.contractorOrg.trim() || null,
    contractor_inn: innNormalized || null,
    contractor_rep: form.contractorRep.trim() || null,
    contractor_phone: phoneNormalized || null,
    contract_number: form.contractNumber.trim() || null,
    contract_date: form.contractDate || null,
    object_name: form.objectName || null,
    work_zone: form.workZone || null,
    work_type: form.workType || null,
    qty_planned: toNum(form.qtyPlanned),
    uom: form.uom || null,
    date_start: form.dateStart || null,
    date_end: form.dateEnd || null,
    work_mode: toBuyerSubcontractWorkMode(form.workMode),
    price_per_unit: toNum(form.pricePerUnit),
    total_price: toNum(form.totalPrice),
    price_type: toBuyerSubcontractPriceType(form.priceType),
    foreman_comment: form.foremanComment.trim() || null,
  };
};

const warnBuyerSubcontract = (
  scope: "load error" | "contractor_id attach skipped" | "contractor_id attach exception",
  error: unknown,
) => {
  if (__DEV__) {
    console.warn(`[BuyerSubcontractTab] ${scope}:`, error);
  }
};

type Props = {
  contentTopPad: number;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  buyerFio: string;
};

export default function BuyerSubcontractTab({ contentTopPad, onScroll, buyerFio }: Props) {
  const [items, setItems] = useState<Subcontract[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [subId, setSubId] = useState("");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [dateTarget, setDateTarget] = useState<BuyerSubcontractDateTarget | null>(null);
  const nextOffsetRef = useRef(0);
  const loadSeqRef = useRef(0);
  const loadingRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(false);

  const { objOptions, lvlOptions, sysOptions } = useForemanDicts();

  const load = useCallback(async (options?: { reset?: boolean }) => {
    const reset = options?.reset !== false;
    const offset = reset ? 0 : nextOffsetRef.current;
    const seq = ++loadSeqRef.current;
    if (!reset && (loadingRef.current || loadingMoreRef.current || !hasMoreRef.current)) return;
    if (reset) {
      loadingRef.current = true;
      setLoading(true);
    } else {
      loadingMoreRef.current = true;
      setLoadingMore(true);
    }
    try {
      const uid = await resolveCurrentBuyerSubcontractUserId();
      if (!uid) return;
      const page = await listForemanSubcontractsPage(uid, {
        offset,
        pageSize: SUBCONTRACT_DEFAULT_PAGE_SIZE,
      });
      if (seq !== loadSeqRef.current) return;
      nextOffsetRef.current = page.nextOffset ?? offset;
      hasMoreRef.current = page.hasMore;
      setHasMore(page.hasMore);
      setItems((current) => (reset ? page.items : mergeSubcontractPages(current, page.items)));
    } catch (e) {
      warnBuyerSubcontract("load error", e);
    } finally {
      if (seq === loadSeqRef.current) {
        if (reset) {
          loadingRef.current = false;
          setLoading(false);
        } else {
          loadingMoreRef.current = false;
          setLoadingMore(false);
        }
      }
    }
  }, []);

  useEffect(() => {
    void load({ reset: true });
  }, [load]);

  useEffect(() => {
    const qty = toNum(form.qtyPlanned);
    const ppu = toNum(form.pricePerUnit);
    if (qty != null && ppu != null && qty > 0 && ppu > 0) {
      setForm((prev) => ({ ...prev, totalPrice: String(qty * ppu) }));
      return;
    }
    setForm((prev) => ({ ...prev, totalPrice: "" }));
  }, [form.qtyPlanned, form.pricePerUnit]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load({ reset: true });
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const onEndReached = useCallback(() => {
    void load({ reset: false });
  }, [load]);

  const resolveContractorIdByPhone = useCallback(async (phoneNormalized: string): Promise<string | null> => {
    const pn = normalizePhone996(phoneNormalized);
    if (!pn) return null;

    const direct = await supabase
      .from("contractors")
      .select("id, phone")
      .eq("phone", pn)
      .limit(1);
    if (!direct.error && Array.isArray(direct.data) && direct.data.length > 0) {
      const first = firstBuyerSubcontractContractorRow(direct.data);
      return String(first?.id ?? "").trim() || null;
    }

    const tail = pn.slice(-9);
    if (!tail) return null;
    const fallback = await supabase
      .from("contractors")
      .select("id, phone")
      .ilike("phone", `%${tail}`)
      .limit(20);
    if (fallback.error || !Array.isArray(fallback.data)) return null;
    const rows = filterBuyerSubcontractContractorRows(fallback.data);
    const matched = rows.find((row) => normalizePhone996(String(row?.phone || "")) === pn);
    return matched ? String(matched.id ?? "").trim() || null : null;
  }, []);

  const attachContractorIdIfPossible = useCallback(async (subcontractId: string, contractorId: string | null) => {
    const sid = String(subcontractId || "").trim();
    const cid = String(contractorId || "").trim();
    if (!sid || !cid) return;
    try {
      const upd = await supabase
        .from("subcontracts")
        .update(buildContractorAttachPatch(cid))
        .eq("id", sid);
      if (upd.error && __DEV__) {
        warnBuyerSubcontract("contractor_id attach skipped", upd.error.message);
      }
    } catch (e) {
      warnBuyerSubcontract("contractor_id attach exception", e);
    }
  }, []);

  const closeForm = useCallback(() => {
    setShowForm(false);
    setSubId("");
    setForm(EMPTY_FORM);
    setDateTarget(null);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const uid = await resolveCurrentBuyerSubcontractUserId();
      if (!uid) throw new Error("Пользователь не авторизован");
      const patch = buildBuyerSubcontractPatch(form, buyerFio);
      const contractorId = await resolveContractorIdByPhone(String(patch.contractor_phone || ""));

      if (!subId) {
        const row = await createSubcontractDraftWithPatch(
          uid,
          form.foremanName.trim() || buyerFio || "Снабженец",
          patch,
        );
        await attachContractorIdIfPossible(row.id, contractorId);
        setSubId(row.id);
      } else {
        await updateSubcontract(subId, patch);
        await attachContractorIdIfPossible(subId, contractorId);
      }

      Alert.alert("Черновик сохранён");
      await load({ reset: true });
    } catch (e) {
      Alert.alert("Ошибка сохранения", errText(e, "Не удалось сохранить черновик"));
    } finally {
      setSaving(false);
    }
  }, [subId, form, buyerFio, load, resolveContractorIdByPhone, attachContractorIdIfPossible]);

  const handleSubmit = useCallback(async () => {
    setSending(true);
    try {
      const uid = await resolveCurrentBuyerSubcontractUserId();
      if (!uid) throw new Error("Пользователь не авторизован");
      const patch = buildBuyerSubcontractPatch(form, buyerFio);
      const contractorId = await resolveContractorIdByPhone(String(patch.contractor_phone || ""));

      let activeId = subId;
      if (!activeId) {
        const row = await createSubcontractDraftWithPatch(
          uid,
          form.foremanName.trim() || buyerFio || "Снабженец",
          patch,
        );
        activeId = row.id;
        await attachContractorIdIfPossible(activeId, contractorId);
      } else {
        await updateSubcontract(activeId, patch);
        await attachContractorIdIfPossible(activeId, contractorId);
      }

      await submitSubcontract(activeId);
      Alert.alert("Отправлено директору");
      closeForm();
      await load({ reset: true });
    } catch (e) {
      Alert.alert("Ошибка отправки", errText(e, "Не удалось отправить директору"));
    } finally {
      setSending(false);
    }
  }, [subId, form, buyerFio, closeForm, load, resolveContractorIdByPhone, attachContractorIdIfPossible]);

  const openEditableItem = (item: Subcontract) => {
    setSubId(item.id);
    setForm({
      contractorOrg: item.contractor_org || "",
      contractorInn: item.contractor_inn || "",
      contractorRep: item.contractor_rep || "",
      contractorPhone: item.contractor_phone || "",
      foremanName: item.foreman_name || "",
      contractNumber: item.contract_number || "",
      contractDate: item.contract_date || "",
      objectName: item.object_name || "",
      workZone: item.work_zone || "",
      workType: item.work_type || "",
      qtyPlanned: item.qty_planned != null ? String(item.qty_planned) : "",
      uom: item.uom || "",
      dateStart: item.date_start || "",
      dateEnd: item.date_end || "",
      workMode: item.work_mode || "",
      pricePerUnit: item.price_per_unit != null ? String(item.price_per_unit) : "",
      totalPrice: item.total_price != null ? String(item.total_price) : "",
      priceType: item.price_type || "",
      foremanComment: item.foreman_comment || "",
    });
    setShowForm(true);
  };

  return (
    <BuyerSubcontractTabView
      contentTopPad={contentTopPad}
      onScroll={onScroll}
      showForm={showForm}
      items={items}
      loading={loading}
      refreshing={refreshing}
      loadingMore={loadingMore}
      hasMore={hasMore}
      form={form}
      subId={subId}
      saving={saving}
      sending={sending}
      dateTarget={dateTarget}
      objOptions={objOptions}
      lvlOptions={lvlOptions}
      sysOptions={sysOptions}
      onChangeForm={setForm}
      onCloseForm={closeForm}
      onOpenForm={() => setShowForm(true)}
      onOpenEditableItem={openEditableItem}
      onSetDateTarget={setDateTarget}
      onSave={handleSave}
      onSubmit={handleSubmit}
      onRefresh={onRefresh}
      onEndReached={onEndReached}
    />
  );
}
