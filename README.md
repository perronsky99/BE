# Tirito App Backend v1.0

Backend real, simple y confiable para Tirito App.

## Stack

- Node.js (LTS)
- Express
- MongoDB + Mongoose
- JWT (Bearer)
- bcrypt
- multer (uploads)

## Instalación

```bash
cd BE
npm install
```

## Configuración

Crear archivo `.env` basado en `.env.example`:

```bash
cp .env.example .env
```

Variables de entorno:

```
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/tirito-app
JWT_SECRET=tu_clave_secreta_muy_segura_aqui
JWT_EXPIRES_IN=7d
UPLOAD_PATH=uploads
MAX_FILE_SIZE=5242880
```

## Ejecutar

```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## Endpoints

### Auth
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión

### Users (requiere auth)
- `GET /api/users/me` - Obtener mi perfil
- `PATCH /api/users/me` - Actualizar mi perfil

### Tiritos
- `GET /api/tiritos` - Listar tiritos abiertos (público)
- `GET /api/tiritos/my` - Mis tiritos (auth)
- `GET /api/tiritos/:id` - Detalle de tirito (auth)
- `POST /api/tiritos` - Crear tirito (auth, max 1 activo)
- `PATCH /api/tiritos/:id/status` - Actualizar status (auth, solo owner)

### Chats (requiere auth)
- `GET /api/chats` - Mis chats
- `GET /api/chats/:tiritoId` - Obtener chat de un tirito
- `POST /api/chats/:tiritoId/message` - Enviar mensaje

### Health
- `GET /api/health` - Estado del servidor

## Reglas de Negocio

1. **Límite de tiritos**: Cada usuario puede tener máximo 1 tirito activo (open o in_progress)
2. **Ownership**: Solo el creador puede cambiar el status de su tirito
3. **Imágenes**: Máximo 5 imágenes por tirito, 5MB cada una

## Estructura

```
src/
  config/
    env.js
    db.js
  models/
    User.js
    Tirito.js
    Chat.js
    Message.js
  routes/
    auth.routes.js
    users.routes.js
    tiritos.routes.js
    chats.routes.js
  controllers/
    auth.controller.js
    users.controller.js
    tiritos.controller.js
    chats.controller.js
  middlewares/
    auth.middleware.js
    error.middleware.js
  utils/
    jwt.js
    upload.js
  app.js
  server.js
```
