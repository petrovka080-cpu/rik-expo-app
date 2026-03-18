// src/components/ui/Rating.tsx
// Star rating display component
import React from 'react';
import { View, Text, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { Theme, spacing } from '../../styles/theme';

interface RatingProps {
    value: number;           // 0-5
    max?: number;            // Default 5
    size?: 'sm' | 'md' | 'lg';
    showValue?: boolean;
    reviewsCount?: number;
    interactive?: boolean;
    onChange?: (value: number) => void;
    style?: ViewStyle;
}

const SIZES = {
    sm: 14,
    md: 18,
    lg: 24,
};

export function Rating({
    value,
    max = 5,
    size = 'md',
    showValue = false,
    reviewsCount,
    interactive = false,
    onChange,
    style,
}: RatingProps) {
    const starSize = SIZES[size];
    const normalizedValue = Math.min(Math.max(0, value), max);

    const renderStar = (index: number) => {
        const filled = index < Math.floor(normalizedValue);
        const half = !filled && index < normalizedValue && normalizedValue % 1 >= 0.5;

        let emoji = '☆';
        if (filled) emoji = '★';
        else if (half) emoji = '⯨'; // Half star

        const starElement = (
            <Text
                key={index}
                style={[
                    styles.star,
                    { fontSize: starSize },
                    filled || half ? styles.filledStar : styles.emptyStar,
                ]}
            >
                {filled ? '★' : '☆'}
            </Text>
        );

        if (interactive && onChange) {
            return (
                <Pressable
                    key={index}
                    onPress={() => onChange(index + 1)}
                    hitSlop={4}
                >
                    {starElement}
                </Pressable>
            );
        }

        return starElement;
    };

    return (
        <View style={[styles.container, style]}>
            <View style={styles.starsRow}>
                {Array.from({ length: max }, (_, i) => renderStar(i))}
            </View>

            {showValue && (
                <Text style={[styles.valueText, { fontSize: starSize - 2 }]}>
                    {normalizedValue.toFixed(1)}
                </Text>
            )}

            {reviewsCount !== undefined && (
                <Text style={[styles.reviewsText, { fontSize: starSize - 4 }]}>
                    ({reviewsCount})
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    starsRow: {
        flexDirection: 'row',
        gap: 2,
    },
    star: {
        lineHeight: undefined,
    },
    filledStar: {
        color: '#F59E0B', // Warm orange/gold
    },
    emptyStar: {
        color: '#CBD5E1',
    },
    valueText: {
        fontWeight: '600',
        color: Theme.colors.textPrimary,
        marginLeft: spacing.xs,
    },
    reviewsText: {
        color: Theme.colors.textSecondary,
    },
});

export default Rating;
