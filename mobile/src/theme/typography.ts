/**
 * CoNest/SafeNest Typography System
 * Based on UI_DESIGN.md specifications
 * Base size: 16px, Line height: 1.5
 */

import { Platform } from 'react-native';

export const fontFamily = {
  regular: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
  }),
  medium: Platform.select({
    ios: 'System',
    android: 'Roboto-Medium',
    default: 'System',
  }),
  bold: Platform.select({
    ios: 'System',
    android: 'Roboto-Bold',
    default: 'System',
  }),
  light: Platform.select({
    ios: 'System',
    android: 'Roboto-Light',
    default: 'System',
  }),
};

export const fontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
};

export const lineHeights = {
  xs: 18,
  sm: 21,
  base: 24,
  lg: 27,
  xl: 30,
  '2xl': 36,
  '3xl': 45,
  '4xl': 54,
};

export const fontWeights = {
  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const typography = {
  // Headers
  h1: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes['4xl'],
    lineHeight: lineHeights['4xl'],
    fontWeight: fontWeights.bold,
  },
  h2: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes['3xl'],
    lineHeight: lineHeights['3xl'],
    fontWeight: fontWeights.bold,
  },
  h3: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes['2xl'],
    lineHeight: lineHeights['2xl'],
    fontWeight: fontWeights.bold,
  },
  h4: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.xl,
    lineHeight: lineHeights.xl,
    fontWeight: fontWeights.bold,
  },
  h5: {
    fontFamily: fontFamily.bold,
    fontSize: fontSizes.lg,
    lineHeight: lineHeights.lg,
    fontWeight: fontWeights.bold,
  },
  h6: {
    fontFamily: fontFamily.medium,
    fontSize: fontSizes.base,
    lineHeight: lineHeights.base,
    fontWeight: fontWeights.semibold,
  },

  // Subtitles
  subtitle1: {
    fontFamily: fontFamily.medium,
    fontSize: fontSizes.base,
    lineHeight: lineHeights.base,
    fontWeight: fontWeights.medium,
  },
  subtitle2: {
    fontFamily: fontFamily.medium,
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.sm,
    fontWeight: fontWeights.medium,
  },

  // Body text
  body1: {
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.base,
    lineHeight: lineHeights.base,
    fontWeight: fontWeights.regular,
  },
  body2: {
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.sm,
    fontWeight: fontWeights.regular,
  },

  // Small text
  small: {
    fontFamily: fontFamily.light,
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.xs,
    fontWeight: fontWeights.light,
  },

  // Button text
  button: {
    fontFamily: fontFamily.medium,
    fontSize: fontSizes.base,
    lineHeight: lineHeights.base,
    fontWeight: fontWeights.medium,
    textTransform: 'uppercase' as const,
  },

  // Caption text
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.xs,
    fontWeight: fontWeights.regular,
  },

  // Label text
  label: {
    fontFamily: fontFamily.medium,
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.sm,
    fontWeight: fontWeights.medium,
  },
};

export type Typography = typeof typography;
