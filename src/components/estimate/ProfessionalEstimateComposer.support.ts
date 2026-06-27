import { StyleSheet } from "react-native";

import type { GlobalWorkSmartSearchSuggestion } from "../../lib/ai/globalEstimate";
import type {
  ForemanAiEstimateDraftMapping,
  ForemanEstimateContext,
} from "../../lib/foremanAiEstimate";
import { officeUomLabel } from "../../shared/i18n/officeRussianDisplay";

export type ProfessionalEstimateComposerMode = "foreman" | "consumer";

export type CatalogQuickItem = {
  rik_code: string;
  name_human?: string | null;
  name_human_ru?: string | null;
  display_name?: string | null;
  uom_code?: string | null;
  kind?: string | null;
};

export type ProfessionalEstimateComposerProps = {
  visible: boolean;
  mode: ProfessionalEstimateComposerMode;
  context: ForemanEstimateContext;
  onClose: () => void;
  onOpenDraft?: () => void;
  onDraftCreated: (mapping: ForemanAiEstimateDraftMapping) => void | Promise<void>;
  rikQuickSearch?: (q: string, limit?: number) => Promise<CatalogQuickItem[]>;
  initialText?: string;
};

export type RowInputState = {
  visibleName: string;
  quantity: string;
  unitPrice: string;
};

export const TEXT = {
  title: "\u041f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u043e\u043d\u0430\u043b\u044c\u043d\u0430\u044f \u0441\u043c\u0435\u0442\u0430",
  backForeman: "\u041d\u0430\u0437\u0430\u0434 \u043a \u043f\u0440\u043e\u0440\u0430\u0431\u0443",
  openDraft: "\u0427\u0435\u0440\u043d\u043e\u0432\u0438\u043a",
  inputPlaceholder: "\u0412\u0438\u0434 \u0440\u0430\u0431\u043e\u0442, \u043e\u0431\u044a\u0435\u043c, \u0443\u0441\u043b\u043e\u0432\u0438\u044f",
  generate: "\u0420\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u0442\u044c",
  addToDraft: "\u0412 \u0447\u0435\u0440\u043d\u043e\u0432\u0438\u043a",
  catalogTitle: "\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b \u0438\u0437 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0430",
  catalogPlaceholder: "\u041f\u043e\u0438\u0441\u043a \u043f\u043e \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0443",
  catalogHint: "\u041d\u0430\u0439\u0434\u0438\u0442\u0435 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b \u0438 \u0434\u043e\u0431\u0430\u0432\u044c\u0442\u0435 \u0435\u0433\u043e \u0432 \u044d\u0442\u0443 \u0441\u043c\u0435\u0442\u0443.",
  workSuggestionTitle: "\u0423\u043c\u043d\u044b\u0439 \u043f\u043e\u0438\u0441\u043a \u0432\u0438\u0434\u0430 \u0440\u0430\u0431\u043e\u0442",
  add: "\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c",
  estimateFlag: "\u0421\u043c\u0435\u0442\u0430",
  procurementFlag: "\u0417\u0430\u043a\u0443\u043f\u043a\u0430",
  remove: "\u0423\u0431\u0440\u0430\u0442\u044c",
  restore: "\u0412\u0435\u0440\u043d\u0443\u0442\u044c",
  emptyInput: "\u041e\u043f\u0438\u0448\u0438\u0442\u0435 \u0440\u0430\u0431\u043e\u0442\u0443 \u0438 \u043e\u0431\u044a\u0435\u043c.",
  parityError: "\u0421\u043c\u0435\u0442\u0430 \u043d\u0435 \u043f\u0440\u043e\u0448\u043b\u0430 anti-desync gate.",
  catalogNeedsEstimate: "\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0440\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u0439\u0442\u0435 \u0441\u043c\u0435\u0442\u0443.",
  rows: "\u0421\u0442\u0440\u043e\u043a",
  buyer: "\u0417\u0430\u043a\u0443\u043f\u043a\u0430",
  total: "\u0418\u0442\u043e\u0433",
  qty: "\u041a\u043e\u043b-\u0432\u043e",
  price: "\u0426\u0435\u043d\u0430",
} as const;

