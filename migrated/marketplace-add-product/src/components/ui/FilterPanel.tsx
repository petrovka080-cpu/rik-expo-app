// src/components/ui/FilterPanel.tsx
// Horizontal/vertical filter panel with category, price, and toggles
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    ScrollView,
    useWindowDimensions,
    ViewStyle,
} from 'react-native';
import { Theme, spacing, radius, breakpoints } from '../../styles/theme';

export interface FilterOption {
    key: string;
    label: string;
    icon?: string;
}

interface FilterPanelProps {
    categories: FilterOption[];
    selectedCategory: string;
    onCategoryChange: (key: string) => void;
    priceRange?: [number, number];
    onPriceChange?: (range: [number, number]) => void;
    inStockOnly?: boolean;
    onInStockChange?: (value: boolean) => void;
    onClearFilters?: () => void;
    style?: ViewStyle;
}

export function FilterPanel({
    categories,
    selectedCategory,
    onCategoryChange,
    inStockOnly = false,
    onInStockChange,
    onClearFilters,
    style,
}: FilterPanelProps) {
    const { width } = useWindowDimensions();
    const isDesktop = width > breakpoints.tablet;

    return (
        <View style={[styles.container, isDesktop && styles.containerDesktop, style]}>
            {/* Category Chips */}
            <ScrollView
                horizontal={true}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[
                    styles.categoriesContainer,
                    isDesktop && styles.categoriesContainerDesktop,
                ]}
            >
                {categories.map((cat) => {
                    const isActive = selectedCategory === cat.key;
                    return (
                        <Pressable
                            key={cat.key}
                            style={({ pressed }) => [
                                styles.chip,
                                isActive && styles.chipActive,
                                pressed && styles.chipPressed,
                            ]}
                            onPress={() => onCategoryChange(cat.key)}
                        >
                            {cat.icon && (
                                <Text style={styles.chipIcon}>{cat.icon}</Text>
                            )}
                            <Text
                                style={[
                                    styles.chipText,
                                    isActive && styles.chipTextActive,
                                ]}
                            >
                                {cat.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </ScrollView>

            {/* Action buttons */}
            <View style={styles.actions}>
                {/* In Stock Toggle */}
                {onInStockChange && (
                    <Pressable
                        style={({ pressed }) => [
                            styles.toggleBtn,
                            inStockOnly && styles.toggleBtnActive,
                            pressed && styles.chipPressed,
                        ]}
                        onPress={() => onInStockChange(!inStockOnly)}
                    >
                        <Text style={styles.toggleIcon}>{inStockOnly ? '✓' : ''}</Text>
                        <Text
                            style={[
                                styles.toggleText,
                                inStockOnly && styles.toggleTextActive,
                            ]}
                        >
                            В наличии
                        </Text>
                    </Pressable>
                )}

                {/* Clear Filters */}
                {onClearFilters && selectedCategory !== 'all' && (
                    <Pressable
                        style={({ pressed }) => [
                            styles.clearBtn,
                            pressed && { opacity: 0.7 },
                        ]}
                        onPress={onClearFilters}
                    >
                        <Text style={styles.clearBtnText}>✕ Сбросить</Text>
                    </Pressable>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#0F1623',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.neutral[30],
    },
    containerDesktop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
    },
    categoriesContainer: {
        paddingHorizontal: spacing.md,
        gap: spacing.sm,
        flexDirection: 'row',
    },
    categoriesContainerDesktop: {
        paddingHorizontal: 0,
        flexWrap: 'wrap',
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.full,
        backgroundColor: Theme.colors.neutral[20],
        gap: spacing.xs,
    },
    chipActive: {
        backgroundColor: Theme.colors.primary,
    },
    chipPressed: {
        opacity: 0.8,
        transform: [{ scale: 0.97 }],
    },
    chipIcon: {
        fontSize: 14,
    },
    chipText: {
        fontSize: 14,
        fontWeight: '600',
        color: Theme.colors.neutral[60],
    },
    chipTextActive: {
        color: '#FFFFFF',
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        marginTop: spacing.sm,
    },
    toggleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.full,
        backgroundColor: Theme.colors.neutral[20],
        borderWidth: 1,
        borderColor: 'transparent',
        gap: spacing.xs,
    },
    toggleBtnActive: {
        backgroundColor: Theme.colors.semantic.success.light,
        borderColor: Theme.colors.semantic.success.main,
    },
    toggleIcon: {
        fontSize: 12,
        fontWeight: '700',
        color: Theme.colors.semantic.success.main,
    },
    toggleText: {
        fontSize: 13,
        fontWeight: '500',
        color: Theme.colors.neutral[60],
    },
    toggleTextActive: {
        color: Theme.colors.semantic.success.dark,
    },
    clearBtn: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    clearBtnText: {
        fontSize: 13,
        color: Theme.colors.semantic.error.main,
        fontWeight: '500',
    },
});

export default FilterPanel;
