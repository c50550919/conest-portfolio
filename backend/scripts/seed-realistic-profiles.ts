/**
 * Seed Realistic Test Profiles
 *
 * Creates 20 fully populated parent profiles with:
 * - Profile photos (via UI Avatars API)
 * - Detailed bios and preferences
 * - Work schedules and household info
 * - Location data (Bay Area cities)
 * - Budget and housing preferences
 *
 * Usage: ts-node scripts/seed-realistic-profiles.ts
 */

import axios from 'axios';
import * as bcrypt from 'bcrypt';
import { db } from '../src/config/database';

const API_BASE = 'http://localhost:3000/api';
const PASSWORD = 'Test1234'; // Consistent password for all test users

interface TestProfile {
  // User fields
  email: string;
  password: string;
  phone: string;

  // Parent fields
  firstName: string;
  lastName: string;
  displayName: string; // e.g., "Sarah32", "Maria28"
  age: number;
  dateOfBirth: string;
  bio: string;
  profilePhotoUrl: string;

  // Children
  childrenCount: number;
  childrenAgeGroups: string[];

  // Work
  occupation: string;
  employer: string;
  workFromHome: boolean;
  workSchedule: {
    monday?: { start: string; end: string };
    tuesday?: { start: string; end: string };
    wednesday?: { start: string; end: string };
    thursday?: { start: string; end: string };
    friday?: { start: string; end: string };
  };

  // Parenting & Household
  parentingStyle: string;
  householdPreferences: {
    petFriendly: boolean;
    smoking: boolean;
    quiet: boolean;
    earlyRiser: boolean;
    nightOwl: boolean;
    cleanliness: string;
    guestPolicy: string;
  };
  dietaryRestrictions: string[];
  allergies: string[];

  // Location & Budget
  city: string;
  state: string;
  zipCode: string;
  budgetMin: number;
  budgetMax: number;
  moveInDate: string;
  schoolDistricts: string[];
}

