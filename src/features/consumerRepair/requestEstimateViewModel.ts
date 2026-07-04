import type { CatalogItemPickerItem } from "../../lib/catalog/catalog.facade";
import type { ConsumerRepairDraftBundle, ConsumerRepairRequestItem } from "../../lib/consumerRequests";
import { formatEstimateMoney } from "../../lib/ai/globalEstimate/formatEstimateMoney";
import { formatEstimateUnitLabel } from "../../lib/ai/globalEstimate/formatEstimateUnitLabel";
import { formatEstimateUserTextRu } from "../../lib/ai/globalEstimate/formatEstimateUserTextRu";
import {
  CAPITAL_RENOVATION_GROUP_TITLES,
  type CapitalRenovationGroupId,
} from "../estimates/calculator/families/capitalRenovationRecipes";
import {
  estimateRowChildTemplateId,
  isProfessionalEstimateHelperRow,
  professionalEstimateRowChildTitle,
  professionalEstimateRowVisibleName,
} from "../../lib/estimateStructuredPipeline";
import { buildConsumerRepairProductionTrust } from "../estimates/governance/productionTrust";

export type RequestEstimateManualCatalogItem = {
  id: string;
  source: "catalog_item";
  catalogItemId: string;
  name: string;
  category?: string;
  quantity: number;
  unit: string;
  unitLabel: string;
  unitPrice?: number | null;
  currency?: string;
  sourceId?: string;
  sourceLabel?: string;
  confidence: "high" | "medium" | "low";
  addedBy: "user";
};

export type RequestEstimateSectionId =
  | "materials"
  | "labor"
  | "equipment"
  | "logistics"
  | "other"
  | `capital_${CapitalRenovationGroupId}`;

export type RequestEstimateSectionViewModel = {
  id: RequestEstimateSectionId;
  title: string;
  items: ConsumerRepairRequestItem[];
};

export type RequestEstimatePreviewRow = {
  id: string;
  name: string;
  quantityLabel: string;
  unitPriceLabel: string;
  totalLabel: string;
  priceStateLabel: string;
  sourceLabel: string;
  calculationLabel?: string | null;
  itemCount: number;
  missingPriceCount: number;
};

export type RequestEstimatePreviewSection = {
  id: RequestEstimateSectionViewModel["id"];
  title: string;
  rows: RequestEstimatePreviewRow[];
  hiddenRowsCount: number;
  totalRowsCount: number;
};

export type RequestEstimateVisibleLine = {
  id: string;
  text: string;
};

export type RequestEstimateAssumptionRow = {
  id: string;
  label: string;
  value: string;
};

export type RequestEstimateViewModel = {
  title: string;
  summary: string;
  totalLabel: string;
  priceStatusLabel: string;
  sourceConfidenceLabel: string;
  sourceLabels: string[];
  taxLabel: string;
  taxWarning?: string;
  trustLevelLabel: string;
  commercialEstimateLevelLabel: string;
  sourceQualityLabel: string;
  expertReviewStatusLabel: string;
  fullTotalStatusLabel: string;
  visibleLines: RequestEstimateVisibleLine[];
  assumptionRows: RequestEstimateAssumptionRow[];
  sections: RequestEstimateSectionViewModel[];
  professionalPreview: boolean;
  previewSections: RequestEstimatePreviewSection[];
  calculationPreviewLines: string[];
  normSourcePreviewLines: string[];
  rawItemCount: number;
  manualCatalogItems: RequestEstimateManualCatalogItem[];
  snapshotHash?: string | null;
  revisionVersionLabel?: string | null;
  revisionAuditLabel?: string | null;
  revisionApprovedLabel?: string | null;
};

const PROFESSIONAL_PREVIEW_ROW_LIMIT = 6;

const RAW_PUBLIC_TEXT_RE =
  /\b(?:PRICE_MISSING|template_id|template_version|source_parameters|formula_id|norm_id|rowCode|materialKey|rateKey|debug object|calculation JSON)\b/i;

const CAPITAL_RENOVATION_SECTION_IDS = (Object.keys(CAPITAL_RENOVATION_GROUP_TITLES) as CapitalRenovationGroupId[])
  .map((id) => `capital_${id}` as const);

export function sanitizeRequestEstimatePublicText(value: string | null | undefined, fallback = ""): string {
  const normalized = formatEstimateUserTextRu(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return fallback;
  const safe = normalized
    .replace(/PRICE_MISSING:\s*[^.;]+/gi, "\u0426\u0435\u043d\u0430 \u043d\u0435 \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d\u0430")
    .replace(/\bPRICE_MISSING\b/g, "\u0426\u0435\u043d\u0430 \u043d\u0435 \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d\u0430")
    .replace(/no_accepted_price_source_or_unit_conversion/gi, "\u0438\u0441\u0442\u043e\u0447\u043d\u0438\u043a \u0446\u0435\u043d\u044b \u043d\u0435 \u0432\u044b\u0431\u0440\u0430\u043d")
    .replace(/\b(?:template_id|template_version|source_parameters|formula_id|norm_id|templateId|templateVersion|formulaId|normId|normSource|normVersion|rowCode)\b\s*[:=]\s*[^;,.]+/gi, "")
    .replace(/\b(?:template|normFamily|normReviewStatus|normProvenance)\b\s*[:=]\s*[^;,.]+/gi, "")
    .replace(/\bround_to\s*\(([^)]+),\s*\d+\s*\)/gi, "$1")
    .replace(/\bnormFactor\b/g, "\u043d\u043e\u0440\u043c\u0430")
    .replace(/\bbaseQuantity\b/g, "\u0431\u0430\u0437\u043e\u0432\u044b\u0439 \u043e\u0431\u044a\u0435\u043c")
    .replace(/\bq\b/g, "\u043e\u0431\u044a\u0435\u043c")
    .replace(/\bsrc_professional_norm_pack_[a-z0-9_/-]+/gi, "\u043f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u043e\u043d\u0430\u043b\u044c\u043d\u044b\u0439 \u043a\u0430\u0442\u0430\u043b\u043e\u0433")
    .replace(/\s*;\s*/g, "; ")
    .replace(/\s+/g, " ")
    .trim();
  return safe || fallback;
}

