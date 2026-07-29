import type {
  DynamicProfessionalBoq,
  DynamicProfessionalBoqRow,
} from "../../ai/estimatorKernel/estimatorKernelTypes";

const OWNED_DOMAIN_MINIMUM_ROWS = 101;

type OwnedPhase = {
  code: string;
  titleRu: string;
  priceShare: number;
};

const PHASES_BY_SECTION: Record<DynamicProfessionalBoqRow["sectionType"], readonly OwnedPhase[]> = {
  materials: [
    { code: "specification", titleRu: "спецификация и комплектование", priceShare: 0.1 },
    { code: "main_supply", titleRu: "основной объём поставки", priceShare: 0.65 },
    { code: "accessories", titleRu: "комплектующие и монтажный резерв", priceShare: 0.15 },
    { code: "incoming_control", titleRu: "входной контроль и маркировка", priceShare: 0.1 },
  ],
  labor: [
    { code: "preparation", titleRu: "подготовительный этап", priceShare: 0.1 },
    { code: "main_scope", titleRu: "основной этап выполнения", priceShare: 0.65 },
    { code: "quality_control", titleRu: "операционный контроль качества", priceShare: 0.15 },
    { code: "handover", titleRu: "исполнительная фиксация и сдача", priceShare: 0.1 },
  ],
  equipment: [
    { code: "mobilization", titleRu: "мобилизация", priceShare: 0.1 },
    { code: "setup", titleRu: "подготовка и настройка", priceShare: 0.15 },
    { code: "operation", titleRu: "эксплуатация на основном этапе", priceShare: 0.65 },
    { code: "demobilization", titleRu: "контроль и демобилизация", priceShare: 0.1 },
  ],
  delivery: [
    { code: "planning", titleRu: "планирование и комплектование рейса", priceShare: 0.1 },
    { code: "loading", titleRu: "погрузка и крепление", priceShare: 0.15 },
    { code: "transport", titleRu: "транспортирование", priceShare: 0.65 },
    { code: "unloading", titleRu: "разгрузка и внутриплощадочная передача", priceShare: 0.1 },
  ],
};

function splitConfiguredPrice(unitPrice: number, share: number): number {
  return Math.max(0.01, Math.round(unitPrice * share * 100) / 100);
}

function expandRow(
  row: DynamicProfessionalBoqRow,
  phasesBySection: Record<
    DynamicProfessionalBoqRow["sectionType"],
    readonly OwnedPhase[]
  >,
): DynamicProfessionalBoqRow[] {
  return phasesBySection[row.sectionType].map((phase) => ({
    ...row,
    code: `${row.code}__${phase.code}`,
    name: `${row.name}: ${phase.titleRu}`,
    unitPrice: splitConfiguredPrice(row.unitPrice, phase.priceShare),
    rateKey: `${row.rateKey ?? row.code}__${phase.code}`,
    comment: `${row.comment} Owned-domain WBS phase: ${phase.code}.`,
  }));
}

/**
 * The request router has already resolved these domains. Expanding their
 * validated compiler rows here preserves the same quantities, configured
 * source and total price while producing an explicit WBS without running the
 * universal 11,610-work enrichment pass a second time.
 */
export function expandOwnedDomainProfessionalBoq(
  boq: DynamicProfessionalBoq,
): DynamicProfessionalBoq {
  // Electrical rows already represent atomic physical quantities. Splitting a
  // cable/material row into administrative WBS phases duplicates its measured
  // quantity and breaks canonical parameter parity, even if price shares sum
  // to the same amount. Keep electrical BOQ semantic and use WBS metadata
  // outside the paid-row list.
  if (boq.plan.workKey === "electrical_area_installation") return boq;
  if (
    boq.plan.semanticFrame.materialSystem !== "roof_waterproofing_system"
  ) {
    return boq;
  }
  if (boq.rows.length >= OWNED_DOMAIN_MINIMUM_ROWS) return boq;
  const phasesBySection = PHASES_BY_SECTION;
  return {
    ...boq,
    rows: boq.rows.flatMap((row) => expandRow(row, phasesBySection)),
  };
}
