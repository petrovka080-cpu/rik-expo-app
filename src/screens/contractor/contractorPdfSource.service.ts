import type { AppSupabaseClient } from "../../types/contracts/shared";
import { isRpcRecord } from "../../lib/api/queryBoundary";
import { callContractorWorkPdfSourceRpc } from "./contractorPdfSource.transport";

export type ContractorWorkPdfSourceWork = {
  progress_id: string;
  work_code: string | null;
  work_name: string | null;
  object_name: string | null;
  uom_id: string | null;
  qty_planned: number;
  qty_done: number;
  qty_left: number;
};

export type ContractorWorkPdfSourceHeader = {
  contractor_org: string | null;
  contractor_inn: string | null;
  contractor_phone: string | null;
  contract_number: string | null;
  contract_date: string | null;
  object_name: string | null;
  work_type: string | null;
  zone: string | null;
  level_name: string | null;
  unit_price: number | null;
  total_price: number | null;
  date_start: string | null;
  date_end: string | null;
};

export type ContractorWorkPdfSourceMaterial = {
  mat_code: string;
  name: string;
  uom: string | null;
  qty_fact: number;
};

export type ContractorWorkPdfSourceLog = {
  id: string;
  created_at: string | null;
  qty: number;
  note: string | null;
  stage_note: string | null;
  work_uom: string | null;
};

export type ContractorWorkPdfSourceEnvelope = {
  document_type: "contractor_work_pdf";
  version: "v1";
  mode: "summary" | "history";
  work: ContractorWorkPdfSourceWork;
  header: ContractorWorkPdfSourceHeader;
  materials: ContractorWorkPdfSourceMaterial[];
  log: ContractorWorkPdfSourceLog | null;
};

type ContractorPdfRecord = Record<string, unknown>;

const asRecord = (value: unknown): ContractorPdfRecord =>
  isRpcRecord(value) ? value : {};

const asRows = (value: unknown): ContractorPdfRecord[] =>
  Array.isArray(value) ? value.map(asRecord) : [];

const toText = (value: unknown) => String(value ?? "").trim();

const toNullableText = (value: unknown) => {
  const text = toText(value);
  return text || null;
};

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value ?? NaN);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export class ContractorWorkPdfSourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContractorWorkPdfSourceError";
  }
}

export function parseContractorWorkPdfSourceEnvelope(data: unknown): ContractorWorkPdfSourceEnvelope {
  const root = asRecord(data);
  if (toText(root.document_type) !== "contractor_work_pdf" || toText(root.version) !== "v1") {
    throw new ContractorWorkPdfSourceError("pdf_contractor_work_source_v1 returned invalid envelope");
  }

  const mode = toText(root.mode);
  if (mode !== "summary" && mode !== "history") {
    throw new ContractorWorkPdfSourceError("pdf_contractor_work_source_v1 returned invalid mode");
  }

  const workRow = asRecord(root.work);
  const headerRow = asRecord(root.header);
  if (!toText(workRow.progress_id)) {
    throw new ContractorWorkPdfSourceError("pdf_contractor_work_source_v1 missing work.progress_id");
  }

  const logRow = asRecord(root.log);
  const resolvedLog =
    mode === "history" && toText(logRow.id)
      ? {
          id: toText(logRow.id),
          created_at: toNullableText(logRow.created_at),
          qty: toNumber(logRow.qty),
          note: toNullableText(logRow.note),
          stage_note: toNullableText(logRow.stage_note),
          work_uom: toNullableText(logRow.work_uom),
        }
      : null;

  if (mode === "history" && !resolvedLog) {
    throw new ContractorWorkPdfSourceError("pdf_contractor_work_source_v1 missing history log payload");
  }

  return {
    document_type: "contractor_work_pdf",
    version: "v1",
    mode,
    work: {
      progress_id: toText(workRow.progress_id),
      work_code: toNullableText(workRow.work_code),
      work_name: toNullableText(workRow.work_name),
      object_name: toNullableText(workRow.object_name),
      uom_id: toNullableText(workRow.uom_id),
      qty_planned: toNumber(workRow.qty_planned),
      qty_done: toNumber(workRow.qty_done),
      qty_left: toNumber(workRow.qty_left),
    },
    header: {
      contractor_org: toNullableText(headerRow.contractor_org),
      contractor_inn: toNullableText(headerRow.contractor_inn),
      contractor_phone: toNullableText(headerRow.contractor_phone),
      contract_number: toNullableText(headerRow.contract_number),
      contract_date: toNullableText(headerRow.contract_date),
      object_name: toNullableText(headerRow.object_name),
      work_type: toNullableText(headerRow.work_type),
      zone: toNullableText(headerRow.zone),
      level_name: toNullableText(headerRow.level_name),
      unit_price: Number.isFinite(Number(headerRow.unit_price)) ? Number(headerRow.unit_price) : null,
      total_price: Number.isFinite(Number(headerRow.total_price)) ? Number(headerRow.total_price) : null,
      date_start: toNullableText(headerRow.date_start),
      date_end: toNullableText(headerRow.date_end),
    },
    materials: asRows(root.materials).map((row) => ({
      mat_code: toText(row.mat_code),
      name: toText(row.name) || toText(row.mat_code),
      uom: toNullableText(row.uom),
      qty_fact: toNumber(row.qty_fact),
    })),
    log: resolvedLog,
  };
}

export async function loadContractorWorkPdfSourceViaRpc(args: {
  supabaseClient: AppSupabaseClient;
  progressId: string;
  logId?: string | null;
}): Promise<ContractorWorkPdfSourceEnvelope> {
  const { supabaseClient, progressId, logId } = args;
  const { data, error } = await callContractorWorkPdfSourceRpc(supabaseClient, {
    p_progress_id: progressId,
    p_log_id: logId ?? null,
  });

  if (error) {
    throw new ContractorWorkPdfSourceError(`pdf_contractor_work_source_v1 failed: ${error.message}`);
  }

  return parseContractorWorkPdfSourceEnvelope(data);
}
