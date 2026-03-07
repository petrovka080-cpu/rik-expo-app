import { useCallback } from "react";

type PickWhat = "object" | "level" | "system" | "zone" | "recipient" | null;

export function useWarehousePickerActions(params: {
  setPickModal: React.Dispatch<React.SetStateAction<{ what: PickWhat }>>;
  setIsRecipientModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { setPickModal, setIsRecipientModalVisible } = params;

  const onPickObject = useCallback(() => setPickModal({ what: "object" }), [setPickModal]);
  const onPickLevel = useCallback(() => setPickModal({ what: "level" }), [setPickModal]);
  const onPickSystem = useCallback(() => setPickModal({ what: "system" }), [setPickModal]);
  const onPickZone = useCallback(() => setPickModal({ what: "zone" }), [setPickModal]);
  const onOpenRecipientModal = useCallback(() => setIsRecipientModalVisible(true), [setIsRecipientModalVisible]);

  return {
    onPickObject,
    onPickLevel,
    onPickSystem,
    onPickZone,
    onOpenRecipientModal,
  };
}