function capitalRenovationGroupId(item: ConsumerRepairRequestItem): CapitalRenovationGroupId | null {
  const value = item.sourceParameters?.capitalRenovationGroupId;
  return typeof value === "string" && value in CAPITAL_RENOVATION_GROUP_TITLES
    ? value as CapitalRenovationGroupId
    : null;
}

function itemSection(item: ConsumerRepairRequestItem): RequestEstimateSectionViewModel["id"] {
  const capitalGroup = capitalRenovationGroupId(item);
  if (capitalGroup) return `capital_${capitalGroup}`;
  if (item.itemType === "material") return "materials";
  if (item.itemType === "work") return "labor";
  if (item.itemType === "service" && item.category === "delivery") return "logistics";
  if (item.itemType === "service" && item.category === "logistics") return "logistics";
  if (item.itemType === "service") return "equipment";
  return "other";
}

function sectionTitle(id: RequestEstimateSectionViewModel["id"]): string {
  if (id.startsWith("capital_")) {
    const groupId = id.replace(/^capital_/, "") as CapitalRenovationGroupId;
    return CAPITAL_RENOVATION_GROUP_TITLES[groupId] ?? "\u0420\u0430\u0437\u0434\u0435\u043b \u0441\u043c\u0435\u0442\u044b";
  }
  if (id === "materials") return "\u041c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b";
  if (id === "labor") return "\u0420\u0430\u0431\u043e\u0442\u044b";
  if (id === "equipment") return "\u041e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u0435";
  if (id === "logistics") return "\u0423\u0441\u043b\u0443\u0433\u0438 / \u043b\u043e\u0433\u0438\u0441\u0442\u0438\u043a\u0430";
  return "\u0414\u0440\u0443\u0433\u043e\u0435";
}

function confidenceRank(confidence: ConsumerRepairRequestItem["confidence"] | undefined): number {
  if (confidence === "high") return 3;
  if (confidence === "medium") return 2;
  return 1;
}

function confidenceLabel(confidence: ConsumerRepairRequestItem["confidence"] | undefined): string {
  if (confidence === "high") return "\u0432\u044b\u0441\u043e\u043a\u0430\u044f";
  if (confidence === "medium") return "\u0441\u0440\u0435\u0434\u043d\u044f\u044f";
  return "\u043d\u0438\u0437\u043a\u0430\u044f";
}

function sourceLabelForItem(item: ConsumerRepairRequestItem): string {
  if (item.priceTrace) return publicPriceSourceLabel(item);
  if (item.sourceLabel?.trim()) return sanitizeRequestEstimatePublicText(item.sourceLabel.trim());
  if (item.source === "reference_price_book") return "\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a: \u0441\u043f\u0440\u0430\u0432\u043e\u0447\u043d\u0438\u043a \u0441\u0442\u0430\u0432\u043e\u043a";
  if (item.source === "catalog_item") return "\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a: \u043a\u0430\u0442\u0430\u043b\u043e\u0433 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u043e\u0432";
  if (item.source === "marketplace") return "\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a: \u043c\u0430\u0440\u043a\u0435\u0442";
  if (item.source === "custom") return "\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a: \u0440\u0443\u0447\u043d\u043e\u0439 \u0432\u0432\u043e\u0434";
  return "\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a \u0446\u0435\u043d\u044b \u043d\u0435 \u0432\u044b\u0431\u0440\u0430\u043d";
}

function priceSourceTypeLabel(item: ConsumerRepairRequestItem): string {
  const type = item.priceTrace?.price_source_type;
  if (type === "price_catalog") return "\u043a\u0430\u0442\u0430\u043b\u043e\u0433 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u043e\u0432";
  if (type === "supplier_pricebook") return "\u043f\u0440\u0430\u0439\u0441 \u043f\u043e\u0441\u0442\u0430\u0432\u0449\u0438\u043a\u0430";
  if (type === "market_listing") return "\u0440\u044b\u043d\u043e\u0447\u043d\u0430\u044f \u043f\u043e\u0437\u0438\u0446\u0438\u044f";
  if (type === "supplier_quote") return "\u043f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u0435 \u043f\u043e\u0441\u0442\u0430\u0432\u0449\u0438\u043a\u0430";
  if (type === "manual_override") return "\u0446\u0435\u043d\u0430 \u0432\u0440\u0443\u0447\u043d\u0443\u044e";
  if (type === "historical_purchase_price") return "\u0438\u0441\u0442\u043e\u0440\u0438\u044f \u0437\u0430\u043a\u0443\u043f\u043e\u043a";
  return "\u0438\u0441\u0442\u043e\u0447\u043d\u0438\u043a \u0446\u0435\u043d\u044b";
}

