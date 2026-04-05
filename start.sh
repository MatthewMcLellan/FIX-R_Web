#!/usr/bin/env bash
set -e

# Load environment variables
if [ -f .env ]; then
  set -a; source .env; set +a
fi

API_PORT="${PORT:-3001}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

echo "================================================"
echo "  Starting FIX-R"
echo "  API Server  → http://localhost:${API_PORT}"
echo "  Frontend    → http://localhost:${FRONTEND_PORT}"
echo "================================================"
echo ""

# Trap Ctrl+C to kill both processes
cleanup() {
  echo ""
  echo "Shutting down..."
  kill "$API_PID" "$FRONTEND_PID" 2>/dev/null || true
}
trap cleanup SIGINT SIGTERM

# Start API server
PORT=$API_PORT pnpm --filter @workspace/api-server run dev &
API_PID=$!

# Give API server a moment to start before launching frontend
sleep 2

# Start frontend dev server
PORT=$FRONTEND_PORT API_PORT=$API_PORT pnpm --filter @workspace/ai-chatbot run dev &
FRONTEND_PID=$!

echo "Both servers running. Press Ctrl+C to stop."
wait
