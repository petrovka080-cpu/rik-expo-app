import { useIsFocused } from "@react-navigation/native";

import { useWarehouseScreenActions } from "./useWarehouseScreenActions";
import { useWarehouseScreenData } from "./useWarehouseScreenData";
import { useWarehouseScreenActiveRef } from "./useWarehouseScreenActivity";
import { selectWarehouseScreenControllerVm } from "../warehouse.screen.selectors";

export function useWarehouseScreenController() {
  const isScreenFocused = useIsFocused();
  const screenActiveRef = useWarehouseScreenActiveRef(isScreenFocused);
  const data = useWarehouseScreenData({ isScreenFocused, screenActiveRef });
  const actions = useWarehouseScreenActions(data);

  return selectWarehouseScreenControllerVm({ data, actions });
}
