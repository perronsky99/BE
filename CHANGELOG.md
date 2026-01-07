# CHANGELOG

All notable changes to this project will be documented in this file.

The format is based on "Keep a Changelog" and [Semantic Versioning](https://semver.org/).

## [Unreleased]

- (pendiente) Preparar v0.1.1: agregar pruebas E2E para notificaciones y ajustes menores.

## [0.1.0] - 2026-01-06

### Added
- Sistema de notificaciones: modelo `Notification`, controller y rutas (`POST /api/notifications/test/:userId` para pruebas).
- Integración realtime con `socket.io` y validación JWT en handshake; sockets se unen a salas `user_<userId>`.
- Endpoint `/api/metrics` con métricas en memoria (dev).
- Script de mantenimiento `src/scripts/find-orphan-tiritos.js`.
- Rate-limiting aplicado a endpoints sensibles (mensajes, endpoint de prueba).

### Changed
- `README.md` limpiado y enfocado al desarrollo (eliminados contenidos del template externo).

### Notes
- Logger ligero (JSON stdout) incluido; para producción se recomienda migrar a `winston` o solución de logging con rotación.

---

This file is sourced from `BE/CHANGES.md` and edited into a changelog format. Maintain entries under `Unreleased` for ongoing work, and bump versions when releasing.
