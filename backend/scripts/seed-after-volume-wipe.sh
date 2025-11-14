#!/bin/bash

# Script to reseed test data after Docker volume wipe
# Run this after: docker-compose down -v

set -e

echo "🌱 Re-seeding test data after volume wipe..."

# Wait for database to be ready
echo "⏳ Waiting for database..."
sleep 5

# Run migrations
echo "📋 Running migrations..."
docker exec safenest-backend npx knex migrate:latest || echo "⚠️  Migrations may already be up to date"

# Copy seed SQL to container
echo "📦 Copying seed data..."
docker cp /tmp/seed-test-data.sql safenest-postgres:/tmp/

# Execute seed SQL
echo "🌱 Seeding test users and profiles..."
docker exec safenest-postgres psql -U safenest -d safenest_db -f /tmp/seed-test-data.sql

echo "✅ Test data seeded successfully!"
echo ""
echo "Test Accounts:"
echo "  📧 sarah.johnson@test.com / Test1234"
echo "  👤 Discovery profiles: Emily Davis, Jessica Martinez"
echo ""
echo "You can now login and test the bookmark/compare flow."
