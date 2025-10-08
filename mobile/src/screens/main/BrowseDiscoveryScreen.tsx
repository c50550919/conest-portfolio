/**
 * Browse Discovery Screen
 *
 * Purpose: Main browse-based discovery interface for finding housing partners
 * Constitution: Principle I (Child Safety), Principle IV (Performance)
 *
 * Features:
 * - Grid/list/map view modes
 * - Advanced filtering with 15+ criteria
 * - Infinite scroll pagination
 * - Save profiles and comparison tool
 * - Deliberate connection requests
 * - Performance optimized (<500ms load)
 *
 * Created: 2025-10-08
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import {
  setViewMode,
  setSortBy,
  setFilters,
  setLoading,
  setRefreshing,
  setProfiles,
  appendProfiles,
  addSavedProfile,
  removeSavedProfile,
  addToComparison,
  removeFromComparison,
} from '../../store/slices/browseDiscoverySlice';
import { ProfileGridCard } from '../../components/discovery/ProfileGridCard';
import { FilterPanel } from '../../components/discovery/FilterPanel';
import {
  SORT_OPTIONS,
  VIEW_MODES,
  PAGINATION_CONFIG,
  SAVED_PROFILE_LIMITS,
  COMPARISON_LIMITS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from '../../config/discoveryConfig';
import { canSaveProfile } from '../../utils/rateLimits';
import { ExtendedProfileCard, SavedProfile, BrowseViewMode, SortOption } from '../../types/discovery';

const { width } = Dimensions.get('window');

export const BrowseDiscoveryScreen: React.FC = () => {
  const dispatch = useDispatch();
  const {
    viewMode,
    sortBy,
    filters,
    profiles,
    loading,
    refreshing,
    nextCursor,
    savedProfiles,
    comparisonProfiles,
  } = useSelector((state: RootState) => state.browseDiscovery);

  const [filterPanelVisible, setFilterPanelVisible] = useState(false);
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<ExtendedProfileCard | null>(null);

  // Mock data for UI development (remove when API is ready)
  const MOCK_PROFILES: ExtendedProfileCard[] = [
    {
      userId: '1',
      firstName: 'Sarah',
      age: 32,
      gender: 'female',
      city: 'San Francisco',
      state: 'CA',
      compatibilityScore: 85,
      verificationStatus: {
        idVerified: true,
        backgroundCheckComplete: true,
        phoneVerified: true,
        emailVerified: true,
        incomeVerified: false,
      },
      profilePhoto: 'https://i.pravatar.cc/300?img=1',
      childrenCount: 2,
      childrenAgeGroups: ['toddler', 'elementary'],
      budget: 1500,
      moveInDate: '2025-11-01',
      bio: 'Working mom looking for a supportive housing partner',
      housingPreferences: {
        housingType: 'apartment',
        bedroomCount: 3,
        bathroomCount: 2,
        smokeFree: true,
        petFriendly: false,
      },
      location: {
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102',
        latitude: 37.7749,
        longitude: -122.4194,
      },
      schedule: {
        workSchedule: 'standard',
        flexibility: 'moderate',
        weekendAvailability: true,
      },
      parenting: {
        philosophy: 'gentle-parenting',
        experience: 'experienced',
        supportNeeds: ['childcare-sharing', 'emotional-support'],
      },
    },
    {
      userId: '2',
      firstName: 'Maria',
      age: 28,
      gender: 'female',
      city: 'San Francisco',
      state: 'CA',
      compatibilityScore: 72,
      verificationStatus: {
        idVerified: true,
        backgroundCheckComplete: true,
        phoneVerified: true,
        emailVerified: true,
        incomeVerified: true,
      },
      profilePhoto: 'https://i.pravatar.cc/300?img=5',
      childrenCount: 1,
      childrenAgeGroups: ['infant'],
      budget: 1200,
      moveInDate: '2025-12-01',
      bio: 'New mom seeking stable housing partnership',
      housingPreferences: {
        housingType: 'either',
        bedroomCount: 2,
        bathroomCount: 1,
        smokeFree: true,
        petFriendly: true,
      },
      location: {
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94103',
        latitude: 37.7749,
        longitude: -122.4194,
      },
      schedule: {
        workSchedule: 'flexible',
        flexibility: 'high',
        weekendAvailability: true,
      },
      parenting: {
        philosophy: 'attachment',
        experience: 'new-parent',
        supportNeeds: ['emotional-support', 'parenting-guidance'],
      },
    },
  ];

  // Fetch profiles (mock implementation)
  const fetchProfiles = useCallback(async (refresh: boolean = false) => {
    try {
      if (refresh) {
        dispatch(setRefreshing(true));
      } else {
        dispatch(setLoading(true));
      }

      // TODO: Replace with actual API call
      // const response = await api.getBrowseProfiles({ filters, sortBy, cursor: nextCursor });

      // Mock delay to simulate API
      await new Promise(resolve => setTimeout(resolve, 500));

      if (refresh) {
        dispatch(setProfiles({
          profiles: MOCK_PROFILES,
          totalCount: MOCK_PROFILES.length,
          nextCursor: null,
        }));
        dispatch(setRefreshing(false));
      } else {
        dispatch(appendProfiles({
          profiles: MOCK_PROFILES,
          nextCursor: null,
        }));
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  }, [filters, sortBy, nextCursor, dispatch]);

  useEffect(() => {
    if (profiles.length === 0) {
      fetchProfiles();
    }
  }, []);

  // Handle save profile
  const handleSaveProfile = (profile: ExtendedProfileCard) => {
    const validation = canSaveProfile(savedProfiles);

    if (!validation.allowed) {
      alert(validation.errorMessage);
      return;
    }

    const saved: SavedProfile = {
      profileId: profile.userId,
      folder: 'considering',
      notes: '',
      savedAt: new Date().toISOString(),
      viewCount: 0,
      lastViewedAt: new Date().toISOString(),
    };

    dispatch(addSavedProfile(saved));

    if (validation.reason === 'soft_warning') {
      alert(validation.errorMessage);
    } else {
      alert(SUCCESS_MESSAGES.PROFILE_SAVED.replace('{folder}', 'Considering'));
    }
  };

  // Handle unsave profile
  const handleUnsaveProfile = (profileId: string) => {
    dispatch(removeSavedProfile(profileId));
    alert(SUCCESS_MESSAGES.PROFILE_REMOVED);
  };

  // Handle comparison
  const handleToggleComparison = (profile: ExtendedProfileCard) => {
    const isInComparison = comparisonProfiles.some(cp => cp.profile.userId === profile.userId);

    if (isInComparison) {
      dispatch(removeFromComparison(profile.userId));
    } else {
      if (comparisonProfiles.length >= COMPARISON_LIMITS.maxProfiles) {
        alert(ERROR_MESSAGES.COMPARISON_LIMIT);
        return;
      }

      dispatch(addToComparison({
        profile,
        addedAt: new Date().toISOString(),
      }));
    }
  };

  // Handle profile tap (open detailed view)
  const handleProfilePress = (profile: ExtendedProfileCard) => {
    setSelectedProfile(profile);
    // TODO: Open detailed profile modal
    alert(`Opening detailed view for ${profile.firstName}`);
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchProfiles(true);
  };

  // Handle load more
  const handleLoadMore = () => {
    if (nextCursor && !loading) {
      fetchProfiles(false);
    }
  };

  // Check if profile is saved
  const isProfileSaved = (profileId: string): boolean => {
    return savedProfiles.some(sp => sp.profileId === profileId);
  };

  // Check if profile is in comparison
  const isProfileInComparison = (profileId: string): boolean => {
    return comparisonProfiles.some(cp => cp.profile.userId === profileId);
  };

  // Render profile card
  const renderProfileCard = ({ item }: { item: ExtendedProfileCard }) => (
    <ProfileGridCard
      profile={item}
      onPress={() => handleProfilePress(item)}
      onSave={() =>
        isProfileSaved(item.userId)
          ? handleUnsaveProfile(item.userId)
          : handleSaveProfile(item)
      }
      onCompare={() => handleToggleComparison(item)}
      isSaved={isProfileSaved(item.userId)}
      isInComparison={isProfileInComparison(item.userId)}
    />
  );

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="home-search" size={80} color="#BDC3C7" />
      <Text style={styles.emptyTitle}>No profiles found</Text>
      <Text style={styles.emptySubtitle}>
        Try adjusting your filters to see more results
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => setFilterPanelVisible(true)}
      >
        <Text style={styles.emptyButtonText}>Adjust Filters</Text>
      </TouchableOpacity>
    </View>
  );

  // Render footer (loading indicator)
  const renderFooter = () => {
    if (!loading || refreshing) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#3498DB" />
      </View>
    );
  };

  // Active filter count
  const getActiveFilterCount = (): number => {
    let count = 0;
    Object.entries(filters).forEach(([key, value]) => {
      if (key === 'requireBackgroundCheck' || key === 'requireIdVerified') return;
      if (value !== undefined && value !== null) {
        if (Array.isArray(value) && value.length > 0) count++;
        else if (!Array.isArray(value)) count++;
      }
    });
    return count;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Browse Connections</Text>
        <View style={styles.headerActions}>
          {/* View Mode Toggle */}
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => {
              const modes: BrowseViewMode[] = ['grid', 'list', 'map'];
              const currentIndex = modes.indexOf(viewMode);
              const nextMode = modes[(currentIndex + 1) % modes.length];
              dispatch(setViewMode(nextMode));
            }}
          >
            <MaterialCommunityIcons
              name={viewMode === 'grid' ? 'view-grid' : viewMode === 'list' ? 'view-list' : 'map'}
              size={24}
              color="#2C3E50"
            />
          </TouchableOpacity>

          {/* Sort Menu */}
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setSortMenuVisible(!sortMenuVisible)}
          >
            <MaterialCommunityIcons name="sort" size={24} color="#2C3E50" />
          </TouchableOpacity>

          {/* Filter Button */}
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setFilterPanelVisible(true)}
          >
            <MaterialCommunityIcons name="filter" size={24} color="#3498DB" />
            {getActiveFilterCount() > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{getActiveFilterCount()}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Sort Menu Dropdown */}
      {sortMenuVisible && (
        <View style={styles.sortMenu}>
          {SORT_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.sortOption,
                sortBy === option.value && styles.sortOptionActive,
              ]}
              onPress={() => {
                dispatch(setSortBy(option.value as SortOption));
                setSortMenuVisible(false);
              }}
            >
              <Text
                style={[
                  styles.sortOptionText,
                  sortBy === option.value && styles.sortOptionTextActive,
                ]}
              >
                {option.label}
              </Text>
              {sortBy === option.value && (
                <MaterialCommunityIcons name="check" size={20} color="#3498DB" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Comparison Bar */}
      {comparisonProfiles.length > 0 && (
        <View style={styles.comparisonBar}>
          <View style={styles.comparisonInfo}>
            <MaterialCommunityIcons name="compare" size={20} color="#3498DB" />
            <Text style={styles.comparisonText}>
              {comparisonProfiles.length} profile{comparisonProfiles.length !== 1 ? 's' : ''} selected
            </Text>
          </View>
          <TouchableOpacity
            style={styles.compareButton}
            onPress={() => alert('Opening comparison view')}
          >
            <Text style={styles.compareButtonText}>Compare</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Profile Grid */}
      <FlatList
        data={profiles}
        renderItem={renderProfileCard}
        keyExtractor={(item) => item.userId}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContent}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#3498DB"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
      />

      {/* Filter Panel */}
      <FilterPanel
        visible={filterPanelVisible}
        currentFilters={filters}
        onApply={(newFilters) => dispatch(setFilters(newFilters))}
        onClose={() => setFilterPanelVisible(false)}
      />
    </View>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    padding: 8,
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

  // Sort Menu
  sortMenu: {
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
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F6F7',
  },
  sortOptionActive: {
    backgroundColor: '#EBF5FB',
  },
  sortOptionText: {
    fontSize: 14,
    color: '#2C3E50',
  },
  sortOptionTextActive: {
    fontWeight: '600',
    color: '#3498DB',
  },

  // Comparison Bar
  comparisonBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#EBF5FB',
    borderBottomWidth: 1,
    borderBottomColor: '#D6EAF8',
  },
  comparisonInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  comparisonText: {
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

  // Grid
  gridContent: {
    padding: 16,
  },
  gridRow: {
    justifyContent: 'space-between',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#3498DB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },

  // Footer Loader
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
