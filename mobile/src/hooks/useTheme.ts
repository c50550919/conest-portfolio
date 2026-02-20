/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
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
