/**
 * CompatibilityScore Component
 * Circular progress indicator with percentage display
 * Color gradient from red→yellow→green
 * From UI_DESIGN.md specifications
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, spacing, typography } from '../../theme';

interface CompatibilityScoreProps {
  score: number; // 0-100
  size?: number;
  strokeWidth?: number;
  onPress?: () => void;
  showLabel?: boolean;
}

const CompatibilityScore: React.FC<CompatibilityScoreProps> = ({
  score,
  size = 80,
  strokeWidth = 8,
  onPress,
  showLabel = true,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  const getScoreColor = () => {
    if (score >= 70) return colors.compatibility.high;
    if (score >= 40) return colors.compatibility.medium;
    return colors.compatibility.low;
  };

  const getScoreLabel = () => {
    if (score >= 70) return 'Great Match';
    if (score >= 40) return 'Good Match';
    return 'Fair Match';
  };

  const scoreColor = getScoreColor();

  const content = (
    <View style={styles.container}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border.light}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={scoreColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.scoreContainer}>
        <Text style={[styles.scoreText, { color: scoreColor }]}>
          {Math.round(score)}%
        </Text>
      </View>
      {showLabel && (
        <Text style={styles.label}>{getScoreLabel()}</Text>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  svg: {
    transform: [{ rotate: '-90deg' }],
  },
  scoreContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    ...typography.h3,
    fontWeight: '700',
  },
  label: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
});

export default CompatibilityScore;
