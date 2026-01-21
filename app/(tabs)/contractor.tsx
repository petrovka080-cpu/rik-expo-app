// app/(tabs)/contractor.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Animated,
  LayoutChangeEvent,
  TextInput,
  Alert,
  Modal,
  ScrollView,
  Platform,
} from "react-native";
import { useFocusEffect } from 'expo-router';
import { supabase } from "../../src/lib/supabaseClient";
import {
  WorkMaterialsEditor,
  WorkMaterialRow,
} from "../../src/components/WorkMaterialsEditor";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

const UI = {
  bg: "#F8FAFC",
  text: "#0F172A",
  sub: "#64748B",
  border: "#E2E8F0",
  cardBg: "#FFFFFF",
  accent: "#0EA5E9",
  btnTake: "#16A34A",
};

// ---- TYPES ----
type WorkRow = {
  progress_id: string;
  work_code: string | null;
  work_name: string | null;
  object_name: string | null;
  uom_id: string | null;
  qty_planned: number;
  qty_done: number;
  qty_left: number;
  work_status: string;
  contractor_id: string | null;
  started_at?: string | null;
  finished_at?: string | null;
};

type WorkLogRow = {
  id: string;
  created_at: string;
  qty: number;
  work_uom: string | null;
  stage_note: string | null;
  note: string | null;
};

type UserProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  company: string | null;
  is_contractor: boolean;
};

type Contractor = {
  id: string;
  company_name: string | null;
  full_name: string | null;
  phone: string | null;
};

function isActiveWork(w: WorkRow): boolean {
  const status = (w.work_status || "").toLowerCase();
  const closed = ["окончено", "завершено", "закрыто"];
  const hasLeft = w.qty_left == null ? true : Number(w.qty_left) > 0;
  return hasLeft && !closed.includes(status);
}

const showErr = (e: any) =>
  Alert.alert(
    "Ошибка",
    String(e?.message || e?.error_description || e?.hint || e || "Неизвестная ошибка")
  );

const pickErr = (e: any) =>
  String(e?.message || e?.error_description || e?.hint || e || "Ошибка");

