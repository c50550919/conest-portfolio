/**
 * MatchModal Component - Using React Native Animated API
 *
 * Purpose: "Household Match!" celebration modal
 * Constitution: Principle I (Child Safety), Principle IV (Performance)
 *
 * Features:
 * - Full-screen overlay with confetti animation
 * - Match profiles display (both users)
 * - Compatibility score
 * - "Start Chatting" and "Continue Searching" actions
 * - Smooth fade-in animation
 *
 * Updated: 2025-10-07 - Removed Reanimated, using RN Animated
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Match } from '../../hooks/useMatchNotifications';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MatchModalProps {
  visible: boolean;
  match: Match | null;
  onClose: () => void;
  onSendMessage: () => void;
}

export default function MatchModal({ visible, match, onClose, onSendMessage }: MatchModalProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const heartScaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Animate modal entrance
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 15,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(200),
          Animated.spring(heartScaleAnim, {
            toValue: 1.2,
            damping: 8,
            useNativeDriver: true,
          }),
          Animated.spring(heartScaleAnim, {
            toValue: 1,
            damping: 10,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      heartScaleAnim.setValue(0);
    }
  }, [visible]);

  if (!match) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <LinearGradient
          colors={['#3498DB', '#2980B9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Header with animated heart */}
          <Animated.View
            style={[
              styles.heartContainer,
              {
                transform: [{ scale: heartScaleAnim }],
              },
            ]}
          >
            <MaterialCommunityIcons name="home-heart" size={100} color="#fff" />
          </Animated.View>

          <Text style={styles.title}>Household Match!</Text>
          <Text style={styles.subtitle}>You both expressed interest in connecting!</Text>

          {/* Compatibility Score */}
          <View style={styles.scoreContainer}>
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreText}>{match.compatibilityScore}%</Text>
              <Text style={styles.scoreLabel}>Household Fit</Text>
            </View>
          </View>

          {/* Profile Placeholder - In real app, fetch matched user profile */}
          <View style={styles.profilesContainer}>
            <Text style={styles.matchIdText}>Match ID: {match.matchId}</Text>
            <Text style={styles.dateText}>{new Date(match.createdAt).toLocaleDateString()}</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.messageButton]}
              onPress={onSendMessage}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="message-text" size={24} color="#fff" />
              <Text style={styles.buttonText}>Start Chatting</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.continueButton]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.continueButtonText}>Continue Searching</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: SCREEN_WIDTH * 0.9,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  heartContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3498DB',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  scoreContainer: {
    marginBottom: 24,
  },
  scoreBadge: {
    backgroundColor: '#2ECC71',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#fff',
    marginTop: -4,
  },
  profilesContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  matchIdText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#999',
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  messageButton: {
    backgroundColor: '#3498DB',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  continueButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#3498DB',
  },
  continueButtonText: {
    color: '#3498DB',
    fontSize: 18,
    fontWeight: '600',
  },
});
