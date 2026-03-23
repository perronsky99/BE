# Notificaciones - Tirito App Backend

## Sistema de Notificaciones

### Modelo
Notificaciones se almacenan en MongoDB con TTL de 90 dias (auto-eliminacion).

Tipos soportados:
- `chat_new` - Nuevo chat creado
- `chat_message` - Nuevo mensaje en chat existente
- `tirito_status` - Cambio de estado de tirito
- `tirito_request` - Nueva solicitud de tirito
- `request_accepted` - Solicitud aceptada
- `request_rejected` - Solicitud rechazada
- `rating_request` - Solicitud de calificacion
- `system` - Notificacion del sistema

### Endpoints
- `GET /api/notifications` - Listar notificaciones (auth, query: unreadOnly, limit, skip)
- `GET /api/notifications/unread-count` - Contador no leidas (auth)
- `PUT /api/notifications/:id/read` - Marcar como leida (auth)
- `PUT /api/notifications/read-all` - Marcar todas como leidas (auth)
- `DELETE /api/notifications/:id` - Eliminar (auth)
- `POST /api/notifications/test/:userId` - Crear de prueba (auth, rate limit: 6/min)

### Realtime (Socket.IO)
- Conexion: `io(url, { auth: { token: JWT } })`
- Sala: `user_<userId>`
- Evento: `notification` - emitido cuando se crea notificacion

### Pruebas
1. Abrir dos navegadores, login como A y B
2. Desde A: `POST /api/notifications/test/<B_id>` con Bearer token de A
3. B debe recibir la notificacion en tiempo real

### Chat messages via socket
- Evento: `chat_message` - emitido a participantes del chat
- Payload: `{ chatId, tiritoId, message }`
