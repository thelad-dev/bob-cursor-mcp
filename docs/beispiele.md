# Beispiele: Recherche ueber ibmi-mcp

Zwei typische Fragen, die nur ueber MCP (ohne lokale Workspace-Quellen) beantwortet wurden. Objekt- und Bibliotheksnamen sind Platzhalter.

---

## 1. Was ist `TASA001F01`?

### Frage

> Woher stammt `TASA001F01` und was macht es?

### Ergebnis (via `execute_sql` / `OBJECT_STATISTICS` / `PROGRAM_INFO`)

**`TASA001F01` existiert nicht als eigenstaendiges IBM-i-Objekt** in den Bibliotheken `<LIBRARY>`, `<LIBRARY2>`, `<LIBRARY3>`, `<SOURCE-LIB1>`, `<SOURCE-LIB2>`, `<SOURCE-LIB3>`.

Es ist **kein** Db2-Objekt in `QSYS2.SYSTABLES` (keine Tabelle, kein View).

### Zugehoerige Objekte (Modul **TAS** = Auftragswesen)

| Objekt | Typ | Bibliothek | Beschreibung / Quelle |
|--------|-----|------------|------------------------|
| **TASA001** | `*PGM` (RPGLE) | `<LIBRARY>` | „Auftragserfassung Uebersicht Auftraege“ |
| **TASA001CL** | `*PGM` (CLP) | `<LIBRARY>` | „Auftragserfassung“ - Quelle: `<SOURCE-LIB3>/QCLPSRC/TASA001CL` |
| **TASA001FM** | `*FILE` (DSPF) | `<LIBRARY>` | Display-Datei - Quelle: `<SOURCE-LIB1>/QRPGLESRC/TASA001FM` |

### Einordnung des Namens `TASA001F01`

Namenskonvention im Auftragswesen-Umfeld:

| Teil | Bedeutung |
|------|-----------|
| **TAS** | Modul Auftragswesen |
| **A001** | Maske / Dialog 001 |
| **F01** | **Record Format F01** (Satzformat einer Display-Datei) |

**`TASA001F01`** ist daher sehr wahrscheinlich **kein 10-stelliger Objektname**, sondern die **sprechende Kurzbezeichnung** fuer:

> **Satzformat F01 der Auftragsmaske TASA001** (Display-Datei `TASA001FM`, Programm `TASA001`).

Funktion: **UI-Layout / Bildschirm fuer die Auftragsuebersicht bzw. Auftragserfassung**, im Zusammenhang mit den Auftragsdaten in `QS36F.TASAA` (Kopf) und `QS36F.TASAF` (Positionen).

### Hilfreiche MCP-Abfragen

Objekte in `<LIBRARY>`:

```sql
SELECT OBJNAME, OBJTYPE, OBJATTRIBUTE, TEXT,
       SOURCE_FILE, SOURCE_LIBRARY, SOURCE_MEMBER
FROM TABLE(QSYS2.OBJECT_STATISTICS('<LIBRARY>', '*ALL'))
WHERE OBJNAME LIKE 'TASA001%'
```

Programm-Metadaten:

```sql
SELECT PROGRAM_LIBRARY, PROGRAM_NAME, PROGRAM_TYPE,
       TEXT_DESCRIPTION, PROGRAM_ATTRIBUTE
FROM QSYS2.PROGRAM_INFO
WHERE PROGRAM_NAME LIKE 'TASA001%'
```

### Grenze

Den **genauen DDS-Inhalt von Format F01** (Felder, Positionen) liefert SQL allein nicht zuverlaessig - dafuer brauchte man Quell-Lesezugriff auf `<SOURCE-LIB1>/QRPGLESRC/TASA001FM` (PDM, RDi, oder IFS-Export). Ueber MCP war die **Objekt- und Modul-Zuordnung** aber eindeutig.

---

## 2. Wie entsteht `DDSHOPBES.CSV`?

*(Aus frueherer MCP-Recherche - Orchestrator auf der Partition)*

| Schritt | Komponente |
|---------|------------|
| Steuerung | `<LIBRARY>/<EXPORT-PGM>` (Stunden-Loop: `<EXPORT-LOOP>`) |
| Zwischenschritte | `UPDZLVSBA` → `UDSHOPBES` → `STRS36PRC PRC(<EXPORT-STEP>)` → `UPDZLVSBAN` |
| Export | `CPYTOIMPF` aus `QS36F/DDSHOPBES` |
| Ziel (IFS) | `/home/<IFS-USER>/SHOP/DDSHOPBES.csv` |

Relevante CL-Quelle auf der Partition: `<LIBRARY>/QCLSRC/<EXPORT-PGM>`.

---

## Workflow-Empfehlung fuer Agenten

1. **Zuerst** `list_tables_in_schema` / `describe_sql_object` - ist es ein SQL-Objekt?
2. **Wenn nein:** `execute_sql` mit `QSYS2.OBJECT_STATISTICS('<Bibliothek>', '*ALL')`
3. **Programme:** `QSYS2.PROGRAM_INFO`
4. **Abhaengigkeiten:** `find_dependent_objects`
5. **Service-Hilfe:** `search_examples_for_keyword` / `where_is_service`
6. Bibliotheken **gezielt** waehlen - `*ALLUSR` vermeiden (Timeout)