const normalizeDecimalInput = (value: string) => value.replace(",", ".").trim();

export const parseNumberInput = (value: string): number | null => {
  const parsed = Number(normalizeDecimalInput(value));
  return Number.isFinite(parsed) ? parsed : null;
};

export const shouldUseAutoWorkSuggestion = (suggestion: GlobalWorkSmartSearchSuggestion | undefined): boolean => {
  if (!suggestion) return false;
  if (suggestion.matchKind === "exact_alias" || suggestion.matchKind === "exact_title") return suggestion.score >= 0.75;
  if (suggestion.matchKind === "phrase") return suggestion.score >= 0.78;
  return false;
};

export const formatMoney = (value: number, currency: string) =>
  `${Math.round(Number(value) || 0).toLocaleString("ru-RU")} ${currency}`.trim();

export const formatEstimateUnit = (unit: unknown, emptyLabel = "-") =>
  officeUomLabel(unit, emptyLabel);

export const formatEstimateSection = (section: unknown, fallback = "") => {
  const normalized = String(section ?? "").trim().toLowerCase();
  switch (normalized) {
    case "material":
    case "materials":
    case "equipment":
      return "Материалы";
    case "work":
    case "works":
    case "labor":
      return "Работы";
    case "service":
    case "services":
      return "Услуги";
    case "delivery":
      return "Доставка";
    default:
      return String(section ?? fallback).trim() || fallback;
  }
};

export const buildContextText = (context: ForemanEstimateContext) =>
  [context.objectName, context.levelName, context.systemName, context.zoneName]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join(" / ");

export const displayNameOfCatalogItem = (item: CatalogQuickItem) =>
  String(item.name_human_ru || item.name_human || item.display_name || item.rik_code || "").trim();

