import type {
  ContractorSubcontractCard,
  ContractorWorkRow,
} from "./contractor.loadWorksService";

type WorkRowLike = ContractorWorkRow;
type SubcontractLiteLike = ContractorSubcontractCard;

export type ContractorJobCardView = {
  id: string;
  contractor: string;
  contractorInn?: string | null;
  objectName: string;
  workType: string;
  qtyPlanned: number;
  uom: string;
  createdAt: string;
  isActive: boolean;
};

type ResolveCompanyParams = {
  subcontractOrg?: string | null;
  rowOrg?: string | null;
  normalizeText?: (value: unknown) => string;
};

const sortCards = (cards: ContractorJobCardView[]): ContractorJobCardView[] =>
  [...cards].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    const ta = Date.parse(a.createdAt || "") || 0;
    const tb = Date.parse(b.createdAt || "") || 0;
    if (tb !== ta) return tb - ta;
    return b.id.localeCompare(a.id);
  });

const pickText = (value: unknown, normalizeText?: (value: unknown) => string): string => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return normalizeText ? String(normalizeText(raw) || "").trim() : raw;
};

function resolveCompanyName(params: ResolveCompanyParams): {
  company: string;
  source: "subcontract.contractor_org" | "row.contractor_org" | "fallback";
  raw: string;
} {
  const { subcontractOrg, rowOrg, normalizeText } = params;

  const vSub = pickText(subcontractOrg, normalizeText);
  if (vSub) return { company: vSub, source: "subcontract.contractor_org", raw: String(subcontractOrg || "") };

  const vRow = pickText(rowOrg, normalizeText);
  if (vRow) return { company: vRow, source: "row.contractor_org", raw: String(rowOrg || "") };

  return { company: "Подрядчик не указан", source: "fallback", raw: "" };
}

const logContractorCardDebug = (
  enabled: boolean | undefined,
  cardId: string,
  debugPlatform: string | undefined,
  payload: {
    hasSubcontract: boolean;
    subcontractId: string | null;
    source: "subcontract.contractor_org" | "row.contractor_org" | "fallback";
    rawContractorOrg: string;
    finalContractorTitle: string;
  },
) => {
  if (!__DEV__ || !enabled) return;
  console.debug(`[contractor.cards] card:${cardId} platform:${debugPlatform || "unknown"}`, payload);
};

export function groupWorksByJob<T extends WorkRowLike>(rows: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const r of rows) {
    const jid = String(r.contractor_job_id || "").trim();
    if (!jid) continue;
    if (!map.has(jid)) map.set(jid, []);
    map.get(jid)!.push(r);
  }
  return map;
}

