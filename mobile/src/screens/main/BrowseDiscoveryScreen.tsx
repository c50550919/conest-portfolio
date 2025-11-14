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
  SafeAreaView,
  StatusBar,
  Platform,
  Modal,
  ScrollView,
  Alert,
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
  addToComparison,
  removeFromComparison,
} from '../../store/slices/browseDiscoverySlice';
import {
  saveProfile,
  removeSavedProfile as removeSavedProfileThunk,
  fetchSavedProfiles,
} from '../../store/slices/savedProfilesSlice';
import { ProfileGridCard } from '../../components/discovery/ProfileGridCard';
import { FolderSelectionModal } from '../../components/discovery/FolderSelectionModal';
import { FilterPanel } from '../../components/discovery/FilterPanel';
import ProfileDetailsModal from '../../components/discovery/ProfileDetailsModal';
import CompatibilityBreakdownModal from '../../components/compatibility/CompatibilityBreakdownModal';
import compatibilityAPI, { CompatibilityBreakdown } from '../../services/api/compatibilityAPI';
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

  // Get saved profiles from savedProfilesSlice (source of truth)
  const { savedProfiles: persistedSavedProfiles } = useSelector(
    (state: RootState) => state.savedProfiles
  );

  const [filterPanelVisible, setFilterPanelVisible] = useState(false);
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<ExtendedProfileCard | null>(null);
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [comparisonModalVisible, setComparisonModalVisible] = useState(false);
  const [folderModalVisible, setFolderModalVisible] = useState(false);
  const [selectedProfileForSave, setSelectedProfileForSave] = useState<ExtendedProfileCard | null>(null);
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [selectedBreakdown, setSelectedBreakdown] = useState<CompatibilityBreakdown | null>(null);
  const [selectedPairNames, setSelectedPairNames] = useState<{profile1: string; profile2: string} | null>(null);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);

  // Mock data for UI development (remove when API is ready)
  const MOCK_PROFILES: ExtendedProfileCard[] = [
    {
      userId: '64c3133d-4e0f-4a41-b537-db546f26ffee', // Real DB user: sarah.johnson@test.com
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
      housingBudget: { min: 1200, max: 1800 },
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
      userId: '55ae5daf-dab9-4aa1-98ca-412a42cbfca4', // Real DB user: maria.rodriguez@test.com
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
      housingBudget: { min: 1000, max: 1400 },
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
    {
      userId: 'e1259464-3932-4973-9085-c5adf5ca18ec', // Real DB user: jessica.martinez@test.com
      firstName: 'Jessica',
      age: 29,
      gender: 'female',
      city: 'Oakland',
      state: 'CA',
      compatibilityScore: 91,
      verificationStatus: { idVerified: true, backgroundCheckComplete: true, phoneVerified: true, emailVerified: true, incomeVerified: true },
      profilePhoto: 'https://i.pravatar.cc/300?img=47',
      childrenCount: 1,
      childrenAgeGroups: ['elementary'],
      budget: 1400,
      housingBudget: { min: 1200, max: 1600 },
      moveInDate: '2025-11-15',
      bio: 'Teacher and single mom, love reading and outdoor activities',
      housingPreferences: { housingType: 'apartment', bedroomCount: 2, bathroomCount: 1, smokeFree: true, petFriendly: false },
      location: { city: 'Oakland', state: 'CA', zipCode: '94612', latitude: 37.8044, longitude: -122.2712 },
      schedule: { workSchedule: 'standard', flexibility: 'medium', weekendAvailability: true },
      parenting: { philosophy: 'gentle-parenting', experience: 'experienced', supportNeeds: ['childcare-sharing'] },
    },
    {
      userId: '46d629df-941a-49d5-a7f1-a822a2fb553c', // Real DB user: amanda.chen@test.com
      firstName: 'Amanda',
      age: 34,
      gender: 'female',
      city: 'Berkeley',
      state: 'CA',
      compatibilityScore: 78,
      verificationStatus: { idVerified: true, backgroundCheckComplete: true, phoneVerified: true, emailVerified: true, incomeVerified: false },
      profilePhoto: 'https://i.pravatar.cc/300?img=20',
      childrenCount: 2,
      childrenAgeGroups: ['infant', 'toddler'],
      budget: 1800,
      housingBudget: { min: 1500, max: 2000 },
      moveInDate: '2026-01-01',
      bio: 'Software engineer working from home, looking for quiet environment',
      housingPreferences: { housingType: 'house', bedroomCount: 3, bathroomCount: 2, smokeFree: true, petFriendly: true },
      location: { city: 'Berkeley', state: 'CA', zipCode: '94704', latitude: 37.8715, longitude: -122.2730 },
      schedule: { workSchedule: 'flexible', flexibility: 'high', weekendAvailability: false },
      parenting: { philosophy: 'montessori', experience: 'experienced', supportNeeds: ['emotional-support'] },
    },
    {
      userId: 'c4ee730f-2ed8-4598-a58d-bd303c7a96a1', // Real DB user: rachel.williams@test.com
      firstName: 'Rachel',
      age: 26,
      gender: 'female',
      city: 'San Jose',
      state: 'CA',
      compatibilityScore: 68,
      verificationStatus: { idVerified: true, backgroundCheckComplete: true, phoneVerified: true, emailVerified: true, incomeVerified: true },
      profilePhoto: 'https://i.pravatar.cc/300?img=32',
      childrenCount: 1,
      childrenAgeGroups: ['infant'],
      budget: 1100,
      housingBudget: { min: 900, max: 1300 },
      moveInDate: '2025-12-15',
      bio: 'Retail manager, love music and cooking',
      housingPreferences: { housingType: 'apartment', bedroomCount: 2, bathroomCount: 1, smokeFree: true, petFriendly: false },
      location: { city: 'San Jose', state: 'CA', zipCode: '95110', latitude: 37.3382, longitude: -121.8863 },
      schedule: { workSchedule: 'evening', flexibility: 'low', weekendAvailability: false },
      parenting: { philosophy: 'attachment', experience: 'new-parent', supportNeeds: ['parenting-guidance', 'emotional-support'] },
    },
    {
      userId: 'b9ea179a-81fa-406e-a48e-1cad0b11d639', // Real DB user: nicole.brown@test.com
      firstName: 'Nicole',
      age: 31,
      gender: 'female',
      city: 'Fremont',
      state: 'CA',
      compatibilityScore: 84,
      verificationStatus: { idVerified: true, backgroundCheckComplete: true, phoneVerified: true, emailVerified: true, incomeVerified: true },
      profilePhoto: 'https://i.pravatar.cc/300?img=44',
      childrenCount: 1,
      childrenAgeGroups: ['elementary'],
      budget: 1500,
      housingBudget: { min: 1300, max: 1700 },
      moveInDate: '2025-11-20',
      bio: 'Healthcare worker, early riser, enjoy gardening',
      housingPreferences: { housingType: 'house', bedroomCount: 3, bathroomCount: 2, smokeFree: true, petFriendly: true },
      location: { city: 'Fremont', state: 'CA', zipCode: '94536', latitude: 37.5483, longitude: -121.9886 },
      schedule: { workSchedule: 'standard', flexibility: 'medium', weekendAvailability: true },
      parenting: { philosophy: 'structured', experience: 'experienced', supportNeeds: ['childcare-sharing'] },
    },
    {
      userId: '7',
      firstName: 'Lisa',
      age: 35,
      gender: 'female',
      city: 'Hayward',
      state: 'CA',
      compatibilityScore: 76,
      verificationStatus: { idVerified: true, backgroundCheckComplete: true, phoneVerified: true, emailVerified: true, incomeVerified: true },
      profilePhoto: 'https://i.pravatar.cc/300?img=16',
      childrenCount: 3,
      childrenAgeGroups: ['elementary', 'middle-school', 'high-school'],
      budget: 2000,
      housingBudget: { min: 1800, max: 2200 },
      moveInDate: '2025-12-01',
      bio: 'Experienced mom of three, accountant, value stability',
      housingPreferences: { housingType: 'house', bedroomCount: 4, bathroomCount: 2, smokeFree: true, petFriendly: false },
      location: { city: 'Hayward', state: 'CA', zipCode: '94541', latitude: 37.6688, longitude: -122.0808 },
      schedule: { workSchedule: 'standard', flexibility: 'low', weekendAvailability: true },
      parenting: { philosophy: 'structured', experience: 'experienced', supportNeeds: [] },
    },
    {
      userId: '8',
      firstName: 'Kelly',
      age: 27,
      gender: 'female',
      city: 'Richmond',
      state: 'CA',
      compatibilityScore: 89,
      verificationStatus: { idVerified: true, backgroundCheckComplete: true, phoneVerified: true, emailVerified: true, incomeVerified: true },
      profilePhoto: 'https://i.pravatar.cc/300?img=29',
      childrenCount: 1,
      childrenAgeGroups: ['toddler'],
      budget: 1300,
      housingBudget: { min: 1100, max: 1500 },
      moveInDate: '2025-11-10',
      bio: 'Graphic designer, creative and organized, love art',
      housingPreferences: { housingType: 'apartment', bedroomCount: 2, bathroomCount: 1, smokeFree: true, petFriendly: true },
      location: { city: 'Richmond', state: 'CA', zipCode: '94801', latitude: 37.9358, longitude: -122.3478 },
      schedule: { workSchedule: 'flexible', flexibility: 'high', weekendAvailability: true },
      parenting: { philosophy: 'gentle-parenting', experience: 'new-parent', supportNeeds: ['emotional-support'] },
    },
    {
      userId: '9',
      firstName: 'Stephanie',
      age: 30,
      gender: 'female',
      city: 'Daly City',
      state: 'CA',
      compatibilityScore: 81,
      verificationStatus: { idVerified: true, backgroundCheckComplete: true, phoneVerified: true, emailVerified: true, incomeVerified: true },
      profilePhoto: 'https://i.pravatar.cc/300?img=41',
      childrenCount: 2,
      childrenAgeGroups: ['toddler', 'elementary'],
      budget: 1600,
      housingBudget: { min: 1400, max: 1800 },
      moveInDate: '2025-12-10',
      bio: 'Paralegal, organized and detail-oriented',
      housingPreferences: { housingType: 'house', bedroomCount: 3, bathroomCount: 2, smokeFree: true, petFriendly: false },
      location: { city: 'Daly City', state: 'CA', zipCode: '94014', latitude: 37.6879, longitude: -122.4702 },
      schedule: { workSchedule: 'standard', flexibility: 'medium', weekendAvailability: false },
      parenting: { philosophy: 'structured', experience: 'experienced', supportNeeds: ['childcare-sharing'] },
    },
    {
      userId: '10',
      firstName: 'Michelle',
      age: 33,
      gender: 'female',
      city: 'Alameda',
      state: 'CA',
      compatibilityScore: 74,
      verificationStatus: { idVerified: true, backgroundCheckComplete: true, phoneVerified: true, emailVerified: true, incomeVerified: false },
      profilePhoto: 'https://i.pravatar.cc/300?img=23',
      childrenCount: 1,
      childrenAgeGroups: ['infant'],
      budget: 1700,
      housingBudget: { min: 1500, max: 1900 },
      moveInDate: '2026-01-15',
      bio: 'Dental hygienist, health-conscious family',
      housingPreferences: { housingType: 'apartment', bedroomCount: 2, bathroomCount: 1, smokeFree: true, petFriendly: true },
      location: { city: 'Alameda', state: 'CA', zipCode: '94501', latitude: 37.7652, longitude: -122.2416 },
      schedule: { workSchedule: 'standard', flexibility: 'low', weekendAvailability: true },
      parenting: { philosophy: 'attachment', experience: 'new-parent', supportNeeds: ['parenting-guidance'] },
    },
    {
      userId: '11',
      firstName: 'Jennifer',
      age: 36,
      gender: 'female',
      city: 'San Leandro',
      state: 'CA',
      compatibilityScore: 70,
      verificationStatus: { idVerified: true, backgroundCheckComplete: true, phoneVerified: true, emailVerified: true, incomeVerified: true },
      profilePhoto: 'https://i.pravatar.cc/300?img=35',
      childrenCount: 2,
      childrenAgeGroups: ['elementary', 'middle-school'],
      budget: 1900,
      housingBudget: { min: 1700, max: 2100 },
      moveInDate: '2025-11-25',
      bio: 'Real estate agent, active lifestyle, sports enthusiast',
      housingPreferences: { housingType: 'house', bedroomCount: 3, bathroomCount: 2, smokeFree: true, petFriendly: true },
      location: { city: 'San Leandro', state: 'CA', zipCode: '94577', latitude: 37.7249, longitude: -122.1561 },
      schedule: { workSchedule: 'flexible', flexibility: 'high', weekendAvailability: false },
      parenting: { philosophy: 'balanced', experience: 'experienced', supportNeeds: [] },
    },
    {
      userId: '12',
      firstName: 'Laura',
      age: 28,
      gender: 'female',
      city: 'Pacifica',
      state: 'CA',
      compatibilityScore: 86,
      verificationStatus: { idVerified: true, backgroundCheckComplete: true, phoneVerified: true, emailVerified: true, incomeVerified: true },
      profilePhoto: 'https://i.pravatar.cc/300?img=48',
      childrenCount: 1,
      childrenAgeGroups: ['toddler'],
      budget: 1500,
      housingBudget: { min: 1300, max: 1700 },
      moveInDate: '2025-12-05',
      bio: 'Marketing coordinator, beach lover, outdoorsy',
      housingPreferences: { housingType: 'apartment', bedroomCount: 2, bathroomCount: 1, smokeFree: true, petFriendly: true },
      location: { city: 'Pacifica', state: 'CA', zipCode: '94044', latitude: 37.6138, longitude: -122.4869 },
      schedule: { workSchedule: 'flexible', flexibility: 'medium', weekendAvailability: true },
      parenting: { philosophy: 'gentle-parenting', experience: 'new-parent', supportNeeds: ['emotional-support'] },
    },
    {
      userId: '13',
      firstName: 'Danielle',
      age: 32,
      gender: 'female',
      city: 'Walnut Creek',
      state: 'CA',
      compatibilityScore: 79,
      verificationStatus: { idVerified: true, backgroundCheckComplete: true, phoneVerified: true, emailVerified: true, incomeVerified: true },
      profilePhoto: 'https://i.pravatar.cc/300?img=27',
      childrenCount: 2,
      childrenAgeGroups: ['infant', 'elementary'],
      budget: 2100,
      housingBudget: { min: 1900, max: 2300 },
      moveInDate: '2026-01-05',
      bio: 'HR manager, family-oriented, enjoy hiking',
      housingPreferences: { housingType: 'house', bedroomCount: 3, bathroomCount: 2, smokeFree: true, petFriendly: false },
      location: { city: 'Walnut Creek', state: 'CA', zipCode: '94596', latitude: 37.9101, longitude: -122.0652 },
      schedule: { workSchedule: 'standard', flexibility: 'medium', weekendAvailability: true },
      parenting: { philosophy: 'balanced', experience: 'experienced', supportNeeds: ['childcare-sharing'] },
    },
    {
      userId: '14',
      firstName: 'Angela',
      age: 29,
      gender: 'female',
      city: 'Concord',
      state: 'CA',
      compatibilityScore: 92,
      verificationStatus: { idVerified: true, backgroundCheckComplete: true, phoneVerified: true, emailVerified: true, incomeVerified: true },
      profilePhoto: 'https://i.pravatar.cc/300?img=38',
      childrenCount: 1,
      childrenAgeGroups: ['toddler'],
      budget: 1400,
      housingBudget: { min: 1200, max: 1600 },
      moveInDate: '2025-11-18',
      bio: 'Physical therapist, active and health-focused',
      housingPreferences: { housingType: 'apartment', bedroomCount: 2, bathroomCount: 1, smokeFree: true, petFriendly: true },
      location: { city: 'Concord', state: 'CA', zipCode: '94520', latitude: 37.9780, longitude: -122.0311 },
      schedule: { workSchedule: 'standard', flexibility: 'medium', weekendAvailability: false },
      parenting: { philosophy: 'montessori', experience: 'experienced', supportNeeds: [] },
    },
    {
      userId: '15',
      firstName: 'Christine',
      age: 34,
      gender: 'female',
      city: 'Pleasanton',
      state: 'CA',
      compatibilityScore: 77,
      verificationStatus: { idVerified: true, backgroundCheckComplete: true, phoneVerified: true, emailVerified: true, incomeVerified: true },
      profilePhoto: 'https://i.pravatar.cc/300?img=31',
      childrenCount: 2,
      childrenAgeGroups: ['elementary', 'middle-school'],
      budget: 2200,
      housingBudget: { min: 2000, max: 2400 },
      moveInDate: '2025-12-20',
      bio: 'Financial analyst, organized and planning-focused',
      housingPreferences: { housingType: 'house', bedroomCount: 4, bathroomCount: 2, smokeFree: true, petFriendly: false },
      location: { city: 'Pleasanton', state: 'CA', zipCode: '94566', latitude: 37.6624, longitude: -121.8747 },
      schedule: { workSchedule: 'standard', flexibility: 'low', weekendAvailability: true },
      parenting: { philosophy: 'structured', experience: 'experienced', supportNeeds: [] },
    },
    {
      userId: '16',
      firstName: 'Melissa',
      age: 26,
      gender: 'female',
      city: 'Livermore',
      state: 'CA',
      compatibilityScore: 82,
      verificationStatus: { idVerified: true, backgroundCheckComplete: true, phoneVerified: true, emailVerified: true, incomeVerified: false },
      profilePhoto: 'https://i.pravatar.cc/300?img=45',
      childrenCount: 1,
      childrenAgeGroups: ['infant'],
      budget: 1200,
      housingBudget: { min: 1000, max: 1400 },
      moveInDate: '2025-11-22',
      bio: 'Lab technician, science enthusiast, quiet lifestyle',
      housingPreferences: { housingType: 'apartment', bedroomCount: 2, bathroomCount: 1, smokeFree: true, petFriendly: false },
      location: { city: 'Livermore', state: 'CA', zipCode: '94550', latitude: 37.6819, longitude: -121.7680 },
      schedule: { workSchedule: 'standard', flexibility: 'low', weekendAvailability: true },
      parenting: { philosophy: 'attachment', experience: 'new-parent', supportNeeds: ['parenting-guidance', 'emotional-support'] },
    },
    {
      userId: '17',
      firstName: 'Tiffany',
      age: 31,
      gender: 'female',
      city: 'Union City',
      state: 'CA',
      compatibilityScore: 75,
      verificationStatus: { idVerified: true, backgroundCheckComplete: true, phoneVerified: true, emailVerified: true, incomeVerified: true },
      profilePhoto: 'https://i.pravatar.cc/300?img=49',
      childrenCount: 2,
      childrenAgeGroups: ['toddler', 'elementary'],
      budget: 1650,
      housingBudget: { min: 1450, max: 1850 },
      moveInDate: '2025-12-12',
      bio: 'Social worker, compassionate and community-minded',
      housingPreferences: { housingType: 'house', bedroomCount: 3, bathroomCount: 2, smokeFree: true, petFriendly: true },
      location: { city: 'Union City', state: 'CA', zipCode: '94587', latitude: 37.5933, longitude: -122.0438 },
      schedule: { workSchedule: 'flexible', flexibility: 'medium', weekendAvailability: false },
      parenting: { philosophy: 'gentle-parenting', experience: 'experienced', supportNeeds: ['emotional-support'] },
    },
    {
      userId: '18',
      firstName: 'Heather',
      age: 35,
      gender: 'female',
      city: 'Dublin',
      state: 'CA',
      compatibilityScore: 88,
      verificationStatus: { idVerified: true, backgroundCheckComplete: true, phoneVerified: true, emailVerified: true, incomeVerified: true },
      profilePhoto: 'https://i.pravatar.cc/300?img=26',
      childrenCount: 1,
      childrenAgeGroups: ['elementary'],
      budget: 1950,
      housingBudget: { min: 1750, max: 2150 },
      moveInDate: '2025-11-28',
      bio: 'Project manager, tech industry, structured lifestyle',
      housingPreferences: { housingType: 'house', bedroomCount: 3, bathroomCount: 2, smokeFree: true, petFriendly: true },
      location: { city: 'Dublin', state: 'CA', zipCode: '94568', latitude: 37.7022, longitude: -121.9358 },
      schedule: { workSchedule: 'flexible', flexibility: 'high', weekendAvailability: true },
      parenting: { philosophy: 'balanced', experience: 'experienced', supportNeeds: [] },
    },
    {
      userId: '19',
      firstName: 'Emily',
      age: 27,
      gender: 'female',
      city: 'Newark',
      state: 'CA',
      compatibilityScore: 83,
      verificationStatus: { idVerified: true, backgroundCheckComplete: true, phoneVerified: true, emailVerified: true, incomeVerified: true },
      profilePhoto: 'https://i.pravatar.cc/300?img=40',
      childrenCount: 1,
      childrenAgeGroups: ['infant'],
      budget: 1350,
      housingBudget: { min: 1150, max: 1550 },
      moveInDate: '2025-12-08',
      bio: 'Customer service manager, friendly and sociable',
      housingPreferences: { housingType: 'apartment', bedroomCount: 2, bathroomCount: 1, smokeFree: true, petFriendly: false },
      location: { city: 'Newark', state: 'CA', zipCode: '94560', latitude: 37.5297, longitude: -122.0402 },
      schedule: { workSchedule: 'standard', flexibility: 'medium', weekendAvailability: true },
      parenting: { philosophy: 'gentle-parenting', experience: 'new-parent', supportNeeds: ['emotional-support'] },
    },
    {
      userId: '20',
      firstName: 'Victoria',
      age: 33,
      gender: 'female',
      city: 'Millbrae',
      state: 'CA',
      compatibilityScore: 87,
      verificationStatus: { idVerified: true, backgroundCheckComplete: true, phoneVerified: true, emailVerified: true, incomeVerified: true },
      profilePhoto: 'https://i.pravatar.cc/300?img=33',
      childrenCount: 2,
      childrenAgeGroups: ['toddler', 'elementary'],
      budget: 2000,
      housingBudget: { min: 1800, max: 2200 },
      moveInDate: '2025-11-30',
      bio: 'Flight attendant, world traveler, multicultural',
      housingPreferences: { housingType: 'house', bedroomCount: 3, bathroomCount: 2, smokeFree: true, petFriendly: true },
      location: { city: 'Millbrae', state: 'CA', zipCode: '94030', latitude: 37.5985, longitude: -122.3872 },
      schedule: { workSchedule: 'flexible', flexibility: 'high', weekendAvailability: false },
      parenting: { philosophy: 'balanced', experience: 'experienced', supportNeeds: ['childcare-sharing'] },
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
    // Fetch saved profiles to sync bookmark state
    dispatch(fetchSavedProfiles() as any);
  }, [dispatch]);

  // Handle save profile - show folder selection modal
  const handleSaveProfile = (profile: ExtendedProfileCard) => {
    const validation = canSaveProfile(savedProfiles);

    if (!validation.allowed) {
      alert(validation.errorMessage);
      return;
    }

    // Store the profile and show folder selection modal
    setSelectedProfileForSave(profile);
    setFolderModalVisible(true);
  };

  // Handle folder selection and save profile
  const handleFolderSelect = (folder: string) => {
    if (!selectedProfileForSave) return;

    dispatch(saveProfile({
      profileId: selectedProfileForSave.userId,
      folder: folder as 'Top Choice' | 'Strong Maybe' | 'Considering' | 'Backup',
      notes: '',
    }));

    // Show success message
    alert(SUCCESS_MESSAGES.PROFILE_SAVED.replace('{folder}', folder));

    // Clean up
    setSelectedProfileForSave(null);
    setFolderModalVisible(false);
  };

  // Handle unsave profile
  const handleUnsaveProfile = (profileId: string) => {
    // Find the saved profile entry by profile_id
    const savedProfile = persistedSavedProfiles.find(sp => sp.profile_id === profileId);
    if (savedProfile) {
      dispatch(removeSavedProfileThunk(savedProfile.id));
      alert(SUCCESS_MESSAGES.PROFILE_REMOVED);
    } else {
      console.error('Saved profile not found for profileId:', profileId);
    }
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
    setIsProfileModalVisible(true);
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

  // Handle compatibility breakdown
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

      console.log('[BrowseDiscoveryScreen] Got breakdown:', breakdown);

      setSelectedBreakdown(breakdown);
      setSelectedPairNames({
        profile1: profile1.profile.firstName,
        profile2: profile2.profile.firstName,
      });

      console.log('[BrowseDiscoveryScreen] Closing comparison modal');
      setComparisonModalVisible(false);

      // Small delay to let comparison modal close before opening breakdown modal
      setTimeout(() => {
        console.log('[BrowseDiscoveryScreen] Setting showBreakdownModal to true');
        setShowBreakdownModal(true);
        console.log('[BrowseDiscoveryScreen] showBreakdownModal should now be true');
      }, 300);
    } catch (error) {
      console.error('[BrowseDiscoveryScreen] Error calculating compatibility:', error);
      Alert.alert(
        'Error',
        'Failed to calculate compatibility breakdown. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoadingBreakdown(false);
    }
  };

  // Check if profile is saved (use persistedSavedProfiles as source of truth)
  const isProfileSaved = (profileId: string): boolean => {
    return persistedSavedProfiles.some(sp => sp.profile_id === profileId);
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
    <SafeAreaView style={styles.safeArea} testID="discovery-screen">
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
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
            onPress={() => setComparisonModalVisible(true)}
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

      {/* Profile Details Modal */}
      <ProfileDetailsModal
        visible={isProfileModalVisible}
        profile={selectedProfile}
        onClose={() => {
          setIsProfileModalVisible(false);
          setSelectedProfile(null);
        }}
        onInterested={() => {
          // User is interested - add logic here for sending connection request
          alert(`Connection request sent to ${selectedProfile?.firstName}`);
        }}
      />

      {/* Comparison Modal */}
      <Modal
        visible={comparisonModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setComparisonModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={{ flex: 1 }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E1E8ED' }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#2C3E50' }}>
                Compare Profiles ({comparisonProfiles.length})
              </Text>
              <TouchableOpacity onPress={() => setComparisonModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#2C3E50" />
              </TouchableOpacity>
            </View>

            {/* Comparison Content */}
            <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{ flex: 1 }}>
              {comparisonProfiles.map((comparisonItem, index) => {
                const profile = comparisonItem.profile;
                return (
                  <View key={profile.userId} style={{ width: width * 0.85, padding: 16, borderRightWidth: 1, borderRightColor: '#E1E8ED' }}>
                    <View style={{ backgroundColor: '#F5F6F7', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                      <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2C3E50', marginBottom: 8 }}>{profile.firstName}, {profile.age}</Text>
                      <Text style={{ fontSize: 14, color: '#7F8C8D', marginBottom: 4 }}>{profile.city}, {profile.state}</Text>
                      <Text style={{ fontSize: 14, color: '#3498DB', fontWeight: '600' }}>Compatibility: {profile.compatibilityScore}%</Text>
                    </View>

                    <View style={{ gap: 12 }}>
                      <View>
                        <Text style={{ fontSize: 12, color: '#7F8C8D', marginBottom: 4 }}>Children</Text>
                        <Text style={{ fontSize: 14, color: '#2C3E50' }}>{profile.childrenCount} child(ren)</Text>
                      </View>

                      {profile.housingBudget && (
                        <View>
                          <Text style={{ fontSize: 12, color: '#7F8C8D', marginBottom: 4 }}>Budget</Text>
                          <Text style={{ fontSize: 14, color: '#2C3E50' }}>${profile.housingBudget.min} - ${profile.housingBudget.max}/mo</Text>
                        </View>
                      )}

                      {profile.parenting?.philosophy && (
                        <View>
                          <Text style={{ fontSize: 12, color: '#7F8C8D', marginBottom: 4 }}>Parenting Philosophy</Text>
                          <Text style={{ fontSize: 14, color: '#2C3E50' }}>
                            {profile.parenting.philosophy
                              .split('-')
                              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                              .join(' ')}
                          </Text>
                        </View>
                      )}
                    </View>

                    <TouchableOpacity
                      style={{ backgroundColor: '#E74C3C', padding: 12, borderRadius: 8, marginTop: 16, alignItems: 'center' }}
                      onPress={() => dispatch(removeFromComparison(profile.userId))}
                    >
                      <Text style={{ color: '#fff', fontWeight: '600' }}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>

            {/* Compatibility Breakdown Button (only for 2 profiles) */}
            {comparisonProfiles.length === 2 && (
              <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#E1E8ED' }}>
                <TouchableOpacity
                  testID="compatibility-breakdown-button"
                  style={{
                    backgroundColor: '#4ECDC4',
                    padding: 16,
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onPress={handleShowBreakdown}
                  disabled={loadingBreakdown}
                >
                  <MaterialCommunityIcons name="chart-donut" size={24} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
                    {loadingBreakdown ? 'Loading...' : 'Show Detailed Compatibility'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>

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
    backgroundColor: '#fff', // Match header background for seamless look
  },
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
