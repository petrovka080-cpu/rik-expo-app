import { useMemo } from "react";
import type { Option } from "../warehouse.types";
import {
  selectWarehousePickOptions,
  selectWarehousePickTitle,
} from "../warehouse.picker.selectors";

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

  const pickOptions = useMemo(
    () =>
      selectWarehousePickOptions({
        pickWhat,
        pickFilter,
        objectList,
        levelList,
        systemList,
        zoneList,
        recipientList,
      }),
    [pickWhat, pickFilter, objectList, levelList, systemList, zoneList, recipientList],
  );

  const pickTitle = useMemo(() => selectWarehousePickTitle(pickWhat), [pickWhat]);

  return { pickOptions, pickTitle };
}
