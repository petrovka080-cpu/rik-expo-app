// src/components/ui/Modal.tsx
// Design System 2.0 - Modal Component (Web-compatible)
import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal as RNModal,
    TouchableOpacity,
    TouchableWithoutFeedback,
    KeyboardAvoidingView,
    Platform,
    ViewStyle,
    Dimensions,
    Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Theme from '../../styles/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export type ModalVariant = 'center' | 'bottom' | 'fullscreen';

interface ModalProps {
    visible: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    variant?: ModalVariant;
    showCloseButton?: boolean;
    closeOnBackdropPress?: boolean;
    contentStyle?: ViewStyle;
}

export function Modal({
    visible,
    onClose,
    title,
    children,
    variant = 'center',
    showCloseButton = true,
    closeOnBackdropPress = true,
    contentStyle,
}: ModalProps) {
    const backdropOpacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(variant === 'bottom' ? SCREEN_HEIGHT : 50)).current;
    const scale = useRef(new Animated.Value(0.9)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(backdropOpacity, {
                    toValue: 1,
                    duration: Theme.motion.normal,
                    useNativeDriver: true,
                }),
                Animated.spring(translateY, {
                    toValue: 0,
                    useNativeDriver: true,
                }),
                Animated.spring(scale, {
                    toValue: 1,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            translateY.setValue(variant === 'bottom' ? SCREEN_HEIGHT : 50);
            scale.setValue(0.9);
            backdropOpacity.setValue(0);
        }
    }, [visible]);

    const handleClose = () => {
        Animated.parallel([
            Animated.timing(backdropOpacity, {
                toValue: 0,
                duration: Theme.motion.fast,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: variant === 'bottom' ? SCREEN_HEIGHT : 50,
                duration: Theme.motion.normal,
                useNativeDriver: true,
            }),
        ]).start(() => onClose());
    };

    const variantStyles = getVariantStyles(variant);

    const contentAnimatedStyle = variant === 'bottom'
        ? { transform: [{ translateY }] }
        : { transform: [{ translateY }, { scale }] };

    return (
        <RNModal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView
                behavior='padding'
                style={styles.container}
            >
                <TouchableWithoutFeedback
                    onPress={closeOnBackdropPress ? handleClose : undefined}
                >
                    <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
                </TouchableWithoutFeedback>

                <Animated.View
                    style={[
                        styles.content,
                        variantStyles.content,
                        contentAnimatedStyle,
                        contentStyle,
                    ]}
                >
                    {(title || showCloseButton) && (
                        <View style={styles.header}>
                            {title && (
                                <Text style={styles.title}>{title}</Text>
                            )}
                            {showCloseButton && (
                                <TouchableOpacity
                                    onPress={handleClose}
                                    style={styles.closeButton}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <Ionicons
                                        name="close"
                                        size={24}
                                        color={Theme.colors.textSecondary}
                                    />
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                    <View style={styles.body}>
                        {children}
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </RNModal>
    );
}

function getVariantStyles(variant: ModalVariant): { content: ViewStyle } {
    switch (variant) {
        case 'bottom':
            return {
                content: {
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    borderTopLeftRadius: Theme.radius['2xl'],
                    borderTopRightRadius: Theme.radius['2xl'],
                    borderBottomLeftRadius: 0,
                    borderBottomRightRadius: 0,
                    maxHeight: SCREEN_HEIGHT * 0.9,
                },
            };
        case 'fullscreen':
            return {
                content: {
                    flex: 1,
                    margin: 0,
                    borderRadius: 0,
                },
            };
        case 'center':
        default:
            return {
                content: {
                    maxWidth: 400,
                    width: '90%',
                    alignSelf: 'center',
                    maxHeight: SCREEN_HEIGHT * 0.85,
                },
            };
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    content: {
        backgroundColor: Theme.colors.surface,
        borderRadius: Theme.radius.xl,
        ...Theme.shadows.xl,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Theme.spacing.lg,
        paddingTop: Theme.spacing.lg,
        paddingBottom: Theme.spacing.sm,
    },
    title: {
        ...Theme.typography.h3,
        color: Theme.colors.textPrimary,
        flex: 1,
    },
    closeButton: {
        padding: Theme.spacing.xs,
        marginLeft: Theme.spacing.sm,
    },
    body: {
        paddingHorizontal: Theme.spacing.lg,
        paddingBottom: Theme.spacing.lg,
    },
});

export default Modal;
