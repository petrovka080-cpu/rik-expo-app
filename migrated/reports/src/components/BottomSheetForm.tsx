// FILE: src/components/BottomSheetForm.tsx
// Reusable bottom sheet component for form entry
import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    Modal,
    Pressable,
    ScrollView,
    Animated,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BottomSheetFormProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    onSubmit?: () => void;
    submitLabel?: string;
    submitDisabled?: boolean;
    submitLoading?: boolean;
    height?: number; // percentage of screen height (0-100)
}

export function BottomSheetForm({
    visible,
    onClose,
    title,
    children,
    onSubmit,
    submitLabel = 'Сохранить',
    submitDisabled = false,
    submitLoading = false,
    height = 70,
}: BottomSheetFormProps) {
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const sheetHeight = (SCREEN_HEIGHT * height) / 100;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 65,
                    friction: 11,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: SCREEN_HEIGHT,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible, slideAnim, fadeAnim]);

    if (!visible) return null;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior='padding'
            >
                {/* Backdrop */}
                <Animated.View
                    style={[
                        styles.backdrop,
                        { opacity: fadeAnim },
                    ]}
                >
                    <Pressable style={{ flex: 1 }} onPress={onClose} />
                </Animated.View>

                {/* Sheet */}
                <Animated.View
                    style={[
                        styles.sheet,
                        {
                            height: sheetHeight,
                            transform: [{ translateY: slideAnim }],
                        },
                    ]}
                >
                    {/* Handle bar */}
                    <View style={styles.handleContainer}>
                        <View style={styles.handle} />
                    </View>

                    {/* Header */}
                    <View style={styles.header}>
                        <Pressable onPress={onClose} hitSlop={12} style={styles.closeButton}>
                            <Text style={styles.closeButtonText}>✕</Text>
                        </Pressable>
                        <Text style={styles.title}>{title}</Text>
                        <View style={{ width: 32 }} />
                    </View>

                    {/* Content */}
                    <ScrollView
                        style={styles.content}
                        contentContainerStyle={styles.contentContainer}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {children}
                    </ScrollView>

                    {/* Submit Button */}
                    {onSubmit && (
                        <View style={styles.footer}>
                            <Pressable
                                style={[
                                    styles.submitButton,
                                    submitDisabled && styles.submitButtonDisabled,
                                ]}
                                onPress={onSubmit}
                                disabled={submitDisabled || submitLoading}
                            >
                                <Text style={styles.submitButtonText}>
                                    {submitLoading ? '⏳ Сохранение...' : `💾 ${submitLabel}`}
                                </Text>
                            </Pressable>
                        </View>
                    )}
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

// Form field components
interface FormFieldProps {
    label: string;
    children: React.ReactNode;
    required?: boolean;
}

export function FormField({ label, children, required }: FormFieldProps) {
    return (
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>
                {label}
                {required && <Text style={styles.required}> *</Text>}
            </Text>
            {children}
        </View>
    );
}

interface FormRowProps {
    children: React.ReactNode;
}

export function FormRow({ children }: FormRowProps) {
    return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#1e293b',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 16,
    },
    handleContainer: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 4,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: '#475569',
        borderRadius: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    closeButton: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        backgroundColor: '#334155',
    },
    closeButtonText: {
        fontSize: 16,
        color: '#94a3b8',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
        gap: 16,
    },
    footer: {
        padding: 16,
        paddingBottom: Platform.OS === 'android' ? 32 : 16,
        borderTopWidth: 1,
        borderTopColor: '#334155',
    },
    submitButton: {
        backgroundColor: '#0ea5e9',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        borderBottomWidth: 3,
        borderBottomColor: '#0284c7',
    },
    submitButtonDisabled: {
        backgroundColor: '#475569',
        borderBottomColor: '#334155',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    field: {
        gap: 8,
    },
    fieldLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#94a3b8',
    },
    required: {
        color: '#ef4444',
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
});

export default BottomSheetForm;
