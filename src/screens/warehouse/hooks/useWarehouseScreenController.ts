import { useWarehouseScreenActions } from "./useWarehouseScreenActions";
import { useWarehouseScreenData } from "./useWarehouseScreenData";
import { selectWarehouseScreenControllerVm } from "../warehouse.screen.selectors";

export function useWarehouseScreenController() {
  const data = useWarehouseScreenData();
  const actions = useWarehouseScreenActions(data);

  return selectWarehouseScreenControllerVm({ data, actions });
}
