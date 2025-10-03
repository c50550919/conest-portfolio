/**
 * CoNest/SafeNest Theme System
 * Centralized theme configuration
 */

import { MD3LightTheme, configureFonts } from 'react-native-paper';
import { colors } from './colors';
import { typography, fontFamily } from './typography';
import { spacing, borderRadius, iconSizes } from './spacing';
import { animations } from './animations';

const fontConfig = {
  web: {
    regular: {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontWeight: '400' as const,
    },
    medium: {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontWeight: '500' as const,
    },
    light: {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontWeight: '300' as const,
    },
    thin: {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontWeight: '100' as const,
    },
  },
  ios: {
    regular: {
      fontFamily: 'System',
      fontWeight: '400' as const,
    },
    medium: {
      fontFamily: 'System',
      fontWeight: '500' as const,
    },
    light: {
      fontFamily: 'System',
      fontWeight: '300' as const,
    },
    thin: {
      fontFamily: 'System',
      fontWeight: '100' as const,
    },
  },
  android: {
    regular: {
      fontFamily: 'Roboto',
      fontWeight: 'normal' as const,
    },
    medium: {
      fontFamily: 'Roboto-Medium',
      fontWeight: 'normal' as const,
    },
    light: {
      fontFamily: 'Roboto-Light',
      fontWeight: 'normal' as const,
    },
    thin: {
      fontFamily: 'Roboto-Thin',
      fontWeight: 'normal' as const,
    },
  },
};

export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    onPrimary: '#FFFFFF',
    primaryContainer: '#E8F8F2',
    onPrimaryContainer: colors.primaryDark,

    secondary: colors.secondary,
    onSecondary: '#FFFFFF',
    secondaryContainer: '#EBF5FB',
    onSecondaryContainer: colors.secondaryDark,

    tertiary: colors.tertiary,
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#FEF5E7',
    onTertiaryContainer: colors.tertiaryDark,

    error: colors.error,
    onError: '#FFFFFF',
    errorContainer: colors.errorLight,
    onErrorContainer: colors.errorDark,

    background: colors.background,
    onBackground: colors.text.primary,
    surface: colors.surface,
    onSurface: colors.text.secondary,
    surfaceVariant: colors.surfaceVariant,
    onSurfaceVariant: colors.text.secondary,

    outline: colors.border.medium,
    outlineVariant: colors.border.light,
    shadow: '#000000',
    scrim: '#000000',
    inverseSurface: colors.text.primary,
    inverseOnSurface: '#FFFFFF',
    inversePrimary: colors.primaryLight,
  },
  fonts: configureFonts({ config: fontConfig }),
  roundness: borderRadius.md,
  animation: {
    scale: 1.0,
  },
  spacing,
  typography,
  borderRadius,
  iconSizes,
  animations,
};

// Export individual modules
export { colors } from './colors';
export { typography, fontFamily } from './typography';
export { spacing, borderRadius, iconSizes } from './spacing';
export { animations } from './animations';

export type Theme = typeof theme;