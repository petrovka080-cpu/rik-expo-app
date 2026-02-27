import React from "react";
import { Text, View } from "react-native";
import type { ReqItemRow } from "../../lib/catalog_api";
import CloseIconButton from "../../ui/CloseIconButton";

type Props = {
  item: ReqItemRow;
  busy: boolean;
  updating: boolean;
  canEdit: boolean;
  metaLine: string;
  onCancel: (item: ReqItemRow) => void | Promise<void>;
  ui: { btnReject: string };
  styles: typeof import("./foreman.styles").s;
};

function ForemanReqItemRowInner({
  item,
  busy,
  updating,
  canEdit,
  metaLine,
  onCancel,
  ui,
  styles: s,
}: Props) {
  return (
    <View style={s.draftRowCard}>
      <View style={s.draftRowMain}>
        <Text style={s.draftRowTitle} numberOfLines={2} ellipsizeMode="tail">
          {item.name_human}
        </Text>

        <Text style={s.draftRowMeta} numberOfLines={2} ellipsizeMode="tail">
          {metaLine || "-"}
        </Text>

        <Text style={s.draftRowStatus} numberOfLines={1}>
          Статус: <Text style={s.draftRowStatusStrong}>{item.status ?? "-"}</Text>
        </Text>
      </View>

      {canEdit ? (
        <CloseIconButton
          disabled={busy || updating}
          onPress={() => void onCancel(item)}
          accessibilityLabel="Удалить позицию"
          size={24}
          color={ui.btnReject}
        />
      ) : null}
    </View>
  );
}

const ForemanReqItemRow = React.memo(ForemanReqItemRowInner);

export default ForemanReqItemRow;
