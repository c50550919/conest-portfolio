-- Enrich Existing Test Profiles with Realistic Data
-- Updates existing test users with photos, bios, preferences, and complete profile data

BEGIN;

-- Sarah Martinez (Sarah32)
UPDATE parents p
SET
  bio = 'Single mom of two wonderful kids looking for a stable, family-friendly home. I work as a nurse and value a clean, quiet environment. Love cooking healthy meals and weekend park trips!',
  profile_photo_url = 'https://ui-avatars.com/api/?name=Sarah+Martinez&size=400&background=4CAF50&color=fff&bold=true',
  occupation = 'Registered Nurse',
  employer = 'Oakland Medical Center',
  work_from_home = false,
  work_schedule = '{"monday":{"start":"07:00","end":"15:00"},"tuesday":{"start":"07:00","end":"15:00"},"wednesday":{"start":"07:00","end":"15:00"},"thursday":{"start":"07:00","end":"15:00"},"friday":{"start":"07:00","end":"15:00"}}'::jsonb,
  parenting_style = 'structured',
  household_preferences = '{"petFriendly":true,"smoking":false,"quiet":true,"earlyRiser":true,"nightOwl":false,"cleanliness":"very_clean","guestPolicy":"occasional"}'::jsonb,
  dietary_restrictions = ARRAY['vegetarian'],
  allergies = ARRAY[]::text[],
  budget_min = 800,
  budget_max = 1200,
  move_in_date = '2025-12-01',
  school_districts = ARRAY['Oakland Unified'],
  profile_completed = true,
  profile_completion_percentage = 100,
  trust_score = 0.85,
  response_rate = 0.92
WHERE user_id = (SELECT id FROM users WHERE email = 'sarah.johnson@test.com' LIMIT 1);

-- Maria Garcia (Maria28)
UPDATE parents p
SET
  bio = 'Tech professional and first-time mom seeking affordable housing in a safe neighborhood. I work remotely and love creating a warm, bilingual home environment. Passionate about early childhood education!',
  profile_photo_url = 'https://ui-avatars.com/api/?name=Maria+Garcia&size=400&background=2196F3&color=fff&bold=true',
  occupation = 'Software Engineer',
  employer = 'Tech Startup',
  work_from_home = true,
  work_schedule = '{"monday":{"start":"09:00","end":"17:00"},"tuesday":{"start":"09:00","end":"17:00"},"wednesday":{"start":"09:00","end":"17:00"},"thursday":{"start":"09:00","end":"17:00"},"friday":{"start":"09:00","end":"17:00"}}'::jsonb,
  parenting_style = 'attachment',
  household_preferences = '{"petFriendly":false,"smoking":false,"quiet":true,"earlyRiser":false,"nightOwl":true,"cleanliness":"clean","guestPolicy":"rare"}'::jsonb,
  dietary_restrictions = ARRAY[]::text[],
  allergies = ARRAY['cats'],
  budget_min = 1000,
  budget_max = 1500,
  move_in_date = '2026-01-15',
  school_districts = ARRAY['SFUSD'],
  profile_completed = true,
  profile_completion_percentage = 100,
  trust_score = 0.88,
  response_rate = 0.95
WHERE user_id = (SELECT id FROM users WHERE email = 'maria.lopez@test.com' LIMIT 1);

-- Jennifer Wong (Jennifer35)
UPDATE parents p
SET
  bio = 'Elementary school teacher and mom of three. Looking for a spacious home with a backyard. I value structure, routine, and creating a nurturing environment for kids to thrive!',
  profile_photo_url = 'https://ui-avatars.com/api/?name=Jennifer+Wong&size=400&background=FF5722&color=fff&bold=true',
  occupation = 'Elementary School Teacher',
  employer = 'Berkeley Public Schools',
  work_from_home = false,
  work_schedule = '{"monday":{"start":"08:00","end":"16:00"},"tuesday":{"start":"08:00","end":"16:00"},"wednesday":{"start":"08:00","end":"16:00"},"thursday":{"start":"08:00","end":"16:00"},"friday":{"start":"08:00","end":"16:00"}}'::jsonb,
  parenting_style = 'structured',
  household_preferences = '{"petFriendly":true,"smoking":false,"quiet":false,"earlyRiser":true,"nightOwl":false,"cleanliness":"clean","guestPolicy":"frequent"}'::jsonb,
  dietary_restrictions = ARRAY['gluten_free'],
  allergies = ARRAY['peanuts'],
  budget_min = 1200,
  budget_max = 1800,
  move_in_date = '2025-11-01',
  school_districts = ARRAY['Berkeley Unified'],
  profile_completed = true,
  profile_completion_percentage = 100,
  trust_score = 0.91,
  response_rate = 0.87
