import { useIsFocused } from "@react-navigation/native";

import { useWarehouseScreenActions } from "./useWarehouseScreenActions";
import { useWarehouseScreenData } from "./useWarehouseScreenData";
import { selectWarehouseScreenControllerVm } from "../warehouse.screen.selectors";

export function useWarehouseScreenController() {
  const isScreenFocused = useIsFocused();
  const data = useWarehouseScreenData({ isScreenFocused });
  const actions = useWarehouseScreenActions(data);

  return selectWarehouseScreenControllerVm({ data, actions });
}
