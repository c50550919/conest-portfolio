#!/bin/bash
# =============================================================================
# CoNest Demo Recording Script
# =============================================================================
# Purpose: Run the demo matching flow E2E test with screen recording
#
# Prerequisites:
#   - Backend running (npm run demo in backend/)
#   - iOS app built for Detox (npx detox build --configuration ios.sim.debug)
#
# Usage:
#   ./scripts/run-demo-recording.sh
#
# Output:
#   - Video: ./demo-recordings/demo-matching-TIMESTAMP.mp4
#   - Screenshots: ./artifacts/ (from Detox)
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MOBILE_DIR="$(dirname "$SCRIPT_DIR")"
RECORDING_DIR="$MOBILE_DIR/demo-recordings"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
VIDEO_FILE="$RECORDING_DIR/demo-matching-$TIMESTAMP.mp4"

# Create recording directory
mkdir -p "$RECORDING_DIR"

echo ""
echo "🎬 CoNest Demo Recording"
echo "═══════════════════════════════"
echo ""
echo "📹 Video will be saved to: $VIDEO_FILE"
echo ""

# Boot the simulator if not already running
SIMULATOR_NAME="iPhone 16 Pro"
BOOTED=$(xcrun simctl list devices | grep "$SIMULATOR_NAME" | grep "Booted" || true)

if [ -z "$BOOTED" ]; then
    echo "📱 Booting $SIMULATOR_NAME simulator..."
    xcrun simctl boot "$SIMULATOR_NAME" 2>/dev/null || true
    sleep 3
fi

# Open Simulator app to bring it to foreground
open -a Simulator

echo "⏳ Waiting for simulator to be ready..."
sleep 3

# Start screen recording in background
echo "🔴 Starting screen recording..."
xcrun simctl io booted recordVideo --codec h264 "$VIDEO_FILE" &
RECORD_PID=$!
echo "   Recording PID: $RECORD_PID"
sleep 2

# Run the Detox test
echo ""
echo "🧪 Running demo matching flow test..."
echo "───────────────────────────────────"
cd "$MOBILE_DIR"

npx detox test --configuration ios.sim.debug \
    --testNamePattern "demo-matching-flow" \
    --headless false \
    --record-logs all \
    --take-screenshots all \
    --record-videos failing \
    --artifacts-location "$MOBILE_DIR/artifacts/$TIMESTAMP" \
    2>&1 || TEST_EXIT=$?

echo ""
echo "───────────────────────────────────"

# Stop recording
echo "⏹️  Stopping screen recording..."
kill -INT $RECORD_PID 2>/dev/null || true
wait $RECORD_PID 2>/dev/null || true
sleep 2

# Check results
echo ""
echo "═══════════════════════════════"
if [ -f "$VIDEO_FILE" ]; then
    VIDEO_SIZE=$(du -h "$VIDEO_FILE" | cut -f1)
    echo "✅ Recording saved: $VIDEO_FILE ($VIDEO_SIZE)"
    echo ""
    echo "📂 To open: open $VIDEO_FILE"
else
    echo "⚠️  Video file not found at: $VIDEO_FILE"
fi

echo ""
if [ "${TEST_EXIT:-0}" -eq 0 ]; then
    echo "✅ Test completed successfully!"
else
    echo "⚠️  Test exited with code: $TEST_EXIT"
    echo "   Check artifacts at: $MOBILE_DIR/artifacts/$TIMESTAMP"
fi

echo ""
echo "📸 Screenshots saved to: $MOBILE_DIR/artifacts/$TIMESTAMP"
echo "🎬 Demo recording complete!"
echo ""
