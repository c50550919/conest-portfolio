/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * CoNest/SafeNest Animation System
 * Based on UI_DESIGN.md specifications
 * Duration: 200-300ms for micro-interactions
 * Easing: EaseInOut for smooth feel
 */

export const animations = {
  // Duration in milliseconds
  duration: {
    fast: 150,
    normal: 250,
    slow: 350,
  },

  // Easing functions
  easing: {
    easeIn: [0.4, 0.0, 1.0, 1.0],
    easeOut: [0.0, 0.0, 0.2, 1.0],
    easeInOut: [0.4, 0.0, 0.2, 1.0],
    linear: [0.0, 0.0, 1.0, 1.0],
  },

  // Spring configurations
  spring: {
    default: {
      damping: 15,
      mass: 1,
      stiffness: 150,
    },
    bouncy: {
      damping: 10,
      mass: 1,
      stiffness: 100,
    },
    gentle: {
      damping: 20,
      mass: 1,
      stiffness: 120,
    },
  },
};

export type Animations = typeof animations;
