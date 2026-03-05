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

const sortCards = (cards: ContractorJobCardView[]): ContractorJobCardView[] =>
  [...cards].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    const ta = Date.parse(a.createdAt || "") || 0;
    const tb = Date.parse(b.createdAt || "") || 0;
    if (tb !== ta) return tb - ta;
    return b.id.localeCompare(a.id);
  });

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
}): ContractorJobCardView[] {
  const {
    subcontractCards,
    groupedWorksByJob,
    contractorCompany,
    profileCompany,
    toHumanObject,
    toHumanWork,
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

    cards.push({
      id,
      contractor:
        String(s.contractor_org || "").trim() ||
        contractorCompany ||
        profileCompany ||
        "Подрядчик",
      contractorInn: String(s.contractor_inn || "").trim() || null,
      objectName: toHumanObject(String(s.object_name || "").trim()),
      workType: toHumanWork(String(s.work_type || "").trim()),
      qtyPlanned: Number(s.qty_planned ?? 0) || 0,
      uom: String(s.uom || "").trim(),
      createdAt: String(s.created_at || ""),
      isActive,
    });
  }

  for (const [jid, rowsForJob] of groupedWorksByJob.entries()) {
    if (used.has(jid)) continue;
    const first = rowsForJob[0];
    const createdAt = String((first as any)?.created_at || "");
    cards.push({
      id: jid,
      contractor:
        String(first?.contractor_org || "").trim() ||
        contractorCompany ||
        profileCompany ||
        "Подрядчик",
      contractorInn: String(first?.contractor_inn || "").trim() || null,
      objectName: toHumanObject(first?.object_name),
      workType: toHumanWork(first?.work_name || first?.work_code),
      qtyPlanned: Number(first?.qty_planned ?? 0) || 0,
      uom: String(first?.uom_id || "").trim(),
      createdAt,
      isActive: rowsForJob.some((r) => Number(r.qty_left ?? 0) > 0),
    });
  }

  return sortCards(cards);
}

export function buildUnifiedCardsFromJobsAndOthers(params: {
  jobCards: ContractorJobCardView[];
  otherRows: WorkRowLike[];
  fallbackCompany: string;
  toHumanObject: (value: string | null | undefined) => string;
  toHumanWork: (value: string | null | undefined) => string;
}): { cards: ContractorJobCardView[]; rowByCardId: Map<string, WorkRowLike> } {
  const { jobCards, otherRows, fallbackCompany, toHumanObject, toHumanWork } = params;

  const rowByCardId = new Map<string, WorkRowLike>();
  const otherCards = otherRows.map((row) => {
    const id = `other:${String(row.progress_id || "")}`;
    rowByCardId.set(id, row);
    return {
      id,
      contractor: String(row.contractor_org || "").trim() || fallbackCompany,
      contractorInn: String(row.contractor_inn || "").trim() || null,
      objectName: toHumanObject(row.object_name),
      workType: toHumanWork(row.work_name || row.work_code),
      qtyPlanned: Number(row.qty_planned ?? 0) || 0,
      uom: String(row.uom_id || "").trim(),
      createdAt: String((row as any).created_at || ""),
      isActive: Number(row.qty_left ?? 0) > 0,
    } satisfies ContractorJobCardView;
  });

  return {
    cards: sortCards([...jobCards, ...otherCards]),
    rowByCardId,
  };
}