WHERE user_id = (SELECT id FROM users WHERE email = 'jennifer.davis@test.com' LIMIT 1);

-- Ashley Johnson (Ashley29)
UPDATE parents p
SET
  bio = 'Graphic designer and creative mom of one. I work flexible hours and love art, music, and outdoor activities. Seeking a collaborative living situation with another creative parent!',
  profile_photo_url = 'https://ui-avatars.com/api/?name=Ashley+Johnson&size=400&background=9C27B0&color=fff&bold=true',
  occupation = 'Graphic Designer',
  employer = 'Freelance',
  work_from_home = true,
  work_schedule = '{"monday":{"start":"10:00","end":"18:00"},"wednesday":{"start":"10:00","end":"18:00"},"friday":{"start":"10:00","end":"18:00"}}'::jsonb,
  parenting_style = 'free_range',
  household_preferences = '{"petFriendly":true,"smoking":false,"quiet":false,"earlyRiser":false,"nightOwl":true,"cleanliness":"moderate","guestPolicy":"occasional"}'::jsonb,
  dietary_restrictions = ARRAY['vegan'],
  allergies = ARRAY[]::text[],
  budget_min = 700,
  budget_max = 1100,
  move_in_date = '2025-12-15',
  school_districts = ARRAY['Alameda Unified'],
  profile_completed = true,
  profile_completion_percentage = 100,
  trust_score = 0.79,
  response_rate = 0.83
WHERE user_id = (SELECT id FROM users WHERE email = 'ashley.williams@test.com' LIMIT 1);

-- Priya Patel (Priya31)
UPDATE parents p
SET
  bio = 'Healthcare administrator and dedicated mom. I maintain a structured household with focus on education and cultural values. Looking for a respectful, family-oriented roommate!',
  profile_photo_url = 'https://ui-avatars.com/api/?name=Priya+Patel&size=400&background=FFC107&color=333&bold=true',
  occupation = 'Healthcare Administrator',
  employer = 'Kaiser Permanente',
  work_from_home = false,
  work_schedule = '{"monday":{"start":"08:00","end":"17:00"},"tuesday":{"start":"08:00","end":"17:00"},"wednesday":{"start":"08:00","end":"17:00"},"thursday":{"start":"08:00","end":"17:00"},"friday":{"start":"08:00","end":"17:00"}}'::jsonb,
  parenting_style = 'structured',
  household_preferences = '{"petFriendly":false,"smoking":false,"quiet":true,"earlyRiser":true,"nightOwl":false,"cleanliness":"very_clean","guestPolicy":"rare"}'::jsonb,
  dietary_restrictions = ARRAY['vegetarian','dairy_free'],
  allergies = ARRAY[]::text[],
  budget_min = 900,
  budget_max = 1400,
  move_in_date = '2026-02-01',
  school_districts = ARRAY['Fremont Unified'],
  profile_completed = true,
  profile_completion_percentage = 100,
  trust_score = 0.93,
  response_rate = 0.90
WHERE user_id = (SELECT id FROM users WHERE email = 'emily.miller@test.com' LIMIT 1);

COMMIT;

-- Show updated profiles
SELECT
  u.email,
  p.first_name || ' ' || p.last_name as full_name,
  p.occupation,
  p.children_count,
  p.bio is not null as has_bio,
  p.profile_photo_url is not null as has_photo,
  p.profile_completed
FROM users u
JOIN parents p ON u.id = p.user_id
WHERE u.email LIKE '%@test.com'
ORDER BY u.created_at DESC
LIMIT 10;
