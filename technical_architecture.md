# 🏗️ Odeen Assembly Voting System — Documentación Técnica

**Fecha:** 2026-03-01
**Estado:** Producción Local (Docker)
**Versión de la Red:** 1.0.0

Este documento detalla exhaustivamente cómo está construida y cómo opera la aplicación técnica de Odeen bajo el capó. Está diseñada con una arquitectura moderna de **cliente ligero y backend robusto de microservicio**, enfatizando la concurrencia, la seguridad criptográfica y la experiencia de usuario en tiempo real.

---

## 1. Arquitectura General y Stack Tecnológico

El sistema se orquesta a través de **Docker Compose** aislando tres capas fundamentales, asegurando inmutabilidad en el despliegue y paridad entre desarrollo y producción.

### 🌐 Frontend (Capa de Presentación)
*   **Framework:** Next.js 15 (App Router).
*   **Lenguaje:** TypeScript + React 19.
*   **Estilos y UI:** Tailwind CSS, `shadcn/ui` (Radix UI) y Framer Motion para micro-interacciones fluidas.
*   **Rol:** Actúa como cliente SPA para los votantes y administrador interactivo, manteniendo conexiones abiertas asíncronas para leer estados en vivo, pero delegando la verdadera lógica de negocios, seguridad y persistencia a Go a través de **Proxies Internos de Next.js** para ocultar la API real ante clientes.

### ⚙️ Backend (Capa Lógica y Transaccional)
*   **Framework:** Go 1.24 + Gin Web Framework.
*   **Concurrencia:** Goroutines intensivos para Server-Sent Events (SSE) y un `Worker Pool` para procesar votos asincrónicos masivos con resiliencia ante picos de demanda.
*   **Manipulación DB:** `sqlc` para generación de código tipo seguro (Type-safe) desde instrucciones SQL puras y `pgx` como driver de alto rendimiento.
*   **Rol:** Es el cerebro absoluto. Despacha tokens criptográficos, valida presencialidad (TOTP), maneja concurrencia de clientes web por SSE y asegura ACID (Atomicidad, Consistencia, Aislamiento, Durabilidad) en la votación.

### 🗄️ Base de Datos (Capa Persistente)
*   **Motor:** PostgreSQL 16.
*   **Arquitectura:** Diseño de "Doble Libro Mayor" (Double Ledger) para anonimato transaccional.
*   **Conexión:** Totalmente aislada en la red local de Docker, sin exposición de puertos al host (solo accesible por el contenedor Backend de Go).

---

## 2. Radiografía de Flujos Críticos

### A. Autenticación y Desacoplamiento de Identidad
1.  **Ingreso del Votante:** El votante ingresa su correo y (actualmente en simulación) valida vía OAuth/Google.
2.  **Identidad Criptográfica:** El backend en Go toma el correo "david@unal.edu.co" y se lo concatena a un `PEPPER_SECRET` (Llave secreta de servidor). A esta fusión se le calcula un hash SHA-256 inyectivo e irreversible.
3.  **Emisión de JWT:** El servidor emite un JSON Web Token (JWT) firmado (`JWT_SECRET`) conteniendo **únicamente** el correo ya hasheado, nunca el texto plano. El frontend debe adjuntar este JWT (`Authorization: Bearer <token>`) en futuras transacciones de forma obligatoria.

### B. El Flujo de Presencialidad Dinámica (TOTP Engine)
Odeen garantiza que solo los asistentes en la asamblea presencial puedan votar usando un motor de contraseñas de un solo uso basadas en tiempo (TOTP).

