# CHANGES - Tirito App Backend

Resumen de cambios importantes. Para el registro completo con versiones, ver CHANGELOG.md.

## 2026-03-22 - v0.2.0 Security Hardening + Feature Documentation

### Security Fixes Criticos
- Role injection: registro fuerza role=user siempre
- PII exposure: perfil publico sin datos sensibles, acceso condicional por tirito compartido
- Race condition: findOneAndUpdate atomico para claims
- Rating validation: solo participantes pueden calificar
- ReDoS: escape de regex en busqueda
- Password minlength: 6 a 8 caracteres

### Sistemas documentados por primera vez
- Solicitudes de tirito (TiritoRequest)
- Calificaciones (Rating) con reglas de participacion
- Categorias jerarquicas
- Planes y suscripciones (free/pro/business) MOCK
- Verificacion KYC
- Referidos
- Estadisticas de usuario y niveles
- Analytics admin
- Consulta cedula externa
- Password reset con CAPTCHA
- Email multi-provider

## 2026-01-06 - v0.1.0 Sistema de notificaciones y moderacion

- Notificaciones con Socket.IO
- Reportes y moderacion
- Bans con audit trail
- Metricas en memoria

## 2025-12-01 - v0.0.1 Inicio

- Estructura base
- Auth JWT, modelos iniciales
