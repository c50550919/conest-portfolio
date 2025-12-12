/**
 * CompatibilityBreakdownModal Component
 *
 * Purpose: Displays detailed 6-dimension compatibility breakdown with explanations
 * Constitution: Principle IV (Performance), Principle II (User Experience)
 *
 * Features:
 * - 6-dimension compatibility scores with visual bars
 * - Detailed explanations for each dimension
 * - Color-coded scores (Red: 0-39%, Orange: 40-59%, Yellow: 60-79%, Green: 80-100%)
 * - Smooth slide-up animation
 * - Pull-to-close gesture
 * - Overall compatibility percentage
 *
 * Design: Full-screen modal with gradient header and scrollable dimension cards
 *
 * Created: 2025-10-30
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Animated,
  PanResponder,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Compatibility breakdown interface
export interface CompatibilityDimension {
  dimension: string;
  score: number;
  weight: number;
  explanation: string;
  icon: string;
}

export interface CompatibilityBreakdown {
  overallScore: number;
  dimensions: CompatibilityDimension[];
  calculatedAt: string;
}

interface CompatibilityBreakdownModalProps {
  visible: boolean;
  breakdown: CompatibilityBreakdown | null;
  profile1Name: string;
  profile2Name: string;
  onClose: () => void;
}

export default function CompatibilityBreakdownModal({
  visible,
  breakdown,
  profile1Name,
  profile2Name,
  onClose,
}: CompatibilityBreakdownModalProps) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  // Animate modal slide in/out
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 9,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  // Pull-to-close gesture
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only enable pull-to-close at the top of scroll
        return gestureState.dy > 10 && (scrollY as any)._value === 0;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150) {
          onClose();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  console.log('[CompatibilityBreakdownModal] Render called with:', {
    visible,
    hasBreakdown: !!breakdown,
    overallScore: breakdown?.overallScore,
    dimensionCount: breakdown?.dimensions?.length,
    profile1Name,
    profile2Name,
  });

  if (!breakdown) {
    console.log('[CompatibilityBreakdownModal] No breakdown data, returning null');
    return null;
  }

  // Get color based on score
  const getScoreColor = (score: number): string => {
    if (score >= 80) {
      return '#4CAF50';
    } // Green
    if (score >= 60) {
      return '#FFC107';
    } // Yellow
    if (score >= 40) {
      return '#FF9800';
    } // Orange
    return '#F44336'; // Red
  };

  // Get score label
  const getScoreLabel = (score: number): string => {
    if (score >= 80) {
      return 'Excellent';
    }
    if (score >= 60) {
      return 'Good';
    }
    if (score >= 40) {
      return 'Fair';
    }
    return 'Poor';
  };

  // Render dimension card
  const renderDimensionCard = (dimension: CompatibilityDimension, index: number) => {
    const color = getScoreColor(dimension.score);
    const label = getScoreLabel(dimension.score);

    return (
      <View
        key={dimension.dimension}
        testID={`dimension-card-${index}`}
        style={styles.dimensionCard}
      >
        {/* Header */}
        <View style={styles.dimensionHeader}>
          <View style={styles.dimensionTitleRow}>
            <MaterialCommunityIcons name={dimension.icon} size={24} color={color} />
            <Text style={styles.dimensionTitle}>{dimension.dimension}</Text>
          </View>
          <View style={[styles.scoreBadge, { backgroundColor: color }]}>
            <Text style={styles.scoreBadgeText}>{dimension.score}%</Text>
          </View>
        </View>

        {/* Score label and weight */}
        <View style={styles.dimensionMeta}>
          <Text style={[styles.scoreLabel, { color }]}>{label}</Text>
          <Text style={styles.weightText}>Weight: {dimension.weight}%</Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarTrack}>
            <Animated.View
              testID={`progress-bar-${index}`}
              style={[
                styles.progressBarFill,
                {
                  width: `${dimension.score}%`,
                  backgroundColor: color,
                },
              ]}
            />
          </View>
        </View>

        {/* Explanation */}
        <Text style={styles.explanationText}>{dimension.explanation}</Text>
      </View>
    );
  };

  const overallColor = getScoreColor(breakdown.overallScore);
  const overallLabel = getScoreLabel(breakdown.overallScore);

  return (
    <Modal
      testID="compatibility-breakdown-modal"
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <Animated.View style={[styles.modalContainer, { transform: [{ translateY: slideAnim }] }]}>
          {/* Header with gradient */}
          <LinearGradient
            colors={['#6A11CB', '#2575FC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
            {...panResponder.panHandlers}
          >
            {/* Pull indicator */}
            <View style={styles.pullIndicator} />

            {/* Close button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              accessibilityLabel="Close compatibility breakdown"
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>

            {/* Header content */}
            <View style={styles.headerContent}>
              <MaterialCommunityIcons name="chart-donut" size={48} color="#fff" />
              <Text style={styles.headerTitle}>Compatibility Analysis</Text>
              <Text style={styles.headerSubtitle}>
                {profile1Name} & {profile2Name}
              </Text>

              {/* Overall score */}
              <View style={styles.overallScoreContainer}>
                <Text style={styles.overallScoreValue}>{breakdown.overallScore}%</Text>
                <Text style={styles.overallScoreLabel}>{overallLabel} Match</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Scrollable dimensions */}
          <ScrollView
            testID="dimensions-scroll"
            style={styles.dimensionsScroll}
            showsVerticalScrollIndicator={false}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
              useNativeDriver: false,
            })}
            scrollEventThrottle={16}
          >
            {/* Dimensions explanation */}
            <View style={styles.explanationContainer}>
              <Text style={styles.explanationTitle}>How we calculate compatibility:</Text>
              <Text style={styles.explanationBody}>
                We analyze 6 key dimensions of compatibility, each weighted based on importance for
                successful co-living. Scores are calculated by comparing your responses across
                multiple factors.
              </Text>
            </View>

            {/* Dimension cards */}
            {breakdown.dimensions.map((dimension, index) => renderDimensionCard(dimension, index))}

            {/* Footer info */}
            <View style={styles.footerInfo}>
              <Text style={styles.footerText}>
                Calculated on{' '}
                {new Date(breakdown.calculatedAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </Text>
            </View>

            {/* Bottom padding */}
            <View style={{ height: 40 }} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    marginTop: 80,
  },
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  pullIndicator: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 2,
    marginBottom: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  headerContent: {
    alignItems: 'center',
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 20,
  },
  overallScoreContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  overallScoreValue: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#fff',
    lineHeight: 64,
  },
  overallScoreLabel: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '600',
    marginTop: 4,
  },
  dimensionsScroll: {
    flex: 1,
  },
  explanationContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2575FC',
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  explanationBody: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  dimensionCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  dimensionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dimensionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  dimensionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  scoreBadgeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  dimensionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  weightText: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
  progressBarContainer: {
    marginBottom: 16,
  },
  progressBarTrack: {
    height: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  explanationText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  footerInfo: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },
});
