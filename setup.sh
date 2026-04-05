#!/usr/bin/env bash
set -e

echo "================================================"
echo "  FIX-R Setup"
echo "================================================"

# Check for Node.js
if ! command -v node &>/dev/null; then
  echo "ERROR: Node.js is not installed. Install Node.js 20+ from https://nodejs.org"
  exit 1
fi

NODE_MAJOR=$(node -e "console.log(process.versions.node.split('.')[0])")
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "ERROR: Node.js 20+ is required (found $(node --version))"
  exit 1
fi

# Check for pnpm
if ! command -v pnpm &>/dev/null; then
  echo "pnpm not found — installing..."
  npm install -g pnpm
fi

# Check for PostgreSQL
if ! command -v psql &>/dev/null; then
  echo "WARNING: psql not found. Make sure PostgreSQL is running and DATABASE_URL is set correctly."
fi

# Create .env if it doesn't exist
if [ ! -f .env ]; then
  cp .env.example .env
  echo ""
  echo "Created .env from .env.example"
  echo ">>> EDIT .env NOW and set DATABASE_URL and SESSION_SECRET, then run this script again."
  echo ""
  exit 0
fi

# Load .env
set -a; source .env; set +a

if [ -z "$DATABASE_URL" ] || [ "$DATABASE_URL" = "postgresql://user:password@localhost:5432/fixr" ]; then
  echo "ERROR: Please set DATABASE_URL in your .env file before running setup."
  exit 1
fi

echo ""
echo "Installing dependencies..."
pnpm install

echo ""
echo "Setting up database schema..."
psql "$DATABASE_URL" -f schema.sql
echo "Schema applied."

echo ""
echo "================================================"
echo "  Setup complete!"
echo "  Run ./start.sh to launch FIX-R."
echo "================================================"
