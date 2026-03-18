// src/styles/theme.ts
// Design System 2.0 - Complete Design Tokens
import { Platform, TextStyle, ViewStyle } from 'react-native';

// ============================================
// NEUTRAL COLOR SCALE (10-90)
// ============================================
export const neutral = {
    10: '#0B0F14',
    20: '#0F1623',
    30: '#1F2A37',
    40: '#475569',
    50: '#64748B',
    60: '#9CA3AF',
    70: '#E5E7EB',
    80: '#E5E7EB',
    90: '#F8FAFC',
} as const;

// ============================================
// SEMANTIC COLORS
// ============================================
export const semantic = {
    success: {
        light: 'rgba(34,197,94,0.14)',
        main: '#22C55E',
        dark: '#86EFAC',
        bg: 'rgba(34,197,94,0.14)',
    },
    warning: {
        light: 'rgba(245,158,11,0.14)',
        main: '#F59E0B',
        dark: '#FCD34D',
        bg: 'rgba(245,158,11,0.14)',
    },
    error: {
        light: 'rgba(239,68,68,0.14)',
        main: '#EF4444',
        dark: '#FCA5A5',
        bg: 'rgba(239,68,68,0.14)',
    },
    info: {
        light: 'rgba(6,182,212,0.14)',
        main: '#06B6D4',
        dark: '#93C5FD',
        bg: 'rgba(6,182,212,0.14)',
    },
} as const;

// ============================================
// ACCENT COLORS
// ============================================
export const accent = {
    primary: {
        light: '#60A5FA',
        main: '#3B82F6',
        600: '#2563EB',
        dark: '#1D4ED8',
        bg: 'rgba(59,130,246,0.14)',
    },
    secondary: {
        light: '#D1FAE5',
        main: '#22C55E',
        dark: '#065F46',
    },
    violet: {
        light: '#EDE9FE',
        main: '#8B5CF6',
        dark: '#5B21B6',
    },
} as const;

// ============================================
// SPACING SCALE (4px base)
// ============================================
export const spacing = {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
    '2xl': 32,
    '3xl': 64,
    bento: 12,
} as const;

// ============================================
// BORDER RADIUS
// ============================================
export const radius = {
    xs: 8,
    sm: 10,
    md: 14,
    lg: 18,
    xl: 22,
    pill: 999,
    '2xl': 24,
    '3xl': 32,
    full: 999,
} as const;

// ============================================
// SHADOWS
// ============================================
export const shadows = {
    none: {},
    sm: Platform.select({
        ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
        },
        android: { elevation: 1 },
        default: {},
    }) as ViewStyle,
    md: Platform.select({
        ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 6,
        },
        android: { elevation: 4 },
        default: {},
    }) as ViewStyle,
    lg: Platform.select({
        ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.15,
            shadowRadius: 15,
        },
        android: { elevation: 8 },
        default: {},
    }) as ViewStyle,
    xl: Platform.select({
        ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 20 },
            shadowOpacity: 0.25,
            shadowRadius: 25,
        },
        android: { elevation: 12 },
        default: {},
    }) as ViewStyle,
    glow: (color: string) => Platform.select({
        ios: {
            shadowColor: color,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
        },
        android: { elevation: 6 },
        default: {},
    }) as ViewStyle,
} as const;

// ============================================
// TYPOGRAPHY
// ============================================
export const fontFamily = {
    // Using system fonts: Inter files are not bundled in assets/fonts/
    // and expo-font is not installed. System fonts correctly render Cyrillic.
    regular: Platform.select({
        ios: undefined,    // San Francisco — supports Cyrillic
        android: undefined, // Roboto — supports Cyrillic
        default: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }),
    medium: Platform.select({
        ios: undefined,
        android: undefined,
        default: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }),
    semiBold: Platform.select({
        ios: undefined,
        android: undefined,
        default: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }),
    bold: Platform.select({
        ios: undefined,
        android: undefined,
        default: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }),
} as const;

export const typography = {
    // Display
    display: {
        fontSize: 30,
        fontWeight: '800' as const,
        lineHeight: 36,
        letterSpacing: -0.4,
    } as TextStyle,
    // Headings
    h1: {
        fontSize: 22,
        fontWeight: '800' as const,
        lineHeight: 28,
        letterSpacing: -0.2,
    } as TextStyle,
    h2: {
        fontSize: 18,
        fontWeight: '700' as const,
        lineHeight: 24,
        letterSpacing: -0.1,
    } as TextStyle,
    h3: {
        fontSize: 16,
        fontWeight: '700' as const,
        lineHeight: 22,
    } as TextStyle,
    h4: {
        fontSize: 14,
        fontWeight: '700' as const,
        lineHeight: 20,
    } as TextStyle,
    // Body
    bodyLarge: {
        fontSize: 16,
        fontWeight: '500' as const,
        lineHeight: 22,
    } as TextStyle,
    body: {
        fontSize: 14,
        fontWeight: '500' as const,
        lineHeight: 20,
    } as TextStyle,
    bodySmall: {
        fontSize: 12,
        fontWeight: '500' as const,
        lineHeight: 16,
    } as TextStyle,
    // Caption & Labels
    caption: {
        fontSize: 12,
        fontWeight: '500' as const,
        lineHeight: 16,
    } as TextStyle,
    mono: {
        fontSize: 12,
        fontWeight: '600' as const,
        lineHeight: 16,
        fontFamily: Platform.select({
            ios: 'Menlo',
            android: 'monospace',
            default: 'monospace',
        }),
    } as TextStyle,
    label: {
        fontSize: 14,
        fontWeight: '600' as const,
        lineHeight: 20,
        letterSpacing: 0.1,
    } as TextStyle,
    // Button text
    button: {
        fontSize: 14,
        fontWeight: '700' as const,
        lineHeight: 20,
    } as TextStyle,
    buttonSmall: {
        fontSize: 12,
        fontWeight: '600' as const,
        lineHeight: 16,
    } as TextStyle,
} as const;

