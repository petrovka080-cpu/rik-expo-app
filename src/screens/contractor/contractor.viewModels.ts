type WorkRowLike = {
  progress_id?: string;
  contractor_job_id?: string | null;
  object_name?: string | null;
  work_name?: string | null;
  work_code?: string | null;
  contractor_org?: string | null;
  contractor_inn?: string | null;
  qty_planned?: number | null;
  qty_left?: number | null;
  uom_id?: string | null;
  created_at?: string | null;
};

type SubcontractLiteLike = {
  id: string;
  object_name?: string | null;
  work_type?: string | null;
  qty_planned?: number | null;
  uom?: string | null;
  contractor_org?: string | null;
  contractor_inn?: string | null;
  created_at?: string | null;
};

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
  contractorCompany?: string | null;
  profileCompany?: string | null;
  normalizeText?: (value: any) => string;
  allowGlobalFallback?: boolean;
};

const sortCards = (cards: ContractorJobCardView[]): ContractorJobCardView[] =>
  [...cards].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    const ta = Date.parse(a.createdAt || "") || 0;
    const tb = Date.parse(b.createdAt || "") || 0;
    if (tb !== ta) return tb - ta;
    return b.id.localeCompare(a.id);
  });

const pickText = (value: any, normalizeText?: (value: any) => string): string => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return normalizeText ? String(normalizeText(raw) || "").trim() : raw;
};

function resolveCompanyName(params: ResolveCompanyParams): {
  company: string;
  source:
  | "subcontract.contractor_org"
  | "row.contractor_org"
  | "contractor.company_name"
  | "profile.company"
  | "fallback";
  raw: string;
} {
  const {
    subcontractOrg,
    rowOrg,
    contractorCompany,
    profileCompany,
    normalizeText,
    allowGlobalFallback,
  } = params;

  // Priority 1: Subcontract org
  const vSub = pickText(subcontractOrg, normalizeText);
  if (vSub) return { company: vSub, source: "subcontract.contractor_org", raw: String(subcontractOrg || "") };

  // Priority 2: Row org (from the record data)
  const vRow = pickText(rowOrg, normalizeText);
  if (vRow) return { company: vRow, source: "row.contractor_org", raw: String(rowOrg || "") };

  // If we are allowed to use global fallback (usually for non-subcontract works, but here restricted by allowGlobalFallback)
  if (allowGlobalFallback) {
    const vContractor = pickText(contractorCompany, normalizeText);
    if (vContractor) return { company: vContractor, source: "contractor.company_name", raw: String(contractorCompany || "") };

    const vProfile = pickText(profileCompany, normalizeText);
    if (vProfile) return { company: vProfile, source: "profile.company", raw: String(profileCompany || "") };
  }

  return { company: "Подрядчик не указан", source: "fallback", raw: "" };
}

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
  contractorCompany?: string | null;
  profileCompany?: string | null;
  toHumanObject: (value: string | null | undefined) => string;
  toHumanWork: (value: string | null | undefined) => string;
  normalizeText?: (value: any) => string;
  debugCompanySource?: boolean;
  debugPlatform?: string;
  allowGlobalFallback?: boolean;
}): ContractorJobCardView[] {
  const {
    subcontractCards,
    groupedWorksByJob,
    contractorCompany,
    profileCompany,
    toHumanObject,
    toHumanWork,
    normalizeText,
    debugCompanySource,
    debugPlatform,
    allowGlobalFallback,
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

    // Use subcontract data as primary, but also provide first row data as fallback if subcontract misses org
    const companyResolved = resolveCompanyName({
      subcontractOrg: s.contractor_org,
      rowOrg: rowsForJob[0]?.contractor_org,
      contractorCompany,
      profileCompany,
      normalizeText,
      allowGlobalFallback,
    });

    if (__DEV__ && debugCompanySource) {
      console.log(`[contractor.cards] card:${id} platform:${debugPlatform || "unknown"}`, {
        hasSubcontract: true,
        source: companyResolved.source,
        raw: companyResolved.raw,
        final: companyResolved.company,
      });
    }

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
    const createdAt = String((first as any)?.created_at || "");
    const companyResolved = resolveCompanyName({
      subcontractOrg: first?.contractor_org || null,
      rowOrg: first?.contractor_org || null,
      contractorCompany,
      profileCompany,
      normalizeText,
      allowGlobalFallback,
    });

    if (__DEV__ && debugCompanySource) {
      console.log(`[contractor.cards] card:${jid} platform:${debugPlatform || "unknown"}`, {
        hasSubcontract: false,
        source: companyResolved.source,
        raw: companyResolved.raw,
        final: companyResolved.company,
      });
    }

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
  contractorCompany?: string | null;
  profileCompany?: string | null;
  toHumanObject: (value: string | null | undefined) => string;
  toHumanWork: (value: string | null | undefined) => string;
  normalizeText?: (value: any) => string;
  debugCompanySource?: boolean;
  debugPlatform?: string;
  allowGlobalFallback?: boolean;
}): { cards: ContractorJobCardView[]; rowByCardId: Map<string, WorkRowLike> } {
  const {
    jobCards,
    otherRows,
    contractorCompany,
    profileCompany,
    toHumanObject,
    toHumanWork,
    normalizeText,
    debugCompanySource,
    debugPlatform,
    allowGlobalFallback,
  } = params;

  const rowByCardId = new Map<string, WorkRowLike>();
  const otherCards = otherRows.map((row) => {
    const id = `other:${String(row.progress_id || "")}`;
    rowByCardId.set(id, row);

    const companyResolved = resolveCompanyName({
      subcontractOrg: row.contractor_org || null,
      rowOrg: row.contractor_org || null,
      contractorCompany,
      profileCompany,
      normalizeText,
      allowGlobalFallback,
    });

    if (__DEV__ && debugCompanySource) {
      console.log(`[contractor.cards] card:${id} platform:${debugPlatform || "unknown"}`, {
        hasSubcontract: false,
        source: companyResolved.source,
        raw: companyResolved.raw,
        final: companyResolved.company,
      });
    }

    return {
      id,
      contractor: companyResolved.company,
      contractorInn: pickText(row.contractor_inn, normalizeText) || null,
      objectName: toHumanObject(row.object_name),
      workType: toHumanWork(row.work_name || row.work_code),
      qtyPlanned: Number(row.qty_planned ?? 0) || 0,
      uom: pickText(row.uom_id, normalizeText),
      createdAt: String((row as any).created_at || ""),
      isActive: Number(row.qty_left ?? 0) > 0,
    } satisfies ContractorJobCardView;
  });

  return {
    cards: sortCards([...jobCards, ...otherCards]),
    rowByCardId,
  };
}
