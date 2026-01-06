# Notificaciones - Pruebas y Operación

Este documento resume cómo probar y operar el sistema de notificaciones en desarrollo.

Endpoints útiles:

- `POST /api/notifications/test/:userId` (autenticado): crea y emite una notificación de prueba al usuario.
- `GET /api/metrics` (público en dev): devuelve contadores básicos en JSON (`notifications_created`, `notifications_emitted`, ...).

Recomendaciones rápidas:

- Para probar realtime: abrir dos navegadores, loguear A y B. En A ejecutar `POST /api/notifications/test/<B_id>` con Authorization Bearer token de A. B debe recibir la notificación en tiempo real.
- Si la notificación aparece para A en lugar de B, comprobar que el `recipientId` se calcula correctamente en `BE/src/controllers/chats.controller.js`.

Seguridad básica:

- El socket valida JWT recibido en `handshake.auth.token`. El cliente debe conectar enviando `{ auth: { token } }`.
- El endpoint de prueba está protegido y limitado por `express-rate-limit`.