// ============================================
// MOTION / ANIMATION
// ============================================
export const motion = {
    // Durations
    fast: 100,      // Hover, focus states
    normal: 200,    // Standard transitions
    slow: 300,      // Modal open/close
    slower: 400,    // Page transitions
    // Easing
    easeOut: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0.0, 1, 1)',
    easeInOut: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    // Micro-interaction easing per spec
    micro: 'cubic-bezier(.2,.8,.2,1)',
    spring: { damping: 15, stiffness: 150 },
} as const;

// ============================================
// BREAKPOINTS (per design spec)
// ============================================
export const breakpoints = {
    mobile: 599,      // 0-599px: mobile
    tablet: 959,      // 600-959px: tablet
    desktop: 1279,    // 960-1279px: desktop
    wide: 1280,       // 1280+: wide desktop
} as const;

// ============================================
// GLASS MORPHISM PRESETS
// ============================================
export const glass = {
    light: {
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: radius.xl,
        ...shadows.md,
    } as ViewStyle,
    dark: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
        borderRadius: radius.xl,
        ...shadows.lg,
    } as ViewStyle,
    subtle: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: radius.lg,
    } as ViewStyle,
} as const;

// ============================================
// CONSOLIDATED THEME OBJECT
// ============================================
export const Theme = {
    colors: {
        background: '#0B0F14',
        surface: '#0F1623',
        surfaceLight: '#141F30',
        primary: accent.primary.main,
        secondary: accent.secondary.main,
        violet: accent.violet.main,
        success: semantic.success.main,
        warning: semantic.warning.main,
        error: semantic.error.main,
        info: semantic.info.main,
        textPrimary: '#F8FAFC',
        textSecondary: '#E5E7EB',
        textMuted: '#9CA3AF',
        border: '#1F2A37',
        glassOverlay: 'rgba(255, 255, 255, 0.05)',
        successLight: semantic.success.light,
        errorLight: semantic.error.light,
        warningLight: semantic.warning.light,
        infoLight: semantic.info.light,
        primaryLight: accent.primary.light,
        neutral,
        semantic,
        accentColors: accent,
    },
    spacing,
    radius,
    shadows,
    typography,
    fontFamily,
    motion,
    breakpoints,
    glass,
} as const;

// ============================================
// BACKWARD COMPATIBILITY EXPORTS
// ============================================
export const COLORS = { ...Theme.colors, text: Theme.colors.textPrimary, bg: Theme.colors.background };
export const SPACING = Theme.spacing;
export const RADIUS = Theme.radius;
export const TYPOGRAPHY = Theme.typography;

// ============================================
// LIGHT MODE UI TOKENS (for components using light bg)
// Maps common hardcoded values to semantic names
// ============================================
export const UI = {
    bg: neutral[10],
    bgSubtle: neutral[10],
    bgMuted: neutral[20],
    bgInput: '#0A1220',
    elevated: '#141F30',
    card: '#101826',
    cardHover: '#141F30',
    modal: neutral[20],
    text: neutral[90],
    textSecondary: neutral[70],
    textMuted: neutral[60],
    textDisabled: neutral[40],
    border: neutral[30],
    borderLight: '#162234',
    divider: '#162234',
    borderFocus: accent.primary.main,
    inputBorder: '#233247',
    inputPlaceholder: '#6B7280',
    inputFocusBorder: '#3B82F6',
    chipBg: '#0B1220',
    chipBorder: '#223044',
    chipText: '#E5E7EB',
    success: semantic.success.main,
    successBg: 'rgba(34,197,94,0.14)',
    error: semantic.error.main,
    errorBg: 'rgba(239,68,68,0.14)',
    warning: semantic.warning.main,
    warningBg: 'rgba(245,158,11,0.14)',
    info: semantic.info.main,
    infoBg: 'rgba(6,182,212,0.14)',
    primary: accent.primary.main,
    primaryDark: accent.primary.dark,
    green: '#22C55E',
    greenBg: 'rgba(34,197,94,0.14)',
    blue: '#3B82F6',
    blueBg: 'rgba(59,130,246,0.14)',
    violet: accent.violet.main,
    violetBg: '#2E1065',
    scrim: 'rgba(0,0,0,0.55)',
    shadow: 'rgba(0,0,0,0.45)',
} as const;

export default Theme;