// ===== PDF по факту работы (акт) (как на складе) =====
async function generateWorkPdf(
  work: WorkRow | null,
  materials: WorkMaterialRow[],
  opts?: { actDate?: string | Date }
) {
  if (!work) return;

  try {
    const dt = opts?.actDate ? new Date(opts.actDate) : new Date();
    const dateStr = dt.toLocaleDateString("ru-RU");
    const timeStr = dt.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const objectName = work.object_name || "Объект не указан";
    const workName = work.work_name || work.work_code || "Работа";
    const actNo = work.progress_id.slice(0, 8);

    const workUrl = `https://app.goxbuild.com/work/${work.progress_id}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
      workUrl
    )}`;

    const materialsRowsHtml = materials
      .map(
        (m: any, index) => `
        <tr>
          <td style="border:1px solid #000; padding:4px; text-align:center;">${
            index + 1
          }</td>
          <td style="border:1px solid #000; padding:4px;">${m.name}</td>
          <td style="border:1px solid #000; padding:4px; text-align:center;">${
            m.uom
          }</td>
          <td style="border:1px solid #000; padding:4px; text-align:right;">${
            m.qty_fact ?? 0
          }</td>
          <td style="border:1px solid #000; padding:4px;"></td>
        </tr>
      `
      )
      .join("");

    const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 11px;
          }
          .center { text-align: center; }
          .right  { text-align: right; }
          .bold   { font-weight: bold; }
          table { border-collapse: collapse; width: 100%; }
        </style>
      </head>
      <body>
        <!-- ШАПКА АКТА -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
          <div>
            <div class="bold">Акт выполнения работ № ${actNo}</div>
            <div>Дата: ${dateStr} ${timeStr}</div>
          </div>
          <div style="text-align:right; font-size:10px;">
            <div>Приложение к договору подряда</div>
            <div>Форма условно по КС-2 / ГОСТ</div>
          </div>
        </div>

        <div style="margin-bottom:8px;">
          <div><span class="bold">Объект:</span> ${objectName}</div>
          <div><span class="bold">Работа:</span> ${workName}</div>
        </div>

        <!-- Сводка по объёму -->
        <table style="margin-top:6px; margin-bottom:12px;">
          <tr>
            <td class="bold">Плановый объём:</td>
            <td>${work.qty_planned} ${work.uom_id || ""}</td>
          </tr>
          <tr>
            <td class="bold">Выполнено по акту:</td>
            <td>${work.qty_done} ${work.uom_id || ""}</td>
          </tr>
          <tr>
            <td class="bold">Остаток по плану:</td>
            <td>${work.qty_left} ${work.uom_id || ""}</td>
          </tr>
        </table>

        <!-- Таблица материалов -->
        <div class="bold" style="margin-top:10px; margin-bottom:4px;">
          Использованные материалы (по факту)
        </div>
        <table>
          <tr>
            <th style="border:1px solid #000; padding:4px; width:5%;">№</th>
            <th style="border:1px solid #000; padding:4px;">Наименование</th>
            <th style="border:1px solid #000; padding:4px; width:10%;">Ед.</th>
            <th style="border:1px solid #000; padding:4px; width:15%;">Количество</th>
            <th style="border:1px solid #000; padding:4px; width:20%;">Примечание</th>
          </tr>
          ${
            materialsRowsHtml ||
            `
          <tr>
            <td colspan="5" style="border:1px solid #000; padding:4px; text-align:center;">
              Материалы по факту не указаны
            </td>
          </tr>`
          }
        </table>

        <!-- Подписи -->
        <div style="margin-top:24px;">
          <table style="width:100%;">
            <tr>
              <td style="width:33%; padding:4px;">Прораб</td>
              <td style="width:33%; padding:4px; border-bottom:1px solid #000;">&nbsp;</td>
              <td style="width:34%; padding:4px;">(ФИО, подпись)</td>
            </tr>
            <tr>
              <td style="padding:4px;">Мастер/Бригадир</td>
              <td style="padding:4px; border-bottom:1px solid #000;">&nbsp;</td>
              <td style="padding:4px;">(ФИО, подпись)</td>
            </tr>
            <tr>
              <td style="padding:4px;">Представитель заказчика</td>
              <td style="padding:4px; border-bottom:1px solid #000;">&nbsp;</td>
              <td style="padding:4px;">(ФИО, подпись)</td>
            </tr>
          </table>
        </div>

        <!-- QR-код и служебная инфа -->
        <div style="margin-top:16px; display:flex; justify-content:space-between; align-items:flex-end;">
          <div style="font-size:9px; color:#555;">
            Сформировано в системе GOX BUILD<br/>
            ID работы: ${work.progress_id}
          </div>
          <div style="text-align:right;">
            <div style="font-size:9px; margin-bottom:4px;">QR для проверки акта</div>
            <img src="${qrUrl}" alt="QR" />
          </div>
        </div>
      </body>
    </html>
    `;

    // WEB
    if (Platform.OS === "web") {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        Alert.alert(
          "Печать",
          "Браузер заблокировал всплывающее окно. Разреши pop-up для этого сайта."
        );
        return;
      }
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      return;
    }

    // MOBILE
    await Print.printAsync({ html });
    const { uri } = await Print.printToFileAsync({ html });

    try {
      await Sharing.shareAsync(uri);
    } catch (e) {
      console.warn("[generateWorkPdf] shareAsync error", e);
    }

    try {
      const bucket = "work-pdfs";
      const fileName = `work-${work.progress_id}-${Date.now()}.pdf`;

      const resp = await fetch(uri);
      const blob = await resp.blob();

      const uploadRes = await supabase.storage
        .from(bucket)
        .upload(fileName, blob, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadRes.error) {
        console.warn(
          "[generateWorkPdf] upload error:",
          uploadRes.error.message
        );
      } else {
        console.log(
          "[generateWorkPdf] uploaded to storage:",
          uploadRes.data.path
        );
      }
    } catch (e) {
      console.warn("[generateWorkPdf] storage error", e);
    }
  } catch (e: any) {
    console.warn("[generateWorkPdf] general error", e);
    Alert.alert("Ошибка PDF", String(e?.message || e));
  }
}

// ===== Свод по работе: все акты + материалы (как на складе) =====
async function loadAggregatedWorkSummary(
  progressId: string,
  baseWork: WorkRow
): Promise<{ work: WorkRow; materials: WorkMaterialRow[] }> {
  const logsQ = await supabase
    .from("work_progress_log" as any)
    .select("id, qty")
    .eq("progress_id", progressId);

  if (logsQ.error || !Array.isArray(logsQ.data) || logsQ.data.length === 0) {
    return { work: baseWork, materials: [] };
  }

  const logIds = (logsQ.data as any[]).map((l) => String(l.id));
  const totalQty = (logsQ.data as any[]).reduce(
    (sum, l) => sum + Number(l.qty ?? 0),
    0
  );

  const matsQ = await supabase
    .from("work_progress_log_materials" as any)
    .select("log_id, mat_code, uom_mat, qty_fact")
    .in("log_id", logIds);

  let aggregated: WorkMaterialRow[] = [];

  if (!matsQ.error && Array.isArray(matsQ.data) && matsQ.data.length > 0) {
    const aggMap = new Map<string, { mat_code: string; uom: string; qty: number }>();

    for (const m of matsQ.data as any[]) {
      const code = String(m.mat_code);
      const uom = m.uom_mat ? String(m.uom_mat) : "";
      const qty = Number(m.qty_fact ?? 0) || 0;
      if (!qty) continue;

      const key = `${code}||${uom}`;
      const prev = aggMap.get(key) || { mat_code: code, uom, qty: 0 };
      prev.qty += qty;
      aggMap.set(key, prev);
    }

    const aggArr = Array.from(aggMap.values());
    const codes = aggArr.map((a) => a.mat_code);
    const namesMap: Record<string, { name: string; uom: string | null }> = {};

    if (codes.length) {
      const ci = await supabase
        .from("catalog_items" as any)
        .select("rik_code, name_human_ru, name_human, uom_code")
        .in("rik_code", codes);

      if (!ci.error && Array.isArray(ci.data)) {
        for (const n of ci.data as any[]) {
          const code = String(n.rik_code);
          const name = n.name_human_ru || n.name_human || code;
          const uom = n.uom_code ?? null;
          namesMap[code] = { name, uom };
        }
      }
    }

    aggregated = aggArr.map((a) => {
      const meta = namesMap[a.mat_code];
      return {
        mat_code: a.mat_code,
        name: meta?.name || a.mat_code,
        uom: meta?.uom || a.uom || "",
        available: 0,
        qty_fact: a.qty,
      } as any as WorkMaterialRow;
    });
  }

  const work: WorkRow = {
    ...baseWork,
    qty_done: totalQty,
    qty_left: Math.max(0, baseWork.qty_planned - totalQty),
  };

  return { work, materials: aggregated };
}

// debounce helper
function debounce<F extends (...args: any[]) => any>(fn: F, delay: number) {
  let timer: any;
  return (...args: Parameters<F>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ---- MAIN SCREEN ----
export default function ContractorScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [code, setCode] = useState("");
  const [activating, setActivating] = useState(false);

  const [rows, setRows] = useState<WorkRow[]>([]);
  const [loadingWorks, setLoadingWorks] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const [tab, setTab] = useState<"available" | "mine">("available");
const focusedRef = useRef(false);
const lastKickRef = useRef(0);

  const slider = useRef(new Animated.Value(0)).current;
  const [trackWidth, setTrackWidth] = useState(0);

  const handleTrackLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  useEffect(() => {
    Animated.spring(slider, {
      toValue: tab === "available" ? 0 : 1,
      useNativeDriver: false,
    }).start();
  }, [tab, slider]);

  // ===== МОДАЛКА РАБОТ КАК НА СКЛАДЕ =====
  const [workModalVisible, setWorkModalVisible] = useState(false);
  const [workModalRow, setWorkModalRow] = useState<WorkRow | null>(null);
  const [workModalQty, setWorkModalQty] = useState("");
  const [workModalStage, setWorkModalStage] = useState("");
  const [workModalComment, setWorkModalComment] = useState("");
  const [workModalMaterials, setWorkModalMaterials] = useState<WorkMaterialRow[]>(
    []
  );
  const [workModalSaving, setWorkModalSaving] = useState(false);
  const [workModalLocation, setWorkModalLocation] = useState("");
  const [workModalReadOnly, setWorkModalReadOnly] = useState(false);
  const [workModalLoading, setWorkModalLoading] = useState(false);
  const [workLog, setWorkLog] = useState<WorkLogRow[]>([]);
  const [workStageOptions, setWorkStageOptions] = useState<
    { code: string; name: string }[]
  >([]);
  const [workStagePickerVisible, setWorkStagePickerVisible] = useState(false);
  const [workSearchVisible, setWorkSearchVisible] = useState(false);
  const [workSearchQuery, setWorkSearchQuery] = useState("");
  const [workSearchResults, setWorkSearchResults] = useState<WorkMaterialRow[]>(
    []
  );
  const workSearchActiveQuery = useRef<string>("");

  // ---- LOAD USER PROFILE ----
  const loadProfile = useCallback(async () => {
    if (!focusedRef.current) return;
setLoadingProfile(true);
    const { data: auth } = await supabase.auth.getUser();

    if (!auth.user) {
      setProfile(null);
      setLoadingProfile(false);
      return;
    }

    const { data } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (data) {
      setProfile({
        id: auth.user.id,
        full_name: data.full_name,
        phone: data.phone,
        company: data.company,
        is_contractor: data.is_contractor === true,
      });
    }

    setLoadingProfile(false);
  }, []);

  // ---- LOAD CONTRACTOR (из таблицы contractors по user_id) ----
  const loadContractor = useCallback(async () => {
if (!focusedRef.current) return;

  setLoadingWorks(true);
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) {
      setContractor(null);
      return;
    }

    const { data, error } = await supabase
      .from("contractors")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("[contractor] loadContractor error:", error.message);
    }

    if (data) {
      setContractor({
        id: data.id,
        company_name: data.company_name ?? null,
        full_name: data.full_name ?? null,
        phone: data.phone ?? null,
      });
    } else {
      setContractor(null);
    }
  }, []);

  // ---- LOAD WORKS ----
 const loadWorks = useCallback(async () => {
  if (!focusedRef.current) return;

  setLoadingWorks(true);

    const { data, error } = await supabase
      .from("v_works_fact")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("loadWorks error:", error);
      setRows([]);
      setLoadingWorks(false);
      return;
    }

    const mapped: WorkRow[] = (data ?? []).map((x: any) => ({
  progress_id: x.progress_id,
  work_code: x.work_code ?? null,
  work_name: x.work_name,
  object_name: x.object_name,
  uom_id: x.uom_id,
  qty_planned: Number(x.qty_planned ?? 0),
  qty_done: Number(x.qty_done ?? 0),
  qty_left: Number(x.qty_left ?? 0),
  work_status: x.work_status,
  contractor_id: x.contractor_id,
  started_at: x.started_at ?? null,
  finished_at: x.finished_at ?? null,
}));

// ✅ PROD: подрядчики видят только работы/услуги (не материалы)
const filtered = mapped.filter((r) => {
  const c = String(r.work_code ?? "").toUpperCase();
  return (
    c.startsWith("WRK-") ||
    c.startsWith("WORK-") ||
    c.startsWith("WT-") ||
    c.startsWith("SRV-") ||
    c.startsWith("SPEC-")
  );
});

setRows(filtered);


    setLoadingWorks(false);
  }, []);

  // ---- ACTIVATE CODE ----
  const activateCode = async () => {
    if (!code.trim()) return;

    try {
      setActivating(true);

      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) return;

      // ТЕСТОВО: просто включаем флаг is_contractor
      const { error } = await supabase
        .from("user_profiles")
        .update({ is_contractor: true })
        .eq("user_id", user.id);

      if (error) throw error;

      Alert.alert("Готово", "Доступ подрядчика активирован.");
      await loadProfile();
      await loadContractor();
      await loadWorks();
    } catch (e: any) {
      Alert.alert("Ошибка", e.message);
    } finally {
      setActivating(false);
    }
  };

  // ---- TAKE WORK ----
  const takeWork = async (w: WorkRow) => {
    if (!profile?.is_contractor) {
      Alert.alert("Ошибка", "Сначала активируйте доступ подрядчика.");
      return;
    }

    if (!contractor) {
      Alert.alert(
        "Подрядчик",
        "В тестовом режиме нужно создать запись подрядчика в таблице contractors для этого пользователя."
      );
      return;
    }

    try {
      setActingId(w.progress_id);

      const { error } = await supabase
        .from("work_progress")
        .update({
          contractor_id: contractor.id,
          contractor_name:
            contractor.company_name ||
            contractor.full_name ||
            profile.company ||
            profile.full_name ||
            null,
        })
        .eq("id", w.progress_id)
        .is("contractor_id", null);

      if (error) throw error;

      await loadWorks();
      setTab("mine");
    } catch (e: any) {
      Alert.alert("Ошибка", e.message || "Не удалось взять работу");
    } finally {
      setActingId(null);
    }
  };

  // ---- START WORK (аналог handleWorkStart на складе) ----
  const startWork = async (w: WorkRow) => {
    try {
      setActingId(w.progress_id);
      const { error } = await supabase.rpc("work_start" as any, {
        p_progress_id: w.progress_id,
      } as any);
      if (error) throw error;
      await loadWorks();
    } catch (e: any) {
      Alert.alert("Ошибка", e.message ?? "Не удалось начать работу");
    } finally {
      setActingId(null);
    }
  };

  // ---- ЗАВЕРШИТЬ РАБОТУ ----
  const finishWork = async (w: WorkRow) => {
    if (w.qty_done <= 0) {
      Alert.alert(
        "Работа не выполнена",
        "Нельзя завершить работу с нулевым объёмом. Сначала внесите факт."
      );
      return;
    }

    try {
      setActingId(w.progress_id);
      const { error } = await supabase.rpc("work_finish" as any, {
        p_progress_id: w.progress_id,
      } as any);
      if (error) throw error;

      Alert.alert("Готово", "Работа завершена");
      await loadWorks();
    } catch (e: any) {
      console.warn("[contractor] finishWork error:", e);
      Alert.alert("Ошибка", e.message ?? "Не удалось завершить работу");
    } finally {
      setActingId(null);
    }
  };

  // ====== ЛОГИКА МОДАЛКИ "ФАКТ ВЫПОЛНЕНИЯ" (КАК НА СКЛАДЕ) ======

  // история актов
  const loadWorkLog = useCallback(async (progressId: string) => {
    try {
      const { data, error } = await supabase
        .from("work_progress_log" as any)
        .select("id, created_at, qty, work_uom, stage_note, note")
        .eq("progress_id", progressId)
        .order("created_at", { ascending: true });

      if (!error && Array.isArray(data)) {
        setWorkLog(
          data.map((r: any) => ({
            id: String(r.id),
            created_at: r.created_at,
            qty: Number(r.qty ?? 0),
            work_uom: r.work_uom ?? null,
            stage_note: r.stage_note ?? null,
            note: r.note ?? null,
          }))
        );
      } else {
        setWorkLog([]);
      }
    } catch (e) {
      console.warn("[loadWorkLog] error", e);
      setWorkLog([]);
    }
  }, []);

  // открыть модалку (как openWorkAddModal в warehouse.tsx)
  const openWorkAddModal = useCallback(
    (row: WorkRow, readOnly: boolean = false) => {
      setWorkModalRow(row);
      setWorkModalQty("");
      setWorkModalStage("");
      setWorkModalComment("");
      setWorkModalLocation("");
      setWorkModalReadOnly(readOnly);

      setWorkLog([]);
      setWorkModalMaterials([]);
      setWorkStageOptions([]);
      setWorkSearchVisible(false);
      setWorkSearchQuery("");
      setWorkSearchResults([]);

      setWorkModalVisible(true);
      setWorkModalLoading(true);

      (async () => {
        try {
          // история
          await loadWorkLog(row.progress_id);

          if (!readOnly) {
            setWorkModalMaterials([]);

            try {
              // последний лог — восстановление материалов
              const lastLogQ = await supabase
                .from("work_progress_log" as any)
                .select("id, qty, work_uom, stage_note, note")
                .eq("progress_id", row.progress_id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

              let restoredMaterials: WorkMaterialRow[] = [];

              if (!lastLogQ.error && lastLogQ.data?.id) {
                const logId = String(lastLogQ.data.id);

                const matsQ = await supabase
                  .from("work_progress_log_materials" as any)
                  .select("mat_code, uom_mat, qty_fact")
                  .eq("log_id", logId);

                if (
                  !matsQ.error &&
                  Array.isArray(matsQ.data) &&
                  matsQ.data.length
                ) {
                  const codes = matsQ.data
                    .map((m: any) => m.mat_code)
                    .filter(Boolean);
                  let namesMap: Record<
                    string,
                    { name: string; uom: string | null }
                  > = {};

                  if (codes.length) {
                    const ci = await supabase
                      .from("catalog_items" as any)
                      .select(
                        "rik_code, name_human_ru, name_human, uom_code"
                      )
                      .in("rik_code", codes);

                    if (!ci.error && Array.isArray(ci.data)) {
                      for (const n of ci.data as any[]) {
                        const code = String(n.rik_code);
                        const name =
                          n.name_human_ru || n.name_human || code;
                        const uom = n.uom_code ?? null;
                        namesMap[code] = { name, uom };
                      }
                    }
                  }

                  restoredMaterials = matsQ.data.map((m: any) => {
                    const code = String(m.mat_code);
                    const meta = namesMap[code];
                    return {
                      mat_code: code,
                      name: meta?.name || code,
                      uom: meta?.uom || m.uom_mat || row.uom_id || "",
                      available: 0,
                      qty_fact: Number(m.qty_fact ?? 0),
                    } as any as WorkMaterialRow;
                  });
                }
              }

              if (restoredMaterials.length) {
                setWorkModalMaterials(restoredMaterials);
              } else {
                const workCode = row.work_code;

                if (workCode) {
                  let defaults: any[] = [];

                  const q1 = await supabase
                    .from("work_default_materials" as any)
                    .select("*")
                    .eq("work_code", workCode)
                    .limit(100);

                  if (!q1.error && Array.isArray(q1.data) && q1.data.length) {
                    defaults = q1.data;
                  } else {
                    const seed = await supabase.rpc(
                      "work_seed_defaults_auto" as any,
                      { p_work_code: workCode } as any
                    );

                    if (!seed.error) {
                      const q2 = await supabase
                        .from("work_default_materials" as any)
                        .select("*")
                        .eq("work_code", workCode)
                        .limit(100);

                      if (!q2.error && Array.isArray(q2.data)) {
                        defaults = q2.data;
                      }
                    } else {
                      console.warn(
                        "[work_seed_defaults_auto] error:",
                        seed.error.message
                      );
                    }
                  }

                  if (defaults.length) {
                    const codes = defaults
                      .map((d: any) => d.mat_code)
                      .filter((c: any) => !!c);

                    const namesMap: Record<
                      string,
                      { name: string; uom: string | null }
                    > = {};
                    if (codes.length) {
                      const ci = await supabase
                        .from("catalog_items" as any)
                        .select(
                          "rik_code, name_human_ru, name_human, uom_code"
                        )
                        .in("rik_code", codes);

                      if (!ci.error && Array.isArray(ci.data)) {
                        for (const n of ci.data as any[]) {
                          const code = String(n.rik_code);
                          const name =
                            n.name_human_ru || n.name_human || code;
                          const uom = n.uom_code ?? null;
                          namesMap[code] = { name, uom };
                        }
                      }
                    }

                    const mats: WorkMaterialRow[] = defaults.map((d: any) => {
                      const code = String(d.mat_code);
                      const meta = namesMap[code];

                      return {
                        mat_code: code,
                        name: meta?.name || code,
                        uom:
                          meta?.uom ||
                          String(d.uom || row.uom_id || ""),
                        available: 0,
                        qty_fact: 0,
                      } as any as WorkMaterialRow;
                    });

                    setWorkModalMaterials(mats);
                  }
                }
              }
            } catch (e) {
              console.warn("[openWorkAddModal] materials error:", e);
            }
          }

          // этапы работ
          try {
            const { data, error } = await supabase
              .from("work_stages" as any)
              .select("code, name")
              .eq("is_active", true)
              .order("sort_order", { ascending: true });
            if (!error && Array.isArray(data)) {
              setWorkStageOptions(
                data.map((s: any) => ({
                  code: String(s.code),
                  name: String(s.name),
                }))
              );
            } else {
              setWorkStageOptions([]);
            }
          } catch (e) {
            console.warn("[openWorkAddModal] work_stages error:", e);
            setWorkStageOptions([]);
          }
        } finally {
          setWorkModalLoading(false);
        }
      })();
    },
    [loadWorkLog]
  );

  // RPC-поиск материалов (как в warehouse)
  const runMaterialSearch = useCallback(async (q: string) => {
    try {
      const { data, error } = await supabase.rpc("catalog_search" as any, {
        p_query: q,
        p_kind: "material",
      } as any);

      if (workSearchActiveQuery.current !== q) return;

      if (error) {
        console.warn("[material_search/catalog_search] error:", error.message);
        return;
      }
      if (!Array.isArray(data)) return;

      const mapped: WorkMaterialRow[] = (data as any[]).map((d) => {
        const rawName =
          (d.name_human_ru as string) ??
          (d.name_human as string) ??
          (d.rik_code as string) ??
          "";
        const cleanName = String(rawName).replace(/\s+/g, " ").trim();

        return {
          mat_code: d.rik_code,
          name: cleanName,
          uom: d.uom_code,
          available: Number(d.qty_available ?? 0),
          qty_fact: 0,
        } as any as WorkMaterialRow;
      });

      mapped.sort((a: any, b: any) => {
        const aHas = a.available > 0 ? 0 : 1;
        const bHas = b.available > 0 ? 0 : 1;
        if (aHas !== bHas) return aHas - bHas;
        if (b.available !== a.available) return b.available - a.available;
        return a.name.localeCompare(b.name, "ru");
      });

      setWorkSearchResults(mapped);
    } catch (e: any) {
      if (workSearchActiveQuery.current !== q) return;
      console.warn(
        "[material_search/catalog_search] exception:",
        e?.message || e
      );
    }
  }, []);

  const debouncedMaterialSearch = useRef(
    debounce((q: string) => {
      runMaterialSearch(q);
    }, 300)
  ).current;

  const handleWorkSearchChange = useCallback(
    (text: string) => {
      setWorkSearchQuery(text);

      const q = text.trim();
      workSearchActiveQuery.current = q;

      if (q.length < 2) {
        setWorkSearchResults([]);
        return;
      }

      debouncedMaterialSearch(q);
    },
    [debouncedMaterialSearch]
  );

  const addWorkMaterial = useCallback((item: WorkMaterialRow) => {
    setWorkModalMaterials((prev) => {
      const idx = prev.findIndex(
        (m: any) => m.mat_code === (item as any).mat_code
      );
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          name: (item as any).name,
          uom: (item as any).uom,
          available: (item as any).available,
        };
        return copy;
      }
      return [...prev, item];
    });

    setWorkSearchVisible(false);
    setWorkSearchQuery("");
    setWorkSearchResults([]);
  }, []);

  const closeWorkModal = useCallback(() => {
    setWorkSearchVisible(false);
    setWorkSearchQuery("");
    setWorkSearchResults([]);
    setWorkModalVisible(false);
  }, []);

  const submitWorkProgress = useCallback(
    async (withStock: boolean) => {
      if (!workModalRow) return;

      if (workModalRow.qty_left <= 0) {
        Alert.alert(
          "Работа завершена",
          "Плановый объём выполнен полностью. Для дополнительного объёма сначала увеличь план в смете."
        );
        return;
      }

      const qtyNum = Number(String(workModalQty).replace(",", "."));
      if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
        Alert.alert("Объём", "Введи выполненный объём > 0");
        return;
      }

      const left = Number(workModalRow.qty_left ?? 0);
      if (left <= 0) {
        Alert.alert("План закрыт", "По этой работе уже нет остатка по плану.");
        return;
      }

      if (qtyNum > left) {
        Alert.alert(
          "Объём больше остатка",
          `Осталось по плану максимум ${left} ${
            workModalRow.uom_id || ""
          }.`
        );
        return;
      }

      const materialsPayload = workModalMaterials
        .map((m: any) => {
          const raw = m.qty_fact ?? m.qty ?? 0;
          const fact = Number(String(raw).replace(",", "."));
          return {
            mat_code: m.mat_code,
            uom: m.uom,
            qty_fact: Number.isFinite(fact) ? fact : 0,
          };
        })
        .filter((m) => m.qty_fact > 0);

      try {
        setWorkModalSaving(true);

        const payload: any = {
          p_progress_id: workModalRow.progress_id,
          p_qty: qtyNum,
          p_work_uom: workModalRow.uom_id || "",
          p_stage_note: workModalStage || null,
          p_note: workModalComment || null,
          p_materials: materialsPayload,
          p_with_stock: withStock,
          p_location: workModalLocation || null,
        };

        const { data, error } = await supabase.rpc(
          "work_progress_apply_ui" as any,
          payload
        );
        console.log("[contractor][submitWorkProgress] result:", { data, error });

        if (error) {
          Alert.alert("Ошибка сохранения факта", pickErr(error));
          return;
        }

        const updatedWork: WorkRow = {
          ...workModalRow,
          qty_done: workModalRow.qty_done + qtyNum,
          qty_left: Math.max(0, workModalRow.qty_left - qtyNum),
        };

        await generateWorkPdf(updatedWork, workModalMaterials as any);

        Alert.alert("Готово", "Факт по работе сохранён.");
        setWorkModalVisible(false);
        await loadWorks();
      } catch (e: any) {
        console.warn("[submitWorkProgress] exception:", e);
        showErr(e);
      } finally {
        setWorkModalSaving(false);
      }
    },
    [
      workModalRow,
      workModalQty,
      workModalStage,
      workModalComment,
      workModalMaterials,
      workModalLocation,
      loadWorks,
    ]
  );

  // ДОСТУПНЫЕ РАБОТЫ
  const availableRows = useMemo(() => {
    return rows.filter((r) => {
      if (r.contractor_id) return false;
      if (!isActiveWork(r)) return false;

      const code = (r.work_code || "").toUpperCase();
      if (!code) return false;
      if (code.startsWith("MAT-") || code.startsWith("KIT-")) return false;

      const status = (r.work_status || "").toLowerCase();
      if (!status.includes("к запуску")) return false;

      return true;
    });
  }, [rows]);

  // МОИ РАБОТЫ
  const myRows = useMemo(
    () =>
      contractor ? rows.filter((r) => r.contractor_id === contractor.id) : [],
    [rows, contractor]
  );

  useFocusEffect(
  useCallback(() => {
    focusedRef.current = true;

    const now = Date.now();
    if (now - lastKickRef.current > 900) {
      lastKickRef.current = now;
      (async () => {
        await loadProfile();
        await loadContractor();
        await loadWorks();
      })();
    }

    return () => {
      focusedRef.current = false;
    };
  }, [loadProfile, loadContractor, loadWorks])
);


  if (loadingProfile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Загрузка профиля…</Text>
      </View>
    );
  }

  // ---- USER IS NOT CONTRACTOR → SHOW CODE INPUT ----
  if (!profile?.is_contractor) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Подрядчик — вход</Text>

        <Text style={{ marginTop: 12, fontSize: 14 }}>
          Введите код доступа, который отправил вам директор:
        </Text>

        <TextInput
          placeholder="Например: A3F9-C8ZD"
          value={code}
          onChangeText={setCode}
          style={styles.input}
        />

        <Pressable
          onPress={activateCode}
          disabled={activating}
          style={styles.activateBtn}
        >
          <Text style={styles.activateText}>
            {activating ? "Проверяем…" : "Активировать"}
          </Text>
        </Pressable>
      </View>
    );
  }

  // ---- CONTRACTOR ACTIVE → SHOW WORKS ----
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Подрядчик — работы</Text>
      </View>

      {/* CONTRACTOR INFO */}
      <View style={styles.contractorCard}>
        <Text style={styles.contractorName}>
          {contractor?.company_name ?? profile.company ?? "Компания"}
        </Text>
        <Text style={styles.contractorSub}>
          {contractor?.full_name ?? profile.full_name}
        </Text>
        <Text style={styles.contractorSub}>
          {contractor?.phone ?? profile.phone}
        </Text>
      </View>

      {/* TABS */}
      <View style={styles.segmentWrapper}>
        <View style={styles.segmentTrack} onLayout={handleTrackLayout}>
          {trackWidth > 0 && (
            <Animated.View
              style={[
                styles.segmentThumb,
                {
                  width: trackWidth / 2,
                  left: slider.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, trackWidth / 2],
                  }),
                },
              ]}
            />
          )}

          <View style={styles.segmentRow}>
            <Pressable
              onPress={() => setTab("available")}
              style={styles.segmentTab}
            >
              <Text
                style={[
                  styles.segmentText,
                  tab === "available" && styles.segmentActive,
                ]}
              >
                ДОСТУПНЫЕ ({availableRows.length})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setTab("mine")}
              style={styles.segmentTab}
            >
              <Text
                style={[
                  styles.segmentText,
                  tab === "mine" && styles.segmentActive,
                ]}
              >
                МОИ ({myRows.length})
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* WORK LIST */}
      <FlatList
        data={tab === "available" ? availableRows : myRows}
        keyExtractor={(i) => i.progress_id}
        renderItem={({ item }) =>
          tab === "available" ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.work_name}</Text>
              <Text style={styles.cardMeta}>Объект: {item.object_name}</Text>
              <Pressable
                onPress={() => takeWork(item)}
                disabled={actingId === item.progress_id}
                style={styles.takeBtn}
              >
                <Text style={styles.takeText}>
                  {actingId === item.progress_id ? "..." : "ВЗЯТЬ В РАБОТУ"}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.work_name}</Text>
              <Text style={styles.cardMeta}>Объект: {item.object_name}</Text>
              <Text style={styles.cardMeta}>
                Прогресс: {item.qty_done}/{item.qty_planned} {item.uom_id}
              </Text>
              <Text style={styles.cardMeta}>Статус: {item.work_status}</Text>

              <View
                style={{
                  height: 6,
                  borderRadius: 999,
                  backgroundColor: "#E5E7EB",
                  marginTop: 6,
                }}
              >
                <View
                  style={{
                    height: "100%",
                    borderRadius: 999,
                    width: `${
                      item.qty_planned > 0
                        ? Math.min(
                            100,
                            Math.round((item.qty_done / item.qty_planned) * 100)
                          )
                        : 0
                    }%`,
                    backgroundColor: "#0EA5E9",
                  }}
                />
              </View>

              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 10,
                }}
              >
                {/* НАЧАТЬ */}
                {item.work_status === "К запуску" && (
                  <Pressable
                    onPress={() => startWork(item)}
                    disabled={actingId === item.progress_id}
                    style={[
                      styles.takeBtn,
                      { backgroundColor: "#0EA5E9" },
                      actingId === item.progress_id && { opacity: 0.7 },
                    ]}
                  >
                    <Text style={styles.takeText}>
                      {actingId === item.progress_id ? "..." : "НАЧАТЬ"}
                    </Text>
                  </Pressable>
                )}

                {/* + ОБЪЁМ — ОТКРЫВАЕТ МОДАЛКУ КАК НА СКЛАДЕ */}
                <Pressable
                  onPress={() => openWorkAddModal(item)}
                  disabled={actingId === item.progress_id}
                  style={[
                    styles.takeBtn,
                    { backgroundColor: "#22C55E" },
                    actingId === item.progress_id && { opacity: 0.7 },
                  ]}
                >
                  <Text style={styles.takeText}>
                    {actingId === item.progress_id ? "..." : "+ ОБЪЁМ"}
                  </Text>
                </Pressable>

                {/* ОКОНЧЕНО */}
                <Pressable
                  onPress={() => finishWork(item)}
                  disabled={actingId === item.progress_id}
                  style={[
                    styles.takeBtn,
                    { backgroundColor: "#16A34A" },
                    actingId === item.progress_id && { opacity: 0.7 },
                  ]}
                >
                  <Text style={styles.takeText}>
                    {actingId === item.progress_id ? "..." : "ОКОНЧЕНО"}
                  </Text>
                </Pressable>
              </View>
            </View>
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing || loadingWorks}
            onRefresh={async () => {
              setRefreshing(true);
              await loadProfile();
              await loadContractor();
              await loadWorks();
              setRefreshing(false);
            }}
          />
        }
      />

      {/* ===== МОДАЛКА ФАКТА ВЫПОЛНЕНИЯ (ИДЕНТИЧНАЯ СКЛАДУ) ===== */}
      <Modal
        visible={workModalVisible}
        animationType="slide"
        onRequestClose={closeWorkModal}
      >
        <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
          <View style={{ padding: 16, paddingBottom: 8 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", marginBottom: 12 }}>
              Факт выполнения работы
            </Text>

            {workModalLoading && (
              <Text
                style={{
                  fontSize: 12,
                  color: "#94a3b8",
                  marginBottom: 4,
                }}
              >
                Загружаем историю и материалы…
              </Text>
            )}

            {/* Итоговый акт PDF */}
            <Pressable
              onPress={async () => {
                if (!workModalRow) return;
                try {
                  const { work, materials } = await loadAggregatedWorkSummary(
                    workModalRow.progress_id,
                    workModalRow
                  );
                  await generateWorkPdf(work, materials as any);
                } catch (e) {
                  console.warn("[PDF aggregated] error", e);
                  showErr(e);
                }
              }}
              style={{
                alignSelf: "flex-start",
                backgroundColor: "#0ea5e9",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
                marginBottom: 4,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>
                Итоговый акт (PDF)
              </Text>
            </Pressable>
            <Text
              style={{
                fontSize: 12,
                color: "#64748b",
                marginBottom: 12,
              }}
            >
              Свод всех этапов и материалов по работе
            </Text>

            {workModalRow && (
              <View
                style={{
                  backgroundColor: "#fff",
                  padding: 14,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#e2e8f0",
                }}
              >
                <Text
                  style={{
                    fontWeight: "800",
                    fontSize: 16,
                    marginBottom: 6,
                  }}
                >
                  {workModalRow.work_name ||
                    workModalRow.work_code ||
                    "Работа"}
                </Text>

                <Text style={{ color: "#475569", marginBottom: 4 }}>
                  <Text style={{ fontWeight: "600" }}>Объект: </Text>
                  {workModalRow.object_name || "Не указан"}
                </Text>

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <View>
                    <Text style={{ color: "#64748b", fontSize: 12 }}>
                      План
                    </Text>
                    <Text style={{ fontWeight: "700" }}>
                      {workModalRow.qty_planned} {workModalRow.uom_id}
                    </Text>
                  </View>
                  <View>
                    <Text style={{ color: "#64748b", fontSize: 12 }}>
                      Выполнено
                    </Text>
                    <Text style={{ fontWeight: "700" }}>
                      {workModalRow.qty_done} {workModalRow.uom_id}
                    </Text>
                  </View>
                  <View>
                    <Text style={{ color: "#64748b", fontSize: 12 }}>
                      Остаток
                    </Text>
                    <Text
                      style={{
                        fontWeight: "700",
                        color:
                          workModalRow.qty_left <= 0
                            ? "#dc2626"
                            : "#0f172a",
                      }}
                    >
                      {workModalRow.qty_left} {workModalRow.uom_id}
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    height: 8,
                    borderRadius: 8,
                    backgroundColor: "#e2e8f0",
                    marginVertical: 8,
                  }}
                >
                  <View
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          (Number(workModalRow.qty_done || 0) /
                            Math.max(
                              Number(workModalRow.qty_planned || 0),
                              1
                            )) *
                            100
                        )
                      )}%`,
                      height: "100%",
                      backgroundColor: "#0ea5e9",
                      borderRadius: 8,
                    }}
                  />
                </View>

                <Text style={{ fontSize: 12, color: "#64748b" }}>
                  Прогресс:{" "}
                  {Math.round(
                    (Number(workModalRow.qty_done || 0) /
                      Math.max(
                        Number(workModalRow.qty_planned || 0),
                        1
                      )) *
                      100
                  )}
                  %
                </Text>
              </View>
            )}
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: 24,
            }}
          >
            {workModalRow && (
              <>
                {/* История актов */}
                <View
                  style={{
                    marginTop: 8,
                    marginBottom: 8,
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#e2e8f0",
                    backgroundColor: "#fff",
                    gap: 6,
                  }}
                >
                  <Text style={{ fontWeight: "700", marginBottom: 4 }}>
                    История актов по работе
                  </Text>

                  {workLog.length === 0 && (
                    <Text style={{ color: "#94a3b8", fontSize: 12 }}>
                      Пока нет зафиксированных актов по этой работе.
                    </Text>
                  )}

                  {workLog.map((log) => {
                    const dt = new Date(
                      log.created_at
                    ).toLocaleString("ru-RU");
                    return (
                      <View
                        key={log.id}
                        style={{
                          paddingVertical: 6,
                          borderBottomWidth: 1,
                          borderColor: "#f1f5f9",
                        }}
                      >
                        <Text
                          style={{
                            fontWeight: "600",
                            color: "#0f172a",
                          }}
                        >
                          {dt} • {log.qty}{" "}
                          {log.work_uom || workModalRow.uom_id || ""}
                        </Text>

                        {log.stage_note && (
                          <Text
                            style={{ color: "#64748b", fontSize: 12 }}
                          >
                            Этап: {log.stage_note}
                          </Text>
                        )}

                        {log.note && (
                          <Text
                            style={{ color: "#94a3b8", fontSize: 12 }}
                          >
                            Комментарий: {log.note}
                          </Text>
                        )}

                        {/* PDF по конкретному акту */}
                        <Pressable
                          onPress={async () => {
                            try {
                              const { data: mats } = await supabase
                                .from(
                                  "work_progress_log_materials" as any
                                )
                                .select("mat_code, uom_mat, qty_fact")
                                .eq("log_id", log.id);

                              const codes =
                                (mats || []).map(
                                  (m: any) => m.mat_code
                                ) || [];
                              let namesMap: Record<
                                string,
                                { name: string; uom: string | null }
                              > = {};

                              if (codes.length) {
                                const ci = await supabase
                                  .from("catalog_items" as any)
                                  .select(
                                    "rik_code, name_human_ru, name_human, uom_code"
                                  )
                                  .in("rik_code", codes);

                                if (!ci.error && Array.isArray(ci.data)) {
                                  for (const n of ci.data as any[]) {
                                    namesMap[n.rik_code] = {
                                      name:
                                        n.name_human_ru ||
                                        n.name_human ||
                                        n.rik_code,
                                      uom: n.uom_code,
                                    };
                                  }
                                }
                              }

                              const matsRows: WorkMaterialRow[] = (
                                (mats as any[]) || []
                              ).map((m: any) => {
                                const code = String(m.mat_code);
                                const meta = namesMap[code];
                                return {
                                  mat_code: code,
                                  name: meta?.name || code,
                                  uom: meta?.uom || m.uom_mat || "",
                                  available: 0,
                                  qty_fact: Number(m.qty_fact ?? 0),
                                } as any as WorkMaterialRow;
                              });

                              const actWork: WorkRow = {
                                ...workModalRow,
                                qty_done: log.qty,
                                qty_left: Math.max(
                                  0,
                                  (workModalRow.qty_planned || 0) - log.qty
                                ),
                              };

                              await generateWorkPdf(
                                actWork,
                                matsRows as any,
                                {
                                  actDate: log.created_at,
                                }
                              );
                            } catch (e) {
                              showErr(e);
                            }
                          }}
                          style={{
                            alignSelf: "flex-start",
                            marginTop: 4,
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: "#e2e8f0",
                          }}
                        >
                          <Text style={{ fontSize: 12 }}>
                            PDF этого акта
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>

                {/* Объём */}
                <Text style={{ fontWeight: "600", marginTop: 8 }}>
                  Выполненный объём
                </Text>
                <TextInput
                  editable={
                    !workModalReadOnly && (workModalRow?.qty_left || 0) > 0
                  }
                  value={workModalQty}
                  onChangeText={setWorkModalQty}
                  keyboardType="numeric"
                  placeholder="Сколько сделали…"
                  style={{
                    borderWidth: 1,
                    borderColor: "#e2e8f0",
                    borderRadius: 10,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    backgroundColor: "#fff",
                    marginTop: 4,
                  }}
                />
                <Text style={{ color: "#64748b", marginTop: 4 }}>
                  Ед. изм: {workModalRow.uom_id || "—"}
                </Text>

                {/* Участок */}
                <Text style={{ fontWeight: "600", marginTop: 12 }}>
                  Участок / зона (этаж, секция)
                </Text>
                <TextInput
                  editable={!workModalReadOnly}
                  value={workModalLocation}
                  onChangeText={setWorkModalLocation}
                  placeholder="Например: Секция А, этаж 5, кв. 25"
                  style={{
                    borderWidth: 1,
                    borderColor: "#e2e8f0",
                    borderRadius: 10,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    backgroundColor: "#fff",
                    marginTop: 4,
                  }}
                />

                {/* Этап */}
                <Text style={{ fontWeight: "600", marginTop: 12 }}>
                  Этап / что делали
                </Text>
                <Pressable
                  onPress={() => {
                    if (!workModalReadOnly)
                      setWorkStagePickerVisible(true);
                  }}
                  style={{
                    borderWidth: 1,
                    borderColor: "#e2e8f0",
                    borderRadius: 10,
                    paddingHorizontal: 10,
                    paddingVertical: 10,
                    backgroundColor: "#fff",
                    marginTop: 4,
                    opacity: workModalReadOnly ? 0.6 : 1,
                  }}
                >
                  <Text
                    style={{
                      color: workModalStage ? "#0f172a" : "#9ca3af",
                    }}
                  >
                    {workModalStage ||
                      "Выбери этап (например: Вязка арматуры)"}
                  </Text>
                </Pressable>

                {/* Комментарий */}
                <Text style={{ fontWeight: "600", marginTop: 12 }}>
                  Комментарий
                </Text>
                <TextInput
                  editable={!workModalReadOnly}
                  value={workModalComment}
                  onChangeText={setWorkModalComment}
                  placeholder="Замечания…"
                  multiline
                  style={{
                    borderWidth: 1,
                    borderColor: "#e2e8f0",
                    borderRadius: 10,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    backgroundColor: "#fff",
                    marginTop: 4,
                    minHeight: 60,
                    textAlignVertical: "top",
                  }}
                />

                {/* Материалы по факту */}
                <WorkMaterialsEditor
                  rows={workModalMaterials}
                  onChange={(nextRows) => setWorkModalMaterials(nextRows)}
                  onAdd={() => setWorkSearchVisible(true)}
                  onRemove={(idx) =>
                    setWorkModalMaterials((prev) =>
                      prev.filter((_, i) => i !== idx)
                    )
                  }
                  readOnly={workModalReadOnly}
                />

                {/* Поиск материалов в модалке */}
                {workSearchVisible && !workModalReadOnly && (
                  <View
                    style={{
                      marginTop: 10,
                      padding: 10,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: "#e2e8f0",
                      backgroundColor: "#fff",
                      gap: 8,
                    }}
                  >
                    <Text style={{ fontWeight: "600" }}>
                      Поиск материала по каталогу
                    </Text>
                    <TextInput
                      value={workSearchQuery}
                      onChangeText={handleWorkSearchChange}
                      placeholder="Поиск по названию/коду…"
                      style={{
                        borderWidth: 1,
                        borderColor: "#e2e8f0",
                        borderRadius: 10,
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                      }}
                    />
                    <FlatList
                      data={workSearchResults}
                      keyExtractor={(m: any) => m.mat_code}
                      style={{ maxHeight: 260 }}
                      renderItem={({ item }: any) => {
                        const hasStock = (item.available || 0) > 0;
                        return (
                          <Pressable
                            onPress={() =>
                              addWorkMaterial(item as WorkMaterialRow)
                            }
                            style={{
                              paddingVertical: 8,
                              borderBottomWidth: 1,
                              borderColor: "#f1f5f9",
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 8,
                            }}
                          >
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                flex: 1,
                                gap: 8,
                              }}
                            >
                              <Text style={{ fontSize: 18 }}>📦</Text>
                              <View style={{ flex: 1 }}>
                                <Text
                                  style={{
                                    fontWeight: "600",
                                    color: "#0f172a",
                                  }}
                                  numberOfLines={2}
                                >
                                  {item.name}
                                </Text>
                                <Text
                                  style={{
                                    color: "#64748b",
                                    marginTop: 2,
                                  }}
                                >
                                  {item.uom || "—"}
                                </Text>
                              </View>
                            </View>
                            <View
                              style={{
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                                borderRadius: 999,
                                backgroundColor: hasStock
                                  ? "#dcfce7"
                                  : "#f3f4f6",
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 12,
                                  fontWeight: "700",
                                  color: hasStock ? "#166534" : "#6b7280",
                                }}
                              >
                                {hasStock
                                  ? `доступно ${item.available}`
                                  : "нет в наличии"}
                              </Text>
                            </View>
                          </Pressable>
                        );
                      }}
                      ListEmptyComponent={
                        <Text style={{ color: "#94a3b8" }}>
                          Введите минимум 2 символа для поиска.
                        </Text>
                      }
                    />

                    <Pressable
                      onPress={() => {
                        setWorkSearchVisible(false);
                        setWorkSearchQuery("");
                        setWorkSearchResults([]);
                      }}
                      style={{
                        alignSelf: "flex-end",
                        marginTop: 4,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: "#e2e8f0",
                      }}
                    >
                      <Text>Закрыть поиск</Text>
                    </Pressable>
                  </View>
                )}

                <View style={{ height: 24 }} />
              </>
            )}
          </ScrollView>

          {!workModalReadOnly && (
            <View
              style={{
                borderTopWidth: 1,
                borderColor: "#e5e7eb",
                paddingTop: 8,
                paddingBottom: 12,
                paddingHorizontal: 16,
                flexDirection: "row",
                gap: 8,
              }}
            >
              <Pressable
                onPress={() => submitWorkProgress(true)}
                disabled={workModalSaving}
                style={{
                  flex: 1,
                  borderRadius: 10,
                  paddingVertical: 10,
                  backgroundColor:
                    (workModalRow?.qty_left || 0) <= 0
                      ? "#cbd5e1"
                      : workModalSaving
                      ? "#94a3b8"
                      : "#16a34a",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>
                  {workModalSaving ? "Сохраняю…" : "Сохранить + списать"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => submitWorkProgress(false)}
                disabled={workModalSaving}
                style={{
                  flex: 1,
                  borderRadius: 10,
                  paddingVertical: 10,
                  backgroundColor:
                    (workModalRow?.qty_left || 0) <= 0
                      ? "#cbd5e1"
                      : workModalSaving
                      ? "#94a3b8"
                      : "#0ea5e9",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>
                  {workModalSaving
                    ? "Сохраняю…"
                    : "Сохранить без склада"}
                </Text>
              </Pressable>
            </View>
          )}

          <Pressable
            onPress={closeWorkModal}
            style={{ paddingVertical: 10, alignItems: "center" }}
          >
            <Text style={{ color: "#64748b", fontWeight: "600" }}>
              Закрыть
            </Text>
          </Pressable>
        </View>
      </Modal>

      {/* МОДАЛКА ВЫБОРА ЭТАПА */}
      <Modal
        visible={workStagePickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setWorkStagePickerVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.3)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: "#fff",
              padding: 16,
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
              maxHeight: "60%",
            }}
          >
            <Text
              style={{
                fontWeight: "800",
                fontSize: 16,
                marginBottom: 8,
              }}
            >
              Выбор этапа работы
            </Text>

            <FlatList
              data={workStageOptions}
              keyExtractor={(s, index) => `${s.code}-${index}`}
              style={{ maxHeight: "80%" }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setWorkModalStage(item.name);
                    setWorkStagePickerVisible(false);
                  }}
                  style={{
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderColor: "#f1f5f9",
                  }}
                >
                  <Text style={{ fontWeight: "600" }}>{item.name}</Text>
                  <Text style={{ color: "#9ca3af", fontSize: 12 }}>
                    {item.code}
                  </Text>
                </Pressable>
              )}
              ListEmptyComponent={
                <Text style={{ color: "#64748b" }}>
                  Этапы ещё не настроены. Добавь строки в таблицу
                  work_stages.
                </Text>
              }
            />

            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                marginTop: 8,
              }}
            >
              <Pressable
                onPress={() => setWorkStagePickerVisible(false)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: "#e2e8f0",
                }}
              >
                <Text>Закрыть</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ---- STYLES ----
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: UI.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  title: { fontSize: 20, fontWeight: "800", color: UI.text, marginBottom: 12 },

  input: {
    marginTop: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 10,
    backgroundColor: "#fff",
  },

  activateBtn: {
    marginTop: 20,
    backgroundColor: UI.accent,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  activateText: { color: "#fff", fontWeight: "700" },

  header: { paddingBottom: 6, borderBottomWidth: 1, borderColor: UI.border },
  headerTitle: { fontSize: 20, fontWeight: "800", color: UI.text },

  contractorCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: UI.border,
  },
  contractorName: { fontSize: 16, fontWeight: "700", color: UI.text },
  contractorSub: { fontSize: 13, color: UI.sub, marginTop: 2 },

  segmentWrapper: { marginTop: 14 },
  segmentTrack: {
    backgroundColor: "#E2E8F0",
    borderRadius: 999,
    padding: 3,
    overflow: "hidden",
  },
  segmentRow: { flexDirection: "row" },
  segmentTab: { flex: 1, paddingVertical: 10, alignItems: "center" },
  segmentText: { fontWeight: "700", color: "#64748B" },
  segmentActive: { color: "#000" },
  segmentThumb: {
    position: "absolute",
    top: 3,
    bottom: 3,
    borderRadius: 999,
    backgroundColor: "#fff",
    elevation: 2,
  },

  card: {
    marginTop: 10,
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: UI.border,
  },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  cardMeta: { fontSize: 13, color: UI.sub, marginTop: 2 },

  takeBtn: {
    marginTop: 10,
    backgroundColor: UI.btnTake,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  takeText: { color: "#fff", fontWeight: "700" },
});
