import React, { useState, useEffect } from "react";
import {
    Modal,
    View,
    Text,
    TextInput,
    Pressable,
    StyleSheet,
    Platform,
    KeyboardAvoidingView,
    ActivityIndicator,
} from "react-native";
import { BlurView } from "expo-blur";

interface Props {
    visible: boolean;
    initialFio: string;
    onConfirm: (fio: string) => void;
    loading?: boolean;
    history?: string[];
}

export default function WarehouseFioModal({ visible, initialFio, onConfirm, loading, history = [] }: Props) {
    const [fio, setFio] = useState(initialFio);

    useEffect(() => {
        if (visible) {
            setFio(initialFio);
        }
    }, [visible, initialFio]);

    const handleConfirm = () => {
        if (!fio.trim()) return;
        onConfirm(fio.trim());
    };

    const isConfirmedMode = !!initialFio.trim();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={() => { }}
        >
            <View style={st.overlay}>
                {Platform.OS !== "web" ? (
                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                ) : (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.7)" }]} />
                )}

                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={st.centeredView}
                >
                    <View style={st.modalView}>
                        <Text style={st.title}>
                            {isConfirmedMode ? "Подтвердите ФИО" : "Представьтесь"}
                        </Text>

                        <Text style={st.subTitle}>
                            {isConfirmedMode
                                ? "Это необходимо для формирования корректных складских документов на сегодня."
                                : "Введите ваше ФИО для начала работы со складским экраном."}
                        </Text>

                        <View style={st.inputWrapper}>
                            <TextInput
                                style={st.input}
                                value={fio}
                                onChangeText={setFio}
                                placeholder="Фамилия Имя Отчество"
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                autoCapitalize="words"
                                editable={!loading}
                            />
                        </View>

                        {history.length > 0 && (
                            <View style={st.history}>
                                <Text style={st.historyTitle}>Последние:</Text>
                                <View style={st.historyList}>
                                    {history.map((item, idx) => (
                                        <Pressable
                                            key={`${item}-${idx}`}
                                            onPress={() => setFio(item)}
                                            style={st.historyItem}
                                        >
                                            <Text style={st.historyItemText} numberOfLines={1}>
                                                {item}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>
                        )}

                        <View style={st.actions}>
                            {isConfirmedMode && (
                                <Pressable
                                    onPress={() => setFio("")}
                                    style={[st.btn, st.btnSecondary]}
                                    disabled={loading}
                                >
                                    <Text style={st.btnSecondaryText}>Сменить</Text>
                                </Pressable>
                            )}

                            <Pressable
                                onPress={handleConfirm}
                                style={[
                                    st.btn,
                                    st.btnPrimary,
                                    (!fio.trim() || loading) && { opacity: 0.5 }
                                ]}
                                disabled={!fio.trim() || loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#0B0F14" />
                                ) : (
                                    <Text style={st.btnPrimaryText}>
                                        {isConfirmedMode ? "Подтвердить" : "Сохранить"}
                                    </Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const st = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.65)",
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
    },
    centeredView: {
        width: "100%",
        maxWidth: 380,
    },
    modalView: {
        backgroundColor: "#0F172A",
        borderRadius: 28,
        padding: 24,
        borderWidth: 1.5,
        borderColor: "rgba(255,255,255,0.14)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.5,
        shadowRadius: 30,
        elevation: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: "900",
        color: "#F8FAFC",
        marginBottom: 8,
        textAlign: "center",
        letterSpacing: -0.5,
    },
    subTitle: {
        fontSize: 14,
        color: "#94A3B8",
        textAlign: "center",
        marginBottom: 28,
        lineHeight: 20,
        fontWeight: "600",
    },
    inputWrapper: {
        marginBottom: 24,
    },
    input: {
        backgroundColor: "rgba(255,255,255,0.06)",
        borderWidth: 1.5,
        borderColor: "rgba(255,255,255,0.1)",
        borderRadius: 18,
        paddingHorizontal: 18,
        paddingVertical: 16,
        color: "#F8FAFC",
        fontSize: 16,
        fontWeight: "800",
    },
    history: {
        marginBottom: 28,
    },
    historyTitle: {
        fontSize: 11,
        color: "#64748B",
        fontWeight: "900",
        marginBottom: 10,
        marginLeft: 4,
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    historyList: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    historyItem: {
        backgroundColor: "rgba(255,255,255,0.08)",
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.12)",
    },
    historyItemText: {
        color: "#F8FAFC",
        fontSize: 13,
        fontWeight: "800",
    },
    actions: {
        flexDirection: "row",
        gap: 12,
    },
    btn: {
        flex: 1,
        height: 56,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
    },
    btnPrimary: {
        backgroundColor: "#22C55E",
    },
    btnPrimaryText: {
        color: "#0B0F14",
        fontWeight: "900",
        fontSize: 16,
        letterSpacing: 0.2,
    },
    btnSecondary: {
        backgroundColor: "rgba(255,255,255,0.08)",
        borderWidth: 1.5,
        borderColor: "rgba(255,255,255,0.12)",
    },
    btnSecondaryText: {
        color: "#F8FAFC",
        fontWeight: "900",
        fontSize: 15,
    },
});
