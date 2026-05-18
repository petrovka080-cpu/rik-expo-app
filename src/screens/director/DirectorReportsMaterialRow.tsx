import { Text, View } from "react-native";

import type { DirectorReportsCanonicalDiagnostics } from "./director.readModels";
import type { RepRow } from "./director.types";
import { s } from "./director.styles";
import { styles } from "./DirectorReportsModal.styles";

type Props = {
  item: RepRow;
  noWorkNameCount: number;
  noWorkNameExplanation: string;
  reportDiagnostics: DirectorReportsCanonicalDiagnostics | null;
  unresolvedNamesCount: number;
};

export function DirectorReportsMaterialRow({
  item,
  noWorkNameCount,
  noWorkNameExplanation,
  reportDiagnostics,
  unresolvedNamesCount,
}: Props) {
  const qAll = Number(item.qty_total || 0);
  const qNoReq = Number(item.qty_free || 0);
  const docs = Number(item.docs_cnt || 0);
  const docsNoReq = Number(item.docs_free || 0);

  return (
    <View style={[s.mobCard, styles.cardMb10]}>
      <View style={s.mobMain}>
        <Text style={s.mobTitle} numberOfLines={2}>{item.name_human_ru || item.rik_code}</Text>
        <Text style={s.mobMeta} numberOfLines={2}>
          {`Выдано: ${qAll} ${item.uom} · Док. ${docs}`}
          {qNoReq > 0 ? ` · Без заявки: ${qNoReq} (${docsNoReq} док.)` : ""}
        </Text>
      </View>
      {noWorkNameCount > 0 ? (
        <Text style={[s.mobMeta, styles.mt4]} numberOfLines={3}>
          {`Без вида работ: ${noWorkNameCount}${reportDiagnostics ? ` (${reportDiagnostics.noWorkName.share}% позиций)` : ""} · ${noWorkNameExplanation}`}
        </Text>
      ) : null}
      {unresolvedNamesCount > 0 ? (
        <Text style={[s.mobMeta, styles.mt4WarningText]} numberOfLines={3}>
          {`Неразрешённых кодов: ${unresolvedNamesCount}. Именование частично деградировало, но экран сохраняет backend-owned truth.`}
        </Text>
      ) : null}
      {reportDiagnostics ? (
        <Text style={[s.mobMeta, styles.mt4]} numberOfLines={3}>
          {`Именование: объекты ${reportDiagnostics.naming.objectNamingSourceStatus} · работы ${reportDiagnostics.naming.workNamingSourceStatus} · names ${reportDiagnostics.naming.namesViewStatus} · overrides ${reportDiagnostics.naming.overridesStatus} · ledger ${reportDiagnostics.naming.balanceViewStatus}`}
        </Text>
      ) : null}
    </View>
  );
}
