export const colors = {
  black: '#000000',
  white: '#FFFFFF',
  ink: '#121212',
  charcoal: '#333333',
  steel: '#737373',
  lightGray: '#E2E2E2',
  whisper: '#F3F3F3', // Very light background
  accent: '#000000',  // Uber uses black as the primary action color
  success: '#05A357', // Uber green
  danger: '#E2202C',
  warning: '#F5B01D',
};

export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const typography = {
  h1: { fontSize: 32, fontWeight: '700', color: colors.ink },
  h2: { fontSize: 24, fontWeight: '700', color: colors.ink },
  h3: { fontSize: 18, fontWeight: '600', color: colors.ink },
  bodyLarge: { fontSize: 16, fontWeight: '400', color: colors.charcoal },
  body: { fontSize: 14, fontWeight: '400', color: colors.charcoal },
  caption: { fontSize: 12, fontWeight: '500', color: colors.steel },
};

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  }
};