function publicPriceSourceLabel(item: ConsumerRepairRequestItem): string {
  const trace = item.priceTrace;
  if (!trace || trace.price_status === "missing" || item.unitPrice == null || item.totalPrice == null) {
    return "\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a \u0446\u0435\u043d\u044b \u043d\u0435 \u0432\u044b\u0431\u0440\u0430\u043d";
  }
  const amount = formatEstimateMoney(item.unitPrice, item.currency);
  return `\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a \u0446\u0435\u043d\u044b: ${priceSourceTypeLabel(item)}; ${amount} / ${displayUnitLabelForItem(item)}`;
}

function uniqueSourceLabels(bundle: ConsumerRepairDraftBundle): string[] {
  return [
    ...(bundle.structuredEstimatePayload?.presentation.sourceLabels ?? []),
    ...bundle.items.map(sourceLabelForItem),
  ]
    .map((label) => sanitizeRequestEstimatePublicText(label))
    .filter((label, index, labels): label is string => Boolean(label) && labels.indexOf(label) === index);
}

function sourceConfidenceLabelForBundle(bundle: ConsumerRepairDraftBundle): string {
  const payloadConfidence = bundle.structuredEstimatePayload?.presentation.sourceConfidence;
  const itemConfidence = bundle.items.reduce(
    (lowest, item) => confidenceRank(item.confidence) < confidenceRank(lowest) ? item.confidence : lowest,
    payloadConfidence ?? "high" as ConsumerRepairRequestItem["confidence"],
  );
  return confidenceLabel(itemConfidence);
}

function displayUnitLabelForItem(item: ConsumerRepairRequestItem): string {
  return formatEstimateUnitLabel(item.unitLabel || item.unit);
}

function rowDisplayInput(item: ConsumerRepairRequestItem) {
  return {
    visibleName: item.titleRu,
    sectionType: item.category ?? item.itemType,
    code: String(item.sourceParameters?.rowCode ?? ""),
    sourceParameters: item.sourceParameters,
  };
}

function publicItemTitle(item: ConsumerRepairRequestItem): string {
  const normalized = sanitizeRequestEstimatePublicText(
    professionalEstimateRowVisibleName(rowDisplayInput(item)),
    "\u041f\u043e\u0437\u0438\u0446\u0438\u044f \u0441\u043c\u0435\u0442\u044b",
  )
    .replace(/^\s*\d+(?:\.\d+)*\s+/u, "")
    .replace(/\s*:\s*\u0440\u0430\u0431\u043e\u0442\u044b\s+\u043d\u0430\s+\u043e\u0431\u044a\u0435\u043a\u0442\u0435\s*$/iu, "")
    .replace(/\s*:\s*works?\s+on\s+site\s*$/iu, "")
    .trim();
  if (/^\u041a\u043e\u043c\u043f\u043b\u0435\u043a\u0442 \u0440\u0430\u0441\u0445\u043e\u0434\u043d\u044b\u0445 \u0438\u0437\u0434\u0435\u043b\u0438\u0439/iu.test(normalized)) {
    return "\u0420\u0430\u0441\u0445\u043e\u0434\u043d\u044b\u0435 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b \u043f\u043e \u043d\u043e\u0440\u043c\u0430\u043c";
  }
  return normalized || "\u041f\u043e\u0437\u0438\u0446\u0438\u044f \u0441\u043c\u0435\u0442\u044b";
}

function isGenericHelperItem(item: ConsumerRepairRequestItem): boolean {
  return isProfessionalEstimateHelperRow(rowDisplayInput(item));
}

function formatQuantityForItems(items: ConsumerRepairRequestItem[]): string {
  if (items.length === 0) return "\u0443\u0442\u043e\u0447\u043d\u0438\u0442\u044c";
  const unitLabel = displayUnitLabelForItem(items[0]);
  const sameUnit = items.every((item) => displayUnitLabelForItem(item) === unitLabel);
  if (!sameUnit) return `${items.length} \u043f\u043e\u0437.`;
  const total = items.reduce((sum, item) => sum + (Number.isFinite(item.quantity ?? NaN) ? item.quantity ?? 0 : 0), 0);
  if (total > 0) return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 3 }).format(total)} ${unitLabel}`;
  return `${items.length} \u043f\u043e\u0437.`;
}

function formatUnitPriceForItems(items: ConsumerRepairRequestItem[]): string {
  const priced = items.filter((item) => item.unitPrice != null);
  if (priced.length === 0) return "\u0426\u0435\u043d\u0430 \u043d\u0435 \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d\u0430";
  const first = priced[0];
  const samePrice = priced.every((item) => item.unitPrice === first.unitPrice && item.currency === first.currency);
  if (!samePrice || priced.length !== items.length) return `${priced.length}/${items.length} \u0441 \u0446\u0435\u043d\u043e\u0439`;
  return `${formatEstimateMoney(first.unitPrice ?? 0, first.currency)} / ${displayUnitLabelForItem(first)}`;
}

function formatTotalForItems(items: ConsumerRepairRequestItem[]): string {
  const priced = items.filter((item) => item.totalPrice != null);
  if (priced.length === 0) return "\u0418\u0442\u043e\u0433 \u0443\u0442\u043e\u0447\u043d\u0438\u0442\u044c";
  if (priced.length !== items.length) return "\u0418\u0442\u043e\u0433 \u0443\u0442\u043e\u0447\u043d\u0438\u0442\u044c";
  const currency = priced[0].currency;
  const total = priced.reduce((sum, item) => sum + (item.totalPrice ?? 0), 0);
  return formatEstimateMoney(total, currency);
}

function previewPriceStateLabel(items: ConsumerRepairRequestItem[]): string {
  const missing = items.filter((item) => item.unitPrice == null || item.totalPrice == null).length;
  if (missing === items.length) return "\u0426\u0435\u043d\u0430 \u043d\u0435 \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d\u0430";
  if (missing > 0) return `${items.length - missing}/${items.length} \u0441\u0442\u0440\u043e\u043a \u0441 \u0446\u0435\u043d\u043e\u0439`;
  return "\u0426\u0435\u043d\u044b \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d\u044b";
}

function previewSourceLabel(items: ConsumerRepairRequestItem[]): string {
  if (items.some((item) => item.unitPrice == null || item.totalPrice == null)) {
    return "\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a \u0446\u0435\u043d\u044b \u043d\u0435 \u0432\u044b\u0431\u0440\u0430\u043d";
  }
  const labels = items
    .map(sourceLabelForItem)
    .map((label) => sanitizeRequestEstimatePublicText(label))
    .filter((label, index, labels) => Boolean(label) && labels.indexOf(label) === index);
  return labels[0] ?? "\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a \u0446\u0435\u043d\u044b \u043d\u0435 \u0432\u044b\u0431\u0440\u0430\u043d";
}

function sourceParamNumber(item: ConsumerRepairRequestItem, key: string): number | null {
  const value = item.sourceParameters?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatAssumptionValue(value: number, unit: string): string {
  return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 3 }).format(value)} ${unit}`.trim();
}