export const buildRowInputs = (mapping: ForemanAiEstimateDraftMapping | null): Record<string, RowInputState> =>
  Object.fromEntries(
    (mapping?.rows ?? []).map((row) => [
      row.rowId,
      {
        visibleName: row.visibleName,
        quantity: String(row.quantity),
        unitPrice: String(row.unitPrice),
      },
    ]),
  );

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc" },
  header: { minHeight: 64, paddingHorizontal: 16, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#cbd5e1", backgroundColor: "#ffffff" },
  headerButton: { width: 42, height: 42, borderRadius: 6, alignItems: "center", justifyContent: "center", backgroundColor: "#e2e8f0" },
  headerButtonText: { fontSize: 24, color: "#0f172a" },
  headerTitleWrap: { flex: 1, minWidth: 0 },
  title: { fontSize: 20, fontWeight: "800", color: "#0f172a" },
  context: { marginTop: 2, fontSize: 12, color: "#64748b" },
  draftButton: { minHeight: 42, borderRadius: 6, paddingHorizontal: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#0f172a" },
  draftButtonText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  body: { flex: 1 },
  bodyContent: { padding: 16, gap: 12 },
  composePanel: { gap: 10 },
  workSuggestionsPanel: { borderRadius: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: "#cbd5e1", backgroundColor: "#fff", padding: 10, gap: 8 },
  workSuggestionRows: { gap: 8 },
  workSuggestionButton: { minHeight: 46, borderRadius: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: "#cbd5e1", backgroundColor: "#f8fafc", paddingHorizontal: 10, paddingVertical: 7, justifyContent: "center" },
  workSuggestionName: { color: "#0f172a", fontSize: 13, fontWeight: "900" },
  workSuggestionMeta: { marginTop: 2, color: "#64748b", fontSize: 11, fontWeight: "800" },
  input: { minHeight: 92, borderWidth: StyleSheet.hairlineWidth, borderColor: "#cbd5e1", borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#fff", fontSize: 15, color: "#0f172a", textAlignVertical: "top" },
  button: { minHeight: 46, borderRadius: 6, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  primaryButton: { flex: 1, backgroundColor: "#14532d" },
  secondaryButton: { flex: 1, backgroundColor: "#e2e8f0" },
  disabledButton: { opacity: 0.55 },
  primaryButtonText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  secondaryButtonText: { color: "#0f172a", fontSize: 14, fontWeight: "800" },
  error: { color: "#b91c1c", fontSize: 13, fontWeight: "700" },
  summary: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  summaryText: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 6, backgroundColor: "#dcfce7", color: "#14532d", fontSize: 12, fontWeight: "800" },
  catalogPanel: { borderRadius: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: "#cbd5e1", backgroundColor: "#fff", padding: 12, gap: 10 },
  panelTitle: { fontSize: 15, fontWeight: "800", color: "#0f172a" },
  catalogSearchRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  catalogInput: { flex: 1, minHeight: 42, borderWidth: StyleSheet.hairlineWidth, borderColor: "#cbd5e1", borderRadius: 6, paddingHorizontal: 10, color: "#0f172a", backgroundColor: "#f8fafc" },
  catalogHint: { color: "#64748b", fontSize: 12, lineHeight: 17, fontWeight: "700" },
  catalogRows: { gap: 8 },
  catalogRow: { minHeight: 54, borderRadius: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: "#e2e8f0", padding: 9, flexDirection: "row", alignItems: "center", gap: 10 },
  catalogRowText: { flex: 1, minWidth: 0 },
  catalogName: { color: "#0f172a", fontSize: 13, fontWeight: "800" },
  catalogMeta: { marginTop: 2, color: "#64748b", fontSize: 11 },
  smallPrimaryButton: { minHeight: 34, borderRadius: 6, paddingHorizontal: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#14532d" },
  smallPrimaryButtonText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  rowsPanel: { gap: 10 },
  row: { borderRadius: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: "#cbd5e1", backgroundColor: "#fff", padding: 12, gap: 10 },
  rowDisabled: { opacity: 0.55 },
  rowHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowNameInput: { flex: 1, minHeight: 38, borderWidth: StyleSheet.hairlineWidth, borderColor: "#cbd5e1", borderRadius: 6, paddingHorizontal: 10, color: "#0f172a", fontSize: 14, fontWeight: "800", backgroundColor: "#f8fafc" },
  rowSection: { width: 92, textAlign: "right", color: "#475569", fontSize: 11 },
  editGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  editCell: { minWidth: 130, flex: 1, gap: 4 },
  fieldLabel: { color: "#64748b", fontSize: 11, fontWeight: "700" },
  fieldInput: { minHeight: 38, borderWidth: StyleSheet.hairlineWidth, borderColor: "#cbd5e1", borderRadius: 6, paddingHorizontal: 10, color: "#0f172a", backgroundColor: "#fff" },
  readonlyValue: { minHeight: 38, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 10, color: "#475569", backgroundColor: "#f1f5f9" },
  totalValue: { minHeight: 38, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 10, color: "#0f172a", fontWeight: "800", backgroundColor: "#f1f5f9" },
  rowActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  toggleButton: { minHeight: 34, borderRadius: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: "#94a3b8", paddingHorizontal: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  toggleButtonActive: { backgroundColor: "#dcfce7", borderColor: "#86efac" },
  toggleButtonText: { color: "#334155", fontSize: 12, fontWeight: "800" },
  toggleButtonActiveText: { color: "#14532d" },
  removeButton: { minHeight: 34, borderRadius: 6, paddingHorizontal: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#fee2e2" },
  removeButtonText: { color: "#991b1b", fontSize: 12, fontWeight: "800" },
  footer: { minHeight: 70, padding: 12, flexDirection: "row", gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#cbd5e1", backgroundColor: "#ffffff" },
});
