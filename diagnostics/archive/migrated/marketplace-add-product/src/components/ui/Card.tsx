// src/components/ui/Card.tsx
// Design System 2.0 - Card Component (Web-compatible)
import React, { useRef } from 'react';
import {
    View,
    StyleSheet,
    ViewStyle,
    TouchableOpacity,
    Animated,
} from 'react-native';
import Theme from '../../styles/theme';

export type CardVariant = 'default' | 'glass' | 'elevated' | 'outlined' | 'subtle';

interface CardProps {
    children: React.ReactNode;
    variant?: CardVariant;
    onPress?: () => void;
    padding?: keyof typeof Theme.spacing | number;
    style?: ViewStyle;
    animated?: boolean;
}

export function Card({
    children,
    variant = 'default',
    onPress,
    padding = 'md',
    style,
    animated = true,
}: CardProps) {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        if (onPress && animated) {
            Animated.spring(scaleAnim, {
                toValue: 0.98,
                useNativeDriver: true,
            }).start();
        }
    };

    const handlePressOut = () => {
        if (onPress && animated) {
            Animated.spring(scaleAnim, {
                toValue: 1,
                useNativeDriver: true,
            }).start();
        }
    };

    const variantStyle = getVariantStyle(variant);
    const paddingValue = typeof padding === 'number'
        ? padding
        : Theme.spacing[padding];

    const cardStyle: ViewStyle = {
        ...styles.base,
        ...variantStyle,
        padding: paddingValue,
    };

    if (onPress) {
        return (
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <TouchableOpacity
                    onPress={onPress}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    activeOpacity={0.95}
                    style={[cardStyle, style]}
                >
                    {children}
                </TouchableOpacity>
            </Animated.View>
        );
    }

    return (
        <View style={[cardStyle, style]}>
            {children}
        </View>
    );
}

function getVariantStyle(variant: CardVariant): ViewStyle {
    switch (variant) {
        case 'glass':
            return {
                ...Theme.glass.dark,
            };
        case 'elevated':
            return {
                backgroundColor: Theme.colors.surface,
                borderRadius: Theme.radius.xl,
                ...Theme.shadows.lg,
            };
        case 'outlined':
            return {
                backgroundColor: 'transparent',
                borderWidth: 1,
                borderColor: Theme.colors.border,
                borderRadius: Theme.radius.lg,
            };
        case 'subtle':
            return {
                ...Theme.glass.subtle,
            };
        case 'default':
        default:
            return {
                backgroundColor: Theme.colors.surface,
                borderRadius: Theme.radius.lg,
                ...Theme.shadows.sm,
            };
    }
}

const styles = StyleSheet.create({
    base: {
        overflow: 'hidden',
    },
});

// Convenience sub-components
export function CardHeader({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
    return (
        <View style={[cardStyles.header, style]}>
            {children}
        </View>
    );
}

export function CardContent({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
    return (
        <View style={[cardStyles.content, style]}>
            {children}
        </View>
    );
}

export function CardFooter({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
    return (
        <View style={[cardStyles.footer, style]}>
            {children}
        </View>
    );
}

const cardStyles = StyleSheet.create({
    header: {
        marginBottom: Theme.spacing.sm,
    },
    content: {
        flex: 1,
    },
    footer: {
        marginTop: Theme.spacing.sm,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: Theme.spacing.sm,
    },
});

export default Card;
