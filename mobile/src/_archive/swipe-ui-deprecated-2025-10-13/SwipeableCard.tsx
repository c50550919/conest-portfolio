/**
 * SwipeableCard Component - Using React Native Animated API
 *
 * Purpose: Tinder-style swipeable card with gesture animations
 * Constitution: Principle IV (Performance - Smooth animations)
 *
 * Features:
 * - PanResponder for swipe detection
 * - React Native Animated API for animations
 * - Visual feedback (rotate, opacity) during swipe
 * - Left/Right indicators
 * - Swipe threshold: 50% of screen width
 *
 * Gestures:
 * - Swipe right → Interested (Connect)
 * - Swipe left → Next (Continue Searching)
 * - Release before threshold → Card springs back
 *
 * Updated: 2025-10-07 - Removed Reanimated, using RN Animated
 */

import React, { useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import ProfileCard from './ProfileCard';
import { ProfileCard as ProfileCardType } from '../../services/api/discoveryAPI';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.5;

interface SwipeableCardProps {
  profile: ProfileCardType;
  onSwipe: (direction: 'left' | 'right') => void;
  index: number;
}

export default function SwipeableCard({
  profile,
  onSwipe,
  index,
}: SwipeableCardProps) {
  const position = useRef(new Animated.ValueXY()).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => index === 0,
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        const absX = Math.abs(gesture.dx);

        if (absX > SWIPE_THRESHOLD) {
          // Swipe complete - animate off screen
          const direction = gesture.dx > 0 ? 'right' : 'left';
          const targetX = gesture.dx > 0 ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;

          Animated.spring(position, {
            toValue: { x: targetX, y: gesture.dy },
            useNativeDriver: true,
          }).start(() => {
            onSwipe(direction);
          });
        } else {
          // Spring back to center
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            friction: 4,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: ['-30deg', '0deg', '30deg'],
    extrapolate: 'clamp',
  });

  const interestedOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD / 2],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const nextOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD / 2, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Scale and opacity for cards underneath
  const scale = 1 - index * 0.05;
  const opacity = 1 - index * 0.2;

  const animatedCardStyle = {
    opacity,
    transform: [
      { translateX: position.x },
      { translateY: position.y },
      { rotate },
      { scale },
    ],
  };

  return (
    <View testID={`swipeable-card-${index}`} style={[styles.cardContainer, { zIndex: 100 - index }]}>
      <Animated.View
        testID="profile-card"
        style={[styles.card, animatedCardStyle]}
        {...(index === 0 ? panResponder.panHandlers : {})}
      >
        <ProfileCard profile={profile} />

        {/* Interested Indicator */}
        <Animated.View style={[styles.interestedIndicator, { opacity: interestedOpacity }]}>
          <View style={[styles.indicator, styles.interestedBackground]}>
            <MaterialCommunityIcons name="home-account" size={60} color="#2ECC71" />
            <View style={styles.labelContainer}>
              <View style={styles.label}>
                <MaterialCommunityIcons name="check" size={20} color="#fff" />
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Next Indicator */}
        <Animated.View style={[styles.nextIndicator, { opacity: nextOpacity }]}>
          <View style={[styles.indicator, styles.nextBackground]}>
            <MaterialCommunityIcons name="arrow-right-circle-outline" size={60} color="#9E9E9E" />
            <View style={styles.labelContainer}>
              <View style={[styles.label, styles.nextLabel]}>
                <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
              </View>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    position: 'absolute',
    width: '100%',
    alignItems: 'center',
  },
  card: {
    width: '100%',
  },
  interestedIndicator: {
    position: 'absolute',
    top: 50,
    left: 40,
  },
  nextIndicator: {
    position: 'absolute',
    top: 50,
    right: 40,
  },
  indicator: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  interestedBackground: {
    transform: [{ rotate: '-15deg' }],
  },
  nextBackground: {
    transform: [{ rotate: '15deg' }],
  },
  labelContainer: {
    marginTop: 8,
  },
  label: {
    backgroundColor: '#2ECC71',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#fff',
  },
  nextLabel: {
    backgroundColor: '#9E9E9E',
  },
});
