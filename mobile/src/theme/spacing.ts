/**
 * CoNest/SafeNest Spacing System
 * Based on UI_DESIGN.md specifications
 */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const iconSizes = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 48,
  xxl: 64,
};

export const touchTargetSize = {
  min: 44, // Minimum touch target size for accessibility
};

export type Spacing = typeof spacing;
export type BorderRadius = typeof borderRadius;
export type IconSizes = typeof iconSizes;
