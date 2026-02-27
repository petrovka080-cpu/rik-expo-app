// src/screens/warehouse/components/ExpenditureHeader.tsx
import React from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { UI, s } from "../warehouse.styles";

type Props = {
    recipientText: string;
    onRecipientChange: (text: string) => void;
    onRecipientFocus: () => void;
    onRecipientBlur: () => void;
    recipientSuggestOpen: boolean;
    recipientSuggestions: string[];
    onCommitRecipient: (name: string) => void;
};

function ExpenditureHeader({
    recipientText,
    onRecipientChange,
    onRecipientFocus,
    onRecipientBlur,
    recipientSuggestOpen,
    recipientSuggestions,
    onCommitRecipient,
}: Props) {
    return (
        <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
            <View style={s.sectionBox}>
                <View style={{ marginTop: 2 }}>
                    <Text style={{ color: UI.sub, fontWeight: "800", marginBottom: 6 }}>
                        Получатель
                    </Text>

                    <TextInput
                        value={recipientText}
                        onChangeText={onRecipientChange}
                        placeholder="Введите ФИО получателя…"
                        placeholderTextColor={UI.sub}
                        style={s.input}
                        onFocus={onRecipientFocus}
                        onBlur={onRecipientBlur}
                    />

                    {recipientSuggestOpen && recipientSuggestions.length > 0 ? (
                        <View style={{ marginTop: 8, gap: 8 }}>
                            {recipientSuggestions.map((name: string) => (
                                <Pressable
                                    key={name}
                                    onPress={() => onCommitRecipient(name)}
                                    style={s.openBtn}
                                >
                                    <Text style={s.openBtnText} numberOfLines={1}>
                                        {name}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    ) : null}
                </View>
            </View>
        </View>
    );
}

export default React.memo(ExpenditureHeader);
