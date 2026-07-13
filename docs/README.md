# Dokumentation — Bob ↔ Cursor ↔ IBM i

Diese Dokumentation beschreibt die Einrichtung und typische Workflows für:

- **Bob MCP Bridge** (dieses Projekt) — Cursor kann Aufgaben an IBM Bob delegieren
- **IBM i MCP Server** — Cursor kann direkt auf der Partition recherchieren (SQL, Metadaten, Security)

## Inhalte

| Datei | Thema |
|-------|--------|
| [einrichtung.md](einrichtung.md) | Installation, Cursor-MCP, Bob-Modi, API-Key |
| [ibm-i-mcp.md](ibm-i-mcp.md) | ibmi-mcp-Server, Toolsets, Lese-/Schreib-Rechte |
| [deployment-host.md](deployment-host.md) | Lokaler Betrieb auf <HOST> (Startskript, `.env`, YAML-Patches) |
| [beispiele.md](beispiele.md) | Praxis: Objekt-Recherche (`TASA001F01`), CSV-Erzeugung (`DDSHOPBES.CSV`) |

## Kurzüberblick

```
Cursor Agent
    ├─► ibm-bob (stdio) ──► bob CLI ──► IBM Bob Shell
    └─► ibmi-mcp (HTTP) ──► Mapepire/JDBC ──► IBM i (Db2 for i)
```

**Empfehlung:** Für IBM-i-Recherche **`ibmi-mcp`** direkt nutzen. Bob (`bob_prompt`) braucht separat konfigurierten Zugriff auf `ibmi-mcp`, falls Bob selbst MCP-Tools verwenden soll.
