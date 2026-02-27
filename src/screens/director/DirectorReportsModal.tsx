import React from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import RNModal from "react-native-modal";
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

export default function DirectorReportsModal({
  visible,
  onClose,
  repData,
  repDiscipline,
  repPeriodShort,
  repLoading,
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
}: Props) {
  const kpi: RepKpi | null = (repData as any)?.kpi ?? null;
  const rows: RepRow[] = Array.isArray((repData as any)?.rows) ? (repData as any).rows : [];
  const discipline = (repDiscipline ?? (repData as any)?.discipline ?? null) as RepDisciplinePayload | null;

  const [workModal, setWorkModal] = React.useState<RepDisciplineWork | null>(null);
  const [levelModal, setLevelModal] = React.useState<{ work: RepDisciplineWork; level: RepDisciplineLevel } | null>(null);

  const issuesTotal = Number(kpi?.issues_total ?? 0);
  const issuesNoObj = Number(kpi?.issues_no_obj ?? 0);
  const itemsTotal = Number(kpi?.items_total ?? 0);
  const itemsNoReq = Number(kpi?.items_free ?? 0);

  const worksTop30 = React.useMemo(() => {
    const arr = Array.isArray(discipline?.works) ? [...discipline.works] : [];
    return arr.sort((a, b) => b.total_positions - a.total_positions).slice(0, 30);
  }, [discipline]);

  const levelsTop30 = React.useMemo(() => {
    if (!workModal) return [] as RepDisciplineLevel[];
    return [...(workModal.levels || [])].sort((a, b) => b.total_positions - a.total_positions).slice(0, 30);
  }, [workModal]);

  const materialsTop20 = React.useMemo(() => {
    if (!levelModal?.level) return [] as RepDisciplineLevel["materials"];
    return [...(levelModal.level.materials || [])].sort((a, b) => b.qty_sum - a.qty_sum).slice(0, 20);
  }, [levelModal]);
  const levelModalTitle = React.useMemo(() => {
    if (!levelModal) return "";
    const w = String(levelModal.work.work_type_name || "").trim();
    const lv = String(levelModal.level.level_name || "").trim();
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
  const ratioText = hasCostBase ? `${ratioPct}%` : "н/д";

  const onTabPress = React.useCallback((t: RepTab) => {
    setWorkModal(null);
    setLevelModal(null);
    setRepTab(t);
  }, [setRepTab]);

  const handleCloseAll = React.useCallback(() => {
    setWorkModal(null);
    setLevelModal(null);
    onClose();
  }, [onClose]);

  return (
    <DirectorFinanceCardModal
      visible={visible}
      onClose={handleCloseAll}
      title="Весь период (даты)"
      periodShort={repPeriodShort}
      loading={repLoading}
      onOpenPeriod={onOpenPeriod}
      onRefresh={onRefresh}
      onPdf={() => Alert.alert("PDF", "Позже добавим единый PDF.")}
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
                <Text style={{ color: UI.text, fontWeight: "900", fontSize: 16 }}>{`Объекты (${repOptObjects?.length ?? 0})`}</Text>
                <Pressable onPress={onCloseRepObj}><Text style={{ color: UI.sub, fontWeight: "900" }}>Закрыть</Text></Pressable>
              </View>
              <ScrollView
                style={{ maxHeight: 420 }}
                contentContainerStyle={{ paddingBottom: 4 }}
                keyboardShouldPersistTaps="handled"
              >
                {(repOptObjects || []).map((item, i) => (
                  <Pressable
                    key={`${item}:${i}`}
                    onPress={async () => {
                      onCloseRepObj();
                      await applyObjectFilter(item);
                    }}
                    style={[s.mobCard, { marginHorizontal: 12, marginBottom: 10 }]}
                  >
                    <Text style={{ color: UI.text, fontWeight: "900" }} numberOfLines={2}>{item}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </RNModal>
        ) : levelModal ? (
          <RNModal
            isVisible={!!levelModal}
            onBackdropPress={() => setLevelModal(null)}
            onBackButtonPress={() => setLevelModal(null)}
            backdropOpacity={0.55}
            useNativeDriver
            useNativeDriverForBackdrop
            hideModalContentWhileAnimating
            style={{ margin: 0, justifyContent: "flex-end" }}
          >
            <View style={s.sheet}>
              <View style={s.sheetHandle} />
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 14, paddingBottom: 10 }}>
                <Text style={{ color: UI.text, fontWeight: "900", fontSize: 16 }} numberOfLines={2}>{levelModalTitle}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                  <Pressable
                    onPress={() => {
                      setWorkModal(levelModal.work);
                      setLevelModal(null);
                    }}
                  >
                    <Text style={{ color: UI.sub, fontWeight: "900" }}>Назад</Text>
                  </Pressable>
                  <Pressable onPress={() => setLevelModal(null)}><Text style={{ color: UI.sub, fontWeight: "900" }}>Закрыть</Text></Pressable>
                </View>
              </View>
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 4 }}
                keyboardShouldPersistTaps="handled"
              >
                {materialsTop20.map((m, idx) => (
                  <View key={`${m.rik_code}:${m.uom}:${idx}`} style={[s.mobCard, { marginHorizontal: 12, marginBottom: 10 }]}>
                    <View style={s.mobMain}>
                      <Text style={s.mobTitle} numberOfLines={2}>{m.material_name}</Text>
                      <Text style={s.mobMeta} numberOfLines={1}>{`${m.qty_sum} ${m.uom || ""}`}</Text>
                      <Text style={s.mobMeta} numberOfLines={1}>
                        {`Цена: ${money(Number(m.unit_price ?? 0))} · Сумма: ${money(Number(m.amount_sum ?? 0))}`}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          </RNModal>
        ) : workModal ? (
          <RNModal
            isVisible={!!workModal}
            onBackdropPress={() => setWorkModal(null)}
            onBackButtonPress={() => setWorkModal(null)}
            backdropOpacity={0.55}
            useNativeDriver
            useNativeDriverForBackdrop
            hideModalContentWhileAnimating
            style={{ margin: 0, justifyContent: "flex-end" }}
          >
            <View style={s.sheet}>
              <View style={s.sheetHandle} />
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 14, paddingBottom: 10 }}>
                <Text style={{ color: UI.text, fontWeight: "900", fontSize: 16 }} numberOfLines={1}>{`Работа: ${workModal.work_type_name}`}</Text>
                <Pressable onPress={() => setWorkModal(null)}><Text style={{ color: UI.sub, fontWeight: "900" }}>Закрыть</Text></Pressable>
              </View>
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 4 }}
                keyboardShouldPersistTaps="handled"
              >
                {levelsTop30.map((lv) => (
                  <Pressable
                    key={lv.id}
                    onPress={() => {
                      setLevelModal({ work: workModal, level: lv });
                      setWorkModal(null);
                    }}
                    style={[s.mobCard, { marginHorizontal: 12, marginBottom: 10 }]}
                  >
                    <View style={s.mobMain}>
                      <Text style={s.mobTitle} numberOfLines={1}>{lv.level_name}</Text>
                      <Text style={s.mobMeta} numberOfLines={1}>{`Позиции: ${lv.total_positions}`}</Text>
                      <Text style={s.mobMeta} numberOfLines={1}>{`По заявке: ${lv.req_positions} · Свободно: ${lv.free_positions}`}</Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </RNModal>
        ) : null
      }
    >
      <View style={{ marginBottom: 10 }}>
        <Text style={{ color: UI.sub, fontWeight: "900", marginBottom: 6 }}>Склад</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          <Pressable onPress={() => void applyObjectFilter(null)} style={[s.tab, !repObjectName && s.tabActive, { marginRight: 8, marginBottom: 8 }]}> 
            <Text style={{ color: !repObjectName ? UI.text : UI.sub, fontWeight: "900" }}>Все</Text>
          </Pressable>
          <Pressable onPress={onOpenRepObj} style={[s.tab, repObjectName && s.tabActive, { marginRight: 8, marginBottom: 8 }]}> 
            <Text style={{ color: repObjectName ? UI.text : UI.sub, fontWeight: "900" }}>{`Объекты · ${(repOptObjects?.length ?? 0)}`}</Text>
          </Pressable>
          {repObjectName ? (
            <Pressable onPress={onOpenRepObj} style={[s.tab, s.tabActive, { marginRight: 8, marginBottom: 8 }]}> 
              <Text numberOfLines={1} style={{ color: UI.text, fontWeight: "900", maxWidth: 220 }}>{repObjectName}</Text>
            </Pressable>
          ) : null}
          {repOptLoading ? <Text style={{ color: UI.sub, fontWeight: "800", marginLeft: 4, marginTop: 8 }}>•</Text> : null}
        </View>
      </View>

      {repTab === "materials" ? (
        <View style={{ marginBottom: 10 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={[s.kpiPillHalf, { flex: 1 }]}>
              <Text style={s.kpiLabel}>Документов</Text>
              <Text style={s.kpiValue}>{repLoading ? "…" : String(issuesTotal)}</Text>
            </View>
            <View style={[s.kpiPillHalf, { flex: 1 }]}>
              <Text style={s.kpiLabel}>Позиции</Text>
              <Text style={s.kpiValue}>{repLoading ? "…" : String(itemsTotal)}</Text>
            </View>
          </View>
          <View style={{ height: 8 }} />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={[s.kpiPillHalf, { flex: 1 }]}>
              <Text style={s.kpiLabel}>Без объекта</Text>
              <Text style={s.kpiValue}>{repLoading ? "…" : `${issuesNoObj} · ${pct(issuesNoObj, issuesTotal)}%`}</Text>
            </View>
            <View style={[s.kpiPillHalf, { flex: 1 }]}>
              <Text style={s.kpiLabel}>Без заявки</Text>
              <Text style={s.kpiValue}>{repLoading ? "…" : `${itemsNoReq} · ${pct(itemsNoReq, itemsTotal)}%`}</Text>
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
                {t === "materials" ? "Материалы" : "Работы"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {repTab === "materials" ? (
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {rows.map((item, idx) => {
            const qAll = Number(item.qty_total || 0);
            const qNoReq = Number(item.qty_free || 0);
            const docs = Number(item.docs_cnt || 0);
            const docsNoReq = Number(item.docs_free || 0);
            return (
              <View key={`${item.rik_code}:${item.uom}:${idx}`} style={[s.mobCard, { marginBottom: 10 }]}> 
                <View style={s.mobMain}>
                  <Text style={s.mobTitle} numberOfLines={2}>{item.name_human_ru || item.rik_code}</Text>
                  <Text style={s.mobMeta} numberOfLines={2}>
                    {`Выдано: ${qAll} ${item.uom} · док ${docs}`}
                    {qNoReq > 0 ? ` · без заявки: ${qNoReq} (${docsNoReq} док)` : ""}
                  </Text>
                </View>
              </View>
            );
          })}
          {!repLoading && rows.length === 0 ? <Text style={{ opacity: 0.7, color: UI.sub, paddingVertical: 8 }}>Нет выдач за выбранный период.</Text> : null}
        </ScrollView>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={[s.mobCard, { marginBottom: 10, borderColor: ratioTint }]}> 
            <View style={s.mobMain}>
              <Text style={s.mobTitle}>Расход / Закупки (%)</Text>
              <Text style={[s.mobTitle, { color: ratioTint }]}>{`Расход / Закупки: ${repLoading ? "…" : ratioText}`}</Text>
              <Text style={s.mobMeta}>по стоимости за период</Text>
              {!repLoading ? (
                <Text style={s.mobMeta}>{`Расход: ${money(issueCost)} · Закупки: ${money(purchaseCost)}`}</Text>
              ) : null}
              {!repLoading && Number(disSummary?.unpriced_issue_pct ?? 0) > 0 ? (
                <Text style={s.mobMeta}>{`Неоценено: ${Number(disSummary?.unpriced_issue_pct ?? 0)}%`}</Text>
              ) : null}
              {!repLoading && !hasCostBase ? (
                <Text style={s.mobMeta}>Недостаточно цен для расчета базы закупок.</Text>
              ) : null}
            </View>
          </View>

          {worksTop30.map((w) => {
            const isMissingWork = String(w.work_type_name || "").trim().toLowerCase() === "без вида работ";
            return (
              <Pressable
                key={w.id}
                onPress={() => {
                  setLevelModal(null);
                  setWorkModal(w);
                }}
                style={[s.mobCard, { marginBottom: 10 }]}
              >
                <View style={s.mobMain}>
                  <Text style={[s.mobTitle, isMissingWork ? { color: "#EF4444" } : null]} numberOfLines={1}>{w.work_type_name}</Text>
                  <Text style={s.mobMeta} numberOfLines={1}>{`Позиции: ${w.total_positions}`}</Text>
                  <Text style={s.mobMeta} numberOfLines={1}>{`По заявке: ${w.req_positions} · Свободно: ${w.free_positions}`}</Text>
                </View>
              </Pressable>
            );
          })}

          {!repLoading && worksTop30.length === 0 ? (
            <Text style={{ opacity: 0.7, color: UI.sub, paddingVertical: 8 }}>Нет данных по работам за период.</Text>
          ) : null}
        </ScrollView>
      )}

      <View style={{ marginTop: 10, flexDirection: "row", gap: 8 }}>
        <Pressable
          onPress={() => Alert.alert("Excel", "Позже добавим выгрузку Excel.")}
          style={[s.openBtn, { paddingVertical: 10, paddingHorizontal: 14, backgroundColor: UI.btnNeutral }]}
        >
          <Text style={[s.openBtnText, { fontSize: 12 }]}>Excel</Text>
        </Pressable>

        <Pressable
          onPress={() => void applyObjectFilter(null)}
          style={[s.openBtn, { paddingVertical: 10, paddingHorizontal: 14, backgroundColor: "rgba(255,255,255,0.06)" }]}
        >
          <Text style={[s.openBtnText, { fontSize: 12 }]}>Все объекты</Text>
        </Pressable>
      </View>
    </DirectorFinanceCardModal>
  );
}
