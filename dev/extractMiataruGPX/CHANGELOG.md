# Changelog

Dieses Projekt verwendet ein einfaches, versionsbasiertes Änderungsprotokoll.

## [0.1.0] - 2026-03-03

### Added

- Python-CLI `extract_miataru_gpx.py` zum Abruf von Miataru `GetLocationHistory` und Export in GPX 1.1.
- Optionale Zeitfilter `--start` und `--end` im Format `YYYY-MM-DD HH:MM[:SS]` (lokale Zeit, inklusiver Filter).
- Robuste Fehlerbehandlung mit Exit-Codes für Input-, API-, Datei- und Datenfehler.
- Lokale Testsuite:
  - `tests/test_unit.py` für reine Funktionslogik ohne Netzwerk.
  - `tests/test_cli_local.py` für CLI-Fehlerpfade via Mocks.
- Live-Server-Loop-Tests in `tests/test_live_server_loop.py` (aktivierbar mit `LIVE_MIATARU_TESTS=1`) gegen das Demo-Device.
- README-Dokumentation mit Nutzung, Datums-/Zeitzonen-Semantik und Testausführung.
- Debug-Optionen `--debug` und `--debug-response` fuer detaillierte API-Diagnose.
- Erweiterte Dokumentation zu Timestamp-Interpretation (Sekunden/Millisekunden) und `Wrote 0 points`-Troubleshooting.
