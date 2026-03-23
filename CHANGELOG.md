# CHANGELOG - Tirito App Backend

Formato basado en Keep a Changelog y Semantic Versioning.

---

## [0.2.0] - 2026-03-22

### Security Fixes (Critical)
- **Role injection fix**: registro fuerza role=user, nunca se acepta role del body
- **PII exposure fix**: perfil publico solo expone datos no sensibles (username, avatar, bio, estado, municipio, verificationStatus). Datos sensibles solo si hay tirito compartido
- **Race condition fix**: claim de tirito usa findOneAndUpdate atomico. Retorna 409 si ya fue tomado
- **Rating validation fix**: solo participantes del tirito (createdBy o assignedTo) pueden calificar
- **ReDoS fix**: escape obligatorio de caracteres regex en busqueda antes de $regex
- **Password policy**: minlength incrementado de 6 a 8 caracteres (modelo + frontend)

### Infrastructure
- **Socket.IO cleanup**: removeAllListeners, prevencion de conexiones duplicadas, ngOnDestroy
- **DB index**: indice compuesto { tiritoId: 1, participants: 1 } en modelo Chat
- **Middleware optionalAuth**: decodifica JWT si existe, sin requerir autenticacion

### Added (pre-0.2.0, not previously documented)
- Sistema completo de solicitudes de tirito (TiritoRequest)
- Sistema de calificaciones (Rating) con validacion de participacion
- Sistema de perfiles publicos con PII condicional
- Sistema de categorias jerarquicas con seed
- Sistema de planes y suscripciones (free/pro/business) - pagos MOCK
- Sistema de transacciones (MOCK)
- Sistema de verificacion KYC (3 documentos, review admin)
- Sistema de referidos con codigo auto-generado
- Sistema de estadisticas de usuario (niveles: nuevo, activo, confiable, experto, leyenda)
- Analytics dashboard (admin)
- Consulta externa de cedula con cache
- Password reset con rate limiting y CAPTCHA opcional
- Templates de email Handlebars (welcome, reset-password)
- Multi-provider email: Mailtrap API, SendGrid, SMTP, log fallback
- Modelos: Subscription, Transaction, UserStats, Analytics, Referral, VerificationRequest, Category, PasswordResetAttempt
- Controladores: payments, verification, referral, categories, stats, external, profiles
- Scripts: generate-tiritos, send-mailtrap-test, send-reset-via-mailer, generate-usernames
- Middleware captcha (reCAPTCHA v3 opcional)
- Util simpleCache (cache en memoria con TTL)

## [0.1.0] - 2026-01-06

### Added
- Sistema de notificaciones: modelo Notification, controller y rutas
- Integracion Socket.IO con validacion JWT en handshake
- Endpoint /api/metrics con metricas en memoria
- Script find-orphan-tiritos.js
- Rate limiting en endpoints sensibles
- Sistema de reportes y moderacion (Report, Audit)
- Acciones admin: ban, unban, suspend, user_block, user_unblock
- Script create-admin.js
- Modelos Chat, Message, User (con bans, favoritos), Tirito (con imagenes, categoria, precio)
- Autenticacion JWT (registro, login)
- CORS restrictivo, Helmet, compression
- Graceful shutdown (SIGTERM/SIGINT)
- Health check (/api/health)
- Logger JSON, Multer para uploads

## [0.0.1] - 2025-12-01

### Added
- Estructura inicial del proyecto
- Express + MongoDB + JWT base
- Modelos User y Tirito iniciales
