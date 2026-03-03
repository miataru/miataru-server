# extractMiataruGPX

CLI-Tool zum Abruf der Miataru Location History und Export als GPX-Track.

## Voraussetzungen

- Python 3.9 oder neuer
- Netzwerkzugriff auf `https://service.miataru.com`

## Verwendung

```bash
python3 extract_miataru_gpx.py <own_device_id> <own_device_key> <target_device_id> <outputfile> [--start "YYYY-MM-DD HH:MM[:SS]"] [--end "YYYY-MM-DD HH:MM[:SS]"]
```

### Pflichtparameter

1. `own_device_id` - Requester Device ID (`RequestMiataruDeviceID`)
2. `own_device_key` - Requester Device Key (kann leer sein)
3. `target_device_id` - Zielgerät, dessen History abgerufen wird
4. `outputfile` - Zielpfad der GPX-Datei

### Optionale Zeitfilter

- `--start "YYYY-MM-DD HH:MM[:SS]"`
- `--end "YYYY-MM-DD HH:MM[:SS]"`

Semantik:

- Eingabe wird als lokale Systemzeit interpretiert.
- Filter ist inklusiv: `start <= point_time <= end`.
- Ausgabezeit in GPX ist immer UTC (`...Z`).

### Timestamp-Interpretation (Miataru -> GPX)

- Miataru liefert `Timestamp` als Unix-Zeit.
- Dieses Tool interpretiert standardmäßig 10-stellige Werte als Sekunden.
- Falls ein Timestamp sehr groß ist (`>= 1e12`), wird er als Millisekunden behandelt.
- Dadurch werden sowohl Sekunden- als auch Millisekunden-Payloads korrekt verarbeitet.

### Beispielaufrufe

```bash
python3 extract_miataru_gpx.py webclient "" BF0160F5-4138-402C-A5F0-DEB1AA1F4216 output.gpx
```

```bash
python3 extract_miataru_gpx.py webclient "" BF0160F5-4138-402C-A5F0-DEB1AA1F4216 output.gpx --start "2026-03-01 00:00:00" --end "2026-03-02 00:00:00"
```

### Debug-Optionen

- `--debug` zeigt Request-/Response-Zusammenfassung, Server-Config-Werte und Punktestatistiken.
- `--debug-response` zeigt zusaetzlich die komplette rohe JSON-Antwort (impliziert `--debug`).

## Troubleshooting

### `Wrote 0 points ...`

Das bedeutet nicht automatisch einen Fehler. Typische Ursachen:

1. Der Server liefert fuer das Zielgeraet aktuell keine nutzbare History.
2. Zugriff ist durch `allowedDevices`-Regeln eingeschraenkt, sodass History leer bleibt.
3. Das Zeitfenster (`--start/--end`) schneidet alle Punkte weg.

Diagnosekommando:

```bash
python3 extract_miataru_gpx.py "webclient" "" "BF0160F5-4138-402C-A5F0-DEB1AA1F4216" output.gpx --debug
```

Wichtige Debug-Felder:

- `AvailableDeviceLocationUpdates` zeigt, ob der Server History kennt.
- `points received` vs `points after filter` zeigt, ob der Filter alles entfernt.
- `data time range (UTC)` zeigt den echten Zeitbereich der gelieferten Daten.

## Exit Codes

- `0` Erfolg
- `2` Eingabe-/Argumentfehler
- `3` API-/HTTP-/Netzwerkfehler
- `4` Datei-/I/O-Fehler
- `5` Daten-/unerwarteter Fehler

## Tests

Lokale Tests (ohne Netz, deterministisch):

```bash
python3 -m unittest
```

Live-Tests gegen echten Miataru-Server:

```bash
LIVE_MIATARU_TESTS=1 python3 -m unittest tests/test_live_server_loop.py
```

Optional kann die Anzahl der Live-Loop-Durchläufe gesetzt werden (Standard `3`):

```bash
LIVE_MIATARU_TESTS=1 MIATARU_LIVE_LOOPS=5 python3 -m unittest tests/test_live_server_loop.py
```

Die Live-Tests verwenden diese festen Werte:

- `own_device_id = "webclient"`
- `own_device_key = ""`
- `target_device_id = "BF0160F5-4138-402C-A5F0-DEB1AA1F4216"`

Hinweis:

- Live-Ergebnisse sind datenabhängig (History kann sich ändern).
- Es wird daher primär End-to-End-Funktion und GPX-Struktur validiert, nicht eine feste Punktanzahl (außer Zukunftsfilter-Test auf 0 Punkte).

## Sicherheit

- Device Keys nicht in Shell-History oder Logs weitergeben.
