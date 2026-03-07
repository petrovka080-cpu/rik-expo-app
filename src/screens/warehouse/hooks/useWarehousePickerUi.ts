import { useMemo } from "react";
import type { Option } from "../warehouse.types";

type PickWhat = "object" | "level" | "system" | "zone" | "recipient" | null;

export function useWarehousePickerUi(params: {
  pickWhat: PickWhat;
  pickFilter: string;
  objectList: Option[];
  levelList: Option[];
  systemList: Option[];
  zoneList: Option[];
  recipientList: Option[];
}) {
  const { pickWhat, pickFilter, objectList, levelList, systemList, zoneList, recipientList } = params;

  const pickOptions = useMemo(() => {
    const base =
      pickWhat === "object"
        ? objectList
        : pickWhat === "level"
          ? levelList
          : pickWhat === "system"
            ? systemList
            : pickWhat === "zone"
              ? zoneList
              : recipientList;

    const q = pickFilter.trim().toLowerCase();
    if (!q) return base;

    return (base || []).filter((x) => String(x.label || "").toLowerCase().includes(q));
  }, [pickWhat, pickFilter, objectList, levelList, systemList, zoneList, recipientList]);

  const pickTitle = useMemo(() => {
    return pickWhat === "object"
      ? "Выбор объекта"
      : pickWhat === "level"
        ? "Выбор этажа/уровня"
        : pickWhat === "system"
          ? "Выбор системы/вида работ"
          : pickWhat === "zone"
            ? "Выбор зоны/участка"
            : "Выбор получателя";
  }, [pickWhat]);

  return { pickOptions, pickTitle };
}

