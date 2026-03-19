import React from "react";
import { Alert, FlatList, Pressable, Text, View } from "react-native";
import RNModal from "react-native-modal";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PeriodPickerSheet from "../../components/PeriodPickerSheet";
import DirectorFinanceCardModal from "./DirectorFinanceCardModal";
import { UI, s } from "./director.styles";
import {
  type RepDisciplineLevel,
  type RepDisciplinePayload,
  type RepDisciplineWork,
  type RepKpi,
  type RepPayload,
  type RepRow,
  type RepTab,
} from "./director.types";

type Props = {
  visible: boolean;
  onClose: () => void;
  repData: RepPayload | null;
  repDiscipline: RepDisciplinePayload | null;
  repPeriodShort: string;
  repLoading: boolean;
  repDisciplinePriceLoading: boolean;
  repPeriodOpen: boolean;
  onOpenPeriod: () => void;
  onClosePeriod: () => void;
  repFrom: string | null;
  repTo: string | null;
  onApplyPeriod: (from: string, to: string) => void;
  onClearPeriod: () => void;
  repObjOpen: boolean;
  onCloseRepObj: () => void;
  repOptObjects: string[];
  applyObjectFilter: (name: string | null) => Promise<void>;
  repObjectName: string | null;
  onOpenRepObj: () => void;
  repOptLoading: boolean;
  repTab: RepTab;
  setRepTab: (t: RepTab) => void;
  onRefresh: () => Promise<void>;
  onExportProductionPdf?: () => Promise<void> | void;
  onExportSubcontractPdf?: () => Promise<void> | void;
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

const money = (v: number) => `${Math.round(Number(v || 0)).toLocaleString("ru-RU")} KGS`;
const normKey = (v: string) => String(v || "").trim().toLowerCase();
const WITHOUT_WORK_PREFIX = "\u0431\u0435\u0437 \u0432\u0438\u0434\u0430 \u0440\u0430\u0431\u043e\u0442";
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

export default function DirectorReportsModal({
  visible,
  onClose,
  repData,
  repDiscipline,
  repPeriodShort,
  repLoading,
  repDisciplinePriceLoading,
  repPeriodOpen,
  onOpenPeriod,
  onClosePeriod,
  repFrom,
  repTo,
  onApplyPeriod,
  onClearPeriod,
  repObjOpen,
  onCloseRepObj,
  repOptObjects,
  applyObjectFilter,
  repObjectName,
  onOpenRepObj,
  repOptLoading,
  repTab,
  setRepTab,
  onRefresh,
  onExportProductionPdf,
  onExportSubcontractPdf,
}: Props) {
  const insets = useSafeAreaInsets();
  const data: RepPayload | null = repData;
  const kpi: DirectorReportsKpiCompat | null = data?.kpi ?? null;
  const rows: RepRow[] = Array.isArray(data?.rows) ? data.rows : [];
  const discipline: RepDisciplinePayload | null = repDiscipline ?? data?.discipline ?? null;

  const [workModal, setWorkModal] = React.useState<RepDisciplineWork | null>(null);
  const [levelModal, setLevelModal] = React.useState<{ work: RepDisciplineWork; level: RepDisciplineLevel } | null>(null);
  const workDetailCacheRef = React.useRef(new Map<string, WorkDetailViewModel>());
  const levelDetailCacheRef = React.useRef(new Map<string, RepDisciplineLevel["materials"]>());
  const detailOpenTraceRef = React.useRef<{ kind: "work" | "level"; startedAt: number } | null>(null);

  const issuesTotal = toFiniteNumber(kpi?.issues_total);
  const issuesNoObj = toFiniteNumber(kpi?.issues_without_object ?? kpi?.issues_no_obj);
  const itemsTotal = toFiniteNumber(kpi?.items_total);
  const itemsNoReq = toFiniteNumber(kpi?.items_without_request ?? kpi?.items_free);
  const detailTopInset = Math.max(insets.top || 0, 12) + 8;
  const detailBottomInset = Math.max(insets.bottom || 0, 16) + 12;

  React.useEffect(() => {
    workDetailCacheRef.current.clear();
    levelDetailCacheRef.current.clear();
  }, [discipline]);

  const getWorkDetailViewModel = React.useCallback((work: RepDisciplineWork | null): WorkDetailViewModel => {
    if (!work) {
      return {
        sortedLevels: [],
        topMaterials: [],
      };
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
            material_name: String(material.material_name || material.rik_code || "вЂ”"),
            uom: String(material.uom || ""),
            qty_sum: Number(material.qty_sum || 0),
            docs_count: Number(material.docs_count || 0),
          });
        }
      }
    }

    const value = {
      sortedLevels,
      topMaterials: Array.from(acc.values())
        .sort((a, b) => b.qty_sum - a.qty_sum)
        .slice(0, 20),
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

  const objectOptions = React.useMemo(() => (Array.isArray(repOptObjects) ? repOptObjects : []), [repOptObjects]);

  const levelModalTitle = React.useMemo(() => {
    if (!levelModal) return "";
    if (textOrFallback(levelModal.level.location_label)) {
      return textOrFallback(levelModal.level.location_label);
    }
    const w = textOrFallback(levelModal.work.work_type_name);
    const lv = textOrFallback(levelModal.level.level_name);
    if (!w) return lv;
    if (!lv) return w;
    return normKey(w) === normKey(lv) ? lv : `${w} / ${lv}`;
  }, [levelModal]);

  const disSummary = discipline?.summary ?? null;
  const ratioPct = Number(disSummary?.issue_to_purchase_pct ?? 0);
  const ratioTint = ratioColor(ratioPct);
  const issueCost = Number(disSummary?.issue_cost_total ?? 0);
  const purchaseCost = Number(disSummary?.purchase_cost_total ?? 0);
  const hasCostBase = purchaseCost > 0;
  const ratioText = hasCostBase ? `${ratioPct}%` : "РЅ/Рґ";

  const onTabPress = React.useCallback((t: RepTab) => {
    detailOpenTraceRef.current = null;
    setWorkModal(null);
    setLevelModal(null);
    setRepTab(t);
  }, [setRepTab]);

  const handleCloseAll = React.useCallback(() => {
    detailOpenTraceRef.current = null;
    setWorkModal(null);
    setLevelModal(null);
    onClose();
  }, [onClose]);

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

  const renderMaterialRow = React.useCallback(({ item }: { item: RepRow }) => {
    const qAll = Number(item.qty_total || 0);
    const qNoReq = Number(item.qty_free || 0);
    const docs = Number(item.docs_cnt || 0);
    const docsNoReq = Number(item.docs_free || 0);
    return (
      <View style={[s.mobCard, { marginBottom: 10 }]}>
        <View style={s.mobMain}>
          <Text style={s.mobTitle} numberOfLines={2}>{item.name_human_ru || item.rik_code}</Text>
          <Text style={s.mobMeta} numberOfLines={2}>
            {`Р’С‹РґР°РЅРѕ: ${qAll} ${item.uom} В· РґРѕРє ${docs}`}
            {qNoReq > 0 ? ` В· Р±РµР· Р·Р°СЏРІРєРё: ${qNoReq} (${docsNoReq} РґРѕРє)` : ""}
          </Text>
        </View>
      </View>
    );
  }, []);

  const renderObjectOptionRow = React.useCallback(({ item }: { item: string }) => (
    <Pressable
      onPress={async () => {
        onCloseRepObj();
        await applyObjectFilter(item);
      }}
      style={[s.mobCard, { marginHorizontal: 12, marginBottom: 10 }]}
    >
      <Text style={{ color: UI.text, fontWeight: "900" }} numberOfLines={2}>{item}</Text>
    </Pressable>
  ), [applyObjectFilter, onCloseRepObj]);

  const renderWorkRow = React.useCallback(({ item }: { item: RepDisciplineWork }) => {
    const isMissingWork = normKey(String(item.work_type_name || "")).startsWith(WITHOUT_WORK_PREFIX);
    const locations = Array.isArray(item.levels) ? item.levels : [];
    const preview = locations
      .slice(0, 2)
      .map((level) =>
        String(
          level.location_label ||
          compactParts([level.object_name, level.level_name, level.system_name, level.zone_name]).join(" / ") ||
          level.level_name ||
          "",
        ).trim(),
      )
      .filter(Boolean)
      .join(" | ");

    return (
      <Pressable
        onPress={() => {
          detailOpenTraceRef.current = { kind: "work", startedAt: nowMs() };
          setLevelModal(null);
          setWorkModal(item);
        }}
        style={[s.mobCard, { marginBottom: 10 }]}
      >
        <View style={s.mobMain}>
          <Text style={[s.mobTitle, isMissingWork ? { color: "#EF4444" } : null]} numberOfLines={1}>{item.work_type_name}</Text>
          <Text style={s.mobMeta} numberOfLines={1}>{`РџРѕР·РёС†РёРё: ${item.total_positions} В· Р›РѕРєР°С†РёРё: ${Number(item.location_count ?? locations.length)}`}</Text>
          <Text style={s.mobMeta} numberOfLines={1}>{`РџРѕ Р·Р°СЏРІРєРµ: ${item.req_positions} В· РЎРІРѕР±РѕРґРЅРѕ: ${item.free_positions}`}</Text>
          {preview ? <Text style={s.mobMeta} numberOfLines={2}>{preview}</Text> : null}
        </View>
      </Pressable>
    );
  }, []);

  const renderLevelRow = React.useCallback(({ item }: { item: RepDisciplineLevel }) => (
    <Pressable
      onPress={() => {
        if (!workModal) return;
        detailOpenTraceRef.current = { kind: "level", startedAt: nowMs() };
        setLevelModal({ work: workModal, level: item });
        setWorkModal(null);
      }}
      style={[s.mobCard, { marginHorizontal: 12, marginBottom: 10 }]}
    >
      <View style={s.mobMain}>
        <Text style={s.mobTitle} numberOfLines={2}>{item.location_label || item.level_name}</Text>
        <Text style={s.mobMeta} numberOfLines={1}>{compactParts([item.object_name, item.level_name]).join(" / ")}</Text>
        {compactParts([item.system_name, item.zone_name]).length ? (
          <Text style={s.mobMeta} numberOfLines={1}>{compactParts([item.system_name, item.zone_name]).join(" / ")}</Text>
        ) : null}
        <Text style={s.mobMeta} numberOfLines={1}>{`РџРѕР·РёС†РёРё: ${item.total_positions} В· РњР°С‚РµСЂРёР°Р»С‹: ${Array.isArray(item.materials) ? item.materials.length : 0}`}</Text>
        <Text style={s.mobMeta} numberOfLines={1}>{`РџРѕ Р·Р°СЏРІРєРµ: ${item.req_positions} В· РЎРІРѕР±РѕРґРЅРѕ: ${item.free_positions}`}</Text>
      </View>
    </Pressable>
  ), [workModal]);

  const renderLevelMaterialRow = React.useCallback(({ item }: { item: RepDisciplineLevel["materials"][number] }) => (
    <View style={[s.mobCard, { marginHorizontal: 12, marginBottom: 10 }]}>
      <View style={s.mobMain}>
        <Text style={s.mobTitle} numberOfLines={2}>{item.material_name}</Text>
        <Text style={s.mobMeta} numberOfLines={1}>{`${item.qty_sum} ${item.uom || ""}`}</Text>
        <Text style={s.mobMeta} numberOfLines={1}>
          {`Р¦РµРЅР°: ${money(Number(item.unit_price ?? 0))} В· РЎСѓРјРјР°: ${money(Number(item.amount_sum ?? 0))}`}
        </Text>
      </View>
    </View>
  ), []);

  const renderWorkTopMaterialRow = React.useCallback(({ item }: { item: typeof topWorkMaterials[number] }) => (
    <View style={[s.mobCard, { marginHorizontal: 12, marginBottom: 10 }]}>
      <View style={s.mobMain}>
        <Text style={s.mobTitle} numberOfLines={2}>{item.material_name}</Text>
        <Text style={s.mobMeta} numberOfLines={1}>{`${item.qty_sum} ${item.uom || ""}`}</Text>
        <Text style={s.mobMeta} numberOfLines={1}>{`Р”РѕРєСѓРјРµРЅС‚РѕРІ: ${item.docs_count}`}</Text>
      </View>
    </View>
  ), []);

  const objectOptionKeyExtractor = React.useCallback((item: string) => item, []);
  const materialRowKeyExtractor = React.useCallback(
    (item: RepRow) => `${String(item.rik_code || "")}:${String(item.uom || "")}:${String(item.name_human_ru || "")}`,
    [],
  );
  const disciplineWorkKeyExtractor = React.useCallback((item: RepDisciplineWork) => item.id, []);
  const levelKeyExtractor = React.useCallback((item: RepDisciplineLevel) => item.id, []);
  const levelMaterialKeyExtractor = React.useCallback(
    (item: RepDisciplineLevel["materials"][number]) =>
      `${String(item.rik_code || "")}:${String(item.uom || "")}:${String(item.material_name || "")}`,
    [],
  );
  const workTopMaterialKeyExtractor = React.useCallback(
    (item: typeof topWorkMaterials[number]) =>
      `${String(item.rik_code || "")}:${String(item.uom || "")}:${String(item.material_name || "")}`,
    [],
  );

  const disciplineListHeader = React.useMemo(() => (
    <View style={[s.mobCard, { marginBottom: 10, borderColor: ratioTint }]}>
      <View style={s.mobMain}>
        <Text style={s.mobTitle}>Р Р°СЃС…РѕРґ / Р—Р°РєСѓРїРєРё (%)</Text>
        <Text style={[s.mobTitle, { color: ratioTint }]}>{`Р Р°СЃС…РѕРґ / Р—Р°РєСѓРїРєРё: ${repDisciplinePriceLoading ? "вЂ¦" : ratioText}`}</Text>
        <Text style={s.mobMeta}>РїРѕ СЃС‚РѕРёРјРѕСЃС‚Рё Р·Р° РїРµСЂРёРѕРґ</Text>
        {!repDisciplinePriceLoading ? (
          <Text style={s.mobMeta}>{`Р Р°СЃС…РѕРґ: ${money(issueCost)} В· Р—Р°РєСѓРїРєРё: ${money(purchaseCost)}`}</Text>
        ) : null}
        {!repDisciplinePriceLoading && Number(disSummary?.unpriced_issue_pct ?? 0) > 0 ? (
          <Text style={s.mobMeta}>{`РќРµРѕС†РµРЅРµРЅРѕ: ${Number(disSummary?.unpriced_issue_pct ?? 0)}%`}</Text>
        ) : null}
        {!repDisciplinePriceLoading && !hasCostBase ? (
          <Text style={s.mobMeta}>РќРµРґРѕСЃС‚Р°С‚РѕС‡РЅРѕ С†РµРЅ РґР»СЏ СЂР°СЃС‡РµС‚Р° Р±Р°Р·С‹ Р·Р°РєСѓРїРѕРє.</Text>
        ) : null}
      </View>
    </View>
  ), [disSummary?.unpriced_issue_pct, hasCostBase, issueCost, purchaseCost, ratioText, ratioTint, repDisciplinePriceLoading]);

  const levelModalHeader = React.useMemo(() => {
    if (!levelModal) return null;
    return (
      <View style={[s.mobCard, { marginHorizontal: 12, marginBottom: 10 }]}>
        <View style={s.mobMain}>
          <Text style={s.mobTitle} numberOfLines={2}>{levelModal.level.location_label || levelModal.level.level_name}</Text>
          <Text style={s.mobMeta} numberOfLines={1}>{compactParts([levelModal.level.object_name, levelModal.level.level_name]).join(" / ")}</Text>
          {compactParts([levelModal.level.system_name, levelModal.level.zone_name]).length ? (
            <Text style={s.mobMeta} numberOfLines={1}>{compactParts([levelModal.level.system_name, levelModal.level.zone_name]).join(" / ")}</Text>
          ) : null}
          <Text style={s.mobMeta} numberOfLines={1}>{`РџРѕР·РёС†РёРё: ${levelModal.level.total_positions} В· РњР°С‚РµСЂРёР°Р»С‹: ${sortedLevelMaterials.length}`}</Text>
        </View>
      </View>
    );
  }, [levelModal, sortedLevelMaterials.length]);

  const workModalHeader = React.useMemo(() => {
    if (!workModal) return null;
    return (
      <View style={[s.mobCard, { marginHorizontal: 12, marginBottom: 10 }]}>
        <View style={s.mobMain}>
          <Text style={s.mobTitle} numberOfLines={1}>{workModal.work_type_name}</Text>
          <Text style={s.mobMeta} numberOfLines={1}>{`Р›РѕРєР°С†РёРё: ${sortedWorkLevels.length}`}</Text>
          <Text style={s.mobMeta} numberOfLines={1}>{`РџРѕР·РёС†РёРё: ${workModal.total_positions}`}</Text>
          <Text style={s.mobMeta} numberOfLines={1}>{`РџРѕ Р·Р°СЏРІРєРµ: ${workModal.req_positions} В· РЎРІРѕР±РѕРґРЅРѕ: ${workModal.free_positions}`}</Text>
          <Text style={s.mobMeta} numberOfLines={1}>{`Р”РѕРєСѓРјРµРЅС‚РѕРІ: ${workModal.total_docs} В· РљРѕР»-РІРѕ: ${workModal.total_qty}`}</Text>
        </View>
      </View>
    );
  }, [sortedWorkLevels.length, workModal]);

  const workModalFooter = React.useMemo(() => {
    if (!topWorkMaterials.length) return null;
    return (
      <View>
        {topWorkMaterials.map((item) => (
          <React.Fragment key={workTopMaterialKeyExtractor(item)}>
            {renderWorkTopMaterialRow({ item })}
          </React.Fragment>
        ))}
      </View>
    );
  }, [renderWorkTopMaterialRow, topWorkMaterials, workTopMaterialKeyExtractor]);

  return (
    <DirectorFinanceCardModal
      visible={visible}
      onClose={handleCloseAll}
      title="Р’РµСЃСЊ РїРµСЂРёРѕРґ (РґР°С‚С‹)"
      periodShort={repPeriodShort}
      loading={repLoading}
      onOpenPeriod={onOpenPeriod}
      onRefresh={onRefresh}
      onPdf={() => void onExportProductionPdf?.()}
      onPdfSecondary={() => void onExportSubcontractPdf?.()}
      pdfPrimaryLabel={"PDF \u041f\u0440\u043e\u0438\u0437\u0432\u043e\u0434\u0441\u0442\u0432\u043e"}
      pdfSecondaryLabel={"PDF \u041f\u043e\u0434\u0440\u044f\u0434\u044b"}
      overlay={
        repPeriodOpen ? (
          <PeriodPickerSheet
            visible={repPeriodOpen}
            onClose={onClosePeriod}
            initialFrom={repFrom || ""}
            initialTo={repTo || ""}
            onApply={onApplyPeriod}
            onClear={onClearPeriod}
            ui={{
              cardBg: UI.cardBg,
              text: UI.text,
              sub: UI.sub,
              border: "rgba(255,255,255,0.14)",
              accentBlue: "#3B82F6",
              approve: "#22C55E",
            }}
          />
        ) : repObjOpen ? (
          <RNModal
            isVisible={repObjOpen}
            onBackdropPress={onCloseRepObj}
            onBackButtonPress={onCloseRepObj}
            backdropOpacity={0.55}
            useNativeDriver
            useNativeDriverForBackdrop
            hideModalContentWhileAnimating
            style={{ margin: 0, justifyContent: "flex-end" }}
          >
            <View style={s.sheet}>
              <View style={s.sheetHandle} />
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 14, paddingBottom: 10 }}>
                <Text style={{ color: UI.text, fontWeight: "900", fontSize: 16 }}>{`РћР±СЉРµРєС‚С‹ (${repOptObjects?.length ?? 0})`}</Text>
                <Pressable onPress={onCloseRepObj}><Text style={{ color: UI.sub, fontWeight: "900" }}>Р—Р°РєСЂС‹С‚СЊ</Text></Pressable>
              </View>
              <FlatList
                style={{ maxHeight: 420 }}
                data={objectOptions}
                renderItem={renderObjectOptionRow}
                keyExtractor={objectOptionKeyExtractor}
                contentContainerStyle={{ paddingBottom: 4 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              />
            </View>
          </RNModal>
        ) : levelModal ? (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: UI.bg,
            }}
          >
            <View
              style={{
                paddingTop: detailTopInset,
                paddingHorizontal: 14,
                paddingBottom: 12,
                borderBottomWidth: 1,
                borderBottomColor: UI.line,
                backgroundColor: UI.bg,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: UI.text, fontWeight: "900", fontSize: 16 }} numberOfLines={2}>{levelModalTitle}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                    <Pressable
                      onPress={() => {
                        setWorkModal(levelModal.work);
                        setLevelModal(null);
                      }}
                    >
                      <Text style={{ color: UI.sub, fontWeight: "900" }}>РќР°Р·Р°Рґ</Text>
                    </Pressable>
                    <Pressable onPress={() => setLevelModal(null)}><Text style={{ color: UI.sub, fontWeight: "900" }}>Р—Р°РєСЂС‹С‚СЊ</Text></Pressable>
                  </View>
                </View>
              </View>
            </View>
            <FlatList
              key={`level:${levelModal.work.id}:${levelModal.level.id}`}
              style={{ flex: 1 }}
              data={sortedLevelMaterials}
              renderItem={renderLevelMaterialRow}
              keyExtractor={levelMaterialKeyExtractor}
              ListHeaderComponent={levelModalHeader}
              contentContainerStyle={{ paddingTop: 12, paddingBottom: detailBottomInset }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            />
          </View>
        ) : workModal ? (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: UI.bg,
            }}
          >
            <View
              style={{
                paddingTop: detailTopInset,
                paddingHorizontal: 14,
                paddingBottom: 12,
                borderBottomWidth: 1,
                borderBottomColor: UI.line,
                backgroundColor: UI.bg,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: UI.text, fontWeight: "900", fontSize: 16 }} numberOfLines={1}>{`Р Р°Р±РѕС‚Р°: ${workModal.work_type_name}`}</Text>
                  <Pressable onPress={() => setWorkModal(null)}><Text style={{ color: UI.sub, fontWeight: "900" }}>Р—Р°РєСЂС‹С‚СЊ</Text></Pressable>
                </View>
              </View>
            </View>
            <FlatList
              key={`work:${workModal.id}`}
              style={{ flex: 1 }}
              data={sortedWorkLevels}
              renderItem={renderLevelRow}
              keyExtractor={levelKeyExtractor}
              ListHeaderComponent={workModalHeader}
              ListFooterComponent={workModalFooter}
              contentContainerStyle={{ paddingTop: 12, paddingBottom: detailBottomInset }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            />
          </View>
        ) : null
      }
    >
      <View style={{ marginBottom: 10 }}>
        <Text style={{ color: UI.sub, fontWeight: "900", marginBottom: 6 }}>РЎРєР»Р°Рґ</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          <Pressable onPress={() => void applyObjectFilter(null)} style={[s.tab, !repObjectName && s.tabActive, { marginRight: 8, marginBottom: 8 }]}>
            <Text style={{ color: !repObjectName ? UI.text : UI.sub, fontWeight: "900" }}>Р’СЃРµ</Text>
          </Pressable>
          <Pressable onPress={onOpenRepObj} style={[s.tab, repObjectName && s.tabActive, { marginRight: 8, marginBottom: 8 }]}>
            <Text style={{ color: repObjectName ? UI.text : UI.sub, fontWeight: "900" }}>{`РћР±СЉРµРєС‚С‹ В· ${(repOptObjects?.length ?? 0)}`}</Text>
          </Pressable>
          {repObjectName ? (
            <Pressable onPress={onOpenRepObj} style={[s.tab, s.tabActive, { marginRight: 8, marginBottom: 8 }]}>
              <Text numberOfLines={1} style={{ color: UI.text, fontWeight: "900", maxWidth: 220 }}>{repObjectName}</Text>
            </Pressable>
          ) : null}
          {repOptLoading ? <Text style={{ color: UI.sub, fontWeight: "800", marginLeft: 4, marginTop: 8 }}>вЂ¦</Text> : null}
        </View>
      </View>

      {repTab === "materials" ? (
        <View style={{ marginBottom: 10 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={[s.kpiPillHalf, { flex: 1 }]}>
              <Text style={s.kpiLabel}>Р”РѕРєСѓРјРµРЅС‚РѕРІ</Text>
              <Text style={s.kpiValue}>{repLoading ? "вЂ¦" : String(issuesTotal)}</Text>
            </View>
            <View style={[s.kpiPillHalf, { flex: 1 }]}>
              <Text style={s.kpiLabel}>РџРѕР·РёС†РёРё</Text>
              <Text style={s.kpiValue}>{repLoading ? "вЂ¦" : String(itemsTotal)}</Text>
            </View>
          </View>
          <View style={{ height: 8 }} />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={[s.kpiPillHalf, { flex: 1 }]}>
              <Text style={s.kpiLabel}>Р‘РµР· РѕР±СЉРµРєС‚Р°</Text>
              <Text style={s.kpiValue}>{repLoading ? "вЂ¦" : `${issuesNoObj} В· ${pct(issuesNoObj, issuesTotal)}%`}</Text>
            </View>
            <View style={[s.kpiPillHalf, { flex: 1 }]}>
              <Text style={s.kpiLabel}>Р‘РµР· Р·Р°СЏРІРєРё</Text>
              <Text style={s.kpiValue}>{repLoading ? "вЂ¦" : `${itemsNoReq} В· ${pct(itemsNoReq, itemsTotal)}%`}</Text>
            </View>
          </View>
        </View>
      ) : null}

      <View style={{ flexDirection: "row", marginBottom: 10 }}>
        {(["materials", "discipline"] as RepTab[]).map((t) => {
          const active = repTab === t;
          return (
            <Pressable key={t} onPress={() => onTabPress(t)} style={[s.tab, active && s.tabActive, { marginRight: 8 }]}>
              <Text style={{ color: active ? UI.text : UI.sub, fontWeight: "900" }}>
                {t === "materials" ? "РњР°С‚РµСЂРёР°Р»С‹" : "Р Р°Р±РѕС‚С‹"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flex: 1, minHeight: 0 }}>
        {repTab === "materials" ? (
          <FlatList
            style={{ flex: 1 }}
            data={rows}
            renderItem={renderMaterialRow}
            keyExtractor={materialRowKeyExtractor}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 4 }}
            ListEmptyComponent={!repLoading && !rows.length ? (
              <Text style={{ opacity: 0.7, color: UI.sub, paddingVertical: 8 }}>РќРµС‚ РІС‹РґР°С‡ Р·Р° РІС‹Р±СЂР°РЅРЅС‹Р№ РїРµСЂРёРѕРґ.</Text>
            ) : null}
          />
        ) : (
          <FlatList
            style={{ flex: 1 }}
            data={sortedWorks}
            renderItem={renderWorkRow}
            keyExtractor={disciplineWorkKeyExtractor}
            ListHeaderComponent={disciplineListHeader}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 4 }}
            ListEmptyComponent={!repLoading && !sortedWorks.length ? (
              <Text style={{ opacity: 0.7, color: UI.sub, paddingVertical: 8 }}>РќРµС‚ РґР°РЅРЅС‹С… РїРѕ СЂР°Р±РѕС‚Р°Рј Р·Р° РїРµСЂРёРѕРґ.</Text>
            ) : null}
          />
        )}
      </View>

      <View style={{ marginTop: 10, flexDirection: "row", gap: 8 }}>
        <Pressable
          onPress={() => Alert.alert("Excel", "РџРѕР·Р¶Рµ РґРѕР±Р°РІРёРј РІС‹РіСЂСѓР·РєСѓ Excel.")}
          style={[s.openBtn, { paddingVertical: 10, paddingHorizontal: 14, backgroundColor: UI.btnNeutral }]}
        >
          <Text style={[s.openBtnText, { fontSize: 12 }]}>Excel</Text>
        </Pressable>

        <Pressable
          onPress={() => void applyObjectFilter(null)}
          style={[s.openBtn, { paddingVertical: 10, paddingHorizontal: 14, backgroundColor: "rgba(255,255,255,0.06)" }]}
        >
          <Text style={[s.openBtnText, { fontSize: 12 }]}>Р’СЃРµ РѕР±СЉРµРєС‚С‹</Text>
        </Pressable>
      </View>
    </DirectorFinanceCardModal>
  );
}
