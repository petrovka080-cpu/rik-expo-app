// src/context/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
    background: string;
    surface: string;
    card: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    primary: string;
    border: string;
    borderLight: string;
    headerBg: string;
    inputBg: string;
    statusBar: 'light-content' | 'dark-content';
}

interface ThemeContextType {
    theme: ThemeMode;
    colors: ThemeColors;
    toggleTheme: () => void;
    setTheme: (mode: ThemeMode) => void;
}

const lightColors: ThemeColors = {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
    textMuted: '#64748B',
    primary: '#0277BD',
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    headerBg: '#FFFFFF',
    inputBg: '#F9FAFB',
    statusBar: 'dark-content',
};

const darkColors: ThemeColors = {
    background: '#0B0F14',
    surface: '#0F1623',
    card: '#101826',
    text: '#F8FAFC',
    textSecondary: '#E5E7EB',
    textMuted: '#9CA3AF',
    primary: '#3B82F6',
    border: '#1F2A37',
    borderLight: '#162234',
    headerBg: '#0B0F14',
    inputBg: '#0A1220',
    statusBar: 'light-content',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<ThemeMode>('dark');

    useEffect(() => {
        // Load saved theme from localStorage
        if (typeof window !== 'undefined' && window.localStorage) {
            const saved = localStorage.getItem('theme') as ThemeMode;
            if (saved === 'light' || saved === 'dark') {
                setThemeState(saved);
            }
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setThemeState(newTheme);
        if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem('theme', newTheme);
        }
    };

    const setTheme = (mode: ThemeMode) => {
        setThemeState(mode);
        if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem('theme', mode);
        }
    };

    const colors = theme === 'dark' ? darkColors : lightColors;

    return (
        <ThemeContext.Provider value={{ theme, colors, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        // Return default dark theme if no provider
        return {
            theme: 'dark' as ThemeMode,
            colors: darkColors,
            toggleTheme: () => { },
            setTheme: () => { },
        };
    }
    return context;
}

export { lightColors, darkColors };
