/**
 * ProfileCard Type Definition
 *
 * Purpose: Type-safe profile card data for Discovery Screen
 * Constitution: Principle I (Child Safety) - CRITICAL
 *
 * ONLY childrenCount and childrenAgeGroups allowed
 * NO childrenNames, childrenPhotos, childrenAges, childrenSchools
 */

export interface VerificationStatus {
  idVerified: boolean;
  backgroundCheckComplete: boolean;
  phoneVerified: boolean;
}

export interface ProfileCard {
  userId: string;
  firstName: string;
  age: number;
  city: string;

  // Child data - ONLY non-identifying information
  childrenCount: number;
  childrenAgeGroups: ('toddler' | 'elementary' | 'teen')[];

  // Matching data
  compatibilityScore: number;
  verificationStatus: VerificationStatus;

  // Optional additional fields
  budget?: number;
  moveInDate?: string;
  bio?: string;
  profilePhoto?: string;
}

export interface DiscoveryResponse {
  profiles: ProfileCard[];
  nextCursor: string | null;
}
