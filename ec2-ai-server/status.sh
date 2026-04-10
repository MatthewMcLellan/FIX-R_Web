#!/usr/bin/env bash
# ============================================================
# FIX-R EC2 — Server Status Check
# Run: bash status.sh
# ============================================================

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'

check() {
  local name="$1"; local cmd="$2"
  if eval "$cmd" &>/dev/null; then
    echo -e "  ${GREEN}✓${NC}  $name"
  else
    echo -e "  ${RED}✗${NC}  $name"
  fi
}

echo ""
echo "FIX-R EC2 AI Server — Status"
echo "=============================="
check "Ollama service"     "systemctl is-active --quiet ollama"
check "Nginx service"      "systemctl is-active --quiet nginx"
check "Ollama reachable"   "curl -sf http://localhost:11434/api/tags"
check "Nginx proxy /v1/"   "curl -sf http://localhost/health"
check "Firewall active"    "ufw status | grep -q 'Status: active'"
check "Fail2ban active"    "systemctl is-active --quiet fail2ban"

echo ""
echo "Installed models:"
ollama list 2>/dev/null || echo "  (ollama not reachable)"

echo ""
API_KEY_FILE="/etc/fixr/api.key"
if [[ -f "$API_KEY_FILE" ]]; then
  API_KEY=$(cat "$API_KEY_FILE")
  PUBLIC_IP=$(curl -s --max-time 5 http://checkip.amazonaws.com/ 2>/dev/null || echo "<unknown>")
  echo "Base URL : http://$PUBLIC_IP"
  echo "API Key  : $API_KEY"
else
  echo -e "${YELLOW}No API key file found at $API_KEY_FILE${NC}"
fi
echo ""