function buildCapitalRenovationAssumptionRows(bundle: ConsumerRepairDraftBundle): RequestEstimateAssumptionRow[] {
  const sourceItem = bundle.items.find((item) => item.sourceParameters?.capitalRenovationCalculator === true);
  if (!sourceItem) return [];
  const row = (id: string, label: string, key: string, unit: string): RequestEstimateAssumptionRow | null => {
    const value = sourceParamNumber(sourceItem, key);
    return value == null ? null : {
      id,
      label,
      value: formatAssumptionValue(value, unit),
    };
  };
  return [
    row("area", "\u041f\u043b\u043e\u0449\u0430\u0434\u044c", "area_m2", "\u043c\u00b2"),
    row("ceiling", "\u0412\u044b\u0441\u043e\u0442\u0430 \u043f\u043e\u0442\u043e\u043b\u043a\u0430", "ceiling_height_m", "\u043c"),
    row("bathrooms", "\u0421\u0430\u043d\u0443\u0437\u043b\u044b", "bathrooms_count", ""),
    row("bathroom_floor", "\u041f\u043b\u043e\u0449\u0430\u0434\u044c \u0441\u0430\u043d\u0443\u0437\u043b\u043e\u0432", "bathroom_floor_area_m2", "\u043c\u00b2"),
    row("dry_floor", "\u0421\u0443\u0445\u0430\u044f \u043f\u043b\u043e\u0449\u0430\u0434\u044c \u043f\u043e\u043b\u0430", "dry_floor_area_m2", "\u043c\u00b2"),
    row("wall_area", "\u0421\u0442\u0435\u043d\u044b \u043f\u043e\u0434 \u043e\u0442\u0434\u0435\u043b\u043a\u0443", "net_wall_area_m2", "\u043c\u00b2"),
    row("bath_wall_tile", "\u041f\u043b\u0438\u0442\u043a\u0430 \u043d\u0430 \u0441\u0442\u0435\u043d\u044b \u0441\u0430\u043d\u0443\u0437\u043b\u043e\u0432", "bathroom_wall_tile_area_m2", "\u043c\u00b2"),
    row("paint_total", "\u041f\u043e\u043a\u0440\u0430\u0441\u043a\u0430 \u0441\u0442\u0435\u043d \u0438 \u043f\u043e\u0442\u043e\u043b\u043a\u043e\u0432", "paint_total_area_m2", "\u043c\u00b2"),
    row("baseboard", "\u041f\u043b\u0438\u043d\u0442\u0443\u0441", "baseboard_lm", "\u043f\u043e\u0433. \u043c"),
    row("electrical", "\u042d\u043b\u0435\u043a\u0442\u0440\u043e\u0442\u043e\u0447\u043a\u0438", "electrical_points", "\u0442\u043e\u0447."),
    row("water", "\u0422\u043e\u0447\u043a\u0438 \u0432\u043e\u0434\u044b", "water_points", "\u0442\u043e\u0447."),
    row("sewer", "\u0422\u043e\u0447\u043a\u0438 \u043a\u0430\u043d\u0430\u043b\u0438\u0437\u0430\u0446\u0438\u0438", "sewer_points", "\u0442\u043e\u0447."),
    row("doors", "\u0414\u0432\u0435\u0440\u0438", "doors_count", "\u0448\u0442"),
    row("waste", "\u0421\u0442\u0440\u043e\u0439\u043c\u0443\u0441\u043e\u0440", "waste_volume_m3", "\u043c\u00b3"),
  ].filter((item): item is RequestEstimateAssumptionRow => Boolean(item));
}

function itemSortRank(item: ConsumerRepairRequestItem): number {
  return sourceParamNumber(item, "capitalRenovationRowIndex") ?? Number.MAX_SAFE_INTEGER;
}

function sourceParamText(item: ConsumerRepairRequestItem, key: string): string {
  const value = item.sourceParameters?.[key];
  return typeof value === "string" ? value : "";
}

function formatQuantityValue(value: number, unit: string | null | undefined): string {
  const formatted = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 3 }).format(value);
  const unitLabel = formatEstimateUnitLabel(unit);
  return [formatted, unitLabel].filter(Boolean).join(" ");
}

