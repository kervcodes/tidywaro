/**
 * Tidywaro Design System
 * Premium theme with gradients, modern typography, and consistent spacing
 */

export const colors = {
    // Primary gradient (purple to pink)
    primary: {
        start: '#8B5CF6', // Vibrant purple
        end: '#EC4899',   // Hot pink
        solid: '#A855F7', // Mid-point for solid uses
    },

    // Secondary gradient (warm neutrals)
    secondary: {
        start: '#F59E0B', // Amber
        end: '#EF4444',   // Red
        solid: '#F97316', // Orange
    },

    // Neutrals (warm grays)
    neutral: {
        50: '#FAFAF9',
        100: '#F5F5F4',
        200: '#E7E5E4',
        300: '#D6D3D1',
        400: '#A8A29E',
        500: '#78716C',
        600: '#57534E',
        700: '#44403C',
        800: '#292524',
        900: '#1C1917',
    },

    // Semantic colors
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',

    // Backgrounds
    background: {
        primary: '#FFFFFF',
        secondary: '#FAFAF9',
        tertiary: '#F5F5F4',
    },

    // Text
    text: {
        primary: '#1C1917',
        secondary: '#57534E',
        tertiary: '#A8A29E',
        inverse: '#FFFFFF',
    },

    // Overlay
    overlay: 'rgba(0, 0, 0, 0.5)',

    // Glassmorphism
    glass: {
        background: 'rgba(255, 255, 255, 0.7)',
        border: 'rgba(255, 255, 255, 0.3)',
    },
};

export const typography = {
    // Font families (will use Google Fonts via expo-google-fonts)
    fontFamily: {
        heading: 'Outfit', // Modern, geometric sans-serif
        body: 'Inter',     // Clean, readable sans-serif
    },

    // Font sizes (8px base scale)
    fontSize: {
        xs: 12,
        sm: 14,
        base: 16,
        lg: 18,
        xl: 20,
        '2xl': 24,
        '3xl': 30,
        '4xl': 36,
        '5xl': 48,
    },

    // Font weights
    fontWeight: {
        normal: '400' as const,
        medium: '500' as const,
        semibold: '600' as const,
        bold: '700' as const,
        extrabold: '800' as const,
    },

    // Line heights
    lineHeight: {
        tight: 1.2,
        normal: 1.5,
        relaxed: 1.75,
    },
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
    '4xl': 40,
    '5xl': 48,
    '6xl': 64,
};

export const borderRadius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    full: 9999,
};

export const shadows = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    xl: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 8,
    },
};

export const theme = {
    colors,
    typography,
    spacing,
    borderRadius,
    shadows,
};

export type Theme = typeof theme;
