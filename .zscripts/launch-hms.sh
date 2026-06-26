#!/bin/bash
# Launch HMS services (Next.js dev + realtime mini-service) as detached daemons
# that survive the parent shell exiting. Uses setsid + exec.

PROJECT_DIR="/home/z/my-project"
RT_DIR="$PROJECT_DIR/mini-services/realtime"

# Kill any stale instances
pkill -f "next dev -p 3000" 2>/dev/null || true
pkill -f "bun --hot index.ts" 2>/dev/null || true
sleep 1

# Start realtime service as a true daemon
(setsid bash -c "cd '$RT_DIR' && exec bun --hot index.ts" </dev/null >>"$RT_DIR/realtime.log" 2>&1 &)

# Start Next.js dev server as a true daemon
(setsid bash -c "cd '$PROJECT_DIR' && exec node node_modules/.bin/next dev -p 3000" </dev/null >>"$PROJECT_DIR/dev.log" 2>&1 &)

echo "Launched. Waiting 8s for startup..."
sleep 8
echo "--- Realtime (3003) ---"
curl -s http://localhost:3003/health || echo "FAILED"
echo ""
echo "--- Next.js (3000) ---"
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3000/api/dashboard || echo "FAILED"
