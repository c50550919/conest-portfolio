/**
 * Placd Demo Seed Script
 *
 * Creates a complete demo environment for the Placd B2B housing placement platform:
 * - 1 organization: "Charlotte Housing Partners"
 * - 3 staff users with org memberships
 * - 40 clients with realistic Charlotte demographics
 * - 25 housing units across Charlotte neighborhoods
 * - 15 placements distributed across pipeline stages
 *
 * Usage:
 *   cd backend && npx ts-node scripts/seed-placd-demo.ts
 *   # or: npm run seed:placd-demo
 *
 * Credentials:
 *   sarah.chen@chp-demo.org / Demo1234!   (org_admin)
 *   marcus.johnson@chp-demo.org / Demo1234! (program_director)
 *   ana.rivera@chp-demo.org / Demo1234!     (case_manager)
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as bcrypt from 'bcrypt';
import { Knex } from 'knex';

if (!process.env.DB_NAME) {
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
}

async function getDatabase(): Promise<Knex> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const knex = require('knex');
  const config = {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER || 'safenest',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'conest_demo',
    },
  };
  console.log(`Connecting to: ${config.connection.database}`);
  return knex(config);
}

// --- Staff Users ---
const STAFF = [
  { email: 'sarah.chen@chp-demo.org', firstName: 'Sarah', lastName: 'Chen', role: 'org_admin' },
  { email: 'marcus.johnson@chp-demo.org', firstName: 'Marcus', lastName: 'Johnson', role: 'program_director' },
  { email: 'ana.rivera@chp-demo.org', firstName: 'Ana', lastName: 'Rivera', role: 'case_manager' },
];

// --- Clients (40) ---
const CLIENTS = [
  // Refugee families — Burmese
  { first_name: 'Naw', last_name: 'Htoo', household_size: 6, language_primary: 'Burmese', budget_max: 900, preferred_area: 'Eastway', status: 'intake' as const },
  { first_name: 'Saw', last_name: 'Ler', household_size: 5, language_primary: 'Burmese', budget_max: 850, preferred_area: 'Hidden Valley', status: 'ready' as const },
  { first_name: 'Mu', last_name: 'Paw', household_size: 4, language_primary: 'Burmese', budget_max: 800, preferred_area: 'Eastway', status: 'ready' as const },
  { first_name: 'Eh', last_name: 'Soe', household_size: 3, language_primary: 'Burmese', budget_max: 750, preferred_area: 'West Charlotte', status: 'placed' as const },
  // Refugee families — Congolese
  { first_name: 'Amani', last_name: 'Bahati', household_size: 7, language_primary: 'French', budget_max: 950, preferred_area: 'Hidden Valley', status: 'intake' as const },
  { first_name: 'Esperance', last_name: 'Mugisha', household_size: 5, language_primary: 'French', budget_max: 900, preferred_area: 'West Charlotte', status: 'ready' as const },
  { first_name: 'Jean-Pierre', last_name: 'Kabeya', household_size: 4, language_primary: 'French', budget_max: 850, preferred_area: 'Hidden Valley', status: 'ready' as const },
  // Refugee families — Afghan
  { first_name: 'Fatima', last_name: 'Ahmadi', household_size: 6, language_primary: 'Dari', budget_max: 1000, preferred_area: 'University City', status: 'intake' as const },
  { first_name: 'Mohammad', last_name: 'Noori', household_size: 5, language_primary: 'Dari', budget_max: 950, preferred_area: 'University City', status: 'ready' as const },
  { first_name: 'Zahra', last_name: 'Rahimi', household_size: 4, language_primary: 'Dari', budget_max: 900, preferred_area: 'Shamrock Gardens', status: 'placed' as const },
  // Refugee families — Somali
  { first_name: 'Halima', last_name: 'Hassan', household_size: 5, language_primary: 'Somali', budget_max: 850, preferred_area: 'Eastway', status: 'ready' as const },
  { first_name: 'Abdi', last_name: 'Mohamed', household_size: 4, language_primary: 'Somali', budget_max: 800, preferred_area: 'West Charlotte', status: 'ready' as const },
  // Single parents — English speaking
  { first_name: 'Tamika', last_name: 'Williams', household_size: 3, language_primary: 'English', budget_max: 1100, preferred_area: 'NoDa', status: 'ready' as const },
  { first_name: 'Jessica', last_name: 'Turner', household_size: 2, language_primary: 'English', budget_max: 1200, preferred_area: 'Plaza Midwood', status: 'placed' as const },
  { first_name: 'DeAndre', last_name: 'Jackson', household_size: 4, language_primary: 'English', budget_max: 1000, preferred_area: 'West Charlotte', status: 'ready' as const },
  { first_name: 'Brittany', last_name: 'Moore', household_size: 2, language_primary: 'English', budget_max: 1150, preferred_area: 'South End', status: 'placed' as const },
  { first_name: 'Crystal', last_name: 'Davis', household_size: 3, language_primary: 'English', budget_max: 950, preferred_area: 'Shamrock Gardens', status: 'intake' as const },
  { first_name: 'Marcus', last_name: 'Brown', household_size: 3, language_primary: 'English', budget_max: 1050, preferred_area: 'NoDa', status: 'ready' as const },
  // Single parents — Spanish speaking
  { first_name: 'Maria', last_name: 'Garcia', household_size: 4, language_primary: 'Spanish', budget_max: 1000, preferred_area: 'Eastway', status: 'ready' as const },
  { first_name: 'Carlos', last_name: 'Hernandez', household_size: 3, language_primary: 'Spanish', budget_max: 950, preferred_area: 'Hidden Valley', status: 'placed' as const },
  { first_name: 'Rosa', last_name: 'Martinez', household_size: 5, language_primary: 'Spanish', budget_max: 900, preferred_area: 'West Charlotte', status: 'ready' as const },
  { first_name: 'Sofia', last_name: 'Lopez', household_size: 2, language_primary: 'Spanish', budget_max: 1100, preferred_area: 'South End', status: 'intake' as const },
  // Veterans
  { first_name: 'James', last_name: 'Patterson', household_size: 2, language_primary: 'English', budget_max: 1200, preferred_area: 'University City', status: 'ready' as const, accessibility_needs: { wheelchair_accessible: true } },
  { first_name: 'Robert', last_name: 'Mitchell', household_size: 1, language_primary: 'English', budget_max: 900, preferred_area: 'NoDa', status: 'placed' as const },
  { first_name: 'Angela', last_name: 'Thompson', household_size: 3, language_primary: 'English', budget_max: 1050, preferred_area: 'Shamrock Gardens', status: 'intake' as const },
  // More diversity
  { first_name: 'Priya', last_name: 'Patel', household_size: 3, language_primary: 'English', budget_max: 1300, preferred_area: 'South End', status: 'ready' as const },
  { first_name: 'Yuki', last_name: 'Tanaka', household_size: 2, language_primary: 'English', budget_max: 1400, preferred_area: 'Plaza Midwood', status: 'placed' as const },
  { first_name: 'Olga', last_name: 'Petrov', household_size: 4, language_primary: 'English', budget_max: 1000, preferred_area: 'University City', status: 'ready' as const },
  { first_name: 'Aisha', last_name: 'Ibrahim', household_size: 5, language_primary: 'Somali', budget_max: 900, preferred_area: 'Eastway', status: 'intake' as const },
  { first_name: 'Thanh', last_name: 'Nguyen', household_size: 3, language_primary: 'English', budget_max: 1100, preferred_area: 'Shamrock Gardens', status: 'ready' as const },
  // Fill to 40
  { first_name: 'Keisha', last_name: 'Robinson', household_size: 4, language_primary: 'English', budget_max: 1000, preferred_area: 'West Charlotte', status: 'placed' as const },
  { first_name: 'David', last_name: 'Kim', household_size: 2, language_primary: 'English', budget_max: 1250, preferred_area: 'NoDa', status: 'placed' as const },
  { first_name: 'Lakisha', last_name: 'Carter', household_size: 3, language_primary: 'English', budget_max: 950, preferred_area: 'Hidden Valley', status: 'intake' as const },
  { first_name: 'Tanya', last_name: 'Washington', household_size: 2, language_primary: 'English', budget_max: 1100, preferred_area: 'Shamrock Gardens', status: 'ready' as const },
  { first_name: 'Miguel', last_name: 'Santos', household_size: 4, language_primary: 'Spanish', budget_max: 950, preferred_area: 'Eastway', status: 'placed' as const },
  { first_name: 'Linh', last_name: 'Tran', household_size: 3, language_primary: 'English', budget_max: 1050, preferred_area: 'Plaza Midwood', status: 'ready' as const },
  { first_name: 'Patricia', last_name: 'Evans', household_size: 2, language_primary: 'English', budget_max: 1150, preferred_area: 'South End', status: 'intake' as const },
  { first_name: 'Ahmad', last_name: 'Safi', household_size: 6, language_primary: 'Dari', budget_max: 900, preferred_area: 'University City', status: 'exited' as const },
  { first_name: 'Diane', last_name: 'Foster', household_size: 3, language_primary: 'English', budget_max: 1000, preferred_area: 'West Charlotte', status: 'exited' as const },
  { first_name: 'Blessing', last_name: 'Okonkwo', household_size: 4, language_primary: 'English', budget_max: 950, preferred_area: 'Hidden Valley', status: 'exited' as const },
];

// --- Housing Units (25) ---
const HOUSING_UNITS = [
  // NoDa
  { address: '2415 N Davidson St', city: 'Charlotte', state: 'NC', zip: '28205', bedrooms: 2, bathrooms: 1, rent_amount: 1100, status: 'available' as const, language_spoken: 'English', nearby_services: { transit: 'LYNX Blue Line 0.3mi', schools: 'Shamrock Gardens Elementary 0.8mi' } },
  { address: '3100 N Brevard St', city: 'Charlotte', state: 'NC', zip: '28205', bedrooms: 3, bathrooms: 2, rent_amount: 1300, status: 'available' as const, language_spoken: 'English', nearby_services: { transit: 'CATS bus 0.1mi', grocery: 'Compare Foods 0.5mi' } },
  // Plaza Midwood
  { address: '1601 Central Ave', city: 'Charlotte', state: 'NC', zip: '28205', bedrooms: 2, bathrooms: 1, rent_amount: 1200, status: 'available' as const, language_spoken: 'English', nearby_services: { grocery: 'Harris Teeter 0.4mi', clinic: 'CW Urgent Care 0.6mi' } },
  { address: '2200 The Plaza', city: 'Charlotte', state: 'NC', zip: '28205', bedrooms: 3, bathrooms: 2, rent_amount: 1400, status: 'occupied' as const, language_spoken: 'English', nearby_services: { transit: 'CATS bus 0.2mi', schools: 'Shamrock Gardens Elementary 0.3mi', grocery: 'Publix 0.5mi' } },
  // South End
  { address: '2000 South Blvd', city: 'Charlotte', state: 'NC', zip: '28203', bedrooms: 1, bathrooms: 1, rent_amount: 1050, status: 'available' as const, language_spoken: 'English', nearby_services: { transit: 'LYNX Blue Line 0.1mi', clinic: 'Atrium Health 0.5mi' } },
  { address: '2215 Hawkins St', city: 'Charlotte', state: 'NC', zip: '28203', bedrooms: 2, bathrooms: 1, rent_amount: 1150, status: 'available' as const, language_spoken: 'Spanish', nearby_services: { transit: 'LYNX Blue Line 0.2mi', grocery: 'Trader Joes 0.4mi' } },
  // University City
  { address: '8500 University City Blvd', city: 'Charlotte', state: 'NC', zip: '28213', bedrooms: 3, bathrooms: 2, rent_amount: 1000, status: 'available' as const, language_spoken: 'English', nearby_services: { transit: 'LYNX Blue Line 0.5mi', schools: 'University Meadows Elementary 0.3mi' } },
  { address: '9100 N Tryon St', city: 'Charlotte', state: 'NC', zip: '28262', bedrooms: 4, bathrooms: 2, rent_amount: 1200, status: 'available' as const, language_spoken: 'Dari', nearby_services: { transit: 'CATS bus 0.2mi', grocery: 'International Market 0.3mi', clinic: 'Novant Health 1.0mi' } },
  // Shamrock Gardens
  { address: '2800 Shamrock Dr', city: 'Charlotte', state: 'NC', zip: '28215', bedrooms: 3, bathrooms: 1, rent_amount: 900, status: 'available' as const, language_spoken: 'English', nearby_services: { schools: 'Shamrock Gardens Elementary 0.2mi', transit: 'CATS bus 0.3mi' } },
  { address: '3000 Eastway Dr', city: 'Charlotte', state: 'NC', zip: '28215', bedrooms: 2, bathrooms: 1, rent_amount: 800, status: 'available' as const, language_spoken: 'Spanish', nearby_services: { grocery: 'Compare Foods 0.2mi', clinic: 'CW Health Center 0.5mi' } },
  // Hidden Valley
  { address: '5200 Hidden Valley Rd', city: 'Charlotte', state: 'NC', zip: '28213', bedrooms: 3, bathrooms: 2, rent_amount: 850, status: 'available' as const, language_spoken: 'French', nearby_services: { transit: 'CATS bus 0.4mi', schools: 'Hidden Valley Elementary 0.2mi' } },
  { address: '5600 W Sugar Creek Rd', city: 'Charlotte', state: 'NC', zip: '28269', bedrooms: 4, bathrooms: 2, rent_amount: 950, status: 'available' as const, language_spoken: 'French', nearby_services: { grocery: 'Food Lion 0.3mi', clinic: 'Atrium Health 1.2mi' } },
  // Eastway
  { address: '4100 Eastway Dr', city: 'Charlotte', state: 'NC', zip: '28205', bedrooms: 2, bathrooms: 1, rent_amount: 750, status: 'available' as const, language_spoken: 'Burmese', nearby_services: { grocery: 'Asian Market 0.3mi', transit: 'CATS bus 0.2mi' } },
  { address: '4500 N Sharon Amity', city: 'Charlotte', state: 'NC', zip: '28205', bedrooms: 3, bathrooms: 1, rent_amount: 850, status: 'available' as const, language_spoken: 'Somali', nearby_services: { schools: 'Eastway Middle 0.4mi', grocery: 'Compare Foods 0.5mi' } },
  { address: '3800 Monroe Rd', city: 'Charlotte', state: 'NC', zip: '28205', bedrooms: 1, bathrooms: 1, rent_amount: 650, status: 'available' as const, language_spoken: 'English', nearby_services: { transit: 'CATS bus 0.1mi' } },
  // West Charlotte
  { address: '3200 Beatties Ford Rd', city: 'Charlotte', state: 'NC', zip: '28216', bedrooms: 3, bathrooms: 2, rent_amount: 900, status: 'reserved' as const, language_spoken: 'English', nearby_services: { transit: 'CATS bus 0.2mi', schools: 'West Charlotte High 0.5mi', grocery: 'Food Lion 0.4mi' } },
  { address: '2900 LaSalle St', city: 'Charlotte', state: 'NC', zip: '28216', bedrooms: 4, bathrooms: 2, rent_amount: 1000, status: 'reserved' as const, language_spoken: 'Spanish', nearby_services: { clinic: 'CW Northwest 0.8mi', grocery: 'Compare Foods 0.3mi' } },
  { address: '3500 Tuckaseegee Rd', city: 'Charlotte', state: 'NC', zip: '28208', bedrooms: 2, bathrooms: 1, rent_amount: 750, status: 'reserved' as const, language_spoken: 'English', nearby_services: { transit: 'CATS bus 0.3mi' } },
  { address: '2600 Freedom Dr', city: 'Charlotte', state: 'NC', zip: '28208', bedrooms: 3, bathrooms: 1, rent_amount: 850, status: 'reserved' as const, language_spoken: 'English', nearby_services: { schools: 'Bruns Ave Elementary 0.3mi', grocery: 'Save A Lot 0.4mi' } },
  // More available
  { address: '6800 Old Pineville Rd', city: 'Charlotte', state: 'NC', zip: '28217', bedrooms: 2, bathrooms: 1, rent_amount: 800, status: 'occupied' as const, language_spoken: 'English', nearby_services: { transit: 'LYNX Blue Line 0.5mi' } },
  { address: '7200 Nations Ford Rd', city: 'Charlotte', state: 'NC', zip: '28217', bedrooms: 3, bathrooms: 2, rent_amount: 950, status: 'occupied' as const, language_spoken: 'Spanish', nearby_services: { grocery: 'Walmart 0.3mi', schools: 'Nations Ford Elementary 0.4mi' } },
  { address: '1800 Statesville Ave', city: 'Charlotte', state: 'NC', zip: '28206', bedrooms: 2, bathrooms: 1, rent_amount: 850, status: 'occupied' as const, language_spoken: 'English', nearby_services: { transit: 'CATS bus 0.2mi', clinic: 'Atrium Health 0.8mi' } },
  { address: '4200 Albemarle Rd', city: 'Charlotte', state: 'NC', zip: '28205', bedrooms: 3, bathrooms: 2, rent_amount: 900, status: 'available' as const, language_spoken: 'Burmese', nearby_services: { grocery: 'Asian Corner Mall 0.2mi', schools: 'Albemarle Road Elementary 0.3mi', transit: 'CATS bus 0.1mi' } },
  { address: '5500 Central Ave', city: 'Charlotte', state: 'NC', zip: '28212', bedrooms: 2, bathrooms: 1, rent_amount: 800, status: 'inactive' as const, language_spoken: 'English', nearby_services: {} },
  { address: '1200 Brookshire Blvd', city: 'Charlotte', state: 'NC', zip: '28216', bedrooms: 1, bathrooms: 1, rent_amount: 700, status: 'available' as const, language_spoken: 'English', nearby_services: { transit: 'CATS bus 0.1mi' } },
];

async function main() {
  const db = await getDatabase();

  try {
    console.log('\n=== Placd Demo Seed ===\n');

    // 1. Create organization
    console.log('1. Creating organization...');
    let [org] = await db('organizations')
      .insert({
        name: 'Charlotte Housing Partners',
        slug: 'charlotte-housing-partners',
        plan_tier: 'professional',
        settings: JSON.stringify({
          email: 'admin@chp-demo.org',
          phone: '704-555-0100',
          address: '400 S Tryon St',
          city: 'Charlotte',
          state: 'NC',
          zip: '28202',
        }),
        is_active: true,
      })
      .onConflict('slug')
      .merge()
      .returning('*');
    console.log(`   ✅ Organization: ${org.name} (${org.slug})`);

    // 2. Create staff users + org memberships
    console.log('\n2. Creating staff users...');
    const passwordHash = await bcrypt.hash('Demo1234!', 10);
    const memberIds: string[] = [];

    for (const staff of STAFF) {
      let user = await db('users').where({ email: staff.email }).first();
      if (!user) {
        [user] = await db('users')
          .insert({
            email: staff.email,
            password_hash: passwordHash,
            phone: `+1555${Math.floor(1000000 + Math.random() * 9000000)}`,
            email_verified: true,
            phone_verified: true,
            status: 'active',
          })
          .returning('*');
      }

      // Create profile
      const existingProfile = await db('profiles').where({ user_id: user.id }).first();
      if (!existingProfile) {
        await db('profiles').insert({
          user_id: user.id,
          first_name: staff.firstName,
          last_name: staff.lastName,
          city: 'Charlotte',
          state: 'NC',
          zip_code: '28202',
          verified: true,
          verification_level: 'full',
        });
      }

      // Create org membership
      const existingMember = await db('org_members')
        .where({ org_id: org.id, user_id: user.id })
        .first();
      if (!existingMember) {
        const [member] = await db('org_members')
          .insert({
            org_id: org.id,
            user_id: user.id,
            role: staff.role,
            is_active: true,
          })
          .returning('*');
        memberIds.push(member.id);
      } else {
        memberIds.push(existingMember.id);
      }
      console.log(`   ✅ ${staff.firstName} ${staff.lastName} (${staff.role})`);
    }

    // 3. Create clients
    console.log('\n3. Creating 40 clients...');
    const clientIds: string[] = [];
    const caseManagerMemberId = memberIds[2]; // Ana Rivera

    for (const clientData of CLIENTS) {
      const [client] = await db('clients')
        .insert({
          org_id: org.id,
          first_name: clientData.first_name,
          last_name: clientData.last_name,
          household_size: clientData.household_size,
          language_primary: clientData.language_primary,
          budget_max: clientData.budget_max,
          preferred_area: clientData.preferred_area,
          status: clientData.status,
          case_manager_id: caseManagerMemberId,
          intake_date: randomPastDate(90),
          accessibility_needs: JSON.stringify((clientData as any).accessibility_needs || {}),
          cultural_preferences: JSON.stringify({}),
          income_range: randomIncomeRange(),
          phone: `+1704${Math.floor(1000000 + Math.random() * 9000000)}`,
          email: `${clientData.first_name.toLowerCase()}.${clientData.last_name.toLowerCase()}@example.com`,
        })
        .returning('*');
      clientIds.push(client.id);
    }
    console.log(`   ✅ Created ${clientIds.length} clients`);

    // Count by status
    const statusCounts = CLIENTS.reduce(
      (acc, c) => {
        acc[c.status] = (acc[c.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    console.log(`   📊 Breakdown: ${JSON.stringify(statusCounts)}`);

    // 4. Create housing units
    console.log('\n4. Creating 25 housing units...');
    const unitIds: string[] = [];

    for (const unitData of HOUSING_UNITS) {
      const [unit] = await db('housing_units')
        .insert({
          org_id: org.id,
          address: unitData.address,
          city: unitData.city,
          state: unitData.state,
          zip: unitData.zip,
          bedrooms: unitData.bedrooms,
          bathrooms: unitData.bathrooms,
          rent_amount: unitData.rent_amount,
          status: unitData.status,
          language_spoken: unitData.language_spoken,
          nearby_services: JSON.stringify(unitData.nearby_services),
          accessibility_features: JSON.stringify([]),
          landlord_name: `${randomName()} Properties`,
          landlord_contact: `704-555-${Math.floor(1000 + Math.random() * 9000)}`,
          available_from: unitData.status === 'available' ? randomFutureDate(14) : null,
        })
        .returning('*');
      unitIds.push(unit.id);
    }
    console.log(`   ✅ Created ${unitIds.length} housing units`);

    const unitStatusCounts = HOUSING_UNITS.reduce(
      (acc, u) => {
        acc[u.status] = (acc[u.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    console.log(`   📊 Breakdown: ${JSON.stringify(unitStatusCounts)}`);

    // 5. Create placements (15)
    console.log('\n5. Creating 15 placements...');
    const readyClientIds = clientIds.filter((_, i) => CLIENTS[i].status === 'ready');
    const placedClientIds = clientIds.filter((_, i) => CLIENTS[i].status === 'placed');
    const availableUnitIds = unitIds.filter((_, i) => HOUSING_UNITS[i].status === 'available');

    const placements = [
      // 3 intake (no unit assigned)
      { clientIdx: 0, stage: 'intake' as const, unitIdx: null, score: null },
      { clientIdx: 4, stage: 'intake' as const, unitIdx: null, score: null },
      { clientIdx: 7, stage: 'intake' as const, unitIdx: null, score: null },
      // 3 matching (no unit, but scored)
      { clientIdx: 1, stage: 'matching' as const, unitIdx: null, score: 0.72 },
      { clientIdx: 5, stage: 'matching' as const, unitIdx: null, score: 0.68 },
      { clientIdx: 8, stage: 'matching' as const, unitIdx: null, score: 0.81 },
      // 3 proposed (unit assigned)
      { clientIdx: 2, stage: 'proposed' as const, unitIdx: 0, score: 0.85 },
      { clientIdx: 6, stage: 'proposed' as const, unitIdx: 10, score: 0.78 },
      { clientIdx: 10, stage: 'proposed' as const, unitIdx: 13, score: 0.74 },
      // 2 accepted
      { clientIdx: 12, stage: 'accepted' as const, unitIdx: 1, score: 0.88 },
      { clientIdx: 17, stage: 'accepted' as const, unitIdx: 4, score: 0.82 },
      // 3 placed
      { clientIdx: 13, stage: 'placed' as const, unitIdx: 2, score: 0.91 },
      { clientIdx: 15, stage: 'placed' as const, unitIdx: 5, score: 0.86 },
      { clientIdx: 23, stage: 'placed' as const, unitIdx: 14, score: 0.79 },
      // 1 closed (successful)
      { clientIdx: 3, stage: 'closed' as const, unitIdx: 8, score: 0.83 },
    ];

    for (const p of placements) {
      const insert: Record<string, unknown> = {
        org_id: org.id,
        client_id: clientIds[p.clientIdx],
        stage: p.stage,
        case_manager_id: caseManagerMemberId,
        compatibility_score: p.score,
        score_breakdown: p.score
          ? JSON.stringify({
              location: +(Math.random() * 0.3 + 0.6).toFixed(2),
              budget: +(Math.random() * 0.3 + 0.6).toFixed(2),
              householdSize: +(Math.random() * 0.3 + 0.5).toFixed(2),
              languageCultural: +(Math.random() * 0.4 + 0.4).toFixed(2),
              accessibility: +(Math.random() * 0.2 + 0.7).toFixed(2),
              servicesProximity: +(Math.random() * 0.4 + 0.3).toFixed(2),
            })
          : null,
      };

      if (p.unitIdx !== null) {
        insert.unit_id = unitIds[p.unitIdx];
      }

      // Set stage timestamps
      const now = new Date();
      if (['proposed', 'accepted', 'placed', 'closed'].includes(p.stage)) {
        insert.proposed_at = new Date(now.getTime() - randomDays(30) * 86400000);
      }
      if (['accepted', 'placed', 'closed'].includes(p.stage)) {
        insert.accepted_at = new Date(now.getTime() - randomDays(20) * 86400000);
      }
      if (['placed', 'closed'].includes(p.stage)) {
        insert.placed_at = new Date(now.getTime() - randomDays(10) * 86400000);
      }
      if (p.stage === 'closed') {
        insert.closed_at = new Date(now.getTime() - randomDays(3) * 86400000);
        insert.outcome = 'successful';
      }

      await db('placements').insert(insert);
    }
    console.log(`   ✅ Created 15 placements`);
    console.log(
      `   📊 Stages: 3 intake, 3 matching, 3 proposed, 2 accepted, 3 placed, 1 closed`,
    );

    console.log('\n=== Seed Complete ===');
    console.log(`\nLogin at http://localhost:3002/login`);
    console.log(`  Email: sarah.chen@chp-demo.org`);
    console.log(`  Password: Demo1234!\n`);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

// --- Helpers ---
function randomPastDate(maxDaysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * maxDaysAgo));
  return d.toISOString().split('T')[0];
}

function randomFutureDate(maxDaysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + Math.floor(Math.random() * maxDaysAhead));
  return d.toISOString().split('T')[0];
}

function randomDays(max: number): number {
  return Math.floor(Math.random() * max) + 1;
}

function randomIncomeRange(): string {
  const ranges = ['15000-25000', '25000-35000', '35000-45000', '45000-60000'];
  return ranges[Math.floor(Math.random() * ranges.length)];
}

function randomName(): string {
  const names = ['Smith', 'Johnson', 'Williams', 'Brown', 'Davis', 'Wilson', 'Anderson', 'Taylor'];
  return names[Math.floor(Math.random() * names.length)];
}

main();
