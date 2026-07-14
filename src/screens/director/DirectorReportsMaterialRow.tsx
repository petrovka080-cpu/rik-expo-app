import { Text, View } from "react-native";

import type { RepRow } from "./director.types";
import { officeHumanLabel, officeUomLabel } from "../../shared/i18n/officeRussianDisplay";
import { s } from "./director.styles";
import { styles } from "./DirectorReportsModal.styles";

type Props = {
  item: RepRow;
};

export function DirectorReportsMaterialRow({ item }: Props) {
  const qAll = Number(item.qty_total || 0);
  const qNoReq = Number(item.qty_free || 0);
  const docs = Number(item.docs_cnt || 0);
  const docsNoReq = Number(item.docs_free || 0);

  return (
    <View style={[s.mobCard, styles.cardMb10]}>
      <View style={s.mobMain}>
        <Text style={s.mobTitle} numberOfLines={2}>
          {officeHumanLabel(item.name_human_ru || item.rik_code, "Материал")}
        </Text>
        <Text style={s.mobMeta} numberOfLines={2}>
          {`Выдано: ${qAll} ${officeUomLabel(item.uom, "")} · Док. ${docs}`}
          {qNoReq > 0 ? ` · Без заявки: ${qNoReq} (${docsNoReq} док.)` : ""}
        </Text>
      </View>
    </View>
  );
}
