# Tirito App — Backend

Backend Node/Express para Tirito App. Incluye autenticación JWT, APIs REST para `tiritos`, `chats`, `users`, notificaciones y soporte básico para conexiones realtime vía `socket.io`.

## Resumen rápido

- API base por defecto: `http://localhost:3000/api`
- Socket server integrado en el mismo puerto; el cliente debe enviar el JWT en el handshake (`auth.token`).
- Métricas básicas disponibles en `GET /api/metrics`.

- Historial de cambios: ver `CHANGELOG.md` en la raíz del backend para el registro de versiones y notas de lanzamiento.

## Requisitos

- Node.js (>=16)
- npm
- MongoDB (local o remoto)

## Instalación

```bash
cd BE
npm install
```

## Configuración

Copia el ejemplo y ajusta las variables en `.env`:

```bash
cp .env.example .env
```

Variables relevantes:

```
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/tirito-app
JWT_SECRET=tu_clave_secreta
JWT_EXPIRES_IN=7d
UPLOAD_PATH=uploads
MAX_FILE_SIZE=5242880
```

## Ejecutar

```bash
# Desarrollo (con nodemon si está configurado)
npm run dev

# Producción
npm start
```

## Endpoints principales

- `POST /api/auth/register` — Registrar usuario
- `POST /api/auth/login` — Login (devuelve JWT)
- `GET /api/users/me` — Obtener perfil (auth)
- `GET /api/tiritos` — Listar tiritos públicos
- `POST /api/tiritos` — Crear tirito (auth)
- `GET /api/chats` — Listar chats del usuario (auth)
- `POST /api/chats/:tiritoId/message` — Enviar mensaje al chat (auth)
- `GET /api/notifications` — Obtener notificaciones del usuario (auth)
- `POST /api/notifications/test/:userId` — Endpoint de prueba para crear+emitir notificación (auth, rate-limited)
- `GET /api/metrics` — Métricas en memoria (dev)
- `GET /api/health` — Health check

## Realtime (socket.io)

- Handshake: el cliente debe enviar `{ auth: { token: '<JWT>' } }` al conectar.
- El servidor valida el JWT y, si es válido, une la conexión a la sala `user_<userId>` para entregas dirigidas.
- Formato de sala: `user_<_id_del_usuario>`.

## Scripts útiles

- `src/scripts/find-orphan-tiritos.js` — detectar tiritos cuyo creador ya no existe.

Ejecutar:

```bash
node src/scripts/find-orphan-tiritos.js
```

## Archivos de uploads

- Carpeta por defecto: `uploads/` (configurable con `UPLOAD_PATH`).

## Logs y métricas

- El proyecto incluye un logger ligero que escribe JSON a stdout. Para producción recomiendado integrar `winston` o similar con rotación.
- Métricas básicas disponibles en `GET /api/metrics` (no persistentes).

## Seguridad y límites

- Se aplica rate-limiting a endpoints sensibles (envío de mensajes, endpoint de prueba de notificaciones).
- JWT necesario para acciones privadas y para registrar sockets.

## Desarrollo y pruebas

- Levantar MongoDB localmente o usar una URI remota en `MONGODB_URI`.
- Usar `POST /api/notifications/test/:userId` para generar notificaciones de prueba hacia un usuario (requiere auth).

## Contribuir

- Fork → rama `feature/xxx` → PR. Mantén los cambios limitados y documenta las nuevas APIs.

---
Este README está enfocado a desarrolladores que trabajan con el backend; la información genérica o los recursos del template original han sido eliminados.
