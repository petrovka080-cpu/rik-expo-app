// src/components/ui/Input.tsx
// Design System 2.0 - Input Component (Web-compatible)
import React, { useState, forwardRef, useRef } from 'react';
import {
    View,
    TextInput,
    Text,
    StyleSheet,
    ViewStyle,
    TextStyle,
    TextInputProps,
    TouchableOpacity,
    Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Theme from '../../styles/theme';

export type InputVariant = 'default' | 'filled' | 'outlined';
export type InputSize = 'sm' | 'md' | 'lg';

interface InputProps extends Omit<TextInputProps, 'style'> {
    label?: string;
    error?: string;
    hint?: string;
    variant?: InputVariant;
    size?: InputSize;
    leftIcon?: keyof typeof Ionicons.glyphMap;
    rightIcon?: keyof typeof Ionicons.glyphMap;
    onRightIconPress?: () => void;
    disabled?: boolean;
    containerStyle?: ViewStyle;
    inputStyle?: TextStyle;
}

export const Input = forwardRef<TextInput, InputProps>(({
    label,
    error,
    hint,
    variant = 'default',
    size = 'md',
    leftIcon,
    rightIcon,
    onRightIconPress,
    disabled = false,
    containerStyle,
    inputStyle,
    secureTextEntry,
    ...textInputProps
}, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const borderColorAnim = useRef(new Animated.Value(0)).current;

    const handleFocus = () => {
        setIsFocused(true);
        Animated.timing(borderColorAnim, {
            toValue: 1,
            duration: Theme.motion.fast,
            useNativeDriver: false,
        }).start();
    };

    const handleBlur = () => {
        setIsFocused(false);
        Animated.timing(borderColorAnim, {
            toValue: 0,
            duration: Theme.motion.fast,
            useNativeDriver: false,
        }).start();
    };

    const togglePasswordVisibility = () => {
        setIsPasswordVisible(!isPasswordVisible);
    };

    const variantStyles = getVariantStyles(variant, !!error, disabled);
    const sizeStyles = getSizeStyles(size);
    const iconSize = size === 'sm' ? 18 : size === 'lg' ? 24 : 20;

    const showPasswordToggle = secureTextEntry;
    const actualSecureEntry = secureTextEntry && !isPasswordVisible;

    const borderColor = error
        ? Theme.colors.error
        : isFocused
            ? Theme.colors.primary
            : Theme.colors.border;

    return (
        <View style={[styles.container, containerStyle]}>
            {label && (
                <Text style={[styles.label, disabled && styles.labelDisabled]}>
                    {label}
                </Text>
            )}
            <View
                style={[
                    styles.inputContainer,
                    variantStyles.container,
                    sizeStyles.container,
                    { borderColor },
                ]}
            >
                {leftIcon && (
                    <Ionicons
                        name={leftIcon}
                        size={iconSize}
                        color={isFocused ? Theme.colors.primary : Theme.colors.textMuted}
                        style={styles.leftIcon}
                    />
                )}
                <TextInput
                    ref={ref}
                    {...textInputProps}
                    editable={!disabled}
                    secureTextEntry={actualSecureEntry}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    placeholderTextColor={Theme.colors.textMuted}
                    style={[
                        styles.input,
                        variantStyles.input,
                        sizeStyles.input,
                        leftIcon && styles.inputWithLeftIcon,
                        (rightIcon || showPasswordToggle) && styles.inputWithRightIcon,
                        disabled && styles.inputDisabled,
                        inputStyle,
                    ]}
                />
                {showPasswordToggle && (
                    <TouchableOpacity
                        onPress={togglePasswordVisibility}
                        style={styles.rightIconButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons
                            name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                            size={iconSize}
                            color={Theme.colors.textMuted}
                        />
                    </TouchableOpacity>
                )}
                {rightIcon && !showPasswordToggle && (
                    <TouchableOpacity
                        onPress={onRightIconPress}
                        disabled={!onRightIconPress}
                        style={styles.rightIconButton}
                    >
                        <Ionicons
                            name={rightIcon}
                            size={iconSize}
                            color={Theme.colors.textMuted}
                        />
                    </TouchableOpacity>
                )}
            </View>
            {(error || hint) && (
                <Text style={[styles.hint, error && styles.error]}>
                    {error || hint}
                </Text>
            )}
        </View>
    );
});

Input.displayName = 'Input';

function getVariantStyles(variant: InputVariant, hasError: boolean, disabled: boolean): {
    container: ViewStyle;
    input: TextStyle;
} {
    const disabledBg = disabled ? { backgroundColor: Theme.colors.surfaceLight } : {};

    switch (variant) {
        case 'filled':
            return {
                container: {
                    backgroundColor: Theme.colors.surfaceLight,
                    borderWidth: 0,
                    borderBottomWidth: 2,
                    borderColor: Theme.colors.border,
                    borderRadius: Theme.radius.sm,
                    ...disabledBg,
                },
                input: { color: Theme.colors.textPrimary },
            };
        case 'outlined':
            return {
                container: {
                    backgroundColor: 'transparent',
                    borderWidth: 1.5,
                    borderColor: Theme.colors.border,
                    borderRadius: Theme.radius.md,
                },
                input: { color: Theme.colors.textPrimary },
            };
        case 'default':
        default:
            return {
                container: {
                    backgroundColor: Theme.colors.surface,
                    borderWidth: 1,
                    borderColor: Theme.colors.border,
                    borderRadius: Theme.radius.md,
                    ...disabledBg,
                },
                input: { color: Theme.colors.textPrimary },
            };
    }
}

function getSizeStyles(size: InputSize): {
    container: ViewStyle;
    input: TextStyle;
} {
    switch (size) {
        case 'sm':
            return {
                container: { height: 40 },
                input: { fontSize: 14 },
            };
        case 'lg':
            return {
                container: { height: 56 },
                input: { fontSize: 18 },
            };
        case 'md':
        default:
            return {
                container: { height: 48 },
                input: { fontSize: 16 },
            };
    }
}

const styles = StyleSheet.create({
    container: {
        marginBottom: Theme.spacing.md,
    },
    label: {
        ...Theme.typography.label,
        color: Theme.colors.textPrimary,
        marginBottom: Theme.spacing.xs,
    },
    labelDisabled: {
        color: Theme.colors.textMuted,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
    },
    input: {
        flex: 1,
        paddingHorizontal: Theme.spacing.md,
        ...Theme.typography.body,
    },
    inputWithLeftIcon: {
        paddingLeft: Theme.spacing.xs,
    },
    inputWithRightIcon: {
        paddingRight: Theme.spacing.xs,
    },
    inputDisabled: {
        color: Theme.colors.textMuted,
    },
    leftIcon: {
        marginLeft: Theme.spacing.md,
    },
    rightIconButton: {
        padding: Theme.spacing.sm,
        marginRight: Theme.spacing.xs,
    },
    hint: {
        ...Theme.typography.caption,
        color: Theme.colors.textMuted,
        marginTop: Theme.spacing.xs,
    },
    error: {
        color: Theme.colors.error,
    },
});

export default Input;
