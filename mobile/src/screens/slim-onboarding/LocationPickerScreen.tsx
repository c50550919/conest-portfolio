/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Location Picker Screen (Slim Onboarding Step 1)
 *
 * Allows OAuth users to select their desired location via search.
 * When Mapbox is installed (T013), map view will render with tap-to-select.
 *
 * Flow: OAuth login → [this screen] → BudgetSelector
 * Constitution: Principle I (NO child PII), Principle IV (Performance)
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { SlimOnboardingStackParamList } from '../../navigation/SlimOnboardingNavigator';
import profileAPI from '../../services/api/profileAPI';

type NavigationProp = StackNavigationProp<SlimOnboardingStackParamList, 'LocationPicker'>;

interface LocationData {
  city: string;
  state: string;
  zipCode: string;
  latitude?: number;
  longitude?: number;
}

const LocationPickerScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchResults, setSearchResults] = useState<LocationData[]>([]);

  const searchLocation = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Use Mapbox Geocoding API v6 for forward search
      const token = process.env.MAPBOX_PUBLIC_TOKEN || '';
      if (!token) {
        // Fallback: allow manual entry when no token configured
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      const encodedQuery = encodeURIComponent(query);
      const url = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodedQuery}&country=us&types=place&limit=5&access_token=${token}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const results: LocationData[] = data.features.map((feature: {
          properties: {
            context?: {
              place?: { name?: string };
              region?: { region_code?: string };
              postcode?: { name?: string };
            };
            name?: string;
          };
          geometry: { coordinates: number[] };
        }) => {
          const ctx = feature.properties.context || {};
          return {
            city: ctx.place?.name || feature.properties.name || query,
            state: ctx.region?.region_code || '',
            zipCode: ctx.postcode?.name || '',
            longitude: feature.geometry.coordinates[0],
            latitude: feature.geometry.coordinates[1],
          };
        });
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    searchLocation(text);
  }, [searchLocation]);

  const handleSelectResult = useCallback((location: LocationData) => {
    setSelectedLocation(location);
    setSearchQuery(`${location.city}, ${location.state}`);
    setSearchResults([]);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!selectedLocation) return;

    setIsSubmitting(true);
    try {
      await profileAPI.updateLocation({
        city: selectedLocation.city,
        state: selectedLocation.state,
        zipCode: selectedLocation.zipCode,
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
      });

      navigation.navigate('BudgetSelector', {
        city: selectedLocation.city,
        state: selectedLocation.state,
        zipCode: selectedLocation.zipCode,
      });
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to save location. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedLocation, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Where do you want to live?</Text>
          <Text style={styles.subtitle}>Find trusted roommates near you</Text>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search city or zip code..."
            placeholderTextColor={colors.text.hint}
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoFocus
            returnKeyType="search"
            testID="location-search-input"
          />
          {isSearching && (
            <ActivityIndicator
              style={styles.searchSpinner}
              size="small"
              color={colors.primary}
            />
          )}
        </View>

        {searchResults.length > 0 && (
          <View style={styles.resultsList}>
            {searchResults.map((result, index) => (
              <TouchableOpacity
                key={`${result.city}-${result.state}-${index}`}
                style={styles.resultItem}
                onPress={() => handleSelectResult(result)}
                testID={`location-result-${index}`}
              >
                <Text style={styles.resultCity}>{result.city}, {result.state}</Text>
                {result.zipCode ? (
                  <Text style={styles.resultZip}>{result.zipCode}</Text>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Map placeholder — will render Mapbox MapView when T013 is complete */}
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapPlaceholderText}>
            {selectedLocation
              ? `Selected: ${selectedLocation.city}, ${selectedLocation.state}`
              : 'Search for your city above'}
          </Text>
        </View>

        {selectedLocation && (
          <View style={styles.locationCard}>
            <Text style={styles.locationCardCity}>
              {selectedLocation.city}, {selectedLocation.state}
            </Text>
            {selectedLocation.zipCode ? (
              <Text style={styles.locationCardZip}>{selectedLocation.zipCode}</Text>
            ) : null}
            <TouchableOpacity
              style={[styles.confirmButton, isSubmitting && styles.confirmButtonDisabled]}
              onPress={handleConfirm}
              disabled={isSubmitting}
              testID="confirm-location-button"
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.confirmButtonText}>Confirm Location</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  searchContainer: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    position: 'relative',
  },
  searchInput: {
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  searchSpinner: {
    position: 'absolute',
    right: 16,
    top: 14,
  },
  resultsList: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    maxHeight: 200,
  },
  resultItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  resultCity: {
    fontSize: 16,
    color: colors.text.primary,
    fontWeight: '500',
  },
  resultZip: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
  },
  mapPlaceholder: {
    flex: 1,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    backgroundColor: '#E8F5E9',
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPlaceholderText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  locationCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  locationCardCity: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  locationCardZip: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LocationPickerScreen;
