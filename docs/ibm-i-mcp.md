# IBM i MCP Server — Einrichtung und Nutzung

Der **IBM i MCP Server** (`ibmi-mcp`) stellt Cursor direkten Zugriff auf die Partition bereit: SQL, Schema-Discovery, System-Services, Security-Analysen usw.

## Architektur (<HOST>)

```
Cursor (ibmi-mcp, HTTP)
    → http://127.0.0.1:3010/mcp   (lokal)
    → http://<HOST>.<DOMAIN>:3010/mcp   (Remote)
        → @ibm/ibmi-mcp-server
        → Mapepire / JDBC
        → IBM i Partition (z. B. <PARTITION>)
```

Server läuft typischerweise in einer **GNU screen**-Session:

```bash
screen -ls          # Session „ibmi-mcp“
screen -r ibmi-mcp  # anhängen
```

Start und lokale Patches: [deployment-host.md](deployment-host.md)

## Cursor einbinden

In `~/.cursor/mcp.json` (global) oder projektbezogen:

```json
{
  "mcpServers": {
    "ibmi-mcp": {
      "url": "http://127.0.0.1:3010/mcp"
    }
  }
}
```

## Konfiguration (`.env`)

Wichtige Variablen in `/home/<USER>/ibmi-mcp-server/.env`:

```bash
TOOLS_YAML_PATH=/home/<USER>/ibmi-mcp-server/tools

# Alle YAML-Toolsets laden (SELECTED_TOOLSETS leer lassen)
IBMI_ENABLE_DEFAULT_TOOLS=true
IBMI_ENABLE_EXECUTE_SQL=true

# execute_sql nur SELECT — serverseitig blockiert, readOnlyHint=true
IBMI_EXECUTE_SQL_READONLY=true
```

**`.env` nicht committen** — enthält Zugangsdaten zur Partition.

## Toolsets (Stand: 79 Tools)

| Gruppe | Beispiele |
|--------|-----------|
| Built-ins | `execute_sql`, `list_schemas`, `list_tables_in_schema`, `get_table_columns`, `describe_sql_object`, `validate_query` |
| Developer | `sample_rows`, `get_table_statistics`, `find_dependent_objects` |
| Sysadmin | `search_services_by_name`, `where_is_service`, `search_examples_for_keyword` |
| Performance | `system_status`, `active_job_info`, `memory_pools` |
| Security | Library-List-Analysen, Impersonation-Checks |
| PTF | `check_ptf_currency`, `summarize_ptf_status` |

Alle 17 YAML-Toolsets unter `tools/` werden geladen, wenn `SELECTED_TOOLSETS` nicht gesetzt ist.

## Lese- vs. Schreib-Tools (Cursor-Bestätigung)

Cursor nutzt **`readOnlyHint`** aus den Tool-Metadaten:

| Kategorie | Anzahl | Verhalten in Cursor |
|-----------|--------|---------------------|
| Lesend (`readOnlyHint: true`) | 77 | Auto-Ausführung, keine Bestätigung |
| Schreibend (`readOnlyHint: false`) | 2 | Bestätigung erforderlich |

Schreib-Tools:

- `repopulate_special_authority_detail`
- `execute_impersonation_lockdown`

`execute_sql` ist **read-only** konfiguriert (`IBMI_EXECUTE_SQL_READONLY=true`) — nur `SELECT`-Abfragen.

## Wichtige MCP-Tools für Recherche

| Aufgabe | Tool |
|---------|------|
| Freies SQL (SELECT) | `execute_sql` |
| Tabellen in Bibliothek finden | `list_tables_in_schema` |
| Spalten einer Tabelle | `get_table_columns` |
| DDL einer SQL-Objekts | `describe_sql_object` |
| Abhängigkeiten einer Datei | `find_dependent_objects` |
| IBM-i-Service-Beispiele | `search_examples_for_keyword` |
| Systemstatus | `system_status` |

### Beispiel: Objekt in <LIBRARY> suchen

```sql
SELECT OBJNAME, OBJTYPE, OBJATTRIBUTE, TEXT,
       SOURCE_FILE, SOURCE_LIBRARY, SOURCE_MEMBER
FROM TABLE(QSYS2.OBJECT_STATISTICS('<LIBRARY>', '*ALL'))
WHERE OBJNAME LIKE 'TASA001%'
FETCH FIRST 20 ROWS ONLY
```

**Tipp:** `OBJECT_STATISTICS('*ALLUSR', …)` kann timeouten — lieber gezielt Bibliotheken (`<LIBRARY>`, `<LIBRARY2>`, `<LIBRARY3>`, `QS36F`) abfragen.

### PROGRAM_INFO — gültige Spalten

Auf dieser Partition u. a.:

- `PROGRAM_LIBRARY`, `PROGRAM_NAME`, `PROGRAM_TYPE`
- `TEXT_DESCRIPTION`, `PROGRAM_ATTRIBUTE`

Nicht vorhanden: `PROGRAM_TEXT`, `SOURCE_MEMBER` (Spalten variieren je nach IBM-i-Version).

## Fehlerbehebung

| Symptom | Lösung |
|---------|--------|
| Server startet nicht / 500 bei `tools/list` | YAML-Duplikate prüfen (Built-ins vs. YAML) |
| `execute_sql` fehlt | `--execute-sql` in `start-http.sh`, `IBMI_ENABLE_EXECUTE_SQL=true` |
| Tool bricht mit SQL0206 ab | Spaltenname falsch — `SYSCOLUMNS` für View prüfen |
| Abfrage timeout | Bibliothek eingrenzen, `FETCH FIRST n ROWS ONLY` |
| Bob findet ibmi-mcp nicht | Bob-seitig `bob mcp add …` (siehe [einrichtung.md](einrichtung.md)) |
| Start, `.env`, YAML-Patches | [deployment-host.md](deployment-host.md) |
