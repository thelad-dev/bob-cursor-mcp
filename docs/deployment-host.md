# ibmi-mcp auf <HOST> betreiben

Betriebsanleitung für den **IBM i MCP Server** auf `<HOST>` (HTTP Port 3010). Der Server selbst ist das upstream-Projekt [IBM/ibmi-mcp-server](https://github.com/IBM/ibmi-mcp-server) — diese Doku beschreibt nur die **lokale Installation und Anpassungen** auf der Maschine.

## Schnellstart

```bash
cd /home/<USER>/ibmi-mcp-server
screen -dmS ibmi-mcp ./start-http.sh
```

Healthcheck:

```bash
curl -s -X POST http://127.0.0.1:3010/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  | python3 -c "
import sys, json
for line in sys.stdin:
    if line.strip().startswith('data:'):
        d = json.loads(line.strip()[5:])
        tools = d['result']['tools']
        print('Tools:', len(tools))
        write = [t['name'] for t in tools if t.get('annotations',{}).get('readOnlyHint') is False]
        print('Schreib-Tools:', write)
"
```

Erwartung: **79 Tools**, **2 Schreib-Tools**.

## Dateien auf <HOST>

| Datei | Zweck |
|-------|--------|
| `/home/<USER>/ibmi-mcp-server/.env` | Partition-Zugang, Toolset-Flags (**nicht versionieren**) |
| `/home/<USER>/ibmi-mcp-server/start-http.sh` | Startskript (lokal anlegen, siehe unten) |
| `tools/**/*.yaml` im IBM-Clone | ggf. lokale Patches (siehe YAML-Anpassungen) |

Vorlage für das Startskript: [../scripts/start-ibmi-mcp-http.sh.example](../scripts/start-ibmi-mcp-http.sh.example)

## `.env` (Auszug)

In `/home/<USER>/ibmi-mcp-server/.env` ergänzen:

```bash
TOOLS_YAML_PATH=/home/<USER>/ibmi-mcp-server/tools
IBMI_ENABLE_DEFAULT_TOOLS=true
IBMI_ENABLE_EXECUTE_SQL=true
IBMI_EXECUTE_SQL_READONLY=true
# SELECTED_TOOLSETS=   # leer = alle Toolsets
```

## `start-http.sh` anlegen

```bash
cp /home/<USER>/path/to/bob-cursor-mcp/scripts/start-ibmi-mcp-http.sh.example \
   /home/<USER>/ibmi-mcp-server/start-http.sh
chmod +x /home/<USER>/ibmi-mcp-server/start-http.sh
```

Inhalt:

```bash
#!/usr/bin/env bash
set -euo pipefail
cd /home/<USER>/ibmi-mcp-server
set -a
source .env
set +a
exec npx -y @ibm/ibmi-mcp-server@latest \
  --transport http \
  --tools "${TOOLS_YAML_PATH:-/home/<USER>/ibmi-mcp-server/tools}" \
  --builtin-tools \
  --execute-sql
```

## Lokale YAML-Patches (IBM-Clone)

Diese Änderungen liegen **nur auf der Maschine** — nicht ins IBM-upstream-Repo committen.

### `tools/developer/text2sql.yaml`

- `list_tables_in_schema` und `validate_query` auf **`enabled: false`**
- Grund: identische Namen wie Built-in-Tools → Server meldet „already registered“ und bricht ab

### `tools/sys-admin/sys-admin.yaml`

- `describe_object` bleibt **`enabled: false`**
- Grund: `CALL QSYS2.GENERATE_SQL` scheitert am ReadOnly-Validator; gesamtes sys-admin-YAML lädt nicht
- Alternative: Built-in **`describe_sql_object`**

### `tools/security/security-ops.yaml`

- `repopulate_special_authority_detail`: zusätzlich **`destructiveHint: true`**
- Cursor zeigt damit zuverlässig einen Bestätigungsdialog

## Lese- vs. Schreib-Tools

| `readOnlyHint` | Anzahl | Cursor |
|----------------|--------|--------|
| `true` | 77 | Auto-Ausführung |
| `false` | 2 | Bestätigung |

Schreib-Tools: `repopulate_special_authority_detail`, `execute_impersonation_lockdown`.

`execute_sql`: nur SELECT (`IBMI_EXECUTE_SQL_READONLY=true`), `readOnlyHint: true`.

## Cursor-Anbindung

In `~/.cursor/mcp.json`:

```json
"ibmi-mcp": {
  "url": "http://127.0.0.1:3010/mcp"
}
```

Remote: `http://<HOST>.<DOMAIN>:3010/mcp`

## Screen-Session

```bash
screen -ls
screen -r ibmi-mcp      # anhängen
# Detach: Ctrl+A, D
screen -S ibmi-mcp -X quit   # beenden
```

## Server neu starten

```bash
screen -S ibmi-mcp -X quit 2>/dev/null || true
screen -dmS ibmi-mcp /home/<USER>/ibmi-mcp-server/start-http.sh
```

## Typische Fehler

| Fehler | Ursache | Fix |
|--------|---------|-----|
| `Tool … is already registered` | YAML + Built-in Duplikat | Tool in YAML deaktivieren |
| `security violation` beim Laden sys-admin | `describe_object` mit CALL | `enabled: false`, `describe_sql_object` nutzen |
| `execute_sql` fehlt | Flags fehlen | `.env` + `--execute-sql` |
| MCP-Timeout | `*ALLUSR` / große Scans | Bibliothek eingrenzen |

Weitere Tool-Beschreibung: [ibm-i-mcp.md](ibm-i-mcp.md)
