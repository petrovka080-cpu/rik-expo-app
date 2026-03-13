import type { Option } from "./warehouse.types";

type PickWhat = "object" | "level" | "system" | "zone" | "recipient" | null;

function selectWarehousePickBaseList(params: {
  pickWhat: PickWhat;
  objectList: Option[];
  levelList: Option[];
  systemList: Option[];
  zoneList: Option[];
  recipientList: Option[];
}) {
  return params.pickWhat === "object"
    ? params.objectList
    : params.pickWhat === "level"
      ? params.levelList
      : params.pickWhat === "system"
        ? params.systemList
        : params.pickWhat === "zone"
          ? params.zoneList
          : params.recipientList;
}

export function selectWarehousePickOptions(params: {
  pickWhat: PickWhat;
  pickFilter: string;
  objectList: Option[];
  levelList: Option[];
  systemList: Option[];
  zoneList: Option[];
  recipientList: Option[];
}) {
  const base = selectWarehousePickBaseList(params);
  const q = params.pickFilter.trim().toLowerCase();
  if (!q) return base;

  return (base || []).filter((x) => String(x.label || "").toLowerCase().includes(q));
}

export function selectWarehousePickTitle(pickWhat: PickWhat) {
  return pickWhat === "object"
    ? "Выбор объекта"
    : pickWhat === "level"
      ? "Выбор этажа/уровня"
      : pickWhat === "system"
        ? "Выбор системы/вида работ"
        : pickWhat === "zone"
          ? "Выбор зоны/участка"
          : "Выбор получателя";
}
