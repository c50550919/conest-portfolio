#!/bin/bash
# SafeNest Mobile Development Startup Script
# This script ensures all services are running properly for development

set -e

echo "🚀 Starting SafeNest Mobile Development Environment..."

# Navigate to mobile directory
cd "$(dirname "$0")"
echo "📁 Working directory: $(pwd)"

# Check Android emulator
echo ""
echo "📱 Checking Android emulator..."
if adb devices | grep -q "emulator"; then
    echo "✅ Android emulator is connected"
    EMULATOR_ID=$(adb devices | grep "emulator" | awk '{print $1}')
    echo "   Device: $EMULATOR_ID"

    # Set up port forwarding
    echo "   Setting up port forwarding..."
    adb reverse tcp:3000 tcp:3000
    adb reverse tcp:3001 tcp:3001
    echo "✅ Port forwarding configured (3000, 3001)"
else
    echo "❌ No Android emulator connected"
    echo "   Start emulator with: ~/Library/Android/sdk/emulator/emulator -avd Pixel_3a_API_34_extension_level_7_arm64-v8a &"
    exit 1
fi

# Check backend
echo ""
echo "🐳 Checking backend services..."
if docker ps | grep -q "safenest-backend"; then
    echo "✅ Backend is running"
    docker ps --filter "name=safenest" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
else
    echo "❌ Backend is not running"
    echo "   Start backend with: docker-compose up -d"
    exit 1
fi

# Kill existing Metro processes
echo ""
echo "🧹 Cleaning up existing Metro processes..."
pkill -f "react-native start" || echo "   No existing Metro processes"
pkill -f "metro" || echo "   No existing metro processes"

# Clear Metro cache
echo "   Clearing Metro cache..."
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf /tmp/metro-* 2>/dev/null || true
rm -rf /tmp/haste-map-* 2>/dev/null || true

# Start Metro
echo ""
echo "📦 Starting Metro bundler..."
echo "   This will take a few seconds..."
npm start -- --reset-cache &
METRO_PID=$!

# Wait for Metro to be ready
echo "   Waiting for Metro to start..."
sleep 10

# Check if Metro is listening
if lsof -i :8081 | grep -q LISTEN; then
    echo "✅ Metro is running on port 8081"
else
    echo "❌ Metro failed to start"
    echo "   Check the Metro output for errors"
    exit 1
fi

echo ""
echo "✅ Development environment is ready!"
echo ""
echo "📋 Summary:"
echo "   • Android emulator: Connected ($EMULATOR_ID)"
echo "   • Port forwarding: localhost:3000 → backend"
echo "   • Backend: Running (Docker)"
echo "   • Metro: Running (PID: $METRO_PID)"
echo ""
echo "🎯 Next steps:"
echo "   1. Wait for Metro to finish bundling (watch the terminal)"
echo "   2. Test login with: sarah.johnson@test.com / Test1234"
echo "   3. Check Metro logs for API calls"
echo ""
echo "💡 Useful commands:"
echo "   • Build Android: npm run android"
echo "   • Build iOS: npm run ios"
echo "   • View Metro logs: tail -f the Metro process output"
echo "   • Reload app: Press 'r' in Metro or shake device"
echo ""
