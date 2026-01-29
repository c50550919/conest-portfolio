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
 * Refactored: 2025-12-08 - Decomposed into smaller components
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';
import { Text, TouchableOpacity } from 'react-native';

import { RootState } from '../../store';
import {
  setViewMode,
  setSortBy,
  setFilters,
  setLoading,
  setRefreshing,
  setProfiles,
  appendProfiles,
  addToComparison,
  removeFromComparison,
} from '../../store/slices/browseDiscoverySlice';
import {
  saveProfile,
  removeSavedProfile as removeSavedProfileThunk,
  fetchSavedProfiles,
} from '../../store/slices/savedProfilesSlice';

// Extracted components
import { DiscoveryHeader } from '../../components/discovery/DiscoveryHeader';
import { SortMenu } from '../../components/discovery/SortMenu';
import { ComparisonToolbar } from '../../components/discovery/ComparisonToolbar';
import { ComparisonModal } from '../../components/discovery/ComparisonModal';
import { ProfileGridCard } from '../../components/discovery/ProfileGridCard';
import { FolderSelectionModal } from '../../components/discovery/FolderSelectionModal';
import { FilterPanel } from '../../components/discovery/FilterPanel';
import ProfileDetailsModal from '../../components/discovery/ProfileDetailsModal';
import CompatibilityBreakdownModal from '../../components/compatibility/CompatibilityBreakdownModal';

// Services and APIs
import compatibilityAPI, { CompatibilityBreakdown } from '../../services/api/compatibilityAPI';
import connectionRequestsAPI from '../../services/api/connectionRequestsAPI';
import discoveryAPI from '../../services/api/discoveryAPI';
import { adaptProfiles } from '../../services/adapters/discoveryAdapter';

