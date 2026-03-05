import type { ActBuilderItem, ActBuilderWorkItem } from "./types";

export type SelectedWorkPayload = {
  name: string;
  qty: number;
  unit: string;
  price: number;
  comment: string;
};

export type SelectedMaterialPayload = {
  material_id: string;
  mat_code: string;
  name: string;
  unit: string;
  issued_qty: number;
  act_used_qty: number;
  qty_fact: number;
  price: number | null;
  sum: number;
};

export function buildSelectedActBuilderPayload(
  actBuilderWorks: ActBuilderWorkItem[],
  actBuilderItems: ActBuilderItem[]
): {
  selectedWorks: SelectedWorkPayload[];
  selectedMaterials: SelectedMaterialPayload[];
  invalidMaterial: ActBuilderItem | null;
} {
  const selectedWorks = actBuilderWorks
    .filter((x) => x.include)
    .map((x) => ({
      name: x.name,
      qty: Number(x.qty || 0),
      unit: String(x.unit || "").trim(),
      price: x.price == null ? 0 : Number(x.price),
      comment: x.comment || "",
    }));

  const itemsCheckedInUI = actBuilderItems.filter((x) => x.include);
  const invalidMaterial =
    itemsCheckedInUI.find(
      (m) =>
        !Number.isFinite(Number(m.qty)) ||
        Number(m.qty) < 0 ||
        Number(m.qty) > Number(m.qtyMax)
    ) || null;

  const selectedMaterials = itemsCheckedInUI.map((m) => ({
    material_id: m.id,
    mat_code: m.mat_code,
    name: m.name,
    unit: m.uom || "",
    issued_qty: Number(m.issuedQty || 0),
    act_used_qty: Number(m.qty || 0),
    qty_fact: Number(m.qty || 0),
    price: m.price,
    sum: Number(m.qty || 0) * Number(m.price || 0),
  }));

  return { selectedWorks, selectedMaterials, invalidMaterial };
}

export function collectActBuilderWarnings(
  selectedWorks: SelectedWorkPayload[],
  selectedMaterials: SelectedMaterialPayload[]
): string[] {
  const warnings: string[] = [];

  selectedWorks.forEach((w) => {
    if (!Number.isFinite(Number(w.qty)) || Number(w.qty) <= 0) {
      warnings.push(`Работа "${w.name}" содержит некорректное количество.`);
    }
    if (!String(w.unit || "").trim()) {
      warnings.push(`Работа "${w.name}" не содержит единицу измерения.`);
    }
    if (!Number.isFinite(Number(w.price)) || Number(w.price) <= 0) {
      warnings.push(`Работа "${w.name}" содержит некорректную цену.`);
    }
  });

  selectedMaterials.forEach((m) => {
    if (!Number.isFinite(Number(m.act_used_qty)) || Number(m.act_used_qty) <= 0) {
      warnings.push(`Материал "${m.name}" содержит некорректное количество.`);
    }
    if (!Number.isFinite(Number(m.price)) || Number(m.price) <= 0) {
      warnings.push(`Материал "${m.name}" содержит некорректную цену.`);
    }
  });

  return warnings;
}

