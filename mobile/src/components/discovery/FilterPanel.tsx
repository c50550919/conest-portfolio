/**
 * Filter Panel Component
 *
 * Purpose: Comprehensive filtering interface for browse discovery
 * Constitution: Principle I (Child Safety), Principle IV (Performance)
 *
 * Features:
 * - 15+ filter criteria with smart defaults
 * - Safety-first filters (background check, ID verification)
 * - Budget, distance, schedule compatibility
 * - Housing preferences and parenting philosophy
 * - Clear all / Apply with filter count badge
 *
 * Created: 2025-10-08
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Modal,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Slider from '@react-native-community/slider';
import { DiscoveryFilters } from '../../types/discovery';
import {
  FILTER_OPTIONS,
  DEFAULT_FILTERS,
  HELP_TEXT,
} from '../../config/discoveryConfig';

interface FilterPanelProps {
  visible: boolean;
  currentFilters: DiscoveryFilters;
  onApply: (filters: DiscoveryFilters) => void;
  onClose: () => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  visible,
  currentFilters,
  onApply,
  onClose,
}) => {
  const [filters, setFilters] = useState<DiscoveryFilters>(currentFilters);

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const updateFilter = (key: keyof DiscoveryFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleArrayFilter = (key: keyof DiscoveryFilters, value: string) => {
    const currentArray = (filters[key] as string[]) || [];
    const newArray = currentArray.includes(value)
      ? currentArray.filter((v) => v !== value)
      : [...currentArray, value];
    updateFilter(key, newArray.length > 0 ? newArray : undefined);
  };

  // Count active filters (excluding required safety filters)
  const getActiveFilterCount = (): number => {
    let count = 0;
    Object.entries(filters).forEach(([key, value]) => {
      // Don't count safety filters (always on)
      if (key === 'requireBackgroundCheck' || key === 'requireIdVerified') return;

      if (value !== undefined && value !== null) {
        if (Array.isArray(value) && value.length > 0) count++;
        else if (!Array.isArray(value)) count++;
      }
    });
    return count;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialCommunityIcons name="close" size={24} color="#2C3E50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Filters</Text>
          <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Safety Filters (Always Required) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Safety (Required)</Text>
            <Text style={styles.sectionSubtitle}>{HELP_TEXT.filters}</Text>

            <View style={styles.filterRow}>
              <View style={styles.filterLabel}>
                <MaterialCommunityIcons name="shield-check" size={20} color="#2ECC71" />
                <Text style={styles.filterText}>Background Check Required</Text>
              </View>
              <Switch
                value={filters.requireBackgroundCheck ?? true}
                disabled={true}
                trackColor={{ false: '#BDC3C7', true: '#2ECC71' }}
              />
            </View>

            <View style={styles.filterRow}>
              <View style={styles.filterLabel}>
                <MaterialCommunityIcons name="account-check" size={20} color="#3498DB" />
                <Text style={styles.filterText}>ID Verification Required</Text>
              </View>
              <Switch
                value={filters.requireIdVerified ?? true}
                disabled={true}
                trackColor={{ false: '#BDC3C7', true: '#3498DB' }}
              />
            </View>
          </View>

          {/* Location & Distance */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>

            <View style={styles.sliderContainer}>
              <Text style={styles.filterLabel}>
                Maximum Distance:{' '}
                {filters.maxDistance === -1
                  ? 'Any distance'
                  : `${filters.maxDistance} miles`}
              </Text>
              <View style={styles.distanceOptions}>
                {FILTER_OPTIONS.distance.options.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.distanceChip,
                      filters.maxDistance === opt.value && styles.distanceChipActive,
                    ]}
                    onPress={() => updateFilter('maxDistance', opt.value)}
                  >
                    <Text
                      style={[
                        styles.distanceChipText,
                        filters.maxDistance === opt.value && styles.distanceChipTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Budget */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Budget</Text>

            <View style={styles.sliderContainer}>
              <Text style={styles.filterLabel}>
                Monthly Budget: ${filters.budgetMin ?? FILTER_OPTIONS.budget.defaultMin} - $
                {filters.budgetMax ?? FILTER_OPTIONS.budget.defaultMax}
              </Text>

              <Text style={styles.sliderSubLabel}>Minimum</Text>
              <Slider
                style={styles.slider}
                minimumValue={FILTER_OPTIONS.budget.min}
                maximumValue={FILTER_OPTIONS.budget.max}
                step={FILTER_OPTIONS.budget.step}
                value={filters.budgetMin ?? FILTER_OPTIONS.budget.defaultMin}
                onValueChange={(value) => updateFilter('budgetMin', value)}
                minimumTrackTintColor="#3498DB"
                maximumTrackTintColor="#BDC3C7"
              />

              <Text style={styles.sliderSubLabel}>Maximum</Text>
              <Slider
                style={styles.slider}
                minimumValue={FILTER_OPTIONS.budget.min}
                maximumValue={FILTER_OPTIONS.budget.max}
                step={FILTER_OPTIONS.budget.step}
                value={filters.budgetMax ?? FILTER_OPTIONS.budget.defaultMax}
                onValueChange={(value) => updateFilter('budgetMax', value)}
                minimumTrackTintColor="#3498DB"
                maximumTrackTintColor="#BDC3C7"
              />
            </View>
          </View>

          {/* Compatibility Score */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Compatibility</Text>
            <Text style={styles.sectionSubtitle}>{HELP_TEXT.compatibilityScore}</Text>

            <View style={styles.sliderContainer}>
              <Text style={styles.filterLabel}>
                Minimum Match: {filters.minCompatibilityScore ?? FILTER_OPTIONS.compatibilityScore.default}%
              </Text>
              <Slider
                style={styles.slider}
                minimumValue={FILTER_OPTIONS.compatibilityScore.min}
                maximumValue={FILTER_OPTIONS.compatibilityScore.max}
                step={FILTER_OPTIONS.compatibilityScore.step}
                value={filters.minCompatibilityScore ?? FILTER_OPTIONS.compatibilityScore.default}
                onValueChange={(value) => updateFilter('minCompatibilityScore', value)}
                minimumTrackTintColor="#2ECC71"
                maximumTrackTintColor="#BDC3C7"
              />
            </View>
          </View>

          {/* Children Age Groups */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Children Age Groups</Text>
            <Text style={styles.sectionSubtitle}>Select compatible age ranges</Text>

            <View style={styles.chipGrid}>
              {FILTER_OPTIONS.childrenAgeGroups.options.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.chip,
                    filters.childrenAgeGroups?.includes(opt.value) && styles.chipActive,
                  ]}
                  onPress={() => toggleArrayFilter('childrenAgeGroups', opt.value)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      filters.childrenAgeGroups?.includes(opt.value) && styles.chipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Housing Type */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Housing Type</Text>

            <View style={styles.chipGrid}>
              {FILTER_OPTIONS.housingType.options.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.chip,
                    filters.housingType === opt.value && styles.chipActive,
                  ]}
                  onPress={() => updateFilter('housingType', opt.value)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      filters.housingType === opt.value && styles.chipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Gender Preference (Living Arrangement) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Living Arrangement Preference</Text>
            <Text style={styles.sectionSubtitle}>Optional - choose who you're comfortable living with</Text>

            <View style={styles.chipGrid}>
              {FILTER_OPTIONS.genderPreference.options.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.chip,
                    (filters.genderPreference === opt.value || (!filters.genderPreference && opt.default)) && styles.chipActive,
                  ]}
                  onPress={() => updateFilter('genderPreference', opt.value)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      (filters.genderPreference === opt.value || (!filters.genderPreference && opt.default)) && styles.chipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Work Schedule */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Work Schedule</Text>

            <View style={styles.chipGrid}>
              {FILTER_OPTIONS.workSchedule.options.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.chip,
                    filters.workSchedules?.includes(opt.value) && styles.chipActive,
                  ]}
                  onPress={() => toggleArrayFilter('workSchedules', opt.value)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      filters.workSchedules?.includes(opt.value) && styles.chipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Parenting Philosophy */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Parenting Philosophy</Text>

            <View style={styles.chipGrid}>
              {FILTER_OPTIONS.parentingPhilosophy.options.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.chip,
                    filters.parentingPhilosophy?.includes(opt.value) && styles.chipActive,
                  ]}
                  onPress={() => toggleArrayFilter('parentingPhilosophy', opt.value)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      filters.parentingPhilosophy?.includes(opt.value) && styles.chipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Move-In Timeline */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Move-In Timeline</Text>

            <View style={styles.chipGrid}>
              {FILTER_OPTIONS.moveInTimeline.options.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.chip,
                    filters.moveInDateDays === opt.value && styles.chipActive,
                  ]}
                  onPress={() => updateFilter('moveInDateDays', opt.value)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      filters.moveInDateDays === opt.value && styles.chipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Additional Preferences */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Preferences</Text>

            <View style={styles.filterRow}>
              <View style={styles.filterLabel}>
                <MaterialCommunityIcons name="smoking-off" size={20} color="#95A5A6" />
                <Text style={styles.filterText}>Smoke-Free Environment</Text>
              </View>
              <Switch
                value={filters.smokeFree ?? false}
                onValueChange={(value) => updateFilter('smokeFree', value || undefined)}
                trackColor={{ false: '#BDC3C7', true: '#2ECC71' }}
              />
            </View>

            <View style={styles.filterRow}>
              <View style={styles.filterLabel}>
                <MaterialCommunityIcons name="dog" size={20} color="#95A5A6" />
                <Text style={styles.filterText}>Pet-Friendly</Text>
              </View>
              <Switch
                value={filters.petFriendly ?? false}
                onValueChange={(value) => updateFilter('petFriendly', value || undefined)}
                trackColor={{ false: '#BDC3C7', true: '#2ECC71' }}
              />
            </View>
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.applyButton}
            onPress={handleApply}
          >
            <Text style={styles.applyButtonText}>
              Apply Filters
              {getActiveFilterCount() > 0 && ` (${getActiveFilterCount()})`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F7',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E8ED',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  resetButton: {
    padding: 8,
  },
  resetText: {
    fontSize: 16,
    color: '#3498DB',
    fontWeight: '600',
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  // Sections
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 12,
  },

  // Filter Rows
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F6F7',
  },
  filterLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  filterText: {
    fontSize: 14,
    color: '#2C3E50',
    marginLeft: 8,
    flex: 1,
  },

  // Sliders
  sliderContainer: {
    marginTop: 8,
  },
  sliderSubLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 12,
    marginBottom: 4,
  },
  slider: {
    width: '100%',
    height: 40,
  },

  // Chips
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F6F7',
    borderWidth: 1,
    borderColor: '#E1E8ED',
  },
  chipActive: {
    backgroundColor: '#3498DB',
    borderColor: '#3498DB',
  },
  chipText: {
    fontSize: 14,
    color: '#2C3E50',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },

  // Distance Options
  distanceOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  distanceChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F5F6F7',
    borderWidth: 1,
    borderColor: '#E1E8ED',
  },
  distanceChipActive: {
    backgroundColor: '#3498DB',
    borderColor: '#3498DB',
  },
  distanceChipText: {
    fontSize: 12,
    color: '#2C3E50',
  },
  distanceChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },

  // Footer
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E1E8ED',
  },
  applyButton: {
    backgroundColor: '#3498DB',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },

  bottomSpacing: {
    height: 32,
  },
});
