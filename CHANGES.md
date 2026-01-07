# CHANGES

Resumen de cambios importantes en el backend de Tirito App.

## 2026-01-06 — Limpieza y nuevas funcionalidades

- Limpiado `README.md` eliminando contenidos del template externo y dejándolo enfocado al desarrollo del backend.
- Añadido sistema de notificaciones:
  - Modelo `Notification` (schema en `src/models/`).
  - Controller y rutas en `src/controllers/notifications.controller.js` y `src/routes/notifications.routes.js`.
  - Endpoint de prueba: `POST /api/notifications/test/:userId` para crear y emitir notificaciones (protegido y rate-limited).
- Realtime/Socket:
  - Integración de `socket.io` en `src/utils/socket.js`.
  - Handshake JWT obligatorio: el servidor valida `auth.token` y une sockets a la sala `user_<userId>`.
- Harden de seguridad y límites:
  - Rate-limiting aplicado a endpoints sensibles (mensajes y endpoint de prueba).
  - Verificación JWT centralizada para rutas privadas y sockets.
- Observabilidad mínima:
  - Logger ligero (JSON) y métricas en memoria disponibles en `GET /api/metrics`.
- Herramientas de mantenimiento:
  - Script `src/scripts/find-orphan-tiritos.js` para localizar tiritos huérfanos.

---

Si necesitas que exporte esto a `CHANGELOG.md` con entrada por versión semántica o que añada más detalle (commits/PRs relacionados), dime cómo prefieres el formato y lo adapto.
