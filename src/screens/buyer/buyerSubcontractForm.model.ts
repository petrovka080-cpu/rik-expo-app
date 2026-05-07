import type { SubcontractPriceType, SubcontractWorkMode } from "../subcontracts/subcontracts.shared";

export type BuyerSubcontractFormState = {
  contractorOrg: string;
  contractorInn: string;
  contractorRep: string;
  contractorPhone: string;
  foremanName: string;
  contractNumber: string;
  contractDate: string;
  objectName: string;
  workZone: string;
  workType: string;
  qtyPlanned: string;
  uom: string;
  dateStart: string;
  dateEnd: string;
  workMode: SubcontractWorkMode | "";
  pricePerUnit: string;
  totalPrice: string;
  priceType: SubcontractPriceType | "";
  foremanComment: string;
};

export type BuyerSubcontractContractorRow = { id?: string | null; phone?: string | null };

export const BUYER_SUBCONTRACT_EMPTY_FORM: BuyerSubcontractFormState = {
  contractorOrg: "",
  contractorInn: "",
  contractorRep: "",
  contractorPhone: "",
  foremanName: "",
  contractNumber: "",
  contractDate: "",
  objectName: "",
  workZone: "",
  workType: "",
  qtyPlanned: "",
  uom: "",
  dateStart: "",
  dateEnd: "",
  workMode: "",
  pricePerUnit: "",
  totalPrice: "",
  priceType: "",
  foremanComment: "",
};

export type BuyerSubcontractUomOption = { code: string; name: string };

export const BUYER_SUBCONTRACT_UOM_OPTIONS: BuyerSubcontractUomOption[] = [
  { code: "шт", name: "шт" },
  { code: "м", name: "м" },
  { code: "м2", name: "м2" },
  { code: "м3", name: "м3" },
  { code: "кг", name: "кг" },
  { code: "т", name: "т" },
  { code: "компл", name: "компл" },
  { code: "смена", name: "смена" },
  { code: "час", name: "час" },
];

export const buyerSubcontractToNum = (v: string): number | null => {
  const n = Number(String(v || "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export const normalizeBuyerSubcontractPhone996 = (value: string): string => {
  const digits = String(value || "").replace(/\D+/g, "");
  if (!digits) return "";
  if (digits.startsWith("996") && digits.length >= 12) return digits.slice(0, 12);
  if (digits.startsWith("0") && digits.length >= 10) return `996${digits.slice(-9)}`;
  if (digits.length === 9) return `996${digits}`;
  if (digits.length > 9) return `996${digits.slice(-9)}`;
  return digits;
};

export const normalizeBuyerSubcontractInn = (value: string): string => String(value || "").replace(/\D+/g, "");

export const getBuyerSubcontractErrorText = (e: unknown, fallback: string): string => {
  if (e instanceof Error && e.message.trim()) return e.message.trim();
  return fallback;
};
