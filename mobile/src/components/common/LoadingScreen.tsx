/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * LoadingScreen Component
 * Branded splash screen shown during auth token check on app launch.
 * Replaces the blank black screen with a branded loading experience.
 */

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, SafeAreaView } from 'react-native';
import { colors } from '../../theme/colors';

const LoadingScreen: React.FC = () => (
  <SafeAreaView style={styles.container} testID="loading-screen">
    <View style={styles.content}>
      <Text style={styles.logo}>CoNest</Text>
      <Text style={styles.tagline}>Safe Housing for Single Parents</Text>
      <ActivityIndicator
        size="large"
        color={colors.primary}
        style={styles.spinner}
        testID="loading-indicator"
      />
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 32,
  },
  spinner: {
    marginTop: 16,
  },
});

export default LoadingScreen;