const testProfiles: TestProfile[] = [
  {
    email: 'sarah.martinez@test.com',
    password: PASSWORD,
    phone: '+15551000001',
    firstName: 'Sarah',
    lastName: 'Martinez',
    displayName: 'Sarah32',
    age: 32,
    dateOfBirth: '1993-04-15',
    bio: 'Single mom of two wonderful kids looking for a stable, family-friendly home. I work as a nurse and value a clean, quiet environment. Love cooking healthy meals and weekend park trips!',
    profilePhotoUrl: 'https://ui-avatars.com/api/?name=Sarah+Martinez&size=400&background=4CAF50&color=fff&bold=true',
    childrenCount: 2,
    childrenAgeGroups: ['toddler', 'elementary'],
    occupation: 'Registered Nurse',
    employer: 'Oakland Medical Center',
    workFromHome: false,
    workSchedule: {
      monday: { start: '07:00', end: '15:00' },
      tuesday: { start: '07:00', end: '15:00' },
      wednesday: { start: '07:00', end: '15:00' },
      thursday: { start: '07:00', end: '15:00' },
      friday: { start: '07:00', end: '15:00' },
    },
    parentingStyle: 'structured',
    householdPreferences: {
      petFriendly: true,
      smoking: false,
      quiet: true,
      earlyRiser: true,
      nightOwl: false,
      cleanliness: 'very_clean',
      guestPolicy: 'occasional',
    },
    dietaryRestrictions: ['vegetarian'],
    allergies: [],
    city: 'Oakland',
    state: 'CA',
    zipCode: '94601',
    budgetMin: 800,
    budgetMax: 1200,
    moveInDate: '2025-12-01',
    schoolDistricts: ['Oakland Unified'],
  },
  {
    email: 'maria.garcia@test.com',
    password: PASSWORD,
    phone: '+15551000002',
    firstName: 'Maria',
    lastName: 'Garcia',
    displayName: 'Maria28',
    age: 28,
    dateOfBirth: '1997-08-22',
    bio: 'Tech professional and first-time mom seeking affordable housing in a safe neighborhood. I work remotely and love creating a warm, bilingual home environment. Passionate about early childhood education!',
    profilePhotoUrl: 'https://ui-avatars.com/api/?name=Maria+Garcia&size=400&background=2196F3&color=fff&bold=true',
    childrenCount: 1,
    childrenAgeGroups: ['infant'],
    occupation: 'Software Engineer',
    employer: 'Tech Startup',
    workFromHome: true,
    workSchedule: {
      monday: { start: '09:00', end: '17:00' },
      tuesday: { start: '09:00', end: '17:00' },
      wednesday: { start: '09:00', end: '17:00' },
      thursday: { start: '09:00', end: '17:00' },
      friday: { start: '09:00', end: '17:00' },
    },
    parentingStyle: 'attachment',
    householdPreferences: {
      petFriendly: false,
      smoking: false,
      quiet: true,
      earlyRiser: false,
      nightOwl: true,
      cleanliness: 'clean',
      guestPolicy: 'rare',
    },
    dietaryRestrictions: [],
    allergies: ['cats'],
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94102',
    budgetMin: 1000,
    budgetMax: 1500,
    moveInDate: '2026-01-15',
    schoolDistricts: ['SFUSD'],
  },
  {
    email: 'jennifer.wong@test.com',
    password: PASSWORD,
    phone: '+15551000003',
    firstName: 'Jennifer',
    lastName: 'Wong',
    displayName: 'Jennifer35',
    age: 35,
    dateOfBirth: '1990-11-03',
    bio: 'Elementary school teacher and mom of three. Looking for a spacious home with a backyard. I value structure, routine, and creating a nurturing environment for kids to thrive!',
    profilePhotoUrl: 'https://ui-avatars.com/api/?name=Jennifer+Wong&size=400&background=FF5722&color=fff&bold=true',
    childrenCount: 3,
    childrenAgeGroups: ['elementary', 'middle_school', 'high_school'],
    occupation: 'Elementary School Teacher',
    employer: 'Berkeley Public Schools',
    workFromHome: false,
    workSchedule: {
      monday: { start: '08:00', end: '16:00' },
      tuesday: { start: '08:00', end: '16:00' },
      wednesday: { start: '08:00', end: '16:00' },
      thursday: { start: '08:00', end: '16:00' },
      friday: { start: '08:00', end: '16:00' },
    },
    parentingStyle: 'structured',
    householdPreferences: {
      petFriendly: true,
      smoking: false,
      quiet: false,
      earlyRiser: true,
      nightOwl: false,
      cleanliness: 'clean',
      guestPolicy: 'frequent',
    },
    dietaryRestrictions: ['gluten_free'],
    allergies: ['peanuts'],
    city: 'Berkeley',
    state: 'CA',
    zipCode: '94704',
    budgetMin: 1200,
    budgetMax: 1800,
    moveInDate: '2025-11-01',
    schoolDistricts: ['Berkeley Unified'],
  },
  {
    email: 'ashley.johnson@test.com',
    password: PASSWORD,
    phone: '+15551000004',
    firstName: 'Ashley',
    lastName: 'Johnson',
    displayName: 'Ashley29',
    age: 29,
    dateOfBirth: '1996-02-18',
    bio: 'Graphic designer and creative mom of one. I work flexible hours and love art, music, and outdoor activities. Seeking a collaborative living situation with another creative parent!',
    profilePhotoUrl: 'https://ui-avatars.com/api/?name=Ashley+Johnson&size=400&background=9C27B0&color=fff&bold=true',
    childrenCount: 1,
    childrenAgeGroups: ['toddler'],
    occupation: 'Graphic Designer',
    employer: 'Freelance',
    workFromHome: true,
    workSchedule: {
      monday: { start: '10:00', end: '18:00' },
      wednesday: { start: '10:00', end: '18:00' },
      friday: { start: '10:00', end: '18:00' },
    },
    parentingStyle: 'free_range',
    householdPreferences: {
      petFriendly: true,
      smoking: false,
      quiet: false,
      earlyRiser: false,
      nightOwl: true,
      cleanliness: 'moderate',
      guestPolicy: 'occasional',
    },
    dietaryRestrictions: ['vegan'],
    allergies: [],
    city: 'Alameda',
    state: 'CA',
    zipCode: '94501',
    budgetMin: 700,
    budgetMax: 1100,
    moveInDate: '2025-12-15',
    schoolDistricts: ['Alameda Unified'],
  },
  {
    email: 'priya.patel@test.com',
    password: PASSWORD,
    phone: '+15551000005',
    firstName: 'Priya',
    lastName: 'Patel',
    displayName: 'Priya31',
    age: 31,
    dateOfBirth: '1994-06-10',
    bio: 'Healthcare administrator and dedicated mom. I maintain a structured household with focus on education and cultural values. Looking for a respectful, family-oriented roommate!',
    profilePhotoUrl: 'https://ui-avatars.com/api/?name=Priya+Patel&size=400&background=FFC107&color=333&bold=true',
    childrenCount: 2,
    childrenAgeGroups: ['elementary', 'middle_school'],
    occupation: 'Healthcare Administrator',
    employer: 'Kaiser Permanente',
    workFromHome: false,
    workSchedule: {
      monday: { start: '08:00', end: '17:00' },
      tuesday: { start: '08:00', end: '17:00' },
      wednesday: { start: '08:00', end: '17:00' },
      thursday: { start: '08:00', end: '17:00' },
      friday: { start: '08:00', end: '17:00' },
    },
    parentingStyle: 'structured',
    householdPreferences: {
      petFriendly: false,
      smoking: false,
      quiet: true,
      earlyRiser: true,
      nightOwl: false,
      cleanliness: 'very_clean',
      guestPolicy: 'rare',
    },
    dietaryRestrictions: ['vegetarian', 'dairy_free'],
    allergies: [],
    city: 'Fremont',
    state: 'CA',
    zipCode: '94536',
    budgetMin: 900,
    budgetMax: 1400,
    moveInDate: '2026-02-01',
    schoolDistricts: ['Fremont Unified'],
  },
];

