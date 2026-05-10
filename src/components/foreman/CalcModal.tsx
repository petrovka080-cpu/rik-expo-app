import { Modal } from "react-native";

import CalcModalContent from "./CalcModalContent";
import type { CalcModalRow } from "./calcModal.model";
import { useCalcModalController } from "./useCalcModalController";

type Props = {
  visible: boolean;
  onClose: () => void;
  onBack?: () => void;
  workType?: { code: string; name: string } | null;
  onAddToRequest?: (rows: CalcModalRow[]) => void;
};

export default function CalcModal(props: Props) {
  const { handleClose, contentProps } = useCalcModalController(props);

  return (
    <Modal visible={props.visible} animationType="slide" onRequestClose={handleClose}>
      <CalcModalContent {...contentProps} />
    </Modal>
  );
}
