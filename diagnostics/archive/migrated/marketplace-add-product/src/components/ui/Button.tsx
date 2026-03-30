// src/components/ui/Button.tsx
// Design System 2.0 - Button Component (Web-compatible)
import React, { useRef } from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    ViewStyle,
    TextStyle,
    View,
    Animated,
} from 'react-native';
import Theme from '../../styles/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: ButtonVariant;
    size?: ButtonSize;
    disabled?: boolean;
    loading?: boolean;
    icon?: React.ReactNode;
    iconPosition?: 'left' | 'right';
    fullWidth?: boolean;
    style?: ViewStyle;
}

export function Button({
    title,
    onPress,
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    icon,
    iconPosition = 'left',
    fullWidth = false,
    style,
}: ButtonProps) {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.97,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
        }).start();
    };

    const variantStyles = getVariantStyles(variant, disabled);
    const sizeStyles = getSizeStyles(size);

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={disabled || loading}
                activeOpacity={0.8}
                style={[
                    styles.base,
                    variantStyles.container,
                    sizeStyles.container,
                    fullWidth && styles.fullWidth,
                    style,
                ]}
            >
                {loading ? (
                    <ActivityIndicator
                        size="small"
                        color={variantStyles.textColor}
                    />
                ) : (
                    <View style={styles.content}>
                        {icon && iconPosition === 'left' && (
                            <View style={styles.iconLeft}>{icon}</View>
                        )}
                        <Text style={[styles.text, variantStyles.text, sizeStyles.text]}>
                            {title}
                        </Text>
                        {icon && iconPosition === 'right' && (
                            <View style={styles.iconRight}>{icon}</View>
                        )}
                    </View>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
}

function getVariantStyles(variant: ButtonVariant, disabled: boolean): {
    container: ViewStyle;
    text: TextStyle;
    textColor: string;
} {
    const opacity = disabled ? 0.5 : 1;

    switch (variant) {
        case 'primary':
            return {
                container: {
                    backgroundColor: Theme.colors.primary,
                    opacity,
                    // Flat design (no shadow)
                },
                text: { color: '#FFFFFF' },
                textColor: '#FFFFFF',
            };
        case 'secondary':
            return {
                container: {
                    backgroundColor: Theme.colors.secondary,
                    opacity,
                    // Flat design
                },
                text: { color: '#FFFFFF' },
                textColor: '#FFFFFF',
            };
        case 'ghost':
            return {
                container: {
                    backgroundColor: 'transparent',
                    opacity,
                },
                text: { color: Theme.colors.primary },
                textColor: Theme.colors.primary,
            };
        case 'destructive':
            return {
                container: {
                    backgroundColor: Theme.colors.error,
                    opacity,
                    // Flat design
                },
                text: { color: '#FFFFFF' },
                textColor: '#FFFFFF',
            };
        case 'outline':
            return {
                container: {
                    backgroundColor: 'transparent',
                    borderWidth: 1.5,
                    borderColor: Theme.colors.primary,
                    opacity,
                },
                text: { color: Theme.colors.primary },
                textColor: Theme.colors.primary,
            };
        default:
            return {
                container: { backgroundColor: Theme.colors.primary, opacity },
                text: { color: '#FFFFFF' },
                textColor: '#FFFFFF',
            };
    }
}

function getSizeStyles(size: ButtonSize): {
    container: ViewStyle;
    text: TextStyle;
} {
    switch (size) {
        case 'sm':
            return {
                container: {
                    paddingVertical: Theme.spacing.xs + 2,
                    paddingHorizontal: Theme.spacing.md,
                    borderRadius: Theme.radius.sm,
                },
                text: Theme.typography.buttonSmall,
            };
        case 'lg':
            return {
                container: {
                    paddingVertical: Theme.spacing.md,
                    paddingHorizontal: Theme.spacing.xl,
                    borderRadius: Theme.radius.lg,
                },
                text: { ...Theme.typography.button, fontSize: 18 },
            };
        case 'md':
        default:
            return {
                container: {
                    paddingVertical: Theme.spacing.sm + 4,
                    paddingHorizontal: Theme.spacing.lg,
                    borderRadius: Theme.radius.md,
                },
                text: Theme.typography.button,
            };
    }
}

const styles = StyleSheet.create({
    base: {
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    fullWidth: {
        width: '100%',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        textAlign: 'center',
    },
    iconLeft: {
        marginRight: Theme.spacing.xs,
    },
    iconRight: {
        marginLeft: Theme.spacing.xs,
    },
});

export default Button;
