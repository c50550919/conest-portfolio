/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * DiscoveryHeader Component
 *
 * Header for the browse discovery screen.
 * Contains title and action buttons for view mode, sort, and filter.
 *
 * Created: 2025-12-08
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { BrowseViewMode } from '../../types/discovery';

interface DiscoveryHeaderProps {
  viewMode: BrowseViewMode;
  activeFilterCount: number;
  onViewModeToggle: () => void;
  onSortPress: () => void;
  onFilterPress: () => void;
}

export const DiscoveryHeader: React.FC<DiscoveryHeaderProps> = ({
  viewMode,
  activeFilterCount,
  onViewModeToggle,
  onSortPress,
  onFilterPress,
}) => {
  const getViewModeIcon = (): string => {
    switch (viewMode) {
      case 'grid':
        return 'view-grid';
      case 'list':
        return 'view-list';
      case 'map':
        return 'map';
      default:
        return 'view-grid';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Browse Connections</Text>
      <View style={styles.actions}>
        {/* View Mode Toggle */}
        <TouchableOpacity style={styles.button} onPress={onViewModeToggle}>
          <MaterialCommunityIcons
            name={getViewModeIcon()}
            size={24}
            color="#2C3E50"
          />
        </TouchableOpacity>

        {/* Sort Menu */}
        <TouchableOpacity style={styles.button} onPress={onSortPress}>
          <MaterialCommunityIcons name="sort" size={24} color="#2C3E50" />
        </TouchableOpacity>

        {/* Filter Button */}
        <TouchableOpacity style={styles.button} onPress={onFilterPress} testID="filter-button">
          <MaterialCommunityIcons name="filter" size={24} color="#3498DB" />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E8ED',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  button: {
    padding: 8,
    paddingVertical: 12,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#E74C3C',
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default DiscoveryHeader;
