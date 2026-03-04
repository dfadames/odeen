# 🗳️ Odeen: Estado General del Proyecto

Este documento está diseñado para entender rápidamente **qué es Odeen**, **qué funcionalidades ya están construidas (y listas para usar)**, y **qué falta por hacer** (Hoja de ruta / Tareas pendientes).

---

## 🎯 ¿Qué es Odeen?
Odeen es un **Sistema de Votación para Asambleas Presenciales**. Su objetivo principal es permitir a grupos grandes (ej. asambleas universitarias, sindicatos o juntas directivas) votar mociones y preguntas de forma rápida a través de sus teléfonos móviles, mientras se proyectan los resultados en vivo en una pantalla grande (Proyector).

Su filosofía central es la **Seguridad de Presencialidad** (verificar matemáticamente que la persona está físicamente en el salón) y el **Anonimato Absoluto** (ni siquiera los administradores del sistema pueden saber qué votó una persona específica, pero pueden confirmar que su voto se contó).

---

## ✅ Funcionalidades Construidas (Lo que ya existe y funciona)

### 1. Sistema de Votación del Usuario (`Voter View`)
El votante interactúa únicamente con su teléfono celular en una interfaz fluida y moderna:
*   **Ingreso Exclusivo:** Solo permite ingresar usando cuentas de correo institucionales pre-aprobadas (actualmente dominio `@unal.edu.co`).
*   **Validación de Presencialidad (TOTP):** Antes de ver la boleta, el votante debe ingresar el código rotativo de 6 dígitos que aparece en la pantalla gigante del salón. Este código caduca cada 30 segundos.
*   **Experiencia de Boleta:** Interfaz animada (Glassmorphism) donde responden preguntas con selección única.
*   **Blindaje Antifraude:** Matemáticamente es imposible votar dos veces por accidente o manipulación de red.
*   **Recibo Criptográfico:** Al usar la app, el votante recibe un "Hash de confirmación" que es prueba de recibo anónimo, con el cual el votante puede saber que su voto llegó a las urnas.

### 2. Panel Administrativo (`Admin Dashboard`)
El administrador organiza la asamblea desde detrás de la cortina:
*   **Constructor de Agenda (`Agenda Builder`):** Permite organizar el listado de mociones a votar. Cuenta con acciones para Agregar, Editar, y Eliminar (con alertas integradas visuales para evitar borrado por accidentes).
*   **Editor de Mociones (`Motion Editor`):** Interfaz para escribir el nombre, la descripción, personalizar las opciones (ej. "Aprobar", "Rechazar", "Abstenerse") y definir si esa votación específica exige o no código PIN presencial de seguridad.
*   **Control de Semáforo (Play/Stop):** El administrador oprime "Lanzar Moción" (LIVE) para abrir las urnas inmediatamente en los celulares, y "Finalizar Moción" (COMPLETED) para cerrar el canal y calcular resultados.
*   **Bóveda de Resultados (`Results Vault`):** Sección permanente donde quedan archivados para consulta abierta los resultados finales de todas las mociones terminadas (evitando errores antiguos donde se perdía la información al borrar encuestas).

### 3. Vista del Salón (`Projector Mode`)
Diseñado para proyectarse en la pared o pantalla principal de la asamblea para todos los asistentes físicos:
*   **Código QR Gigante:** Enlaza automáticamente al teléfono de los usuarios a la página oficial de votación para ahorrarse dictar URLs.
*   **Reloj Sincronizado TOTP:** Despliega un código de 6 dígitos, idéntico a las alarmas bancarias de seguridad (dinámico, grande y que nunca salta a un segundo renglón visual).
*   **Conteo Parcial Secreto:** Muestra en vivo *cuántos votos han entrado (ej. 347)* pero mantiene oculta la tendencia de los resultados para no "sesgar" la votación (solo se revela el resultado gráfico cuando se cierran las urnas).
*   **Eventos en Tiempo Real (SSE):** Toda la interacción es reactiva, la gráfica, el conteo y la música de fondo son empujados por el servidor. Sin necesidad de presionar F5.

---

## 🚧 ¿Qué falta por hacer? (Hoja de Ruta / Próximos Pasos)

Aunque la arquitectura y los flujos base están asegurados y el sistema está integrado, hay módulos indispensables antes del día del evento final:

### Tareas de Producto y Features
1.  **Censo Electoral Específico (Roster Validation):** 
    *   *Actualmente:* El login deja entrar a cualquier persona del mundo si termina en `@unal.edu.co`.
    *   *Falta:* Subir un listado CSV al administrador ("Derecho al voto"), para que solo las personas habilitadas este mes puedan votar en la asamblea.
2.  **Reportes y Descarga de Actas:**
    *   *Actualmente:* Se pueden mirar los resultados en la Bóveda del administrador.
    *   *Falta:* Botón mágico para exportar el acta formal de toda la asamblea. Un Excel (CSV) o PDF detallando estadísticas, votos totales y hashes anónimos de participación.
3.  **Votación de Selección Múltiple (Checkboxes):**
    *   *Actualmente:* Un usuario solo selecciona 1 radiobutton ("Opción A" o "Opción B").
    *   *Falta:* Soportar elecciones donde debas elegir "Delegados (Hasta 3)".

### Tareas de Infraestructura (Despliegue Real)
1.  **Activación Oficial de Google OAuth:**
    *   *Actualmente:* Usamos credenciales de *Mock* o desarrollo para no bloquear a los programadores internamente.
    *   *Falta:* Configurar las llaves secretas legales en *Google Cloud Console* para el paso a Producción (`GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`).
2.  **HTTPS (Cifrado TLS):**
    *   *Actualmente:* Tráfico `http://` normal corriendo bajo redes WIFI locales de Windows.
    *   *Falta:* Asegurar los URLs en un servidor de internet en la nube con candado SSL o usar proxies locales para inyectar HTTPS si es de red puramente interna.
3.  **Credenciales de Admin Robustas:**
    *   *Falta:* Ahora la contraseña de admin de prueba es genérica. Implementar base de contraseñas u OTPs enviados al correo de los presidentes de la asamblea.
