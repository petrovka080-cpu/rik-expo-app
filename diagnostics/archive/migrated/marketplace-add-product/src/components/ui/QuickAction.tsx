// src/components/ui/QuickAction.tsx
// Reusable quick action button component for dashboard screens
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

type QuickActionProps = {
    title: string;
    icon: string;
    color: string;
    onPress?: () => void;
};

export const QuickAction = ({ title, icon, color, onPress }: QuickActionProps) => (
    <Pressable onPress={onPress} style={styles.actionCard}>
        <View style={[styles.actionIconCircle, { backgroundColor: color + '20' }]}>
            <Text style={{ fontSize: 20 }}>{icon}</Text>
        </View>
        <Text style={styles.actionTitle}>{title}</Text>
    </Pressable>
);

const styles = StyleSheet.create({
    actionCard: {
        width: '48%',
        backgroundColor: '#0F1623',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    actionIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    actionTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#F4F4F5',
        textAlign: 'center',
    },
});
