/**
 * ComparisonToolbar Component
 *
 * Floating toolbar displayed when profiles are selected for comparison.
 * Shows selection count and provides access to comparison modal.
 *
 * Created: 2025-12-08
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface ComparisonToolbarProps {
  selectedCount: number;
  onComparePress: () => void;
}

export const ComparisonToolbar: React.FC<ComparisonToolbarProps> = ({
  selectedCount,
  onComparePress,
}) => {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <MaterialCommunityIcons name="compare" size={20} color="#3498DB" />
        <Text style={styles.text}>
          {selectedCount} profile{selectedCount !== 1 ? 's' : ''} selected
        </Text>
      </View>
      <TouchableOpacity style={styles.compareButton} onPress={onComparePress}>
        <Text style={styles.compareButtonText}>Compare</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#EBF5FB',
    borderBottomWidth: 1,
    borderBottomColor: '#D6EAF8',
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '600',
  },
  compareButton: {
    backgroundColor: '#3498DB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  compareButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default ComparisonToolbar;
