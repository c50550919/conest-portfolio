/**
 * useTheme Hook
 * Custom hook for accessing theme values
 */

import { theme, colors, spacing, typography, borderRadius } from '../theme';

export const useTheme = () => {
  return {
    theme,
    colors,
    spacing,
    typography,
    borderRadius,
  };
};