function laborGroupKey(item: ConsumerRepairRequestItem): string | null {
  const childId = estimateRowChildTemplateId(rowDisplayInput(item));
  if (childId) return `child:${childId}`;
  const title = publicItemTitle(item).split(":")[0]?.trim();
  return title ? `title:${title}` : null;
}

function laborGroupTitle(item: ConsumerRepairRequestItem): string {
  const childTitle = professionalEstimateRowChildTitle(rowDisplayInput(item));
  if (childTitle) return childTitle;
  return publicItemTitle(item).split(":")[0]?.trim() || publicItemTitle(item);
}

function formatLaborGroupQuantity(items: ConsumerRepairRequestItem[]): string {
  const firstWithBase = items.find((item) => sourceParamNumber(item, "childBaseQuantity") != null || sourceParamNumber(item, "baseQuantity") != null);
  const baseQuantity = firstWithBase
    ? sourceParamNumber(firstWithBase, "childBaseQuantity") ?? sourceParamNumber(firstWithBase, "baseQuantity")
    : null;
  if (firstWithBase && baseQuantity != null) {
    const unit = sourceParamText(firstWithBase, "childBaseUnit") || sourceParamText(firstWithBase, "baseUnit") || firstWithBase.unit;
    return formatQuantityValue(baseQuantity, unit);
  }
  return formatQuantityForItems(items);
}

function buildPreviewRow(section: RequestEstimateSectionViewModel, items: ConsumerRepairRequestItem[], index: number): RequestEstimatePreviewRow {
  const first = items[0];
  const title = section.id === "labor" ? laborGroupTitle(first) : publicItemTitle(first);
  const missingPriceCount = items.filter((item) => item.unitPrice == null || item.totalPrice == null).length;
  return {
    id: `${section.id}-${index}-${first.id}`,
    name: section.id === "labor" || items.length === 1 ? title : `${title} (${items.length} \u043f\u043e\u0437.)`,
    quantityLabel: section.id === "labor" ? formatLaborGroupQuantity(items) : formatQuantityForItems(items),
    unitPriceLabel: formatUnitPriceForItems(items),
    totalLabel: formatTotalForItems(items),
    priceStateLabel: previewPriceStateLabel(items),
    sourceLabel: previewSourceLabel(items),
    calculationLabel: items.map(previewCalculationLabel).find(Boolean) ?? null,
    itemCount: items.length,
    missingPriceCount,
  };
}

function previewCalculationLabel(item: ConsumerRepairRequestItem): string | null {
  if (item.quantityFormula || item.calculationTrace || item.normId || item.templateId) {
    return "\u041a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e \u0440\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u043d\u043e \u043f\u043e \u043d\u043e\u0440\u043c\u0435";
  }
  return null;
}

function normSourceLabel(item: ConsumerRepairRequestItem): string | null {
  const title = sanitizeRequestEstimatePublicText(item.normSourceTitle);
  const version = sanitizeRequestEstimatePublicText(item.normVersion);
  if (title) {
    return version
      ? `\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a \u043d\u043e\u0440\u043c\u044b: ${title}; \u0432\u0435\u0440\u0441\u0438\u044f ${version}`
      : `\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a \u043d\u043e\u0440\u043c\u044b: ${title}`;
  }
  if (item.normId || item.formulaId || item.templateId) {
    return "\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a \u043d\u043e\u0440\u043c\u044b: \u043f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u043e\u043d\u0430\u043b\u044c\u043d\u044b\u0439 \u043a\u0430\u0442\u0430\u043b\u043e\u0433";
  }
  return null;
}

