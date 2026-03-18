// src/components/ui/Toast.tsx
// Design System 2.0 - Toast Notification Component (Web-compatible)
import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Theme from '../../styles/theme';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
    visible: boolean;
    message: string;
    variant?: ToastVariant;
    duration?: number;
    onDismiss: () => void;
    action?: {
        label: string;
        onPress: () => void;
    };
}

export function Toast({
    visible,
    message,
    variant = 'info',
    duration = 4000,
    onDismiss,
    action,
}: ToastProps) {
    const translateY = useRef(new Animated.Value(-100)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(translateY, {
                    toValue: 0,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: Theme.motion.fast,
                    useNativeDriver: true,
                }),
            ]).start();

            if (duration > 0) {
                const timer = setTimeout(dismiss, duration);
                return () => clearTimeout(timer);
            }
        }
    }, [visible, duration]);

    const dismiss = () => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: -100,
                duration: Theme.motion.normal,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 0,
                duration: Theme.motion.fast,
                useNativeDriver: true,
            }),
        ]).start(() => onDismiss());
    };

    const variantStyles = getVariantStyles(variant);

    if (!visible) return null;

    return (
        <Animated.View
            style={[
                styles.container,
                variantStyles.container,
                { transform: [{ translateY }], opacity },
            ]}
        >
            <View style={styles.content}>
                <Ionicons
                    name={variantStyles.icon}
                    size={22}
                    color={variantStyles.iconColor}
                    style={styles.icon}
                />
                <Text
                    style={[styles.message, { color: variantStyles.textColor }]}
                    numberOfLines={2}
                >
                    {message}
                </Text>
                {action && (
                    <TouchableOpacity
                        onPress={() => {
                            action.onPress();
                            dismiss();
                        }}
                        style={styles.actionButton}
                    >
                        <Text style={[styles.actionText, { color: variantStyles.iconColor }]}>
                            {action.label}
                        </Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    onPress={dismiss}
                    style={styles.closeButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons
                        name="close"
                        size={18}
                        color={variantStyles.textColor}
                    />
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
}

function getVariantStyles(variant: ToastVariant): {
    container: any;
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    textColor: string;
} {
    switch (variant) {
        case 'success':
            return {
                container: {
                    backgroundColor: Theme.colors.semantic.success.dark,
                    borderLeftColor: Theme.colors.semantic.success.main,
                },
                icon: 'checkmark-circle',
                iconColor: Theme.colors.semantic.success.main,
                textColor: Theme.colors.semantic.success.light,
            };
        case 'error':
            return {
                container: {
                    backgroundColor: Theme.colors.semantic.error.dark,
                    borderLeftColor: Theme.colors.semantic.error.main,
                },
                icon: 'alert-circle',
                iconColor: Theme.colors.semantic.error.main,
                textColor: Theme.colors.semantic.error.light,
            };
        case 'warning':
            return {
                container: {
                    backgroundColor: Theme.colors.semantic.warning.dark,
                    borderLeftColor: Theme.colors.semantic.warning.main,
                },
                icon: 'warning',
                iconColor: Theme.colors.semantic.warning.main,
                textColor: Theme.colors.semantic.warning.light,
            };
        case 'info':
        default:
            return {
                container: {
                    backgroundColor: Theme.colors.semantic.info.dark,
                    borderLeftColor: Theme.colors.semantic.info.main,
                },
                icon: 'information-circle',
                iconColor: Theme.colors.semantic.info.main,
                textColor: Theme.colors.semantic.info.light,
            };
    }
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 60,
        left: Theme.spacing.md,
        right: Theme.spacing.md,
        borderRadius: Theme.radius.md,
        borderLeftWidth: 4,
        ...Theme.shadows.lg,
        zIndex: 9999,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Theme.spacing.md,
    },
    icon: {
        marginRight: Theme.spacing.sm,
    },
    message: {
        ...Theme.typography.bodySmall,
        flex: 1,
    },
    actionButton: {
        marginLeft: Theme.spacing.sm,
        paddingHorizontal: Theme.spacing.sm,
        paddingVertical: Theme.spacing.xs,
    },
    actionText: {
        ...Theme.typography.buttonSmall,
    },
    closeButton: {
        marginLeft: Theme.spacing.xs,
        padding: Theme.spacing.xs,
    },
});

// Toast imperative API
type ToastConfig = Omit<ToastProps, 'visible' | 'onDismiss'>;

class ToastManager {
    private static instance: ToastManager;
    private listeners: ((config: ToastConfig | null) => void)[] = [];

    static getInstance(): ToastManager {
        if (!ToastManager.instance) {
            ToastManager.instance = new ToastManager();
        }
        return ToastManager.instance;
    }

    subscribe(listener: (config: ToastConfig | null) => void) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    show(config: ToastConfig) {
        this.listeners.forEach(l => l(config));
    }

    hide() {
        this.listeners.forEach(l => l(null));
    }
}

export const toast = {
    success: (message: string, options?: Partial<ToastConfig>) =>
        ToastManager.getInstance().show({ message, variant: 'success', ...options }),
    error: (message: string, options?: Partial<ToastConfig>) =>
        ToastManager.getInstance().show({ message, variant: 'error', ...options }),
    warning: (message: string, options?: Partial<ToastConfig>) =>
        ToastManager.getInstance().show({ message, variant: 'warning', ...options }),
    info: (message: string, options?: Partial<ToastConfig>) =>
        ToastManager.getInstance().show({ message, variant: 'info', ...options }),
    hide: () => ToastManager.getInstance().hide(),
};

export default Toast;
