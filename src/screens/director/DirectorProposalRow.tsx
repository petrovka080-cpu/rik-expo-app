import React from "react";
import { View, Text, Pressable } from "react-native";
import { s } from "./director.styles";
import type { ProposalHead } from "./director.types";

type Props = {
  p: ProposalHead;
  screenLock: boolean;
  itemsCount: number;
  loading: boolean;
  fmtDateOnly: (iso?: string | null) => string;
  onOpen: (proposalId: string, screenLock: boolean) => void;
};

function DirectorProposalRow(props: Props) {
  const pidStr = String(props.p.id);
  const pretty = String(props.p.pretty ?? "").trim();
  const title = pretty || `#${pidStr.slice(0, 8)}`;

  return (
    <View style={{ marginBottom: 12 }}>
      <View style={s.groupHeader}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.groupTitle} numberOfLines={1}>
            {title}
          </Text>

          <Text style={s.cardMeta} numberOfLines={1}>
            {props.fmtDateOnly(props.p.submitted_at)}
          </Text>
        </View>

        <View style={s.rightStack}>
          <View style={s.metaPill}>
            <Text style={s.metaPillText}>{`Позиций ${props.itemsCount}`}</Text>
          </View>

          <View style={s.rightStackSpacer} />

          <Pressable
            disabled={props.screenLock}
            onPress={() => props.onOpen(pidStr, props.screenLock)}
            style={[s.openBtn, props.screenLock && { opacity: 0.6 }]}
          >
            <Text style={s.openBtnText}>{props.loading ? "…" : "Открыть"}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default React.memo(DirectorProposalRow);