function bundlePriceStatusLabel(bundle: ConsumerRepairDraftBundle): string {
  const missing = bundle.items.filter((item) => item.unitPrice == null || item.totalPrice == null).length;
  const manual = bundle.items.filter((item) =>
    item.priceStatus === "USER_PRICE_OVERRIDE" || item.priceStatus === "USER_ENTERED_PRICE"
  ).length;
  const priced = bundle.items.length - missing;
  const parts = [
    `${priced}/${bundle.items.length} ${"\u0441\u0442\u0440\u043e\u043a \u0441 \u0446\u0435\u043d\u043e\u0439"}`,
    manual > 0 ? `${manual} ${"\u0432\u0440\u0443\u0447\u043d\u0443\u044e"}` : null,
    missing > 0 ? `${missing} ${"\u043d\u0443\u0436\u043d\u043e \u0437\u0430\u043f\u043e\u043b\u043d\u0438\u0442\u044c"}` : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

function sentenceCaseRu(value: string): string {
  const normalized = formatEstimateUserTextRu(value).replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  return `${normalized[0].toLocaleUpperCase("ru-RU")}${normalized.slice(1)}`;
}

function summaryWorkTitle(bundle: ConsumerRepairDraftBundle): string {
  return sentenceCaseRu(
    bundle.draft.selectedWorkTitleRu
      || bundle.structuredEstimatePayload?.workTitle
      || bundle.draft.title
      || "",
  );
}

function cleanSummary(bundle: ConsumerRepairDraftBundle): string {
  const raw = formatEstimateUserTextRu(bundle.draft.aiSummaryRu || bundle.draft.title || "");
  const lines = raw
    .split(/\r?\n/g)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((line) => !/PRICE_MISSING|confidence|region|price date|source|Источник|источник/i.test(line));
  const filteredLines = lines.filter((line) =>
    !/PRICE_MISSING|confidence|region|price date|source|\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a|\u0438\u0441\u0442\u043e\u0447\u043d\u0438\u043a|\u0422\u043e\u0447\u043d\u043e\u0441\u0442\u044c/i.test(line)
  );
  const cleanedSummary = filteredLines.slice(0, 2).join(" ");
  const workTitle = summaryWorkTitle(bundle);
  const summary = cleanedSummary
    ? workTitle && !cleanedSummary.toLocaleLowerCase("ru-RU").includes(workTitle.toLocaleLowerCase("ru-RU"))
      ? `${workTitle}. ${cleanedSummary}`
      : cleanedSummary
    : workTitle;
  if (summary) return summary;
  return bundle.draft.selectedWorkTitleRu || bundle.draft.title || "\u0421\u043c\u0435\u0442\u0430 \u0433\u043e\u0442\u043e\u0432\u0430 \u043a \u0440\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u044e.";
}

function visibleLineForItem(item: ConsumerRepairRequestItem): RequestEstimateVisibleLine {
  const unitLabel = displayUnitLabelForItem(item);
  const priceText = item.unitPrice == null
    ? "\u0446\u0435\u043d\u0430 \u043d\u0443\u0436\u043d\u0430"
    : `${formatEstimateMoney(item.unitPrice, item.currency)} / ${unitLabel}`;
  const totalText = item.totalPrice == null ? "\u0438\u0442\u043e\u0433 \u0443\u0442\u043e\u0447\u043d\u0438\u0442\u044c" : formatEstimateMoney(item.totalPrice, item.currency);
  const selectedProduct = item.selectedProductBinding
    ? `${"\u0412\u044b\u0431\u0440\u0430\u043d \u0442\u043e\u0432\u0430\u0440"}: ${item.selectedProductBinding.visibleName}${item.selectedProductBinding.packageLabel ? `, ${item.selectedProductBinding.packageLabel}` : ""}`
    : null;
  const parts = [
      publicItemTitle(item),
      selectedProduct,
      `${item.quantity ?? 0} ${unitLabel}`,
      priceText,
      totalText,
      sourceLabelForItem(item),
    ].filter((part): part is string => Boolean(part && part.trim()));
  return {
    id: item.id,
    text: parts.join(" · "),
  };
}

function buildPreviewSections(sections: RequestEstimateSectionViewModel[]): RequestEstimatePreviewSection[] {
  return sections.map((section) => {
    const grouped = new Map<string, ConsumerRepairRequestItem[]>();
    const helperItems: ConsumerRepairRequestItem[] = [];
    for (const item of section.items) {
      const laborKey = section.id === "labor" ? laborGroupKey(item) : null;
      if (laborKey) {
        grouped.set(laborKey, [...(grouped.get(laborKey) ?? []), item]);
        continue;
      }
      if (isGenericHelperItem(item)) {
        helperItems.push(item);
        continue;
      }
      const key = `${publicItemTitle(item)}::${displayUnitLabelForItem(item)}`;
      grouped.set(key, [...(grouped.get(key) ?? []), item]);
    }
    const rows = [...grouped.values()].map((items, index) => buildPreviewRow(section, items, index));
    if (rows.length === 0 && helperItems.length > 0) {
      rows.push({
        id: `${section.id}-helper-summary`,
        name: section.id === "materials"
          ? "\u0412\u0441\u043f\u043e\u043c\u043e\u0433\u0430\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b \u043f\u043e \u043d\u043e\u0440\u043c\u0430\u043c"
          : "\u0414\u0435\u0442\u0430\u043b\u044c\u043d\u044b\u0435 \u0441\u0442\u0440\u043e\u043a\u0438 \u043f\u043e \u043d\u043e\u0440\u043c\u0430\u043c",
        quantityLabel: `${helperItems.length} \u043f\u043e\u0437.`,
        unitPriceLabel: "\u0426\u0435\u043d\u0430 \u043d\u0435 \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d\u0430",
        totalLabel: "\u0418\u0442\u043e\u0433 \u0443\u0442\u043e\u0447\u043d\u0438\u0442\u044c",
        priceStateLabel: "\u0426\u0435\u043d\u0430 \u043d\u0435 \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d\u0430",
        sourceLabel: "\u0421\u043b\u0443\u0436\u0435\u0431\u043d\u0430\u044f \u0434\u0435\u0442\u0430\u043b\u0438\u0437\u0430\u0446\u0438\u044f \u043d\u043e\u0440\u043c; \u043d\u0435 \u0432\u044b\u0432\u043e\u0434\u0438\u0442\u0441\u044f \u043a\u0430\u043a \u043e\u0442\u0434\u0435\u043b\u044c\u043d\u044b\u0435 \u043f\u043e\u0437\u0438\u0446\u0438\u0438",
        calculationLabel: "\u0420\u0430\u0441\u0447\u0435\u0442 \u043f\u043e \u043d\u043e\u0440\u043c\u0430\u043c \u0432\u0438\u0434\u0430 \u0440\u0430\u0431\u043e\u0442",
        itemCount: helperItems.length,
        missingPriceCount: helperItems.length,
      });
    }
    return {
      id: section.id,
      title: section.title,
      rows: rows.slice(0, PROFESSIONAL_PREVIEW_ROW_LIMIT),
      hiddenRowsCount: helperItems.length + Math.max(0, rows.length - PROFESSIONAL_PREVIEW_ROW_LIMIT),
      totalRowsCount: rows.length + helperItems.length,
    };
  });
}

function buildCalculationPreviewLines(bundle: ConsumerRepairDraftBundle): string[] {
  const lines = bundle.items
    .map(previewCalculationLabel)
    .filter((line, index, lines): line is string => Boolean(line) && lines.indexOf(line) === index)
    .slice(0, 5);
  if (bundle.items.length > lines.length) {
    lines.push(`\u0412 \u0434\u0435\u0442\u0430\u043b\u044c\u043d\u043e\u043c \u0440\u0430\u0441\u0447\u0435\u0442\u0435: ${bundle.items.length} \u0441\u0442\u0440\u043e\u043a \u043f\u043e \u043d\u043e\u0440\u043c\u0430\u043c \u0432\u0438\u0434\u043e\u0432 \u0440\u0430\u0431\u043e\u0442.`);
  }
  return lines;
}

function buildNormSourcePreviewLines(bundle: ConsumerRepairDraftBundle, sourceLabels: string[]): string[] {
  const normLines = bundle.items
    .map(normSourceLabel)
    .filter((line, index, lines): line is string => Boolean(line) && lines.indexOf(line) === index)
    .slice(0, 5);
  if (normLines.length > 0) return normLines;
  return sourceLabels
    .map((label) => sanitizeRequestEstimatePublicText(label))
    .filter((label) => label && !RAW_PUBLIC_TEXT_RE.test(label))
    .slice(0, 5);
}

function estimateRevisionEventLabel(eventType: string | undefined): string | null {
  if (!eventType) return null;
  if (eventType === "QUANTITY_CHANGED") return "\u043a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u043e";
  if (eventType === "UNIT_PRICE_CHANGED") return "\u0446\u0435\u043d\u0430 \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0430";
  if (eventType === "ROW_ADDED") return "\u0441\u0442\u0440\u043e\u043a\u0430 \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u0430";
  if (eventType === "ROW_REMOVED") return "\u0441\u0442\u0440\u043e\u043a\u0430 \u0443\u0434\u0430\u043b\u0435\u043d\u0430";
  if (eventType === "ROW_RESTORED") return "\u0441\u0442\u0440\u043e\u043a\u0430 \u0432\u0435\u0440\u043d\u0443\u0442\u0430";
  if (eventType === "CATALOG_ITEM_SELECTED") return "\u0432\u044b\u0431\u0440\u0430\u043d \u043a\u0430\u0442\u0430\u043b\u043e\u0433";
  if (eventType === "PHOTO_MATERIAL_PRODUCT_BOUND") return "\u0442\u043e\u0432\u0430\u0440 \u043f\u043e \u0444\u043e\u0442\u043e \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d";
  if (eventType === "AI_RECALCULATED") return "AI \u043f\u0435\u0440\u0435\u0441\u0447\u0438\u0442\u0430\u043b";
  if (eventType === "PDF_EXPORTED") return "PDF \u0441\u043e\u0437\u0434\u0430\u043d";
  if (eventType === "REQUEST_SUBMITTED") return "\u0437\u0430\u044f\u0432\u043a\u0430 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0430";
  if (eventType === "APPROVED") return "\u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u043e";
  if (eventType === "REVISION_RESTORED") return "\u0432\u0435\u0440\u043d\u0443\u0442\u0430 \u043f\u0440\u043e\u0448\u043b\u0430\u044f \u0432\u0435\u0440\u0441\u0438\u044f";
  return null;
}

function revisionViewLabels(bundle: ConsumerRepairDraftBundle): Pick<
  RequestEstimateViewModel,
  "revisionVersionLabel" | "revisionAuditLabel" | "revisionApprovedLabel"
> {
  const state = bundle.estimateRevisionState;
  const revision = state?.revisions.find((candidate) => candidate.revision_id === state.current_revision_id);
  if (!state || !revision) {
    return {
      revisionVersionLabel: null,
      revisionAuditLabel: null,
      revisionApprovedLabel: null,
    };
  }
  const lastEvent = state.events[state.events.length - 1];
  const eventLabel = estimateRevisionEventLabel(lastEvent?.event_type);
  const frozen = revision.status === "APPROVED"
    || state.approval_freezes.some((freeze) => freeze.approved_revision_id === revision.revision_id);
  return {
    revisionVersionLabel: `\u0412\u0435\u0440\u0441\u0438\u044f ${revision.version_number}`,
    revisionAuditLabel: eventLabel ? `\u041f\u043e\u0441\u043b\u0435\u0434\u043d\u0435\u0435: ${eventLabel}` : null,
    revisionApprovedLabel: frozen ? "\u0423\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u043d\u0430\u044f \u0432\u0435\u0440\u0441\u0438\u044f \u0437\u0430\u043c\u043e\u0440\u043e\u0436\u0435\u043d\u0430" : null,
  };
}

export function buildRequestEstimateViewModel(bundle: ConsumerRepairDraftBundle | null): RequestEstimateViewModel | null {
  if (!bundle) return null;
  const priced = bundle.items.filter((item) => item.totalPrice != null);
  const missingPrices = bundle.items.filter((item) => item.unitPrice == null || item.totalPrice == null).length;
  const total = priced.reduce((sum, item) => sum + (item.totalPrice ?? 0), 0);
  const currency = priced[0]?.currency ?? "KGS";
  const hasCapitalRenovationCalculator = bundle.items.some((item) => capitalRenovationGroupId(item));
  const hasExpandedComplexCalculator = bundle.items.some((item) => item.sourceParameters?.expandedComplexCalculator === true);
  const sectionIds: RequestEstimateSectionViewModel["id"][] = hasCapitalRenovationCalculator
    ? CAPITAL_RENOVATION_SECTION_IDS
    : ["materials", "labor", "equipment", "logistics", "other"];
  const sections = sectionIds
    .map((id) => ({
      id,
      title: sectionTitle(id),
      items: bundle.items.filter((item) => itemSection(item) === id).sort((a, b) => itemSortRank(a) - itemSortRank(b)),
    }))
    .filter((section) => section.items.length > 0);
  const sourceLabels = uniqueSourceLabels(bundle);
  const professionalPreview = Boolean(bundle.structuredEstimatePayload) || hasExpandedComplexCalculator || bundle.items.length > 20;
  const productionTrust = buildConsumerRepairProductionTrust({
    estimateId: bundle.draft.id,
    revisionId: bundle.estimateRevisionState?.current_revision_id ?? bundle.editableEstimateSnapshot?.snapshotId ?? "draft",
    sourcePrompt: bundle.draft.problemText ?? bundle.draft.title ?? "",
    region: "KG",
    currency: (currency === "KZT" || currency === "UZS" || currency === "RUB" || currency === "USD" ? currency : "KGS") === "USD"
      ? "USD"
      : currency === "KZT"
        ? "KZT"
        : currency === "UZS"
          ? "UZS"
          : currency === "RUB"
            ? "RUB"
            : "KGS",
    pricebookVersion: null,
    items: bundle.items,
  });

  return {
    title: bundle.draft.title || "\u0421\u043c\u0435\u0442\u0430",
    summary: cleanSummary(bundle),
    totalLabel: missingPrices > 0 ? "\u041f\u043e\u043b\u043d\u044b\u0439 \u0438\u0442\u043e\u0433 \u043d\u0435 \u0440\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u043d" : total > 0 ? formatEstimateMoney(total, currency) : "\u0443\u0442\u043e\u0447\u043d\u0438\u0442\u044c",
    priceStatusLabel: bundlePriceStatusLabel(bundle),
    sourceConfidenceLabel: sourceConfidenceLabelForBundle(bundle),
    sourceLabels,
    taxLabel: bundle.structuredEstimatePayload?.tax.taxLabel ?? "\u041d\u0430\u043b\u043e\u0433: \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u0443\u0442\u043e\u0447\u043d\u0435\u043d\u0438\u044f",
    taxWarning: bundle.structuredEstimatePayload?.tax.warning,
    trustLevelLabel: `\u0414\u043e\u0432\u0435\u0440\u0438\u0435: ${productionTrust.trust_level}`,
    commercialEstimateLevelLabel: `\u0423\u0440\u043e\u0432\u0435\u043d\u044c \u0441\u043c\u0435\u0442\u044b: ${productionTrust.estimate_level}`,
    sourceQualityLabel: `\u041a\u0430\u0447\u0435\u0441\u0442\u0432\u043e \u0438\u0441\u0442\u043e\u0447\u043d\u0438\u043a\u0430: ${productionTrust.source_quality}`,
    expertReviewStatusLabel: `\u042d\u043a\u0441\u043f\u0435\u0440\u0442\u043d\u0430\u044f \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0430: ${productionTrust.expert_review_status}`,
    fullTotalStatusLabel: productionTrust.full_total_status === "NOT_FINAL"
      ? "\u0418\u0442\u043e\u0433: \u043d\u0435 \u0444\u0438\u043d\u0430\u043b\u044c\u043d\u044b\u0439, \u0435\u0441\u0442\u044c \u043d\u0435\u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d\u043d\u044b\u0435 \u0446\u0435\u043d\u044b"
      : "\u0418\u0442\u043e\u0433: \u0444\u0438\u043d\u0430\u043b\u044c\u043d\u044b\u0439",
    visibleLines: bundle.items.map(visibleLineForItem),
    assumptionRows: buildCapitalRenovationAssumptionRows(bundle),
    sections,
    professionalPreview,
    previewSections: buildPreviewSections(sections),
    calculationPreviewLines: buildCalculationPreviewLines(bundle),
    normSourcePreviewLines: buildNormSourcePreviewLines(bundle, sourceLabels),
    rawItemCount: bundle.items.length,
    manualCatalogItems: bundle.items
      .filter((item) => item.source === "catalog_item" && item.catalogItemId)
      .map((item) => ({
        id: item.id,
        source: "catalog_item",
        catalogItemId: item.catalogItemId ?? "",
        name: item.titleRu,
        category: item.category ?? undefined,
        quantity: item.quantity ?? 0,
        unit: item.unit ?? "pcs",
        unitLabel: displayUnitLabelForItem(item),
        unitPrice: item.unitPrice,
        currency: item.currency,
        sourceId: item.sourceId ?? undefined,
        sourceLabel: item.sourceLabel ?? undefined,
        confidence: item.confidence ?? "high",
        addedBy: "user",
      })),
    snapshotHash: bundle.editableEstimateSnapshot?.hash ?? null,
    ...revisionViewLabels(bundle),
  };
}

export function createManualCatalogItemInput(item: CatalogItemPickerItem): Omit<RequestEstimateManualCatalogItem, "id"> {
  return {
    source: "catalog_item",
    catalogItemId: item.catalogItemId,
    name: item.name,
    category: item.kind ?? undefined,
    quantity: 1,
    unit: item.unit,
    unitLabel: formatEstimateUnitLabel(item.unit),
    unitPrice: null,
    currency: "KGS",
    sourceId: item.sourceId,
    sourceLabel: item.sourceLabel,
    confidence: "high",
    addedBy: "user",
  };
}