export function buildJobCards(params: {
  subcontractCards: SubcontractLiteLike[];
  groupedWorksByJob: Map<string, WorkRowLike[]>;
  toHumanObject: (value: string | null | undefined) => string;
  toHumanWork: (value: string | null | undefined) => string;
  normalizeText?: (value: unknown) => string;
  debugCompanySource?: boolean;
  debugPlatform?: string;
}): ContractorJobCardView[] {
  const {
    subcontractCards,
    groupedWorksByJob,
    toHumanObject,
    toHumanWork,
    normalizeText,
    debugCompanySource,
    debugPlatform,
  } = params;

  const cards: ContractorJobCardView[] = [];
  const used = new Set<string>();

  for (const s of subcontractCards) {
    const id = String(s.id || "").trim();
    if (!id) continue;
    used.add(id);

    const rowsForJob = groupedWorksByJob.get(id) || [];
    const hasActiveRows = rowsForJob.some((r) => Number(r.qty_left ?? 0) > 0);
    const isActive = rowsForJob.length === 0 ? true : hasActiveRows;

    const companyResolved = resolveCompanyName({
      subcontractOrg: s.contractor_org,
      rowOrg: rowsForJob[0]?.contractor_org,
      normalizeText,
    });

    logContractorCardDebug(debugCompanySource, id, debugPlatform, {
      hasSubcontract: true,
      subcontractId: id,
      source: companyResolved.source,
      rawContractorOrg: companyResolved.raw,
      finalContractorTitle: companyResolved.company,
    });

    cards.push({
      id,
      contractor: companyResolved.company,
      contractorInn: pickText(s.contractor_inn, normalizeText) || null,
      objectName: toHumanObject(String(s.object_name || "").trim()),
      workType: toHumanWork(String(s.work_type || "").trim()),
      qtyPlanned: Number(s.qty_planned ?? 0) || 0,
      uom: pickText(s.uom, normalizeText),
      createdAt: String(s.created_at || ""),
      isActive,
    });
  }

  for (const [jid, rowsForJob] of groupedWorksByJob.entries()) {
    if (used.has(jid)) continue;
    const first = rowsForJob[0];
    const createdAt = String(first?.created_at || "");
    const companyResolved = resolveCompanyName({
      subcontractOrg: first?.contractor_org || null,
      rowOrg: first?.contractor_org || null,
      normalizeText,
    });

    logContractorCardDebug(debugCompanySource, jid, debugPlatform, {
      hasSubcontract: false,
      subcontractId: null,
      source: companyResolved.source,
      rawContractorOrg: companyResolved.raw,
      finalContractorTitle: companyResolved.company,
    });

    cards.push({
      id: jid,
      contractor: companyResolved.company,
      contractorInn: pickText(first?.contractor_inn, normalizeText) || null,
      objectName: toHumanObject(first?.object_name),
      workType: toHumanWork(first?.work_name || first?.work_code),
      qtyPlanned: Number(first?.qty_planned ?? 0) || 0,
      uom: pickText(first?.uom_id, normalizeText),
      createdAt,
      isActive: rowsForJob.some((r) => Number(r.qty_left ?? 0) > 0),
    });
  }

  return sortCards(cards);
}

export function buildUnifiedCardsFromJobsAndOthers(params: {
  jobCards: ContractorJobCardView[];
  otherRows: WorkRowLike[];
  toHumanObject: (value: string | null | undefined) => string;
  toHumanWork: (value: string | null | undefined) => string;
  normalizeText?: (value: unknown) => string;
  debugCompanySource?: boolean;
  debugPlatform?: string;
}): { cards: ContractorJobCardView[]; rowByCardId: Map<string, WorkRowLike> } {
  const {
    jobCards,
    otherRows,
    toHumanObject,
    toHumanWork,
    normalizeText,
    debugCompanySource,
    debugPlatform,
  } = params;

  const rowByCardId = new Map<string, WorkRowLike>();
  const otherCards = otherRows.map((row) => {
    const id = `other:${String(row.progress_id || "")}`;
    rowByCardId.set(id, row);

    const companyResolved = resolveCompanyName({
      subcontractOrg: row.contractor_org || null,
      rowOrg: row.contractor_org || null,
      normalizeText,
    });

    logContractorCardDebug(debugCompanySource, id, debugPlatform, {
      hasSubcontract: false,
      subcontractId: null,
      source: companyResolved.source,
      rawContractorOrg: companyResolved.raw,
      finalContractorTitle: companyResolved.company,
    });

    return {
      id,
      contractor: companyResolved.company,
      contractorInn: pickText(row.contractor_inn, normalizeText) || null,
      objectName: toHumanObject(row.object_name),
      workType: toHumanWork(row.work_name || row.work_code),
      qtyPlanned: Number(row.qty_planned ?? 0) || 0,
      uom: pickText(row.uom_id, normalizeText),
      createdAt: String(row.created_at || ""),
      isActive: Number(row.qty_left ?? 0) > 0,
    } satisfies ContractorJobCardView;
  });

  return {
    cards: sortCards([...jobCards, ...otherCards]),
    rowByCardId,
  };
}

