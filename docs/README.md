# Documentation Guide

This repository contains both current reference documentation and historical planning / audit documents.

## Current Reference

Use these files for the current implementation state:

- `README.md` - getting started, configuration, endpoint overview, runtime notes
- `docs/swagger.yaml` - API schema
- `docs/API_1.1_SECURITY.md` - DeviceKey, ACL, slogan and requester-authentication behavior
- `docs/MIGRATION_REQUESTMIATARUDEVICEID.md` - migration notes for `RequestMiataruDeviceID`
- `docs/PRACTICAL_API_1.1_EXAMPLES.md` - end-to-end request examples
- `docs/DELETE_LOCATION_API.md` - DeleteLocation behavior and examples
- `docs/COMPATIBILITY_ASSESSMENT.md` - compatibility expectations for API 1.0/1.1 clients
- `docs/TECHNICAL_SPECIFICATION.md` - code-oriented implementation overview

## Historical Context

These files are kept as project history and design context. They are useful, but they are not the primary source of truth for the live implementation:

- `docs/INTENT_AND_PROBLEM_RECONSTRUCTION.md`
- `docs/PRD.md`
- `docs/REIMPLEMENTATION_ROADMAP_AND_EVOLUTION.md`
- `docs/DECISION_LOG.md`
- `docs/COMPLETENESS_AUDIT.md`
- `docs/SECURITY_REVIEW.md`
- `docs/RELEASE_NOTES_V2.md`
- `docs/WHATS_NEW_V2.md`

When a historical document disagrees with the code, prefer `README.md`, `docs/swagger.yaml`, and the implementation under `lib/`.
