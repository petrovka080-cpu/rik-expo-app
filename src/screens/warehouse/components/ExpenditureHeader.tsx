// src/screens/warehouse/components/ExpenditureHeader.tsx
import React from "react";
import { View, Text, Pressable } from "react-native";
import { UI, s } from "../warehouse.styles";
import SectionBlock from "../../../ui/SectionBlock";

type Props = {
  recipientText: string;
  onOpenRecipientModal: () => void;
};

function ExpenditureHeader({ recipientText, onOpenRecipientModal }: Props) {
  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
      <SectionBlock style={s.sectionBox} contentStyle={{ gap: 0 }}>
        <View style={{ marginTop: 2 }}>
          <Text style={{ color: UI.sub, fontWeight: "800", marginBottom: 6 }}>
            Эту партию получает
          </Text>

          <Pressable
            testID="warehouse-issue-recipient-open"
            accessibilityLabel="warehouse-issue-recipient-open"
            onPress={onOpenRecipientModal}
            style={[
              s.input,
              { justifyContent: "center", minHeight: 48 },
              !recipientText.trim() && { borderColor: UI.accent },
            ]}
          >
            <Text
              style={{
                color: recipientText ? UI.text : UI.sub,
                fontWeight: "800",
              }}
            >
              {recipientText ? `👤 ${recipientText}` : "Выбрать получателя *"}
            </Text>
          </Pressable>
        </View>
      </SectionBlock>
    </View>
  );
}

export default React.memo(ExpenditureHeader);
