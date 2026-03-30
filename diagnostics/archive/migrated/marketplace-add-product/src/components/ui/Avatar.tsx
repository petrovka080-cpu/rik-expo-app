// src/components/ui/Avatar.tsx
// Avatar component with image, initials fallback, and status indicator
import React, { useMemo } from 'react';
import { View, Image, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Theme, radius } from '../../styles/theme';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';
export type AvatarStatus = 'online' | 'offline' | 'busy' | 'away';

interface AvatarProps {
    src?: string | null;
    name?: string;
    size?: AvatarSize;
    status?: AvatarStatus;
    style?: ViewStyle;
}

const SIZES = {
    sm: 32,
    md: 40,
    lg: 56,
    xl: 80,
};

const FONT_SIZES = {
    sm: 12,
    md: 14,
    lg: 20,
    xl: 28,
};

const STATUS_SIZES = {
    sm: 8,
    md: 10,
    lg: 14,
    xl: 18,
};

const STATUS_COLORS: Record<AvatarStatus, string> = {
    online: '#10B981',
    offline: '#94A3B8',
    busy: '#EF4444',
    away: '#F59E0B',
};

const AVATAR_COLORS = [
    '#0EA5E9', // Primary blue
    '#8B5CF6', // Violet
    '#10B981', // Green
    '#F59E0B', // Orange
    '#EF4444', // Red
    '#EC4899', // Pink
    '#06B6D4', // Cyan
];

function getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getColorFromName(name: string): string {
    if (!name) return AVATAR_COLORS[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function Avatar({
    src,
    name = '',
    size = 'md',
    status,
    style
}: AvatarProps) {
    const dimension = SIZES[size];
    const fontSize = FONT_SIZES[size];
    const statusSize = STATUS_SIZES[size];

    const initials = useMemo(() => getInitials(name), [name]);
    const bgColor = useMemo(() => getColorFromName(name), [name]);

    const containerStyle: ViewStyle = {
        width: dimension,
        height: dimension,
        borderRadius: dimension / 2,
    };

    const textStyle: TextStyle = {
        fontSize,
        fontWeight: '600',
        color: '#FFFFFF',
    };

    return (
        <View style={[styles.container, containerStyle, style]}>
            {src ? (
                <Image
                    source={{ uri: src }}
                    style={{
                        width: dimension,
                        height: dimension,
                        borderRadius: dimension / 2,
                        backgroundColor: Theme.colors.surface,
                    }}
                    resizeMode="cover"
                />
            ) : (
                <View style={[styles.fallback, containerStyle, { backgroundColor: bgColor }]}>
                    <Text style={textStyle}>{initials}</Text>
                </View>
            )}

            {status && (
                <View
                    style={[
                        styles.statusBadge,
                        {
                            width: statusSize,
                            height: statusSize,
                            borderRadius: statusSize / 2,
                            backgroundColor: STATUS_COLORS[status],
                            borderWidth: size === 'sm' ? 1.5 : 2,
                        },
                    ]}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
    },
    image: {
        backgroundColor: Theme.colors.surface,
    },
    fallback: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusBadge: {
        position: 'absolute',
        right: 0,
        bottom: 0,
        borderColor: Theme.colors.background,
    },
});

export default Avatar;
