import type { Database } from "../../lib/database.types";
import {
  BUYER_SUBCONTRACT_EMPTY_FORM,
  buyerSubcontractToNum as toNum,
  normalizeBuyerSubcontractInn as normalizeInn,
  normalizeBuyerSubcontractPhone996 as normalizePhone996,
  toBuyerSubcontractPriceType,
  toBuyerSubcontractWorkMode,
  type BuyerSubcontractFormState as FormState,
} from "./buyerSubcontractForm.model";
import type { Subcontract } from "../subcontracts/subcontracts.shared";

type SubcontractUpdate = Database["public"]["Tables"]["subcontracts"]["Update"];
export type ContractorAttachPatch = SubcontractUpdate & { contractor_id: string };

export type BuyerSubcontractDateTarget = "dateStart" | "dateEnd" | "contractDate";

export const buildContractorAttachPatch = (contractorId: string): ContractorAttachPatch => ({
  contractor_id: contractorId,
});

export const buildBuyerSubcontractPatch = (
  form: FormState,
  buyerFio: string,
): Partial<Subcontract> => {
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

export const buyerSubcontractToFormState = (item: Subcontract): FormState => ({
  ...BUYER_SUBCONTRACT_EMPTY_FORM,
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
