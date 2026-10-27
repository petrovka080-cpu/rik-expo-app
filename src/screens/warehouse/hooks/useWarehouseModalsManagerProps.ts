import { useCallback } from "react";
import type { WarehouseModalsManagerProps } from "../components/WarehouseModalsManager";

type Params = Omit<
  WarehouseModalsManagerProps,
  "onCloseRecipientModal" | "onConfirmRecipientModal"
> & {
  setIsRecipientModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  onPickRecipient: (name: string) => void;
};

export function useWarehouseModalsManagerProps(params: Params): WarehouseModalsManagerProps {
  const {
    setIsRecipientModalVisible,
    onPickRecipient,
    ...rest
  } = params;

  const onCloseRecipientModal = useCallback(() => {
    setIsRecipientModalVisible(false);
  }, [setIsRecipientModalVisible]);

  const onConfirmRecipientModal = useCallback((name: string) => {
    onPickRecipient(name);
    setIsRecipientModalVisible(false);
  }, [onPickRecipient, setIsRecipientModalVisible]);

  return {
    ...rest,
    onCloseRecipientModal,
    onConfirmRecipientModal,
  };
}
