# Einrichtung: Bob MCP Bridge in Cursor

## Was ist das?

Dieses Projekt ist ein **MCP-Server (stdio)**, der die IBM-Bob-Shell als Tools in Cursor verfügbar macht. Cursor-Agenten können damit Aufgaben an Bob delegieren, ohne Bob manuell im Terminal zu starten.

## Voraussetzungen

| Komponente | Prüfung |
|------------|---------|
| Node.js 18+ | `node --version` |
| Bob Shell | `bob --version` (z. B. 1.0.6) |
| API-Key | `BOBSHELL_API_KEY` in der MCP-Konfiguration |

## Build

Projektordner (<HOST>, Netzlaufwerk):

`/home/<USER>/path/to/bob-cursor-mcp`

Auf **<DEV-HOST>** heißt derselbe Ordner:

`/home/<USER>/Workspaces/bob-cursor-mcp`

```bash
cd /home/<USER>/path/to/bob-cursor-mcp
npm install
npm run build
```

Smoke-Test:

```bash
node scripts/smoke-test.mjs
```

## Cursor MCP konfigurieren

Projektdatei: `.cursor/mcp.json` (API-Key **nicht** ins Git committen).

```json
{
  "mcpServers": {
    "ibm-bob": {
      "command": "node",
      "args": ["/home/<USER>/path/to/bob-cursor-mcp/dist/index.js"],
      "env": {
        "BOBSHELL_API_KEY": "<Ihr-Key>",
        "BOB_BIN": "/home/<USER>/.local/bin/bob",
        "BOB_DEFAULT_CHAT_MODE": "advanced"
      }
    }
  }
}
```

Danach: **Cursor → Settings → Tools & MCP** → Server `ibm-bob` aktivieren.

## Verfügbare MCP-Tools

| Tool | Funktion |
|------|----------|
| `bob_version` | Healthcheck (Bob-Version) |
| `bob_prompt` | Aufgabe an Bob senden |
| `bob_list_sessions` | Sessions im Projekt auflisten |
| `bob_resume_session` | Session fortsetzen |

### Modi für `bob_prompt`

| Modus | Typischer Einsatz |
|-------|-------------------|
| `ask` | Reine Fragen, keine Code-Änderungen |
| `plan` | Planung vor Implementierung |
| `code` | Code schreiben/ändern |
| **`advanced`** | **Standard** — Bob darf MCP-Tools nutzen (wenn in Bob konfiguriert) |

Standardmodus: **`advanced`** (über `BOB_DEFAULT_CHAT_MODE` oder Tool-Argument `mode`).

### Genehmigungen

Bob läuft mit `--approval-mode=auto_edit`:

- **Datei-Edits** werden automatisch übernommen
- **Shell-Befehle** fragt Bob weiterhin ab

## Umgebungsvariablen

| Variable | Default | Bedeutung |
|----------|---------|-----------|
| `BOBSHELL_API_KEY` | — | Pflicht für Prompt/Resume |
| `BOB_BIN` | `bob` | Pfad zur Bob-CLI |
| `BOB_DEFAULT_CHAT_MODE` | `advanced` | Standard-Chat-Modus |
| `BOB_DEFAULT_WORKSPACE` | Projekt-`cwd` | Arbeitsverzeichnis für Bob |
| `BOB_TIMEOUT_MS` | `600000` | Timeout pro Aufruf (10 Min.) |

## Bob + IBM i MCP (optional)

Damit **`bob_prompt`** selbst auf IBM i zugreifen kann, muss Bob den ibmi-mcp-Server kennen — **unabhängig** von der Cursor-MCP-Konfiguration:

```bash
bob mcp add -s user -t http ibmi-mcp http://127.0.0.1:3010/mcp
```

In `~/.bob/settings.json` sollte `"currentMode": "advanced"` stehen.

Ohne diese Bob-seitige Konfiguration meldet Bob: *kein ibmi-mcp verfügbar* — Cursor kann `ibmi-mcp` trotzdem direkt nutzen (siehe [ibm-i-mcp.md](ibm-i-mcp.md)).

## Typischer Agent-Aufruf

> Nutze `bob_version`, dann `bob_prompt` im Modus `ask`: Erkläre kurz die Architektur dieses Projekts.

## Repository und Pfade

| Ort | Pfad |
|-----|------|
| GitHub | `git@github.com:thelad-dev/bob-cursor-mcp.git` |
| <DEV-HOST> (kanonisch) | `/home/<USER>/Workspaces/bob-cursor-mcp` |
| <HOST> (Netzlaufwerk) | `/home/<USER>/path/to/bob-cursor-mcp` |
| <HOST> (Arbeitskopie) | `/home/<USER>/workspaces/bob-cursor-mcp` — `git clone`/`pull`, falls das Netzlaufwerk veraltet wirkt |

Auf <HOST> zeigt der CIFS-Mount manchmal nur einen leeren Ordner — dann `git pull` in der Arbeitskopie unter `~/workspaces/bob-cursor-mcp` nutzen und Cursor dort öffnen.
