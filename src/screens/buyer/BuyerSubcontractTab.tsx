import React from "react";
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

import { supabase } from "../../lib/supabaseClient";
import { useForemanDicts } from "../foreman/useForemanDicts";
import {
  filterBuyerSubcontractContractorRows,
  firstBuyerSubcontractContractorRow,
  normalizeBuyerSubcontractPhone996 as normalizePhone996,
} from "./buyerSubcontractForm.model";
import { resolveCurrentBuyerSubcontractUserId } from "./BuyerSubcontractTab.auth.transport";
import { BuyerSubcontractTabView } from "./BuyerSubcontractTab.view";
import {
  buildContractorAttachPatch,
} from "./BuyerSubcontractTab.model";
import { useBuyerSubcontractActions } from "./useBuyerSubcontractActions";
import {
  useBuyerSubcontractDataModel,
  type BuyerSubcontractWarningScope,
} from "./useBuyerSubcontractDataModel";
import { useBuyerSubcontractEditorState } from "./useBuyerSubcontractEditorState";

const warnBuyerSubcontract = (
  scope: BuyerSubcontractWarningScope,
  error: unknown,
) => {
  if (__DEV__) {
    console.warn(`[BuyerSubcontractTab] ${scope}:`, error);
  }
};

async function resolveContractorIdByPhone(phoneNormalized: string): Promise<string | null> {
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
}

async function attachContractorIdIfPossible(
  subcontractId: string,
  contractorId: string | null,
): Promise<void> {
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
  } catch (error) {
    warnBuyerSubcontract("contractor_id attach exception", error);
  }
}

type Props = {
  contentTopPad: number;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  buyerFio: string;
};

export default function BuyerSubcontractTab({ contentTopPad, onScroll, buyerFio }: Props) {
  const { objOptions, lvlOptions, sysOptions } = useForemanDicts();
  const dataModel = useBuyerSubcontractDataModel({
    resolveCurrentUserId: resolveCurrentBuyerSubcontractUserId,
    warn: warnBuyerSubcontract,
  });
  const editor = useBuyerSubcontractEditorState();
  const actions = useBuyerSubcontractActions({
    form: editor.form,
    subId: editor.subId,
    buyerFio,
    load: dataModel.load,
    closeForm: editor.closeForm,
    setSubId: editor.setSubId,
    resolveCurrentUserId: resolveCurrentBuyerSubcontractUserId,
    resolveContractorIdByPhone,
    attachContractorIdIfPossible,
  });

  return (
    <BuyerSubcontractTabView
      contentTopPad={contentTopPad}
      onScroll={onScroll}
      showForm={editor.showForm}
      items={dataModel.items}
      loading={dataModel.loading}
      refreshing={dataModel.refreshing}
      loadingMore={dataModel.loadingMore}
      hasMore={dataModel.hasMore}
      form={editor.form}
      subId={editor.subId}
      saving={actions.saving}
      sending={actions.sending}
      dateTarget={editor.dateTarget}
      objOptions={objOptions}
      lvlOptions={lvlOptions}
      sysOptions={sysOptions}
      onChangeForm={editor.setForm}
      onCloseForm={editor.closeForm}
      onOpenForm={editor.openForm}
      onOpenEditableItem={editor.openEditableItem}
      onSetDateTarget={editor.setDateTarget}
      onSave={actions.handleSave}
      onSubmit={actions.handleSubmit}
      onRefresh={dataModel.onRefresh}
      onEndReached={dataModel.onEndReached}
    />
  );
}