// Config and utilities
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../../config/discoveryConfig';
import { canSaveProfile } from '../../utils/rateLimits';
import { ExtendedProfileCard, BrowseViewMode, SortOption } from '../../types/discovery';

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

  // Get saved profiles from savedProfilesSlice (source of truth)
  const { savedProfiles: persistedSavedProfiles } = useSelector(
    (state: RootState) => state.savedProfiles
  );

  // UI State
  const [filterPanelVisible, setFilterPanelVisible] = useState(false);
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<ExtendedProfileCard | null>(null);
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [comparisonModalVisible, setComparisonModalVisible] = useState(false);
  const [folderModalVisible, setFolderModalVisible] = useState(false);
  const [selectedProfileForSave, setSelectedProfileForSave] = useState<ExtendedProfileCard | null>(
    null
  );

  // Compatibility breakdown state
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [selectedBreakdown, setSelectedBreakdown] = useState<CompatibilityBreakdown | null>(null);
  const [selectedPairNames, setSelectedPairNames] = useState<{
    profile1: string;
    profile2: string;
  } | null>(null);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);

  // Fetch profiles from real API
  const fetchProfiles = useCallback(
    async (refresh: boolean = false) => {
      try {
        if (refresh) {
          dispatch(setRefreshing(true));
        } else {
          dispatch(setLoading(true));
        }

        // Real API call with pagination
        const response = await discoveryAPI.getProfiles(
          refresh ? undefined : nextCursor ?? undefined,
          12 // Page size
        );

        // Adapt backend ProfileCard to frontend ExtendedProfileCard
        const adaptedProfiles = adaptProfiles(response.profiles);

        if (refresh) {
          dispatch(
            setProfiles({
              profiles: adaptedProfiles,
              totalCount: adaptedProfiles.length,
              nextCursor: response.nextCursor,
            })
          );
          dispatch(setRefreshing(false));
        } else {
          dispatch(
            appendProfiles({
              profiles: adaptedProfiles,
              nextCursor: response.nextCursor,
            })
          );
        }
        dispatch(setLoading(false));
      } catch (error) {
        console.error('Error fetching profiles:', error);
        dispatch(setLoading(false));
        dispatch(setRefreshing(false));
        Alert.alert(
          'Error',
          'Failed to load profiles. Please check your connection and try again.',
          [{ text: 'Retry', onPress: () => fetchProfiles(refresh) }, { text: 'OK' }]
        );
      }
    },
    [filters, sortBy, nextCursor, dispatch]
  );

  useEffect(() => {
    if (profiles.length === 0) {
      fetchProfiles();
    }
    dispatch(fetchSavedProfiles() as any);
  }, [dispatch]);

  // Profile save handlers
  const handleSaveProfile = (profile: ExtendedProfileCard) => {
    const validation = canSaveProfile(savedProfiles);
    if (!validation.allowed) {
      Alert.alert('Cannot Save Profile', validation.errorMessage || 'Unknown error');
      return;
    }
    setSelectedProfileForSave(profile);
    setFolderModalVisible(true);
  };

  const handleFolderSelect = (folder: string) => {
    if (!selectedProfileForSave) return;
    dispatch(
      saveProfile({
        profileId: selectedProfileForSave.userId,
        folder: folder as 'Top Choice' | 'Strong Maybe' | 'Considering' | 'Backup',
        notes: '',
      }) as any
    );
    Alert.alert('Profile Saved', SUCCESS_MESSAGES.PROFILE_SAVED.replace('{folder}', folder));
    setSelectedProfileForSave(null);
    setFolderModalVisible(false);
  };

  const handleUnsaveProfile = (profileId: string) => {
    const savedProfile = persistedSavedProfiles.find((sp) => sp.profile_id === profileId);
    if (savedProfile) {
      dispatch(removeSavedProfileThunk(savedProfile.id) as any);
      Alert.alert('Profile Removed', SUCCESS_MESSAGES.PROFILE_REMOVED);
    }
  };

  // Comparison handlers
  const handleToggleComparison = (profile: ExtendedProfileCard) => {
    const isInComparison = comparisonProfiles.some((cp) => cp.profile.userId === profile.userId);
    if (isInComparison) {
      dispatch(removeFromComparison(profile.userId));
    } else {
      if (comparisonProfiles.length >= 4) {
        Alert.alert('Comparison Limit', ERROR_MESSAGES.COMPARISON_LIMIT);
        return;
      }
      dispatch(addToComparison({ profile, addedAt: new Date().toISOString() }));
    }
  };

  const handleShowBreakdown = async () => {
    if (comparisonProfiles.length !== 2) {
      Alert.alert('Selection Required', 'Please select exactly 2 profiles to see compatibility breakdown');
      return;
    }
    try {
      setLoadingBreakdown(true);
      const profile1 = comparisonProfiles[0];
      const profile2 = comparisonProfiles[1];
      const breakdown = await compatibilityAPI.calculateCompatibility(
        profile1.profile.userId,
        profile2.profile.userId
      );
      setSelectedBreakdown(breakdown);
      setSelectedPairNames({
        profile1: profile1.profile.firstName,
        profile2: profile2.profile.firstName,
      });
      setComparisonModalVisible(false);
      setTimeout(() => setShowBreakdownModal(true), 300);
    } catch (error) {
      Alert.alert('Error', 'Failed to calculate compatibility breakdown. Please try again.');
    } finally {
      setLoadingBreakdown(false);
    }
  };

  // View mode handler
  const handleViewModeToggle = () => {
    const modes: BrowseViewMode[] = ['grid', 'list', 'map'];
    const currentIndex = modes.indexOf(viewMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    dispatch(setViewMode(nextMode));
  };

  // Helper functions
  const isProfileSaved = (profileId: string): boolean => {
    return persistedSavedProfiles.some((sp) => sp.profile_id === profileId);
  };

  const isProfileInComparison = (profileId: string): boolean => {
    return comparisonProfiles.some((cp) => cp.profile.userId === profileId);
  };

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

  // Render functions
  const renderProfileCard = ({ item }: { item: ExtendedProfileCard }) => (
    <ProfileGridCard
      profile={item}
      onPress={() => {
        setSelectedProfile(item);
        setIsProfileModalVisible(true);
      }}
      onSave={() =>
        isProfileSaved(item.userId) ? handleUnsaveProfile(item.userId) : handleSaveProfile(item)
      }
      onCompare={() => handleToggleComparison(item)}
      isSaved={isProfileSaved(item.userId)}
      isInComparison={isProfileInComparison(item.userId)}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="home-search" size={80} color="#BDC3C7" />
      <Text style={styles.emptyTitle}>No profiles found</Text>
      <Text style={styles.emptySubtitle}>Try adjusting your filters to see more results</Text>
      <TouchableOpacity style={styles.emptyButton} onPress={() => setFilterPanelVisible(true)}>
        <Text style={styles.emptyButtonText}>Adjust Filters</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFooter = () => {
    if (!loading || refreshing) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#3498DB" />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} testID="discovery-screen">
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.container}>
        {/* Header */}
        <DiscoveryHeader
          viewMode={viewMode}
          activeFilterCount={getActiveFilterCount()}
          onViewModeToggle={handleViewModeToggle}
          onSortPress={() => setSortMenuVisible(!sortMenuVisible)}
          onFilterPress={() => setFilterPanelVisible(true)}
        />

        {/* Sort Menu Dropdown */}
        <SortMenu
          visible={sortMenuVisible}
          currentSort={sortBy}
          onSelect={(option) => {
            dispatch(setSortBy(option));
            setSortMenuVisible(false);
          }}
        />

        {/* Comparison Toolbar */}
        <ComparisonToolbar
          selectedCount={comparisonProfiles.length}
          onComparePress={() => setComparisonModalVisible(true)}
        />

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
              onRefresh={() => fetchProfiles(true)}
              tintColor="#3498DB"
            />
          }
          onEndReached={() => nextCursor && !loading && fetchProfiles(false)}
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

        {/* Profile Details Modal */}
        <ProfileDetailsModal
          visible={isProfileModalVisible}
          profile={selectedProfile}
          onClose={() => {
            setIsProfileModalVisible(false);
            setSelectedProfile(null);
          }}
          onInterested={async () => {
            if (!selectedProfile) return;
            try {
              await connectionRequestsAPI.sendConnectionRequest(
                selectedProfile.userId,
                `Hi ${selectedProfile.firstName}! I'm interested in connecting with you as a potential housing partner. I think we'd be compatible based on your profile. Would you like to chat?`
              );
              Alert.alert(
                'Request Sent!',
                `Your connection request has been sent to ${selectedProfile.firstName}. They'll be notified and can respond when they're ready.`
              );
            } catch (error: any) {
              Alert.alert('Request Failed', error.message || 'Failed to send connection request.');
            }
          }}
        />

        {/* Comparison Modal */}
        <ComparisonModal
          visible={comparisonModalVisible}
          profiles={comparisonProfiles}
          onClose={() => setComparisonModalVisible(false)}
          onRemoveProfile={(userId) => dispatch(removeFromComparison(userId))}
          onShowBreakdown={handleShowBreakdown}
          loadingBreakdown={loadingBreakdown}
        />

        {/* Folder Selection Modal */}
        <FolderSelectionModal
          visible={folderModalVisible}
          onClose={() => setFolderModalVisible(false)}
          onSelectFolder={handleFolderSelect}
          profileName={selectedProfileForSave?.firstName || 'this profile'}
        />

        {/* Compatibility Breakdown Modal */}
        <CompatibilityBreakdownModal
          visible={showBreakdownModal}
          breakdown={selectedBreakdown}
          profile1Name={selectedPairNames?.profile1 || ''}
          profile2Name={selectedPairNames?.profile2 || ''}
          onClose={() => {
            setShowBreakdownModal(false);
            setSelectedBreakdown(null);
            setSelectedPairNames(null);
          }}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F6F7',
  },
  gridContent: {
    padding: 16,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
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
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});

export default BrowseDiscoveryScreen;
