// Design tokens for Ganesh Interiors app

export const COLORS = {
    primary: '#1F497D',       // Excel header blue
    primaryLight: '#4472C4',
    accent: '#FF6600',        // Orange qty highlight
    surface: '#FFFFFF',
    surfaceVariant: '#DCE6F1',
    background: '#F0F4F8',
    text: '#1A1A2E',
    textSecondary: '#5C6B8A',
    border: '#4472C4',
    danger: '#D32F2F',
    success: '#2E7D32',
    warning: '#F57F17',
    white: '#FFFFFF',
    card: '#FFFFFF',
    shadow: 'rgba(31,73,125,0.15)',
};

export const TYPOGRAPHY = {
    h1: { fontSize: 24, fontWeight: '700' as const, letterSpacing: 0.5 },
    h2: { fontSize: 18, fontWeight: '700' as const },
    h3: { fontSize: 16, fontWeight: '600' as const },
    body: { fontSize: 14, fontWeight: '400' as const },
    caption: { fontSize: 12, fontWeight: '400' as const },
    label: { fontSize: 12, fontWeight: '600' as const },
};

export const SPACING = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const RADIUS = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
};

export const SHADOWS = {
    card: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 12,
        elevation: 6,
    },
};
