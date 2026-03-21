import React from "react";
import type {
  RepDisciplineLevel,
  RepDisciplinePayload,
  RepDisciplineWork,
  RepKpi,
  RepPayload,
  RepRow,
} from "../director.types";

type DirectorReportsKpiCompat = RepKpi & {
  issues_without_object?: number | null;
  items_without_request?: number | null;
};

type WorkTopMaterial = {
  rik_code: string;
  material_name: string;
  uom: string;
  qty_sum: number;
  docs_count: number;
};

type WorkDetailViewModel = {
  sortedLevels: RepDisciplineLevel[];
  topMaterials: WorkTopMaterial[];
};

type Params = {
  repData: RepPayload | null;
  repDiscipline: RepDisciplinePayload | null;
  repOptObjects: string[];
  repDisciplinePriceLoading: boolean;
};

const pct = (a: number, b: number) => {
  const aa = Number(a || 0);
  const bb = Number(b || 0);
  if (!bb) return 0;
  return Math.round((aa / bb) * 10000) / 100;
};

const ratioColor = (v: number) => {
  const x = Number(v || 0);
  if (x < 60) return "#22C55E";
  if (x <= 90) return "#EAB308";
  return "#EF4444";
};

const normKey = (v: string) => String(v || "").trim().toLowerCase();
const WITHOUT_WORK_PREFIX = "без вида работ";
const compactParts = (parts: (string | null | undefined)[]) =>
  parts.map((part) => String(part ?? "").trim()).filter(Boolean);
const toFiniteNumber = (value: unknown): number => {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
};
const textOrFallback = (value: unknown, fallback = ""): string => {
  const text = String(value ?? "").trim();
  return text || fallback;
};
const DETAIL_TIMING = typeof __DEV__ !== "undefined" ? __DEV__ : false;
const nowMs = () => {
  try {
    return typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();
  } catch {
    return Date.now();
  }
};

