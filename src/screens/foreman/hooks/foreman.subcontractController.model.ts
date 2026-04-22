import type { ReqItemRow, RequestMetaPatch } from "../../../lib/catalog_api";
import type { RequestDraftSyncLineInput } from "../foreman.draftSync.repository";
import {
  fmtAmount,
  type Subcontract,
  type SubcontractPriceType,
  type SubcontractWorkMode,
} from "../../subcontracts/subcontracts.shared";
import type { SubcontractFlowScreen } from "../foremanSubcontractUi.store";

export type DictOption = {
  code: string;
  name: string;
};

export type FormState = {
  contractorOrg: string;
  contractorRep: string;
  contractorPhone: string;
  contractNumber: string;
  contractDate: string;
  objectCode: string;
  levelCode: string;
  systemCode: string;
  zoneText: string;
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

export type CalcPickedRow = {
  rik_code?: string | null;
  item_name_ru?: string | null;
  name_human?: string | null;
  qty?: string | number | null;
  uom_code?: string | null;
};

export const EMPTY_FORM: FormState = {
  contractorOrg: "",
  contractorRep: "",
  contractorPhone: "",
  contractNumber: "",
  contractDate: "",
  objectCode: "",
  levelCode: "",
  systemCode: "",
  zoneText: "",
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

export const trim = (value: unknown) => String(value ?? "").trim();

export const toNum = (value: string) => {
  const parsed = Number(String(value || "").trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
};

export const toIso = (value: string) => {
  const normalized = String(value || "").trim();
  if (!normalized) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
};

export const pickName = (options: { code?: string; name?: string }[], code: string) => {
  const normalizedCode = trim(code);
  if (!normalizedCode) return "";

  const option = (options || []).find((candidate) => String(candidate?.code || "") === normalizedCode);
  return String(option?.name || normalizedCode);
};

export const resolveCodeOrName = (options: DictOption[], raw: string | null | undefined) => {
  const value = trim(raw);
  if (!value) return "";

  const byCode = options.find((option) => trim(option.code) === value);
  if (byCode?.name) return trim(byCode.name);

  const byName = options.find((option) => trim(option.name) === value);
  if (byName?.name) return trim(byName.name);

  return value;
};

export const resolveCodeFromDict = (options: DictOption[], raw: string | null | undefined) => {
  const value = trim(raw);
  if (!value) return "";

  const byCode = options.find((option) => trim(option.code) === value);
  if (byCode?.code) return trim(byCode.code);

  const byName = options.find((option) => trim(option.name) === value);
  if (byName?.code) return trim(byName.code);

  return "";
};

export const buildDraftScopeKey = (form: FormState, templateId?: string | null) =>
  [
    templateId || "",
    form.objectCode.trim(),
    form.levelCode.trim(),
    form.systemCode.trim(),
    form.zoneText.trim(),
    form.contractorOrg.trim(),
    form.contractNumber.trim(),
  ].join("|");

export const isCancelledDraftRow = (status?: string | null) => {
  const normalized = trim(status).toLowerCase();
  return normalized === "cancelled" || normalized === "canceled";
};

export const filterActiveDraftItems = (rows: ReqItemRow[] | null | undefined): ReqItemRow[] =>
  (rows || []).filter((row) => !isCancelledDraftRow(row.status));

export const makeLocalDraftRowId = () => `local:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;

export const toPositiveQty = (value: unknown, fallback = 1) => {
  const parsed = Number(trim(value).replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const toRemoteDraftItemId = (value: unknown): string | null => {
  const id = trim(value);
  if (!id || id.startsWith("local:")) return null;
  return id;
};

const cloneDraftItem = (item: ReqItemRow): ReqItemRow => ({
  ...item,
  id: trim(item.id),
  request_id: trim(item.request_id),
  rik_code: trim(item.rik_code) || null,
  name_human: trim(item.name_human) || "—",
  qty: Number(item.qty ?? 0) || 0,
  uom: trim(item.uom) || null,
  status: item.status ?? null,
  supplier_hint: item.supplier_hint ?? null,
  app_code: item.app_code ?? null,
  note: item.note ?? null,
  line_no: Number.isFinite(Number(item.line_no)) ? Number(item.line_no) : null,
});

const buildDraftMergeKey = (rikCode?: string | null, uom?: string | null) =>
  `${trim(rikCode).toLowerCase()}::${trim(uom).toLowerCase()}`;

export const appendLineInputsToDraftItems = (
  currentItems: ReqItemRow[],
  addRows: RequestDraftSyncLineInput[],
  requestId: string,
): ReqItemRow[] => {
  const nextItems = currentItems.map(cloneDraftItem);

  for (const row of addRows) {
    const rikCode = trim(row.rik_code);
    const qty = Number(row.qty ?? 0);
    if (!rikCode || !Number.isFinite(qty) || qty <= 0) continue;

    const existing = nextItems.find(
      (item) => buildDraftMergeKey(item.rik_code, item.uom) === buildDraftMergeKey(rikCode, row.uom),
    );

    if (existing) {
      existing.qty = Number(existing.qty ?? 0) + qty;
      if (row.note !== undefined) existing.note = row.note ?? null;
      if (row.name_human) existing.name_human = row.name_human;
      if (row.uom !== undefined) existing.uom = row.uom ?? null;
      if (row.app_code !== undefined) existing.app_code = row.app_code ?? null;
      existing.status = existing.status ?? "Черновик";
      continue;
    }

    nextItems.push({
      id: makeLocalDraftRowId(),
      request_id: trim(requestId),
      rik_code: rikCode,
      name_human: trim(row.name_human) || rikCode,
      qty,
      uom: trim(row.uom) || null,
      status: "Черновик",
      supplier_hint: null,
      app_code: row.app_code ?? null,
      note: row.note ?? null,
      line_no: nextItems.length + 1,
    });
  }

  return nextItems.map((item, index) => ({
    ...item,
    request_id: trim(item.request_id) || trim(requestId),
    line_no: index + 1,
  }));
};

export type DerivedSubcontractControllerModel = {
  templateContract: Subcontract | null;
  objectName: string;
  levelName: string;
  systemName: string;
  zoneName: string;
  templateObjectName: string;
  templateLevelName: string;
  templateSystemName: string;
  templateObjectCode: string;
  templateLevelCode: string;
  templateSystemCode: string;
  subcontractDetailsVisible: boolean;
  draftOpen: boolean;
  catalogVisible: boolean;
  workTypePickerVisible: boolean;
  calcVisible: boolean;
  scopeNote: string;
  requestMetaFromTemplate: RequestMetaPatch;
  requestMetaPersistPatch: RequestMetaPatch;
  approvedContracts: Subcontract[];
  contractorName: string;
  phoneName: string;
  volumeText: string;
};

type DeriveModelParams = {
  history: Subcontract[];
  selectedTemplateId: string | null;
  dicts: {
    objOptions: DictOption[];
    lvlOptions: DictOption[];
    sysOptions: DictOption[];
  };
  form: FormState;
  subcontractFlowOpen: boolean;
  subcontractFlowScreen: SubcontractFlowScreen;
  foremanName: string;
};

export function deriveSubcontractControllerModel(params: DeriveModelParams): DerivedSubcontractControllerModel {
  const {
    history,
    selectedTemplateId,
    dicts,
    form,
    subcontractFlowOpen,
    subcontractFlowScreen,
    foremanName,
  } = params;

  const templateContract =
    history.find((row) => trim(row.id) === trim(selectedTemplateId)) ?? null;
  const objectName = pickName(dicts.objOptions || [], form.objectCode);
  const levelName = pickName(dicts.lvlOptions || [], form.levelCode);
  const systemName = pickName(dicts.sysOptions || [], form.systemCode);
  const zoneName = form.zoneText.trim() || "—";
  const templateObjectName = resolveCodeOrName(dicts.objOptions || [], templateContract?.object_name);
  const templateLevelName = resolveCodeOrName(dicts.lvlOptions || [], templateContract?.work_zone);
  const templateSystemName = resolveCodeOrName(dicts.sysOptions || [], templateContract?.work_type);
  const templateObjectCode = resolveCodeFromDict(dicts.objOptions || [], templateContract?.object_name);
  const templateLevelCode = resolveCodeFromDict(dicts.lvlOptions || [], templateContract?.work_zone);
  const templateSystemCode = resolveCodeFromDict(dicts.sysOptions || [], templateContract?.work_type);
  const subcontractDetailsVisible = subcontractFlowOpen && subcontractFlowScreen === "details" && !!templateContract;
  const draftOpen = subcontractFlowOpen && subcontractFlowScreen === "draft";
  const catalogVisible = subcontractFlowOpen && subcontractFlowScreen === "catalog";
  const workTypePickerVisible = subcontractFlowOpen && subcontractFlowScreen === "workType";
  const calcVisible = subcontractFlowOpen && subcontractFlowScreen === "calc";
  const contractorName = templateContract?.contractor_org || form.contractorOrg || "";
  const phoneName = templateContract?.contractor_phone || form.contractorPhone || "";
  const volumeText = `${fmtAmount(templateContract?.qty_planned ?? toNum(form.qtyPlanned))} ${templateContract?.uom || form.uom || ""}`.trim();

  const obj = trim(objectName || templateObjectName);
  const lvl = trim(levelName || templateLevelName);
  const sys = trim(systemName || templateSystemName);
  const zone = trim(form.zoneText);
  const contractor = trim(contractorName);
  const phone = trim(phoneName);
  const qty = templateContract?.qty_planned ?? toNum(form.qtyPlanned);
  const qtyUom = trim(templateContract?.uom || form.uom);
  const volumeRaw = fmtAmount(qty);
  const volume = volumeRaw !== "—" ? `${volumeRaw} ${qtyUom}`.trim() : "";
  const scopeNote = [
    obj ? `Объект: ${obj}` : "",
    lvl ? `Этаж/уровень: ${lvl}` : "",
    sys ? `Система: ${sys}` : "",
    zone ? `Зона: ${zone}` : "",
    contractor ? `Подрядчик: ${contractor}` : "",
    phone ? `Телефон: ${phone}` : "",
    volume ? `Объём: ${volume}` : "",
  ]
    .filter(Boolean)
    .join("; ");

  const requestMetaFromTemplate: RequestMetaPatch = templateContract
    ? {
        contractor_job_id: trim(templateContract.id) || null,
        subcontract_id: trim(templateContract.id) || null,
        object_type_code: form.objectCode || templateObjectCode || null,
        level_code: form.levelCode || templateLevelCode || null,
        system_code: form.systemCode || templateSystemCode || null,
        zone_code: null,
        foreman_name: foremanName || "Прораб",
        contractor_org: contractor || null,
        subcontractor_org: contractor || null,
        contractor_phone: phone || null,
        subcontractor_phone: phone || null,
        planned_volume: templateContract.qty_planned ?? null,
        qty_plan: templateContract.qty_planned ?? null,
        volume: templateContract.qty_planned ?? null,
        object_name: objectName || templateObjectName || null,
        level_name: levelName || templateLevelName || null,
        system_name: systemName || templateSystemName || null,
        zone_name: zone || null,
        comment: [
          templateContract.display_no ? `Подряд ${templateContract.display_no}` : "",
          contractor,
          systemName || templateSystemName || trim(templateContract.work_mode),
          levelName || templateLevelName || "",
          zone,
          volumeRaw !== "—" ? `${volumeRaw} ${qtyUom}`.trim() : "",
        ]
          .filter(Boolean)
          .join(" · ") || null,
      }
    : {};

  const requestMetaPersistPatch: RequestMetaPatch = {
    contractor_job_id: trim(templateContract?.id) || null,
    subcontract_id: trim(templateContract?.id) || null,
    object_type_code: form.objectCode || templateObjectCode || null,
    level_code: form.levelCode || templateLevelCode || null,
    system_code: form.systemCode || templateSystemCode || null,
    zone_code: null,
    foreman_name: foremanName || "Прораб",
    object_name: objectName || templateObjectName || null,
    comment: (requestMetaFromTemplate.comment ?? scopeNote) || null,
  };

  return {
    templateContract,
    objectName,
    levelName,
    systemName,
    zoneName,
    templateObjectName,
    templateLevelName,
    templateSystemName,
    templateObjectCode,
    templateLevelCode,
    templateSystemCode,
    subcontractDetailsVisible,
    draftOpen,
    catalogVisible,
    workTypePickerVisible,
    calcVisible,
    scopeNote,
    requestMetaFromTemplate,
    requestMetaPersistPatch,
    approvedContracts: history.filter((item) => item.status === "approved"),
    contractorName,
    phoneName,
    volumeText,
  };
}
