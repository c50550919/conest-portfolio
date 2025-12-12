/**
 * SortMenu Component
 *
 * Dropdown menu for sorting discovery profiles.
 * Displays available sort options with active state indicator.
 *
 * Created: 2025-12-08
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { SORT_OPTIONS } from '../../config/discoveryConfig';
import { SortOption } from '../../types/discovery';

interface SortMenuProps {
  visible: boolean;
  currentSort: SortOption;
  onSelect: (option: SortOption) => void;
}

export const SortMenu: React.FC<SortMenuProps> = ({
  visible,
  currentSort,
  onSelect,
}) => {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container}>
      {SORT_OPTIONS.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.option,
            currentSort === option.value && styles.optionActive,
          ]}
          onPress={() => onSelect(option.value as SortOption)}
        >
          <Text
            style={[
              styles.optionText,
              currentSort === option.value && styles.optionTextActive,
            ]}
          >
            {option.label}
          </Text>
          {currentSort === option.value && (
            <MaterialCommunityIcons name="check" size={20} color="#3498DB" />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F6F7',
  },
  optionActive: {
    backgroundColor: '#EBF5FB',
  },
  optionText: {
    fontSize: 14,
    color: '#2C3E50',
  },
  optionTextActive: {
    fontWeight: '600',
    color: '#3498DB',
  },
});

export default SortMenu;
