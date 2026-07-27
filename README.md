# IBM Bob → Cursor MCP Bridge

MCP-Server, der [IBM Bob Shell](https://bob.ibm.com/docs/shell) als Tools für Cursor bereitstellt.

**Ausführliche Dokumentation:** [docs/README.md](docs/README.md) — Einrichtung, IBM-i-MCP-Integration, Beispiele (`TASA001F01`, `DDSHOPBES.CSV`).

## Voraussetzungen

- Node.js 18+
- Bob Shell (`bob --version`, aktuell 1.0.6 auf <HOST>)
- `BOBSHELL_API_KEY` für non-interactive Aufrufe

## Installation

```bash
git clone
cd ./bob-cursor-mcp
npm install
npm run build
```

## Cursor einrichten

Die Projekt-Konfiguration liegt in [`.cursor/mcp.json`](.cursor/mcp.json). Ergänzen Sie dort den API-Key:

```json
{
  "mcpServers": {
    "ibm-bob": {
      "command": "node",
      "args": ["./bob-cursor-mcp/dist/index.js"],
      "env": {
        "BOBSHELL_API_KEY": "<Ihr-Key>",
        "BOB_BIN": "~/.local/bin/bob"
      }
    }
  }
}
```

Danach in Cursor: **Settings → Tools & MCP** → Server `ibm-bob` aktivieren.

Alternativ können Sie `.env.example` nach `.env` kopieren und den Key dort setzen — für Cursor MCP muss der Key jedoch in `mcp.json` oder der globalen MCP-Konfiguration stehen.

## MCP-Tools

| Tool | Beschreibung |
|------|--------------|
| `bob_version` | Healthcheck: installierte Bob-Version |
| `bob_prompt` | Aufgabe an Bob delegieren (Modi: plan, code, advanced, ask) |
| `bob_list_sessions` | Bob-Sessions des Projekts auflisten |
| `bob_resume_session` | Session fortsetzen und Follow-up-Prompt senden |

`bob_prompt` und `bob_resume_session` nutzen standardmäßig den Modus **`advanced`** (MCP-Tools inkl. IBM i). Über `BOB_DEFAULT_CHAT_MODE` oder das Tool-Argument `mode` änderbar.

`bob_prompt` und `bob_resume_session` nutzen `--approval-mode=auto_edit`: Datei-Edits werden automatisch genehmigt, Shell-Befehle weiterhin von Bob bestätigt.

## Beispiel (Agent-Chat)

> Nutze `bob_version`, dann `bob_prompt` im Modus `ask`: Was ist 2+2?

## Umgebungsvariablen

| Variable | Default | Beschreibung |
|----------|---------|--------------|
| `BOBSHELL_API_KEY` | — | Pflicht für Prompt/Resume |
| `BOB_BIN` | `bob` | Pfad zur Bob-CLI |
| `BOB_DEFAULT_CHAT_MODE` | `advanced` | Standard-Modus für `bob_prompt` / `bob_resume_session` |
| `BOB_DEFAULT_WORKSPACE` | Cursor-Projekt / `cwd` | Standard-Arbeitsverzeichnis |
| `BOB_TIMEOUT_MS` | `600000` | Timeout pro Bob-Aufruf |

## Smoke-Test

```bash
npm run build
node scripts/smoke-test.mjs
```

## Architektur

Cursor Agent → MCP (stdio) → dieser Server → `bob` CLI → IBM Bob Shell

Bob bleibt MCP-**Client**; dieser Server ist die Brücke in die andere Richtung (Cursor → Bob).
