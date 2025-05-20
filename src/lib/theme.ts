export const theme = {
  colors: {
    primary: {
      black: '#000000',
      gold: {
        50: '#FFFDF7',
        100: '#FFF9E5',
        200: '#FFE7A0',
        300: '#FFD700', // Main gold
        400: '#E6C200',
        500: '#CCAA00',
        600: '#B39500',
        700: '#998000',
        800: '#806B00',
        900: '#665500',
      },
      blue: {
        50: '#EBF8FF',
        100: '#D1E9FF',
        200: '#90CDF4',
        300: '#3182CE',
        400: '#2B6CB0',
        500: '#1E3A8A', // Main blue
        600: '#1E40AF',
        700: '#1D3B9A',
        800: '#1C3985',
        900: '#1A3470',
      }
    },
    accent: {
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
    }
  },
  gradients: {
    gold: 'linear-gradient(135deg, #FFD700 0%, #CCAA00 100%)',
    goldToBlack: 'linear-gradient(135deg, #FFD700 0%, #000000 100%)',
    blueToBlack: 'linear-gradient(135deg, #3182CE 0%, #000000 100%)',
    premium: 'linear-gradient(135deg, #FFD700 0%, #3182CE 50%, #000000 100%)',
  },
  fonts: {
    heading: '"Inter", sans-serif',
    body: '"Inter", sans-serif',
    mono: '"JetBrains Mono", monospace',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
  },
  borderRadius: {
    none: '0',
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.5rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    gold: '0 10px 25px -5px rgba(255, 215, 0, 0.3)',
    blue: '0 10px 25px -5px rgba(49, 130, 206, 0.3)',
  },
  animations: {
    fadeIn: 'fadeIn 0.3s ease-in-out',
    slideUp: 'slideUp 0.4s ease-out',
    pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    shimmer: 'shimmer 2s linear infinite',
  }
} as const;

export type Theme = typeof theme;