1.  **Danza del Proyector:** Cuando el admin activa una moción `LIVE`, el `TOTP Engine` del motor Go arranca silenciosamente. Cada 30 segundos despacha un string aleatorio seguro de 6 dígitos que transmite, vía un canal Go ([GetBroadcastChannel](file:///c:/projects/odeen/backend/internal/engine/totp.go#117-120)), al *Hub de Eventos* SSE. El Proyector (`/projection`) escucha en tiempo real esta tubería y pinta el código exacto dictado por el servidor de forma sincronizada.
2.  **Verificación Pre-Boleta:** Cuando el votante se intenta conectar, en vez de chocar directamente contra el servidor, se comunica con **Proxies BFF** (Backend for Frontend) en `api/voter/motions/:id/totp/route.ts`. Este proxy, escondido en el servidor de Next.js, salta a Go con el código.
3.  **Estado Temporal en Memoria:** Go verifica. Si el código está activo (y tiene un margen de gracia de 1 código anterior para latencia), **aprueba temporalmente al usuario archivando un `true` en un diccionario mapeado en RAM (`sync.Map`)**, y envía `Status 200` permitiendo que React muestre la boleta.

### C. Emisión del Voto y Criptografía del Doble Libro Mayor
El corazón de la aplicación es lograr anonimato irrompible sin sacrificar exactitud contable ni abrir la puerta al fraude de dobles votos.

1.  El votante elige sus respuestas, y el frontend manda el Payload JSON a Go.
2.  Go recupera la memoria RAM `sync.Map` para confirmar que ese usuario **SÍ** demostró presencialidad (pasó el TOTP exitosamente en esa sesión) y revisa velozmente si la DB no lo tiene registrado ya.
3.  **Pipeline Asíncrono de Votos (El Worker):** En lugar de meter el voto ahí mismo, lo empaca en un "Task" asíncrono y lo tira por un tubo concurrente (`chan VoteTask`) para que lo atrape un grupo predefinido de "Obreros" (Workers). Al usuario se le devuelve `StatusAccepted 202` garantizando latencias ultra bajas.
4.  **Transacción de la Base de Datos:**
    *   **Paso 1 (Recibo de Autoría):** El obrero anota en la tabla `voter_receipts` que `"El hash de correo X ejerció el derecho en la Moción Y"`. La llave primaria de la DB prohíbe gemelos matemáticamente.
    *   **Paso 2 (Jitter Aleatorio de Anti-Correlación):** *Vital.* El obrero **duerme** (Suspende goroutine) entre 50 y 250 milisegundos aleatorios. Quita precisión computacional al cruce de logs.
    *   **Paso 3 (Papeleta Hueca):** Obrero registra las opciones puras (`vote_data`) en la tabla `votes`. Esta tabla solo sabe "Qué se votó" pero no "Quién lo hizo". Ambos pasos se sellan atómicamente; si uno falla, no rige ninguno.

### D. Server-Sent Events (SSE) y Reactividad Real
Para evitar colapsar los puertos (Polling infinito), Odeen usa SSE. El Proyector y Votantes mantienen un túnel de fibra óptica abierto (`text/event-stream`). Cuando una moción cambia de estatus (`PENDING` -> `LIVE`), el admin sube el PUT a Go y este lanza un pulso por el Hub, empujando instantáneamente a Next.js y React a cambiar la interfaz gráfica del proyector o actualizar resultados al momento de cerrar la moción, sin refrescar página.

---

## 3. Seguridad Perimetral y Redes (WSL/Docker Docker-Compose)

| Vulnerabilidad Histórica | Mitigación Actual Técnica Implementada |
| :--- | :--- |
| **Robo de Identidad Frontend JWT** | El Token JWT viaja vía Proxys API de Next.js; si un actor extrae dominios en consola para lanzar votos, rebotará en CORS/CSRF. |
| **Manipulación In-Line (Wraps)** | Interfaces como la del proyector usan `.whitespace-nowrap` obligando integridad visual de códigos (e.g. previniendo divisiones ópticas `418-445` a renglones diferentes induciendo a errores). |
| **Caídas de Carga e Interloqueos SQL** | El Worker interpone `PgxPool` para reciclar conexiones de red SQL sin asfixiar la RAM PostgreSQL en picos masivos. |
| **Crash por ID Nulos (Next 15 + SQLC)** | Next 15 inyecta rutas asincrónicas; Mapeo Frontend reconstruye recursivamente `m.id || m.ID` protegiéndose contra serializaciones ambiguas de struct`s en JSON Golang. Destruyendo la maldición `/undefined` en URL de red. |

---