async function seedRealisticProfiles() {
  console.log('🌱 Starting realistic profile seeding...\n');

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const profile of testProfiles) {
    try {
      // Register user via API
      const registerPayload = {
        email: profile.email,
        password: profile.password,
        phone: profile.phone,
        firstName: profile.firstName,
        lastName: profile.lastName,
        dateOfBirth: profile.dateOfBirth,
        city: profile.city,
        state: profile.state,
        zipCode: profile.zipCode,
        childrenCount: profile.childrenCount,
        childrenAgeGroups: profile.childrenAgeGroups,
      };

      const response = await axios.post(`${API_BASE}/auth/register`, registerPayload);

      if (response.status === 201 || response.data.success) {
        const userId = response.data.data.userId;

        // Update parent profile with detailed info
        await db('parents')
          .where({ user_id: userId })
          .update({
            bio: profile.bio,
            profile_photo_url: profile.profilePhotoUrl,
            occupation: profile.occupation,
            employer: profile.employer,
            work_from_home: profile.workFromHome,
            work_schedule: JSON.stringify(profile.workSchedule),
            parenting_style: profile.parentingStyle,
            household_preferences: JSON.stringify(profile.householdPreferences),
            dietary_restrictions: profile.dietaryRestrictions,
            allergies: profile.allergies,
            budget_min: profile.budgetMin,
            budget_max: profile.budgetMax,
            move_in_date: profile.moveInDate,
            school_districts: profile.schoolDistricts,
            profile_completed: true,
            profile_completion_percentage: 100,
            trust_score: 0.75 + Math.random() * 0.2, // 0.75-0.95
            response_rate: 0.80 + Math.random() * 0.15, // 0.80-0.95
          });

        console.log(`✅ Created: ${profile.displayName} (${profile.email})`);
        created++;
      }
    } catch (error: any) {
      if (error.response?.status === 409 || error.response?.data?.error === 'conflict') {
        console.log(`⏭️  Skipped: ${profile.displayName} (already exists)`);
        skipped++;
      } else {
        console.error(`❌ Error creating ${profile.displayName}:`, error.message);
        errors++;
      }
    }
  }

  console.log('\n📊 Seeding Summary:');
  console.log(`   ✅ Created: ${created}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📝 Total: ${testProfiles.length}`);

  process.exit(0);
}

// Run seeding
seedRealisticProfiles().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
