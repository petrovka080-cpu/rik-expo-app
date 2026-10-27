import type {
  ContractorSubcontractCard,
  ContractorWorkRow,
} from "./contractor.loadWorksService";

const normalizeCmp = (v: unknown): string =>
  String(v || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

export function resolveWorkRowFromUnifiedCard(params: {
  id: string;
  otherRowByCardId: Map<string, ContractorWorkRow>;
  groupedWorksByJob: Map<string, ContractorWorkRow[]>;
  subcontractCards: ContractorSubcontractCard[];
  rows: ContractorWorkRow[];
  looksLikeUuid: (v: string) => boolean;
  pickWorkProgressRow: (row: { progress_id?: string | null }) => string;
}): ContractorWorkRow | null {
  const {
    id,
    otherRowByCardId,
    groupedWorksByJob,
    subcontractCards,
    rows,
    looksLikeUuid,
    pickWorkProgressRow,
  } = params;

  const otherRow = otherRowByCardId.get(String(id || ""));
  if (otherRow) return otherRow;

  const direct = groupedWorksByJob.get(id) || [];
  const fromDirect = direct.find((r) => looksLikeUuid(pickWorkProgressRow(r)));
  if (fromDirect) return fromDirect;

  const selected =
    subcontractCards.find((s) => String(s.id || "").trim() === String(id || "").trim()) || null;
  const targetObject = normalizeCmp(selected?.object_name || "");
  const targetWork = normalizeCmp(selected?.work_type || "");
  const inferred = rows.find((r) => {
    if (!looksLikeUuid(pickWorkProgressRow(r))) return false;
    if (String(r.progress_id || "").startsWith("subcontract:")) return false;
    const byObject = !!targetObject && normalizeCmp(r.object_name) === targetObject;
    const byWork = !!targetWork && normalizeCmp(r.work_name || r.work_code) === targetWork;
    return byObject && byWork;
  });
  return inferred || null;
}
