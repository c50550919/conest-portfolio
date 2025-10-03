/**
 * CoNest/SafeNest Color System
 * Based on UI_DESIGN.md specifications
 */

export const colors = {
  // Primary colors - Trust and Safety
  primary: '#2ECC71',        // Trust green - growth, safety
  primaryLight: '#A9DFBF',
  primaryDark: '#1A5C3A',

  // Secondary colors - Stability
  secondary: '#3498DB',      // Calm blue - stability
  secondaryLight: '#AED6F1',
  secondaryDark: '#1A4D70',

  // Tertiary colors - Warmth
  tertiary: '#F39C12',       // Warm amber - home
  tertiaryLight: '#FAD7A0',
  tertiaryDark: '#7D5A29',

  // Status colors
  error: '#E74C3C',         // Alert red
  errorLight: '#FADBD8',
  errorDark: '#7B241C',

  success: '#27AE60',       // Verified green
  successLight: '#ABEBC6',
  successDark: '#145A32',

  warning: '#F39C12',
  warningLight: '#FEF5E7',
  warningDark: '#7D5A29',

  info: '#3498DB',
  infoLight: '#EBF5FB',
  infoDark: '#1B4F72',

  // Neutral colors
  background: '#FAFBFC',    // Soft gray
  surface: '#FFFFFF',       // Pure white
  surfaceVariant: '#F5F7FA',

  // Text colors
  text: {
    primary: '#2C3E50',
    secondary: '#5D6D7E',
    disabled: '#95A5A6',
    inverse: '#FFFFFF',
  },

  // Border colors
  border: {
    light: '#E8EBF0',
    medium: '#D5D8DC',
    dark: '#95A5A6',
  },

  // Overlay colors
  overlay: {
    light: 'rgba(44, 62, 80, 0.1)',
    medium: 'rgba(44, 62, 80, 0.3)',
    dark: 'rgba(44, 62, 80, 0.5)',
  },

  // Verification badge colors
  verification: {
    verified: '#27AE60',
    partial: '#F39C12',
    unverified: '#95A5A6',
  },

  // Compatibility score gradient colors
  compatibility: {
    low: '#E74C3C',
    medium: '#F39C12',
    high: '#27AE60',
  },
};

export type Colors = typeof colors;
