import React from 'react';
import { Pressable, StyleSheet, View, Text, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, shadows } from '../../styles/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

interface BackButtonProps {
    /**
     * Optional fallback route if router.canGoBack() is false
     * Default: '/' (home)
     */
    fallbackPath?: string;
    /**
     * Optional dark/light mode override. 
     * Default: 'light' (dark icon on light blur)
     */
    theme?: 'light' | 'dark';
    /**
     * Whether to show absolute positioned top-left safe-area aware
     * Default: false (inline)
     */
    absolute?: boolean;
    /**
     * Optional custom handler to override default back behavior
     */
    onPress?: () => void;
}

export const BackButton: React.FC<BackButtonProps> = ({
    fallbackPath = '/',
    theme = 'light',
    absolute = false,
    onPress
}) => {
    const insets = useSafeAreaInsets();

    const handlePress = () => {
        if (onPress) {
            onPress();
            return;
        }

        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace(fallbackPath as any);
        }
    };

    const Container = Platform.OS === 'ios' ? BlurView : View;
    const containerProps = Platform.OS === 'ios' ? { intensity: 80, tint: theme } : {};

    const btnStyle = [
        styles.button,
        Platform.OS === 'android' && styles.androidButton,
        { backgroundColor: Platform.OS === 'android' ? '#1F2A37' : 'transparent' }
    ];

    const iconColor = theme === 'light' ? '#1E293B' : '#FFFFFF';

    if (absolute) {
        return (
            <Pressable
                onPress={handlePress}
                style={[
                    styles.absoluteContainer,
                    { top: insets.top + 10, left: 16 }
                ]}
            >
                {({ pressed }) => (
                    <Container {...containerProps} style={[btnStyle, pressed && { opacity: 0.7 }]}>
                        <Ionicons name="chevron-back" size={24} color={iconColor} />
                    </Container>
                )}
            </Pressable>
        );
    }

    return (
        <Pressable onPress={handlePress} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
            <View style={[styles.button, styles.inlineButton]}>
                <Ionicons name="chevron-back" size={24} color="#F4F4F5" />
            </View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    absoluteContainer: {
        position: 'absolute',
        zIndex: 100,
        ...shadows.sm, // Keep shadow wrapper for visibility on absolute
    },
    button: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    androidButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderWidth: 1,
        borderColor: '#1F2A37',
        // Removed elevation for flatter iOS look
    },
    inlineButton: {
        width: 40,
        height: 40,
        backgroundColor: '#1F2A37',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#3F3F46',
        ...shadows.none,
    }
});
