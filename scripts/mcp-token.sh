#!/usr/bin/env bash
# Lisää HOME_ERP_API_TOKEN Claude desktopin home-erp-MCP:n ympäristöön.
# Ajo: bash scripts/mcp-token.sh  ja käynnistä Claude-sovellus uudelleen.
set -euo pipefail
cd "$(dirname "$0")/.."
CFG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
TOKEN=$(grep -E '^HOME_ERP_API_TOKEN=' backend/.env | tail -1 | cut -d= -f2-)
[ -n "$TOKEN" ] || { echo "HOME_ERP_API_TOKEN puuttuu backend/.env-tiedostosta"; exit 1; }
cp "$CFG" "$CFG.bak-$(date +%Y%m%d%H%M%S)"
TOKEN="$TOKEN" python3 - "$CFG" <<'PY'
import json, os, sys
p = sys.argv[1]
cfg = json.load(open(p))
servers = cfg.get("mcpServers", {})
name = next((k for k in servers if "home-erp" in k.lower()), None)
if not name:
    sys.exit("home-erp-palvelinta ei löytynyt: " + ", ".join(servers))
servers[name].setdefault("env", {})["HOME_ERP_API_TOKEN"] = os.environ["TOKEN"]
json.dump(cfg, open(p, "w"), indent=2, ensure_ascii=False)
print(f"Avain lisätty palvelimelle '{name}'. Käynnistä Claude-sovellus uudelleen.")
PY
