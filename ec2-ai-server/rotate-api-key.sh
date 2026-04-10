#!/usr/bin/env bash
# ============================================================
# FIX-R EC2 — Rotate API Key
# Generates a new API key and updates Nginx automatically.
# Run: sudo bash rotate-api-key.sh
# ============================================================
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

[[ $EUID -ne 0 ]] && { echo "Run as root: sudo bash rotate-api-key.sh"; exit 1; }

API_KEY_FILE="/etc/fixr/api.key"
NGINX_CONF="/etc/nginx/sites-available/fixr-ai"

NEW_KEY="fixr-$(openssl rand -hex 24)"

echo "$NEW_KEY" > "$API_KEY_FILE"
chmod 600 "$API_KEY_FILE"

# Update Nginx config
OLD_KEY=$(grep -oP '(?<=Bearer )fixr-[a-f0-9]+' "$NGINX_CONF" 2>/dev/null || echo "")
if [[ -n "$OLD_KEY" ]]; then
  sed -i "s/Bearer ${OLD_KEY}/Bearer ${NEW_KEY}/g" "$NGINX_CONF"
  nginx -t && systemctl reload nginx
  echo -e "${GREEN}✓ API key rotated and Nginx reloaded.${NC}"
else
  echo -e "${YELLOW}Could not find old key in Nginx config. Update it manually.${NC}"
fi

echo ""
echo "New API Key: $NEW_KEY"
echo ""
echo "Update your FIX-R Admin → Servers → Edit → API Key field with the new value."
