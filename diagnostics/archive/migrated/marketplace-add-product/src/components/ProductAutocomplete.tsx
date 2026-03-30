/**
 * ProductAutocomplete - Search component for product names from catalog
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { searchCatalogItems } from '../lib/api/units_api';
import { useTheme } from '../context/ThemeContext';

interface AutocompleteResult {
    name: string;
    uom: string | null;
    rik_code: string | null;
}

interface ProductAutocompleteProps {
    value: string;
    onChangeText: (text: string) => void;
    onSelectItem?: (item: AutocompleteResult) => void;
    placeholder?: string;
    style?: any;
}

// Internal theme fallbacks or constants if needed

export const ProductAutocomplete: React.FC<ProductAutocompleteProps> = ({
    value,
    onChangeText,
    onSelectItem,
    placeholder = 'Введите название товара',
    style,
}) => {
    const { colors } = useTheme();
    const [results, setResults] = useState<AutocompleteResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inputRef = useRef<TextInput>(null);

    // Debounced search
    const handleSearch = useCallback(async (query: string) => {
        if (query.trim().length < 2) {
            setResults([]);
            setShowDropdown(false);
            return;
        }

        setLoading(true);
        try {
            const items = await searchCatalogItems(query, 15);
            setResults(items);
            setShowDropdown(items.length > 0);
        } catch (e) {
            console.error('[ProductAutocomplete] Search error:', e);
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Handle text change with debounce
    const handleTextChange = useCallback((text: string) => {
        onChangeText(text);

        // Clear previous debounce
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        // Debounce search
        debounceRef.current = setTimeout(() => {
            handleSearch(text);
        }, 300);
    }, [onChangeText, handleSearch]);

    // Handle item selection
    const handleSelect = useCallback((item: AutocompleteResult) => {
        onChangeText(item.name);
        setShowDropdown(false);
        setResults([]);

        if (onSelectItem) {
            onSelectItem(item);
        }
    }, [onChangeText, onSelectItem]);

    // Hide dropdown on blur (with delay for click handling)
    const handleBlur = useCallback(() => {
        setTimeout(() => {
            setShowDropdown(false);
        }, 200);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);

    const renderItem = useCallback(({ item }: { item: AutocompleteResult }) => (
        <Pressable
            style={[styles.resultItem, { borderBottomColor: colors.border }]}
            onPress={() => handleSelect(item)}
        >
            <Text style={[styles.resultName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
            {item.uom && (
                <Text style={[styles.resultUom, { backgroundColor: colors.background, color: colors.textSecondary }]}>{item.uom}</Text>
            )}
        </Pressable>
    ), [handleSelect]);

    return (
        <View style={styles.container}>
            <View style={styles.inputContainer}>
                <TextInput
                    ref={inputRef}
                    style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }, style]}
                    value={value}
                    onChangeText={handleTextChange}
                    onFocus={() => value.length >= 2 && results.length > 0 && setShowDropdown(true)}
                    onBlur={handleBlur}
                    placeholder={placeholder}
                    placeholderTextColor={colors.textMuted}
                />
                {loading && (
                    <ActivityIndicator
                        size="small"
                        color={colors.primary}
                        style={styles.loader}
                    />
                )}
            </View>

            {showDropdown && results.length > 0 && (
                <View style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <FlatList
                        data={results}
                        keyExtractor={(item, index) => `${item.name}-${index}`}
                        renderItem={renderItem}
                        keyboardShouldPersistTaps="handled"
                        style={styles.list}
                        nestedScrollEnabled
                    />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        zIndex: 100,
    },
    inputContainer: {
        position: 'relative',
    },
    input: {
        height: 48,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingRight: 40,
    },
    loader: {
        position: 'absolute',
        right: 12,
        top: 14,
    },
    dropdown: {
        position: 'absolute',
        top: 52,
        left: 0,
        right: 0,
        borderRadius: 10,
        maxHeight: 200,
        ...Platform.select({
            web: {
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            },
            default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
                elevation: 8,
            },
        }),
    },
    list: {
        maxHeight: 200,
    },
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderBottomWidth: 1,
    },
    resultName: {
        flex: 1,
        fontSize: 14,
    },
    resultUom: {
        fontSize: 12,
        marginLeft: 8,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
});

export default ProductAutocomplete;
