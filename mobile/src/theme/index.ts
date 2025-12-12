/**
 * CoNest/SafeNest Theme System
 * Centralized theme configuration
 */

import { MD3LightTheme } from 'react-native-paper';
import { colors } from './colors';
import { typography, fontFamily } from './typography';
import { spacing, borderRadius, iconSizes } from './spacing';
import { animations } from './animations';

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
  fonts: MD3LightTheme.fonts,
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
