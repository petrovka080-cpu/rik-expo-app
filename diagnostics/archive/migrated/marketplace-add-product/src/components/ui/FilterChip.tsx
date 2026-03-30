// src/components/ui/FilterChip.tsx
// Design System 2.0 - Filter Chip Component (Web-compatible)
import React, { useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ViewStyle,
    Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Theme from '../../styles/theme';

interface FilterChipProps {
    label: string;
    selected?: boolean;
    onPress: () => void;
    icon?: keyof typeof Ionicons.glyphMap;
    onRemove?: () => void;
    disabled?: boolean;
    style?: ViewStyle;
}

export function FilterChip({
    label,
    selected = false,
    onPress,
    icon,
    onRemove,
    disabled = false,
    style,
}: FilterChipProps) {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.95,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
        }).start();
    };

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={disabled}
                activeOpacity={0.8}
                style={[
                    styles.chip,
                    selected && styles.chipSelected,
                    disabled && styles.chipDisabled,
                    style,
                ]}
            >
                {icon && (
                    <Ionicons
                        name={icon}
                        size={16}
                        color={selected ? '#FFFFFF' : Theme.colors.textSecondary}
                        style={styles.icon}
                    />
                )}
                <Text
                    style={[
                        styles.label,
                        selected && styles.labelSelected,
                        disabled && styles.labelDisabled,
                    ]}
                    numberOfLines={1}
                >
                    {label}
                </Text>
                {onRemove && selected && (
                    <TouchableOpacity
                        onPress={onRemove}
                        hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                        style={styles.removeButton}
                    >
                        <Ionicons name="close" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
}

// Filter chip group for multiple selection
interface FilterChipGroupProps<T extends string | number> {
    options: Array<{ value: T; label: string; icon?: keyof typeof Ionicons.glyphMap }>;
    selected: T[];
    onChange: (selected: T[]) => void;
    multiple?: boolean;
    scrollable?: boolean;
    style?: ViewStyle;
}

export function FilterChipGroup<T extends string | number>({
    options,
    selected,
    onChange,
    multiple = true,
    scrollable = true,
    style,
}: FilterChipGroupProps<T>) {
    const handlePress = (value: T) => {
        if (multiple) {
            if (selected.includes(value)) {
                onChange(selected.filter(v => v !== value));
            } else {
                onChange([...selected, value]);
            }
        } else {
            onChange(selected.includes(value) ? [] : [value]);
        }
    };

    const chips = options.map(option => (
        <FilterChip
            key={String(option.value)}
            label={option.label}
            icon={option.icon}
            selected={selected.includes(option.value)}
            onPress={() => handlePress(option.value)}
            onRemove={
                selected.includes(option.value)
                    ? () => onChange(selected.filter(v => v !== option.value))
                    : undefined
            }
            style={styles.groupChip}
        />
    ));

    if (scrollable) {
        return (
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.groupContainer, style]}
            >
                {chips}
            </ScrollView>
        );
    }

    return (
        <View style={[styles.groupContainerWrap, style]}>
            {chips}
        </View>
    );
}

const styles = StyleSheet.create({
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Theme.spacing.md,
        paddingVertical: Theme.spacing.sm,
        borderRadius: Theme.radius.full,
        backgroundColor: Theme.colors.surface,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    chipSelected: {
        backgroundColor: Theme.colors.primary,
        borderColor: Theme.colors.primary,
    },
    chipDisabled: {
        opacity: 0.5,
    },
    icon: {
        marginRight: Theme.spacing.xs,
    },
    label: {
        ...Theme.typography.bodySmall,
        color: Theme.colors.textSecondary,
    },
    labelSelected: {
        color: '#FFFFFF',
        fontWeight: '500',
    },
    labelDisabled: {
        color: Theme.colors.textMuted,
    },
    removeButton: {
        marginLeft: Theme.spacing.xs,
    },
    groupContainer: {
        flexDirection: 'row',
        paddingHorizontal: Theme.spacing.md,
        gap: Theme.spacing.sm,
    },
    groupContainerWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Theme.spacing.sm,
    },
    groupChip: {
        marginRight: 0,
    },
});

export default FilterChip;
