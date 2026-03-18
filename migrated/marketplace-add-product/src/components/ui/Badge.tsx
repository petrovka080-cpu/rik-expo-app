// src/components/ui/Badge.tsx
// Design System 2.0 - Badge Component
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ViewStyle,
    TextStyle,
} from 'react-native';
import Theme from '../../styles/theme';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline';
export type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
    label: string;
    variant?: BadgeVariant;
    size?: BadgeSize;
    dot?: boolean;
    icon?: React.ReactNode;
    style?: ViewStyle;
}

export function Badge({
    label,
    variant = 'default',
    size = 'md',
    dot = false,
    icon,
    style,
}: BadgeProps) {
    const variantStyles = getVariantStyles(variant);
    const sizeStyles = getSizeStyles(size);

    return (
        <View style={[styles.container, variantStyles.container, sizeStyles.container, style]}>
            {dot && (
                <View style={[styles.dot, { backgroundColor: variantStyles.dotColor }]} />
            )}
            {icon && (
                <View style={styles.icon}>{icon}</View>
            )}
            <Text style={[styles.label, variantStyles.text, sizeStyles.text]}>
                {label}
            </Text>
        </View>
    );
}

// Notification count badge
interface CountBadgeProps {
    count: number;
    max?: number;
    variant?: 'primary' | 'error';
    style?: ViewStyle;
}

export function CountBadge({
    count,
    max = 99,
    variant = 'error',
    style,
}: CountBadgeProps) {
    if (count <= 0) return null;

    const displayCount = count > max ? `${max}+` : String(count);
    const bgColor = variant === 'primary' ? Theme.colors.primary : Theme.colors.error;

    return (
        <View style={[countStyles.container, { backgroundColor: bgColor }, style]}>
            <Text style={countStyles.text}>{displayCount}</Text>
        </View>
    );
}

function getVariantStyles(variant: BadgeVariant): {
    container: ViewStyle;
    text: TextStyle;
    dotColor: string;
} {
    switch (variant) {
        case 'success':
            return {
                container: { backgroundColor: Theme.colors.semantic.success.light },
                text: { color: Theme.colors.semantic.success.dark },
                dotColor: Theme.colors.semantic.success.main,
            };
        case 'warning':
            return {
                container: { backgroundColor: Theme.colors.semantic.warning.light },
                text: { color: Theme.colors.semantic.warning.dark },
                dotColor: Theme.colors.semantic.warning.main,
            };
        case 'error':
            return {
                container: { backgroundColor: Theme.colors.semantic.error.light },
                text: { color: Theme.colors.semantic.error.dark },
                dotColor: Theme.colors.semantic.error.main,
            };
        case 'info':
            return {
                container: { backgroundColor: Theme.colors.semantic.info.light },
                text: { color: Theme.colors.semantic.info.dark },
                dotColor: Theme.colors.semantic.info.main,
            };
        case 'outline':
            return {
                container: {
                    backgroundColor: 'transparent',
                    borderWidth: 1,
                    borderColor: Theme.colors.border,
                },
                text: { color: Theme.colors.textSecondary },
                dotColor: Theme.colors.textMuted,
            };
        case 'default':
        default:
            return {
                container: { backgroundColor: Theme.colors.surfaceLight },
                text: { color: Theme.colors.textPrimary },
                dotColor: Theme.colors.textMuted,
            };
    }
}

function getSizeStyles(size: BadgeSize): {
    container: ViewStyle;
    text: TextStyle;
} {
    switch (size) {
        case 'sm':
            return {
                container: {
                    paddingHorizontal: Theme.spacing.xs + 2,
                    paddingVertical: 2,
                    borderRadius: Theme.radius.xs,
                },
                text: { fontSize: 10 },
            };
        case 'lg':
            return {
                container: {
                    paddingHorizontal: Theme.spacing.md,
                    paddingVertical: Theme.spacing.xs,
                    borderRadius: Theme.radius.md,
                },
                text: { fontSize: 14 },
            };
        case 'md':
        default:
            return {
                container: {
                    paddingHorizontal: Theme.spacing.sm,
                    paddingVertical: Theme.spacing.xs - 2,
                    borderRadius: Theme.radius.sm,
                },
                text: { fontSize: 12 },
            };
    }
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: Theme.spacing.xs,
    },
    icon: {
        marginRight: Theme.spacing.xs - 2,
    },
    label: {
        fontWeight: '500',
    },
});

const countStyles = StyleSheet.create({
    container: {
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 5,
    },
    text: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '600',
    },
});

export default Badge;