export function useDirectorReportsModalState({
  repData,
  repDiscipline,
  repOptObjects,
  repDisciplinePriceLoading,
}: Params) {
  const data = repData;
  const kpi: DirectorReportsKpiCompat | null = data?.kpi ?? null;
  const rows: RepRow[] = Array.isArray(data?.rows) ? data.rows : [];
  const discipline: RepDisciplinePayload | null = repDiscipline ?? data?.discipline ?? null;
  const objectOptions = React.useMemo(() => (Array.isArray(repOptObjects) ? repOptObjects : []), [repOptObjects]);
  const [workModal, setWorkModal] = React.useState<RepDisciplineWork | null>(null);
  const [levelModal, setLevelModal] = React.useState<{ work: RepDisciplineWork; level: RepDisciplineLevel } | null>(null);
  const workDetailCacheRef = React.useRef(new Map<string, WorkDetailViewModel>());
  const levelDetailCacheRef = React.useRef(new Map<string, RepDisciplineLevel["materials"]>());
  const detailOpenTraceRef = React.useRef<{ kind: "work" | "level"; startedAt: number } | null>(null);

  const issuesTotal = toFiniteNumber(kpi?.issues_total);
  const issuesNoObj = toFiniteNumber(kpi?.issues_without_object ?? kpi?.issues_no_obj);
  const itemsTotal = toFiniteNumber(kpi?.items_total);
  const itemsNoReq = toFiniteNumber(kpi?.items_without_request ?? kpi?.items_free);

  React.useEffect(() => {
    workDetailCacheRef.current.clear();
    levelDetailCacheRef.current.clear();
  }, [discipline]);

  const getWorkDetailViewModel = React.useCallback((work: RepDisciplineWork | null): WorkDetailViewModel => {
    if (!work) {
      return { sortedLevels: [], topMaterials: [] };
    }

    const cached = workDetailCacheRef.current.get(work.id);
    if (cached) return cached;

    const sortedLevels = [...(work.levels || [])].sort((a, b) => {
      const byPositions = b.total_positions - a.total_positions;
      if (byPositions !== 0) return byPositions;
      return String(a.location_label || a.level_name || "").localeCompare(String(b.location_label || b.level_name || ""), "ru");
    });

    const acc = new Map<string, WorkTopMaterial>();
    for (const level of sortedLevels) {
      const materials = Array.isArray(level.materials) ? level.materials : [];
      for (const material of materials) {
        const key = `${String(material.rik_code || "").trim()}|${String(material.uom || "").trim()}|${String(material.material_name || "").trim()}`;
        const prev = acc.get(key);
        if (prev) {
          prev.qty_sum += Number(material.qty_sum || 0);
          prev.docs_count += Number(material.docs_count || 0);
        } else {
          acc.set(key, {
            rik_code: String(material.rik_code || ""),
            material_name: String(material.material_name || material.rik_code || "—"),
            uom: String(material.uom || ""),
            qty_sum: Number(material.qty_sum || 0),
            docs_count: Number(material.docs_count || 0),
          });
        }
      }
    }

    const value = {
      sortedLevels,
      topMaterials: Array.from(acc.values()).sort((a, b) => b.qty_sum - a.qty_sum).slice(0, 20),
    };
    workDetailCacheRef.current.set(work.id, value);
    return value;
  }, []);

  const getLevelDetailMaterials = React.useCallback(
    (workId: string | null, level: RepDisciplineLevel | null): RepDisciplineLevel["materials"] => {
      if (!workId || !level) return [] as RepDisciplineLevel["materials"];

      const key = `${workId}:${level.id}`;
      const cached = levelDetailCacheRef.current.get(key);
      if (cached) return cached;

      const sortedMaterials = [...(level.materials || [])].sort((a, b) => b.qty_sum - a.qty_sum);
      levelDetailCacheRef.current.set(key, sortedMaterials);
      return sortedMaterials;
    },
    [],
  );

  const sortedWorks = React.useMemo(() => {
    const arr = Array.isArray(discipline?.works) ? [...discipline.works] : [];
    return arr.sort((a, b) => b.total_positions - a.total_positions);
  }, [discipline]);

  const workDetailViewModel = React.useMemo(
    () => getWorkDetailViewModel(workModal),
    [getWorkDetailViewModel, workModal],
  );
  const sortedWorkLevels = workDetailViewModel.sortedLevels;
  const topWorkMaterials = workDetailViewModel.topMaterials;

  const sortedLevelMaterials = React.useMemo(
    () => getLevelDetailMaterials(levelModal?.work.id ?? null, levelModal?.level ?? null),
    [getLevelDetailMaterials, levelModal],
  );

  const levelModalTitle = React.useMemo(() => {
    if (!levelModal) return "";
    if (textOrFallback(levelModal.level.location_label)) {
      return textOrFallback(levelModal.level.location_label);
    }
    const workName = textOrFallback(levelModal.work.work_type_name);
    const levelName = textOrFallback(levelModal.level.level_name);
    if (!workName) return levelName;
    if (!levelName) return workName;
    return normKey(workName) === normKey(levelName) ? levelName : `${workName} / ${levelName}`;
  }, [levelModal]);

  const disSummary = discipline?.summary ?? null;
  const ratioPct = Number(disSummary?.issue_to_purchase_pct ?? 0);
  const ratioTint = ratioColor(ratioPct);
  const issueCost = Number(disSummary?.issue_cost_total ?? 0);
  const purchaseCost = Number(disSummary?.purchase_cost_total ?? 0);
  const hasCostBase = purchaseCost > 0;
  const ratioText = hasCostBase ? `${ratioPct}%` : "Н/Д";

  const resetDetailOverlays = React.useCallback(() => {
    detailOpenTraceRef.current = null;
    setWorkModal(null);
    setLevelModal(null);
  }, []);

  const openWorkDetail = React.useCallback((work: RepDisciplineWork) => {
    detailOpenTraceRef.current = { kind: "work", startedAt: nowMs() };
    setLevelModal(null);
    setWorkModal(work);
  }, []);

  const openLevelDetail = React.useCallback((level: RepDisciplineLevel) => {
    if (!workModal) return;
    detailOpenTraceRef.current = { kind: "level", startedAt: nowMs() };
    setLevelModal({ work: workModal, level });
    setWorkModal(null);
  }, [workModal]);

  const backToWorkDetail = React.useCallback(() => {
    if (!levelModal) return;
    setWorkModal(levelModal.work);
    setLevelModal(null);
  }, [levelModal]);

  React.useEffect(() => {
    if (!DETAIL_TIMING || !workModal) return;
    if (detailOpenTraceRef.current?.kind !== "work") return;
    const duration = Math.round(nowMs() - detailOpenTraceRef.current.startedAt);
    detailOpenTraceRef.current = null;
    console.info(
      `[director_works] detail_open:work duration_ms=${duration} levels=${sortedWorkLevels.length} top_materials=${topWorkMaterials.length}`,
    );
  }, [sortedWorkLevels.length, topWorkMaterials.length, workModal]);

  React.useEffect(() => {
    if (!DETAIL_TIMING || !levelModal) return;
    if (detailOpenTraceRef.current?.kind !== "level") return;
    const duration = Math.round(nowMs() - detailOpenTraceRef.current.startedAt);
    detailOpenTraceRef.current = null;
    console.info(
      `[director_works] detail_open:level duration_ms=${duration} materials=${sortedLevelMaterials.length}`,
    );
  }, [levelModal, sortedLevelMaterials.length]);

  return {
    rows,
    discipline,
    objectOptions,
    issuesTotal,
    issuesNoObj,
    itemsTotal,
    itemsNoReq,
    sortedWorks,
    sortedWorkLevels,
    topWorkMaterials,
    sortedLevelMaterials,
    levelModalTitle,
    disSummary,
    ratioTint,
    issueCost,
    purchaseCost,
    hasCostBase,
    ratioText,
    repDisciplinePriceLoading,
    workModal,
    levelModal,
    compactParts,
    WITHOUT_WORK_PREFIX,
    normKey,
    resetDetailOverlays,
    openWorkDetail,
    openLevelDetail,
    backToWorkDetail,
    setWorkModal,
    setLevelModal,
    pct,
  };
}
