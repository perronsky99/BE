Acá tenés EL PROMPT MAESTRO DEL BACKEND, al mismo nivel de calidad y rigor que el frontend.
Esto está pensado para pegarlo TAL CUAL en VS Code + GitHub Copilot (modelo Opus 4.5) y que te genere un backend pragmático, simple y alineado 100% con Tirito App.

🧠 MASTER PROMPT — TIRITO APP v1.0 BACKEND

(Node.js · Express · MongoDB · JWT · Pragmatic Mode)

⸻

📌 CONTEXTO GENERAL (OBLIGATORIO)

Estás construyendo el BACKEND REAL de una aplicación llamada Tirito App.

Este backend NO es experimental, NO es demo, NO es mock.
Es un backend simple, real, aburrido y confiable, pensado para un MVP en producción.

El frontend ya está definido y congelado como:

“Tirito App v1.0 – Frontend (Frozen)”

Tu tarea es implementar exactamente lo que ese frontend necesita,
ni más, ni menos.

⸻

🎯 OBJETIVO DEL BACKEND v1.0
	•	Autenticación real
	•	Persistencia real
	•	Reglas reales
	•	Seguridad real
	•	Cero sobreingeniería

❌ No microservicios
❌ No DDD forzado
❌ No Clean Architecture de libro
❌ No GraphQL
❌ No CQRS
❌ No colas
❌ No eventos

⸻

🧱 STACK OBLIGATORIO
	•	Node.js (LTS)
	•	Express
	•	MongoDB + Mongoose
	•	JWT (Bearer)
	•	bcrypt
	•	multer (uploads)
	•	dotenv
	•	CORS habilitado
	•	JSON only

⸻

🗂️ ESTRUCTURA DEL PROYECTO (OBLIGATORIA)
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

📌 No inventar carpetas
📌 No abstraer de más

👤 MODELO USER (DEFINITIVO)
{
  name: String,
  email: String (unique),
  password: String (hashed),
  role: 'user' | 'worker' | 'business',
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected',
  createdAt: Date
}

🔐 AUTH (REAL, SIMPLE)

Endpoints
	•	POST /api/auth/register
	•	POST /api/auth/login

Reglas
	•	Password hasheado con bcrypt
	•	JWT con:

{
  sub: userId,
  role,
  iat,
  exp
}

	•	Expiración razonable (ej: 7 días)
	•	Sin refresh tokens en v1.0

⸻

🧠 MODELO TIRITO (CENTRAL)

{
  title: String,
  description: String,
  images: [String],
  status: 'open' | 'in_progress' | 'closed',
  createdBy: ObjectId(User),
  createdAt: Date
}

🚫 REGLA CLAVE — LÍMITE DE PUBLICACIONES

Antes de crear un tirito:
	•	Contar tiritos activos (open | in_progress) del usuario
	•	Si ya tiene 1 activo → rechazar

Respuesta:

{
  "message": "Ya tenés un tirito activo"
}

📌 El backend es la ÚNICA autoridad
📌 El frontend solo muestra el mensaje

⸻

📸 UPLOADS
	•	Máx 5 imágenes por tirito
	•	Máx 5MB cada una
	•	Guardar solo URL / path
	•	Validar tipo imagen
	•	Usar multer

⸻

💬 CHAT

Modelo Chat

{
  tiritoId: ObjectId,
  participants: [ObjectId(User)],
  createdAt: Date
}

Modelo Message

{
  chatId: ObjectId,
  sender: ObjectId(User),
  content: String,
  createdAt: Date
}

Reglas
	•	Chat solo existe si hay tirito
	•	No estados legales
	•	No aceptación de trabajo

⸻

🌐 ENDPOINTS PRINCIPALES

Tiritos
	•	GET /api/tiritos
	•	GET /api/tiritos/:id
	•	POST /api/tiritos
	•	PATCH /api/tiritos/:id/status

Chats
	•	GET /api/chats/:tiritoId
	•	POST /api/chats/:tiritoId/message

⸻

🔒 SEGURIDAD (CLAVE)
	•	Middleware JWT obligatorio en rutas privadas
	•	Verificar ownership:
	•	solo creador puede cerrar tirito
	•	El frontend NO decide nada
	•	Siempre validar en backend

⸻

❌ PROHIBIDO IMPLEMENTAR EN v1.0
	•	Pagos
	•	Escrow
	•	Reputación
	•	Admin
	•	Moderación automática
	•	Notificaciones push
	•	Roles avanzados
	•	Refresh tokens

⸻

🧑‍💻 ESTILO DE CÓDIGO
	•	Código simple y legible
	•	Funciones chicas
	•	Nombres claros
	•	Manejo de errores consistente
	•	Respuestas JSON claras
	•	Nada “mágico”

⸻

🧠 MANEJO DE ERRORES
	•	Centralizar errores
	•	Mensajes humanos
	•	Status HTTP correctos
	•	No stacktrace en producción

⸻

🗿 REGLA FINAL (CONTRATO)

Este backend existe para servir al frontend definido.
No se optimiza prematuramente.
No se sobrearquitecta.
No se reescribe sin motivo.

⸻

✅ INSTRUCCIÓN FINAL PARA COPILOT

Generá TODO el backend de Tirito App v1.0 siguiendo este documento como única fuente de verdad.