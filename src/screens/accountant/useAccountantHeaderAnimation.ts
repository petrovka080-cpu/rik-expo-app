import { useRef } from "react";
import { Animated } from "react-native";

export function useAccountantHeaderAnimation() {
    const HEADER_MAX = 210;
    const HEADER_MIN = 76;
    const HEADER_SCROLL = HEADER_MAX - HEADER_MIN;

    const scrollY = useRef(new Animated.Value(0)).current;
    const clampedY = Animated.diffClamp(scrollY, 0, HEADER_SCROLL);

    const headerHeight = clampedY.interpolate({
        inputRange: [0, HEADER_SCROLL || 1],
        outputRange: [HEADER_MAX, HEADER_MIN],
        extrapolate: 'clamp',
    });

    const titleSize = clampedY.interpolate({
        inputRange: [0, HEADER_SCROLL || 1],
        outputRange: [24, 16],
        extrapolate: 'clamp',
    });

    const subOpacity = clampedY.interpolate({
        inputRange: [0, HEADER_SCROLL || 1],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    });

    const headerShadow = clampedY.interpolate({
        inputRange: [0, 10],
        outputRange: [0, 0.12],
        extrapolate: 'clamp',
    });

    return {
        scrollY,
        headerHeight,
        headerShadow,
        titleSize,
        subOpacity,
        HEADER_MAX,
        HEADER_SCROLL,
    };
}
