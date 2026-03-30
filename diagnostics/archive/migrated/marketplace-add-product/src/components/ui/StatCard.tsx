// src/components/ui/StatCard.tsx
// Reusable stat card component for dashboard screens
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

type StatCardProps = {
    title: string;
    value: number;
    icon: string;
    color: string;
    onPress?: () => void;
};

export const StatCard = ({ title, value, icon, color, onPress }: StatCardProps) => (
    <Pressable onPress={onPress} style={[styles.statCard, { borderLeftColor: color }]}>
        <View style={[styles.statIconBox, { backgroundColor: color + '20' }]}>
            <Text style={{ fontSize: 24 }}>{icon}</Text>
        </View>
        <View>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statTitle}>{title}</Text>
        </View>
    </Pressable>
);

const styles = StyleSheet.create({
    statCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0F1623',
        padding: 12,
        borderRadius: 12,
        marginHorizontal: 4,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    statIconBox: {
        width: 44,
        height: 44,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1e293b',
    },
    statTitle: {
        fontSize: 12,
        color: '#A1A1AA',
        marginTop: 2,
    },
});
